import { useEffect, useState } from 'react';
import { Field, Sheet, useToast } from '../ui/kit';
import { useStore } from '../data/store';
import { companyMissing, contractMissing, contractValues, defaultPayment } from '../core/contract';
import { cepMask, documentMask } from '../core/format';
import type { Lead, Proposal } from '../core/types';
import { navigate } from '../router';
import { deliverFile } from '../ui/deliver';
import { contractFile } from './contract-file';

export function ContractSheet({ open, onClose, lead, proposal }: { open: boolean; onClose: () => void; lead: Lead; proposal: Proposal | null }) {
  const { settings, updateLead, closeSale } = useStore();
  const toast = useToast();
  const [document, setDocument] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('');
  const [busy, setBusy] = useState(false);
  // Contrato gerado quase sempre é venda fechada: já marca, e a ficha tem o botão Cancelou
  const [markSold, setMarkSold] = useState(true);

  useEffect(() => {
    if (!open || !proposal) return;
    setDocument(lead.document ?? '');
    setBirthDate(lead.birthDate ?? '');
    setCep(lead.cep ?? '');
    setAddress(lead.address);
    setPayment(defaultPayment(proposal));
    setMarkSold(true);
    // shortcut: o texto do pagamento não fica salvo e volta ao padrão a cada geração; guardar se for preciso reemitir igual.
  }, [open, proposal, lead]);

  const noCompany = companyMissing(settings.company);
  if (noCompany.length) {
    return (
      <Sheet open={open} onClose={onClose} title="Gerar contrato">
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>Preencha os dados da empresa em Ajustes. Falta: {noCompany.join(', ')}.</p>
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
    if (!proposal) return;
    setBusy(true);
    try {
      const next: Lead = { ...lead, ...data, ...(data.address !== lead.address ? { lat: null, lng: null } : {}) };
      await updateLead(lead.id, { document: next.document, birthDate: next.birthDate, cep: next.cep, address: next.address, lat: next.lat, lng: next.lng });
      const result = await deliverFile(await contractFile(settings, next, proposal, payment, format), 'Contrato');
      const selling = markSold && lead.status !== 'vendido';
      if (selling) await closeSale(lead.id, proposal.id, { value: proposal.result.commission.gross, manual: false });
      if (result === 'downloaded' || selling) toast(selling ? 'Contrato gerado e cliente marcado como vendido' : 'Contrato baixado');
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
      {proposal && missing.length === 0 && (() => {
        const v = contractValues({ ...lead, ...data }, proposal, payment, settings.company);
        const line = (k: string, value: string) => <div className="kv" key={k}><span className="k">{k}</span><span className="v num" style={{ textAlign: 'right', overflowWrap: 'anywhere', minWidth: 0 }}>{value}</span></div>;
        return (
          <>
            <p className="section-title">Confira antes de gerar</p>
            <div className="card pad">
              <p className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Cliente</p>
              {line('Nome', v.nome)}
              {line('Dados', v.qualificacao)}
              {line('Endereço', v.endereco)}
            </div>
            <div className="card pad mt-12">
              <p className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Empresa</p>
              {line('Razão social', v.empresa)}
              {line('CNPJ', v.empresaCnpj)}
              {line('Sede', v.empresaSede)}
              {line('Representante', v.representante)}
              {line('Foro', `${v.cidadeMaiuscula}-${v.uf}`)}
              <button className="link-btn" style={{ marginTop: 6 }} onClick={() => { onClose(); navigate('/ajustes'); }}>Corrigir em Ajustes</button>
            </div>
            <div className="card pad mt-12">
              <p className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Sistema e valor</p>
              {line('Geração', `${v.geracao} kW/m e ${v.kwp} kWp`)}
              {line('Módulos', `${v.modulos} × ${v.modulo}`)}
              {line('Inversor', v.inversor)}
              {line('Valor', v.valor)}
              {line('Pagamento', v.pagamento)}
              {line('Data', v.data)}
            </div>
            {!settings.contractLogo && <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>O contrato sairá sem logo. Escolha a logo do contrato em Ajustes, em Dados da empresa.</p>}
          </>
        );
      })()}
      {lead.status !== 'vendido' && (
        <label className="card pad mt-12" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={markSold} onChange={(e) => setMarkSold(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--ink)' }} />
          Marcar o cliente como vendido
        </label>
      )}
      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-secondary" disabled={missing.length > 0 || busy} onClick={() => generate('word')}>Word</button>
        <button className="btn btn-primary" disabled={missing.length > 0 || busy} onClick={() => generate('pdf')}>{busy ? 'Gerando…' : 'Gerar PDF'}</button>
      </div>
    </Sheet>
  );
}
