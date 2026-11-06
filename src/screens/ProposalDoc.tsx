import { forwardRef } from 'react';
import type { Lead, Proposal, Settings } from '../core/types';
import { calculate } from '../core/calc';
import { GRID_LABEL, ROOF_LABEL, SYSTEM_LABEL } from '../core/defaults';
import { brl, dateLong, monthsText, MONTHS, num } from '../core/format';
import { Gauge } from './Orcamento';

interface Props {
  proposal: Proposal;
  lead: Lead | null;
  settings: Settings;
}

const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid #EEF0F4', fontSize: 16, gap: 16 } as const;

export const ProposalDoc = forwardRef<HTMLDivElement, Props>(function ProposalDoc({ proposal, lead, settings }, ref) {
  const r = proposal.result;
  const input = proposal.input;
  const issued = new Date(proposal.updatedAt);
  const valid = new Date(issued);
  valid.setDate(valid.getDate() + settings.proposalValidityDays);

  // A tabela de kits pode ter mudado: reaproveita o preço salvo para simular o financiamento
  const fin = calculate({ ...input, pricing: { ...input.pricing, mode: 'fechado', closedPrice: r.finalPrice }, payment: { ...input.payment, method: 'financiado', installments: input.payment.installments || 72 } }, []);

  const options: { key: string; label: string; value: string; on: boolean }[] = [
    { key: 'vista', label: 'À vista', value: brl(r.finalPrice), on: input.payment.method === 'vista' },
  ];
  if (input.payment.method === 'entrada' && r.installmentValue > 0) {
    options.push({ key: 'entrada', label: 'Com entrada', value: `${brl(r.downPayment)} + ${r.installments}× ${brl(r.installmentValue)}`, on: true });
  }
  if (fin.installmentValue > 0) {
    options.push({ key: 'fin', label: 'Financiado', value: `${fin.installments}× ${brl(fin.installmentValue)}`, on: input.payment.method === 'financiado' });
  }

  const paybackFrac = r.paybackMonths !== null ? r.paybackMonths / 300 : null;
  const paidAt = r.paybackMonths !== null ? new Date(issued.getFullYear(), issued.getMonth() + Math.round(r.paybackMonths), 1) : null;
  const years = Array.from({ length: 6 }, (_, i) => issued.getFullYear() + i * 5);
  const rate = input.payment.interestRate;

  return (
    <div className="doc" ref={ref}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {settings.companyLogo && <img src={settings.companyLogo} alt="" style={{ height: 48, maxWidth: 160, objectFit: 'contain' }} />}
          {settings.companyName && <span style={{ fontSize: 18, fontWeight: 600 }}>{settings.companyName}</span>}
        </div>
        <div style={{ textAlign: 'right', fontSize: 14, lineHeight: 1.45, color: '#5D6475' }}>
          <div style={{ fontWeight: 600, color: '#14213F' }}>Proposta nº {String(proposal.number).padStart(4, '0')}</div>
          <div>{dateLong(issued)}</div>
        </div>
      </header>

      <section style={{ marginTop: 28, background: '#14213F', color: '#fff', borderRadius: 24, padding: '30px 34px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 16, color: '#B9C3DA' }}>Proposta de energia solar para</p>
          <h1 style={{ marginTop: 4, fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{lead?.name ?? 'Cliente'}</h1>
          <p style={{ marginTop: 16, fontSize: 18, lineHeight: 1.45, color: '#D5DBE8' }}>
            Sua conta de {brl(r.currentBill)} cai para cerca de {brl(r.newBill)} por mês.
          </p>
        </div>
        <div style={{ position: 'relative', width: 250, height: 150, flexShrink: 0 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 250, height: 140 }}>
            <div style={{ transform: 'scale(0.7143)', transformOrigin: 'top left', width: 350 }}>
              <Gauge consumption={r.consumptionKwh} generation={r.generationKwh} dark />
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 58, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {num(r.generationKwh)} <span style={{ fontSize: 15, fontWeight: 500 }}>kWh/mês</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: '#C6A15B' }}>cobre {num(r.coverage * 100)}% do consumo</div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div style={{ paddingRight: 20, borderRight: '1px solid #E3E5EB' }}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{brl(r.monthlySavings)}</div>
          <div style={{ fontSize: 16, color: '#5D6475' }}>de economia por mês</div>
        </div>
        <div style={{ padding: '0 20px', borderRight: '1px solid #E3E5EB' }}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{brl(r.annualSavings)}</div>
          <div style={{ fontSize: 16, color: '#5D6475' }}>de economia por ano</div>
        </div>
        <div style={{ paddingLeft: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{monthsText(r.paybackMonths)}</div>
          <div style={{ fontSize: 16, color: '#5D6475' }}>para o sistema se pagar</div>
        </div>
      </section>

      <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 40 }}>
        <section>
          <h2 style={{ marginBottom: 6, fontSize: 20, fontWeight: 600 }}>Seu sistema</h2>
          {input.systemType !== 'ongrid' && <div style={row}><span style={{ color: '#5D6475' }}>Tipo</span><span style={{ fontWeight: 500 }}>{SYSTEM_LABEL[input.systemType]}</span></div>}
          <div style={row}><span style={{ color: '#5D6475' }}>Módulos</span><span style={{ fontWeight: 500 }}>{r.modules} × {input.moduleBrand} {r.panelW} W</span></div>
          <div style={row}><span style={{ color: '#5D6475' }}>Inversor</span><span style={{ fontWeight: 500 }}>{r.inverterLabel || '—'}</span></div>
          {input.systemType === 'bateria' && <div style={row}><span style={{ color: '#5D6475' }}>Baterias</span><span style={{ fontWeight: 500 }}>{input.batteries}</span></div>}
          <div style={row}><span style={{ color: '#5D6475' }}>Potência</span><span style={{ fontWeight: 500 }}>{num(r.kWp, 2)} kWp</span></div>
          <div style={row}><span style={{ color: '#5D6475' }}>Instalação</span><span style={{ fontWeight: 500 }}>{ROOF_LABEL[input.roof]}</span></div>
          <div style={{ ...row, borderBottom: 0 }}><span style={{ color: '#5D6475' }}>Rede</span><span style={{ fontWeight: 500 }}>{GRID_LABEL[input.grid]}</span></div>
        </section>
        <section>
          <h2 style={{ marginBottom: 6, fontSize: 20, fontWeight: 600 }}>Investimento</h2>
          {r.discountShown > 0 && (
            <div style={row}><span style={{ color: '#5D6475' }}>De</span><span style={{ textDecoration: 'line-through', color: '#5D6475' }}>{brl(r.tablePrice)}</span></div>
          )}
          {options.map((o) =>
            o.on ? (
              <div key={o.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '10px 12px', margin: '6px -12px 0', background: '#F1E6CF', borderRadius: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{o.label}</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{o.value}</span>
              </div>
            ) : (
              <div key={o.key} style={row}>
                <span style={{ color: '#5D6475' }}>{o.label}</span>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{o.value}</span>
              </div>
            ),
          )}
          {options.length > 1 && (
            <p style={{ marginTop: 8, fontSize: 14, color: '#5D6475', lineHeight: 1.45 }}>
              Taxa de {num(rate, 2)}% ao mês, sujeita à aprovação de crédito.
              {input.payment.method !== 'vista' && r.installmentValue > 0 && r.installmentValue < r.currentBill ? ' A parcela é menor que a conta de hoje.' : ''}
            </p>
          )}
        </section>
      </div>

      {paybackFrac !== null && paybackFrac < 0.95 && paidAt && (
        <section style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>Os próximos 25 anos</h2>
            <span style={{ fontSize: 16 }}>{brl(r.savings25y)} de economia, sem contar reajustes</span>
          </div>
          <div style={{ position: 'relative', marginTop: 34 }}>
            <span style={{ position: 'absolute', left: `${paybackFrac * 100}%`, bottom: 22, transform: `translateX(-${Math.min(90, paybackFrac * 100 + 10)}%)`, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {MONTHS[paidAt.getMonth()].replace(/^./, (c) => c.toUpperCase())} de {paidAt.getFullYear()}: sistema pago
            </span>
            <div style={{ height: 14, borderRadius: 7, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${paybackFrac * 100}%`, background: '#14213F' }} />
              <div style={{ flex: 1, background: '#C6A15B' }} />
            </div>
            <span style={{ position: 'absolute', left: `${paybackFrac * 100}%`, top: -8, width: 2, height: 30, background: '#14213F' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 14, color: '#5D6475' }}>
            {years.map((y) => <span key={y}>{y}</span>)}
          </div>
        </section>
      )}

      <footer style={{ marginTop: 'auto', paddingTop: 18, borderTop: '2px solid #14213F', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
        <div style={{ fontSize: 16, lineHeight: 1.45 }}>
          {settings.sellerName && <div style={{ fontWeight: 600 }}>{settings.sellerName}{settings.companyName ? `, ${settings.companyName}` : ''}</div>}
          {settings.sellerPhone && <div style={{ color: '#5D6475' }}>{settings.sellerPhone}</div>}
          <div style={{ marginTop: 4, fontWeight: 600, color: '#7A5D24' }}>Válida até {dateLong(valid)}</div>
        </div>
        <p style={{ maxWidth: 320, fontSize: 13, lineHeight: 1.45, color: '#5D6475', textAlign: 'right' }}>
          Valores estimados com tarifa de R$ {num(input.params.tariff, 2)} por kWh. A geração real varia com clima, sombreamento e orientação do telhado.
        </p>
      </footer>
    </div>
  );
});
