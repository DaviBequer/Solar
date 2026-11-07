// @ts-expect-error o projeto não tem os tipos do Node; o teste roda no Node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { companyMissing, contractMissing, contractValues, defaultPayment, templateProblem } from './contract';
import { base64ToBytes, docxText, fillDocx, partText, placeLogo, readDocx, writeDocx } from './contract-docx';
import { contractPdf } from './contract-pdf';
import base from '../data/contract-base';
import type { CompanyData, Lead, Proposal } from './types';

const lead = { id: 'l', name: 'Ana Souza', address: 'Rua A, 10, Centro, Cidade/SC,', document: '111.222.333-44', birthDate: '1980-03-09', cep: '89000-000' } as Lead;
const proposal = (payment: Partial<Proposal['input']['payment']> = {}, result: Partial<Proposal['result']> = {}) =>
  ({
    input: { moduleBrand: 'Trina', payment: { method: 'vista', ...payment } },
    result: { modules: 12, panelW: 610, kWp: 7.32, generationKwh: 890, inverterLabel: 'SOFAR 6K', finalPrice: 31000, installments: 0, installmentValue: 0, downPayment: 0, ...result },
  }) as unknown as Proposal;
const company: CompanyData = { legalName: 'Empresa Exemplo LTDA', cnpj: '00.000.000/0001-00', address: 'Rua B, 20, Cidade/SC', city: 'Lages', uf: 'sc', representative: 'Fulano de Tal' };
const values = () => contractValues(lead, proposal(), 'à vista via banco', company, new Date(2026, 10, 6));
const fonts = () => {
  const f = (n: string) => readFileSync(new URL('../assets/fonts/' + n, import.meta.url)).toString('base64');
  return { regular: f('Caladea-Regular.ttf'), bold: f('Caladea-Bold.ttf'), headingBold: f('Carlito-Bold.ttf') };
};

describe('modelo padrão', () => {
  it('não traz documento, data nem imagem de ninguém', async () => {
    const parts = await readDocx(base64ToBytes(base));
    const text = docxText(parts);
    expect(text).not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/); // CNPJ
    expect(text).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/); // CPF
    expect(text).not.toMatch(/\d{2}\/\d{2}\/\d{4}/); // data
    expect(text).not.toMatch(/\d{5}-\d{3}/); // CEP
    expect(text).not.toMatch(/R\$ *\d/); // valor
    expect(parts.get('word/media/image1.png')!.length).toBeLessThan(200);
    expect(templateProblem(text)).toBeNull();
  });

  it('preenche empresa, cliente e orçamento e não sobra campo', async () => {
    const text = docxText(fillDocx(await readDocx(base64ToBytes(base)), values()));
    expect(text).toContain('Ana Souza, pessoa física, nascido(a) na data 09/03/1980, inscrito(a) no CPF nº 111.222.333-44, localizado na Rua A, 10, Centro, Cidade/SC, CEP 89000-000.');
    expect(text).toContain('Empresa Exemplo LTDA, pessoa jurídica');
    expect(text).toContain('Sr. Fulano de Tal');
    expect(text).toContain('890 kW/m e 7,32 kWp');
    expect(text).toContain('R$ 31.000,00 pagos à CONTRATADA à vista via banco');
    expect(text).toContain('comarca de LAGES-SC');
    expect(text).toContain('LAGES, 06/11/2026.');
    expect(text).toContain('PROCON de Lages');
    expect(text).not.toContain('{{');
  });

  it('o PDF sai com as páginas do modelo', async () => {
    const parts = placeLogo(fillDocx(await readDocx(base64ToBytes(base)), values()), null);
    expect((await contractPdf(parts, fonts())).getNumberOfPages()).toBe(9);
  });

  it('volta igual depois de gravar e ler o Word', async () => {
    const parts = await readDocx(base64ToBytes(base));
    const again = await readDocx(writeDocx(parts));
    expect(docxText(again)).toBe(docxText(parts));
    expect(again.get('word/media/image1.png')).toEqual(parts.get('word/media/image1.png'));
  });
});

describe('campos no Word', () => {
  const doc = (body: string) => new Map([['word/document.xml', new TextEncoder().encode(`<w:body>${body}</w:body>`)]]);

  it('acha campo partido em trechos e mantém o texto em volta', () => {
    const parts = doc('<w:p><w:r><w:t>Olá {{no</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>me}}, tudo</w:t></w:r><w:r><w:t> bem</w:t></w:r></w:p>');
    expect(docxText(fillDocx(parts, { nome: 'A & B' }))).toBe('Olá A &amp; B, tudo bem');
  });

  it('dois campos no mesmo trecho', () => {
    expect(docxText(fillDocx(doc('<w:p><w:r><w:t>{{a}}-{{b}}.</w:t></w:r></w:p>'), { a: '1', b: '2' }))).toBe('1-2.');
  });

  it('recusa arquivo que não é Word', async () => {
    await expect(readDocx(new TextEncoder().encode('não é zip'))).rejects.toThrow();
  });

  it('recusa modelo sem os campos', () => {
    expect(templateProblem('Contrato com dados de um cliente')).toMatch(/não é um modelo/);
    expect(templateProblem('{{nome}} e {{outro}}')).toMatch(/campo desconhecido: outro/);
  });
});

describe('logo', () => {
  const png = (w: number, h: number) => { const b = new Uint8Array(24); const v = new DataView(b.buffer); v.setUint32(16, w); v.setUint32(20, h); return b; };
  const parts = () => new Map([
    ['word/media/image1.png', new Uint8Array(70)],
    ['word/footer1.xml', new TextEncoder().encode('<w:drawing><wp:extent cx="1000" cy="500"/><a:ext cx="1000" cy="500"/><pic:pic/></w:drawing>')],
  ]);

  it('entra no lugar do pixel sem deformar', () => {
    const r = placeLogo(parts(), png(100, 100));
    expect(r.get('word/media/image1.png')!.length).toBe(24);
    expect(partText(r, 'word/footer1.xml')).toContain('<wp:extent cx="500" cy="500"');
    expect(partText(r, 'word/footer1.xml')).toContain('<a:ext cx="500" cy="500"');
  });

  it('modelo com logo própria não muda', () => {
    const own = parts();
    own.set('word/media/image1.png', new Uint8Array(5000));
    expect(placeLogo(own, png(100, 100)).get('word/media/image1.png')!.length).toBe(5000);
  });
});

describe('dados do contrato', () => {
  it('pessoa jurídica usa CNPJ', () => {
    expect(contractValues({ ...lead, document: '12.345.678/0001-90', birthDate: '' }, proposal(), 'à vista', company).qualificacao).toBe('pessoa jurídica, inscrita no CNPJ nº 12.345.678/0001-90');
  });

  it('forma de pagamento inicial', () => {
    expect(defaultPayment(proposal())).toBe('à vista');
    expect(defaultPayment(proposal({ method: 'financiado' }, { installments: 72, installmentValue: 595.26 }))).toBe('financiados em 72 parcelas de R$ 595,26');
    expect(defaultPayment(proposal({ method: 'entrada' }, { installments: 24, installmentValue: 100, downPayment: 5000 }))).toBe('com entrada de R$ 5.000,00 e 24 parcelas de R$ 100,00');
  });

  it('avisa o que falta no cliente e na empresa', () => {
    expect(contractMissing({ name: 'A', address: '', document: '111', birthDate: '', cep: '' })).toEqual(['CPF ou CNPJ', 'endereço', 'CEP']);
    expect(contractMissing({ ...lead, document: '12.345.678/0001-90', birthDate: '' })).toEqual([]);
    expect(companyMissing({ ...company, cnpj: ' ', uf: '' })).toEqual(['CNPJ', 'UF']);
    expect(companyMissing(company)).toEqual([]);
  });
});
