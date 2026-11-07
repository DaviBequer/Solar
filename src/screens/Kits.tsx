import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, Download, Plus, Search, Upload } from 'lucide-react';
import { Field, NumberField, Sheet, useConfirm, useToast } from '../ui/kit';
import { useStore } from '../data/store';
import { kitsToCsv, parseKitsCsv } from '../core/csv';
import { brl, num, uid } from '../core/format';
import type { Kit } from '../core/types';
import { goBack } from '../router';

function panels(k: Kit): string {
  const parts: string[] = [];
  if (k.panel585) parts.push(`${k.panel585} × 585 W`);
  if (k.panel610) parts.push(`${k.panel610} × 610 W`);
  if (k.panel700) parts.push(`${k.panel700} × 700 W`);
  return parts.join(' + ') || 'Sem módulos';
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

  async function exportCsv() {
    const file = new File([kitsToCsv(kits)], 'tabela-kits.csv', { type: 'text/csv' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch {
        /* baixa se cancelar */
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const set = (patch: Partial<Kit>) => setEdit((k) => (k ? { ...k, ...patch } : k));
  const isNew = edit ? !kits.some((k) => k.id === edit.id) : false;

  return (
    <>
      <div className="subbar">
        <button className="icon-btn" aria-label="Voltar" onClick={() => goBack('/ajustes')}><ChevronLeft size={20} /></button>
        <h1>Tabela de kits</h1>
        <button className="icon-btn" aria-label="Importar planilha" onClick={() => fileRef.current?.click()}><Upload size={19} /></button>
      </div>
      <main className="page full">
        <p className="muted" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.45 }}>
          O orçamento escolhe o menor kit que cobre o consumo com a margem. Para importar, use uma planilha CSV com as colunas GM, 585, 610, 700, Inversor, Valor e Fase (opcional).
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
          <ul className="list">
            {list.map((k) => (
              <li key={k.id}>
                <button className="row" onClick={() => setEdit({ ...k })}>
                  <span className="grow">
                    <span className="t">{num(k.gm)} kWh por mês</span>
                    <span className="s">{panels(k)}, inversor {k.inverter || '—'}{k.phase ? `, ${k.phase.toLowerCase()}` : ''}</span>
                  </span>
                  <span className="v num" style={{ fontSize: 14, fontWeight: 600 }}>{brl(k.price)}</span>
                </button>
              </li>
            ))}
          </ul>
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
