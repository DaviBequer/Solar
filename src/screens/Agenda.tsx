import { useMemo, useState } from 'react';
import { Bell, Check, ChevronLeft, ChevronRight, Navigation, Phone, Plus } from 'lucide-react';
import { TopBar } from '../ui/chrome';
import { useStore } from '../data/store';
import { TASK_LABEL } from '../core/defaults';
import { cap, daysBetween, durationText, MONTHS, relativeDay, sameDay, startOfDay, time, WEEKDAYS, WEEKDAYS_SHORT } from '../core/format';
import type { Task } from '../core/types';
import { TaskSheet } from './task-sheet';

function weekStart(d: Date): Date {
  const s = startOfDay(d);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayTitle(d: Date): string {
  const diff = daysBetween(new Date(), d);
  if (diff === 0) return `Hoje, ${WEEKDAYS[d.getDay()]}`;
  if (diff === 1) return `Amanhã, ${WEEKDAYS[d.getDay()]}`;
  if (diff === -1) return `Ontem, ${WEEKDAYS[d.getDay()]}`;
  return `${cap(WEEKDAYS[d.getDay()])}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export default function Agenda() {
  const { tasks, leads, saveTask } = useStore();
  const [mode, setMode] = useState<'semana' | 'mes'>('semana');
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [sheet, setSheet] = useState<{ task: Task | null } | null>(null);
  const today = startOfDay(new Date());

  const pendingDays = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) if (!t.done) set.add(startOfDay(new Date(t.date)).toDateString());
    return set;
  }, [tasks]);

  const dayTasks = useMemo(
    () => tasks.filter((t) => sameDay(new Date(t.date), selected)).sort((a, b) => a.date.localeCompare(b.date)),
    [tasks, selected],
  );

  const overdue = useMemo(
    () => (sameDay(selected, today) ? tasks.filter((t) => !t.done && new Date(t.date) < today).sort((a, b) => a.date.localeCompare(b.date)) : []),
    [tasks, selected, today],
  );

  const upcoming = useMemo(() => {
    const from = addDays(selected, 1);
    const to = addDays(selected, 8);
    return tasks.filter((t) => !t.done && new Date(t.date) >= from && new Date(t.date) < to).sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks, selected]);

  const ws = weekStart(cursor);
  const week = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = weekStart(monthStart);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const weeksInMonth = Math.ceil((daysBetween(gridStart, monthEnd) + 1) / 7);
  const monthDays = Array.from({ length: weeksInMonth * 7 }, (_, i) => addDays(gridStart, i));

  const move = (dir: number) => {
    if (mode === 'semana') setCursor(addDays(cursor, dir * 7));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  };

  const pick = (d: Date) => {
    setSelected(startOfDay(d));
    setCursor(startOfDay(d));
  };

  const dayButton = (d: Date, out = false) => (
    <button
      key={d.toISOString()}
      className={`day${sameDay(d, today) ? ' today' : ''}${out ? ' out' : ''}`}
      aria-pressed={sameDay(d, selected)}
      aria-label={`${d.getDate()} de ${MONTHS[d.getMonth()]}${pendingDays.has(d.toDateString()) ? ', tem compromissos' : ''}`}
      onClick={() => pick(d)}
    >
      {mode === 'semana' && <span className="wd">{WEEKDAYS_SHORT[d.getDay()]}</span>}
      <span className="dn">{d.getDate()}</span>
      <span className={`dot${pendingDays.has(d.toDateString()) ? ' on' : ''}`} />
    </button>
  );

  const row = (t: Task, showDay = false) => {
    const d = new Date(t.date);
    const lead = leads.find((l) => l.id === t.leadId);
    const phone = lead?.phone.replace(/\D/g, '');
    const maps = lead?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}` : null;
    const visit = t.type === 'visita-orcamento' || t.type === 'visita-tecnica' || t.type === 'pos-venda';
    return (
      <li key={t.id} className={`task-row${t.done ? ' done' : ''}`}>
        <div className="when">
          <div className="h num">{time(d)}</div>
          <div className="d">{showDay ? relativeDay(d) : durationText(t.durationMin)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', width: '100%' }} onClick={() => setSheet({ task: t })}>
            <div className="tt">{TASK_LABEL[t.type]}</div>
            <div className="ts">{[lead?.name, t.notes].filter(Boolean).join(', ') || 'Sem cliente'}</div>
          </button>
          {!t.done && lead && (visit ? maps : phone) && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {visit && maps && (
                <a className="btn btn-primary btn-sm" href={maps} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Navigation size={14} />Rota</a>
              )}
              {phone && (
                <a className="btn btn-secondary btn-sm" href={`tel:${phone}`} style={{ textDecoration: 'none' }}><Phone size={14} />Ligar</a>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button className="check" aria-pressed={t.done} aria-label={t.done ? 'Marcar como pendente' : 'Marcar como feito'} onClick={() => saveTask({ ...t, done: !t.done, doneAt: t.done ? null : new Date().toISOString() })}>
            <Check size={16} strokeWidth={3} />
          </button>
          {t.reminderMin > 0 && !t.done && <Bell size={15} className="gold-text" aria-label="Com lembrete" />}
        </div>
      </li>
    );
  };

  return (
    <>
      <TopBar />
      <main className="page" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-b) + 96px)' }}>
        <div className="page-head">
          <div>
            <h1>Agenda</h1>
            <p>{cap(MONTHS[cursor.getMonth()])} {cursor.getFullYear()}</p>
          </div>
          <div className="seg white" role="group" aria-label="Visualização">
            <button aria-pressed={mode === 'semana'} onClick={() => setMode('semana')}>Semana</button>
            <button aria-pressed={mode === 'mes'} onClick={() => setMode('mes')}>Mês</button>
          </div>
        </div>

        <div className="week mt-16" style={mode === 'mes' ? { flexDirection: 'column', alignItems: 'stretch', padding: '8px 4px 4px' } : undefined}>
          {mode === 'semana' ? (
            <>
              <button className="icon-btn plain sm" aria-label="Semana anterior" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
              <div className="days">{week.map((d) => dayButton(d))}</div>
              <button className="icon-btn plain sm" aria-label="Próxima semana" onClick={() => move(1)}><ChevronRight size={18} /></button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                <button className="icon-btn plain sm" aria-label="Mês anterior" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{cap(MONTHS[cursor.getMonth()])}</span>
                <button className="icon-btn plain sm" aria-label="Próximo mês" onClick={() => move(1)}><ChevronRight size={18} /></button>
              </div>
              <div className="month-grid">
                {WEEKDAYS_SHORT.map((w) => <span key={w} className="muted" style={{ fontSize: 11, paddingBottom: 4 }}>{w}</span>)}
                {monthDays.map((d) => dayButton(d, d.getMonth() !== cursor.getMonth()))}
              </div>
            </>
          )}
        </div>

        {overdue.length > 0 && (
          <>
            <h2 className="section-title lg" style={{ marginTop: 20 }}>Ficaram para trás</h2>
            <ul className="list">{overdue.map((t) => row(t, true))}</ul>
          </>
        )}

        <div style={{ margin: '20px 0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{dayTitle(selected)}</h2>
          <span className="muted" style={{ fontSize: 13 }}>{dayTasks.length === 0 ? 'Livre' : dayTasks.length === 1 ? '1 compromisso' : `${dayTasks.length} compromissos`}</span>
        </div>
        {dayTasks.length > 0 ? (
          <ul className="list">{dayTasks.map((t) => row(t))}</ul>
        ) : (
          <div className="card empty">Nada marcado para este dia.</div>
        )}

        {upcoming.length > 0 && (
          <>
            <h2 className="section-title lg">Próximos dias</h2>
            <ul className="list">{upcoming.map((t) => row(t, true))}</ul>
          </>
        )}
      </main>

      <button className="fab" onClick={() => setSheet({ task: null })}>
        <Plus size={20} strokeWidth={2.6} />
        Novo compromisso
      </button>

      <TaskSheet open={!!sheet} onClose={() => setSheet(null)} task={sheet?.task ?? null} day={selected} />
    </>
  );
}
