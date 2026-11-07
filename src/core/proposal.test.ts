import { describe, expect, it } from 'vitest';
import { calculate } from './calc';
import { DEFAULT_SETTINGS, newQuoteInput } from './defaults';
import { compareYears, defaultPlans, planChoices, proposalContent, proposalStory } from './proposal';
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

describe('proposta em duas páginas', () => {
  it('período da conta cresce com o tempo de retorno', () => {
    expect([compareYears(null), compareYears(32), compareYears(36), compareYears(48), compareYears(80)]).toEqual([10, 10, 10, 12, 15]);
  });
  it('planos: à vista, entrada do orçamento e prazos pedidos, com totais coerentes', () => {
    const p = proposal();
    p.input.payment = { ...p.input.payment, downPayment: 5000, installments: 60 };
    const list = planChoices(p, [48, 72]);
    expect(list.map((c) => c.key)).toEqual(['vista', 'entrada', 'fin48', 'fin72']);
    expect(list[0].total).toBe(p.result.finalPrice);
    expect(list[1].total).toBeCloseTo(5000 + list[1].monthly * 60, 2);
    expect(list[2].monthly).toBeGreaterThan(list[3].monthly);
  });
  it('sem entrada no orçamento, não oferece entrada; a forma do orçamento vem como principal', () => {
    const p = proposal();
    expect(planChoices(p, [72]).some((c) => c.key === 'entrada')).toBe(false);
    p.input.payment = { ...p.input.payment, method: 'financiado', installments: 72 };
    expect(defaultPlans(p)).toEqual({ keys: ['vista', 'fin72'], main: 'fin72' });
  });
  it('a história usa o total da forma principal e os marcos de economia', () => {
    const p = proposal();
    const vista = planChoices(p, [])[0];
    const s = proposalStory(p, vista);
    expect(s.billTotal).toBeCloseTo(p.result.currentBill * 12 * s.years);
    expect(s.keep).toBeCloseTo(p.result.monthlySavings * 12 * s.years - p.result.finalPrice);
    expect(s.marks.map((m) => m.years)).toEqual([1, 3, 5, s.years]);
  });
});

describe('retorno por forma de pagamento', () => {
  it('o período da conta segue o total da forma principal', () => {
    const p = proposal();
    const [vista, fin] = planChoices(p, [96]);
    expect(proposalStory(p, vista).payback).toBeCloseTo(p.result.finalPrice / p.result.monthlySavings);
    expect(proposalStory(p, fin).payback!).toBeGreaterThan(proposalStory(p, vista).payback!);
  });
});
