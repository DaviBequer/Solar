import { describe, expect, it } from 'vitest';
import { mapsUrl, whatsappUrl } from './links';

describe('links do cliente', () => {
  it('rota usa o endereço e, sem ele, o GPS', () => {
    expect(mapsUrl({ address: 'Rua A, 1', lat: 1, lng: 2 })).toContain('Rua%20A%2C%201');
    expect(mapsUrl({ address: ' ', lat: -3.1, lng: -60 })).toContain('-3.1,-60');
    expect(mapsUrl({ address: '', lat: null, lng: null })).toBeNull();
  });

  it('WhatsApp com e sem mensagem', () => {
    expect(whatsappUrl('11999990000')).toBe('https://wa.me/5511999990000');
    expect(whatsappUrl('11999990000', 'Olá!')).toBe('https://wa.me/5511999990000?text=Ol%C3%A1!');
  });
});
