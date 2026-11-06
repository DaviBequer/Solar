import type { Kit, Lead, Proposal, Task, Settings, QuoteInput, LeadStatus, ProposalStatus, TaskType, Roof, Grid, SystemType, PanelW, PayMethod, Attachment } from '../core/types';
import { DEFAULT_SETTINGS, newQuoteInput, paramsFrom } from '../core/defaults';
import { calculate } from '../core/calc';
import { uid } from '../core/format';

export interface BackupFile {
  id: string;
  type: string;
  dataUrl: string;
}

export interface Backup {
  app: 'sonit';
  version: 3;
  exportedAt: string;
  settings: Settings;
  kits: Kit[];
  leads: Lead[];
  proposals: Proposal[];
  tasks: Task[];
  files: BackupFile[];
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/* ---------- Backup do app antigo (AI Studio) ---------- */

type Any = Record<string, any>;

const LEAD_STATUS: Record<string, LeadStatus> = { Novo: 'novo', 'Em Negociação': 'negociando', Vendido: 'vendido', Perdido: 'perdido' };
const PROP_STATUS: Record<string, ProposalStatus> = { Rascunho: 'rascunho', Enviado: 'enviado', Aprovado: 'aprovado', Rejeitado: 'recusado' };
const TASK_TYPE: Record<string, TaskType> = {
  'Visita Orçamento': 'visita-orcamento',
  'Visita Técnica': 'visita-tecnica',
  Retorno: 'retorno',
  'Pós-venda': 'pos-venda',
};
const ROOF: Record<string, Roof> = { Ceramica: 'ceramica', Fibrocimento: 'fibrocimento', Metalico: 'metalico', Laje: 'laje', Solo: 'solo', Carport: 'carport' };
const GRID: Record<string, Grid> = { '110v': 'mono', '220v': 'mono', bifasico: 'bi', trifasico: 'tri' };
const SYS: Record<string, SystemType> = { 'ON-GRID': 'ongrid', HIBRIDO: 'hibrido', BATERIA: 'bateria', AMPLIACAO: 'ampliacao' };
const PAY: Record<string, PayMethod> = { VISTA: 'vista', FINAN: 'financiado', ENTRY: 'entrada' };

export function isLegacyBackup(data: Any): boolean {
  return !!data && typeof data === 'object' && 'timestamp' in data && ('leads' in data || 'kits' in data) && data.app !== 'sonit';
}

export function convertLegacy(data: Any): Backup {
  const now = new Date().toISOString();
  const bp: Any = data.budgetParams ?? {};
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    tariff: bp.tariff ?? DEFAULT_SETTINGS.tariff,
    iof: bp.iof ?? DEFAULT_SETTINGS.iof,
    spread: bp.spread ?? DEFAULT_SETTINGS.spread,
    commissionPct: bp.commission ?? DEFAULT_SETTINGS.commissionPct,
    taxPct: bp.tax ?? DEFAULT_SETTINGS.taxPct,
    companyName: bp.proposalCompanyName ?? '',
    companyLogo: bp.proposalCompanyLogo ?? null,
  };

  const kits: Kit[] = (data.kits ?? []).map((k: Any) => ({
    id: String(k.id ?? uid()),
    gm: parseInt(String(k.gm ?? '0').replace(/\D/g, ''), 10) || 0,
    panel585: Number(k.panel585) || 0,
    panel610: Number(k.panel610) || 0,
    panel700: Number(k.panel700) || 0,
    inverter: String(k.inverter ?? ''),
    price: Number(k.price) || 0,
  }));

  const files: BackupFile[] = [];
  const oldProposals: Any[] = data.proposals ?? [];

  const leads: Lead[] = (data.leads ?? []).map((l: Any) => {
    const records = (l.records ?? []).map((r: Any) => ({ id: String(r.id ?? uid()), text: String(r.content ?? ''), date: r.date ?? now }));
    if (l.notes && records.length === 0) records.push({ id: uid(), text: String(l.notes), date: l.createdAt ?? now });
    const attachments: Attachment[] = [];
    for (const a of [...(l.attachments ?? []), ...(l.images ?? [])]) {
      if (typeof a?.url === 'string' && a.url.startsWith('data:')) {
        const id = uid();
        const type = a.url.slice(5, a.url.indexOf(';')) || 'image/jpeg';
        files.push({ id, type, dataUrl: a.url });
        attachments.push({ id, name: a.name ?? 'Anexo', type, date: a.createdAt ?? now });
      }
    }
    const status = LEAD_STATUS[l.status] ?? 'novo';
    const approved = oldProposals.find((p) => p.leadId === l.id && p.status === 'Aprovado');
    return {
      id: String(l.id),
      name: String(l.name ?? 'Cliente'),
      phone: String(l.phone ?? ''),
      address: String(l.address ?? ''),
      lat: typeof l.lat === 'number' ? l.lat : null,
      lng: typeof l.lng === 'number' ? l.lng : null,
      status,
      createdAt: new Date(l.createdAt ?? now).toISOString(),
      updatedAt: now,
      records,
      attachments,
      soldAt: status === 'vendido' ? (approved?.date ?? new Date(l.createdAt ?? now).toISOString()) : null,
      soldProposalId: approved?.id ?? null,
      commission: typeof l.commissionValue === 'number' ? { value: l.commissionValue, manual: !!l.isManualCommission, paid: false } : null,
    };
  });

  const sorted = [...oldProposals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const proposals: Proposal[] = sorted.map((p: Any, i) => {
    const c: Any = p.systemConfig ?? {};
    const params = { ...paramsFrom(settings), ...(p.calculationParams ? { tariff: p.calculationParams.tariff ?? settings.tariff, commissionPct: p.calculationParams.commission ?? settings.commissionPct, taxPct: p.calculationParams.tax ?? settings.taxPct, iof: p.calculationParams.iof ?? settings.iof, spread: p.calculationParams.spread ?? settings.spread } : {}) };
    const units: Any[] = c.consumptionUnits ?? [];
    let monthly: number[] | null = null;
    if (units.length) {
      monthly = Array.from({ length: 12 }, (_, m) => units.reduce((sum, u) => sum + (parseFloat(String(u.values?.[m] ?? '0').replace(',', '.')) || 0), 0));
      if (!monthly.some((v) => v > 0)) monthly = null;
    }
    const base = newQuoteInput(settings);
    const input: QuoteInput = {
      ...base,
      billMode: c.isMoneyMode === false ? 'kwh' : 'reais',
      billValue: Number(c.consumption) || 0,
      monthly,
      systemType: SYS[p.systemType ?? c.systemType] ?? 'ongrid',
      roof: ROOF[c.roofType] ?? 'ceramica',
      grid: GRID[c.voltage] ?? 'bi',
      panelW: ([585, 610, 700].includes(p.panelPower) ? p.panelPower : 610) as PanelW,
      moduleBrand: c.moduleBrand ?? 'Trina',
      inverterBrand: c.inverterBrand ?? '',
      manualModules: c.manualModuleCount ?? null,
      manualInverter: c.manualInverter ?? null,
      batteries: c.batteryCount ?? 1,
      pricing: { mode: 'fechado', anchoring: 0, discount: 0, closedPrice: Number(p.totalPrice) || null },
      payment: { ...base.payment, method: PAY[p.paymentMethod] ?? 'vista' },
      params: { ...params, safetyMargin: c.safetyMargin ?? params.safetyMargin },
    };
    return {
      id: String(p.id),
      number: i + 1,
      leadId: String(p.leadId),
      createdAt: new Date(p.date ?? now).toISOString(),
      updatedAt: new Date(p.date ?? now).toISOString(),
      status: PROP_STATUS[p.status] ?? 'rascunho',
      input,
      result: calculate(input, kits),
    };
  });
  settings.nextProposalNumber = proposals.length + 1;

  const tasks: Task[] = (data.tasks ?? [])
    .filter((t: Any) => t.scheduledDate)
    .map((t: Any) => ({
      id: String(t.id ?? uid()),
      type: TASK_TYPE[t.solarType] ?? 'outro',
      leadId: t.linkedLeadId ?? null,
      date: new Date(t.scheduledDate).toISOString(),
      durationMin: 60,
      reminderMin: Number(t.reminderMinutes) || 0,
      notes: String(t.description ?? t.title ?? ''),
      done: t.status === 'Done',
      doneAt: t.status === 'Done' ? now : null,
      notified: !!t.notified,
      createdAt: new Date(t.createdAt ?? now).toISOString(),
    }));

  return { app: 'sonit', version: 3, exportedAt: now, settings, kits, leads, proposals, tasks, files };
}

export function parseBackup(text: string): Backup {
  let data: Any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um backup válido.');
  }
  if (data?.app === 'sonit' && data.version === 3) {
    return { ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } } as Backup;
  }
  if (isLegacyBackup(data)) return convertLegacy(data);
  throw new Error('O arquivo não é um backup do Sonit.');
}
