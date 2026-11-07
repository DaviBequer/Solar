import { num } from './format';
import type { Lead, Proposal } from './types';

export type ContractBlock =
  | { kind: 'title' | 'heading' | 'para' | 'indent' | 'sign'; text: string }
  | { kind: 'table'; rows: string[][] };

const FIELDS = ['nome', 'qualificacao', 'documento', 'endereco', 'geracao', 'kwp', 'inversor', 'modulos', 'modulo', 'valor', 'pagamento', 'data'];

/** Modelo é arquivo de fora do app: confere antes de guardar, para o erro aparecer na importação. */
export function templateProblem(template: string): string | null {
  if (!template.includes('{{nome}}')) return 'Este arquivo não é um modelo de contrato do Sonit.';
  const unknown = [...template.matchAll(/\{\{(.*?)\}\}/g)].map((m) => m[1]).find((f) => !FIELDS.includes(f));
  return unknown ? `O modelo tem um campo desconhecido: ${unknown}.` : null;
}

const digits = (s = '') => s.replace(/\D/g, '');

/** O que falta no cadastro para o contrato sair completo. */
export function contractMissing(lead: Pick<Lead, 'name' | 'address' | 'document' | 'birthDate' | 'cep'>): string[] {
  const doc = digits(lead.document);
  const missing: string[] = [];
  if (!lead.name.trim()) missing.push('nome');
  if (doc.length !== 11 && doc.length !== 14) missing.push('CPF ou CNPJ');
  if (doc.length === 11 && !lead.birthDate) missing.push('data de nascimento');
  if (!lead.address.trim()) missing.push('endereço');
  if (digits(lead.cep).length !== 8) missing.push('CEP');
  return missing;
}

const reais = (n: number) => `R$ ${num(n, 2)}`;

/** Texto inicial da forma de pagamento. Quem gera pode completar, por exemplo com o banco. */
export function defaultPayment(p: Proposal): string {
  const r = p.result;
  if (p.input.payment.method === 'vista' || !r.installmentValue) return 'à vista';
  const parcelas = `${r.installments} parcelas de ${reais(r.installmentValue)}`;
  return p.input.payment.method === 'entrada' ? `com entrada de ${reais(r.downPayment)} e ${parcelas}` : `financiados em ${parcelas}`;
}

function qualification(lead: Lead): string {
  const doc = lead.document ?? '';
  if (digits(doc).length === 14) return `pessoa jurídica, inscrita no CNPJ nº ${doc}`;
  const [y, m, d] = (lead.birthDate ?? '').split('-');
  return `pessoa física, nascido(a) em ${d}/${m}/${y}, inscrito(a) no CPF nº ${doc}`;
}

/** Lê o texto do modelo em blocos. A conversão de campos vem de quem chama. */
export function parseTemplate(template: string, fill: (line: string) => string = (s) => s): ContractBlock[] {
  const blocks: ContractBlock[] = [];
  for (const raw of template.split(/\r?\n/)) {
    const line = fill(raw.trim());
    if (!line) continue;
    if (line.startsWith('| ')) {
      const row = line.slice(2).split(' | ').map((c) => c.trim());
      const last = blocks.at(-1);
      if (last?.kind === 'table') last.rows.push(row);
      else blocks.push({ kind: 'table', rows: [row] });
    } else if (line.startsWith('## ')) blocks.push({ kind: 'heading', text: line.slice(3) });
    else if (line.startsWith('# ')) blocks.push({ kind: 'title', text: line.slice(2) });
    else if (line.startsWith('> ')) blocks.push({ kind: 'indent', text: line.slice(2) });
    else if (line.startsWith('_ ')) blocks.push({ kind: 'sign', text: line.slice(2) });
    else blocks.push({ kind: 'para', text: line });
  }
  return blocks;
}

export function buildContract(template: string, lead: Lead, proposal: Proposal, payment: string, today = new Date()): ContractBlock[] {
  const r = proposal.result;
  const values: Record<string, string> = {
    nome: lead.name.trim(),
    qualificacao: qualification(lead),
    documento: lead.document ?? '',
    endereco: `${lead.address.trim().replace(/[\s,.]+$/, '')}, CEP ${lead.cep}`,
    geracao: num(r.generationKwh),
    kwp: num(r.kWp, 2),
    inversor: r.inverterLabel,
    modulos: String(r.modules),
    modulo: `${r.panelW} W ${proposal.input.moduleBrand}`,
    valor: reais(r.finalPrice),
    pagamento: payment.trim(),
    data: today.toLocaleDateString('pt-BR'),
  };
  return parseTemplate(template, (s) => s.replace(/\{\{(.*?)\}\}/g, (_, f: string) => values[f] ?? ''));
}
