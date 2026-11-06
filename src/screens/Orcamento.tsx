import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Eye, EyeOff, FileText, Lock, Minus, Plus, Save } from 'lucide-react';
import { TopBar } from '../ui/chrome';
import { NumberField, useToast } from '../ui/kit';
import { useStore } from '../data/store';
import { calculate } from '../core/calc';
import { GRID_LABEL, INSTALLMENT_OPTIONS, PAY_LABEL, ROOF_LABEL, SYSTEM_LABEL } from '../core/defaults';
import { brl, initials, monthsText, num } from '../core/format';
import type { Lead, PayMethod, QuoteInput, SystemType } from '../core/types';
import { navigate } from '../router';
import { ClientPicker, InstallSheet, InverterSheet, ModuleSheet, MonthlySheet, PriceSheet } from './orcamento-sheets';

type SheetName = 'client' | 'monthly' | 'module' | 'inverter' | 'install' | 'price' | null;

export function Gauge({ consumption, generation, dark = false }: { consumption: number; generation: number; dark?: boolean }) {
  const max = Math.max(consumption, generation, 1);
  const fill = generation / max;
  const tick = consumption / max;
  const pt = (f: number, r: number) => [150 - r * Math.cos(Math.PI * f), 150 - r * Math.sin(Math.PI * f)];
  const [ex, ey] = pt(fill, 120);
  const [ix, iy] = pt(tick, 104);
  const [ox, oy] = pt(tick, 136);
  const track = dark ? '#33466F' : '#DDE1E9';
  return (
    <svg width="350" height="172" viewBox="0 0 300 160" aria-hidden="true">
      <path d="M 30 150 A 120 120 0 0 1 270 150" fill="none" stroke={track} strokeWidth="14" strokeLinecap="round" />
      {fill > 0.005 && <path d={`M 30 150 A 120 120 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke="#C6A15B" strokeWidth="14" strokeLinecap="round" />}
      {consumption > 0 && <line x1={ix} y1={iy} x2={ox} y2={oy} stroke={dark ? '#FFFFFF' : '#14213F'} strokeWidth="3" strokeLinecap="round" />}
      {fill > 0.005 && <circle cx={ex} cy={ey} r="11" fill="#C6A15B" stroke={dark ? '#14213F' : '#F2F3F6'} strokeWidth="4" />}
    </svg>
  );
}

export default function Orcamento() {
  const { draft, setDraft, newDraft, kits, leads, proposals, saveDraftAsProposal } = useStore();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [afterPick, setAfterPick] = useState<null | 'save' | 'proposal'>(null);
  const [showCommission, setShowCommission] = useState(false);
  const [busy, setBusy] = useState(false);

  const input = draft.input;
  const r = useMemo(() => calculate(input, kits), [input, kits]);
  const lead = leads.find((l) => l.id === draft.leadId) ?? null;
  const editing = draft.proposalId ? proposals.find((p) => p.id === draft.proposalId) : null;
  const leadProposals = lead ? proposals.filter((p) => p.leadId === lead.id).length : 0;

  const set = (patch: Partial<QuoteInput>) => setDraft((d) => ({ ...d, input: { ...d.input, ...patch } }));
  const close = () => setSheet(null);

  const setBill = (n: number) => set({ billValue: n, monthly: null, manualModules: null, manualInverter: null });
  const setSystem = (t: SystemType) => set({ systemType: t, manualModules: null, manualInverter: null, inverterBrand: t === 'hibrido' || t === 'bateria' ? 'SAJ' : input.inverterBrand });
  const setPay = (patch: Partial<QuoteInput['payment']>) => set({ payment: { ...input.payment, ...patch } });

  const moduleStep = (delta: number) => {
    const current = input.manualModules ?? r.modules;
    const next = Math.max(1, current + delta);
    set({ manualModules: next, manualInverter: null });
  };

  async function persist(goToProposal: boolean) {
    if (!draft.leadId) {
      setAfterPick(goToProposal ? 'proposal' : 'save');
      setSheet('client');
      return;
    }
    setBusy(true);
    const p = await saveDraftAsProposal();
    setBusy(false);
    if (!p) return;
    if (goToProposal) navigate(`/proposta/${p.id}`);
    else toast(editing ? 'Orçamento atualizado' : 'Orçamento salvo');
  }

  async function onPickClient(l: Lead) {
    setDraft((d) => ({ ...d, leadId: l.id, proposalId: d.leadId === l.id ? d.proposalId : null }));
    const intent = afterPick;
    setAfterPick(null);
    close();
    if (intent) {
      setTimeout(async () => {
        setBusy(true);
        const p = await saveDraftAsProposal();
        setBusy(false);
        if (!p) return;
        if (intent === 'proposal') navigate(`/proposta/${p.id}`);
        else toast('Orçamento salvo');
      }, 50);
    }
  }

  const consumption = r.consumptionKwh;
  const priceSub =
    input.payment.method === 'vista' || !r.installmentValue
      ? 'à vista'
      : input.payment.method === 'entrada'
        ? `${brl(r.downPayment)} + ${r.installments}× de ${brl(r.installmentValue)}`
        : `ou ${r.installments}× de ${brl(r.installmentValue)}`;

  return (
    <>
      <TopBar />
      <main className="page with-bar">
        <div className="page-head" style={{ paddingTop: 6 }}>
          <h1>{editing ? `Orçamento nº ${editing.number}` : 'Novo orçamento'}</h1>
          {(editing || input.billValue > 0) && (
            <button className="link-btn" onClick={() => newDraft(null)}>Começar outro</button>
          )}
        </div>

        <button className="client-chip" onClick={() => setSheet('client')}>
          {lead ? (
            <>
              <span className="avatar" aria-hidden="true">{initials(lead.name)}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{lead.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>{leadProposals === 0 ? 'Nenhum orçamento salvo' : leadProposals === 1 ? '1 orçamento salvo' : `${leadProposals} orçamentos salvos`}</span>
              </span>
              <span className="gold-text" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 500 }}>Trocar</span>
            </>
          ) : (
            <>
              <span className="avatar" aria-hidden="true"><Plus size={18} /></span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>Escolher cliente</span>
              <ChevronRight size={18} className="chev" style={{ marginLeft: 'auto' }} />
            </>
          )}
        </button>

        <section className="card bill-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label htmlFor="conta" className="muted" style={{ fontSize: 13 }}>{input.monthly ? 'Consumo médio' : 'Conta de luz média'}</label>
            <div className="seg" role="group" aria-label="Unidade">
              <button aria-pressed={input.billMode === 'reais'} onClick={() => set({ billMode: 'reais', billValue: input.billMode === 'reais' ? input.billValue : Math.round(input.billValue * input.params.tariff), monthly: null })}>R$</button>
              <button aria-pressed={input.billMode === 'kwh'} onClick={() => set({ billMode: 'kwh', billValue: input.billMode === 'kwh' ? input.billValue : Math.round(consumption) })}>kWh</button>
            </div>
          </div>
          <div className="bill-input">
            {input.billMode === 'reais' && <span className="cur">R$</span>}
            <NumberField id="conta" className="" value={input.billValue} onChange={setBill} decimals={2} placeholder="0" />
            {input.billMode === 'kwh' && <span className="cur">kWh</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {consumption <= 0
                ? 'Digite a conta ou o consumo'
                : input.monthly
                  ? `Média de ${input.monthly.filter((v) => v > 0).length} meses, cerca de ${brl(r.currentBill)}`
                  : input.billMode === 'reais'
                    ? `Equivale a ${num(consumption)} kWh por mês`
                    : `Conta de cerca de ${brl(r.currentBill)}`}
            </span>
            <button className="link-btn" style={{ fontSize: 12, whiteSpace: 'nowrap' }} onClick={() => setSheet('monthly')}>Média de 12 meses</button>
          </div>
        </section>

        {consumption > 0 && r.generationKwh > 0 ? (
          <section className="arc" aria-label={`Geração estimada de ${num(r.generationKwh)} kWh por mês, cobre ${num(r.coverage * 100)}% do consumo`}>
            <Gauge consumption={consumption} generation={r.generationKwh} />
            <div className="center">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span className="big num">{num(r.generationKwh)}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>kWh/mês</span>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>geração estimada</span>
            </div>
            <div className="foot">
              <span><span className="tick" />Consumo {num(consumption)} kWh</span>
              <span className="pill gold" style={{ fontWeight: 600, borderRadius: 999 }}>Cobre {num(r.coverage * 100)}%</span>
            </div>
          </section>
        ) : (
          <div style={{ height: 14 }} />
        )}

        <div className="tiles" role="group" aria-label="Tipo de sistema" style={{ marginTop: 14 }}>
          {(Object.keys(SYSTEM_LABEL) as SystemType[]).map((t) => (
            <button key={t} aria-pressed={input.systemType === t} onClick={() => setSystem(t)}>{SYSTEM_LABEL[t]}</button>
          ))}
        </div>

        <section className="card" style={{ marginTop: 12, padding: '0 16px' }}>
          <div className="row">
            <button className="grow" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left' }} onClick={() => setSheet('module')}>
              <span className="s">Módulos {input.manualModules ? '(quantidade manual)' : ''}</span>
              <span className="t">{r.modules > 0 ? `${r.modules} × ${r.panelW} W ${input.moduleBrand}` : `${input.panelW} W ${input.moduleBrand}`}</span>
              {r.kWp > 0 && <span className="s">{num(r.kWp, 2)} kWp</span>}
            </button>
            <div className="stepper">
              <button className="icon-btn sm" aria-label="Menos um módulo" disabled={r.modules <= 1} onClick={() => moduleStep(-1)}><Minus size={16} /></button>
              <span className="val num">{r.modules || '–'}</span>
              <button className="icon-btn sm" aria-label="Mais um módulo" disabled={r.modules < 1} onClick={() => moduleStep(1)}><Plus size={16} /></button>
            </div>
          </div>
          {input.manualModules && (
            <div style={{ padding: '0 0 10px' }}>
              <button className="link-btn" onClick={() => set({ manualModules: null, manualInverter: null })}>Voltar para a quantidade automática</button>
            </div>
          )}
          {input.systemType !== 'ampliacao' && (
            <button className="row" onClick={() => setSheet('inverter')}>
              <span className="grow">
                <span className="s">Inversor</span>
                <span className="t">
                  {r.inverterLabel || (consumption > 0 ? 'Sem kit na tabela' : 'Automático')}{' '}
                  {r.kit && <span className="pill tag" style={{ marginLeft: 4 }}>{input.manualInverter ? 'escolhido' : 'pela tabela'}</span>}
                </span>
              </span>
              <ChevronRight size={18} className="chev" />
            </button>
          )}
          {input.systemType === 'bateria' && (
            <div className="row">
              <span className="grow"><span className="s">Baterias</span><span className="t">{input.batteries} {input.batteries === 1 ? 'bateria' : 'baterias'}</span></span>
              <div className="stepper">
                <button className="icon-btn sm" aria-label="Menos uma bateria" disabled={input.batteries <= 1} onClick={() => set({ batteries: Math.max(1, input.batteries - 1) })}><Minus size={16} /></button>
                <span className="val num">{input.batteries}</span>
                <button className="icon-btn sm" aria-label="Mais uma bateria" onClick={() => set({ batteries: input.batteries + 1 })}><Plus size={16} /></button>
              </div>
            </div>
          )}
          <button className="row" onClick={() => setSheet('install')}>
            <span className="grow">
              <span className="s">Telhado e rede</span>
              <span className="t">{ROOF_LABEL[input.roof]}, {GRID_LABEL[input.grid].toLowerCase()}</span>
            </span>
            <ChevronRight size={18} className="chev" />
          </button>
        </section>

        {r.warnings.map((w) => (
          <div className="notice mt-12" key={w} role="status"><AlertTriangle size={16} />{w}</div>
        ))}

        <h2 className="section-title">Pagamento</h2>
        <section className="card pad">
          <div className="seg" role="group" aria-label="Forma de pagamento">
            {(Object.keys(PAY_LABEL) as PayMethod[]).map((m) => (
              <button key={m} aria-pressed={input.payment.method === m} onClick={() => setPay({ method: m })}>{PAY_LABEL[m]}</button>
            ))}
          </div>
          {input.payment.method !== 'vista' && (
            <>
              <p className="muted" style={{ fontSize: 13, margin: '14px 0 8px' }}>Parcelas</p>
              <div className="chips" style={{ margin: '0 -16px', padding: '0 16px' }}>
                {INSTALLMENT_OPTIONS.map((n) => (
                  <button key={n} className="chip" aria-pressed={input.payment.installments === n} onClick={() => setPay({ installments: n })}>{n}×</button>
                ))}
              </div>
              <div className="grid-2 mt-12">
                <div className="field">
                  <label htmlFor="juros">Juros ao mês</label>
                  <NumberField id="juros" value={input.payment.interestRate} onChange={(n) => setPay({ interestRate: n })} suffix="%" />
                </div>
                {input.payment.method === 'entrada' && (
                  <div className="field">
                    <label htmlFor="entrada">Entrada</label>
                    <NumberField id="entrada" value={input.payment.downPayment} onChange={(n) => setPay({ downPayment: n })} prefix="R$" />
                  </div>
                )}
              </div>
              {r.installmentValue > 0 && (
                <p style={{ marginTop: 12, fontSize: 15 }}>
                  <b className="num">{r.installments}× de {brl(r.installmentValue)}</b>
                  {r.monthlySavings > 0 && r.installmentValue <= r.currentBill && <span className="muted" style={{ fontSize: 13 }}>, menor que a conta de hoje</span>}
                </p>
              )}
            </>
          )}
        </section>

        <h2 className="section-title">Valor</h2>
        <button className="card pad" style={{ width: '100%', border: 0, textAlign: 'left', display: 'block' }} onClick={() => setSheet('price')}>
          <div className="kv"><span className="k">Valor de tabela</span><span className="v num">{r.tablePrice > 0 ? brl(r.tablePrice) : '—'}</span></div>
          <div className="kv"><span className="k">Desconto</span><span className="v num">{r.discountShown > 0 ? `−${brl(r.discountShown)}` : '—'}</span></div>
          <div className="kv total"><span className="k">{input.pricing.mode === 'fechado' ? 'Valor fechado' : 'Valor final'}</span><span className="v num">{r.finalPrice > 0 ? brl(r.finalPrice) : '—'}</span></div>
          <span className="link-btn" style={{ display: 'inline-block', marginTop: 6 }}>Ajustar valor</span>
        </button>

        {r.ready && (
          <>
            <h2 className="section-title">Resultado para o cliente</h2>
            <section className="card pad">
              <div className="kv"><span className="k">Conta hoje</span><span className="v num">{brl(r.currentBill)}</span></div>
              <div className="kv"><span className="k">Conta com energia solar</span><span className="v num">{brl(r.newBill)}</span></div>
              <div className="kv"><span className="k">Economia por mês</span><span className="v num" style={{ fontWeight: 600 }}>{brl(r.monthlySavings)}</span></div>
              <div className="kv"><span className="k">O sistema se paga em</span><span className="v">{monthsText(r.paybackMonths)}</span></div>
              <div className="kv"><span className="k">Em 25 anos</span><span className="v num">{brl(r.savings25y)}</span></div>
            </section>

            <section className="private mt-12">
              <span className="lock"><Lock size={17} /></span>
              <div style={{ flex: 1 }}>
                <div className="muted" style={{ fontSize: 12 }}>Só você vê</div>
                {showCommission ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Sua comissão {brl(r.commission.gross)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{brl(r.commission.net)} líquido, depois de {num(input.params.taxPct)}% de imposto</div>
                  </>
                ) : (
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Comissão oculta</div>
                )}
              </div>
              <button className="icon-btn sm" aria-label={showCommission ? 'Esconder comissão' : 'Mostrar comissão'} onClick={() => setShowCommission((v) => !v)}>
                {showCommission ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </section>
          </>
        )}
      </main>

      <div className="pricebar no-print">
        <div style={{ minWidth: 0 }}>
          <div className="price num">{r.finalPrice > 0 ? brl(r.finalPrice) : 'R$ —'}</div>
          <div className="sub">{r.finalPrice > 0 ? priceSub : 'Preencha a conta de luz'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" aria-label="Salvar orçamento" disabled={!r.ready || busy} onClick={() => persist(false)}><Save size={19} /></button>
          <button className="btn btn-primary" style={{ height: 52, padding: '0 16px', borderRadius: 16 }} disabled={!r.ready || busy} onClick={() => persist(true)}>
            <FileText size={18} />
            Gerar proposta
          </button>
        </div>
      </div>

      <ClientPicker open={sheet === 'client'} onClose={() => { setAfterPick(null); close(); }} onPick={onPickClient} />
      <MonthlySheet key={`${draft.proposalId}-${draft.leadId}-${input.monthly ? 'm' : 'n'}`} open={sheet === 'monthly'} onClose={close} input={input} set={set} />
      <ModuleSheet open={sheet === 'module'} onClose={close} input={input} set={set} />
      <InverterSheet open={sheet === 'inverter'} onClose={close} input={input} result={r} set={set} />
      <InstallSheet open={sheet === 'install'} onClose={close} input={input} set={set} />
      <PriceSheet open={sheet === 'price'} onClose={close} input={input} result={r} set={set} />
    </>
  );
}
