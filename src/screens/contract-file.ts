import { contractValues } from '../core/contract';
import { base64ToBytes, fillDocx, placeLogo, readDocx, writeDocx, type DocxParts } from '../core/contract-docx';
import type { Lead, Proposal, Settings } from '../core/types';
import { DOCX_TYPE } from '../ui/deliver';
import regular from '../assets/fonts/Caladea-Regular.ttf?url';
import bold from '../assets/fonts/Caladea-Bold.ttf?url';
import headingBold from '../assets/fonts/Carlito-Bold.ttf?url';

const logoBytes = (dataUrl: string | null) => (dataUrl?.startsWith('data:image/png;base64,') ? base64ToBytes(dataUrl.split(',')[1]) : null);

async function modelParts(settings: Settings): Promise<DocxParts> {
  const b64 = settings.contractDocx ?? (await import('../data/contract-base')).default;
  return placeLogo(await readDocx(base64ToBytes(b64)), logoBytes(settings.companyLogo));
}

async function fontBase64(url: string): Promise<string> {
  const { bytesToBase64 } = await import('../core/contract-docx');
  return bytesToBase64(new Uint8Array(await (await fetch(url)).arrayBuffer()));
}

/** O modelo em Word, com os campos à mostra, para editar e importar de novo. */
export async function modelFile(settings: Settings): Promise<File> {
  return new File([writeDocx(await modelParts(settings)).slice()], 'Modelo de contrato.docx', { type: DOCX_TYPE });
}

export async function contractFile(settings: Settings, lead: Lead, proposal: Proposal, payment: string, format: 'pdf' | 'word'): Promise<File> {
  const parts = fillDocx(await modelParts(settings), contractValues(lead, proposal, payment, settings.company));
  const name = `Contrato ${proposal.number} - ${lead.name}`;
  if (format === 'word') return new File([writeDocx(parts).slice()], `${name}.docx`, { type: DOCX_TYPE });
  const [{ contractPdf }, r, b, h] = await Promise.all([import('../core/contract-pdf'), fontBase64(regular), fontBase64(bold), fontBase64(headingBold)]);
  return new File([(await contractPdf(parts, { regular: r, bold: b, headingBold: h })).output('blob')], `${name}.pdf`, { type: 'application/pdf' });
}
