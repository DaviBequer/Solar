import { describe, expect, it } from 'vitest';
import { commissionAfterEdit, currentProposal, isSoldProposal, pipeline, proposalsOf, saleCommission, salesOf } from './sale';
import type { Lead, Proposal, ProposalStatus } from './types';

function lead(over: Partial<Lead> = {}): Lead {
  return { id: 'l1', name: 'Ana', phone: '', address: '', lat: null, lng: null, status: 'negociando', createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z', records: [], attachments: [], soldAt: null, soldProposalId: null, commission: null, ...over };
}

function prop(id: string, day: number, price: number, status: ProposalStatus = 'enviado', updatedDay = day): Proposal {
  const iso = (d: number) => `2026-11-${String(d).padStart(2, '0')}T10:00:00.000Z`;
  return { id, number: 1, leadId: 'l1', createdAt: iso(day), updatedAt: iso(updatedDay), issuedAt: iso(day), status, input: {} as Proposal['input'], result: { finalPrice: price, commission: { gross: price * 0.03 } } as Proposal['result'] };
}

describe('proposta atual', () => {
  it('mudar a situação não troca a ordem', () => {
    const list = [prop('p1', 1, 20000, 'enviado', 9), prop('p2', 2, 25000)];
    expect(proposalsOf(list, 'l1').map((p) => p.id)).toEqual(['p2', 'p1']);
  });

  it('recusada não vira a atual', () => {
    const list = [prop('p1', 1, 20000, 'recusado', 9), prop('p2', 2, 25000)];
    expect(currentProposal(list, 'l1')?.id).toBe('p2');
  });

  it('se a mais nova foi recusada, a anterior volta a ser a atual', () => {
    const list = [prop('p1', 1, 20000), prop('p2', 2, 25000, 'recusado')];
    expect(currentProposal(list, 'l1')?.id).toBe('p1');
  });

  it('proposta antiga sem issuedAt usa updatedAt', () => {
    const old = { ...prop('p1', 5, 1000), issuedAt: undefined };
    expect(proposalsOf([prop('p2', 2, 2000), old], 'l1')[0].id).toBe('p1');
  });
});

describe('pipeline', () => {
  it('não conta cliente só com proposta recusada', () => {
    expect(pipeline([lead()], [prop('p1', 1, 20000, 'recusado')])).toEqual({ total: 0, count: 0 });
  });

  it('soma a proposta atual dos clientes em negociação', () => {
    const list = [prop('p1', 1, 20000, 'recusado'), prop('p2', 2, 25000)];
    expect(pipeline([lead()], list)).toEqual({ total: 25000, count: 1 });
    expect(pipeline([lead({ status: 'novo' })], list)).toEqual({ total: 0, count: 0 });
  });
});

describe('venda', () => {
  const sold = lead({ status: 'vendido', soldAt: '2026-11-05T10:00:00.000Z', soldProposalId: 'p1', commission: { value: 600, manual: false, paid: false } });

  it('usa o valor da proposta vendida, mesmo com outra mais nova', () => {
    const [s] = salesOf([sold], [prop('p1', 1, 20000), prop('p2', 2, 25000)]);
    expect(s.value).toBe(20000);
    expect(s.commission).toBe(600);
  });

  it('venda do app antigo sem comissão usa a calculada na proposta', () => {
    const legacy = { ...sold, commission: null };
    expect(saleCommission(legacy, [prop('p1', 1, 20000)])).toEqual({ value: 600, manual: false, paid: false });
  });

  it('editar a proposta vendida atualiza a comissão calculada', () => {
    expect(commissionAfterEdit(sold, prop('p1', 1, 30000))).toEqual({ value: 900, manual: false, paid: false });
  });

  it('editar não mexe em comissão manual, recebida ou de outra proposta', () => {
    expect(commissionAfterEdit({ ...sold, commission: { value: 600, manual: true, paid: false } }, prop('p1', 1, 30000))).toBeNull();
    expect(commissionAfterEdit({ ...sold, commission: { value: 600, manual: false, paid: true } }, prop('p1', 1, 30000))).toBeNull();
    expect(commissionAfterEdit(sold, prop('p2', 1, 30000))).toBeNull();
  });

  it('identifica a proposta que sustenta a venda', () => {
    expect(isSoldProposal(sold, 'p1')).toBe(true);
    expect(isSoldProposal(sold, 'p2')).toBe(false);
  });
});
