import { useEffect, useState } from 'react';
import { Field, Sheet, useToast } from '../ui/kit';
import { useStore } from '../data/store';
import { buildContract, contractMissing, defaultPayment } from '../core/contract';
import { cepMask, documentMask } from '../core/format';
import type { Lead, Proposal } from '../core/types';
import { navigate } from '../router';
import { DOCX_TYPE, deliverFile } from '../ui/deliver';

export function ContractSheet({ open, onClose, lead, proposal }: { open: boolean; onClose: () => void; lead: Lead; proposal: Proposal | null }) {
  const { settings, updateLead } = useStore();
  const toast = useToast();
  const [document, setDocument] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !proposal) return;
    setDocument(lead.document ?? '');
    setBirthDate(lead.birthDate ?? '');
    setCep(lead.cep ?? '');
    setAddress(lead.address);
    setPayment(defaultPayment(proposal));
    // shortcut: o texto do pagamento não fica salvo e volta ao padrão a cada geração; guardar se for preciso reemitir igual.
  }, [open, proposal, lead]);

  if (!settings.contractTemplate) {
    return (
      <Sheet open={open} onClose={onClose} title="Gerar contrato">
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>Importe o modelo de contrato em Ajustes para gerar o PDF.</p>
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onClose(); navigate('/ajustes'); }}>Ir para Ajustes</button>
        </div>
      </Sheet>
    );
  }

  const isCompany = document.replace(/\D/g, '').length === 14;
  const data = { document, birthDate: isCompany ? '' : birthDate, cep, address: address.trim() };
  const missing = contractMissing({ ...lead, ...data });
  if (!payment.trim()) missing.push('forma de pagamento');

  async function generate(format: 'pdf' | 'word') {
    if (!proposal || !settings.contractTemplate) return;
    setBusy(true);
    try {
      const next: Lead = { ...lead, ...data, ...(data.address !== lead.address ? { lat: null, lng: null } : {}) };
      await updateLead(lead.id, { document: next.document, birthDate: next.birthDate, cep: next.cep, address: next.address, lat: next.lat, lng: next.lng });
      const blocks = buildContract(settings.contractTemplate, next, proposal, payment);
      const name = `Contrato ${proposal.number} - ${lead.name}`;
      let file: File;
      if (format === 'word') {
        const { blocksToDocx } = await import('../core/contract-docx');
        file = new File([blocksToDocx(blocks).slice()], `${name}.docx`, { type: DOCX_TYPE });
      } else {
        const { contractPdf } = await import('../core/contract-pdf');
        file = new File([(await contractPdf(blocks, settings.companyLogo)).output('blob')], `${name}.pdf`, { type: 'application/pdf' });
      }
      if ((await deliverFile(file, 'Contrato')) === 'downloaded') toast('Contrato baixado');
      onClose();
    } catch {
      toast('Não foi possível gerar o contrato');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Gerar contrato">
      <div className="stack">
        <Field label="CPF ou CNPJ" htmlFor="ct-doc"><input id="ct-doc" className="input" inputMode="numeric" value={document} onChange={(e) => setDocument(documentMask(e.target.value))} /></Field>
        {!isCompany && <Field label="Data de nascimento" htmlFor="ct-birth"><input id="ct-birth" className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></Field>}
        <Field label="Endereço da instalação" htmlFor="ct-addr"><textarea id="ct-addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade/UF" style={{ minHeight: 64 }} /></Field>
        <Field label="CEP" htmlFor="ct-cep"><input id="ct-cep" className="input" inputMode="numeric" value={cep} onChange={(e) => setCep(cepMask(e.target.value))} placeholder="00000-000" /></Field>
        <Field label="Forma de pagamento no contrato" htmlFor="ct-pay"><input id="ct-pay" className="input" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="à vista via banco" /></Field>
      </div>
      {missing.length > 0 && <p className="muted" style={{ fontSize: 13, marginTop: 10 }} role="status">Falta preencher: {missing.join(', ')}.</p>}
      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-secondary" disabled={missing.length > 0 || busy} onClick={() => generate('word')}>Word</button>
        <button className="btn btn-primary" disabled={missing.length > 0 || busy} onClick={() => generate('pdf')}>{busy ? 'Gerando…' : 'PDF'}</button>
      </div>
    </Sheet>
  );
}
