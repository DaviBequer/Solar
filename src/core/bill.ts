/** Pedaço de texto do PDF com a posição na página (y cresce para cima, como no PDF). */
export interface BillText { str: string; x: number; y: number; page: number }

const MONTH = /^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/\d{2}$/;
const KWH = /^\d{1,3}(\.\d{3})*$/;

/**
 * Histórico "Consumo Faturado" da fatura Celesc: cada linha tem o mês (NOV/26),
 * o consumo em kWh e os dias. Devolve o kWh do mês mais recente ao mais antigo, até 12.
 */
export function billHistory(items: BillText[]): number[] {
  const t = items.map((i) => ({ ...i, str: i.str.trim() }));
  const seen = new Set<string>();
  return t
    .filter((i) => MONTH.test(i.str))
    .sort((a, b) => a.page - b.page || b.y - a.y)
    .flatMap((m) => {
      if (seen.has(m.str)) return [];
      seen.add(m.str);
      const n = t
        .filter((i) => i.page === m.page && Math.abs(i.y - m.y) < 3 && i.x > m.x && KWH.test(i.str))
        .sort((a, b) => a.x - b.x)[0];
      return n ? [Number(n.str.replace(/\./g, ''))] : [];
    })
    .slice(0, 12);
}
