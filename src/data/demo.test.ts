import { describe, expect, it } from 'vitest';
import { demoData } from './demo';
import { DEFAULT_SETTINGS } from '../core/defaults';
import { parseKitsCsv } from '../core/csv';
import csv from './default-kits.csv?raw';

describe('clientes de exemplo', () => {
  it('um por forma de pagamento, com orçamento calculado e numerado em seguida', () => {
    const { leads, proposals } = demoData({ ...DEFAULT_SETTINGS, nextProposalNumber: 5 }, parseKitsCsv(csv));
    expect(proposals.map((p) => p.input.payment.method)).toEqual(['vista', 'financiado', 'entrada']);
    expect(proposals.map((p) => p.number)).toEqual([5, 6, 7]);
    expect(proposals.every((p, i) => p.leadId === leads[i].id && p.result.finalPrice > 0)).toBe(true);
    expect(proposals[2].result.downPayment).toBe(10000);
  });
});
