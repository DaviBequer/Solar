import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, Download, Plus, Search, Trash2, Upload } from 'lucide-react';
import { Field, NumberField, Sheet, useConfirm, useToast } from '../ui/kit';
import { useStore } from '../data/store';
import { kitsToCsv, parseKitsCsv } from '../core/csv';
import { brl, num, parseBR, uid } from '../core/format';
import type { Kit } from '../core/types';
import { goBack } from '../router';
import { deliverFile } from '../ui/deliver';

function panels(k: Kit): string {
  const parts: string[] = [];
  if (k.panel585) parts.push(`${k.panel585} × 585 W`);
  if (k.panel610) parts.push(`${k.panel610} × 610 W`);
  if (k.panel700) parts.push(`${k.panel700} × 700 W`);
  return parts.join(' + ') || 'Sem módulos';
}

type NumKey = 'gm' | 'panel585' | 'panel610' | 'panel700' | 'price';
const fmt = (k: NumKey, v: number) => (!v ? '' : k === 'price' ? num(v, Number.isInteger(v) ? 0 : 2) : String(v));

/** Linha da tabela: edita no lugar e salva ao sair do campo, sem a linha pular de posição enquanto digita. */
function KitRow({ kit, onSave, onDelete }: { kit: Kit; onSave: (k: Kit) => void; onDelete: () => void }) {
  const [d, setD] = useState(kit);
  const [raw, setRaw] = useState<Partial<Record<NumKey, string>>>({});
  const commit = () => {
    setRaw({});
    // Kit sem geração, preço ou módulos não serve ao cálculo: volta ao que era
    if (!d.gm || !d.price || !(d.panel585 || d.panel610 || d.panel700)) return setD(kit);
    if (JSON.stringify(d) !== JSON.stringify(kit)) onSave(d);
  };
  const numCell = (k: NumKey, label: string) => (
    <td className={k === 'price' ? 'kt-price' : 'kt-n'}>
      <input
        className="kt-in num"
        inputMode="decimal"
        aria-label={`${label}, kit de ${kit.gm} kWh`}
        value={raw[k] ?? fmt(k, d[k])}
        placeholder="—"
        onFocus={(e) => e.target.select()}
        onChange={(e) => { const t = e.target.value.replace(/[^\d.,]/g, ''); setRaw({ ...raw, [k]: t }); setD({ ...d, [k]: k === 'price' ? parseBR(t) : Math.round(parseBR(t)) }); }}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </td>
  );
  return (
    <tr>
      {numCell('gm', 'Geração')}
      {numCell('panel585', 'Módulos de 585 W')}
      {numCell('panel610', 'Módulos de 610 W')}
      {numCell('panel700', 'Módulos de 700 W')}
      <td><input className="kt-in" aria-label={`Inversor, kit de ${kit.gm} kWh`} value={d.inverter} onChange={(e) => setD({ ...d, inverter: e.target.value })} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} /></td>
      <td><input className="kt-in" aria-label={`Ligação, kit de ${kit.gm} kWh`} value={d.phase ?? ''} placeholder="—" onChange={(e) => setD({ ...d, phase: e.target.value || undefined })} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} /></td>
      {numCell('price', 'Preço')}
      <td className="kt-x"><button className="icon-btn plain sm" aria-label={`Apagar kit de ${kit.gm} kWh`} onClick={onDelete}><Trash2 size={15} /></button></td>
    </tr>
  );
}

export default function Kits() {
  const { kits, saveKit, deleteKit, replaceKits } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Kit | null>(null);
  const [imported, setImported] = useState<Kit[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...kits]
      .filter((k) => !t || String(k.gm).includes(t) || k.inverter.toLowerCase().includes(t) || panels(k).toLowerCase().includes(t))
      .sort((a, b) => a.gm - b.gm || a.price - b.price);
  }, [kits, q]);

  const exportCsv = () => deliverFile(new File([kitsToCsv(kits)], 'tabela-kits.csv', { type: 'text/csv' }), 'Tabela de kits');

  const set = (patch: Partial<Kit>) => setEdit((k) => (k ? { ...k, ...patch } : k));
  const isNew = edit ? !kits.some((k) => k.id === edit.id) : false;

  return (
    <>
      <div className="subbar">
        <button className="icon-btn" aria-label="Voltar" onClick={() => goBack('/ajustes')}><ChevronLeft size={20} /></button>
        <h1>Tabela de kits</h1>
        <button className="icon-btn" aria-label="Importar planilha" onClick={() => fileRef.current?.click()}><Upload size={19} /></button>
      </div>
      <main className="page full kits">
        <p className="muted" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.45 }}>
          Toque em qualquer número para editar; salva ao sair do campo. O orçamento escolhe o menor kit que cobre o consumo com a margem. Para importar, use uma planilha CSV com as colunas GM, 585, 610, 700, Inversor, Valor e Fase (opcional).
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setEdit({ id: uid(), gm: 0, panel585: 0, panel610: 0, panel700: 0, inverter: '', price: 0 })}>
            <Plus size={18} /> Adicionar kit
          </button>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={kits.length === 0}><Download size={17} /> Exportar</button>
        </div>

        {kits.length > 0 && (
          <div className="search mt-12">
            <Search size={18} aria-hidden="true" />
            <input className="input" placeholder="Buscar por geração, módulo ou inversor" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar kit" />
          </div>
        )}

        <p className="section-title">{kits.length === 1 ? '1 kit' : `${kits.length} kits`}{q && list.length !== kits.length ? `, ${list.length} encontrados` : ''}</p>
        {list.length > 0 ? (
          <div className="kt-wrap">
            <table className="kt">
              <thead>
                <tr><th className="kt-n">Geração<small>kWh/mês</small></th><th className="kt-n">585 W<small>módulos</small></th><th className="kt-n">610 W<small>módulos</small></th><th className="kt-n">700 W<small>módulos</small></th><th>Inversor</th><th>Ligação</th><th className="kt-price">Preço<small>R$</small></th><th aria-label="Apagar" /></tr>
              </thead>
              <tbody>
                {list.map((k) => (
                  <KitRow
                    key={`${k.id}-${k.gm}-${k.price}-${k.inverter}-${k.panel585}-${k.panel610}-${k.panel700}-${k.phase ?? ''}`}
                    kit={k}
                    onSave={async (nk) => { await saveKit(nk); toast('Kit atualizado'); }}
                    onDelete={async () => { if (await confirm({ title: `Apagar o kit de ${num(k.gm)} kWh?`, confirm: 'Apagar', danger: true })) await deleteKit(k.id); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card empty">
            {kits.length === 0 ? (
              <>
                <strong>A tabela está vazia</strong>
                Importe a planilha de kits pelo botão no topo ou adicione um por um.
              </>
            ) : (
              'Nenhum kit encontrado.'
            )}
          </div>
        )}

        {kits.length > 0 && (
          <button
            className="btn btn-danger btn-block mt-16"
            onClick={async () => {
              if (await confirm({ title: 'Apagar a tabela inteira?', message: `${kits.length} kits serão removidos. Orçamentos já salvos não mudam.`, confirm: 'Apagar tudo', danger: true })) {
                await replaceKits([]);
                toast('Tabela apagada');
              }
            }}
          >
            Apagar todos os kits
          </button>
        )}
      </main>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          const list = parseKitsCsv(await f.text());
          if (list.length === 0) {
            toast('Não encontrei kits no arquivo. Confira as colunas.');
            return;
          }
          setImported(list);
        }}
      />

      <Sheet open={!!imported} onClose={() => setImported(null)} title="Importar planilha">
        {imported && (
          <>
            <p style={{ fontSize: 15 }}>Encontrei <b>{imported.length} kits</b> no arquivo.</p>
            <ul className="list mt-12">
              {imported.slice(0, 4).map((k) => (
                <li key={k.id} className="row">
                  <span className="grow"><span className="t">{num(k.gm)} kWh</span><span className="s">{panels(k)}, inversor {k.inverter}{k.phase ? `, ${k.phase.toLowerCase()}` : ''}</span></span>
                  <span className="v num">{brl(k.price)}</span>
                </li>
              ))}
              {imported.length > 4 && <li className="row"><span className="s">e mais {imported.length - 4}</span></li>}
            </ul>
            <div className="sheet-actions col">
              <button className="btn btn-primary" onClick={async () => { await replaceKits(imported); setImported(null); toast(`${imported.length} kits importados`); }}>
                {kits.length ? `Substituir os ${kits.length} kits atuais` : 'Importar'}
              </button>
              {kits.length > 0 && (
                <button className="btn btn-secondary" onClick={async () => { await replaceKits([...kits, ...imported]); setImported(null); toast(`${imported.length} kits somados à tabela`); }}>
                  Somar à tabela atual
                </button>
              )}
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={isNew ? 'Novo kit' : 'Editar kit'}>
        {edit && (
          <>
            <div className="stack">
              <Field label="Geração média por mês" htmlFor="k-gm"><NumberField id="k-gm" value={edit.gm} decimals={0} suffix="kWh" onChange={(n) => set({ gm: Math.round(n) })} /></Field>
              <div className="grid-3">
                <Field label="585 W" htmlFor="k-585"><NumberField id="k-585" value={edit.panel585} decimals={0} onChange={(n) => set({ panel585: Math.round(n) })} /></Field>
                <Field label="610 W" htmlFor="k-610"><NumberField id="k-610" value={edit.panel610} decimals={0} onChange={(n) => set({ panel610: Math.round(n) })} /></Field>
                <Field label="700 W" htmlFor="k-700"><NumberField id="k-700" value={edit.panel700} decimals={0} onChange={(n) => set({ panel700: Math.round(n) })} /></Field>
              </div>
              <Field label="Inversor (potência ou modelo)" htmlFor="k-inv"><input id="k-inv" className="input" value={edit.inverter} onChange={(e) => set({ inverter: e.target.value })} placeholder="Ex.: 6 ou SOFAR 6K" /></Field>
              <Field label="Padrão de ligação (opcional)" htmlFor="k-phase"><input id="k-phase" className="input" value={edit.phase ?? ''} onChange={(e) => set({ phase: e.target.value || undefined })} placeholder="Ex.: Monofásico ou Bi/Trifásico" /></Field>
              <Field label="Preço do kit" htmlFor="k-price"><NumberField id="k-price" value={edit.price} prefix="R$" onChange={(n) => set({ price: n })} /></Field>
            </div>
            <div className="sheet-actions">
              {!isNew ? (
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    if (await confirm({ title: 'Apagar este kit?', confirm: 'Apagar', danger: true })) {
                      await deleteKit(edit.id);
                      setEdit(null);
                    }
                  }}
                >
                  Apagar
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={() => setEdit(null)}>Cancelar</button>
              )}
              <button
                className="btn btn-primary"
                disabled={!edit.gm || !edit.price || !(edit.panel585 || edit.panel610 || edit.panel700)}
                onClick={async () => {
                  await saveKit(edit);
                  setEdit(null);
                  toast(isNew ? 'Kit adicionado' : 'Kit atualizado');
                }}
              >
                Salvar
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
