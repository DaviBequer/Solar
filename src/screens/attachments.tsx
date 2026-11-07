import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Trash2, X } from 'lucide-react';
import { useConfirm, useToast } from '../ui/kit';
import { useStore } from '../data/store';
import { useLayer } from '../router';
import { shrinkPhoto } from '../ui/images';
import type { Attachment, Lead } from '../core/types';

const isImage = (a: Attachment) => a.type.startsWith('image/');

/** Anexos do cliente: escolher, miniaturas e visualizador. */
export function Attachments({ lead }: { lead: Lead }) {
  const { addAttachment, removeAttachment, fileUrl } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewer, setViewer] = useState<{ att: Attachment; url: string } | null>(null);

  async function open(att: Attachment) {
    const url = await fileUrl(att.id);
    if (url) setViewer({ att, url });
  }

  return (
    <>
      <div className="attachments">
        <button className="add-tile" onClick={() => fileRef.current?.click()}>
          <Camera size={20} />
          Foto ou arquivo
        </button>
        {lead.attachments.map((a) => (
          <Thumb key={a.id} att={a} onOpen={() => open(a)} />
        ))}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          await addAttachment(lead.id, await shrinkPhoto(f));
          toast('Anexo salvo');
        }}
      />
      {viewer && (
        <Viewer
          att={viewer.att}
          url={viewer.url}
          onClose={() => setViewer(null)}
          onDelete={async () => {
            if (await confirm({ title: 'Apagar este anexo?', confirm: 'Apagar', danger: true })) {
              setViewer(null);
              await removeAttachment(lead.id, viewer.att.id);
            }
          }}
        />
      )}
    </>
  );
}

function Thumb({ att, onOpen }: { att: Attachment; onOpen: () => void }) {
  const { fileUrl } = useStore();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fileUrl(att.id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [att.id, fileUrl]);
  return (
    <button className="thumb" onClick={onOpen} aria-label={`Abrir ${att.name}`}>
      {url && isImage(att) ? <img src={url} alt="" /> : <span className="muted" style={{ fontSize: 11, padding: 6, display: 'block' }}>{att.name}</span>}
    </button>
  );
}

function Viewer({ att, url, onClose, onDelete }: { att: Attachment; url: string; onClose: () => void; onDelete: () => void }) {
  useLayer(true, onClose);
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Anexo">
      {isImage(att) ? (
        <img src={url} alt="Anexo" />
      ) : (
        // PDF: o navegador do celular não mostra embutido, então o botão Abrir leva ao arquivo
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#fff', padding: 24, textAlign: 'center' }}>
          <FileText size={48} aria-hidden="true" />
          <span style={{ fontSize: 15, overflowWrap: 'anywhere' }}>{att.name}</span>
        </div>
      )}
      <div className="bar">
        <button className="btn btn-danger" onClick={onDelete}><Trash2 size={17} />Apagar</button>
        <a className="btn btn-secondary" href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Abrir</a>
        <button className="btn btn-secondary" onClick={onClose}><X size={17} />Fechar</button>
      </div>
    </div>
  );
}
