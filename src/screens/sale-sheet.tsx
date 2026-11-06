import { useEffect, useState } from 'react';
import { Field, NumberField, Sheet } from '../ui/kit';
import { PAY_LABEL } from '../core/defaults';
import { brl } from '../core/format';
import type { Proposal } from '../core/types';

export function SaleSheet({ open, onClose, proposals, onConfirm }: { open: boolean; onClose: () => void; proposals: Proposal[]; onConfirm: (proposalId: string, value: number, manual: boolean) => void }) {
  const [pid, setPid] = useState<string>('');
  const [manual, setManual] = useState(false);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!open) return;
    const pick = proposals.find((p) => p.status === 'aprovado') ?? proposals.find((p) => p.status === 'enviado') ?? proposals[0];
    setPid(pick?.id ?? '');
    setManual(false);
    setValue(pick?.result.commission.gross ?? 0);
  }, [open, proposals]);
  const chosen = proposals.find((p) => p.id === pid);
  const computed = chosen?.result.commission.gross ?? 0;
  return (
    <Sheet open={open} onClose={onClose} title="Fechar venda">
      <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Qual orçamento o cliente aprovou?</p>
      <ul className="list" role="radiogroup" aria-label="Orçamento aprovado">
        {proposals.map((p) => (
          <li key={p.id}>
            <button className="row" role="radio" aria-checked={pid === p.id} onClick={() => setPid(p.id)}>
              <span className="grow">
                <span className="t num">{brl(p.result.finalPrice)}</span>
                <span className="s">nº {p.number}, {p.result.modules} × {p.result.panelW} W, {PAY_LABEL[p.input.payment.method].toLowerCase()}</span>
              </span>
              <span className="check" aria-hidden="true" style={pid === p.id ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--gold)' } : undefined}>✓</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="section-title">Comissão</p>
      <div className="seg white" role="radiogroup" aria-label="Como calcular a comissão">
        <button role="radio" aria-checked={!manual} onClick={() => setManual(false)}>Calculada {brl(computed)}</button>
        <button role="radio" aria-checked={manual} onClick={() => { setManual(true); setValue(computed); }}>Outro valor</button>
      </div>
      {manual && (
        <div className="mt-12">
          <Field label="Valor da comissão" htmlFor="sale-com">
            <NumberField id="sale-com" value={value} onChange={setValue} prefix="R$" />
          </Field>
        </div>
      )}
      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!chosen} onClick={() => chosen && onConfirm(chosen.id, manual ? value : computed, manual)}>Confirmar venda</button>
      </div>
    </Sheet>
  );
}
