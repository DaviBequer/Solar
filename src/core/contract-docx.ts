/* Word é um zip de XML. O app lê, preenche e grava o próprio documento, para o resultado sair igual ao modelo. */

export type DocxParts = Map<string, Uint8Array>;

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b: Uint8Array) => { let c = ~0; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };

export async function readDocx(bytes: Uint8Array): Promise<DocxParts> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let e = bytes.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('Arquivo não é Word');
  const parts: DocxParts = new Map();
  let at = v.getUint32(e + 16, true);
  for (let i = v.getUint16(e + 10, true); i > 0; i--) {
    const method = v.getUint16(at + 10, true), packed = v.getUint32(at + 20, true), nameLen = v.getUint16(at + 28, true), extra = v.getUint16(at + 30, true), note = v.getUint16(at + 32, true), start = v.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen));
    const from = start + 30 + v.getUint16(start + 26, true) + v.getUint16(start + 28, true);
    const data = bytes.slice(from, from + packed);
    parts.set(name, method === 0 ? data : new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()));
    at += 46 + nameLen + extra + note;
  }
  if (!parts.has('word/document.xml')) throw new Error('Arquivo não é Word');
  return parts;
}

/** Zip sem compressão: o Word abre normalmente. */
export function writeDocx(parts: DocxParts): Uint8Array {
  const enc = new TextEncoder();
  const local: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of parts) {
    const n = enc.encode(name), crc = crc32(data);
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
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, parts.size, true); ev.setUint16(10, parts.size, true); ev.setUint32(12, size, true); ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + size + 22);
  let at = 0;
  for (const part of [...local, ...central, end]) { out.set(part, at); at += part.length; }
  return out;
}

export const partText = (parts: DocxParts, name: string) => new TextDecoder().decode(parts.get(name));
const setText = (parts: DocxParts, name: string, text: string) => parts.set(name, new TextEncoder().encode(text));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const T = /(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g;

/** Texto corrido do documento. O Word pode partir um {{campo}} em vários trechos, e aqui ele volta inteiro. */
export function docxText(parts: DocxParts): string {
  return [...partText(parts, 'word/document.xml').matchAll(/<w:p(?: [^>]*)?>.*?<\/w:p>/gs)].map(([p]) => [...p.matchAll(T)].map((m) => m[2]).join('')).join('\n');
}

/** Troca os campos mantendo a formatação do trecho onde cada um começa. */
export function fillDocx(parts: DocxParts, values: Record<string, string>): DocxParts {
  const next: DocxParts = new Map(parts);
  const xml = partText(parts, 'word/document.xml').replace(/<w:p(?: [^>]*)?>.*?<\/w:p>/gs, (p) => {
    if (!p.includes('{') || !p.includes('}')) return p;
    const ts = [...p.matchAll(T)];
    const all = ts.map((m) => m[2]).join('');
    if (!all.includes('{{')) return p;
    const fields = [...all.matchAll(/\{\{(.*?)\}\}/g)].map((m) => ({ at: m.index, end: m.index + m[0].length, value: esc(values[m[1]] ?? '') }));
    let pos = 0, out = '', last = 0;
    for (const m of ts) {
      const a = pos, b = pos + m[2].length;
      pos = b;
      let text = '';
      for (let i = a; i < b; ) {
        const f = fields.find((x) => i >= x.at && i < x.end);
        if (f) {
          if (i === f.at) text += f.value;
          i = Math.min(f.end, b);
        } else {
          const nextField = fields.find((x) => x.at > i)?.at ?? b;
          const stop = Math.min(nextField, b);
          text += m[2].slice(i - a, stop - a);
          i = stop;
        }
      }
      out += `${p.slice(last, m.index)}<w:t xml:space="preserve">${text}</w:t>`;
      last = m.index + m[0].length;
    }
    return out + p.slice(last);
  });
  setText(next, 'word/document.xml', xml);
  return next;
}

/** Tamanho em pixels de um PNG, lido do cabeçalho. */
function pngSize(png: Uint8Array): { w: number; h: number } {
  const v = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { w: v.getUint32(16), h: v.getUint32(20) };
}

/**
 * Coloca a logo no lugar do pixel transparente do modelo, sem deformar: cabe na mesma caixa.
 * Modelo importado com logo própria fica como está.
 */
export function placeLogo(parts: DocxParts, png: Uint8Array | null): DocxParts {
  const next: DocxParts = new Map(parts);
  const slot = [...parts.keys()].find((n) => n.startsWith('word/media/') && parts.get(n)!.length < 200);
  if (!slot || !png) return next;
  next.set(slot, png);
  const { w, h } = pngSize(png);
  for (const name of parts.keys()) {
    if (!/^word\/(document|footer\d*|header\d*)\.xml$/.test(name)) continue;
    setText(next, name, partText(parts, name).replace(/<w:drawing>(?:(?!<\/w:drawing>).)*?<pic:pic.*?<\/w:drawing>/gs, (d) => {
      const m = /<wp:extent cx="(\d+)" cy="(\d+)"/.exec(d);
      if (!m) return d;
      const scale = Math.min(+m[1] / w, +m[2] / h), cx = Math.round(w * scale), cy = Math.round(h * scale);
      return d.replace(/<wp:extent cx="\d+" cy="\d+"/, `<wp:extent cx="${cx}" cy="${cy}"`).replace(/<a:ext cx="\d+" cy="\d+"/, `<a:ext cx="${cx}" cy="${cy}"`);
    }));
  }
  return next;
}

export const base64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export function bytesToBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
