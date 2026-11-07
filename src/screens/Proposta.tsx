import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, Download, Pencil, Send } from 'lucide-react';
import { useStore } from '../data/store';
import { useToast } from '../ui/kit';
import { goBack, navigate } from '../router';
import { whatsappUrl } from '../core/links';
import { ProposalDoc } from './ProposalDoc';
import { deliverFile } from '../ui/deliver';

async function makePdf(source: HTMLElement): Promise<Blob> {
  const { default: html2pdf } = await import('html2pdf.js');
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;z-index:-1;';
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.boxShadow = 'none';
  clone.style.height = '1120px';
  clone.style.minHeight = '1120px';
  clone.style.overflow = 'hidden';
  holder.appendChild(clone);
  document.body.appendChild(holder);
  try {
    await document.fonts?.ready;
    return await html2pdf()
      .set({
        margin: 0,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] },
      })
      .from(clone)
      .outputPdf('blob');
  } finally {
    document.body.removeChild(holder);
  }
}

export default function Proposta({ id }: { id: string }) {
  const { proposals, leads, settings, setProposalStatus, openProposalInDraft } = useStore();
  const toast = useToast();
  const proposal = proposals.find((p) => p.id === id);
  const lead = proposal ? leads.find((l) => l.id === proposal.leadId) ?? null : null;
  const stageRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);
  const [busy, setBusy] = useState<null | 'baixar' | 'enviar'>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / 794));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (proposal) document.title = `Proposta ${proposal.number} — Sonit`;
    return () => {
      document.title = 'Sonit';
    };
  }, [proposal]);

  if (!proposal) {
    return (
      <main className="page full">
        <div className="subbar" style={{ padding: '14px 0 0' }}>
          <button className="icon-btn" aria-label="Voltar" onClick={() => goBack('/clientes')}><ChevronLeft size={20} /></button>
        </div>
        <div className="card empty mt-16"><strong>Proposta não encontrada</strong>Ela pode ter sido apagada.</div>
      </main>
    );
  }

  const fileName = `Proposta ${proposal.number} - ${lead?.name ?? 'cliente'}.pdf`;
  const markSent = async () => {
    if (proposal.status === 'rascunho') await setProposalStatus(proposal.id, 'enviado');
  };

  async function download() {
    if (!docRef.current) return;
    setBusy('baixar');
    try {
      const blob = await makePdf(docRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('PDF baixado');
    } catch {
      toast('Não foi possível gerar o PDF');
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!docRef.current) return;
    setBusy('enviar');
    try {
      const blob = await makePdf(docRef.current);
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const first = lead?.name.split(' ')[0] ?? '';
      const text = `Olá${first ? `, ${first}` : ''}! Segue a sua proposta de energia solar.`;
      const how = await deliverFile(file, 'Proposta de energia solar', text);
      if (how === 'cancelled') return;
      if (how === 'downloaded') {
        const phone = lead?.phone.replace(/\D/g, '');
        if (phone) window.open(whatsappUrl(phone, text), '_blank');
        toast('PDF baixado. Anexe na conversa do WhatsApp.');
      }
      await markSent();
    } catch {
      toast('Não foi possível gerar o PDF');
    } finally {
      setBusy(null);
    }
  }

  const missingBrand = !settings.companyName && !settings.companyLogo;

  return (
    <>
      <div className="subbar no-print">
        <button className="icon-btn" aria-label="Voltar" onClick={() => goBack(lead ? `/clientes/${lead.id}` : '/clientes')}><ChevronLeft size={20} /></button>
        <h1>Proposta nº {proposal.number}</h1>
        <button className="icon-btn" aria-label="Editar orçamento" onClick={() => { openProposalInDraft(proposal); navigate('/orcamento', true); }}><Pencil size={18} /></button>
      </div>
      <main className="page full" style={{ paddingBottom: 'calc(var(--safe-b) + 100px)' }}>
        {missingBrand && (
          <div className="notice mt-12 no-print">
            <span style={{ flex: 1 }}>Sua logo e o nome da empresa ainda não aparecem na proposta.</span>
            <button className="link-btn" onClick={() => navigate('/ajustes')}>Adicionar</button>
          </div>
        )}
        <div className="doc-stage" ref={stageRef}>
          <div style={{ height: 1123 * scale, overflow: 'hidden' }}>
            <div className="doc-scale" style={{ transform: `scale(${scale})`, width: 794 }}>
              <ProposalDoc ref={docRef} proposal={proposal} lead={lead} settings={settings} />
            </div>
          </div>
        </div>
      </main>
      <div className="doc-actions no-print">
        <button className="btn btn-secondary" onClick={download} disabled={!!busy}>
          <Download size={18} />
          {busy === 'baixar' ? 'Gerando…' : 'Baixar PDF'}
        </button>
        <button className="btn btn-primary" onClick={send} disabled={!!busy}>
          <Send size={18} />
          {busy === 'enviar' ? 'Gerando…' : 'Enviar'}
        </button>
      </div>
    </>
  );
}
