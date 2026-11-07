import type { CalcParams, QuoteInput, Settings, Roof, Grid, SystemType, TaskType, LeadStatus, ProposalStatus, PayMethod } from './types';

export const DEFAULT_SETTINGS: Settings = {
  companyName: '',
  companyLogo: null,
  sellerName: '',
  sellerPhone: '',
  tariff: 0.92,
  safetyMargin: 20,
  lightingFee: 0,
  fioB: 0,
  fioBPct: 60,
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
  company: { legalName: '', cnpj: '', address: '', city: '', uf: '', representative: '' },
  contractDocx: null,
  gridLimits: { mono: { inverterKw: 7.5, modules: 24 }, bi: { inverterKw: 15, modules: 30 }, tri: { inverterKw: 150, modules: 371 } },
  inverterLimits: {},
  roofExtras: {},
  moduleBrandExtras: { Trina: 0, DMEGC: 0, WEG: 1000 },
  inverterBrandExtras: { SAJ: 0, SOFAR: 0, WEG: 1000 },
  panelPowers: [585, 610, 700],
  marginOptions: [30, 40, 50],
};

export function paramsFrom(s: Settings): CalcParams {
  return {
    tariff: s.tariff,
    safetyMargin: s.safetyMargin,
    lightingFee: s.lightingFee,
    fioB: s.fioB,
    fioBPct: s.fioBPct,
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
    gridLimits: s.gridLimits,
    inverterLimits: s.inverterLimits,
    roofExtras: s.roofExtras,
    moduleBrandExtras: s.moduleBrandExtras,
    inverterBrandExtras: s.inverterBrandExtras,
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
    panelW: s.defaultPanelW ?? prev?.panelW ?? 610,
    moduleBrand: s.defaultModuleBrand ?? prev?.moduleBrand ?? 'Trina',
    inverterBrand: s.defaultInverterBrand ?? prev?.inverterBrand ?? '',
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

export const INSTALLMENT_OPTIONS = [12, 24, 36, 48, 60, 72, 84, 96];
