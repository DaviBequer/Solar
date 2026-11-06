import { jsPDF } from 'jspdf';
import type { ContractBlock } from './contract';

const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = { x: 56, top: 56, bottom: 72 };
const WIDTH = PAGE.w - MARGIN.x * 2;
const SIZE = 10;
const LINE = SIZE * 1.4;

/** Contrato em PDF com texto de verdade: selecionável, leve e com quantas páginas precisar. */
export async function contractPdf(blocks: ContractBlock[], logo: string | null): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = MARGIN.top;

  const room = (h: number) => {
    if (y + h <= PAGE.h - MARGIN.bottom) return;
    doc.addPage();
    y = MARGIN.top;
  };

  function write(text: string, x: number, width: number, opts: { keepWith?: number; center?: boolean } = {}) {
    const lines: string[] = doc.splitTextToSize(text, width);
    room(LINE * Math.min(lines.length, 2) + (opts.keepWith ?? 0));
    let i = 0;
    while (i < lines.length) {
      const fit = Math.max(1, Math.floor((PAGE.h - MARGIN.bottom - y) / LINE));
      const part = lines.slice(i, i + fit);
      if (opts.center) doc.text(part, PAGE.w / 2, y + SIZE, { align: 'center' });
      else if (part.length === 1) doc.text(part[0], x, y + SIZE);
      else doc.text(part, x, y + SIZE, { align: 'justify', maxWidth: width, lineHeightFactor: 1.4 });
      y += part.length * LINE;
      i += part.length;
      if (i < lines.length) room(Infinity);
    }
  }

  function table(rows: string[][]) {
    const cols = [82, 72, WIDTH - 154];
    const pad = 4;
    rows.forEach((row, r) => {
      doc.setFont('helvetica', r === 0 ? 'bold' : 'normal');
      const cells: string[][] = row.map((c, i) => doc.splitTextToSize(c, cols[i] - pad * 2));
      const h = Math.max(...cells.map((c) => c.length)) * LINE + pad * 2;
      room(h);
      let x = MARGIN.x;
      cells.forEach((c, i) => {
        doc.rect(x, y, cols[i], h);
        doc.text(c, x + pad, y + pad + SIZE, { lineHeightFactor: 1.4 });
        x += cols[i];
      });
      y += h;
    });
    doc.setFont('helvetica', 'normal');
    y += 10;
  }

  doc.setFontSize(SIZE);
  doc.setLineWidth(0.5);
  for (const b of blocks) {
    if (b.kind === 'table') table(b.rows);
    else if (b.kind === 'title') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(b.text, PAGE.w / 2, y + 14, { align: 'center' });
      doc.setFontSize(SIZE);
      doc.setFont('helvetica', 'normal');
      y += 34;
    } else if (b.kind === 'heading') {
      y += 8;
      doc.setFont('helvetica', 'bold');
      // Título não fica sozinho no fim da página
      write(b.text, MARGIN.x, WIDTH, { keepWith: LINE * 2 });
      doc.setFont('helvetica', 'normal');
      y += 4;
    } else if (b.kind === 'sign') {
      y += 30;
      room(LINE * 3);
      doc.line(MARGIN.x, y, MARGIN.x + 300, y);
      y += 4;
      write(b.text, MARGIN.x, WIDTH);
      y += 4;
    } else if (b.kind === 'indent') {
      write(b.text, MARGIN.x + 18, WIDTH - 18);
      y += 6;
    } else {
      write(b.text, MARGIN.x, WIDTH);
      y += 6;
    }
  }

  const pages = doc.getNumberOfPages();
  const logoProps = logo ? doc.getImageProperties(logo) : null;
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.text(`Página ${p} de ${pages}`, MARGIN.x, PAGE.h - 36);
    if (logo && logoProps) {
      const h = 32;
      const w = Math.min(120, (logoProps.width / logoProps.height) * h);
      doc.addImage(logo, PAGE.w - MARGIN.x - w, PAGE.h - 60, w, (logoProps.height / logoProps.width) * w);
    }
  }
  return doc;
}
