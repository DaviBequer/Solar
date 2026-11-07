import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { useLayer } from '../router';
import { num, parseBR } from '../core/format';

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useLayer(open, onClose);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Teclado aberto: a folha sobe acima dele (iPhone e Android que não encolhem a página)
    const vv = window.visualViewport;
    const fit = () => box.current?.style.setProperty('--kb', `${vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0}px`);
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    fit();
    return () => {
      document.body.style.overflow = prev;
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" ref={box} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn sm" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}

/* ---------- aviso rápido ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ---------- confirmação ---------- */
interface ConfirmOpts {
  title: string;
  message?: string;
  confirm: string;
  danger?: boolean;
}
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

function ConfirmDialog({ opts, onDone }: { opts: ConfirmOpts; onDone: (ok: boolean) => void }) {
  useLayer(true, () => onDone(false));
  return createPortal(
    <>
      <div className="backdrop top" onClick={() => onDone(false)} />
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="cf-t">
        <h2 id="cf-t">{opts.title}</h2>
        {opts.message && <p>{opts.message}</p>}
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={() => onDone(false)}>Cancelar</button>
          <button className={`btn ${opts.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => onDone(true)} autoFocus>{opts.confirm}</button>
        </div>
      </div>
    </>,
    document.body,
  );
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [confirm, setConfirm] = useState<{ opts: ConfirmOpts; resolve: (v: boolean) => void } | null>(null);

  const show = useCallback((msg: string) => setToast({ id: Date.now(), msg }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const ask = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirm({ opts, resolve })), []);

  return (
    <ToastCtx.Provider value={show}>
      <ConfirmCtx.Provider value={ask}>
        {children}
        {toast && (
          <div className="toast" role="status" key={toast.id}>
            <Check size={16} />
            {toast.msg}
          </div>
        )}
        {confirm && (
          <ConfirmDialog
            opts={confirm.opts}
            onDone={(ok) => {
              confirm.resolve(ok);
              setConfirm(null);
            }}
          />
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

/* ---------- campos numéricos ---------- */

/** Campo numérico que aceita vírgula. Mantém o texto enquanto a pessoa digita. */
export function NumberField({
  value, onChange, decimals = 2, prefix, suffix, id, label, placeholder, className = 'input', style,
}: {
  value: number | null;
  onChange: (n: number) => void;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const fmt = (n: number | null) => (n === null || n === 0 ? '' : num(n, Number.isInteger(n) ? 0 : decimals));
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const input = (
    <input
      id={id}
      className={`${className}${prefix ? ' has-prefix' : ''}${suffix ? ' has-suffix' : ''}`}
      inputMode="decimal"
      value={text}
      placeholder={placeholder ?? '0'}
      aria-label={label}
      style={style}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setText(fmt(value));
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '');
        setText(t);
        onChange(parseBR(t));
      }}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <div className="input-wrap">
      {prefix && <span className="prefix">{prefix}</span>}
      {input}
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
}

export function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
