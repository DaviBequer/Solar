import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, newQuoteInput } from './defaults';
import { draftForClient } from './quote';
import type { Proposal } from './types';

const input = (over: object = {}) => ({ ...newQuoteInput(DEFAULT_SETTINGS), billValue: 500, ...over });
const proposal = (id: string, leadId: string, updatedAt: string, discount: number) => ({ id, leadId, updatedAt, input: input({ pricing: { mode: 'tabela', anchoring: 900, discount, closedPrice: null } }) }) as unknown as Proposal;

describe('orçamento de cada cliente', () => {
  const saved = [proposal('a1', 'a', '2026-11-01', 100), proposal('a2', 'a', '2026-11-05', 200), proposal('b1', 'b', '2026-11-06', 300)];

  it('abre o último orçamento salvo do cliente', () => {
    const d = draftForClient({ leadId: 'b', proposalId: 'b1', input: input() }, 'a', saved, DEFAULT_SETTINGS);
    expect(d.proposalId).toBe('a2');
    expect(d.input.pricing.discount).toBe(200);
  });

  it('cliente sem orçamento não herda valores de outro cliente', () => {
    const d = draftForClient({ leadId: 'b', proposalId: 'b1', input: input({ pricing: { mode: 'tabela', anchoring: 900, discount: 300, closedPrice: null }, params: { ...newQuoteInput(DEFAULT_SETTINGS).params, taxPct: 99 } }) }, 'c', saved, DEFAULT_SETTINGS);
    expect(d).toMatchObject({ leadId: 'c', proposalId: null });
    expect(d.input.billValue).toBe(0);
    expect(d.input.pricing.discount).toBe(0);
    expect(d.input.params.taxPct).toBe(DEFAULT_SETTINGS.taxPct);
  });

  it('conta digitada antes de escolher o cliente fica com ele', () => {
    const typed = input({ billValue: 680 });
    const d = draftForClient({ leadId: null, proposalId: null, input: typed }, 'a', saved, DEFAULT_SETTINGS);
    expect(d).toMatchObject({ leadId: 'a', proposalId: null });
    expect(d.input.billValue).toBe(680);
  });

  it('o rascunho é cópia: mexer nele não altera o salvo', () => {
    const d = draftForClient({ leadId: null, proposalId: null, input: input({ billValue: 0 }) }, 'a', saved, DEFAULT_SETTINGS);
    d.input.pricing.discount = 1;
    expect(saved[1].input.pricing.discount).toBe(200);
  });

  it('o mesmo cliente continua de onde estava', () => {
    const cur = { leadId: 'a', proposalId: null, input: input({ billValue: 321 }) };
    expect(draftForClient(cur, 'a', saved, DEFAULT_SETTINGS)).toBe(cur);
  });
});
