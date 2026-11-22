import { describe, expect, it } from 'vitest';
import { billHistory } from './bill';

// Posições inventadas no formato da Celesc: mês, kWh, dias na mesma linha
const row = (y: number, m: string, kwh: string, dias: string) => [
  { str: m, x: 437, y, page: 1 },
  { str: kwh, x: 532, y, page: 1 },
  { str: dias, x: 554, y, page: 1 },
];

describe('billHistory', () => {
  it('lê o consumo do mais recente ao mais antigo', () => {
    const items = [
      { str: 'Consumo Faturado', x: 470, y: 432, page: 1 },
      { str: '25.450', x: 217, y: 410, page: 1 }, // leitura do medidor à esquerda, fica de fora
      ...row(399, 'SET/26', '158', '27'),
      ...row(421, 'NOV/26', '140', '33'),
      ...row(410, 'OUT/26', '1.119', '29'),
    ];
    expect(billHistory(items)).toEqual([140, 1119, 158]);
  });

  it('para em 12 meses e ignora mês repetido', () => {
    const items = Array.from({ length: 14 }, (_, i) => row(500 - i * 10, `JAN/${10 + i}`, String(100 + i), '30')).flat();
    items.push(...row(100, 'JAN/10', '999', '30'));
    expect(billHistory(items)).toHaveLength(12);
    expect(billHistory(items)[0]).toBe(100);
  });

  it('sem tabela devolve vazio', () => {
    expect(billHistory([{ str: 'TOTAL', x: 29, y: 262, page: 1 }])).toEqual([]);
  });
});
