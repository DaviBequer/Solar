import { describe, expect, it } from 'vitest';
import { calculate } from './calc';
import { DEFAULT_SETTINGS, newQuoteInput } from './defaults';
import { proposalContent } from './proposal';
import type { Kit, Proposal } from './types';

const kits: Kit[] = [{ id: 'b', gm: 890, panel585: 0, panel610: 12, panel700: 0, inverter: 'SOFAR 6K', price: 22900 }];

function proposal(over: Partial<Proposal> = {}, fioB = 0): Proposal {
  const input = newQuoteInput(DEFAULT_SETTINGS);
  input.billValue = 680;
  input.params = { ...input.params, fioB };
  return { id: 'p', number: 1, leadId: 'l', createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-20T12:00:00.000Z', issuedAt: '2026-11-01T12:00:00.000Z', status: 'enviado', input, result: calculate(input, kits), ...over };
}

describe('conteúdo da proposta', () => {
  it('a validade conta da emissão, não da última mudança de situação', () => {
    const c = proposalContent(proposal(), { proposalValidityDays: 10 });
    expect(c.issued.getDate()).toBe(1);
    expect(c.valid.getDate()).toBe(11);
    expect(c.valid.getMonth()).toBe(10);
  });

  it('proposta antiga sem issuedAt usa updatedAt', () => {
    const c = proposalContent(proposal({ issuedAt: undefined }), { proposalValidityDays: 10 });
    expect(c.issued.getDate()).toBe(20);
  });

  it('à vista também mostra a opção financiada, com a à vista marcada', () => {
    const c = proposalContent(proposal(), { proposalValidityDays: 10 });
    expect(c.options.map((o) => o.key)).toEqual(['vista', 'fin']);
    expect(c.options[0].on).toBe(true);
    expect(c.options[1].on).toBe(false);
  });

  it('cita o Fio B só quando ele entra na conta', () => {
    expect(proposalContent(proposal(), { proposalValidityDays: 10 }).fioBNote).toBeNull();
    expect(proposalContent(proposal({}, 0.3), { proposalValidityDays: 10 }).fioBNote).toMatch(/60% de R\$ 0,300/);
  });
});
