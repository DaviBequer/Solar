import { describe, expect, it } from 'vitest';
import { buildContract, contractMissing, defaultPayment, templateProblem } from './contract';
import { contractPdf } from './contract-pdf';
import type { Lead, Proposal } from './types';

const lead = { id: 'l', name: 'Ana Souza', address: 'Rua A, 10, Centro, Blumenau/SC,', document: '111.222.333-44', birthDate: '1980-03-09', cep: '89000-000' } as Lead;
const proposal = (payment: Partial<Proposal['input']['payment']> = {}, result: Partial<Proposal['result']> = {}) =>
  ({
    input: { moduleBrand: 'Trina', payment: { method: 'vista', ...payment } },
    result: { modules: 12, panelW: 610, kWp: 7.32, generationKwh: 890, inverterLabel: 'SOFAR 6K', finalPrice: 31000, installments: 0, installmentValue: 0, downPayment: 0, ...result },
  }) as unknown as Proposal;

const template = `# CONTRATO
CONTRATANTE: {{nome}}, {{qualificacao}}, em {{endereco}}.
## 1. OBJETO
Sistema de {{geracao}} kWh/mês e {{kwp}} kWp.
| QTD | UN | DESC
| {{modulos}} | PEÇA | Módulos {{modulo}}
| 1 | PEÇA | Inversor {{inversor}}
> a) item
3.1 Valor de {{valor}} pagos {{pagamento}}.
_ CONTRATANTE: {{nome}} - CPF/CNPJ: {{documento}}
BLUMENAU, {{data}}.`;

describe('contrato', () => {
  const blocks = buildContract(template, lead, proposal(), 'à vista via banco', new Date(2026, 10, 6));
  const text = JSON.stringify(blocks);

  it('preenche o cliente e o orçamento', () => {
    expect(text).toContain('Ana Souza, pessoa física, nascido(a) em 09/03/1980, inscrito(a) no CPF nº 111.222.333-44, em Rua A, 10, Centro, Blumenau/SC, CEP 89000-000.');
    expect(text).toContain('890 kWh/mês e 7,32 kWp');
    expect(text).toContain('R$ 31.000,00 pagos à vista via banco');
    expect(text).toContain('06/11/2026');
    expect(text).not.toContain('{{');
  });

  it('monta tabela, títulos, recuo e assinatura', () => {
    expect(blocks.map((b) => b.kind)).toEqual(['title', 'para', 'heading', 'para', 'table', 'indent', 'para', 'sign', 'para']);
    expect(blocks[4]).toEqual({ kind: 'table', rows: [['QTD', 'UN', 'DESC'], ['12', 'PEÇA', 'Módulos 610 W Trina'], ['1', 'PEÇA', 'Inversor SOFAR 6K']] });
  });

  it('CNPJ vira pessoa jurídica e dispensa nascimento', () => {
    const pj = { ...lead, document: '12.345.678/0001-90', birthDate: undefined };
    expect(contractMissing(pj)).toEqual([]);
    expect(JSON.stringify(buildContract(template, pj, proposal(), 'à vista'))).toContain('pessoa jurídica, inscrita no CNPJ nº 12.345.678/0001-90');
  });

  it('lista o que falta no cadastro, inclusive em cliente antigo', () => {
    expect(contractMissing(lead)).toEqual([]);
    expect(contractMissing({ name: 'Ana', address: '' })).toEqual(['CPF ou CNPJ', 'endereço', 'CEP']);
    expect(contractMissing({ ...lead, birthDate: undefined })).toEqual(['data de nascimento']);
  });

  it('texto inicial do pagamento segue o orçamento', () => {
    expect(defaultPayment(proposal())).toBe('à vista');
    expect(defaultPayment(proposal({ method: 'financiado' }, { installments: 72, installmentValue: 595.5 }))).toBe('financiados em 72 parcelas de R$ 595,50');
    expect(defaultPayment(proposal({ method: 'entrada' }, { installments: 60, installmentValue: 519, downPayment: 5000 }))).toBe('com entrada de R$ 5.000,00 e 60 parcelas de R$ 519,00');
  });

  it('recusa arquivo que não é modelo e campo desconhecido', () => {
    expect(templateProblem(template)).toBeNull();
    expect(templateProblem('um texto qualquer')).toMatch(/não é um modelo/);
    expect(templateProblem('{{nome}} {{cpf}}')).toMatch(/cpf/);
  });

  it('gera PDF de várias páginas quando o texto é longo', async () => {
    const long = Array.from({ length: 200 }, (_, i) => ({ kind: 'para' as const, text: `${i} Cláusula com acentuação çãé ` + 'texto '.repeat(30) }));
    const doc = await contractPdf(long, null);
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
  });
});
