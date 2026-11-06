import type { Kit } from './types';
import { uid } from './format';

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === sep && !quoted) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Valor em reais vindo de planilha: "23.400,00", "23400.5", "23.400", "R$ 23.400" */
export function parseMoney(raw: string): number {
  let t = raw.replace(/[^\d,.-]/g, '');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  return parseFloat(t);
}

function normInverter(raw: string): string {
  const inv = raw.replace(/^"|"$/g, '').trim();
  const n = parseFloat(inv.replace(',', '.'));
  if (!Number.isNaN(n) && /^[\d.,]+$/.test(inv)) {
    return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }
  return inv;
}

/**
 * Lê a tabela de kits no formato: GM, 585, 610, 700, Inversor, Valor.
 * Aceita vírgula ou ponto e vírgula como separador e ignora o cabeçalho.
 */
export function parseKitsCsv(text: string): Kit[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const sample = lines[0];
  const sep = (sample.match(/;/g)?.length ?? 0) > (sample.match(/,/g)?.length ?? 0) ? ';' : ',';
  const kits: Kit[] = [];
  for (const line of lines) {
    const cols = splitLine(line, sep);
    if (cols.length < 6) continue;
    const gm = parseInt(cols[0].replace(/\D/g, ''), 10);
    const price = parseMoney(cols[5]);
    if (!gm || Number.isNaN(price)) continue;
    kits.push({
      id: uid(),
      gm,
      panel585: parseInt(cols[1], 10) || 0,
      panel610: parseInt(cols[2], 10) || 0,
      panel700: parseInt(cols[3], 10) || 0,
      inverter: normInverter(cols[4]),
      price,
    });
  }
  return kits;
}

export function kitsToCsv(kits: Kit[]): string {
  const head = 'GM;585;610;700;Inversor;Valor';
  const rows = kits.map((k) =>
    [k.gm, k.panel585, k.panel610, k.panel700, k.inverter, k.price.toFixed(2).replace('.', ',')].join(';'),
  );
  return [head, ...rows].join('\n');
}
