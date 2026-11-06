import type { Lead } from './types';

/** Rota até o cliente: pelo endereço ou, sem ele, pelas coordenadas do GPS. */
export function mapsUrl(lead: Pick<Lead, 'address' | 'lat' | 'lng'>): string | null {
  if (lead.address.trim()) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`;
  if (lead.lat !== null && lead.lng !== null) return `https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lng}`;
  return null;
}

export function whatsappUrl(phoneDigits: string, text?: string): string {
  return `https://wa.me/55${phoneDigits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
