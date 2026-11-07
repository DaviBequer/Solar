import { useMemo, useState } from 'react';
import { Plus, Search, Share2 } from 'lucide-react';
import { TopBar } from '../ui/chrome';
import { useToast } from '../ui/kit';
import { lastActivity, nextTaskOf, useStore } from '../data/store';
import { currentProposal, pipeline } from '../core/sale';
import { LEAD_STATUS_LABEL, SYSTEM_LABEL, TASK_LABEL } from '../core/defaults';
import { brl, dateShort, daysBetween, initials, relativeDay, time } from '../core/format';
import type { Lead, LeadStatus } from '../core/types';
import { navigate } from '../router';
import { ClientPicker } from './orcamento-sheets';

const ORDER: LeadStatus[] = ['negociando', 'novo', 'vendido', 'perdido'];
const FILTER_LABEL: Record<LeadStatus, string> = { negociando: 'Em negociação', novo: 'Novos', vendido: 'Vendidos', perdido: 'Perdidos' };

export default function Clientes() {
  const { leads, proposals, tasks } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<LeadStatus>(() => (sessionStorage.getItem('clientes.filtro') as LeadStatus) || 'negociando');
  const [creating, setCreating] = useState(false);

  const pick = (s: LeadStatus) => {
    setFilter(s);
    try { sessionStorage.setItem('clientes.filtro', s); } catch { /* sem armazenamento, segue sem lembrar */ }
  };

  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = { novo: 0, negociando: 0, vendido: 0, perdido: 0 };
    for (const l of leads) c[l.status]++;
    return c;
  }, [leads]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const searching = !!t;
    return leads
      .filter((l) => (searching ? true : l.status === filter))
      .filter((l) => !t || l.name.toLowerCase().includes(t) || (digits.length > 2 && l.phone.replace(/\D/g, '').includes(digits)))
      .map((l) => ({ lead: l, last: currentProposal(proposals, l.id), next: nextTaskOf(tasks, l.id), activity: lastActivity(l, proposals, tasks) }))
      .sort((a, b) => {
        const an = a.next ? new Date(a.next.date).getTime() : Infinity;
        const bn = b.next ? new Date(b.next.date).getTime() : Infinity;
        if (an !== bn) return an - bn;
        return b.activity.getTime() - a.activity.getTime();
      });
  }, [leads, proposals, tasks, q, filter]);

  const openTotal = useMemo(() => pipeline(leads, proposals).total, [leads, proposals]);

  async function share() {
    const list = rows.map((r) => r.lead);
    if (list.length === 0) return;
    const text = `${FILTER_LABEL[filter]} (${list.length})\n\n` + list.map((l) => `${l.name}${l.phone ? ` — ${l.phone}` : ''}`).join('\n');
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* compartilhamento cancelado */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast('Lista copiada');
    }
  }

  const sub = (l: Lead, last: (typeof rows)[number]['last']) => {
    if (!last) return l.phone || 'Sem orçamento ainda';
    const r = last.result;
    const sys = last.input.systemType === 'ongrid' ? '' : `${SYSTEM_LABEL[last.input.systemType]}, `;
    const pay = last.input.payment.method === 'vista' ? 'à vista' : last.input.payment.method === 'financiado' ? `financiado em ${r.installments}×` : 'entrada e parcelas';
    return `${sys}${r.modules} × ${r.panelW} W, ${pay}`;
  };

  return (
    <>
      <TopBar />
      <main className="page" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-b) + 88px)' }}>
        <div className="page-head">
          <div>
            <h1>Clientes</h1>
            <p>{leads.length === 1 ? '1 contato' : `${leads.length} contatos`}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="icon-btn" aria-label="Compartilhar lista" onClick={share}><Share2 size={19} /></button>
          </div>
        </div>

        <div className="search mt-16">
          <Search size={18} aria-hidden="true" />
          <input className="input" placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cliente" />
        </div>

        {!q && (
          <div className="chips mt-12" role="tablist" aria-label="Filtrar por status">
            {ORDER.map((s) => (
              <button key={s} role="tab" className="chip" aria-selected={filter === s} onClick={() => pick(s)}>
                {FILTER_LABEL[s]} {counts[s]}
              </button>
            ))}
          </div>
        )}

        {!q && filter === 'negociando' && openTotal > 0 && <p className="muted" style={{ fontSize: 13, margin: '16px 0 8px' }}>{brl(openTotal)} em propostas abertas</p>}
        {(q || filter !== 'negociando' || openTotal === 0) && <div style={{ height: 14 }} />}

        {rows.length > 0 ? (
          <ul className="list">
            {rows.map(({ lead, last, next, activity }) => {
              const idle = daysBetween(activity, new Date());
              return (
                <li key={lead.id}>
                  <button className="lead-row" onClick={() => navigate(`/clientes/${lead.id}`)}>
                    <span className="avatar" aria-hidden="true">{initials(lead.name)}</span>
                    <span className="body">
                      <span className="line1">
                        <span className="name">{lead.name}</span>
                        {last && <span className="val num">{brl(last.result.finalPrice)}</span>}
                      </span>
                      <span className="sub">{q ? `${LEAD_STATUS_LABEL[lead.status]}, ` : ''}{sub(lead, last)}</span>
                      {next ? (
                        <span className={`pill ${daysBetween(new Date(), new Date(next.date)) <= 0 ? 'gold' : ''}`}>
                          {TASK_LABEL[next.type]} {relativeDay(new Date(next.date)).toLowerCase()}, {time(new Date(next.date))}
                        </span>
                      ) : lead.status === 'negociando' && idle >= 7 ? (
                        <span className="sub danger-text" style={{ fontWeight: 500, marginTop: 4 }}>Sem contato há {idle} dias</span>
                      ) : last && lead.status === 'negociando' ? (
                        <span className="sub" style={{ marginTop: 4 }}>{last.status === 'rascunho' ? 'Proposta ainda não enviada' : last.status === 'recusado' ? 'Última proposta recusada' : `Proposta enviada em ${dateShort(last.updatedAt)}`}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card empty">
            {q ? (
              <>Nenhum cliente com “{q}”.</>
            ) : leads.length === 0 ? (
              <>
                <strong>Nenhum cliente ainda</strong>
                Toque em Novo para cadastrar o primeiro, ou crie direto no orçamento.
              </>
            ) : (
              <>Nenhum cliente em “{FILTER_LABEL[filter].toLowerCase()}”.</>
            )}
          </div>
        )}
      </main>

      <button className="fab icon" aria-label="Novo cliente" onClick={() => setCreating(true)}><Plus size={26} /></button>

      <ClientPicker
        createOnly
        open={creating}
        onClose={() => setCreating(false)}
        onPick={(l) => {
          setCreating(false);
          navigate(`/clientes/${l.id}`);
        }}
      />
    </>
  );
}
