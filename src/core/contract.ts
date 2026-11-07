import { num } from './format';
import type { CompanyData, Lead, Proposal } from './types';

const FIELDS = ['nome', 'qualificacao', 'documento', 'endereco', 'geracao', 'kwp', 'inversor', 'modulos', 'modulo', 'valor', 'pagamento', 'data', 'empresa', 'empresaCnpj', 'empresaSede', 'representante', 'cidade', 'cidadeMaiuscula', 'uf'];

/** Modelo é arquivo de fora do app: confere antes de guardar, para o erro aparecer na importação. */
export function templateProblem(template: string): string | null {
  if (!template.includes('{{nome}}')) return 'Este arquivo não é um modelo de contrato do Sonit. Exporte o modelo em Word, edite e importe esse arquivo.';
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

/** O que falta nos dados da empresa, em Ajustes. */
export function companyMissing(c: CompanyData): string[] {
  const labels: [keyof CompanyData, string][] = [['legalName', 'razão social'], ['cnpj', 'CNPJ'], ['address', 'endereço da sede'], ['city', 'cidade do foro'], ['uf', 'UF'], ['representative', 'representante']];
  return labels.filter(([k]) => !c[k].trim()).map(([, l]) => l);
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
  return `pessoa física, nascido(a) na data ${d}/${m}/${y}, inscrito(a) no CPF nº ${doc}`;
}

/** Todos os campos do contrato: cliente e orçamento vêm da ficha, a empresa vem de Ajustes. */
export function contractValues(lead: Lead, proposal: Proposal, payment: string, company: CompanyData, today = new Date()): Record<string, string> {
  const r = proposal.result;
  return {
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
    empresa: company.legalName.trim(),
    empresaCnpj: company.cnpj.trim(),
    empresaSede: company.address.trim(),
    representante: company.representative.trim(),
    cidade: company.city.trim(),
    cidadeMaiuscula: company.city.trim().toLocaleUpperCase('pt-BR'),
    uf: company.uf.trim().toUpperCase(),
  };
}
