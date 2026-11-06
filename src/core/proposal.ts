import { calculate } from './calc';
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
