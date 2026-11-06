import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TopBar } from '../ui/chrome';
import { proposalsOf, useStore } from '../data/store';
import { brl, cap, MONTHS, num } from '../core/format';
import { navigate } from '../router';

const SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function Painel() {
  const { leads, proposals, settings } = useStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const sales = useMemo(
    () =>
      leads
        .filter((l) => l.status === 'vendido' && l.soldAt)
        .map((l) => {
          const p = proposals.find((x) => x.id === l.soldProposalId) ?? proposalsOf(proposals, l.id)[0];
          return { lead: l, date: new Date(l.soldAt!), value: p?.result.finalPrice ?? 0, commission: l.commission?.value ?? p?.result.commission.gross ?? 0 };
        }),
    [leads, proposals],
  );

  const byMonth = useMemo(() => {
    const arr = Array(12).fill(0) as number[];
    for (const s of sales) if (s.date.getFullYear() === year) arr[s.date.getMonth()] += s.value;
    return arr;
  }, [sales, year]);

  const monthSales = sales.filter((s) => s.date.getFullYear() === year && s.date.getMonth() === month);
  const commission = monthSales.reduce((a, s) => a + s.commission, 0);
  const sold = monthSales.reduce((a, s) => a + s.value, 0);
  const yearTotal = byMonth.reduce((a, b) => a + b, 0);
  const goal = settings.monthlyGoal;
  const goalPct = goal > 0 ? Math.min(1, sold / goal) : 0;

  const negotiating = leads.filter((l) => l.status === 'negociando');
  const pipeline = negotiating.reduce((sum, l) => sum + (proposalsOf(proposals, l.id)[0]?.result.finalPrice ?? 0), 0);
  const withProposal = negotiating.filter((l) => proposalsOf(proposals, l.id).length > 0).length;

  const counts = { novo: 0, negociando: 0, vendido: 0, perdido: 0 };
  for (const l of leads) counts[l.status]++;
  const total = leads.length;
  const closed = counts.vendido + counts.perdido;
  const conversion = closed > 0 ? Math.round((counts.vendido / closed) * 100) : null;

  const max = Math.max(...byMonth, 1);
  const label = `${MONTHS[month]}`;
  const isCurrent = year === now.getFullYear() && month === now.getMonth();

  const shift = (dir: number) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <>
      <TopBar />
      <main className="page">
        <div className="page-head" style={{ alignItems: 'center' }}>
          <h1>Painel</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <button className="icon-btn plain sm" aria-label="Mês anterior" onClick={() => shift(-1)}><ChevronLeft size={17} /></button>
            <span style={{ fontSize: 14, fontWeight: 500, minWidth: 104, textAlign: 'center' }}>{cap(label)} {year}</span>
            <button className="icon-btn plain sm" aria-label="Próximo mês" onClick={() => shift(1)} disabled={isCurrent}><ChevronRight size={17} /></button>
          </div>
        </div>

        <section className="hero">
          <p className="lbl">Sua comissão em {label}</p>
          <p className="big num">{brl(commission)}</p>
          <p className="lbl" style={{ marginTop: 2 }}>{monthSales.length === 1 ? '1 venda' : `${monthSales.length} vendas`}, {brl(sold)} vendidos</p>
          {goal > 0 ? (
            <>
              <div className="meter" style={{ marginTop: 16 }}><div style={{ width: `${goalPct * 100}%` }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--on-navy)' }}>
                <span>{num(goalPct * 100)}% da meta de {brl(goal)}</span>
                <span>{sold >= goal ? 'meta batida' : `faltam ${brl(goal - sold)}`}</span>
              </div>
            </>
          ) : (
            <button className="link-btn" style={{ marginTop: 12, color: 'var(--gold)' }} onClick={() => navigate('/ajustes')}>Definir uma meta mensal</button>
          )}
        </section>

        <section className="card split mt-12">
          <div>
            <p className="muted" style={{ fontSize: 12 }}>Em negociação</p>
            <p className="num" style={{ marginTop: 4, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{brl(pipeline)}</p>
            <p className="muted" style={{ marginTop: 2, fontSize: 12 }}>{withProposal === 1 ? '1 proposta aberta' : `${withProposal} propostas abertas`}</p>
          </div>
          <div>
            <p className="muted" style={{ fontSize: 12 }}>Conversão</p>
            <p style={{ marginTop: 4, fontSize: 20, fontWeight: 600 }}>{conversion === null ? '—' : `${conversion}%`}</p>
            <p className="muted" style={{ marginTop: 2, fontSize: 12 }}>{closed === 0 ? 'Nenhuma negociação fechada ainda' : `${counts.vendido} ${counts.vendido === 1 ? 'venda' : 'vendas'} em ${closed} ${closed === 1 ? 'negociação fechada' : 'negociações fechadas'}`}</p>
          </div>
        </section>

        <section className="card pad mt-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Vendas por mês</h2>
            <span className="muted" style={{ fontSize: 12 }}>{brl(yearTotal)} em {year}</span>
          </div>
          <div className="bars" role="group" aria-label={`Vendas por mês em ${year}`}>
            {byMonth.map((v, i) => (
              <button
                key={i}
                aria-pressed={i === month}
                aria-label={`${MONTHS[i]}: ${brl(v)}`}
                style={{ height: `${Math.max(2.5, (v / max) * 86)}%` }}
                onClick={() => setMonth(i)}
              >
                {i === month && v > 0 && <span className="tip">{v >= 1000 ? `${num(v / 1000)} mil` : brl(v)}</span>}
              </button>
            ))}
          </div>
          <div className="bars-x" aria-hidden="true">
            {SHORT.map((m, i) => <span key={i} style={i === month ? { color: 'var(--ink)', fontWeight: 600 } : undefined}>{m}</span>)}
          </div>
        </section>

        <section className="card pad mt-12">
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{total === 1 ? 'Seu contato' : `Seus ${total} contatos`}</h2>
          {total > 0 ? (
            <div className="funnel" role="img" aria-label={`${counts.novo} novos, ${counts.negociando} em negociação, ${counts.vendido} vendidos, ${counts.perdido} perdidos`}>
              {counts.novo > 0 && <div style={{ flex: counts.novo, background: '#B9C3DA' }} />}
              {counts.negociando > 0 && <div style={{ flex: counts.negociando, background: '#14213F' }} />}
              {counts.vendido > 0 && <div style={{ flex: counts.vendido, background: '#C6A15B' }} />}
              {counts.perdido > 0 && <div style={{ flex: counts.perdido, background: '#5D6475' }} />}
            </div>
          ) : (
            <div className="funnel"><div style={{ flex: 1, background: 'var(--rule)' }} /></div>
          )}
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            {([['novo', 'Novos', '#B9C3DA'], ['negociando', 'Negociando', '#14213F'], ['vendido', 'Vendidos', '#C6A15B'], ['perdido', 'Perdidos', '#5D6475']] as const).map(([k, l, c]) => (
              <span key={k}>
                <b style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, color: 'var(--ink)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  {counts[k]}
                </b>
                {l}
              </span>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
