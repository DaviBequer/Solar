import { DEFAULT_SETTINGS, paramsFrom } from './defaults';
import type { CalcParams, QuoteInput, QuoteResult, Settings } from './types';

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
 * Soma ou tira um módulo a partir do que está na tela.
 * Fixa a potência em uso: o kit pode ter vindo de outra potência, e a quantidade só vale com ela.
 */
export function stepModules(input: QuoteInput, result: QuoteResult, delta: number): Partial<QuoteInput> {
  return { manualModules: Math.max(1, (input.manualModules ?? result.modules) + delta), manualInverter: null, panelW: result.panelW };
}
