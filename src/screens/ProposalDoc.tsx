import { forwardRef } from 'react';
import '@fontsource/fraunces/latin-700.css';
import type { Lead, Proposal, Settings } from '../core/types';
import { paybackOf, proposalContent, proposalStory, type PlanChoice } from '../core/proposal';
import { GRID_LABEL, ROOF_LABEL, SYSTEM_LABEL } from '../core/defaults';
import { brl, monthsText, num } from '../core/format';
import photo from '../assets/casa.webp';
import './proposal.css';

interface Props {
  proposal: Proposal;
  lead: Lead | null;
  settings: Settings;
  /** Formas escolhidas ao gerar, na ordem em que aparecem */
  plans: PlanChoice[];
  main: string;
}

const Ico = ({ d }: { d: string }) => (
  <span className="pd-ico"><svg viewBox="0 0 24 24" fill="none" stroke="#E8C885" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg></span>
);
const SHIELD = 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z';
const WAVE = 'M4 12h3l2-5 4 10 2-5h5';
const CHECK = 'M5 12l5 5 9-10';

/** Desenho dos módulos em fileiras, só para dar ideia do tamanho do telhado */
function Modules({ n }: { n: number }) {
  const count = Math.max(1, Math.min(n, 60));
  const cols = Math.min(count, Math.max(3, Math.ceil(Math.sqrt(count * 1.7))));
  const rows = Math.ceil(count / cols);
  const w = 40, h = 26, gap = 4, W = cols * (w + gap) + 8, H = rows * (h + gap) + 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-label={`${n} módulos`}>
      {Array.from({ length: count }, (_, i) => {
        const x = 6 + (i % cols) * (w + gap), y = 6 + Math.floor(i / cols) * (h + gap);
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="2" fill="#2F4A86" stroke="#E8C885" strokeWidth="1.2" />
            <path d={`M${x + w / 3} ${y}v${h}M${x + (2 * w) / 3} ${y}v${h}M${x} ${y + h / 2}h${w}`} stroke="#8FA3CC" strokeWidth=".5" opacity=".6" />
          </g>
        );
      })}
    </svg>
  );
}

const Top = ({ settings, children }: { settings: Settings; children: React.ReactNode }) => (
  <div className="pd-top">
    <div className="pd-brand">
      {settings.companyLogo ? <img src={settings.companyLogo} alt="" /> : null}
      {settings.companyName && <span>{settings.companyName}</span>}
    </div>
    <div className="pd-ref">{children}</div>
  </div>
);

export const ProposalDoc = forwardRef<HTMLDivElement, Props>(function ProposalDoc({ proposal, lead, settings, plans, main }, ref) {
  const r = proposal.result;
  const input = proposal.input;
  const { issued, valid } = proposalContent(proposal, settings);
  const mainPlan = plans.find((p) => p.key === main) ?? plans[0];
  const s = proposalStory(proposal, mainPlan);
  const doc = lead?.document?.replace(/\D/g, '') ?? '';
  const number = `Proposta nº ${String(proposal.number).padStart(4, '0')}`;
  const validText = valid.toLocaleDateString('pt-BR');
  const contact = [settings.sellerName, settings.sellerPhone && `WhatsApp ${settings.sellerPhone}`].filter(Boolean).join(' · ');
  const footer = settings.proposalFooter?.trim();
  const pay = monthsText(s.payback);

  return (
    <div ref={ref} className="pdoc">
      {/* página 1: cliente, casa e a conta no período */}
      <div className="pd-page">
        <Top settings={settings}><b>{number}</b>{issued.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</Top>
        <div className="pd-band">
          <div><span className="pd-lbl">Proposta de energia solar para</span><h1>{lead?.name ?? 'Cliente'}</h1></div>
          {(doc || lead?.phone || lead?.address) && (
            <div className="pd-cli">
              {doc && <div><span className="pd-lbl">{doc.length === 14 ? 'CNPJ' : 'CPF'}</span><b>{lead!.document}</b></div>}
              {lead?.phone && <div><span className="pd-lbl">Telefone</span><b>{lead.phone}</b></div>}
              {lead?.address && <div className="wide"><span className="pd-lbl">Endereço da instalação</span><b>{lead.address}</b></div>}
            </div>
          )}
        </div>
        <div className="pd-hero" style={{ backgroundImage: `url(${photo})` }}>
          <p>Sua conta de <em>{brl(r.currentBill)}</em> vira apenas taxas e iluminação pública.</p>
        </div>
        <div>
          <p className="pd-news">Nos próximos {s.years} anos, sua casa vai pagar <em>{brl(s.billTotal)}</em> de luz.</p>
          <p className="pd-deck">{mainPlan.key === 'vista' ? `O sistema custa uma vez só, se paga em ${pay} e o resto vira lucro.` : `O sistema se paga em ${pay} e o resto vira lucro.`}</p>
        </div>
        <div>
          <div className="pd-hb"><span>Conta de luz sem solar</span><span className="t"><i style={{ width: '100%', background: '#A8352B' }} /></span><b>{brl(s.billTotal)}</b></div>
          <div className="pd-hb"><span>{mainPlan.key === 'vista' ? 'Sistema, pago uma vez' : `Sistema, ${mainPlan.label.toLowerCase()}`}</span><span className="t"><i style={{ width: `${Math.min(100, (s.systemTotal / s.billTotal) * 100)}%`, background: '#1B2A49' }} /></span><b>{brl(s.systemTotal)}</b></div>
          {s.keep > 0 && <div className="pd-hb win"><span>Fica com você</span><span className="t"><i style={{ width: `${Math.min(100, (s.keep / s.billTotal) * 100)}%`, background: '#0A7654' }} /></span><b>{brl(s.keep)}</b></div>}
        </div>
        <div className="pd-cta">
          <div><b>Cada mês sem o sistema custa {brl(r.monthlySavings)}</b>{contact && <div className="s">{contact}</div>}</div>
          <div className="d">Válida até<b>{validText}</b></div>
        </div>
        {footer && <p className="pd-edge">{footer}</p>}
      </div>

      {/* página 2: projeto, economia, pagamento e fechamento */}
      <div className="pd-page">
        <Top settings={settings}><b>{lead?.name ?? 'Cliente'}</b>{number}</Top>
        <div>
          <p className="pd-h2">Seu projeto</p>
          <div className="pd-proj">
            <div className="roof"><Modules n={r.modules} /><b>{r.modules} × {num(r.panelW)} W</b><span>{num(r.kWp, 2)} kWp no seu telhado</span></div>
            <div>
              <div className="pd-kv"><span>Tipo do sistema</span><b>{SYSTEM_LABEL[input.systemType]}{input.systemType === 'ongrid' ? ', ligado à rede' : ''}</b></div>
              <div className="pd-kv"><span>Módulos</span><b>{input.moduleBrand}, {num(r.panelW)} W</b></div>
              <div className="pd-kv"><span>Quantidade</span><b>{r.modules} módulos</b></div>
              <div className="pd-kv"><span>Potência total</span><b>{num(r.kWp, 2)} kWp</b></div>
              <div className="pd-kv"><span>Inversor</span><b>{r.inverterLabel || '—'}</b></div>
              {input.systemType === 'bateria' && <div className="pd-kv"><span>Baterias</span><b>{input.batteries}</b></div>}
              <div className="pd-kv"><span>Telhado e rede</span><b>{ROOF_LABEL[input.roof]}, {GRID_LABEL[input.grid].toLowerCase()}</b></div>
              <div className="pd-kv"><span>Geração estimada</span><b className="g">{num(r.generationKwh)} kWh por mês</b></div>
            </div>
          </div>
        </div>
        <div className="pd-marks">
          {s.marks.map((m, i) => <div key={m.years} className={i === s.marks.length - 1 ? 'hi' : ''}><b>{brl(m.value)}</b><span>de economia em {m.years === 1 ? '1 ano' : `${m.years} anos`}</span></div>)}
        </div>
        <div>
          <p className="pd-h2">{plans.length > 1 ? 'Formas de pagamento' : 'Forma de pagamento'}</p>
          <div className="pd-plans" style={{ gridTemplateColumns: `repeat(${Math.max(1, plans.length)}, minmax(0, 1fr))` }}>
            {plans.map((p) => {
              const below = p.monthly > 0 ? r.currentBill - p.monthly : 0;
              return (
                <div key={p.key} className={`pd-plan${p.key === mainPlan.key ? ' sel' : ''}`}>
                  <h3>{p.label}</h3>
                  {p.key === 'vista' ? <div className="v">{brl(p.total)}</div> : <div className="v">{brl(p.monthly)} <small>por mês</small></div>}
                  <ul>
                    {p.key === 'vista' && r.discountShown > 0 && <li><s>{brl(r.tablePrice)}</s>, desconto de {brl(r.discountShown)}</li>}
                    {p.key === 'vista' && <li>Se paga em {monthsText(paybackOf(p.total, r.monthlySavings))}</li>}
                    {p.down > 0 && <li>Entrada de {brl(p.down)}</li>}
                    {p.monthly > 0 && <li>Sujeito à aprovação de crédito</li>}
                  </ul>
                  {p.key === 'vista' ? <div className="eco">Economia por mês: <b>{brl(r.monthlySavings)}</b></div> : below > 0 ? <div className="eco">Parcela <b>{brl(below)}</b> menor que a conta</div> : null}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p className="pd-h2" style={{ fontSize: 16 }}>Depois do sim</p>
          <div className="pd-steps">
            <div><i>1</i><b>Assinatura</b><span>contrato e pagamento</span></div>
            <div><i>2</i><b>Projeto</b><span>feito pela nossa equipe</span></div>
            <div><i>3</i><b>Celesc</b><span>a gente cuida da aprovação</span></div>
            <div><i>4</i><b>Instalação</b><span>no seu telhado</span></div>
            <div><i>5</i><b>Conta baixa</b><span>a economia começa</span></div>
          </div>
        </div>
        <div className="pd-guar">
          <div><Ico d={SHIELD} /><p><b>30 anos</b><span>de performance dos módulos</span></p></div>
          <div><Ico d={WAVE} /><p><b>15 anos</b><span>de garantia do inversor</span></p></div>
          <div><Ico d={CHECK} /><p><b>Celesc</b><span>homologação inclusa</span></p></div>
        </div>
        <div className="pd-cta">
          <div><b>Quer garantir este valor?</b>{contact && <div className="s">{contact}</div>}</div>
          <div className="d">Válida até<b>{validText}</b></div>
        </div>
        {footer && <p className="pd-edge">{footer}</p>}
      </div>
    </div>
  );
});
