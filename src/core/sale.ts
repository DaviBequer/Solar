import type { Lead, Proposal } from './types';

/** Data do conteúdo da proposta. Mudar a situação não altera. Propostas antes da v3.0.2 só têm updatedAt. */
export const issueDate = (p: Proposal): string => p.issuedAt ?? p.updatedAt;

/** Propostas do cliente, da emitida mais recente para a mais antiga */
export function proposalsOf(proposals: Proposal[], leadId: string): Proposal[] {
  return proposals.filter((p) => p.leadId === leadId).sort((a, b) => issueDate(b).localeCompare(issueDate(a)));
}

/** A proposta em jogo: a mais recente não recusada. Se todas foram recusadas, a última, para mostrar a situação. */
export function currentProposal(proposals: Proposal[], leadId: string): Proposal | null {
  const list = proposalsOf(proposals, leadId);
  return list.find((p) => p.status !== 'recusado') ?? list[0] ?? null;
}

/** Valor e quantidade de propostas abertas dos clientes em negociação */
export function pipeline(leads: Lead[], proposals: Proposal[]): { total: number; count: number } {
  let total = 0;
  let count = 0;
  for (const l of leads) {
    if (l.status !== 'negociando') continue;
    const p = currentProposal(proposals, l.id);
    if (!p || p.status === 'recusado') continue;
    total += p.result.finalPrice;
    count++;
  }
  return { total, count };
}

function soldProposal(lead: Lead, proposals: Proposal[]): Proposal | null {
  return proposals.find((p) => p.id === lead.soldProposalId) ?? currentProposal(proposals, lead.id);
}

/** Comissão da venda. Venda vinda do app antigo pode não ter o valor salvo: usa o calculado na proposta. */
export function saleCommission(lead: Lead, proposals: Proposal[]): NonNullable<Lead['commission']> {
  return lead.commission ?? { value: soldProposal(lead, proposals)?.result.commission.gross ?? 0, manual: false, paid: false };
}

export function salesOf(leads: Lead[], proposals: Proposal[]) {
  return leads
    .filter((l) => l.status === 'vendido' && l.soldAt)
    .map((l) => ({
      lead: l,
      date: new Date(l.soldAt!),
      value: soldProposal(l, proposals)?.result.finalPrice ?? 0,
      commission: saleCommission(l, proposals).value,
    }));
}

/**
 * Comissão depois de editar a proposta vendida, ou null se não muda.
 * Valor manual e comissão já recebida ficam como estão.
 */
export function commissionAfterEdit(lead: Lead, proposal: Proposal): Lead['commission'] {
  const c = lead.commission;
  if (lead.soldProposalId !== proposal.id || !c || c.manual || c.paid) return null;
  const value = proposal.result.commission.gross;
  return value === c.value ? null : { ...c, value };
}

/** A venda depende dessa proposta: apagar deixaria venda e comissão sem origem. */
export function isSoldProposal(lead: Lead, proposalId: string): boolean {
  return lead.status === 'vendido' && lead.soldProposalId === proposalId;
}
