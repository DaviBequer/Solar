import type { Kit, PanelW, QuoteInput, QuoteResult, Commission } from './types';
import { GRID_MIN_KWH } from './defaults';

const PANELS: PanelW[] = [585, 610, 700];

export function panelCount(kit: Kit, w: PanelW): number {
  if (w === 585) return kit.panel585 || 0;
  if (w === 610) return kit.panel610 || 0;
  return kit.panel700 || 0;
}

/** Potência do módulo que o kit usa (o maior número de módulos manda) */
function kitPanel(kit: Kit, preferred: PanelW): PanelW {
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

/** Parcela de financiamento pela tabela Price. Funciona com juros zero. */
export function installment(financed: number, ratePct: number, n: number): number {
  if (n <= 0 || financed <= 0) return 0;
  const r = ratePct / 100;
  if (r === 0) return financed / n;
  const f = Math.pow(1 + r, n);
  return (financed * r * f) / (f - 1);
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

  let candidates: Kit[];
  let panelW = want;
  let warning: string | null = null;

  if (input.manualModules) {
    candidates = kits.filter((k) => panelCount(k, want) === input.manualModules).sort(byQuality);
  } else {
    const covering = kits.filter((k) => k.gm >= targetKwh);
    candidates = covering.filter((k) => panelCount(k, want) > 0).sort(byQuality);
    if (candidates.length === 0 && covering.length > 0) {
      candidates = covering.sort(byQuality);
      panelW = kitPanel(candidates[0], want);
      warning = `Nenhum kit de ${want} W cobre esse consumo. Usei um kit com módulos de ${panelW} W.`;
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
      } else {
        modules = input.manualModules ?? Math.max(1, Math.ceil(targetKwh / ((panelW / 1000) * p.productivity)));
        generationKwh = Math.round(modules * (panelW / 1000) * p.productivity);
        if (kits.length === 0) {
          warnings.push('A tabela de kits está vazia. Importe em Ajustes ou informe o valor fechado.');
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
    if (input.systemType === 'hibrido' || input.systemType === 'bateria') {
      extras += modules > p.hybridThreshold ? p.hybridCostHigh : p.hybridCostLow;
    }
    if (input.systemType === 'bateria') extras += Math.max(0, input.batteries) * p.batteryPrice;
  }
  const hasBase = kitPrice > 0;
  const basePrice = hasBase ? kitPrice + extras : 0;

  let tablePrice: number;
  let finalPrice: number;
  if (input.pricing.mode === 'fechado' && (input.pricing.closedPrice ?? 0) > 0) {
    finalPrice = input.pricing.closedPrice as number;
    tablePrice = Math.max(finalPrice, hasBase ? basePrice + input.pricing.anchoring : finalPrice);
  } else {
    tablePrice = hasBase ? basePrice + input.pricing.anchoring : 0;
    finalPrice = hasBase ? Math.max(0, tablePrice - input.pricing.discount) : 0;
  }
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
    const financed = (finalPrice - downPayment) * (1 + (p.iof + p.spread) / 100);
    installments = pay.installments;
    installmentValue = round2(installment(financed, pay.interestRate, installments));
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
  const overprice = hasBase ? Math.max(0, finalPrice - basePrice) * (p.overpriceSharePct / 100) : 0;
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
  };
}
