import { useRef, useState, type ReactNode } from 'react';
import { Bell, ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';
import { Field, NumberField, Sheet, useConfirm, useToast } from '../ui/kit';
import { useStore } from '../data/store';
import { brl, num, phoneMask } from '../core/format';
import { withSettings } from '../core/quote';
import { parseTemplate, templateProblem } from '../core/contract';
import type { Settings } from '../core/types';
import { goBack, navigate } from '../router';
import { parseBackup } from '../data/backup';
import { askNotificationPermission } from '../reminders';
import { APP_VERSION } from '../ui/chrome';
import { DOCX_TYPE, deliverFile } from '../ui/deliver';
import { logoDataUrl } from '../ui/images';

type NumKey = { [K in keyof Settings]-?: Settings[K] extends number ? K : never }[keyof Settings];
interface NumSpec { key: NumKey; label: string; prefix?: string; suffix?: string; decimals?: number }

const GROUPS: Record<string, { title: string; hint?: string; fields: NumSpec[] }> = {
  tarifa: { title: 'Tarifa de energia', hint: 'Usada para converter a conta em kWh e calcular a economia.', fields: [{ key: 'tariff', label: 'Tarifa (R$ por kWh)', decimals: 3 }] },
  margem: { title: 'Margem de segurança', hint: 'O sistema é dimensionado para gerar esse tanto a mais que o consumo.', fields: [{ key: 'safetyMargin', label: 'Margem', suffix: '%', decimals: 0 }] },
  iluminacao: { title: 'Iluminação pública', hint: 'Valor que continua na conta depois da energia solar. Deixe 0 se não quiser considerar.', fields: [{ key: 'lightingFee', label: 'Valor por mês', prefix: 'R$' }] },
  fiob: {
    title: 'Fio B (Lei 14.300)',
    hint: 'Cobrado sobre a energia compensada. O valor varia por distribuidora e o percentual sobe a cada ano: 60% em 2026. Deixe o valor em 0 se não quiser considerar.',
    fields: [
      { key: 'fioB', label: 'Fio B (R$ por kWh)', decimals: 3 },
      { key: 'fioBPct', label: 'Percentual do ano', suffix: '%', decimals: 0 },
    ],
  },
  financiamento: {
    title: 'Financiamento',
    hint: 'IOF e spread são somados ao valor financiado antes do cálculo da parcela.',
    fields: [
      { key: 'interestRate', label: 'Juros ao mês (padrão)', suffix: '%' },
      { key: 'installments', label: 'Parcelas (padrão)', decimals: 0, suffix: 'x' },
      { key: 'iof', label: 'IOF', suffix: '%' },
      { key: 'spread', label: 'Spread', suffix: '%' },
    ],
  },
  comissao: {
    title: 'Comissão e imposto',
    hint: 'Comissão = percentual sobre a venda + parte do que passar do preço da tabela. O imposto é descontado da comissão.',
    fields: [
      { key: 'commissionPct', label: 'Comissão sobre a venda', suffix: '%' },
      { key: 'overpriceSharePct', label: 'Parte do sobrepreço', suffix: '%', decimals: 0 },
      { key: 'taxPct', label: 'Imposto sobre a comissão', suffix: '%' },
    ],
  },
  adicionais: {
    title: 'Adicionais e regras',
    fields: [
      { key: 'lajeExtra', label: 'Acréscimo para laje', prefix: 'R$' },
      { key: 'hybridThreshold', label: 'Híbrido e bateria: limite de módulos', decimals: 0 },
      { key: 'hybridCostLow', label: 'Custo extra até o limite', prefix: 'R$' },
      { key: 'hybridCostHigh', label: 'Custo extra acima do limite', prefix: 'R$' },
      { key: 'batteryPrice', label: 'Preço de cada bateria', prefix: 'R$' },
      { key: 'expansionModulePrice', label: 'Ampliação: preço por módulo', prefix: 'R$' },
      { key: 'productivity', label: 'Geração por kWp, quando não há kit', suffix: 'kWh', decimals: 0 },
    ],
  },
  meta: { title: 'Meta de vendas por mês', fields: [{ key: 'monthlyGoal', label: 'Meta', prefix: 'R$' }] },
  validade: { title: 'Validade da proposta', fields: [{ key: 'proposalValidityDays', label: 'Dias', decimals: 0, suffix: 'dias' }] },
};

function Row({ label, value, sub, onClick }: { label: string; value?: ReactNode; sub?: string; onClick: () => void }) {
  return (
    <li>
      <button className="row" onClick={onClick}>
        <span className="grow">
          <span className="t" style={{ fontSize: 14 }}>{label}</span>
          {sub && <span className="s">{sub}</span>}
        </span>
        {value !== undefined && <span className="v num" style={{ textAlign: 'right' }}>{value}</span>}
        <ChevronRight size={16} className="chev" />
      </button>
    </li>
  );
}

export default function Ajustes() {
  const { settings, updateSettings, kits, setDraft, exportBackup, importBackup } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [group, setGroup] = useState<string | null>(null);
  const [vals, setVals] = useState<Partial<Settings>>({});
  const [textSheet, setTextSheet] = useState<null | 'empresa' | 'vendedor'>(null);
  const [company, setCompany] = useState('');
  const [seller, setSeller] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const contractRef = useRef<HTMLInputElement>(null);
  const [notifState, setNotifState] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));

  const openGroup = (g: string) => {
    const v: Partial<Settings> = {};
    for (const f of GROUPS[g].fields) (v as Record<string, number>)[f.key] = settings[f.key] as number;
    setVals(v);
    setGroup(g);
  };

  async function saveGroup() {
    await updateSettings(vals);
    setDraft((d) => withSettings(d, vals));
    setGroup(null);
    toast('Ajuste salvo');
  }

  async function doExport() {
    try {
      const b = await exportBackup();
      const json = JSON.stringify(b);
      const d = new Date();
      const name = `sonit-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
      const file = new File([json], name, { type: 'application/json' });
      const how = await deliverFile(file, 'Backup do Sonit');
      if (how === 'cancelled') return;
      if (how === 'downloaded') toast('Backup baixado');
      // Só agora: se a geração falhar ou for cancelada, o aviso de 7 dias continua aparecendo
      await updateSettings({ lastBackupAt: b.exportedAt });
    } catch {
      toast('Não foi possível gerar o backup');
    }
  }

  async function exportContract(template: string) {
    const { blocksToDocx } = await import('../core/contract-docx');
    await deliverFile(new File([blocksToDocx(parseTemplate(template)).slice()], 'Modelo de contrato.docx', { type: DOCX_TYPE }), 'Modelo de contrato');
    toast('Modelo exportado');
  }

  async function doRestore(f: File) {
    try {
      const b = parseBackup(await f.text());
      const ok = await confirm({
        title: 'Restaurar este backup?',
        message: `${b.leads.length} clientes, ${b.proposals.length} orçamentos e ${b.kits.length} kits. Tudo o que está no app agora será substituído.`,
        confirm: 'Restaurar',
        danger: true,
      });
      if (!ok) return;
      await importBackup(b);
      toast('Backup restaurado');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível ler o arquivo');
    }
  }

  const g = group ? GROUPS[group] : null;
  const pct = (n: number) => `${num(n, Number.isInteger(n) ? 0 : 2)}%`;

  return (
    <>
      <div className="subbar">
        <button className="icon-btn" aria-label="Voltar" onClick={() => goBack('/orcamento')}><ChevronLeft size={20} /></button>
        <h1>Ajustes</h1>
      </div>
      <main className="page full">
        <h2 className="section-title">Na proposta</h2>
        <ul className="list">
          <li>
            <button className="row" onClick={() => logoRef.current?.click()}>
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: 'var(--rule)' }} />
              ) : (
                <span style={{ width: 40, height: 40, borderRadius: 10, border: '1.5px dashed #b9c0cf', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}><ImagePlus size={18} /></span>
              )}
              <span className="grow"><span className="t" style={{ fontSize: 14 }}>Logo da empresa</span></span>
              <span className="link-btn">{settings.companyLogo ? 'Trocar' : 'Escolher'}</span>
            </button>
          </li>
          <Row label="Nome da empresa" value={settings.companyName || <span className="muted">Não definido</span>} onClick={() => { setCompany(settings.companyName); setTextSheet('empresa'); }} />
          <Row label="Seu nome e WhatsApp" value={settings.sellerName || <span className="muted">Não definido</span>} onClick={() => { setSeller(settings.sellerName); setSellerPhone(settings.sellerPhone); setTextSheet('vendedor'); }} />
          <Row label="Validade da proposta" value={`${settings.proposalValidityDays} dias`} onClick={() => openGroup('validade')} />
        </ul>
        {settings.companyLogo && (
          <button className="link-btn" style={{ marginTop: 8 }} onClick={() => updateSettings({ companyLogo: null })}>Remover logo</button>
        )}
        <input
          ref={logoRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            await updateSettings({ companyLogo: await logoDataUrl(f) });
            toast('Logo salva');
          }}
        />

        <h2 className="section-title">Contrato</h2>
        <ul className="list">
          <Row label="Importar modelo" sub="Word ou texto. Fica só neste aparelho e entra no backup" value={settings.contractTemplate ? 'Importado' : <span className="muted">Não importado</span>} onClick={() => contractRef.current?.click()} />
          {settings.contractTemplate && <Row label="Exportar em Word" sub="Para editar e importar de novo" onClick={() => exportContract(settings.contractTemplate!)} />}
        </ul>
        <input
          ref={contractRef}
          type="file"
          accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            let text: string;
            try {
              const { docxToTemplate } = await import('../core/contract-docx');
              text = /\.docx$/i.test(f.name) ? await docxToTemplate(new Uint8Array(await f.arrayBuffer())) : await f.text();
            } catch {
              return toast('Não foi possível ler este arquivo');
            }
            const problem = templateProblem(text);
            if (problem) return toast(problem);
            await updateSettings({ contractTemplate: text });
            toast('Modelo importado');
          }}
        />

        <h2 className="section-title">Cálculo</h2>
        <ul className="list">
          <Row label="Tarifa de energia" value={`R$ ${num(settings.tariff, 2)} por kWh`} onClick={() => openGroup('tarifa')} />
          <Row label="Margem de segurança" value={pct(settings.safetyMargin)} onClick={() => openGroup('margem')} />
          <Row label="Iluminação pública" value={settings.lightingFee ? brl(settings.lightingFee) : 'Não considerada'} onClick={() => openGroup('iluminacao')} />
          <Row label="Fio B" value={settings.fioB ? `R$ ${num(settings.fioB, 3)} por kWh, ${pct(settings.fioBPct)}` : 'Não considerado'} onClick={() => openGroup('fiob')} />
          <Row label="Financiamento" value={`${pct(settings.interestRate)} ao mês`} onClick={() => openGroup('financiamento')} />
          <Row label="Comissão e imposto" value={`${pct(settings.commissionPct)} e ${pct(settings.taxPct)}`} onClick={() => openGroup('comissao')} />
        </ul>

        <h2 className="section-title">Preços e metas</h2>
        <ul className="list">
          <Row label="Tabela de kits" sub={kits.length === 0 ? 'Vazia: importe a planilha' : `${kits.length} ${kits.length === 1 ? 'kit' : 'kits'}`} onClick={() => navigate('/kits')} />
          <Row label="Adicionais e regras" sub="Laje, híbrido, bateria e ampliação" onClick={() => openGroup('adicionais')} />
          <Row label="Meta de vendas por mês" value={settings.monthlyGoal ? brl(settings.monthlyGoal) : 'Sem meta'} onClick={() => openGroup('meta')} />
        </ul>

        <h2 className="section-title">Lembretes</h2>
        <section className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell size={18} className="chev" />
          <span style={{ flex: 1, fontSize: 14 }}>
            {notifState === 'granted' ? 'Notificações ativadas' : notifState === 'denied' ? 'Notificações bloqueadas no navegador' : notifState === 'unsupported' ? 'Este navegador não mostra notificações' : 'Notificações desativadas'}
            <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>Os lembretes aparecem com o app aberto ou usado há pouco.</span>
          </span>
          {notifState === 'default' && (
            <button className="btn btn-secondary btn-sm" onClick={async () => { await askNotificationPermission(); setNotifState(Notification.permission); }}>Ativar</button>
          )}
        </section>

        <h2 className="section-title">Seus dados</h2>
        <section className="card pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14 }}>Backup</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {settings.lastBackupAt ? `Último: ${new Date(settings.lastBackupAt).toLocaleDateString('pt-BR')} às ${new Date(settings.lastBackupAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Nenhum backup feito ainda'}
              </span>
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => restoreRef.current?.click()}>Restaurar</button>
            <button className="btn btn-primary btn-sm" onClick={doExport}>Exportar</button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.45 }}>Os dados ficam só neste aparelho. Exporte um backup de vez em quando e guarde no Drive ou no WhatsApp. O restaurar também aceita o backup do app antigo.</p>
        </section>
        <input
          ref={restoreRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) await doRestore(f);
          }}
        />

        <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 24 }}>Sonit {APP_VERSION}</p>
      </main>

      <Sheet open={!!g} onClose={() => setGroup(null)} title={g?.title ?? ''}>
        {g && (
          <>
            {g.hint && <p className="muted" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.45 }}>{g.hint}</p>}
            <div className="stack">
              {g.fields.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={`aj-${f.key}`}>
                  <NumberField id={`aj-${f.key}`} value={(vals[f.key] as number) ?? 0} decimals={f.decimals ?? 2} prefix={f.prefix} suffix={f.suffix} onChange={(n) => setVals((v) => ({ ...v, [f.key]: n }))} />
                </Field>
              ))}
            </div>
            <div className="sheet-actions">
              <button className="btn btn-secondary" onClick={() => setGroup(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveGroup}>Salvar</button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={textSheet === 'empresa'} onClose={() => setTextSheet(null)} title="Nome da empresa">
        <Field label="Aparece no topo da proposta" htmlFor="aj-empresa">
          <input id="aj-empresa" className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
        </Field>
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={() => setTextSheet(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={async () => { await updateSettings({ companyName: company.trim() }); setTextSheet(null); }}>Salvar</button>
        </div>
      </Sheet>

      <Sheet open={textSheet === 'vendedor'} onClose={() => setTextSheet(null)} title="Seus dados na proposta">
        <div className="stack">
          <Field label="Seu nome" htmlFor="aj-nome"><input id="aj-nome" className="input" value={seller} onChange={(e) => setSeller(e.target.value)} /></Field>
          <Field label="Seu WhatsApp" htmlFor="aj-fone"><input id="aj-fone" className="input" inputMode="tel" value={sellerPhone} onChange={(e) => setSellerPhone(phoneMask(e.target.value))} placeholder="(00) 00000-0000" /></Field>
        </div>
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={() => setTextSheet(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={async () => { await updateSettings({ sellerName: seller.trim(), sellerPhone }); setTextSheet(null); }}>Salvar</button>
        </div>
      </Sheet>
    </>
  );
}
