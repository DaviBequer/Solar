const brl0 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "R$ 23.400" (sem centavos) ou "R$ 23.400,50" quando houver centavos e cents=true */
export function brl(value: number, cents = false): string {
  const v = Number.isFinite(value) ? value : 0;
  const hasCents = Math.round(v * 100) % 100 !== 0;
  const body = cents && hasCents ? brl2.format(v) : brl0.format(Math.round(v));
  return `R$ ${body}`;
}

export function num(value: number, decimals = 0): string {
  const v = Number.isFinite(value) ? value : 0;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Lê números digitados no padrão brasileiro: "1.234,56", "1234,5", "0.92" */
export function parseBR(text: string): number {
  if (!text) return 0;
  let t = text.trim().replace(/[^\d,.-]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

export function monthsText(months: number | null): string {
  if (months === null || !Number.isFinite(months)) return '—';
  const total = Math.max(1, Math.round(months));
  const y = Math.floor(total / 12);
  const m = total % 12;
  const ys = y === 1 ? '1 ano' : `${y} anos`;
  const ms = m === 1 ? '1 mês' : `${m} meses`;
  if (y === 0) return ms;
  if (m === 0) return ys;
  return `${ys} e ${ms}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function phoneMask(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function phoneDigits(text: string): string {
  return text.replace(/\D/g, '');
}

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dateLong(d: Date): string {
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function dateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function time(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

/** "Hoje", "Amanhã", "Ontem", "Sex, 7/11" */
export function relativeDay(d: Date, now = new Date()): string {
  const diff = daysBetween(now, d);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

export function durationText(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
