import { describe, expect, it } from 'vitest';
import { allowedKits, calculate, inverterSize, kitKw, installment, inverterLabel } from './calc';
import { DEFAULT_SETTINGS, newQuoteInput } from './defaults';
import { kitsToCsv, parseKitsCsv, parseMoney } from './csv';
import defaultKitsCsv from '../data/default-kits.csv?raw';
import { horizonYears, inverterSizes, keepOnLeave, pickInverter, stepKit, withSettings } from './quote';
import { backupOverdue, monthsText, parseBR } from './format';
import type { Kit, QuoteInput } from './types';

const kits: Kit[] = [
  { id: 'a', gm: 700, panel585: 0, panel610: 10, panel700: 0, inverter: 'SOFAR 5K', price: 19800 },
  { id: 'b', gm: 890, panel585: 0, panel610: 12, panel700: 0, inverter: 'SOFAR 6K', price: 22900 },
  { id: 'c', gm: 890, panel585: 0, panel610: 12, panel700: 0, inverter: 'SAJ 6K', price: 23500 },
  { id: 'd', gm: 1040, panel585: 0, panel610: 14, panel700: 0, inverter: 'SOFAR 8K', price: 26100 },
  { id: 'e', gm: 1500, panel585: 22, panel610: 0, panel700: 0, inverter: '10', price: 36000 },
];

/** Sem limites de rede: os testes de limite montam os seus */
function input(over: Partial<QuoteInput> = {}): QuoteInput {
  const base = newQuoteInput(DEFAULT_SETTINGS);
  return { ...base, billValue: 680, params: { ...base.params, gridLimits: undefined }, ...over };
}

describe('dimensionamento e kit', () => {
  it('escolhe o menor kit que cobre o consumo com margem', () => {
    const r = calculate(input(), kits);
    expect(Math.round(r.consumptionKwh)).toBe(739);
    expect(Math.round(r.targetKwh)).toBe(887);
    expect(r.kit?.id).toBe('b');
    expect(r.modules).toBe(12);
    expect(r.kWp).toBe(7.32);
    expect(r.generationKwh).toBe(890);
  });

  it('respeita a marca de inversor preferida', () => {
    const r = calculate(input({ inverterBrand: 'SAJ' }), kits);
    expect(r.kit?.id).toBe('c');
    expect(r.inverterLabel).toBe('SAJ 6K');
  });

  it('quantidade manual sem kit correspondente não inventa preço', () => {
    const r = calculate(input({ manualModules: 13 }), kits);
    expect(r.kit).toBeNull();
    expect(r.finalPrice).toBe(0);
    expect(r.ready).toBe(false);
    expect(r.warnings[0]).toMatch(/13 módulos/);
  });

  it('usa outro módulo e avisa quando a potência pedida não cobre', () => {
    const r = calculate(input({ billValue: 1100 }), kits);
    expect(r.kit?.id).toBe('e');
    expect(r.panelW).toBe(585);
    expect(r.modules).toBe(22);
    expect(r.warnings[0]).toMatch(/585 W/);
  });

  it('consumo acima de todos os kits avisa em vez de mostrar R$ 0 calado', () => {
    const r = calculate(input({ billValue: 5000 }), kits);
    expect(r.kit).toBeNull();
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('média de 12 meses ignora meses vazios', () => {
    const monthly = [700, 800, 0, 0, 0, 0, 0, 0, 0, 0, 0, 900];
    const r = calculate(input({ monthly, billMode: 'kwh' }), kits);
    expect(r.consumptionKwh).toBe(800);
  });
});

describe('padrão de ligação do kit', () => {
  const onlyKit = (phase?: string): Kit[] => [{ id: 'x', gm: 2000, panel585: 0, panel610: 32, panel700: 0, inverter: 'SAJ', price: 39000, phase }];
  const warns = (phase: string | undefined, grid: QuoteInput['grid']) => calculate(input({ grid }), onlyKit(phase)).warnings.some((w) => /padrão/.test(w));

  it('avisa quando o padrão do cliente não atende o kit', () => {
    expect(warns('Trifásico', 'mono')).toBe(true);
    expect(warns('Trifásico', 'bi')).toBe(true);
    expect(warns('Bi/Trifásico', 'mono')).toBe(true);
  });

  it('não avisa quando atende, nem em kit sem padrão informado', () => {
    expect(warns('Trifásico', 'tri')).toBe(false);
    expect(warns('Bi/Trifásico', 'bi')).toBe(false);
    expect(warns('Mono/Trifásico', 'mono')).toBe(false);
    expect(warns('Monofásico', 'tri')).toBe(false);
    expect(warns(undefined, 'mono')).toBe(false);
  });
});

describe('edição do orçamento', () => {
  it('inversor escolhido que deixou de servir avisa em vez de parecer escolhido', () => {
    const i = input({ manualInverter: 'SAJ 6K' });
    i.params = { ...i.params, safetyMargin: 40 };
    const r = calculate(i, kits);
    expect(r.kit?.id).toBe('d');
    expect(r.warnings[0]).toMatch(/SAJ 6K/);
  });

  it('o passo vai de kit em kit e para no fim da tabela', () => {
    let i = input({ billValue: 680 });
    expect(calculate(i, kits).modules).toBe(12);
    i = { ...i, ...stepKit(i, calculate(i, kits), kits, 1)! };
    expect(calculate(i, kits).modules).toBe(14);
    expect(stepKit(i, calculate(i, kits), kits, 1)).toBeNull();
    i = { ...i, ...stepKit(i, calculate(i, kits), kits, -1)! };
    expect(calculate(i, kits).kit?.id).toBe('b');
  });

  it('em ampliação o passo é de um módulo', () => {
    const i = input({ systemType: 'ampliacao' });
    expect(stepKit({ ...i, manualModules: 6 }, calculate({ ...i, manualModules: 6 }, kits), kits, -1)).toEqual({ manualModules: 5 });
  });

  it('ajuste salvo chega ao rascunho novo, inclusive juros padrão', () => {
    const d = { proposalId: null, input: input() };
    const next = withSettings(d, { interestRate: 1.59, iof: 2, tariff: 1 });
    expect(next.input.payment.interestRate).toBe(1.59);
    expect(next.input.params.iof).toBe(2);
    expect(next.input.params.tariff).toBe(1);
  });

  it('ajuste salvo não altera orçamento reaberto', () => {
    const d = { proposalId: 'p1', input: input() };
    expect(withSettings(d, { tariff: 1 })).toBe(d);
  });
});

describe('preço', () => {
  it('ancoragem e desconto', () => {
    const i = input();
    i.pricing = { mode: 'tabela', anchoring: 2000, discount: 1500, closedPrice: null };
    const r = calculate(i, kits);
    expect(r.basePrice).toBe(22900);
    expect(r.tablePrice).toBe(24900);
    expect(r.finalPrice).toBe(23400);
    expect(r.discountShown).toBe(1500);
  });

  it('valor fechado mostra o desconto sobre a tabela', () => {
    const i = input();
    i.pricing = { mode: 'fechado', anchoring: 2000, discount: 0, closedPrice: 23400 };
    const r = calculate(i, kits);
    expect(r.finalPrice).toBe(23400);
    expect(r.discountShown).toBe(1500);
  });

  it('laje, híbrido e bateria somam ao preço base', () => {
    const r = calculate(input({ roof: 'laje', systemType: 'bateria', batteries: 2 }), kits);
    expect(r.basePrice).toBe(22900 + 1000 + 3000 + 2 * 6000);
  });
});

describe('pagamento', () => {
  it('juros zero não quebra a parcela', () => {
    expect(installment(12000, 0, 12)).toBe(1000);
  });

  it('financiamento com IOF e spread', () => {
    const i = input();
    i.pricing = { mode: 'fechado', anchoring: 0, discount: 0, closedPrice: 23400 };
    i.payment = { method: 'financiado', installments: 72, interestRate: 1.59, downPayment: 0 };
    const r = calculate(i, kits);
    expect(Math.round(r.installmentValue)).toBe(595);
  });

  it('entrada reduz o valor financiado', () => {
    const i = input();
    i.pricing = { mode: 'fechado', anchoring: 0, discount: 0, closedPrice: 23400 };
    i.payment = { method: 'entrada', installments: 60, interestRate: 1.59, downPayment: 5000 };
    const r = calculate(i, kits);
    expect(r.downPayment).toBe(5000);
    expect(Math.round(r.installmentValue)).toBe(519);
  });
});

describe('economia e retorno', () => {
  it('desconta a taxa mínima da rede na conta nova', () => {
    const i = input();
    i.pricing = { mode: 'fechado', anchoring: 0, discount: 0, closedPrice: 23400 };
    i.params = { ...i.params, lightingFee: 12 };
    const r = calculate(i, kits);
    expect(r.newBill).toBe(58);
    expect(r.monthlySavings).toBe(622);
    expect(monthsText(r.paybackMonths)).toBe('3 anos e 2 meses');
  });

  it('conta em kWh inclui a iluminação pública na conta de hoje', () => {
    const i = input({ billMode: 'kwh', billValue: 700 });
    i.params = { ...i.params, lightingFee: 12 };
    expect(calculate(i, kits).currentBill).toBe(656);
  });

  it('histórico de 12 meses também inclui a iluminação pública', () => {
    const i = input({ billMode: 'kwh', monthly: [700, 700, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    i.params = { ...i.params, lightingFee: 12 };
    expect(calculate(i, kits).currentBill).toBe(656);
  });

  it('conta em reais não soma a iluminação de novo', () => {
    const i = input();
    i.params = { ...i.params, lightingFee: 12 };
    expect(calculate(i, kits).currentBill).toBe(680);
  });

  it('cobra o percentual do Fio B sobre a energia compensada', () => {
    const i = input();
    i.params = { ...i.params, fioB: 0.3, fioBPct: 60 };
    const r = calculate(i, kits);
    expect(r.fioBCost).toBe(124.04);
    expect(r.newBill).toBe(170.04);
    expect(r.monthlySavings).toBe(509.96);
  });

  it('Fio B zerado não muda a conta nova', () => {
    const r = calculate(input(), kits);
    expect(r.fioBCost).toBe(0);
    expect(r.newBill).toBe(46);
  });

  it('orçamento salvo antes do Fio B continua calculando', () => {
    const i = input();
    const { fioB: _fioB, fioBPct: _fioBPct, ...old } = i.params;
    const r = calculate({ ...i, params: old as typeof i.params }, kits);
    expect(r.newBill).toBe(46);
  });
});

describe('comissão', () => {
  it('percentual sobre a venda mais metade do sobrepreço, menos imposto', () => {
    const i = input();
    i.pricing = { mode: 'tabela', anchoring: 2000, discount: 1500, closedPrice: null };
    const r = calculate(i, kits);
    expect(r.commission.sale).toBe(702);
    expect(r.commission.overprice).toBe(250);
    expect(r.commission.gross).toBe(952);
    expect(r.commission.net).toBeCloseTo(847.28, 2);
  });
});

describe('planilha de kits', () => {
  it('a tabela nativa traz todos os kits, com preço e padrão', () => {
    const list = parseKitsCsv(defaultKitsCsv);
    expect(list).toHaveLength(65);
    expect(list.every((k) => k.gm > 0 && k.panel610 > 0 && k.price > 0 && k.phase)).toBe(true);
    expect(list[0]).toMatchObject({ gm: 179, panel610: 3, price: 7563.44, inverter: 'Microinversor SAJ 2.250W', phase: 'Monofásico' });
    expect(list[64]).toMatchObject({ gm: 22405, panel610: 371, price: 407987.14, phase: 'Trifásico' });
  });

  it('lê o formato antigo com vírgula', () => {
    const k = parseKitsCsv('GM,585,610,700,Inversor,Valor\n890,0,12,0,6,22900.50\n');
    expect(k).toHaveLength(1);
    expect(k[0].gm).toBe(890);
    expect(k[0].panel610).toBe(12);
    expect(k[0].inverter).toBe('6');
    expect(k[0].price).toBe(22900.5);
  });

  it('lê ponto e vírgula e valores no padrão brasileiro', () => {
    const k = parseKitsCsv('GM;585;610;700;Inversor;Valor\n1.040 kWh;0;14;0;3,5;"26.100,00"\n');
    expect(k[0].gm).toBe(1040);
    expect(k[0].inverter).toBe('3,5');
    expect(k[0].price).toBe(26100);
  });

  it('lê e devolve a coluna Fase, que é opcional', () => {
    const [k] = parseKitsCsv('GM;585;610;700;Inversor;Valor;Fase\n897;0;15;0;SAJ 5.000W;19.768,92;Monofásico\n');
    expect(k.phase).toBe('Monofásico');
    expect(k.inverter).toBe('SAJ 5.000W');
    expect(k.price).toBe(19768.92);
    expect(kitsToCsv([k]).split('\n')[1]).toBe('897;0;15;0;SAJ 5.000W;19768,92;Monofásico');
    expect(parseKitsCsv('890,0,12,0,6,22900.50\n')[0].phase).toBeUndefined();
  });

  it('valores com milhar sem centavos', () => {
    expect(parseMoney('23.400')).toBe(23400);
    expect(parseMoney('R$ 23.400,90')).toBe(23400.9);
  });
});

describe('formatos', () => {
  it('lê números digitados', () => {
    expect(parseBR('1.234,56')).toBe(1234.56);
    expect(parseBR('0,92')).toBe(0.92);
  });
  it('ponto seguido de 3 dígitos é milhar', () => {
    expect(parseBR('23.400')).toBe(23400);
    expect(parseBR('1.234.567')).toBe(1234567);
  });
  it('ponto decimal continua decimal', () => {
    expect(parseBR('0.92')).toBe(0.92);
    expect(parseBR('0.920')).toBe(0.92);
    expect(parseBR('23.4')).toBe(23.4);
  });
  it('avisa do backup só depois de 7 dias', () => {
    const now = new Date(2026, 10, 20, 12);
    expect(backupOverdue(new Date(2026, 10, 13, 12).toISOString(), true, now)).toBe(false);
    expect(backupOverdue(new Date(2026, 10, 12, 12).toISOString(), true, now)).toBe(true);
  });
  it('sem backup nenhum, só avisa se há dados', () => {
    expect(backupOverdue(null, true)).toBe(true);
    expect(backupOverdue(null, false)).toBe(false);
  });
  it('rótulo do inversor numérico ganha a marca', () => {
    expect(inverterLabel('6', 'SOFAR')).toBe('SOFAR 6 kW');
    expect(inverterLabel('5,5', '')).toBe('5,5 kW');
    expect(inverterLabel('6kW', 'SOFAR')).toBe('SOFAR 6 kW');
  });
});

describe('limites e acréscimos da v3.1', () => {
  const limited = (over: Partial<QuoteInput> = {}) => ({ ...newQuoteInput(DEFAULT_SETTINGS), billValue: 680, ...over });
  const big: Kit[] = [
    { id: 's', gm: 1400, panel585: 0, panel610: 24, panel700: 0, inverter: 'SAJ/SOFAR 7.500W', price: 30000 },
    { id: 'm', gm: 1800, panel585: 0, panel610: 30, panel700: 0, inverter: 'SAJ/SOFAR 15.000W', price: 40000 },
    { id: 'g', gm: 3000, panel585: 0, panel610: 50, panel700: 0, inverter: 'SAJ/SOFAR 25.000W', price: 60000 },
  ];

  it('lê o tamanho do inversor como vem na tabela', () => {
    expect(kitKw('Microinversor SAJ 2.250W')).toBe(2.25);
    expect(kitKw('SAJ/SOFAR 7,5K OU 2 x 5K')).toBe(7.5);
    expect(kitKw('SAJ/SOFAR 110KW + 15KW')).toBe(125);
    expect(kitKw('10')).toBe(10);
    expect(inverterSize('SAJ/SOFAR 15.000W')).toBe('15 kW');
    expect(inverterSize('SAJ/SOFAR 7,5K OU 2 x 5K')).toBe('7,5 kW ou 2 × 5 kW');
  });

  it('a rede limita o kit e avisa quando não cobre', () => {
    expect(allowedKits(big, limited({ grid: 'mono' })).map((k) => k.id)).toEqual(['s']);
    const r = calculate(limited({ grid: 'mono', billValue: 1500 }), big);
    expect(r.kit?.id).toBe('s');
    expect(r.warnings.join()).toMatch(/Monofásico vai até 24 módulos, com inversor de 7,5 kW/);
  });

  it('o limite do inversor também vale', () => {
    const base = limited({ grid: 'tri' });
    const i = { ...base, params: { ...base.params, inverterLimits: { '25': 40 } } };
    expect(allowedKits(big, i).map((k) => k.id)).toEqual(['s', 'm']);
    expect(inverterSizes(i, big)).toEqual([7.5, 15]);
  });

  it('escolher o inversor fixa o kit daquele tamanho', () => {
    const i = limited({ grid: 'tri', billValue: 500 });
    expect(calculate({ ...i, ...pickInverter(i, calculate(i, big), big, 25)! }, big).kit?.id).toBe('g');
  });

  it('marca, telhado e carport somam ao projeto', () => {
    const k = [kits[1]];
    const price = (over: Partial<QuoteInput>) => calculate(limited(over), k).basePrice;
    expect(price({})).toBe(22900);
    expect(price({ moduleBrand: 'WEG' })).toBe(23900);
    expect(price({ inverterBrand: 'WEG' })).toBe(22900 + 1000);
    expect(price({ roof: 'laje' })).toBe(23900);
    expect(price({ roof: 'carport', carportPrice: 8000 })).toBe(30900);
    expect(calculate(limited({ roof: 'carport' }), k).warnings.join()).toMatch(/Carport/);
  });

  it('valor fixo, valor definido e desconto desligado', () => {
    const k = [kits[1]];
    const pr = newQuoteInput(DEFAULT_SETTINGS).pricing;
    const fixo = calculate(limited({ pricing: { ...pr, mode: 'fixo', closedPrice: 25000 } }), k);
    expect([fixo.finalPrice, fixo.tablePrice, fixo.discountShown]).toEqual([25000, 25000, 0]);
    expect(fixo.commission.overprice).toBe(1050);
    const def = calculate(limited({ pricing: { ...pr, mode: 'definido', closedPrice: 25000, shownDiscount: 3000 } }), k);
    expect([def.finalPrice, def.tablePrice, def.discountShown, def.commission.overprice]).toEqual([25000, 28000, 3000, 0]);
    const off = calculate(limited({ pricing: { ...pr, anchoring: 2000, discount: 1500, discountOff: true } }), k);
    expect([off.finalPrice, off.discountShown]).toEqual([24900, 0]);
  });

  it('orçamento salvo antes dos limites continua igual', () => {
    const base = limited({ grid: 'mono', billValue: 1500, moduleBrand: 'WEG' });
    const { gridLimits, inverterLimits, roofExtras, moduleBrandExtras, inverterBrandExtras, ...old } = base.params;
    expect(calculate({ ...base, params: old }, big).kit?.id).toBe('g');
    expect(calculate({ ...base, params: old }, big).basePrice).toBe(60000);
  });

  it('ampliação conta o que o cliente já tem', () => {
    const r = calculate(limited({ systemType: 'ampliacao', billValue: 300, existing: { modules: 10, w: 610 } }), big);
    expect(r.modules).toBe(6);
    expect(r.totalModules).toBe(16);
    expect(r.existingKwh).toBe(763);
  });

  it('a projeção vai de 6 a 10 anos', () => {
    expect(horizonYears(null)).toBe(6);
    expect(horizonYears(68)).toBe(8);
    expect(horizonYears(200)).toBe(10);
  });

  it('ao sair, só guarda o que foi mexido e nunca a venda fechada', () => {
    const a = limited();
    const saved = { id: 'p', input: a } as never;
    expect(keepOnLeave(a, undefined, undefined)).toBe(true);
    expect(keepOnLeave({ ...a }, saved, { soldProposalId: null })).toBe(false);
    expect(keepOnLeave({ ...a, billValue: 1 }, saved, { soldProposalId: null })).toBe(true);
    expect(keepOnLeave({ ...a, billValue: 1 }, saved, { soldProposalId: 'p' })).toBe(false);
  });
});
