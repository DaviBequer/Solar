import { allowedKits, kitKw, kitPanel, panelCount } from './calc';
import { DEFAULT_SETTINGS, newQuoteInput, paramsFrom } from './defaults';
import { currentProposal } from './sale';
import type { CalcParams, Kit, Lead, Proposal, QuoteInput, QuoteResult, Settings } from './types';

const PARAM_KEYS = Object.keys(paramsFrom(DEFAULT_SETTINGS)) as (keyof CalcParams)[];

/** Leva um ajuste salvo ao rascunho. Orçamento reaberto guarda a sua cópia e fica como está. */
export function withSettings<D extends { proposalId: string | null; input: QuoteInput }>(draft: D, patch: Partial<Settings>): D {
  if (draft.proposalId) return draft;
  const params = { ...draft.input.params };
  for (const k of PARAM_KEYS) if (patch[k] !== undefined) (params as Record<string, unknown>)[k] = patch[k];
  const payment = {
    ...draft.input.payment,
    ...(patch.interestRate !== undefined ? { interestRate: patch.interestRate } : {}),
    ...(patch.installments !== undefined ? { installments: patch.installments } : {}),
  };
  return { ...draft, input: { ...draft.input, params, payment } };
}

/**
 * Orçamento ao escolher um cliente: cada um tem o seu.
 * Abre o último salvo dele; sem nenhum, começa limpo, sem ancoragem, desconto ou taxas de outro cliente.
 * Só a conta digitada antes de escolher qualquer cliente passa para ele.
 */
export function draftForClient<D extends { leadId: string | null; proposalId: string | null; input: QuoteInput }>(draft: D, leadId: string, proposals: Proposal[], settings: Settings): D | { leadId: string; proposalId: string | null; input: QuoteInput } {
  if (draft.leadId === leadId) return draft;
  if (!draft.leadId && draft.input.billValue > 0) return { ...draft, leadId, proposalId: null };
  const latest = currentProposal(proposals, leadId);
  if (latest) return { leadId, proposalId: latest.id, input: structuredClone(latest.input) };
  return { leadId, proposalId: null, input: newQuoteInput(settings, draft.input) };
}

/** Compara ignorando a ordem das chaves: o rascunho reaberto pode vir com outra ordem. */
const canon = (v: unknown): string => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

/**
 * Ao sair do orçamento sem pedir para salvar: guarda só o que foi mexido.
 * Tabela nova não reescreve orçamento antigo, e venda fechada só muda salvando de propósito.
 */
export function keepOnLeave(input: QuoteInput, saved: Proposal | undefined, lead: Pick<Lead, 'soldProposalId'> | undefined): boolean {
  if (!saved) return true;
  return saved.id !== lead?.soldProposalId && canon(saved.input) !== canon(input);
}

/** Passa para o kit seguinte da tabela, dentro dos limites. Em ampliação, um módulo por vez. Sem próximo, devolve null. */
export function stepKit(input: QuoteInput, result: QuoteResult, kits: Kit[], delta: number): Partial<QuoteInput> | null {
  if (input.systemType === 'ampliacao') return { manualModules: Math.max(1, (input.manualModules ?? result.modules) + delta) };
  const counts = [...new Set(allowedKits(kits, input).map((k) => panelCount(k, result.panelW)).filter(Boolean))].sort((a, b) => a - b);
  const next = counts[counts.indexOf(result.modules) + delta];
  return next ? { manualModules: next, manualInverter: null, panelW: result.panelW } : null;
}

/** Tamanhos de inversor permitidos, do menor para o maior. */
export function inverterSizes(input: QuoteInput, kits: Kit[]): number[] {
  return [...new Set(allowedKits(kits, input).map((k) => kitKw(k.inverter)))].sort((a, b) => a - b);
}

/** Fixa o tamanho do inversor: o menor kit desse tamanho que cobre a conta, ou o maior deles. */
export function pickInverter(input: QuoteInput, result: QuoteResult, kits: Kit[], kw: number): Partial<QuoteInput> | null {
  const list = allowedKits(kits, input).filter((k) => kitKw(k.inverter) === kw).sort((a, b) => a.gm - b.gm);
  const kit = list.find((k) => k.gm >= result.targetKwh) ?? list.at(-1);
  if (!kit) return null;
  const panelW = kitPanel(kit, input.panelW);
  return { manualModules: panelCount(kit, panelW), manualInverter: kit.inverter, panelW };
}

/** Anos da projeção: mínimo de 6, retorno + 2 de folga, máximo de 10. */
export const horizonYears = (paybackMonths: number | null) => (paybackMonths === null ? 6 : Math.min(10, Math.max(6, Math.ceil(paybackMonths / 12) + 2)));
