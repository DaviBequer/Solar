import { DEFAULT_SETTINGS, newQuoteInput, paramsFrom } from './defaults';
import type { CalcParams, Proposal, QuoteInput, QuoteResult, Settings } from './types';

const PARAM_KEYS = Object.keys(paramsFrom(DEFAULT_SETTINGS)) as (keyof CalcParams)[];

/** Leva um ajuste salvo ao rascunho. Orçamento reaberto guarda a sua cópia e fica como está. */
export function withSettings<D extends { proposalId: string | null; input: QuoteInput }>(draft: D, patch: Partial<Settings>): D {
  if (draft.proposalId) return draft;
  const params = { ...draft.input.params };
  for (const k of PARAM_KEYS) if (patch[k] !== undefined) params[k] = patch[k] as number;
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
  const latest = proposals.filter((p) => p.leadId === leadId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (latest) return { leadId, proposalId: latest.id, input: structuredClone(latest.input) };
  return { leadId, proposalId: null, input: newQuoteInput(settings, draft.input) };
}

/**
 * Soma ou tira um módulo a partir do que está na tela.
 * Fixa a potência em uso: o kit pode ter vindo de outra potência, e a quantidade só vale com ela.
 */
export function stepModules(input: QuoteInput, result: QuoteResult, delta: number): Partial<QuoteInput> {
  return { manualModules: Math.max(1, (input.manualModules ?? result.modules) + delta), manualInverter: null, panelW: result.panelW };
}
