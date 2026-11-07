import type { ContractBlock } from './contract';

/* Word é um zip de XML. O app grava e lê só o que o contrato usa, sem dependência nova. */

// Estilos com nome próprio: o Word traduz o id dos estilos padrão (Heading1 vira Ttulo1 em português)
const STYLE: Partial<Record<ContractBlock['kind'], string>> = { title: 'SonitTitulo', heading: 'SonitSecao', indent: 'SonitRecuo', sign: 'SonitAssinatura' };
const PREFIX: Record<string, string> = { SonitTitulo: '# ', SonitSecao: '## ', SonitRecuo: '> ', SonitAssinatura: '_ ' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const para = (text: string, style?: string) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
const BORDER = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`).join('');
const table = (rows: string[][]) => `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${BORDER}</w:tblBorders></w:tblPr><w:tblGrid>${rows[0].map(() => '<w:gridCol w:w="3000"/>').join('')}</w:tblGrid>${rows.map((r) => `<w:tr>${r.map((c) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${para(c)}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const style = (id: string, name: string, p: string, r = '') => `<w:style w:type="paragraph" w:customStyle="1" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr>${p}</w:pPr><w:rPr>${r}</w:rPr></w:style>`;
const STYLES = `${HEAD}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120"/><w:jc w:val="both"/></w:pPr></w:style>${style('SonitTitulo', 'Sonit Título', '<w:spacing w:after="240"/><w:jc w:val="center"/>', '<w:b/><w:sz w:val="26"/>')}${style('SonitSecao', 'Sonit Seção', '<w:spacing w:before="240"/><w:jc w:val="left"/>', '<w:b/>')}${style('SonitRecuo', 'Sonit Recuo', '<w:ind w:left="567"/>')}${style('SonitAssinatura', 'Sonit Assinatura', '<w:spacing w:before="480"/><w:jc w:val="left"/>')}</w:styles>`;

const FILES = (body: string): [string, string][] => [
  ['[Content_Types].xml', `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
  ['_rels/.rels', `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
  ['word/_rels/document.xml.rels', `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
  ['word/styles.xml', STYLES],
  ['word/document.xml', `${HEAD}<w:document ${NS}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`],
];

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b: Uint8Array) => { let c = ~0; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };

/** Zip sem compressão: o Word abre normalmente, e o contrato tem poucos KB. */
function zip(files: [string, string][]): Uint8Array {
  const enc = new TextEncoder();
  const local: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of files) {
    const n = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const common = (v: DataView, at: number) => { v.setUint16(at, 20, true); v.setUint16(at + 2, 0x0800, true); v.setUint32(at + 10, crc, true); v.setUint32(at + 14, data.length, true); v.setUint32(at + 18, data.length, true); v.setUint16(at + 22, n.length, true); };
    const lh = new Uint8Array(30), lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); common(lv, 4);
    const ch = new Uint8Array(46), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); common(cv, 6); cv.setUint32(42, offset, true);
    local.push(lh, n, data); central.push(ch, n);
    offset += 30 + n.length + data.length;
  }
  const size = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, size, true); ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + size + 22);
  let at = 0;
  for (const part of [...local, ...central, end]) { out.set(part, at); at += part.length; }
  return out;
}

export function blocksToDocx(blocks: ContractBlock[]): Uint8Array {
  return zip(FILES(blocks.map((b) => (b.kind === 'table' ? table(b.rows) : para(b.text, STYLE[b.kind]))).join('')));
}

async function unzipEntry(bytes: Uint8Array, wanted: string): Promise<string | null> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let e = bytes.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) return null;
  let at = v.getUint32(e + 16, true);
  for (let i = v.getUint16(e + 10, true); i > 0; i--) {
    const method = v.getUint16(at + 10, true), packed = v.getUint32(at + 20, true), nameLen = v.getUint16(at + 28, true), extra = v.getUint16(at + 30, true), note = v.getUint16(at + 32, true), start = v.getUint32(at + 42, true);
    if (new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen)) === wanted) {
      const from = start + 30 + v.getUint16(start + 26, true) + v.getUint16(start + 28, true), data = bytes.slice(from, from + packed);
      if (method === 0) return new TextDecoder().decode(data);
      // O Word salva comprimido
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Response(stream).text();
    }
    at += 46 + nameLen + extra + note;
  }
  return null;
}

const textOf = (xml: string) => unesc([...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')).trim();

/** Lê o Word de volta para o formato do modelo. Parágrafo sem estilo do Sonit vira texto comum. */
export async function docxToTemplate(bytes: Uint8Array): Promise<string> {
  const xml = await unzipEntry(bytes, 'word/document.xml');
  if (xml === null) throw new Error('Arquivo não é Word');
  const lines: string[] = [];
  for (const [part] of xml.matchAll(/<w:tbl>.*?<\/w:tbl>|<w:p(?: [^>]*)?\/>|<w:p(?: [^>]*)?>.*?<\/w:p>/gs)) {
    if (part.startsWith('<w:tbl>')) {
      for (const [row] of part.matchAll(/<w:tr[ >].*?<\/w:tr>/gs)) lines.push('| ' + [...row.matchAll(/<w:tc>.*?<\/w:tc>/gs)].map(([c]) => textOf(c)).join(' | '));
      continue;
    }
    const text = textOf(part);
    if (text) lines.push((PREFIX[/<w:pStyle w:val="([^"]+)"/.exec(part)?.[1] ?? ''] ?? '') + text);
  }
  return lines.join('\n');
}
