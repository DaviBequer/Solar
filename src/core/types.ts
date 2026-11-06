export type SystemType = 'ongrid' | 'hibrido' | 'bateria' | 'ampliacao';
export type Roof = 'ceramica' | 'fibrocimento' | 'metalico' | 'laje' | 'solo' | 'carport';
export type Grid = 'mono' | 'bi' | 'tri';
export type PanelW = 585 | 610 | 700;
export type PayMethod = 'vista' | 'financiado' | 'entrada';
export type LeadStatus = 'novo' | 'negociando' | 'vendido' | 'perdido';
export type ProposalStatus = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
export type TaskType = 'visita-orcamento' | 'visita-tecnica' | 'retorno' | 'pos-venda' | 'outro';

export interface Kit {
  id: string;
  /** Geração média do kit em kWh por mês */
  gm: number;
  panel585: number;
  panel610: number;
  panel700: number;
  inverter: string;
  price: number;
}

/** Parâmetros que entram no cálculo. Cada orçamento guarda a sua cópia. */
export interface CalcParams {
  tariff: number;
  safetyMargin: number;
  lightingFee: number;
  /** Fio B em R$ por kWh compensado (Lei 14.300) */
  fioB: number;
  /** Percentual do Fio B cobrado no ano */
  fioBPct: number;
  productivity: number;
  iof: number;
  spread: number;
  commissionPct: number;
  overpriceSharePct: number;
  taxPct: number;
  lajeExtra: number;
  hybridThreshold: number;
  hybridCostLow: number;
  hybridCostHigh: number;
  batteryPrice: number;
  expansionModulePrice: number;
}

export interface Settings extends CalcParams {
  companyName: string;
  companyLogo: string | null;
  sellerName: string;
  sellerPhone: string;
  interestRate: number;
  installments: number;
  monthlyGoal: number;
  proposalValidityDays: number;
  nextProposalNumber: number;
  lastBackupAt: string | null;
  /** Modelo de contrato importado. Fica só no aparelho: o repositório do app é público. */
  contractTemplate: string | null;
}

export interface QuoteInput {
  billMode: 'reais' | 'kwh';
  billValue: number;
  /** 12 meses de consumo em kWh, quando a média foi calculada pelo histórico */
  monthly: number[] | null;
  systemType: SystemType;
  roof: Roof;
  grid: Grid;
  panelW: PanelW;
  moduleBrand: string;
  inverterBrand: string;
  manualModules: number | null;
  manualInverter: string | null;
  batteries: number;
  pricing: {
    mode: 'tabela' | 'fechado';
    anchoring: number;
    discount: number;
    closedPrice: number | null;
  };
  payment: {
    method: PayMethod;
    installments: number;
    interestRate: number;
    downPayment: number;
  };
  params: CalcParams;
}

export interface Commission {
  sale: number;
  overprice: number;
  gross: number;
  tax: number;
  net: number;
}

export interface QuoteResult {
  ready: boolean;
  consumptionKwh: number;
  targetKwh: number;
  minKwh: number;
  currentBill: number;
  kit: Kit | null;
  kitSource: 'tabela' | 'ampliacao' | 'estimado';
  availableInverters: string[];
  panelW: PanelW;
  modules: number;
  kWp: number;
  inverterLabel: string;
  generationKwh: number;
  coverage: number;
  /** Parte da conta nova que vem do Fio B. Ausente em orçamentos salvos antes da v3.0.1. */
  fioBCost?: number;
  newBill: number;
  monthlySavings: number;
  annualSavings: number;
  savings25y: number;
  basePrice: number;
  tablePrice: number;
  finalPrice: number;
  discountShown: number;
  downPayment: number;
  installmentValue: number;
  installments: number;
  totalPaid: number;
  paybackMonths: number | null;
  commission: Commission;
  warnings: string[];
}

export interface LeadRecord {
  id: string;
  text: string;
  date: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  date: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  /** CPF ou CNPJ, data de nascimento (aaaa-mm-dd) e CEP: pedidos ao gerar o contrato */
  document?: string;
  birthDate?: string;
  cep?: string;
  address: string;
  lat: number | null;
  lng: number | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  records: LeadRecord[];
  attachments: Attachment[];
  soldAt: string | null;
  soldProposalId: string | null;
  commission: { value: number; manual: boolean; paid: boolean } | null;
}

export interface Proposal {
  id: string;
  number: number;
  leadId: string;
  createdAt: string;
  updatedAt: string;
  /** Quando o conteúdo foi salvo pela última vez. Ausente nas propostas de antes da v3.0.2. */
  issuedAt?: string;
  status: ProposalStatus;
  input: QuoteInput;
  result: QuoteResult;
}

export interface Task {
  id: string;
  type: TaskType;
  leadId: string | null;
  date: string;
  durationMin: number;
  reminderMin: number;
  notes: string;
  done: boolean;
  doneAt: string | null;
  notified: boolean;
  createdAt: string;
}
