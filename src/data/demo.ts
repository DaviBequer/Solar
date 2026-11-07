import type { Kit, Lead, PayMethod, Proposal, Settings } from '../core/types';
import { newQuoteInput } from '../core/defaults';
import { calculate } from '../core/calc';
import { uid } from '../core/format';

/** Clientes de exemplo, um por forma de pagamento, para quem abre o app pela primeira vez. Nomes inventados: podem ser excluídos. */
const DEMO: { name: string; bill: number; method: PayMethod; downPayment?: number }[] = [
  { name: 'Exemplo à vista', bill: 450, method: 'vista' },
  { name: 'Exemplo financiado', bill: 660, method: 'financiado' },
  { name: 'Exemplo entrada e parcelas', bill: 900, method: 'entrada', downPayment: 10000 },
];

export function demoData(settings: Settings, kits: Kit[], now = new Date().toISOString()): { leads: Lead[]; proposals: Proposal[] } {
  const leads: Lead[] = [];
  const proposals: Proposal[] = [];
  DEMO.forEach((d, i) => {
    const lead: Lead = { id: uid(), name: d.name, phone: '', address: '', lat: null, lng: null, status: 'negociando', createdAt: now, updatedAt: now, records: [], attachments: [], soldAt: null, soldProposalId: null, commission: null };
    const base = newQuoteInput(settings);
    const input = { ...base, billValue: d.bill, payment: { ...base.payment, method: d.method, downPayment: d.downPayment ?? 0 } };
    proposals.push({ id: uid(), number: settings.nextProposalNumber + i, leadId: lead.id, createdAt: now, updatedAt: now, issuedAt: now, status: 'enviado', input, result: calculate(input, kits) });
    leads.push(lead);
  });
  return { leads, proposals };
}
