import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Field, NumberField, Sheet } from '../ui/kit';
import { useStore } from '../data/store';
import type { Grid, Lead, PanelW, QuoteInput, QuoteResult, Roof } from '../core/types';
import { GRID_LABEL, GRID_MIN_KWH, INVERTER_BRANDS, MODULE_BRANDS, ROOF_LABEL } from '../core/defaults';
import { brl, initials, MONTHS_SHORT, num, phoneMask } from '../core/format';
import { inverterLabel } from '../core/calc';

type SetInput = (patch: Partial<QuoteInput>) => void;

export function ClientPicker({ open, onClose, onPick, createOnly = false }: { open: boolean; onClose: () => void; onPick: (lead: Lead) => void; createOnly?: boolean }) {
  const { leads, createLead } = useStore();
  const [q, setQ] = useState('');
  const [creatingState, setCreating] = useState(false);
  const creating = createOnly || creatingState;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return [...leads]
      .filter((l) => !t || l.name.toLowerCase().includes(t) || (digits && l.phone.replace(/\D/g, '').includes(digits)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [leads, q]);

  const reset = () => {
    setQ('');
    setCreating(false);
    setName('');
    setPhone('');
  };

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title={creating ? 'Novo cliente' : 'Escolher cliente'}>
      {creating ? (
        <div className="stack">
          <Field label="Nome" htmlFor="nc-name">
            <input id="nc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Telefone ou WhatsApp" htmlFor="nc-phone">
            <input id="nc-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(phoneMask(e.target.value))} placeholder="(00) 00000-0000" />
          </Field>
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => (createOnly ? onClose() : setCreating(false))}>{createOnly ? 'Cancelar' : 'Voltar'}</button>
            <button
              className="btn btn-primary"
              disabled={!name.trim()}
              onClick={async () => {
                const lead = await createLead({ name: name.trim(), phone });
                reset();
                onPick(lead);
              }}
            >
              Criar cliente
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="search-row">
            <div className="search">
              <Search size={18} aria-hidden="true" />
              <input className="input" placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cliente" />
            </div>
            <button className="icon-btn add" aria-label="Novo cliente" title="Novo cliente" onClick={() => { setCreating(true); setName(q.replace(/\d/g, '').trim()); }}><Plus size={22} /></button>
          </div>
          <ul className="list mt-12">
            {list.map((l) => (
              <li key={l.id}>
                <button className="row" onClick={() => { reset(); onPick(l); }}>
                  <span className="avatar" aria-hidden="true">{initials(l.name)}</span>
                  <span className="grow">
                    <span className="t">{l.name}</span>
                    {l.phone && <span className="s">{l.phone}</span>}
                  </span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="empty">Nenhum cliente encontrado.</li>}
          </ul>
        </>
      )}
    </Sheet>
  );
}

export function MonthlySheet({ open, onClose, input, set }: { open: boolean; onClose: () => void; input: QuoteInput; set: SetInput }) {
  const [vals, setVals] = useState<number[]>(() => input.monthly ?? Array(12).fill(0));
  const filled = vals.filter((v) => v > 0);
  const avg = filled.length ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;
  return (
    <Sheet open={open} onClose={onClose} title="Média de consumo">
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Digite o consumo em kWh de cada mês da conta. Meses em branco ficam de fora da média.</p>
      <div className="months">
        {MONTHS_SHORT.map((m, i) => (
          <NumberField
            key={m}
            value={vals[i]}
            decimals={0}
            prefix={m}
            label={`Consumo de ${m} em kWh`}
            onChange={(n) => setVals((v) => v.map((x, j) => (j === i ? n : x)))}
          />
        ))}
      </div>
      <div className="card pad mt-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="muted" style={{ fontSize: 13 }}>Média de {filled.length} {filled.length === 1 ? 'mês' : 'meses'}</span>
        <span style={{ fontSize: 22, fontWeight: 600 }}>{num(avg)} kWh</span>
      </div>
      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={() => { setVals(Array(12).fill(0)); set({ monthly: null }); onClose(); }}>Limpar</button>
        <button className="btn btn-primary" disabled={!filled.length} onClick={() => { set({ monthly: vals, billMode: 'kwh', billValue: Math.round(avg), manualModules: null, manualInverter: null }); onClose(); }}>Usar média</button>
      </div>
    </Sheet>
  );
}

export function ModuleSheet({ open, onClose, input, set }: { open: boolean; onClose: () => void; input: QuoteInput; set: SetInput }) {
  return (
    <Sheet open={open} onClose={onClose} title="Módulo">
      <p className="section-title" style={{ marginTop: 0 }}>Potência</p>
      <div className="tiles" role="group" aria-label="Potência do módulo">
        {([585, 610, 700] as PanelW[]).map((w) => (
          <button key={w} aria-pressed={input.panelW === w} onClick={() => set({ panelW: w, manualModules: null, manualInverter: null })}>{w} W</button>
        ))}
      </div>
      <p className="section-title">Marca</p>
      <div className="tiles" role="group" aria-label="Marca do módulo">
        {MODULE_BRANDS.map((b) => (
          <button key={b} aria-pressed={input.moduleBrand === b} onClick={() => set({ moduleBrand: b })}>{b}</button>
        ))}
      </div>
      <div className="sheet-actions">
        <button className="btn btn-primary" onClick={onClose}>Pronto</button>
      </div>
    </Sheet>
  );
}

export function InverterSheet({ open, onClose, input, result, set }: { open: boolean; onClose: () => void; input: QuoteInput; result: QuoteResult; set: SetInput }) {
  return (
    <Sheet open={open} onClose={onClose} title="Inversor">
      <p className="section-title" style={{ marginTop: 0 }}>Marca preferida</p>
      <div className="tiles" role="group" aria-label="Marca preferida do inversor">
        <button aria-pressed={!input.inverterBrand} onClick={() => set({ inverterBrand: '', manualInverter: null })}>Qualquer</button>
        {INVERTER_BRANDS.map((b) => (
          <button key={b} aria-pressed={input.inverterBrand === b} onClick={() => set({ inverterBrand: b, manualInverter: null })}>{b}</button>
        ))}
      </div>
      <p className="section-title">Disponíveis na tabela para este sistema</p>
      <ul className="list">
        <li>
          <button className="row" onClick={() => { set({ manualInverter: null }); onClose(); }}>
            <span className="grow"><span className="t">Automático</span><span className="s">O menor kit que cobre o consumo</span></span>
            {input.manualInverter !== result.kit?.inverter && <span className="pill gold">Em uso</span>}
          </button>
        </li>
        {result.availableInverters.map((inv) => (
          <li key={inv}>
            <button className="row" onClick={() => { set({ manualInverter: inv }); onClose(); }}>
              <span className="grow"><span className="t">{inverterLabel(inv, input.inverterBrand)}</span></span>
              {input.manualInverter === inv && result.kit?.inverter === inv && <span className="pill gold">Em uso</span>}
            </button>
          </li>
        ))}
        {result.availableInverters.length === 0 && <li className="empty">Nenhum kit da tabela atende este sistema.</li>}
      </ul>
    </Sheet>
  );
}

export function InstallSheet({ open, onClose, input, set }: { open: boolean; onClose: () => void; input: QuoteInput; set: SetInput }) {
  const p = input.params;
  const setP = (patch: Partial<QuoteInput['params']>) => set({ params: { ...p, ...patch } });
  return (
    <Sheet open={open} onClose={onClose} title="Instalação e tarifa">
      <p className="section-title" style={{ marginTop: 0 }}>Telhado</p>
      <div className="grid-3" role="group" aria-label="Tipo de telhado">
        {(Object.keys(ROOF_LABEL) as Roof[]).map((r) => (
          <button key={r} className="chip" style={{ borderRadius: 12, height: 42 }} aria-pressed={input.roof === r} onClick={() => set({ roof: r })}>{ROOF_LABEL[r]}</button>
        ))}
      </div>
      <p className="section-title">Rede</p>
      <div className="tiles" role="group" aria-label="Tipo de rede">
        {(Object.keys(GRID_LABEL) as Grid[]).map((g) => (
          <button key={g} aria-pressed={input.grid === g} onClick={() => set({ grid: g })}>{GRID_LABEL[g]}</button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>A distribuidora cobra no mínimo {GRID_MIN_KWH[input.grid]} kWh por mês nessa rede, mesmo com energia solar.</p>
      <div className="grid-2 mt-16">
        <Field label="Tarifa (R$ por kWh)" htmlFor="tarifa">
          <NumberField id="tarifa" value={p.tariff} onChange={(n) => setP({ tariff: n })} decimals={3} />
        </Field>
        <Field label="Margem de segurança" htmlFor="margem">
          <NumberField id="margem" value={p.safetyMargin} onChange={(n) => setP({ safetyMargin: n })} decimals={0} suffix="%" />
        </Field>
      </div>
      <div className="sheet-actions">
        <button className="btn btn-primary" onClick={onClose}>Pronto</button>
      </div>
    </Sheet>
  );
}

export function PriceSheet({ open, onClose, input, result, set }: { open: boolean; onClose: () => void; input: QuoteInput; result: QuoteResult; set: SetInput }) {
  const pr = input.pricing;
  const setPr = (patch: Partial<QuoteInput['pricing']>) => set({ pricing: { ...pr, ...patch } });
  const p = input.params;
  const setP = (patch: Partial<QuoteInput['params']>) => set({ params: { ...p, ...patch } });
  return (
    <Sheet open={open} onClose={onClose} title="Valor do projeto">
      <div className="seg white tall" role="group" aria-label="Como definir o valor">
        <button aria-pressed={pr.mode === 'tabela'} onClick={() => setPr({ mode: 'tabela' })}>Pela tabela</button>
        <button aria-pressed={pr.mode === 'fechado'} onClick={() => setPr({ mode: 'fechado', closedPrice: pr.closedPrice ?? (result.finalPrice || null) })}>Valor fechado</button>
      </div>
      <div className="card pad mt-12">
        <div className="kv"><span className="k">Kit e adicionais</span><span className="v num">{result.basePrice > 0 ? brl(result.basePrice) : '—'}</span></div>
      </div>
      <div className="stack mt-12">
        <Field label="Ancoragem (somada para mostrar desconto)" htmlFor="ancora">
          <NumberField id="ancora" value={pr.anchoring} onChange={(n) => setPr({ anchoring: n })} prefix="R$" />
        </Field>
        {pr.mode === 'tabela' ? (
          <Field label="Desconto" htmlFor="desconto">
            <NumberField id="desconto" value={pr.discount} onChange={(n) => setPr({ discount: n })} prefix="R$" />
          </Field>
        ) : (
          <Field label="Valor final para o cliente" htmlFor="fechado">
            <NumberField id="fechado" value={pr.closedPrice} onChange={(n) => setPr({ closedPrice: n || null })} prefix="R$" />
          </Field>
        )}
      </div>
      <div className="card pad mt-12">
        <div className="kv"><span className="k">Valor de tabela</span><span className="v num">{brl(result.tablePrice)}</span></div>
        <div className="kv"><span className="k">Desconto mostrado</span><span className="v num">{result.discountShown > 0 ? `−${brl(result.discountShown)}` : '—'}</span></div>
        <div className="kv total"><span className="k">Valor final</span><span className="v num">{brl(result.finalPrice)}</span></div>
      </div>
      <p className="section-title">Taxas deste cliente</p>
      <div className="grid-2">
        <Field label="Spread" htmlFor="tx-spread"><NumberField id="tx-spread" value={p.spread} onChange={(n) => setP({ spread: n })} suffix="%" /></Field>
        <Field label="IOF" htmlFor="tx-iof"><NumberField id="tx-iof" value={p.iof} onChange={(n) => setP({ iof: n })} suffix="%" /></Field>
        <Field label="Comissão" htmlFor="tx-com"><NumberField id="tx-com" value={p.commissionPct} onChange={(n) => setP({ commissionPct: n })} suffix="%" /></Field>
        <Field label="Overprice" htmlFor="tx-over"><NumberField id="tx-over" value={p.overpriceSharePct} onChange={(n) => setP({ overpriceSharePct: n })} suffix="%" /></Field>
        <Field label="Imposto" htmlFor="tx-imp"><NumberField id="tx-imp" value={p.taxPct} onChange={(n) => setP({ taxPct: n })} suffix="%" /></Field>
      </div>
      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={() => setPr({ mode: 'tabela', anchoring: 0, discount: 0, closedPrice: null })}>Zerar ajustes</button>
        <button className="btn btn-primary" onClick={onClose}>Pronto</button>
      </div>
    </Sheet>
  );
}
