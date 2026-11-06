import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Kit, Lead, Proposal, QuoteInput, Settings, Task, ProposalStatus } from '../core/types';
import { DEFAULT_SETTINGS, newQuoteInput } from '../core/defaults';
import { calculate } from '../core/calc';
import { uid } from '../core/format';
import * as db from './db';
import { blobToDataUrl, dataUrlToBlob, type Backup } from './backup';

export interface Draft {
  leadId: string | null;
  proposalId: string | null;
  input: QuoteInput;
}

interface StoreValue {
  ready: boolean;
  settings: Settings;
  kits: Kit[];
  leads: Lead[];
  proposals: Proposal[];
  tasks: Task[];
  draft: Draft;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  replaceKits: (kits: Kit[]) => Promise<void>;
  saveKit: (kit: Kit) => Promise<void>;
  deleteKit: (id: string) => Promise<void>;
  createLead: (data: Partial<Lead> & { name: string }) => Promise<Lead>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  setDraft: (updater: (d: Draft) => Draft) => void;
  newDraft: (leadId?: string | null) => void;
  openProposalInDraft: (p: Proposal) => void;
  saveDraftAsProposal: () => Promise<Proposal | null>;
  setProposalStatus: (id: string, status: ProposalStatus) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;
  closeSale: (leadId: string, proposalId: string, commission: { value: number; manual: boolean }) => Promise<void>;
  saveTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addAttachment: (leadId: string, file: File) => Promise<void>;
  removeAttachment: (leadId: string, attId: string) => Promise<void>;
  fileUrl: (id: string) => Promise<string | null>;
  exportBackup: () => Promise<Backup>;
  importBackup: (b: Backup) => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fora do StoreProvider');
  return v;
}

const now = () => new Date().toISOString();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [kits, setKits] = useState<Kit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraftState] = useState<Draft>({ leadId: null, proposalId: null, input: newQuoteInput(DEFAULT_SETTINGS) });

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const kitsRef = useRef(kits);
  kitsRef.current = kits;
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const urlCache = useRef(new Map<string, string>());

  useEffect(() => {
    (async () => {
      const [s, k, l, p, t, d] = await Promise.all([
        db.get<Settings>('kv', 'settings'),
        db.getAll<Kit>('kits'),
        db.getAll<Lead>('leads'),
        db.getAll<Proposal>('proposals'),
        db.getAll<Task>('tasks'),
        db.get<Draft>('kv', 'draft'),
      ]);
      const st = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
      setSettings(st);
      setKits(k);
      setLeads(l);
      setProposals(p);
      setTasks(t);
      if (d?.input) setDraftState({ ...d, input: { ...newQuoteInput(st), ...d.input, params: { ...newQuoteInput(st).params, ...d.input.params } } });
      else setDraftState({ leadId: null, proposalId: null, input: newQuoteInput(st) });
      setReady(true);
      db.requestPersistence();
    })();
  }, []);

  // Rascunho do orçamento sobrevive à troca de abas e ao fechar o app
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => db.put('kv', draft, 'draft'), 300);
    return () => clearTimeout(t);
  }, [draft, ready]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    setSettings(next);
    await db.put('kv', next, 'settings');
  }, []);

  const replaceKits = useCallback(async (list: Kit[]) => {
    await db.clear('kits');
    await db.putMany('kits', list);
    setKits(list);
  }, []);

  const saveKit = useCallback(async (kit: Kit) => {
    await db.put('kits', kit);
    setKits((prev) => {
      const i = prev.findIndex((k) => k.id === kit.id);
      if (i === -1) return [...prev, kit];
      const next = [...prev];
      next[i] = kit;
      return next;
    });
  }, []);

  const deleteKit = useCallback(async (id: string) => {
    await db.remove('kits', id);
    setKits((prev) => prev.filter((k) => k.id !== id));
  }, []);

  const createLead = useCallback(async (data: Partial<Lead> & { name: string }) => {
    const lead: Lead = {
      id: uid(),
      phone: '',
      address: '',
      lat: null,
      lng: null,
      status: 'novo',
      createdAt: now(),
      updatedAt: now(),
      records: [],
      attachments: [],
      soldAt: null,
      soldProposalId: null,
      commission: null,
      ...data,
    };
    await db.put('leads', lead);
    setLeads((prev) => [lead, ...prev]);
    return lead;
  }, []);

  // Sempre parte do registro mais recente: nada sobrescreve dados salvos por outra ação
  const updateLead = useCallback(async (id: string, patch: Partial<Lead>) => {
    const current = leadsRef.current.find((l) => l.id === id);
    if (!current) return;
    const next = { ...current, ...patch, updatedAt: now() };
    leadsRef.current = leadsRef.current.map((l) => (l.id === id ? next : l));
    setLeads(leadsRef.current);
    await db.put('leads', next);
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    const lead = leadsRef.current.find((l) => l.id === id);
    const propIds = (await db.getAll<Proposal>('proposals')).filter((p) => p.leadId === id).map((p) => p.id);
    const taskIds = (await db.getAll<Task>('tasks')).filter((t) => t.leadId === id).map((t) => t.id);
    await db.removeMany('proposals', propIds);
    await db.removeMany('tasks', taskIds);
    await db.removeMany('files', lead?.attachments.map((a) => a.id) ?? []);
    await db.remove('leads', id);
    setProposals((prev) => prev.filter((p) => p.leadId !== id));
    setTasks((prev) => prev.filter((t) => t.leadId !== id));
    setLeads((prev) => prev.filter((l) => l.id !== id));
    if (draftRef.current.leadId === id) setDraftState((d) => ({ ...d, leadId: null, proposalId: null }));
  }, []);

  const setDraft = useCallback((updater: (d: Draft) => Draft) => {
    setDraftState((d) => updater(d));
  }, []);

  const newDraft = useCallback((leadId: string | null = null) => {
    const prev = draftRef.current.input;
    setDraftState({ leadId, proposalId: null, input: newQuoteInput(settingsRef.current, prev) });
  }, []);

  const openProposalInDraft = useCallback((p: Proposal) => {
    setDraftState({ leadId: p.leadId, proposalId: p.id, input: structuredClone(p.input) });
  }, []);

  const saveDraftAsProposal = useCallback(async () => {
    const d = draftRef.current;
    if (!d.leadId) return null;
    const result = calculate(d.input, kitsRef.current);
    const existing = d.proposalId ? (await db.get<Proposal>('proposals', d.proposalId)) : undefined;
    let proposal: Proposal;
    if (existing) {
      proposal = { ...existing, input: structuredClone(d.input), result, updatedAt: now() };
    } else {
      const number = settingsRef.current.nextProposalNumber;
      proposal = { id: uid(), number, leadId: d.leadId, createdAt: now(), updatedAt: now(), status: 'rascunho', input: structuredClone(d.input), result };
      await updateSettings({ nextProposalNumber: number + 1 });
    }
    await db.put('proposals', proposal);
    setProposals((prev) => [proposal, ...prev.filter((p) => p.id !== proposal.id)]);
    setDraftState((cur) => ({ ...cur, proposalId: proposal.id }));
    const lead = leadsRef.current.find((l) => l.id === d.leadId);
    if (lead && lead.status === 'novo') await updateLead(lead.id, { status: 'negociando' });
    return proposal;
  }, [updateLead, updateSettings]);

  const setProposalStatus = useCallback(async (id: string, status: ProposalStatus) => {
    const p = await db.get<Proposal>('proposals', id);
    if (!p) return;
    const next = { ...p, status, updatedAt: now() };
    await db.put('proposals', next);
    setProposals((prev) => prev.map((x) => (x.id === id ? next : x)));
  }, []);

  const deleteProposal = useCallback(async (id: string) => {
    await db.remove('proposals', id);
    setProposals((prev) => prev.filter((p) => p.id !== id));
    if (draftRef.current.proposalId === id) setDraftState((d) => ({ ...d, proposalId: null }));
  }, []);

  const closeSale = useCallback(async (leadId: string, proposalId: string, commission: { value: number; manual: boolean }) => {
    await setProposalStatus(proposalId, 'aprovado');
    await updateLead(leadId, { status: 'vendido', soldAt: now(), soldProposalId: proposalId, commission: { ...commission, paid: false } });
  }, [setProposalStatus, updateLead]);

  const saveTask = useCallback(async (task: Task) => {
    await db.put('tasks', task);
    setTasks((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await db.remove('tasks', id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addAttachment = useCallback(async (leadId: string, file: File) => {
    const id = uid();
    await db.put('files', { id, blob: file });
    const lead = leadsRef.current.find((l) => l.id === leadId);
    if (!lead) return;
    await updateLead(leadId, { attachments: [{ id, name: file.name || 'Foto', type: file.type || 'image/jpeg', date: now() }, ...lead.attachments] });
  }, [updateLead]);

  const removeAttachment = useCallback(async (leadId: string, attId: string) => {
    await db.remove('files', attId);
    const lead = leadsRef.current.find((l) => l.id === leadId);
    if (!lead) return;
    await updateLead(leadId, { attachments: lead.attachments.filter((a) => a.id !== attId) });
    const u = urlCache.current.get(attId);
    if (u) URL.revokeObjectURL(u);
    urlCache.current.delete(attId);
  }, [updateLead]);

  const fileUrl = useCallback(async (id: string) => {
    const cached = urlCache.current.get(id);
    if (cached) return cached;
    const f = await db.get<db.StoredFile>('files', id);
    if (!f) return null;
    const u = URL.createObjectURL(f.blob);
    urlCache.current.set(id, u);
    return u;
  }, []);

  const exportBackup = useCallback(async (): Promise<Backup> => {
    const stored = await db.getAll<db.StoredFile>('files');
    const files = await Promise.all(stored.map(async (f) => ({ id: f.id, type: f.blob.type, dataUrl: await blobToDataUrl(f.blob) })));
    const exportedAt = now();
    await updateSettings({ lastBackupAt: exportedAt });
    return {
      app: 'sonit',
      version: 3,
      exportedAt,
      settings: { ...settingsRef.current, lastBackupAt: exportedAt },
      kits: kitsRef.current,
      leads: leadsRef.current,
      proposals: await db.getAll<Proposal>('proposals'),
      tasks: await db.getAll<Task>('tasks'),
      files,
    };
  }, [updateSettings]);

  const importBackup = useCallback(async (b: Backup) => {
    for (const s of ['kits', 'leads', 'proposals', 'tasks', 'files'] as const) await db.clear(s);
    await db.putMany('kits', b.kits);
    await db.putMany('leads', b.leads);
    await db.putMany('proposals', b.proposals);
    await db.putMany('tasks', b.tasks);
    const files = await Promise.all(b.files.map(async (f) => ({ id: f.id, blob: await dataUrlToBlob(f.dataUrl) })));
    await db.putMany('files', files);
    const st = { ...DEFAULT_SETTINGS, ...b.settings };
    await db.put('kv', st, 'settings');
    urlCache.current.forEach((u) => URL.revokeObjectURL(u));
    urlCache.current.clear();
    setSettings(st);
    setKits(b.kits);
    setLeads(b.leads);
    setProposals(b.proposals);
    setTasks(b.tasks);
    setDraftState({ leadId: null, proposalId: null, input: newQuoteInput(st) });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready, settings, kits, leads, proposals, tasks, draft,
      updateSettings, replaceKits, saveKit, deleteKit, createLead, updateLead, deleteLead,
      setDraft, newDraft, openProposalInDraft, saveDraftAsProposal, setProposalStatus, deleteProposal, closeSale,
      saveTask, deleteTask, addAttachment, removeAttachment, fileUrl, exportBackup, importBackup,
    }),
    [ready, settings, kits, leads, proposals, tasks, draft, updateSettings, replaceKits, saveKit, deleteKit, createLead, updateLead, deleteLead, setDraft, newDraft, openProposalInDraft, saveDraftAsProposal, setProposalStatus, deleteProposal, closeSale, saveTask, deleteTask, addAttachment, removeAttachment, fileUrl, exportBackup, importBackup],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------- consultas derivadas ---------- */

export function proposalsOf(proposals: Proposal[], leadId: string): Proposal[] {
  return proposals.filter((p) => p.leadId === leadId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function nextTaskOf(tasks: Task[], leadId: string): Task | null {
  const pending = tasks.filter((t) => t.leadId === leadId && !t.done).sort((a, b) => a.date.localeCompare(b.date));
  return pending[0] ?? null;
}

export function lastActivity(lead: Lead, proposals: Proposal[], tasks: Task[]): Date {
  const dates = [lead.createdAt, ...lead.records.map((r) => r.date)];
  for (const p of proposals) if (p.leadId === lead.id) dates.push(p.updatedAt);
  for (const t of tasks) if (t.leadId === lead.id && t.doneAt) dates.push(t.doneAt);
  return new Date(dates.sort().at(-1) ?? lead.createdAt);
}
