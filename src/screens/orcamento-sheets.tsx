import { useMemo, useState } from 'react';
import { CirclePlus, Search } from 'lucide-react';
import { Field, NumberField, Sheet } from '../ui/kit';
import { useStore } from '../data/store';
import type { Lead, QuoteInput } from '../core/types';
import { initials, MONTHS_SHORT, num, phoneMask } from '../core/format';

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
            <button className="icon-btn add" aria-label="Novo cliente" title="Novo cliente" onClick={() => { setCreating(true); setName(q.replace(/\d/g, '').trim()); }}><CirclePlus size={22} /></button>
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
