import { jsPDF } from 'jspdf';
import { partText, type DocxParts } from './contract-docx';
import { bytesToBase64 } from './contract-docx';
import { CAMBRIA_BOLD, CAMBRIA_CHARS, CAMBRIA_REGULAR } from './cambria-widths';

/* Desenha o PDF a partir do próprio Word: mesmas margens, recuos, espaços, numeração, tabela e logo. */

export interface PdfFonts { regular: string; bold: string; headingBold: string }

const CAMBRIA_INDEX = new Map([...CAMBRIA_CHARS].map((c, i) => [c, i]));

// A Caladea desenha o texto, mas é mais estreita que a Cambria. Cada palavra ocupa a largura que teria na Cambria,
// e as linhas quebram nos mesmos lugares. Carlito já tem as larguras da Calibri.
const METRIC: Record<string, { a: number; d: number }> = { serif: { a: 0.95, d: 0.222 }, sans: { a: 0.952, d: 0.269 }, times: { a: 0.891, d: 0.216 } };
const family = (font: string) => (/calibri/i.test(font) ? 'sans' : /times/i.test(font) ? 'times' : 'serif');

interface RunStyle { font?: string; bold?: boolean; size?: number; cs?: number }
interface ParaStyle { before?: number; after?: number; line?: number; exact?: boolean; left?: number; right?: number; hanging?: number; first?: number; jc?: string; numId?: string; ilvl?: number; tabs?: number[] }

const attrs = (tag: string) => Object.fromEntries([...tag.matchAll(/w:(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const child = (xml: string, name: string) => new RegExp(`<w:${name}(?: [^>]*)?/?>`).exec(xml)?.[0];
const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function parseRun(rPr: string): RunStyle {
  const f = child(rPr, 'rFonts'), b = child(rPr, 'b'), sz = child(rPr, 'sz'), sp = child(rPr, 'spacing');
  return clean({
    font: f ? attrs(f).ascii : undefined,
    bold: b ? !/w:val="(false|0)"/.test(b) : undefined,
    size: sz ? +attrs(sz).val / 2 : undefined,
    cs: sp ? +attrs(sp).val / 20 : undefined,
  });
}

function parsePara(pPrRaw: string): ParaStyle {
  const pPr = pPrRaw.replace(/<w:rPr>.*?<\/w:rPr>/s, '').replace(/<w:sectPr.*?<\/w:sectPr>/s, '');
  const sp = child(pPr, 'spacing'), ind = child(pPr, 'ind'), jc = child(pPr, 'jc'), num = /<w:numPr>(.*?)<\/w:numPr>/s.exec(pPr)?.[1];
  const s = sp ? attrs(sp) : {}, i = ind ? attrs(ind) : {};
  const stops = [...(/<w:tabs>(.*?)<\/w:tabs>/s.exec(pPr)?.[1] ?? '').matchAll(/<w:tab [^>]*>/g)].map((m) => attrs(m[0])).filter((t) => t.val !== 'clear').map((t) => +t.pos / 20);
  const num2 = (v?: string) => (v === undefined ? undefined : +v / 20);
  return clean({
    before: num2(s.before),
    after: num2(s.after),
    line: s.line === undefined ? undefined : +s.line,
    exact: s.line === undefined ? undefined : s.lineRule === 'exact' || s.lineRule === 'atLeast',
    left: num2(i.start ?? i.left),
    right: num2(i.end ?? i.right),
    hanging: num2(i.hanging),
    first: num2(i.firstLine),
    jc: jc ? attrs(jc).val : undefined,
    numId: num ? attrs(child(num, 'numId') ?? '').val : undefined,
    ilvl: num ? +(attrs(child(num, 'ilvl') ?? '').val ?? 0) : undefined,
    tabs: stops.length ? stops : undefined,
  });
}

interface Lvl { start: number; fmt: string; text: string; suff?: string; para: ParaStyle; run: RunStyle }

function readNumbering(parts: DocxParts) {
  if (!parts.has('word/numbering.xml')) return new Map<string, Lvl[]>();
  const xml = partText(parts, 'word/numbering.xml');
  const abstracts = new Map<string, Lvl[]>();
  for (const [a] of xml.matchAll(/<w:abstractNum .*?<\/w:abstractNum>/gs)) {
    const lvls = [...a.matchAll(/<w:lvl .*?<\/w:lvl>/gs)].map(([l]) => ({
      start: +(attrs(child(l, 'start') ?? '').val ?? 1),
      fmt: attrs(child(l, 'numFmt') ?? '').val ?? 'decimal',
      text: attrs(child(l, 'lvlText') ?? '').val ?? '',
      suff: attrs(child(l, 'suff') ?? '').val,
      para: parsePara(/<w:pPr>.*?<\/w:pPr>/s.exec(l)?.[0] ?? ''),
      run: parseRun(/<w:rPr>.*?<\/w:rPr>/s.exec(l)?.[0] ?? ''),
    }));
    abstracts.set(/w:abstractNumId="(\d+)"/.exec(a)![1], lvls);
  }
  const nums = new Map<string, Lvl[]>();
  for (const m of xml.matchAll(/<w:num w:numId="(\d+)".*?<w:abstractNumId w:val="(\d+)"/gs)) nums.set(m[1], abstracts.get(m[2]) ?? []);
  return nums;
}

function readStyles(parts: DocxParts) {
  const xml = partText(parts, 'word/styles.xml');
  const defaults = /<w:docDefaults>.*?<\/w:docDefaults>/s.exec(xml)?.[0] ?? '';
  const raw = new Map<string, { based?: string; para: ParaStyle; run: RunStyle }>();
  let normal = 'Normal';
  for (const [s] of xml.matchAll(/<w:style .*?<\/w:style>/gs)) {
    if (!/w:type="paragraph"/.test(s)) continue;
    const id = /w:styleId="([^"]+)"/.exec(s)![1];
    if (/w:default="1"/.test(s)) normal = id;
    raw.set(id, { based: attrs(child(s, 'basedOn') ?? '').val, para: parsePara(/<w:pPr>.*?<\/w:pPr>/s.exec(s)?.[0] ?? ''), run: parseRun(/<w:rPr>.*?<\/w:rPr>/s.exec(s)?.[0] ?? '') });
  }
  const base = parseRun(defaults);
  const resolve = (id: string): { para: ParaStyle; run: RunStyle } => {
    const s = raw.get(id) ?? raw.get(normal);
    if (!s) return { para: {}, run: base };
    const up = s.based && s.based !== id ? resolve(s.based) : { para: {}, run: base };
    return { para: { ...up.para, ...s.para }, run: { ...up.run, ...s.run } };
  };
  return { resolve, normal };
}

const roman = (n: number) => ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][n] ?? String(n);
const fmtNumber = (n: number, fmt: string) => (fmt === 'lowerLetter' ? String.fromCharCode(96 + n) : fmt === 'lowerRoman' ? roman(n) : String(n));

interface Piece { text: string; w: number; run: Required<Pick<RunStyle, 'font' | 'size'>> & RunStyle; space: boolean }
interface Line { pieces: Piece[]; natural: number; spaces: number; h: number; base: number; x: number; avail: number; last: boolean }

export async function contractPdf(parts: DocxParts, fonts: PdfFonts): Promise<jsPDF> {
  const xml = partText(parts, 'word/document.xml');
  const body = xml.slice(xml.indexOf('<w:body>'));
  const sections = [...xml.matchAll(/<w:sectPr.*?<\/w:sectPr>/gs)].map((m) => ({ size: attrs(child(m[0], 'pgSz') ?? ''), mar: attrs(child(m[0], 'pgMar') ?? '') }));
  const first = sections[0];
  const W = +first.size.w / 20, H = +first.size.h / 20;
  const left = +first.mar.left / 20, right = +first.mar.right / 20, bottom = H - +first.mar.bottom / 20;
  const doc = new jsPDF({ unit: 'pt', format: [W, H], compress: true });
  doc.addFileToVFS('r.ttf', fonts.regular);
  doc.addFont('r.ttf', 'serif', 'normal', undefined, 'Identity-H');
  doc.addFileToVFS('b.ttf', fonts.bold);
  doc.addFont('b.ttf', 'serif', 'bold', undefined, 'Identity-H');
  doc.addFileToVFS('h.ttf', fonts.headingBold);
  doc.addFont('h.ttf', 'sans', 'bold', undefined, 'Identity-H');

  const { resolve, normal } = readStyles(parts);
  const numbering = readNumbering(parts);
  const counters = new Map<string, number[]>();

  const setFont = (r: { font: string; size: number; bold?: boolean }) => {
    const f = family(r.font);
    // shortcut: Calibri só aparece nos títulos em negrito; texto comum em Calibri sairia em negrito, trocar se um modelo usar
    doc.setFont(f === 'sans' ? 'sans' : 'serif', f === 'sans' || r.bold ? 'bold' : 'normal');
    doc.setFontSize(r.size);
  };
  const fontWidth = (text: string, r: Piece['run']) => { setFont(r); return doc.getTextWidth(text); };
  const naturalWidth = (text: string, r: Piece['run']) => {
    if (family(r.font) === 'sans') return fontWidth(text, r);
    const table = r.bold ? CAMBRIA_BOLD : CAMBRIA_REGULAR;
    let w = 0;
    for (const ch of text) {
      const i = CAMBRIA_INDEX.get(ch);
      w += i === undefined ? fontWidth(ch, r) : (table[i] * r.size) / 1000;
    }
    return w;
  };
  const widthOf = (text: string, r: Piece['run']) => naturalWidth(text, r) + (r.cs ?? 0) * text.length;
  /** Escreve ocupando a largura calculada, inclusive quando a fonte desenhada é mais estreita. */
  const write = (text: string, x: number, baseline: number, r: Piece['run']) => {
    const extra = (widthOf(text, r) - fontWidth(text, r)) / text.length;
    setFont(r);
    doc.text(text, x, baseline, Math.abs(extra) > 0.001 ? { charSpace: extra } : {});
  };
  const heightOf = (r: { font: string; size: number }, line: number | undefined, exact: boolean | undefined) => {
    const m = METRIC[family(r.font)];
    return exact && line ? line / 20 : (m.a + m.d) * r.size * ((line ?? 240) / 240);
  };

  function layout(p: string, avail: number) {
    const pPr = /<w:pPr>.*?<\/w:pPr>/s.exec(p)?.[0] ?? '';
    const styleId = attrs(child(pPr, 'pStyle') ?? '').val ?? normal;
    const style = resolve(styleId);
    const own = parsePara(pPr);
    const markRun = parseRun(/<w:rPr>.*?<\/w:rPr>/s.exec(pPr)?.[0] ?? '');
    const numId = own.numId ?? style.para.numId;
    const lvlIdx = own.ilvl ?? style.para.ilvl ?? 0;
    const lvls = numId && numId !== '0' ? numbering.get(numId) : undefined;
    const lvl = lvls?.[lvlIdx];
    const para = { ...style.para, ...(lvl?.para ?? {}), ...own };
    const baseRun = { font: 'Cambria', size: 11, ...style.run } as Piece['run'];

    let label = '';
    let labelRun = baseRun;
    if (lvl && lvl.fmt !== 'none') {
      const c = counters.get(numId!) ?? [];
      c[lvlIdx] = c[lvlIdx] === undefined ? lvl.start : c[lvlIdx] + 1;
      c.length = lvlIdx + 1;
      counters.set(numId!, c);
      label = lvl.fmt === 'bullet' ? '•' : lvl.text.replace(/%(\d)/g, (_, d) => fmtNumber(c[+d - 1] ?? lvls![+d - 1]?.start ?? 1, lvls![+d - 1]?.fmt ?? 'decimal'));
      labelRun = { ...baseRun, ...lvl.run, cs: undefined };
    }

    const pLeft = para.left ?? 0, pRight = para.right ?? 0;
    const firstStart = pLeft - (para.hanging ?? 0) + (para.first ?? 0);
    let firstX = firstStart;
    if (label) {
      const cursor = firstStart + widthOf(label, labelRun);
      if (lvl?.suff === 'nothing') firstX = cursor;
      else if (pLeft > cursor) firstX = pLeft;
      else {
        const stop = (para.tabs ?? []).find((t) => t > cursor);
        firstX = stop ?? (Math.floor(cursor / 36) + 1) * 36;
      }
    }

    const pieces: Piece[] = [];
    for (const [r] of p.matchAll(/<w:r(?: [^>]*)?>.*?<\/w:r>/gs)) {
      if (r.includes('<w:drawing>') || r.includes('<w:pict')) continue;
      const run = { ...baseRun, ...parseRun(/<w:rPr>.*?<\/w:rPr>/s.exec(r)?.[0] ?? '') } as Piece['run'];
      const text = unesc([...r.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(''));
      for (const t of text.split(/( +)/)) if (t) pieces.push({ text: t, w: widthOf(t, run), run, space: t[0] === ' ' });
    }

    const lines: Line[] = [];
    const emptyRun = { ...baseRun, ...markRun } as Piece['run'];
    const hOf = (ps: Piece[]) => (ps.length ? ps : [{ run: emptyRun } as Piece]).reduce((m, q) => Math.max(m, heightOf(q.run, para.line, para.exact)), 0);
    // O espaço a mais entre linhas fica abaixo da linha; em altura exata, o texto encosta embaixo
    const baseOf = (ps: Piece[], h: number) => (ps.length ? ps : [{ run: emptyRun } as Piece]).reduce((m, q) => { const t = METRIC[family(q.run.font)]; return Math.max(m, para.exact ? h - t.d * q.run.size : t.a * q.run.size); }, 0);
    const push = (ps: Piece[], last: boolean) => {
      const trimmed = [...ps];
      while (trimmed.length && trimmed.at(-1)!.space) trimmed.pop();
      const x = lines.length === 0 ? firstX : pLeft;
      const h = hOf(trimmed);
      lines.push({ pieces: trimmed, natural: trimmed.reduce((a, q) => a + q.w, 0), spaces: trimmed.filter((q) => q.space).length, h, base: baseOf(trimmed, h), x, avail: avail - pRight - x, last });
    };
    let cur: Piece[] = [], curW = 0, i = 0;
    while (i < pieces.length) {
      // palavra pode vir em vários trechos sem espaço entre eles
      const word: Piece[] = [];
      while (i < pieces.length && !pieces[i].space) word.push(pieces[i++]);
      const wordW = word.reduce((a, q) => a + q.w, 0);
      const limit = avail - pRight - (lines.length === 0 ? firstX : pLeft);
      if (word.length && curW + wordW > limit + 0.01 && cur.some((q) => !q.space)) {
        push(cur, false);
        cur = [];
        curW = 0;
      }
      cur.push(...word);
      curW += wordW;
      if (i < pieces.length && pieces[i].space) {
        if (cur.length) { cur.push(pieces[i]); curW += pieces[i].w; }
        i++;
      }
    }
    push(cur, true);
    return { lines, para, label, labelRun, labelX: firstStart };
  }

  function drawLine(l: Line, xBase: number, baseline: number, jc: string | undefined) {
    const slack = l.avail - l.natural;
    let x = xBase + l.x;
    let gap = 0;
    if (jc === 'center') x += slack / 2;
    else if (jc === 'end' || jc === 'right') x += slack;
    else if ((jc === 'both' || jc === 'justify') && !l.last && l.spaces) gap = slack / l.spaces;
    for (const q of l.pieces) {
      if (q.space) { x += q.w + gap; continue; }
      write(q.text, x, baseline, q.run);
      x += q.w;
    }
  }

  // shortcut: uma imagem só por documento, a logo; modelo com outras imagens repetiria a primeira
  const mediaName = [...parts.keys()].find((n) => n.startsWith('word/media/'));
  const logo = mediaName ? bytesToBase64(parts.get(mediaName)!) : null;
  const drawLogo = (x: number, y: number, w: number, h: number) => { if (logo) doc.addImage(logo, 'PNG', x, y, w, h, 'logo'); };

  let sectionIdx = 0;
  let y = +first.mar.top / 20;
  const newPage = () => { doc.addPage([W, H]); y = +(sections[sectionIdx]?.mar.top ?? first.mar.top) / 20; };

  for (const [block] of body.matchAll(/<w:tbl>.*?<\/w:tbl>|<w:p(?: [^>]*)?\/>|<w:p(?: [^>]*)?>.*?<\/w:p>/gs)) {
    if (block.startsWith('<w:tbl>')) {
      const grid = [...block.matchAll(/<w:gridCol w:w="(\d+)"/g)].map((m) => +m[1] / 20);
      const pad = 0.25;
      for (const [row] of block.matchAll(/<w:tr(?: [^>]*)?>.*?<\/w:tr>/gs)) {
        const min = +(attrs(child(row, 'trHeight') ?? '').val ?? 0) / 20;
        const cells = [...row.matchAll(/<w:tc>.*?<\/w:tc>/gs)].map(([c], i) => {
          const ps = [...c.matchAll(/<w:p(?: [^>]*)?>.*?<\/w:p>/gs)].map(([p]) => layout(p, grid[i] - pad * 2));
          return { ps, h: ps.reduce((a, q) => a + (q.para.before ?? 0) + q.lines.reduce((b, l) => b + l.h, 0) + (q.para.after ?? 0), 0) };
        });
        const h = Math.max(min, ...cells.map((c) => c.h));
        if (y + h > bottom) newPage();
        let x = left;
        doc.setLineWidth(0.5);
        doc.setDrawColor(0);
        cells.forEach((c, i) => {
          doc.rect(x, y, grid[i], h);
          let cy = y;
          for (const q of c.ps) {
            cy += q.para.before ?? 0;
            for (const l of q.lines) {
              drawLine(l, x + pad, cy + l.base, q.para.jc);
              cy += l.h;
            }
            cy += q.para.after ?? 0;
          }
          x += grid[i];
        });
        y += h;
      }
      continue;
    }
    if (block.endsWith('/>')) continue;

    const { lines, para, label, labelRun, labelX } = layout(block, W - left - right);
    y += para.before ?? 0;
    const top = y;

    const inline = /<wp:inline.*?<\/wp:inline>/s.exec(block)?.[0];
    if (inline) {
      const e = attrs(/<wp:extent [^>]*>/.exec(inline)![0].replace(/\bc([xy])=/g, 'w:c$1='));
      const w = +e.cx / 12700, h = +e.cy / 12700;
      if (y + h > bottom) newPage();
      drawLogo(left + (para.left ?? 0), y, w, h);
      y += h;
    } else {
      lines.forEach((l, i) => {
        if (y + l.h > bottom) newPage();
        const base = y + l.base;
        if (i === 0 && label) {
          write(label, left + labelX, base, labelRun);
        }
        drawLine(l, left, base, para.jc);
        y += l.h;
      });
    }
    y += para.after ?? 0;

    // linhas de assinatura, desenhadas no Word como formas soltas
    for (const [a] of block.matchAll(/<wp:anchor.*?<\/wp:anchor>/gs)) {
      if (a.includes('<pic:pic')) continue;
      const e = /<wp:extent cx="(\d+)"/.exec(a), hx = /<wp:positionH[^>]*>\s*<wp:posOffset>(-?\d+)/.exec(a), vx = /<wp:positionV relativeFrom="(\w+)"[^>]*>\s*<wp:posOffset>(-?\d+)/.exec(a);
      if (!e || !hx || !vx) continue;
      const lx = +hx[1] / 12700, ly = (vx[1] === 'page' ? 0 : top) + +vx[2] / 12700;
      doc.setLineWidth(0.5);
      doc.line(lx, ly, lx + +e[1] / 12700, ly);
    }

    if (block.includes('<w:sectPr')) {
      sectionIdx++;
      if (sectionIdx < sections.length) newPage();
    }
  }

  // logo do rodapé em todas as páginas
  const footerName = [...parts.keys()].find((n) => /^word\/footer\d*\.xml$/.test(n) && partText(parts, n).includes('<pic:pic'));
  if (footerName) {
    const f = partText(parts, footerName);
    const e = /<wp:extent cx="(\d+)" cy="(\d+)"/.exec(f), hx = /<wp:positionH[^>]*>\s*<wp:posOffset>(-?\d+)/.exec(f), vx = /<wp:positionV[^>]*>\s*<wp:posOffset>(-?\d+)/.exec(f);
    if (e && hx && vx) {
      for (let p = 1; p <= doc.getNumberOfPages(); p++) {
        doc.setPage(p);
        drawLogo(+hx[1] / 12700, +vx[1] / 12700, +e[1] / 12700, +e[2] / 12700);
      }
    }
  }
  return doc;
}
