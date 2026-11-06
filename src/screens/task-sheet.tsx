import { useEffect, useState } from 'react';
import { Field, Sheet, useConfirm, useToast } from '../ui/kit';
import { useStore } from '../data/store';
import { TASK_LABEL } from '../core/defaults';
import { uid } from '../core/format';
import type { Task, TaskType } from '../core/types';
import { askNotificationPermission } from '../reminders';

const DURATIONS = [15, 30, 60, 120];
const REMINDERS: { v: number; l: string }[] = [
  { v: 0, l: 'Sem lembrete' },
  { v: 15, l: '15 min antes' },
  { v: 60, l: '1 h antes' },
  { v: 1440, l: '1 dia antes' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function TaskSheet({
  open, onClose, task, leadId, day,
}: { open: boolean; onClose: () => void; task?: Task | null; leadId?: string | null; day?: Date }) {
  const { leads, saveTask, deleteTask } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [type, setType] = useState<TaskType>('retorno');
  const [lead, setLead] = useState<string>('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [reminder, setReminder] = useState(60);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (task) {
      const d = new Date(task.date);
      setType(task.type);
      setLead(task.leadId ?? '');
      setDate(toDateInput(d));
      setHour(toTimeInput(d));
      setDuration(task.durationMin);
      setReminder(task.reminderMin);
      setNotes(task.notes);
    } else {
      const base = day ?? new Date();
      setType(leadId ? 'retorno' : 'visita-orcamento');
      setLead(leadId ?? '');
      setDate(toDateInput(base));
      const h = new Date();
      setHour(day && toDateInput(day) !== toDateInput(new Date()) ? '09:00' : `${pad(Math.min(h.getHours() + 1, 23))}:00`);
      setDuration(60);
      setReminder(60);
      setNotes('');
    }
  }, [open, task, leadId, day]);

  async function save() {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = hour.split(':').map(Number);
    const when = new Date(y, m - 1, d, hh, mm);
    if (Number.isNaN(when.getTime())) return;
    if (reminder > 0) {
      const ok = await askNotificationPermission();
      if (!ok) toast('Lembrete salvo, mas as notificações estão desligadas no navegador');
    }
    const changedTime = task && task.date !== when.toISOString();
    await saveTask({
      id: task?.id ?? uid(),
      type,
      leadId: lead || null,
      date: when.toISOString(),
      durationMin: duration,
      reminderMin: reminder,
      notes: notes.trim(),
      done: task?.done ?? false,
      doneAt: task?.doneAt ?? null,
      notified: changedTime || reminder !== task?.reminderMin ? false : (task?.notified ?? false),
      createdAt: task?.createdAt ?? new Date().toISOString(),
    });
    toast(task ? 'Compromisso atualizado' : 'Compromisso agendado');
    onClose();
  }

  const sortedLeads = [...leads].filter((l) => l.status !== 'perdido' || l.id === lead).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Editar compromisso' : 'Novo compromisso'}>
      <div className="stack">
        <div className="chips" role="group" aria-label="Tipo">
          {(Object.keys(TASK_LABEL) as TaskType[]).map((t) => (
            <button key={t} className="chip" aria-pressed={type === t} onClick={() => setType(t)}>{TASK_LABEL[t]}</button>
          ))}
        </div>
        <Field label="Cliente" htmlFor="tk-lead">
          <select id="tk-lead" className="input" value={lead} onChange={(e) => setLead(e.target.value)}>
            <option value="">Sem cliente</option>
            {sortedLeads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <div className="grid-2">
          <Field label="Dia" htmlFor="tk-date">
            <input id="tk-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora" htmlFor="tk-hour">
            <input id="tk-hour" type="time" className="input" value={hour} onChange={(e) => setHour(e.target.value)} />
          </Field>
        </div>
        <div className="field">
          <span>Duração</span>
          <div className="tiles" role="group" aria-label="Duração">
            {DURATIONS.map((d) => (
              <button key={d} aria-pressed={duration === d} onClick={() => setDuration(d)}>{d < 60 ? `${d} min` : `${d / 60} h`}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Lembrete</span>
          <div className="chips" role="group" aria-label="Lembrete">
            {REMINDERS.map((r) => (
              <button key={r.v} className="chip" aria-pressed={reminder === r.v} onClick={() => setReminder(r.v)}>{r.l}</button>
            ))}
          </div>
        </div>
        <Field label="Observação" htmlFor="tk-notes">
          <textarea id="tk-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: levar amostra do módulo" />
        </Field>
      </div>
      <div className="sheet-actions">
        {task ? (
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (await confirm({ title: 'Apagar compromisso?', confirm: 'Apagar', danger: true })) {
                await deleteTask(task.id);
                onClose();
              }
            }}
          >
            Apagar
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        )}
        <button className="btn btn-primary" disabled={!date || !hour} onClick={save}>{task ? 'Salvar' : 'Agendar'}</button>
      </div>
    </Sheet>
  );
}
