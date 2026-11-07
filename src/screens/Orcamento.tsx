import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AudioWaveform, BadgeDollarSign, BatteryCharging, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, CirclePlus, Cpu, FileUp, Grid2x2Plus, HandCoins, Pause, Play, Plus, ReceiptText, Save, ScrollText, SlidersHorizontal, UtilityPole, Warehouse, X } from 'lucide-react';
import { TopBar } from '../ui/chrome';
import { useMedia, useToast } from '../ui/kit';
import { useStore } from '../data/store';
import { billCompare, calculate, inverterBrandOf, inverterSize, installmentFor, kitKw } from '../core/calc';
import { GRID_LABEL, INSTALLMENT_OPTIONS, LEAD_STATUS_LABEL, PAY_LABEL, ROOF_LABEL, SYSTEM_LABEL } from '../core/defaults';
import { brl, initials, monthsText, num, parseBR } from '../core/format';
import { horizonYears, inverterSizes, pickInverter, stepKit } from '../core/quote';
import type { Grid, Lead, PayMethod, QuoteInput, Roof, Settings, SystemType } from '../core/types';
import { navigate, useLayer } from '../router';
import { day, projectionSvg, sceneSvg, startDay, whenPaid } from './casa';
import { ClientPicker, MonthlySheet } from './orcamento-sheets';
import { shrinkPhoto } from '../ui/images';
import './orcamento.css';

type PopName = 'grid' | 'roof' | 'brand' | 'power' | 'inverter' | 'ibrand' | 'folga' | 'inst' | 'carport';
type Fmt = 'brl' | 'brl2' | 'W' | 'kW' | 'mod' | 'pct';

const SYSTEM_ICON: Record<SystemType, typeof Cpu> = { ongrid: UtilityPole, hibrido: Cpu, bateria: BatteryCharging, ampliacao: Grid2x2Plus };
const POP_TITLE: Record<PopName, string> = { grid: 'Rede', roof: 'Telhado', brand: 'Marca do módulo', power: 'Potência', inverter: 'Inversor', ibrand: 'Marca do inversor', folga: 'Folga', inst: 'Tarifa e ampliação', carport: 'Carport' };
const money = (n: number) => num(n, Number.isInteger(n) ? 0 : 2);
const FMT: Record<Fmt, (v: number) => string> = {
  brl: (v) => `R$ ${money(v)}`,
  brl2: (v) => `R$ ${num(v, 2)}`,
  W: (v) => `${v} W`,
  kW: (v) => `${String(v).replace('.', ',')} kW`,
  mod: (v) => `${v} mód.`,
  pct: (v) => `${String(v).replace('.', ',')}%`,
};

/** Campo com a unidade embutida: enquanto digita mostra só o número; ao sair mostra R$, W, kW ou %. */
function UF({ value, onChange, fmt, label, className = 'uf' }: { value: number; onChange: (n: number) => void; fmt: Fmt; label: string; className?: string }) {
  const [raw, setRaw] = useState<string | null>(null);
  return (
    <input
      className={`${className} num`}
      inputMode="decimal"
      aria-label={label}
      value={raw ?? FMT[fmt](value || 0)}
      onFocus={(e) => { setRaw(value ? String(value).replace('.', ',') : ''); e.target.select(); }}
      onChange={(e) => { setRaw(e.target.value); onChange(parseBR(e.target.value)); }}
      onBlur={() => setRaw(null)}
    />
  );
}

const Labeled = ({ label, ...p }: { label: string; value: number; onChange: (n: number) => void; fmt: Fmt }) => <label className="field">{label}<UF label={label} {...p} /></label>;

function Popup({ name, anchor, edit, onEdit, onClose, children }: { name: PopName; anchor: DOMRect; edit: boolean; onEdit: (() => void) | null; onClose: () => void; children: ReactNode }) {
  useLayer(true, onClose);
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const p = box.current!;
    const m = 8, w = p.offsetWidth, h = p.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const left = Math.max(m, Math.min(anchor.left + anchor.width / 2 - w / 2, vw - w - m));
    let top = anchor.bottom + 6;
    if (top + h > vh - m) top = anchor.top - h - 6;
    if (top < m) top = Math.max(m, vh - h - m);
    p.style.left = `${left}px`;
    p.style.top = `${top}px`;
  });
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('resize', onClose);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);
  return (
    <>
      <div className="pp-bg" onClick={onClose} />
      <div className={`ppx${edit ? ' wide' : ''}`} ref={box} role="dialog" aria-label={POP_TITLE[name]}>
        <div className="pp-h">
          <b>{POP_TITLE[name]}</b>
          {onEdit && <button className="pp-g" aria-label={edit ? 'Concluir edição' : 'Editar opções'} aria-pressed={edit} onClick={onEdit}>{edit ? <Check size={14} /> : <SlidersHorizontal size={14} />}</button>}
        </div>
        <div className="pp-b">{children}</div>
      </div>
    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useLayer(true, onClose);
  return (
    <div className="ov">
      <div className="ov-bg" onClick={onClose} />
      <div className="ov-p" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ov-h"><h2>{title}</h2><button className="x" aria-label="Fechar" onClick={onClose}><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

const Item = ({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub?: string }) => (
  <button className="it" aria-pressed={on} onClick={onClick}><b className="num">{title}</b>{sub && <small className="num">{sub}</small>}</button>
);

function Cell({ title, onRemove, children }: { title: string; onRemove?: () => void; children: ReactNode }) {
  return (
    <div className="cell">
      {onRemove && <button className="rm" aria-label={`Remover ${title}`} onClick={onRemove}><X size={11} /></button>}
      <small>{title}</small>
      {children}
    </div>
  );
}

function AddCell({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [adding, setAdding] = useState(false);
  if (!adding) return <button className="plus" aria-label="Adicionar" onClick={() => setAdding(true)}><Plus size={16} /></button>;
  return (
    <div className="cell">
      <small>Novo</small>
      <input
        className="uf"
        autoFocus
        placeholder={placeholder}
        aria-label={placeholder}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        onBlur={(e) => { setAdding(false); if (e.target.value.trim()) onAdd(e.target.value.trim()); }}
      />
    </div>
  );
}

function PickBtn({ label, value, Icon, onOpen }: { label: string; value: string; Icon?: typeof Cpu; onOpen: (r: DOMRect) => void }) {
  return (
    <button className={`pick${Icon ? ' withi' : ''}`} onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}>
      {Icon && <i className="pi"><Icon size={16} /></i>}
      <small>{label}</small>
      <b className="num">{value}</b>
      <ChevronDown size={15} className="pick-c" />
    </button>
  );
}

function TapQty({ big, sub, onStep }: { big: number; sub: string; onStep: (d: number) => void }) {
  return (
    <div className="tap">
      <button className="l" aria-label={`Menos, ${sub}`} onClick={() => onStep(-1)}><ChevronLeft size={18} /></button>
      <span><b className="num">{big}</b><small className="num">{sub}</small></span>
      <button className="r" aria-label={`Mais, ${sub}`} onClick={() => onStep(1)}><ChevronRight size={18} /></button>
    </div>
  );
}

function BillInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const [raw, setRaw] = useState<string | null>(null);
  const text = raw ?? (value ? money(value) : '');
  return (
    <input
      id="conta"
      className="num"
      inputMode="decimal"
      aria-label={label}
      placeholder="0"
      value={text}
      style={{ width: `${Math.max(2.2, text.length * 0.66 + 0.5)}em` }}
      onFocus={() => setRaw(value ? money(value) : '')}
      onChange={(e) => { const t = e.target.value.replace(/[^\d.,]/g, ''); setRaw(t); onChange(parseBR(t)); }}
      onBlur={() => setRaw(null)}
    />
  );
}

function Scene({ total, type, bats, generation, coverage }: { total: number; type: SystemType; bats: number; generation: number; coverage: number }) {
  const [playing, setPlaying] = useState(day.playing);
  const svg = useMemo(() => ({ __html: sceneSvg(type, bats) }), [type, bats]);
  day.type = type;
  useEffect(() => startDay(), []);
  return (
    <div className="scene" id="sky">
      <div dangerouslySetInnerHTML={svg} />
      <div className="chip"><small>Gera por mês</small><b className="num">{num(generation)} kWh</b></div>
      <div className="chip r"><small>{total} painéis</small><b className="num">Cobre {num(coverage * 100)}%</b></div>
      <div className="status">
        <button className="pp" aria-label={playing ? 'Pausar animação' : 'Tocar animação'} onClick={() => { day.playing = !playing; setPlaying(!playing); }}>
          {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
        </button>
        <b className="num" id="clock" />
        <span id="st" />
      </div>
    </div>
  );
}

export default function Orcamento() {
  const { draft, setDraft, newDraft, selectClient, keepCurrentClient, kits, leads, proposals, saveDraftAsProposal, settings, updateSettings, addAttachment } = useStore();
  const toast = useToast();
  const [sheet, setSheet] = useState<'client' | 'monthly' | 'custom' | 'config' | null>(null);
  const [afterPick, setAfterPick] = useState<null | 'save' | 'proposal'>(null);
  const billFile = useRef<File | null>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const photoIn = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState<{ name: PopName; anchor: DOMRect; edit: boolean } | null>(null);
  const [panel, setPanel] = useState<'info' | 'com' | null>(null);
  const [tab, setTab] = useState<'neg' | 'fix'>('neg');
  const [preview, setPreview] = useState<'auto' | 'manual'>('manual');
  const [custom, setCustom] = useState({ final: 0, discount: 0 });
  const wide = useMedia('(min-width: 1340px)'); // três colunas, como no CSS

  const input = draft.input;
  const r = useMemo(() => calculate(input, kits), [input, kits]);
  const lead = leads.find((l) => l.id === draft.leadId) ?? null;
  const editing = draft.proposalId ? proposals.find((p) => p.id === draft.proposalId) : null;
  const leadProposals = lead ? proposals.filter((p) => p.leadId === lead.id).length : 0;
  const amp = input.systemType === 'ampliacao';
  const pr = input.pricing;
  const p = input.params;
  const years = horizonYears(r.paybackMonths);
  const projected = r.monthlySavings * 12 * years;
  const fixedMode = pr.mode === 'fixo' || pr.mode === 'fechado';
  const cmp = billCompare(r, input.payment.method);

  const set = (patch: Partial<QuoteInput>) => setDraft((d) => ({ ...d, input: { ...d.input, ...patch } }));
  const setPr = (patch: Partial<QuoteInput['pricing']>) => set({ pricing: { ...pr, ...patch } });
  const setPay = (patch: Partial<QuoteInput['payment']>) => set({ payment: { ...input.payment, ...patch } });
  const setP = (patch: Partial<QuoteInput['params']>) => set({ params: { ...p, ...patch } });
  const resetKit = { manualModules: null, manualInverter: null };
  const closePop = useRef(() => setPop(null)).current;
  const open = (name: PopName) => (anchor: DOMRect) => setPop({ name, anchor, edit: false });

  /** Opção geral: vale para os próximos orçamentos e também para o que está aberto. */
  function config(patch: Partial<Settings>, kitChanged = false) {
    updateSettings(patch);
    const { panelPowers: _a, marginOptions: _b, ...params } = patch;
    set({ params: { ...p, ...params }, ...(kitChanged ? resetKit : {}) });
  }

  async function persist(goToProposal: boolean) {
    if (!draft.leadId) {
      setAfterPick(goToProposal ? 'proposal' : 'save');
      setSheet('client');
      return;
    }
    setBusy(true);
    const saved = await saveDraftAsProposal();
    setBusy(false);
    if (!saved) return;
    if (goToProposal) navigate(`/proposta/${saved.id}`);
    else toast(editing ? 'Orçamento atualizado' : 'Orçamento salvo');
  }

  /** Fatura enviada pelo cliente: fica nos anexos dele. A leitura dos números vem quando houver uma fatura de exemplo. */
  async function attachBill(file: File, to: Lead) {
    billFile.current = null;
    await addAttachment(to.id, await shrinkPhoto(file));
    toast(`Fatura salva nos anexos de ${to.name.split(' ')[0]}`);
  }

  async function onBill(file: File | undefined) {
    if (!file) return;
    if (lead) return attachBill(file, lead);
    billFile.current = file;
    setSheet('client');
  }

  async function onPickClient(l: Lead) {
    setSheet(null);
    setBusy(true);
    await selectClient(l.id);
    if (billFile.current) await attachBill(billFile.current, l);
    const intent = afterPick;
    setAfterPick(null);
    const saved = intent ? await saveDraftAsProposal() : null;
    setBusy(false);
    if (intent === 'proposal' && saved) navigate(`/proposta/${saved.id}`);
    else if (saved) toast('Orçamento salvo');
  }

  async function startAnother() {
    setBusy(true);
    await keepCurrentClient();
    newDraft(lead?.id ?? null);
    setBusy(false);
  }

  function step(d: number) {
    const next = stepKit(input, r, kits, d);
    if (next) set(next);
    else toast(d > 0 ? `${GRID_LABEL[input.grid]} vai até ${r.modules} módulos.` : 'Esse já é o menor kit da tabela.');
  }

  const setUnit = (mode: 'reais' | 'kwh') => {
    if (mode === input.billMode) return;
    set({ billMode: mode, billValue: mode === 'reais' ? Math.round(input.billValue * p.tariff) : Math.round(r.consumptionKwh), monthly: null, ...resetKit });
  };

  /* ---------- conteúdo dos popups ---------- */
  function popBody(name: PopName, edit: boolean): ReactNode {
    const s = settings;
    const close = (patch: Partial<QuoteInput>) => { set(patch); setPop(null); };
    const brands = (key: 'moduleBrandExtras' | 'inverterBrandExtras') => {
      const map = s[key] ?? {};
      const change = (next: Record<string, number>) => config({ [key]: next });
      return (
        <div className="cells">
          {Object.keys(map).map((b) => (
            <Cell key={b} title={b} onRemove={Object.keys(map).length > 1 ? () => { const { [b]: _gone, ...rest } = map; change(rest); } : undefined}>
              <UF label={`${b}, valor a mais`} fmt="brl" value={map[b]} onChange={(n) => change({ ...map, [b]: n })} />
            </Cell>
          ))}
          <AddCell placeholder="Nome" onAdd={(t) => { if (map[t] === undefined) change({ ...map, [t]: 0 }); }} />
        </div>
      );
    };
    const numbers = (key: 'panelPowers' | 'marginOptions', fmt: Fmt, title: string, ph: string) => {
      const list = s[key];
      return (
        <div className="cells">
          {list.map((v, i) => (
            <Cell key={i} title={title} onRemove={list.length > 1 ? () => config({ [key]: list.filter((_, j) => j !== i) }) : undefined}>
              <UF label={title} fmt={fmt} value={v} onChange={(n) => config({ [key]: list.map((x, j) => (j === i ? n : x)) })} />
            </Cell>
          ))}
          <AddCell placeholder={ph} onAdd={(t) => { const n = parseBR(t); if (n && !list.includes(n)) config({ [key]: [...list, n] }); }} />
        </div>
      );
    };

    if (edit) {
      if (name === 'grid') {
        const gl = s.gridLimits!;
        const setG = (g: Grid, patch: Partial<(typeof gl)['mono']>) => config({ gridLimits: { ...gl, [g]: { ...gl[g], ...patch } } }, true);
        return <div className="cells">{(Object.keys(GRID_LABEL) as Grid[]).map((g) => (
          <Cell key={g} title={GRID_LABEL[g]}>
            <label>Inversor até<UF label={`${GRID_LABEL[g]}: inversor até`} fmt="kW" value={gl[g].inverterKw} onChange={(n) => setG(g, { inverterKw: n })} /></label>
            <label>Módulos até<UF label={`${GRID_LABEL[g]}: módulos até`} fmt="mod" value={gl[g].modules} onChange={(n) => setG(g, { modules: n })} /></label>
          </Cell>
        ))}</div>;
      }
      if (name === 'roof') {
        return <div className="cells">{(Object.keys(ROOF_LABEL) as Roof[]).map((k) => (
          <Cell key={k} title={ROOF_LABEL[k]}>
            {k === 'carport' ? <span className="tx">Por orçamento</span> : k === 'laje'
              ? <UF label="Laje, valor a mais" fmt="brl" value={s.lajeExtra} onChange={(n) => config({ lajeExtra: n })} />
              : <UF label={`${ROOF_LABEL[k]}, valor a mais`} fmt="brl" value={s.roofExtras?.[k] ?? 0} onChange={(n) => config({ roofExtras: { ...s.roofExtras, [k]: n } })} />}
          </Cell>
        ))}</div>;
      }
      if (name === 'brand') return brands('moduleBrandExtras');
      if (name === 'ibrand') return brands('inverterBrandExtras');
      if (name === 'power') return numbers('panelPowers', 'W', 'Módulo', 'Ex.: 650');
      if (name === 'folga') return numbers('marginOptions', 'pct', 'Folga', 'Ex.: 60');
      if (name === 'inverter') {
        const maxOf = (kw: number) => Math.max(0, ...kits.filter((k) => kitKw(k.inverter) === kw).map((k) => Math.max(k.panel585 || 0, k.panel610 || 0, k.panel700 || 0)));
        const sizes = [...new Set(kits.map((k) => kitKw(k.inverter)))].sort((a, b) => a - b);
        return <div className="cells">{sizes.map((kw) => (
          <Cell key={kw} title={FMT.kW(kw)}>
            <UF label={`${FMT.kW(kw)}, módulos até`} fmt="mod" value={s.inverterLimits?.[String(kw)] ?? maxOf(kw)} onChange={(n) => config({ inverterLimits: { ...s.inverterLimits, [String(kw)]: n } }, true)} />
          </Cell>
        ))}</div>;
      }
    }
    if (name === 'grid') return (Object.keys(GRID_LABEL) as Grid[]).map((g) => {
      const lim = s.gridLimits![g];
      return <Item key={g} on={input.grid === g} title={GRID_LABEL[g]} sub={`até ${FMT.kW(lim.inverterKw)}, ${lim.modules} módulos`} onClick={() => close({ grid: g, ...resetKit })} />;
    });
    if (name === 'roof') return (Object.keys(ROOF_LABEL) as Roof[]).map((k) => {
      const extra = k === 'laje' ? s.lajeExtra : s.roofExtras?.[k] ?? 0;
      return <Item key={k} on={input.roof === k} title={ROOF_LABEL[k]} sub={k === 'carport' ? 'Por orçamento' : extra ? `+ ${brl(extra)}` : undefined} onClick={() => { if (k === 'carport') { set({ roof: k }); setPop((x) => x && { ...x, name: 'carport' }); } else close({ roof: k }); }} />;
    });
    if (name === 'brand') return Object.entries(s.moduleBrandExtras ?? {}).map(([k, v]) => <Item key={k} on={input.moduleBrand === k} title={k} sub={v ? `+ ${brl(v)}` : undefined} onClick={() => close({ moduleBrand: k })} />);
    if (name === 'ibrand') return (
      <>
        <Item on={!input.inverterBrand} title="Qualquer" sub="Pela tabela" onClick={() => close({ inverterBrand: '', manualInverter: null })} />
        {Object.entries(s.inverterBrandExtras ?? {}).map(([k, v]) => <Item key={k} on={input.inverterBrand === k} title={k} sub={v ? `+ ${brl(v)}` : undefined} onClick={() => close({ inverterBrand: k, manualInverter: null })} />)}
      </>
    );
    if (name === 'power') return s.panelPowers.map((w) => <Item key={w} on={input.panelW === w} title={`${w} W`} onClick={() => close({ panelW: w, ...resetKit })} />);
    if (name === 'folga') return s.marginOptions.map((m) => <Item key={m} on={p.safetyMargin === m} title={`${m}%`} onClick={() => close({ params: { ...p, safetyMargin: m }, ...resetKit })} />);
    if (name === 'inverter') {
      const cur = r.kit ? kitKw(r.kit.inverter) : null;
      const sizes = inverterSizes(input, kits);
      if (!sizes.length) return <p className="tx">Nenhum inversor dentro do limite da rede.</p>;
      return sizes.map((kw) => {
        const lim = s.inverterLimits?.[String(kw)];
        return <Item key={kw} on={cur === kw} title={FMT.kW(kw)} sub={lim ? `até ${lim} módulos` : undefined} onClick={() => { const next = pickInverter(input, r, kits, kw); if (next) close(next); }} />;
      });
    }
    if (name === 'carport') return <div className="cells one"><Cell title="Orçamento da estrutura"><UF label="Orçamento da estrutura metálica" fmt="brl" value={input.carportPrice ?? 0} onChange={(n) => set({ carportPrice: n })} /></Cell></div>;
    return (
      <div className="cells two-c">
        <Cell title="Tarifa por kWh"><UF label="Tarifa por kWh" fmt="brl2" value={s.tariff} onChange={(n) => config({ tariff: n })} /></Cell>
        <Cell title="Ampliação, por módulo"><UF label="Preço por módulo na ampliação" fmt="brl" value={s.expansionModulePrice} onChange={(n) => config({ expansionModulePrice: n })} /></Cell>
      </div>
    );
  }

  const customMargin = ![0, 10, 20].includes(p.safetyMargin);
  const existing = input.existing ?? { modules: 0, w: 610 };
  const canToggle = r.discountShown > 0 || !!(pr.discountOff && pr.discount > 0);

  // Computador largo: cliente, tipo, conta e sistema à esquerda; casa e valor no meio; retorno à direita
  const blocks = {
    client: (
      <>
            <section className="pnl">
              <button className="who" onClick={() => setSheet('client')}>
                <i>{lead ? initials(lead.name) : <CirclePlus size={22} />}</i>
                <span>
                  <b>{lead?.name ?? 'Escolher cliente'}</b>
                  <small>{lead ? `${LEAD_STATUS_LABEL[lead.status]}, ${leadProposals === 0 ? 'nenhum orçamento salvo' : leadProposals === 1 ? '1 orçamento salvo' : `${leadProposals} orçamentos salvos`}` : 'Toque para abrir a lista'}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            </section>

            <section className="pnl">
              <div className="orbs" role="group" aria-label="Tipo de sistema">
                {(Object.keys(SYSTEM_LABEL) as SystemType[]).map((t) => {
                  const Icon = SYSTEM_ICON[t];
                  return <button key={t} aria-pressed={input.systemType === t} onClick={() => set({ systemType: t, ...resetKit })}><i><Icon size={23} /></i>{SYSTEM_LABEL[t]}</button>;
                })}
              </div>
            </section>

            {r.warnings.map((w) => <div className="warn" role="status" key={w}>{w}</div>)}

            <section className="pnl">
              <div className="hrow">
                <h2 className="h">Instalação e conta de luz</h2>
                <button className="gear" aria-label="Tarifa e ampliação" onClick={(e) => open('inst')(e.currentTarget.getBoundingClientRect())}><SlidersHorizontal size={17} /></button>
              </div>
              <div className="picks">
                <PickBtn label="Rede" value={GRID_LABEL[input.grid]} Icon={UtilityPole} onOpen={open('grid')} />
                <PickBtn label="Telhado" value={ROOF_LABEL[input.roof]} Icon={Warehouse} onOpen={open('roof')} />
              </div>
              {input.roof === 'carport' && <p className="note num">Estrutura metálica: {input.carportPrice ? brl(input.carportPrice) : 'a informar'}</p>}
              <div className="bill">
                <label htmlFor="conta" className={`cur${input.billMode === 'reais' ? '' : ' off'}`}>R$</label>
                <BillInput value={input.billValue} label={amp ? 'Fatura que ainda resta' : 'Conta de luz'} onChange={(n) => set({ billValue: n, monthly: null, ...resetKit })} />
                {input.billMode === 'kwh' && <label htmlFor="conta" className="after">kWh</label>}
                <div className="seg">
                  <button aria-pressed={input.billMode === 'reais'} onClick={() => setUnit('reais')}>R$</button>
                  <button aria-pressed={input.billMode === 'kwh'} onClick={() => setUnit('kwh')}>kWh</button>
                </div>
              </div>
              {amp && <p className="note">Informe a fatura que o cliente ainda paga, para zerar.</p>}
              <div className="seg fg" role="group" aria-label="Folga de geração">
                {([[0, 'Sem folga'], [10, '10%'], [20, '20%']] as const).map(([m, t]) => <button key={m} aria-pressed={p.safetyMargin === m} onClick={() => set({ params: { ...p, safetyMargin: m }, ...resetKit })}>{t}</button>)}
                <button aria-pressed={customMargin} onClick={(e) => open('folga')(e.currentTarget.getBoundingClientRect())}>{customMargin ? `${p.safetyMargin}%` : 'Personalizado'}</button>
              </div>
              <div className="bill-acts">
                <button onClick={() => fileIn.current?.click()}><i><FileUp size={20} /></i>Importar fatura</button>
                <button onClick={() => photoIn.current?.click()}><i><Camera size={20} /></i>Foto da fatura</button>
                <button aria-pressed={!!input.monthly} onClick={() => setSheet('monthly')}><i><CalendarDays size={20} /></i>{input.monthly ? `Média de ${input.monthly.filter((v) => v > 0).length} meses` : 'Média de 12 meses'}</button>
              </div>
              <input ref={fileIn} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { onBill(e.target.files?.[0]); e.target.value = ''; }} />
              <input ref={photoIn} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onBill(e.target.files?.[0]); e.target.value = ''; }} />
            </section>
      </>
    ),
    scene: (
            <Scene total={r.totalModules ?? r.modules} type={input.systemType} bats={input.batteries} generation={(r.existingKwh ?? 0) + r.generationKwh} coverage={r.coverage} />
    ),
    system: (
            <section className="pnl">
              <h2 className="h">{amp ? 'Ampliação' : 'Sistema'}</h2>
              {amp && (
                <>
                  <div className="two">
                    <Labeled label="Módulos que já tem" fmt="mod" value={existing.modules} onChange={(n) => set({ existing: { ...existing, modules: Math.round(n) }, ...resetKit })} />
                    <Labeled label="Potência deles" fmt="W" value={existing.w} onChange={(n) => set({ existing: { ...existing, w: n }, ...resetKit })} />
                  </div>
                  <p className="note num" style={{ margin: '0 0 10px' }}>Hoje gera cerca de {num(r.existingKwh ?? 0)} kWh por mês. A fatura restante equivale a {num(r.consumptionKwh)} kWh.</p>
                </>
              )}
              <div className="trio">
                <button className="pick" onClick={(e) => open('brand')(e.currentTarget.getBoundingClientRect())}><small>Marca</small><b>{input.moduleBrand}</b></button>
                <TapQty big={r.modules} sub={amp ? 'módulos a mais' : 'módulos'} onStep={step} />
                <button className="pick" onClick={(e) => open('power')(e.currentTarget.getBoundingClientRect())}><small>Potência</small><b className="num">{r.panelW} W</b></button>
              </div>
              {!amp && (
                <>
                  <div className="picks mt">
                    <PickBtn label="Inversor" value={r.kit ? inverterSize(r.kit.inverter) : '—'} Icon={AudioWaveform} onOpen={open('inverter')} />
                    <PickBtn label="Marca do inversor" value={input.inverterBrand || (r.kit ? inverterBrandOf(r.kit.inverter) || '—' : '—')} onOpen={open('ibrand')} />
                  </div>
                  {p.gridLimits && (
                    <div className="lim-t">
                      <i><UtilityPole size={15} /></i>
                      <span><small>Limite da rede {GRID_LABEL[input.grid].toLowerCase()}</small><b className="num">Inversor até {FMT.kW(p.gridLimits[input.grid].inverterKw)}, {p.gridLimits[input.grid].modules} módulos</b></span>
                    </div>
                  )}
                  {input.manualModules && <button className="sec" onClick={() => set(resetKit)}>Voltar ao kit indicado para esta conta</button>}
                </>
              )}
              {input.systemType === 'bateria' && (
                <div className="mt">
                  <TapQty big={input.batteries} sub={input.batteries > 1 ? 'baterias' : 'bateria'} onStep={(d) => set({ batteries: Math.max(1, input.batteries + d) })} />
                </div>
              )}
            </section>
    ),
    payoff: (
            <section className="pnl">
              <div className="payoff">
                <small>{r.paybackMonths !== null && r.paybackMonths <= years * 12 ? 'O sistema se paga em' : 'Tempo para se pagar'}</small>
                <strong>{monthsText(r.paybackMonths)}</strong>
                {r.paybackMonths !== null && <span>Em {whenPaid(r.paybackMonths)}, {input.payment.method === 'vista' ? 'pelo valor à vista' : 'pelo total com juros'}</span>}
              </div>
              <h2 className="h proj">Projeção de {years} anos</h2>
              <div dangerouslySetInnerHTML={{ __html: projectionSvg({ payback: r.paybackMonths, save: r.monthlySavings, paid: r.totalPaid }) }} />
              <div className="leg"><span><i style={{ background: '#C99A32' }} />Economia acumulada</span><span><i style={{ background: '#1B2A49' }} />Total investido</span></div>
              <div className="pro-n">
                <div><small>Economia em {years} anos</small><b className="num">{brl(projected)}</b></div>
                <div><small>{projected >= r.totalPaid ? 'Sobra depois de pagar' : 'Ainda falta para se pagar'}</small><b className="num" style={{ color: projected >= r.totalPaid ? 'var(--green)' : 'var(--red)' }}>{brl(Math.abs(projected - r.totalPaid))}</b></div>
              </div>
            </section>
    ),
    value: (
            <section className="pnl">
              <div className="vhead">
                <small>Valor do sistema</small>
                <div className="vbtn">
                  <button aria-label="Detalhes do projeto" aria-pressed={panel === 'info'} onClick={() => setPanel(panel === 'info' ? null : 'info')}><ReceiptText size={16} /></button>
                  <button aria-label="Meus ganhos" aria-pressed={panel === 'com'} onClick={() => setPanel(panel === 'com' ? null : 'com')}><HandCoins size={16} /></button>
                  <button aria-label="Definir valor do projeto" onClick={() => { setCustom({ final: Math.round(r.finalPrice), discount: r.discountShown }); setSheet('custom'); }}><BadgeDollarSign size={16} /></button>
                  <button aria-label="Configurar proposta" onClick={() => { setTab('neg'); setSheet('config'); }}><SlidersHorizontal size={16} /></button>
                </div>
              </div>
              {panel === 'info' && (
                <div className="pop">
                  <div className="kv"><span>Valor de tabela</span><b className="num">{brl(r.tablePrice)}</b></div>
                  <div className="kv"><span>Desconto</span><b className="num">{r.discountShown ? `−${brl(r.discountShown)}` : '—'}</b></div>
                  <div className="kv"><span>Valor do sistema</span><b className="num">{brl(r.finalPrice)}</b></div>
                  {input.payment.method !== 'vista' && (
                    <>
                      <div className="kv"><span>Parcelas ({r.installments}×)</span><b className="num">{brl(r.installmentValue)}</b></div>
                      {r.downPayment > 0 && <div className="kv"><span>Entrada</span><b className="num">{brl(r.downPayment)}</b></div>}
                      <div className="kv tot"><span>Total com juros</span><b className="num">{brl(r.totalPaid)}</b></div>
                    </>
                  )}
                </div>
              )}
              {panel === 'com' && (
                <div className="pop">
                  <div className="kv"><span>Comissão ({num(p.commissionPct, Number.isInteger(p.commissionPct) ? 0 : 2)}%)</span><b className="num">{FMT.brl2(r.commission.sale)}</b></div>
                  <div className="kv"><span>Overprice ({num(p.overpriceSharePct)}%)</span><b className="num" style={{ color: 'var(--green)' }}>+{FMT.brl2(r.commission.overprice)}</b></div>
                  <div className="kv"><span>Imposto ({num(p.taxPct)}%)</span><b className="num" style={{ color: 'var(--red)' }}>−{FMT.brl2(r.commission.tax)}</b></div>
                  <div className="kv tot"><span>Líquido estimado</span><b className="num" style={{ color: 'var(--green)' }}>{FMT.brl2(r.commission.net)}</b></div>
                </div>
              )}
              <button className="big" disabled={!canToggle} onClick={() => setPr({ discountOff: !pr.discountOff })} aria-label={canToggle ? (pr.discountOff ? 'Aplicar desconto' : 'Mostrar sem desconto') : undefined}>
                {r.discountShown > 0 && <s className="num">{brl(r.tablePrice)}</s>}
                <strong className="num">{r.finalPrice > 0 ? brl(r.finalPrice) : 'R$ —'}</strong>
                {canToggle && <em className="num">{pr.discountOff ? `Toque para aplicar ${brl(pr.discount)} de desconto` : `Desconto de ${brl(r.discountShown)} aplicado`}</em>}
              </button>
              <div className="seg pays" role="group" aria-label="Forma de pagamento">
                {(Object.keys(PAY_LABEL) as PayMethod[]).map((m) => <button key={m} aria-pressed={input.payment.method === m} onClick={() => setPay({ method: m })}>{PAY_LABEL[m]}</button>)}
              </div>
              {input.payment.method !== 'vista' && (
                <div className="sc" role="group" aria-label="Parcelas">
                  {INSTALLMENT_OPTIONS.map((n) => <button key={n} aria-pressed={input.payment.installments === n} onClick={() => setPay({ installments: n })}>{n}×<small className="num">{brl(installmentFor(input, r.finalPrice, n))}</small></button>)}
                </div>
              )}
              {input.payment.method === 'entrada' && <div className="two mt"><Labeled label="Entrada" fmt="brl" value={input.payment.downPayment} onChange={(n) => setPay({ downPayment: n })} /></div>}
              {cmp && (
                <div className="tri">
                  <div className="hoje"><small>Hoje</small><b className="num">{brl(r.currentBill)}</b></div>
                  <div className="solar"><small>{cmp.label}</small><b className="num">{brl(cmp.value)}</b></div>
                  <div className="eco"><small>Economia</small><b className="num">{brl(cmp.savings)}</b></div>
                </div>
              )}
            </section>
    ),
  };

  return (
    <div className="orc">
      <TopBar />
      <main className="orc-page">
        <div className="orc-head">
          <h1>{editing ? `Orçamento nº ${editing.number}` : 'Novo orçamento'}</h1>
          {(editing || input.billValue > 0) && <button className="link-btn" disabled={busy} onClick={startAnother}>Começar outro</button>}
        </div>

        <div className="orc-grid">
          <div className="col">
            {blocks.client}
            {wide && blocks.system}
          </div>
          <div className="col">
            {blocks.scene}
            {wide ? blocks.value : blocks.system}
          </div>
          <div className="col">
            {blocks.payoff}
            {!wide && blocks.value}
          </div>
        </div>
      </main>

      <div className="go-wrap no-print">
        <button className="go-s" aria-label="Salvar orçamento" disabled={!r.ready || busy} onClick={() => persist(false)}><Save size={19} /></button>
        <button className="go" disabled={!r.ready || busy} onClick={() => persist(true)}><ScrollText size={18} />Gerar proposta</button>
      </div>

      {pop && (
        <Popup name={pop.name} anchor={pop.anchor} edit={pop.edit} onClose={closePop} onEdit={pop.name === 'carport' || pop.name === 'inst' ? null : () => setPop({ ...pop, edit: !pop.edit })}>
          {popBody(pop.name, pop.edit)}
        </Popup>
      )}

      {sheet === 'custom' && (
        <Modal title="Definir valor do projeto" onClose={() => setSheet(null)}>
          <div className="stackf">
            <Labeled label="Valor do projeto" fmt="brl" value={custom.final} onChange={(n) => setCustom({ ...custom, final: n })} />
            <Labeled label="Desconto mostrado" fmt="brl" value={custom.discount} onChange={(n) => setCustom({ ...custom, discount: n })} />
          </div>
          <div className="kv mt"><span>Valor cheio</span><b className="num">{brl(custom.final + custom.discount)}</b></div>
          <div className="btn2">
            <button className="sec" onClick={() => { setPr({ mode: 'tabela', closedPrice: null, shownDiscount: 0, discountOff: false }); setSheet(null); }}>Limpar</button>
            <button className="ok" onClick={() => { setPr({ mode: 'definido', closedPrice: custom.final, shownDiscount: custom.discount, discountOff: false }); setSheet(null); }}>Confirmar</button>
          </div>
        </Modal>
      )}

      {sheet === 'config' && (
        <Modal title="Configurar proposta" onClose={() => setSheet(null)}>
          <div className="seg">
            <button aria-pressed={tab === 'neg'} onClick={() => setTab('neg')}>Negociação</button>
            <button aria-pressed={tab === 'fix'} onClick={() => setTab('fix')}>Taxas fixas</button>
          </div>
          {tab === 'neg' ? (
            <>
              <div className="prev">
                <div className="prev-h">
                  <small>Valor final do projeto</small>
                  <div className="seg mini">
                    <button aria-pressed={!fixedMode && preview === 'auto'} onClick={() => { setPreview('auto'); setPr({ mode: 'tabela', closedPrice: null, discountOff: false }); }}>Auto</button>
                    <button aria-pressed={!fixedMode && preview === 'manual'} onClick={() => { setPreview('manual'); setPr({ mode: 'tabela', closedPrice: null, discountOff: false }); }}>Manual</button>
                    <button aria-pressed={fixedMode} onClick={() => setPr({ mode: 'fixo', closedPrice: pr.closedPrice || Math.round(r.finalPrice), discountOff: false })}>Fixo</button>
                  </div>
                </div>
                {fixedMode ? <UF className="prev-i" label="Valor fixo" fmt="brl" value={pr.closedPrice ?? 0} onChange={(n) => setPr({ mode: 'fixo', closedPrice: n || null })} />
                  : preview === 'auto' ? <UF className="prev-i" label="Valor final" fmt="brl" value={Math.round(r.finalPrice)} onChange={(n) => setPr({ discount: Math.max(0, r.basePrice + pr.anchoring - n), discountOff: false })} />
                    : <b className="prev-i num" style={{ display: 'block' }}>{brl(r.finalPrice)}</b>}
                <small className="prev-f">{fixedMode ? 'Valor fixo, sem desconto nem ancoragem' : preview === 'auto' ? 'O desconto se ajusta sozinho' : 'Calculado pela ancoragem e pelo desconto'}</small>
              </div>
              {!fixedMode && (
                <>
                  <div className="hrow mt"><span className="lbl">Ajuste fino</span><button className="sec-s" onClick={() => setPr({ anchoring: 0, discount: 0 })}>Zerar</button></div>
                  <div className="two">
                    <Labeled label="Ancoragem" fmt="brl" value={pr.anchoring} onChange={(n) => setPr({ anchoring: n })} />
                    <Labeled label="Desconto" fmt="brl" value={pr.discount} onChange={(n) => setPr({ discount: n })} />
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="two mt">
              <Labeled label="Spread" fmt="pct" value={p.spread} onChange={(n) => setP({ spread: n })} />
              <Labeled label="IOF" fmt="pct" value={p.iof} onChange={(n) => setP({ iof: n })} />
              <Labeled label="Tarifa" fmt="brl2" value={p.tariff} onChange={(n) => setP({ tariff: n })} />
              <Labeled label="Juros ao mês" fmt="pct" value={input.payment.interestRate} onChange={(n) => setPay({ interestRate: n })} />
              <Labeled label="Comissão" fmt="pct" value={p.commissionPct} onChange={(n) => setP({ commissionPct: n })} />
              <Labeled label="Overprice" fmt="pct" value={p.overpriceSharePct} onChange={(n) => setP({ overpriceSharePct: n })} />
              <Labeled label="Imposto" fmt="pct" value={p.taxPct} onChange={(n) => setP({ taxPct: n })} />
            </div>
          )}
          <button className="ok" onClick={() => setSheet(null)}>Aplicar</button>
        </Modal>
      )}

      <ClientPicker open={sheet === 'client'} onClose={() => { setAfterPick(null); billFile.current = null; setSheet(null); }} onPick={onPickClient} />
      <MonthlySheet key={`${draft.proposalId}-${draft.leadId}-${input.monthly ? 'm' : 'n'}`} open={sheet === 'monthly'} onClose={() => setSheet(null)} input={input} set={set} />
    </div>
  );
}
