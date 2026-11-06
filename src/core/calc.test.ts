import { describe, expect, it } from 'vitest';
import { calculate, installment, inverterLabel } from './calc';
import { DEFAULT_SETTINGS, newQuoteInput } from './defaults';
import { parseKitsCsv, parseMoney } from './csv';
import { stepModules, withSettings } from './quote';
import { backupOverdue, monthsText, parseBR } from './format';
import type { Kit, QuoteInput } from './types';

const kits: Kit[] = [
  { id: 'a', gm: 700, panel585: 0, panel610: 10, panel700: 0, inverter: 'SOFAR 5K', price: 19800 },
  { id: 'b', gm: 890, panel585: 0, panel610: 12, panel700: 0, inverter: 'SOFAR 6K', price: 22900 },
  { id: 'c', gm: 890, panel585: 0, panel610: 12, panel700: 0, inverter: 'SAJ 6K', price: 23500 },
  { id: 'd', gm: 1040, panel585: 0, panel610: 14, panel700: 0, inverter: 'SOFAR 8K', price: 26100 },
  { id: 'e', gm: 1500, panel585: 22, panel610: 0, panel700: 0, inverter: '10', price: 36000 },
];

function input(over: Partial<QuoteInput> = {}): QuoteInput {
  const base = newQuoteInput(DEFAULT_SETTINGS);
  return { ...base, billValue: 680, ...over };
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

describe('edição do orçamento', () => {
  it('inversor escolhido que deixou de servir avisa em vez de parecer escolhido', () => {
    const i = input({ manualInverter: 'SAJ 6K' });
    i.params = { ...i.params, safetyMargin: 40 };
    const r = calculate(i, kits);
    expect(r.kit?.id).toBe('d');
    expect(r.warnings[0]).toMatch(/SAJ 6K/);
  });

  it('mais um e menos um módulo voltam ao mesmo kit, mesmo vindo de outra potência', () => {
    let i = input({ billValue: 1100 });
    const first = calculate(i, kits);
    expect(first.kit?.id).toBe('e');
    i = { ...i, ...stepModules(i, first, 1) };
    i = { ...i, ...stepModules(i, calculate(i, kits), -1) };
    const r = calculate(i, kits);
    expect(r.kit?.id).toBe('e');
    expect(r.finalPrice).toBe(36000);
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
