import type { CalcParams, QuoteInput, Settings, Roof, Grid, SystemType, TaskType, LeadStatus, ProposalStatus, PayMethod } from './types';

export const DEFAULT_SETTINGS: Settings = {
  companyName: '',
  companyLogo: null,
  sellerName: '',
  sellerPhone: '',
  tariff: 0.92,
  safetyMargin: 20,
  lightingFee: 0,
  productivity: 125,
  iof: 3.38,
  spread: 5.15,
  commissionPct: 3,
  overpriceSharePct: 50,
  taxPct: 11,
  lajeExtra: 1000,
  hybridThreshold: 12,
  hybridCostLow: 3000,
  hybridCostHigh: 5000,
  batteryPrice: 6000,
  expansionModulePrice: 0,
  interestRate: 2.1,
  installments: 72,
  monthlyGoal: 0,
  proposalValidityDays: 10,
  nextProposalNumber: 1,
  lastBackupAt: null,
};

export function paramsFrom(s: Settings): CalcParams {
  return {
    tariff: s.tariff,
    safetyMargin: s.safetyMargin,
    lightingFee: s.lightingFee,
    productivity: s.productivity,
    iof: s.iof,
    spread: s.spread,
    commissionPct: s.commissionPct,
    overpriceSharePct: s.overpriceSharePct,
    taxPct: s.taxPct,
    lajeExtra: s.lajeExtra,
    hybridThreshold: s.hybridThreshold,
    hybridCostLow: s.hybridCostLow,
    hybridCostHigh: s.hybridCostHigh,
    batteryPrice: s.batteryPrice,
    expansionModulePrice: s.expansionModulePrice,
  };
}

export function newQuoteInput(s: Settings, prev?: Partial<QuoteInput>): QuoteInput {
  return {
    billMode: 'reais',
    billValue: 0,
    monthly: null,
    systemType: 'ongrid',
    roof: prev?.roof ?? 'ceramica',
    grid: prev?.grid ?? 'bi',
    panelW: prev?.panelW ?? 610,
    moduleBrand: prev?.moduleBrand ?? 'Trina',
    inverterBrand: prev?.inverterBrand ?? '',
    manualModules: null,
    manualInverter: null,
    batteries: 1,
    pricing: { mode: 'tabela', anchoring: 0, discount: 0, closedPrice: null },
    payment: { method: 'vista', installments: s.installments, interestRate: s.interestRate, downPayment: 0 },
    params: paramsFrom(s),
  };
}

export const ROOF_LABEL: Record<Roof, string> = {
  ceramica: 'Cerâmica',
  fibrocimento: 'Fibrocimento',
  metalico: 'Metálico',
  laje: 'Laje',
  solo: 'Solo',
  carport: 'Carport',
};

export const GRID_LABEL: Record<Grid, string> = {
  mono: 'Monofásico',
  bi: 'Bifásico',
  tri: 'Trifásico',
};

/** Consumo mínimo faturado pela distribuidora (custo de disponibilidade) */
export const GRID_MIN_KWH: Record<Grid, number> = { mono: 30, bi: 50, tri: 100 };

export const SYSTEM_LABEL: Record<SystemType, string> = {
  ongrid: 'On-grid',
  hibrido: 'Híbrido',
  bateria: 'Bateria',
  ampliacao: 'Ampliação',
};

export const PAY_LABEL: Record<PayMethod, string> = {
  vista: 'À vista',
  financiado: 'Financiado',
  entrada: 'Com entrada',
};

export const TASK_LABEL: Record<TaskType, string> = {
  'visita-orcamento': 'Visita de orçamento',
  'visita-tecnica': 'Visita técnica',
  retorno: 'Retorno',
  'pos-venda': 'Pós-venda',
  outro: 'Compromisso',
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo',
  negociando: 'Negociando',
  vendido: 'Vendido',
  perdido: 'Perdido',
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export const MODULE_BRANDS = ['Trina', 'DMEGC', 'WEG'];
export const INVERTER_BRANDS = ['SAJ', 'SOFAR', 'WEG'];
export const INSTALLMENT_OPTIONS = [12, 24, 36, 48, 60, 72, 84, 96];
