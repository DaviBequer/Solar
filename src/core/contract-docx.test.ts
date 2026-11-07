import { describe, expect, it } from 'vitest';
import { parseTemplate, templateProblem } from './contract';
import { blocksToDocx, docxToTemplate } from './contract-docx';

const template = `# CONTRATO & ANEXO
CONTRATANTE: {{nome}}, em {{endereco}}.
## Cláusula 1
> a) item <recuado>
| 1 | PEÇA | Inversor {{inversor}}
| {{modulos}} | PEÇA | Módulos {{modulo}}
_ CONTRATANTE: {{nome}}
Fim.`;

describe('contrato em Word', () => {
  it('volta igual ao modelo depois de gravar e ler', async () => {
    const back = await docxToTemplate(blocksToDocx(parseTemplate(template)));
    expect(back).toBe(template);
    expect(templateProblem(back)).toBeNull();
  });

  it('lê um arquivo comprimido, como o Word salva', async () => {
    const raw = blocksToDocx(parseTemplate(template));
    // Comprime só o document.xml e remonta o zip com um único arquivo
    const enc = new TextEncoder();
    const xml = '<w:body><w:p w:rsidR="00A"><w:pPr><w:pStyle w:val="SonitSecao"/></w:pPr><w:r><w:t>Cláu</w:t></w:r><w:r><w:t>sula</w:t></w:r></w:p><w:p w:rsidR="00B"/><w:p><w:r><w:t>{{no</w:t></w:r><w:r><w:t>me}} &amp; cia</w:t></w:r></w:p></w:body>';
    const packed = new Uint8Array(await new Response(new Blob([enc.encode(xml)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    const name = enc.encode('word/document.xml');
    const lh = new Uint8Array(30), l = new DataView(lh.buffer);
    l.setUint32(0, 0x04034b50, true); l.setUint16(26, name.length, true);
    const ch = new Uint8Array(46), c = new DataView(ch.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(10, 8, true); c.setUint32(20, packed.length, true); c.setUint16(28, name.length, true);
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(10, 1, true); e.setUint32(16, 30 + name.length + packed.length, true);
    const file = new Uint8Array(await new Blob([lh, name, packed, ch, name, end]).arrayBuffer());
    expect(await docxToTemplate(file)).toBe('## Cláusula\n{{nome}} & cia');
    expect(raw.length).toBeGreaterThan(0);
  });

  it('recusa arquivo que não é Word', async () => {
    await expect(docxToTemplate(new TextEncoder().encode('não é zip'))).rejects.toThrow();
  });
});
