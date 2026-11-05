
export interface UnitConsumption {
    id: string;
    name: string;
    values: string[]; // 12 campos como string para facilitar edição
}

// NOVO: Estrutura para salvar preços manuais definidos pelo usuário
export interface CustomPricing {
    isActive: boolean;
    finalPrice: number;      // O valor real que será cobrado (base dos cálculos)
    tableValue: number;      // Valor de "Tabela" (Ancoragem visual)
    visualDiscount: number;  // Valor do desconto (Apenas visual/texto)
}

// NOVO: Estrutura da Tabela Manual de Preços
export interface ManualPricing {
    modulePrice: number; // Preço base por módulo
    inverterPrices: Record<string, number>; // Mapa: "3K": 2000, "5K": 3000...
    moduleBrandPrices: Record<string, number>; // Adicional por marca de módulo
    inverterBrandPrices: Record<string, number>; // Adicional por marca de inversor
}

// NOVO: Regra para custo de plataforma (Unificada)
export interface CostRule {
    threshold: number;   // Quantidade limite de módulos
    costLow: number;     // Valor se qtd <= threshold
    costHigh: number;    // Valor se qtd > threshold
}

// Conjunto de regras para os dois tipos
export interface HybridRulesSet {
    hybrid: CostRule;    // Regra da Plataforma (Usada para Híbrido e Bateria)
    batteryPrice: number; // Preço unitário da bateria
}

export interface SolarSystemConfig {
  consumption: number; // Monthly average in kWh or R$
  consumptionHistory?: number[]; // Deprecated: Mantido para compatibilidade
  consumptionUnits?: UnitConsumption[]; // NOVO: Persistência correta das unidades
  isMoneyMode: boolean; // true = R$, false = kWh
  roofType: RoofType;
  voltage: '110v' | '220v' | 'bifasico' | 'trifasico';
  moduleBrand: ModuleBrand;
  inverterBrand: InverterBrand;
  // Campos Opcionais para persistência de cenário detalhado
  batteryCount?: number;
  preferredPanel?: number | null;
  systemType?: 'ON-GRID' | 'HIBRIDO' | 'BATERIA' | 'AMPLIACAO';
  manualModuleCount?: number | null; // NOVO: Salva se o usuário definiu qtd manual
  safetyMargin?: number; // 0, 10, 20 (Porcentagem de sobredimensionamento)
  
  // NOVO: Salvar a escolha manual de inversor se houver
  manualInverter?: string | null;
  // NOVO: Custo extra manual para sistema Híbrido/Bateria (Substitui lógica fixa de 3000/5000)
  platformCost?: number; 
  
  // NOVO: Regras condicionais separadas
  hybridRules?: HybridRulesSet;
}

export type RoofType = 'Ceramica' | 'Fibrocimento' | 'Laje' | 'Solo' | 'Metalico' | 'Carport';
export type ModuleBrand = 'DMEGC' | 'Trina' | 'WEG';
export type InverterBrand = 'SAJ' | 'SOFAR' | 'WEG';

// --- CONFIGURAÇÃO GLOBAL DO APP ---
export interface AppConfig {
    appName: string;
    appLogo: string | null; // Pode ser Base64 ou URL relativa (./Nior.jpg)
    theme: 'light' | 'dark';
    defaultSharePhone?: string; // NOVO: Telefone padrão para envio de registros
}

export interface CalculationResult {
  systemSizeKw: number; // kWp
  panelCount: number;
  monthlyGeneration: number; // kWh
  annualSavings: number; // R$
  totalPrice: number; // R$
  paybackYears: number;
  co2Savings: number; // tonnes
}

// --- NOVOS PARÂMETROS DE CÁLCULO ---
export interface CalculationParams {
    tariff: number;      // R$/kWh
    anchoring: number;   // R$ (Valor adicionado para mostrar desconto depois)
    discount: number;    // R$
    spread: number;      // %
    iof: number;         // %
    commission: number;  // %
    overprice: number;   // %
    tax: number;         // %
    // --- IDENTIDADE DA PROPOSTA ---
    proposalCompanyName?: string; // Nome da empresa no PDF
    proposalCompanyLogo?: string; // Logo da empresa no PDF (Base64)
    // --- MODO DE CÁLCULO (NOVO) ---
    priceCalculationMode?: 'AUTO' | 'MANUAL' | 'FIXED'; // Salva a preferência do usuário
    fixedPrice?: number; // Valor fixo quando em modo FIXED
}

// --- NOVO: TIPO PARA CENÁRIO SALVO ---
export interface Scenario {
    id: string;
    name: string;
    config: SolarSystemConfig;
    results: {
        totalPrice: number;
        monthlySavings: number;
        paybackYears: number;
        monthlyGeneration: number;
        kitDetails?: SolarKit;
        commissionData?: any; // Para manter consistência visual do resultado
        grossPrice?: number;
        discountUsed?: number;
    };
    payment: {
        method: 'VISTA' | 'FINAN' | 'ENTRY';
        installments: number;
        monthlyInstallment: number;
        downPayment: number;
        interestRate?: number;
    };
    createdAt: number;
}

// --- NOVO: PROPOSTA SALVA NO DB (HISTÓRICO) ---
export type ProposalStatus = 'Rascunho' | 'Enviado' | 'Aprovado' | 'Rejeitado';

export interface SavedProposal {
    id: string;
    leadId: string;
    date: string; // ISO
    totalPrice: number;
    monthlyGeneration: number;
    systemConfig: SolarSystemConfig;
    paymentMethod: 'VISTA' | 'FINAN' | 'ENTRY';
    kitId?: string;
    // Campos adicionais para o resumo
    systemType?: 'ON-GRID' | 'HIBRIDO' | 'BATERIA' | 'AMPLIACAO';
    panelCount?: number;
    panelPower?: number;
    inverterModel?: string;
    // CRÍTICO: Salva os parâmetros financeiros exatos deste orçamento
    calculationParams?: CalculationParams; 
    
    // NOVO: Salva a precificação customizada se houver
    customPricing?: CustomPricing;
    
    // NOVO: Dados de comissão salvos no fechamento
    commissionData?: {
        isManual: boolean;
        value: number;
    };

    // NOVOS CAMPOS PARA CRM VISUAL
    status?: ProposalStatus;
    coverImage?: string; // URL ou Base64 da imagem de capa (ex: foto da sacada)
}

export interface LeadProposalSummary {
    systemType: 'ON-GRID' | 'HIBRIDO' | 'BATERIA' | 'AMPLIACAO';
    panelCount: number;
    panelPower: number; // ex: 585
    inverterModel: string;
    paymentMethod: 'VISTA' | 'FINAN' | 'ENTRY';
    totalPrice: number;
    monthlyGeneration: number;
    // Novos campos para relatório detalhado
    voltage?: string;
    roofType?: string;
    installments?: number;
    installmentValue?: number;
    interestRate?: number;
    downPayment?: number;
}

export interface LeadImage {
    id: string;
    url: string;
    name: string;
    createdAt: string;
}

// NOVO TIPO PARA REGISTROS
export interface LeadRecord {
    id: string;
    content: string;
    date: string; // ISO Date
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  address?: string; // Novo
  lat?: number; // Latitude exata
  lng?: number; // Longitude exata
  notes?: string;   // Deprecated: Mantido para compatibilidade, mas a UI usará records
  records?: LeadRecord[]; // Novo: Lista de registros
  images?: LeadImage[]; // Deprecated: Mantido para compatibilidade
  attachments?: LeadImage[]; // NOVO: Anexos específicos (Fatura, Poste, etc)
  status: 'Novo' | 'Em Negociação' | 'Vendido' | 'Perdido';
  proposalValue?: number;
  
  // NOVO: Dados de comissão para o dashboard
  commissionValue?: number;
  isManualCommission?: boolean;

  createdAt: Date;
  // Novo campo para o CRM
  lastProposalSummary?: LeadProposalSummary;
}

export interface SubTask {
    id: string;
    title: string;
    done: boolean;
}

// --- TASK TYPES ---
export type TaskType = 'Solar' | 'Geral';
export type SolarTaskType = 'Visita Orçamento' | 'Visita Técnica' | 'Retorno' | 'Pós-venda' | 'Outro';

export interface Task {
  id: string;
  title: string;
  category: TaskType;
  status: 'Pending' | 'In_Progress' | 'Done';
  createdAt: Date;
  linkedLeadId?: string; 
  solarType?: SolarTaskType;
  scheduledDate?: Date; // Obrigatório para agenda
  description?: string; // Novo campo para detalhes
  estimatedDuration?: number; 
  actualDurationSeconds?: number;
  startedAt?: number;
  reminderMinutes?: number; // NOVO: Minutos antes para notificar (0 = sem lembrete)
  notified?: boolean; // Controle interno para não notificar duas vezes
  isGeneral?: boolean; 
  priority?: 'High' | 'Medium' | 'Low';
  subtasks?: SubTask[];
}

export interface SolarKit {
  id: string;
  gm: string;         // Geração Média (ou identificador GM)
  panel585: number;   // Qtd Painel 585W
  panel610: number;   // Qtd Painel 610W
  panel700: number;   // Qtd Painel 700W
  inverter: string;   // Modelo Inversor
  price: number;      // Valor
}

// --- FULL BACKUP STRUCTURE ---
export interface BackupData {
    version: number;
    timestamp: string;
    appConfig: AppConfig | null;
    budgetParams: CalculationParams | null;
    manualPricing: ManualPricing | null;
    kits: SolarKit[];
    leads: Lead[];
    proposals: SavedProposal[];
    tasks: Task[];
}
