import type { Grid, Kit, PanelW, PayMethod, QuoteInput, QuoteResult, Commission } from './types';
import { GRID_LABEL, GRID_MIN_KWH } from './defaults';

const PANELS: PanelW[] = [585, 610, 700];

export function panelCount(kit: Kit, w: PanelW): number {
  if (w === 585) return kit.panel585 || 0;
  if (w === 610) return kit.panel610 || 0;
  return w === 700 ? kit.panel700 || 0 : 0;
}

/** Potência do módulo que o kit usa (o maior número de módulos manda) */
export function kitPanel(kit: Kit, preferred: PanelW): PanelW {
  if (panelCount(kit, preferred) > 0) return preferred;
  let best: PanelW = preferred;
  let max = 0;
  for (const w of PANELS) {
    const c = panelCount(kit, w);
    if (c > max) {
      max = c;
      best = w;
    }
  }
  return best;
}

const INV_BRAND = /^(Microinversor\s+)?(SAJ\/SOFAR|SAJ|SOFAR|WEG)\s*/i;

function kwOf(text: string): number {
  const x = /^\s*2 x (.*)$/i.exec(text);
  const m = /(\d[\d.,]*)\s*(KW|K|W)?/i.exec(x ? x[1] : text);
  if (!m) return 0;
  // Em W o ponto é milhar ("2.250W"); em kW é decimal ("7.5K")
  const watts = /^W$/i.test(m[2] ?? '');
  const n = parseFloat(watts ? m[1].replace(/[.,]/g, '') : m[1].replace(',', '.')) / (watts ? 1000 : 1);
  return x ? n * 2 : n;
}

/** Tamanho do inversor em kW. Em "A ou B" vale o menor; em "A + B", a soma. */
export function kitKw(inverter: string): number {
  const raw = inverter.replace(INV_BRAND, '');
  if (raw.includes('+')) return raw.split('+').reduce((a, p) => a + kwOf(p), 0);
  return Math.min(...raw.split(/\s+ou\s+/i).map(kwOf));
}

const kwText = (n: number) => `${String(Math.round(n * 100) / 100).replace('.', ',')} kW`;

/** "5 kW", "3 kW ou 3,6 kW", "2 × 5 kW" */
export function inverterSize(inverter: string): string {
  const raw = inverter.replace(INV_BRAND, '');
  const parts = raw.split(/\s+(?:ou|\+)\s+/i);
  return parts.map((p) => (/^\s*2 x /i.test(p) ? `2 × ${kwText(kwOf(p) / 2)}` : kwOf(p) ? kwText(kwOf(p)) : p.trim())).join(raw.includes('+') ? ' + ' : ' ou ');
}

export function inverterBrandOf(inverter: string): string {
  if (/^Microinversor/i.test(inverter)) return 'Microinversor SAJ';
  return /^(SAJ\/SOFAR|SAJ|SOFAR|WEG)/i.exec(inverter)?.[0] ?? '';
}

/** Kits que a rede e o inversor permitem. Orçamento sem limites salvos aceita todos. */
export function allowedKits(kits: Kit[], input: QuoteInput): Kit[] {
  const p = input.params;
  const g = p.gridLimits?.[input.grid];
  return kits.filter((k) => {
    const q = Math.max(k.panel585 || 0, k.panel610 || 0, k.panel700 || 0), kw = kitKw(k.inverter);
    return (!g || (q <= g.modules && kw <= g.inverterKw)) && q <= (p.inverterLimits?.[String(kw)] ?? Infinity);
  });
}

export function isNumericInverter(inv: string): boolean {
  return /^\s*\d+([.,]\d+)?\s*(k|kw)?\s*$/i.test(inv);
}

export function inverterLabel(inv: string, brand: string): string {
  if (!inv) return '';
  if (isNumericInverter(inv)) {
    const n = inv.replace(/kw|k/gi, '').trim().replace('.', ',');
    return brand ? `${brand} ${n} kW` : `${n} kW`;
  }
  return inv;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function consumptionOf(input: QuoteInput): number {
  if (input.monthly && input.monthly.some((v) => v > 0)) {
    const vals = input.monthly.filter((v) => v > 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  if (input.billMode === 'reais') {
    return input.params.tariff > 0 ? input.billValue / input.params.tariff : 0;
  }
  return input.billValue;
}

/** Parcela de um valor em n vezes, com entrada, IOF e spread. Serve para mostrar todas as opções de parcelas. */
export function installmentFor(input: QuoteInput, finalPrice: number, n: number): number {
  const pay = input.payment;
  const down = pay.method === 'entrada' ? Math.min(Math.max(0, pay.downPayment), finalPrice) : 0;
  return round2(installment((finalPrice - down) * (1 + (input.params.iof + input.params.spread) / 100), pay.interestRate, n));
}

/** Parcela de financiamento pela tabela Price. Funciona com juros zero. */
export function installment(financed: number, ratePct: number, n: number): number {
  if (n <= 0 || financed <= 0) return 0;
  const r = ratePct / 100;
  if (r === 0) return financed / n;
  const f = Math.pow(1 + r, n);
  return (financed * r * f) / (f - 1);
}

/** O padrão do cliente atende o kit? Kit monofásico liga em qualquer padrão; kit sem padrão informado não é conferido. */
function fitsGrid(kit: Kit, grid: Grid): boolean {
  const phase = (kit.phase ?? '').toLowerCase();
  if (!phase || phase.includes('mono')) return true;
  if (phase.includes('bi')) return grid !== 'mono';
  return grid === 'tri';
}

interface KitPick {
  kit: Kit | null;
  panelW: PanelW;
  available: string[];
  warning: string | null;
}

function pickKit(input: QuoteInput, kits: Kit[], targetKwh: number): KitPick {
  const want = input.panelW;
  const byQuality = (a: Kit, b: Kit) => a.gm - b.gm || a.price - b.price;
  const brand = input.inverterBrand.trim().toLowerCase();
  const allowed = allowedKits(kits, input);

  let candidates: Kit[];
  let panelW = want;
  let warning: string | null = null;

  if (input.manualModules) {
    candidates = allowed.filter((k) => panelCount(k, want) === input.manualModules).sort(byQuality);
  } else {
    const covering = allowed.filter((k) => k.gm >= targetKwh);
    candidates = covering.filter((k) => panelCount(k, want) > 0).sort(byQuality);
    if (candidates.length === 0 && covering.length > 0) {
      candidates = covering.sort(byQuality);
      panelW = kitPanel(candidates[0], want);
      warning = `Nenhum kit de ${want} W cobre esse consumo. Usei um kit com módulos de ${panelW} W.`;
    } else if (candidates.length === 0 && allowed.length > 0 && kits.some((k) => k.gm >= targetKwh)) {
      // Existe kit que cobre, mas a rede não permite: fica com o maior permitido
      const biggest = [...allowed].sort((a, b) => b.gm - a.gm)[0];
      candidates = [biggest];
      panelW = kitPanel(biggest, want);
      const cons = consumptionOf(input);
      warning = `${GRID_LABEL[input.grid]} vai até ${panelCount(biggest, panelW)} módulos, com inversor de ${inverterSize(biggest.inverter)}. Cobre ${Math.round(cons ? (biggest.gm / cons) * 100 : 0)}% do consumo. Para mais, confira se a casa pode mudar de rede.`;
    }
  }

  const available = Array.from(new Set(candidates.map((k) => k.inverter))).filter(Boolean);

  let pool = candidates;
  if (input.manualInverter) {
    const match = candidates.filter((k) => k.inverter === input.manualInverter);
    if (match.length) pool = match;
  } else if (brand) {
    const match = candidates.filter((k) => k.inverter.toLowerCase().includes(brand));
    if (match.length) pool = match;
  }
  const kit = pool[0] ?? null;
  if (kit) panelW = kitPanel(kit, panelW);
  if (kit && input.manualInverter && kit.inverter !== input.manualInverter) {
    warning = warning ?? `O inversor ${input.manualInverter} não atende esse sistema. Usei o indicado pela tabela.`;
  }
  return { kit, panelW, available, warning };
}

export function calculate(input: QuoteInput, kits: Kit[]): QuoteResult {
  const p = input.params;
  const warnings: string[] = [];
  const consumptionKwh = consumptionOf(input);
  const minKwh = GRID_MIN_KWH[input.grid];
  const targetKwh = consumptionKwh * (1 + p.safetyMargin / 100);
  const usesHistory = !!(input.monthly && input.monthly.some((v) => v > 0));
  const currentBill = input.billMode === 'reais' && !usesHistory ? input.billValue : consumptionKwh * p.tariff + p.lightingFee;

  const hasDemand = consumptionKwh > 0 || !!input.manualModules;

  let kit: Kit | null = null;
  let kitSource: QuoteResult['kitSource'] = 'estimado';
  let panelW: PanelW = input.panelW;
  let modules = 0;
  let generationKwh = 0;
  let kitPrice = 0;
  let available: string[] = [];
  let inverterText = '';

  if (hasDemand) {
    if (input.systemType === 'ampliacao') {
      kitSource = 'ampliacao';
      modules = input.manualModules ?? Math.max(1, Math.ceil(targetKwh / ((panelW / 1000) * p.productivity)));
      generationKwh = Math.round(modules * (panelW / 1000) * p.productivity);
      kitPrice = modules * p.expansionModulePrice;
      inverterText = 'Usa o inversor existente';
      if (p.expansionModulePrice <= 0 && input.pricing.mode !== 'fechado') {
        warnings.push('Em ampliação, defina o preço por módulo em Ajustes ou informe o valor fechado.');
      }
    } else {
      const pick = pickKit(input, kits, targetKwh);
      available = pick.available;
      panelW = pick.panelW;
      if (pick.warning) warnings.push(pick.warning);
      if (pick.kit) {
        kit = pick.kit;
        kitSource = 'tabela';
        modules = panelCount(kit, panelW);
        generationKwh = kit.gm;
        kitPrice = kit.price;
        inverterText = inverterLabel(kit.inverter, input.inverterBrand);
        const kitBrand = inverterBrandOf(kit.inverter);
        if (/^(SAJ|SOFAR)$/.test(input.inverterBrand) && kitBrand && !kitBrand.includes(input.inverterBrand)) warnings.push(`Este kit na tabela é ${kitBrand}. ${input.inverterBrand} não está disponível nesse tamanho.`);
        if (!fitsGrid(kit, input.grid)) warnings.push(`Este kit é para padrão ${kit.phase!.toLowerCase()}, e a rede está como ${GRID_LABEL[input.grid].toLowerCase()}. Confira a rede ou o padrão de entrada.`);
      } else {
        modules = input.manualModules ?? Math.max(1, Math.ceil(targetKwh / ((panelW / 1000) * p.productivity)));
        generationKwh = Math.round(modules * (panelW / 1000) * p.productivity);
        if (kits.length === 0) {
          warnings.push('A tabela de kits está vazia. Importe em Ajustes ou informe o valor fechado.');
        } else if (allowedKits(kits, input).length === 0) {
          warnings.push('Nenhum kit dentro dos limites desta rede. Revise os limites na rede ou no inversor.');
        } else if (input.manualModules) {
          warnings.push(`Nenhum kit da tabela tem ${input.manualModules} módulos de ${panelW} W. Informe o valor fechado.`);
        } else {
          warnings.push('Nenhum kit da tabela cobre esse consumo. Informe o valor fechado.');
        }
      }
    }
  }

  const kWp = round2((modules * panelW) / 1000);

  let extras = 0;
  if (hasDemand) {
    if (input.roof === 'laje') extras += p.lajeExtra;
    else if (input.roof === 'carport') extras += input.carportPrice ?? 0;
    else extras += p.roofExtras?.[input.roof] ?? 0;
    extras += p.moduleBrandExtras?.[input.moduleBrand] ?? 0;
    if (input.systemType !== 'ampliacao') extras += p.inverterBrandExtras?.[input.inverterBrand] ?? 0;
    if (input.roof === 'carport' && !input.carportPrice) warnings.push('Carport: informe o orçamento da estrutura metálica para somar ao projeto.');
    if (input.systemType === 'hibrido' || input.systemType === 'bateria') {
      extras += modules > p.hybridThreshold ? p.hybridCostHigh : p.hybridCostLow;
    }
    if (input.systemType === 'bateria') extras += Math.max(0, input.batteries) * p.batteryPrice;
  }
  const hasBase = kitPrice > 0;
  const basePrice = hasBase ? kitPrice + extras : 0;

  let tablePrice: number;
  let finalPrice: number;
  const closed = input.pricing.closedPrice ?? 0;
  if (input.pricing.mode === 'definido' && closed > 0) {
    finalPrice = closed;
    tablePrice = closed + (input.pricing.shownDiscount ?? 0);
  } else if (input.pricing.mode === 'fixo' && closed > 0) {
    finalPrice = tablePrice = closed;
  } else if (input.pricing.mode === 'fechado' && closed > 0) {
    finalPrice = input.pricing.closedPrice as number;
    tablePrice = Math.max(finalPrice, hasBase ? basePrice + input.pricing.anchoring : finalPrice);
  } else {
    tablePrice = hasBase ? basePrice + input.pricing.anchoring : 0;
    finalPrice = hasBase ? Math.max(0, tablePrice - input.pricing.discount) : 0;
  }
  if (input.pricing.discountOff) finalPrice = tablePrice;
  finalPrice = round2(finalPrice);
  tablePrice = round2(tablePrice);
  const discountShown = round2(Math.max(0, tablePrice - finalPrice));

  const pay = input.payment;
  let downPayment = 0;
  let installmentValue = 0;
  let installments = 0;
  let totalPaid = finalPrice;
  if (pay.method !== 'vista' && finalPrice > 0) {
    downPayment = pay.method === 'entrada' ? Math.min(Math.max(0, pay.downPayment), finalPrice) : 0;
    installments = pay.installments;
    installmentValue = installmentFor(input, finalPrice, installments);
    totalPaid = round2(downPayment + installmentValue * installments);
  }

  const billedAfter = Math.max(minKwh, consumptionKwh - generationKwh);
  // Orçamentos salvos antes da v3.0.1 não têm os campos do Fio B em params.
  const compensatedKwh = Math.max(0, consumptionKwh - billedAfter);
  const fioBCost = hasDemand ? compensatedKwh * (p.fioB || 0) * ((p.fioBPct || 0) / 100) : 0;
  const newBill = round2(hasDemand ? billedAfter * p.tariff + p.lightingFee + fioBCost : 0);
  const monthlySavings = round2(Math.max(0, currentBill - newBill));
  const annualSavings = round2(monthlySavings * 12);
  const paybackMonths = monthlySavings > 0 && totalPaid > 0 ? totalPaid / monthlySavings : null;

  const sale = finalPrice * (p.commissionPct / 100);
  // Valor digitado à mão não tem como separar o que é sobra da tabela
  const overprice = hasBase && !(input.pricing.mode === 'definido' && closed > 0) ? Math.max(0, finalPrice - basePrice) * (p.overpriceSharePct / 100) : 0;
  const gross = sale + overprice;
  const tax = gross * (p.taxPct / 100);
  const commission: Commission = {
    sale: round2(sale),
    overprice: round2(overprice),
    gross: round2(gross),
    tax: round2(tax),
    net: round2(gross - tax),
  };

  return {
    ready: hasDemand && finalPrice > 0,
    consumptionKwh,
    targetKwh,
    minKwh,
    currentBill: round2(currentBill),
    kit,
    kitSource,
    availableInverters: available,
    panelW,
    modules,
    kWp,
    inverterLabel: inverterText,
    generationKwh,
    coverage: consumptionKwh > 0 ? generationKwh / consumptionKwh : 0,
    fioBCost: round2(fioBCost),
    newBill,
    monthlySavings,
    annualSavings,
    savings25y: round2(annualSavings * 25),
    basePrice: round2(basePrice),
    tablePrice,
    finalPrice,
    discountShown,
    downPayment,
    installmentValue,
    installments,
    totalPaid,
    paybackMonths,
    commission,
    warnings,
    ...(input.systemType === 'ampliacao' && input.existing
      ? { existingKwh: Math.round(input.existing.modules * (input.existing.w / 1000) * p.productivity), totalModules: input.existing.modules + modules }
      : {}),
  };
}

/**
 * Comparação da conta no Orçamento. À vista: hoje e com solar. Financiado ou com entrada: hoje e a parcela,
 * porque o resto da conta com solar (iluminação pública) só se sabe pela fatura.
 * Só aparece quando a economia passa de R$ 30.
 */
export function billCompare(r: Pick<QuoteResult, 'currentBill' | 'newBill' | 'installmentValue'>, method: PayMethod): { label: string; value: number; savings: number } | null {
  const vista = method === 'vista';
  const value = vista ? r.newBill : r.installmentValue;
  const savings = r.currentBill - value;
  return savings > 30 ? { label: vista ? 'Com solar' : 'Parcela', value, savings } : null;
}
