import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, LocateFixed, MapPin, MessageCircle, MoreHorizontal, Navigation, Phone, Plus, Share2, Sun, Trash2 } from 'lucide-react';
import { Field, Sheet, useConfirm, useToast } from '../ui/kit';
import { nextTaskOf, useStore } from '../data/store';
import { isSoldProposal, proposalsOf, saleCommission } from '../core/sale';
import { mapsUrl, whatsappUrl } from '../core/links';
import { Attachments } from './attachments';
import { SaleSheet } from './sale-sheet';
import { LEAD_STATUS_LABEL, PAY_LABEL, PROPOSAL_STATUS_LABEL, SYSTEM_LABEL, TASK_LABEL } from '../core/defaults';
import { brl, dateShort, initials, phoneDigits, phoneMask, relativeDay, time, uid } from '../core/format';
import type { Lead, LeadStatus, ProposalStatus } from '../core/types';
import { goBack, navigate } from '../router';
import { TaskSheet } from './task-sheet';

type SheetName = 'more' | 'edit' | 'sale' | 'task' | 'proposal' | null;

export default function Ficha({ id }: { id: string }) {
  const { leads, proposals, tasks, updateLead, deleteLead, saveTask, newDraft, openProposalInDraft, setProposalStatus, deleteProposal, closeSale, undoSale } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const lead = leads.find((l) => l.id === id);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [activeProposalId, setActiveProposal] = useState<string | null>(null);
  const [record, setRecord] = useState('');
  const [locating, setLocating] = useState(false);

  const props = useMemo(() => proposalsOf(proposals, id), [proposals, id]);
  const activeProposal = props.find((p) => p.id === activeProposalId) ?? null;
  const next = useMemo(() => nextTaskOf(tasks, id), [tasks, id]);
  const history = useMemo(() => tasks.filter((t) => t.leadId === id && t.done).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3), [tasks, id]);

  if (!lead) {
    return (
      <main className="page full">
        <div className="subbar" style={{ padding: '14px 0 0' }}>
          <button className="icon-btn" aria-label="Voltar para clientes" onClick={() => goBack('/clientes')}><ChevronLeft size={20} /></button>
        </div>
        <div className="card empty mt-16"><strong>Cliente não encontrado</strong>Ele pode ter sido excluído.</div>
      </main>
    );
  }

  const phone = phoneDigits(lead.phone);
  const maps = mapsUrl(lead);

  async function setStatus(s: LeadStatus) {
    if (!lead || s === lead.status) return;
    if (s === 'vendido') {
      if (props.length === 0) {
        toast('Salve um orçamento antes de fechar a venda');
        return;
      }
      setSheet('sale');
      return;
    }
    if (lead.status === 'vendido') {
      const ok = await confirm({ title: 'Desfazer a venda?', message: 'A comissão e a data da venda serão apagadas.', confirm: 'Desfazer', danger: true });
      if (!ok) return;
      await undoSale(lead.id, s);
      return;
    }
    await updateLead(lead.id, { status: s });
  }

  async function addRecord() {
    if (!lead || !record.trim()) return;
    await updateLead(lead.id, { records: [{ id: uid(), text: record.trim(), date: new Date().toISOString() }, ...lead.records] });
    setRecord('');
  }

  function locate() {
    if (!lead) return;
    if (!navigator.geolocation) {
      toast('Este aparelho não informa a localização');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = lead.address;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`);
          const data = await res.json();
          const a = data?.address ?? {};
          const parts = [[a.road, a.house_number].filter(Boolean).join(', '), a.suburb || a.neighbourhood, a.city || a.town || a.village || a.municipality].filter(Boolean);
          if (parts.length) address = parts.join(', ');
        } catch {
          /* sem internet: guarda só as coordenadas */
        }
        await updateLead(lead.id, { lat: latitude, lng: longitude, address });
        setLocating(false);
        toast('Localização salva');
      },
      () => {
        setLocating(false);
        toast('Não foi possível pegar a localização. Confira a permissão do GPS.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function share() {
    if (!lead) return;
    const lines = [`*${lead.name}*`];
    if (lead.phone) lines.push(`Telefone: ${lead.phone}`);
    if (lead.address) lines.push(`Endereço: ${lead.address}`);
    if (maps) lines.push(`Mapa: ${maps}`);
    if (props.length) {
      lines.push('', '*Orçamentos*');
      for (const p of props) lines.push(`nº ${p.number}: ${brl(p.result.finalPrice)}, ${p.result.modules} × ${p.result.panelW} W, ${PAY_LABEL[p.input.payment.method].toLowerCase()} (${PROPOSAL_STATUS_LABEL[p.status].toLowerCase()})`);
    }
    if (lead.records.length) {
      lines.push('', '*Registros*');
      for (const r of lead.records.slice(0, 5)) lines.push(`${dateShort(r.date)}: ${r.text}`);
    }
    const text = lines.join('\n');
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast('Ficha copiada');
    }
  }

  const statusOrder: LeadStatus[] = ['novo', 'negociando', 'vendido', 'perdido'];
  const commission = lead.status === 'vendido' ? saleCommission(lead, proposals) : null;
  const taskForSheet = editingTask ? tasks.find((t) => t.id === editingTask) ?? null : null;

  return (
    <>
      <div className="subbar">
        <button className="icon-btn" aria-label="Voltar para clientes" onClick={() => goBack('/clientes')}><ChevronLeft size={20} /></button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" aria-label="Compartilhar ficha" onClick={share}><Share2 size={19} /></button>
          <button className="icon-btn" aria-label="Mais opções" onClick={() => setSheet('more')}><MoreHorizontal size={19} /></button>
        </div>
      </div>

      <main className="page" style={{ paddingTop: 14 }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 14, border: 0, background: 'transparent', padding: 0, textAlign: 'left', width: '100%' }} onClick={() => setSheet('edit')}>
          <span className="avatar lg" aria-hidden="true">{initials(lead.name)}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 23, fontWeight: 600, letterSpacing: '-0.02em' }}>{lead.name}</span>
            <span className="muted" style={{ fontSize: 13 }}>{lead.phone || 'Adicionar telefone'}</span>
          </span>
        </button>

        <div className="seg white tall status mt-16" role="radiogroup" aria-label="Status do cliente">
          {statusOrder.map((s) => (
            <button key={s} role="radio" aria-checked={lead.status === s} onClick={() => setStatus(s)}>{LEAD_STATUS_LABEL[s]}</button>
          ))}
        </div>

        {commission && (
          <section className="card pad mt-12" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="muted" style={{ fontSize: 12 }}>Vendido em {lead.soldAt ? new Date(lead.soldAt).toLocaleDateString('pt-BR') : '—'}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Comissão {brl(commission.value)}{commission.manual ? ' (manual)' : ''}</div>
            </div>
            <button className={`btn btn-sm ${commission.paid ? 'btn-gold' : 'btn-secondary'}`} aria-pressed={commission.paid} onClick={() => updateLead(lead.id, { commission: { ...commission, paid: !commission.paid } })}>
              {commission.paid ? 'Recebida' : 'A receber'}
            </button>
          </section>
        )}

        <div className="quick mt-12">
          {phone ? <a href={whatsappUrl(phone)} target="_blank" rel="noreferrer"><MessageCircle size={20} />WhatsApp</a> : <button onClick={() => setSheet('edit')}><MessageCircle size={20} />WhatsApp</button>}
          {phone ? <a href={`tel:${phone}`}><Phone size={20} />Ligar</a> : <button onClick={() => setSheet('edit')}><Phone size={20} />Ligar</button>}
          {maps ? <a href={maps} target="_blank" rel="noreferrer"><Navigation size={20} />Rota</a> : <button onClick={() => setSheet('edit')}><Navigation size={20} />Rota</button>}
          <button className="main" onClick={() => { newDraft(lead.id); navigate('/orcamento', true); }}><Sun size={20} />Orçamento</button>
        </div>

        {next ? (
          <section className="next-step mt-12">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gold-ink-2)' }}>Próximo passo</span>
              {next.reminderMin > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gold-ink-2)' }}><Bell size={13} />Lembrete {next.reminderMin >= 1440 ? '1 dia' : next.reminderMin >= 60 ? `${next.reminderMin / 60} h` : `${next.reminderMin} min`} antes</span>}
            </div>
            <div style={{ marginTop: 4, fontSize: 17, fontWeight: 600 }}>{relativeDay(new Date(next.date))} às {time(new Date(next.date))}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{TASK_LABEL[next.type]}{next.notes ? `: ${next.notes}` : ''}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => saveTask({ ...next, done: true, doneAt: new Date().toISOString() })}>Concluir</button>
              <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--ink)', fontWeight: 500 }} onClick={() => { setEditingTask(next.id); setSheet('task'); }}>Reagendar</button>
            </div>
          </section>
        ) : (
          <section className="card pad mt-12" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, fontSize: 14 }} className="muted">Nenhum próximo passo agendado</span>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditingTask(null); setSheet('task'); }}><Plus size={16} />Agendar</button>
          </section>
        )}

        <section className="card mt-12" style={{ padding: '0 16px' }}>
          <div className="row">
            <MapPin size={18} className="chev" />
            <button className="grow" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left' }} onClick={() => setSheet('edit')}>
              <span className="t" style={{ fontSize: 14 }}>{lead.address || 'Adicionar endereço'}</span>
            </button>
            <button className="link-btn" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={locate} disabled={locating}>
              <LocateFixed size={14} />{locating ? 'Buscando…' : 'Usar GPS'}
            </button>
          </div>
        </section>

        <h2 className="section-title">Orçamentos</h2>
        {props.length > 0 ? (
          <ul className="list">
            {props.map((p) => (
              <li key={p.id}>
                <button className="row" onClick={() => { setActiveProposal(p.id); setSheet('proposal'); }}>
                  <span className="grow">
                    <span className="t num" style={{ fontSize: 16, fontWeight: 600 }}>{brl(p.result.finalPrice)}</span>
                    <span className="s">
                      nº {p.number}, {p.input.systemType !== 'ongrid' ? `${SYSTEM_LABEL[p.input.systemType]}, ` : ''}{p.result.modules} × {p.result.panelW} W, {p.input.payment.method === 'vista' ? 'à vista' : `${p.result.installments}×`}, {dateShort(p.updatedAt)}
                    </span>
                  </span>
                  <span className={`pill sm ${p.status === 'enviado' || p.status === 'aprovado' ? 'navy' : ''}`}>{PROPOSAL_STATUS_LABEL[p.status]}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card empty">Nenhum orçamento ainda. Toque em Orçamento para montar o primeiro.</div>
        )}

        <h2 className="section-title">Registros</h2>
        <section className="card pad">
          <label htmlFor="novo-registro" className="sr-only">Novo registro</label>
          <textarea id="novo-registro" className="input" placeholder="Anote o que foi conversado" value={record} onChange={(e) => setRecord(e.target.value)} style={{ minHeight: 64 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={!record.trim()} onClick={addRecord}>Adicionar</button>
          </div>
          {lead.records.map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid var(--rule)', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, fontWeight: 600, width: 38, flexShrink: 0, paddingTop: 1 }}>{dateShort(r.date)}</span>
              <span style={{ flex: 1, fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{r.text}</span>
              <button
                className="icon-btn plain sm"
                aria-label="Apagar registro"
                onClick={async () => {
                  if (await confirm({ title: 'Apagar este registro?', confirm: 'Apagar', danger: true })) {
                    await updateLead(lead.id, { records: lead.records.filter((x) => x.id !== r.id) });
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {history.map((t) => (
            <div key={t.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid var(--rule)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, width: 38, flexShrink: 0 }}>{dateShort(t.date)}</span>
              <span className="muted" style={{ flex: 1, fontSize: 14 }}>{TASK_LABEL[t.type]} concluído{t.notes ? `: ${t.notes}` : ''}</span>
            </div>
          ))}
        </section>

        <h2 className="section-title">Anexos</h2>
        <Attachments lead={lead} />
      </main>

      <Sheet open={sheet === 'more'} onClose={() => setSheet(null)} title="Opções">
        <ul className="list">
          <li><button className="row" onClick={() => setSheet('edit')}><span className="grow"><span className="t">Editar dados</span></span><ChevronRight size={18} className="chev" /></button></li>
          <li>
            <button
              className="row"
              onClick={async () => {
                const ok = await confirm({ title: `Excluir ${lead.name}?`, message: 'Orçamentos, compromissos e anexos deste cliente também serão apagados.', confirm: 'Excluir', danger: true });
                if (!ok) return;
                setSheet(null);
                await deleteLead(lead.id);
                toast('Cliente excluído');
                goBack('/clientes');
              }}
            >
              <span className="grow"><span className="t danger-text">Excluir cliente</span></span>
            </button>
          </li>
        </ul>
      </Sheet>

      <EditSheet open={sheet === 'edit'} onClose={() => setSheet(null)} lead={lead} />

      <SaleSheet
        open={sheet === 'sale'}
        onClose={() => setSheet(null)}
        proposals={props}
        onConfirm={async (pid, value, manual) => {
          await closeSale(lead.id, pid, { value, manual });
          setSheet(null);
          toast('Venda registrada');
        }}
      />

      <TaskSheet open={sheet === 'task'} onClose={() => { setSheet(null); setEditingTask(null); }} task={taskForSheet} leadId={lead.id} />

      <Sheet open={sheet === 'proposal' && !!activeProposal} onClose={() => { setSheet(null); setActiveProposal(null); }} title={activeProposal ? `Orçamento nº ${activeProposal.number}` : 'Orçamento'}>
        {activeProposal && (
          <>
            <div className="card pad">
              <div className="kv"><span className="k">Valor</span><span className="v num">{brl(activeProposal.result.finalPrice)}</span></div>
              <div className="kv"><span className="k">Sistema</span><span className="v">{activeProposal.result.modules} × {activeProposal.result.panelW} W, {activeProposal.result.inverterLabel}</span></div>
              <div className="kv"><span className="k">Pagamento</span><span className="v">{PAY_LABEL[activeProposal.input.payment.method]}{activeProposal.result.installmentValue ? `, ${activeProposal.result.installments}× ${brl(activeProposal.result.installmentValue)}` : ''}</span></div>
            </div>
            {activeProposal.status !== 'aprovado' && (
              <>
                <p className="section-title">Situação</p>
                <div className="seg white" role="radiogroup" aria-label="Situação do orçamento">
                  {(['rascunho', 'enviado', 'recusado'] as ProposalStatus[]).map((s) => (
                    <button key={s} role="radio" aria-checked={activeProposal.status === s} onClick={() => setProposalStatus(activeProposal.id, s)}>{PROPOSAL_STATUS_LABEL[s]}</button>
                  ))}
                </div>
              </>
            )}
            <div className="stack mt-16">
              <button className="btn btn-primary btn-block" onClick={() => { const p = activeProposal; setSheet(null); setActiveProposal(null); navigate(`/proposta/${p.id}`); }}>Ver proposta em PDF</button>
              <button className="btn btn-secondary btn-block" onClick={() => { const p = activeProposal; openProposalInDraft(p); setSheet(null); setActiveProposal(null); navigate('/orcamento', true); }}>Abrir no orçamento para editar</button>
              <button
                className="btn btn-danger btn-block"
                onClick={async () => {
                  const p = activeProposal;
                  if (isSoldProposal(lead, p.id)) {
                    toast('Desfaça a venda antes de apagar este orçamento');
                    return;
                  }
                  if (await confirm({ title: `Apagar o orçamento nº ${p.number}?`, confirm: 'Apagar', danger: true })) {
                    await deleteProposal(p.id);
                    setSheet(null);
                    setActiveProposal(null);
                  }
                }}
              >
                Apagar orçamento
              </button>
            </div>
          </>
        )}
      </Sheet>

    </>
  );
}

function EditSheet({ open, onClose, lead }: { open: boolean; onClose: () => void; lead: Lead }) {
  const { updateLead } = useStore();
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [address, setAddress] = useState(lead.address);
  useEffect(() => {
    if (open) {
      setName(lead.name);
      setPhone(lead.phone);
      setAddress(lead.address);
    }
  }, [open, lead]);
  return (
    <Sheet open={open} onClose={onClose} title="Dados do cliente">
      <div className="stack">
        <Field label="Nome" htmlFor="ed-name"><input id="ed-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Telefone ou WhatsApp" htmlFor="ed-phone"><input id="ed-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(phoneMask(e.target.value))} placeholder="(00) 00000-0000" /></Field>
        <Field label="Endereço com número" htmlFor="ed-addr"><textarea id="ed-addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" style={{ minHeight: 72 }} /></Field>
      </div>
      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button
          className="btn btn-primary"
          disabled={!name.trim()}
          onClick={async () => {
            const addrChanged = address.trim() !== lead.address;
            await updateLead(lead.id, { name: name.trim(), phone, address: address.trim(), ...(addrChanged ? { lat: null, lng: null } : {}) });
            onClose();
          }}
        >
          Salvar
        </button>
      </div>
    </Sheet>
  );
}

