import { billHistory, type BillText } from '../core/bill';

/** Lê o texto de uma fatura em PDF e devolve o histórico de kWh. Foto ou PDF escaneado: lista vazia. */
export async function readBill(file: File): Promise<number[]> {
  if (file.type !== 'application/pdf') return [];
  const pdfjs = await import('pdfjs-dist');
  const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const items: BillText[] = [];
  for (let page = 1; page <= Math.min(doc.numPages, 3); page++) {
    const c = await (await doc.getPage(page)).getTextContent();
    for (const t of c.items) if ('str' in t && t.str.trim()) items.push({ str: t.str, x: t.transform[4], y: t.transform[5], page });
  }
  return billHistory(items);
}
