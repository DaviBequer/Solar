import { calculate, installmentFor } from './calc';
import { brl, num } from './format';
import { issueDate } from './sale';
import type { Proposal, Settings } from './types';

export interface PayOption {
  key: string;
  label: string;
  value: string;
  on: boolean;
}

/** O que a proposta diz ao cliente, sem nada de desenho. */
export function proposalContent(proposal: Proposal, settings: Pick<Settings, 'proposalValidityDays'>) {
  const r = proposal.result;
  const input = proposal.input;
  const issued = new Date(issueDate(proposal));
  const valid = new Date(issued);
  valid.setDate(valid.getDate() + settings.proposalValidityDays);

  // A tabela de kits pode ter mudado: reaproveita o preço salvo para simular o financiamento
  const fin = calculate({ ...input, pricing: { ...input.pricing, mode: 'fechado', closedPrice: r.finalPrice }, payment: { ...input.payment, method: 'financiado', installments: input.payment.installments || 72 } }, []);

  const options: PayOption[] = [{ key: 'vista', label: 'À vista', value: brl(r.finalPrice), on: input.payment.method === 'vista' }];
  if (input.payment.method === 'entrada' && r.installmentValue > 0) {
    options.push({ key: 'entrada', label: 'Com entrada', value: `${brl(r.downPayment)} + ${r.installments}× ${brl(r.installmentValue)}`, on: true });
  }
  if (fin.installmentValue > 0) {
    options.push({ key: 'fin', label: 'Financiado', value: `${fin.installments}× ${brl(fin.installmentValue)}`, on: input.payment.method === 'financiado' });
  }

  const fioB = r.fioBCost ?? 0;
  return {
    issued,
    valid,
    options,
    rate: input.payment.interestRate,
    installmentBelowBill: input.payment.method !== 'vista' && r.installmentValue > 0 && r.installmentValue < r.currentBill,
    paybackFrac: r.paybackMonths !== null ? r.paybackMonths / 300 : null,
    paidAt: r.paybackMonths !== null ? new Date(issued.getFullYear(), issued.getMonth() + Math.round(r.paybackMonths), 1) : null,
    years: Array.from({ length: 6 }, (_, i) => issued.getFullYear() + i * 5),
    fioBNote: fioB > 0 ? `A conta nova inclui ${brl(fioB)} por mês de Fio B (Lei 14.300): ${num(input.params.fioBPct)}% de R$ ${num(input.params.fioB, 3)} por kWh compensado.` : null,
  };
}

/** Período da comparação da conta: curto quando o sistema se paga rápido, para não exagerar. */
export function compareYears(paybackMonths: number | null): number {
  if (paybackMonths === null || paybackMonths <= 36) return 10;
  return paybackMonths <= 60 ? 12 : 15;
}

export interface PlanChoice {
  key: string;
  label: string;
  /** Parcela por mês; 0 no à vista */
  monthly: number;
  down: number;
  months: number;
  total: number;
}

/** Formas de pagamento que dá para pôr no PDF: à vista, a entrada do orçamento (se houver) e cada prazo de financiamento. */
export function planChoices(proposal: Proposal, terms: number[]): PlanChoice[] {
  const { input, result: r } = proposal;
  const price = r.finalPrice;
  const out: PlanChoice[] = [{ key: 'vista', label: 'À vista', monthly: 0, down: 0, months: 0, total: price }];
  const down = Math.min(Math.max(0, input.payment.downPayment), price);
  if (down > 0) {
    const n = input.payment.installments || 60;
    const m = installmentFor({ ...input, payment: { ...input.payment, method: 'entrada' } }, price, n);
    out.push({ key: 'entrada', label: `Entrada + ${n}×`, monthly: m, down, months: n, total: down + m * n });
  }
  for (const n of terms) {
    const m = installmentFor({ ...input, payment: { ...input.payment, method: 'financiado' } }, price, n);
    if (m > 0) out.push({ key: `fin${n}`, label: `Financiado ${n}×`, monthly: m, down: 0, months: n, total: m * n });
  }
  return out;
}

/** O que vem marcado ao gerar: à vista e a forma do próprio orçamento, que fica como principal. */
export function defaultPlans(proposal: Proposal): { keys: string[]; main: string } {
  const p = proposal.input.payment;
  const own = p.method === 'vista' ? 'vista' : p.method === 'entrada' && p.downPayment > 0 ? 'entrada' : `fin${p.installments || 72}`;
  return { keys: own === 'vista' ? ['vista'] : ['vista', own], main: own };
}

/** Meses para a economia pagar um total; sem economia, não se paga */
export const paybackOf = (total: number, monthlySavings: number) => (monthlySavings > 0 ? total / monthlySavings : null);

/** Números da página 1: a conta no período, o sistema e o que sobra; e os marcos de economia. */
export function proposalStory(proposal: Proposal, main: PlanChoice) {
  const r = proposal.result;
  const payback = paybackOf(main.total, r.monthlySavings);
  const years = compareYears(payback);
  const billTotal = r.currentBill * 12 * years;
  const savingsTotal = r.monthlySavings * 12 * years;
  return {
    years,
    payback,
    billTotal,
    systemTotal: main.total,
    keep: savingsTotal - main.total,
    marks: [1, 3, 5, years].map((y) => ({ years: y, value: r.monthlySavings * 12 * y })),
  };
}
