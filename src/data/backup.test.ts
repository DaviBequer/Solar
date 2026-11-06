import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';

const legacy = {
  version: 1,
  timestamp: '2026-10-01T12:00:00.000Z',
  appConfig: { appName: 'Nio' },
  budgetParams: { tariff: 0.95, anchoring: 0, discount: 0, spread: 5.15, iof: 3.38, commission: 4, overprice: 0, tax: 11, proposalCompanyName: 'Minha Solar' },
  manualPricing: null,
  kits: [{ id: 'k1', gm: '890', panel585: 0, panel610: 12, panel700: 0, inverter: '6', price: 22900 }],
  leads: [
    { id: 'l1', name: 'Ana', phone: '(11) 90000-0000', status: 'Em Negociação', createdAt: '2026-09-01T10:00:00.000Z', records: [{ id: 'r1', content: 'Ligou', date: '2026-09-02T10:00:00.000Z' }] },
    { id: 'l2', name: 'Beto', phone: '', status: 'Vendido', createdAt: '2026-08-01T10:00:00.000Z', commissionValue: 800, isManualCommission: true },
  ],
  proposals: [
    { id: 'p1', leadId: 'l1', date: '2026-09-03T10:00:00.000Z', totalPrice: 23400, monthlyGeneration: 890, paymentMethod: 'FINAN', systemType: 'ON-GRID', panelPower: 610, systemConfig: { consumption: 680, isMoneyMode: true, roofType: 'Laje', voltage: 'trifasico', moduleBrand: 'Trina', inverterBrand: 'SOFAR', safetyMargin: 10 }, status: 'Enviado' },
    { id: 'p2', leadId: 'l2', date: '2026-08-05T10:00:00.000Z', totalPrice: 19700, monthlyGeneration: 700, paymentMethod: 'VISTA', systemConfig: { consumption: 600, isMoneyMode: false, roofType: 'Ceramica', voltage: '220v', moduleBrand: 'DMEGC', inverterBrand: 'SAJ' }, status: 'Aprovado' },
  ],
  tasks: [{ id: 't1', title: 'Retorno', category: 'Solar', status: 'Pending', createdAt: '2026-09-03T10:00:00.000Z', linkedLeadId: 'l1', solarType: 'Retorno', scheduledDate: '2026-09-10T17:30:00.000Z', reminderMinutes: 60 }],
};

describe('backup do app antigo', () => {
  it('converte clientes, orçamentos, kits e agenda', () => {
    const b = parseBackup(JSON.stringify(legacy));
    expect(b.settings.tariff).toBe(0.95);
    expect(b.settings.commissionPct).toBe(4);
    expect(b.settings.companyName).toBe('Minha Solar');
    expect(b.kits[0].gm).toBe(890);

    const ana = b.leads.find((l) => l.id === 'l1')!;
    expect(ana.status).toBe('negociando');
    expect(ana.records[0].text).toBe('Ligou');

    const beto = b.leads.find((l) => l.id === 'l2')!;
    expect(beto.status).toBe('vendido');
    expect(beto.soldProposalId).toBe('p2');
    expect(beto.commission).toEqual({ value: 800, manual: true, paid: false });

    const p1 = b.proposals.find((p) => p.id === 'p1')!;
    expect(p1.result.finalPrice).toBe(23400);
    expect(p1.input.roof).toBe('laje');
    expect(p1.input.grid).toBe('tri');
    expect(p1.input.params.safetyMargin).toBe(10);
    expect(p1.input.payment.method).toBe('financiado');
    expect(p1.status).toBe('enviado');

    const p2 = b.proposals.find((p) => p.id === 'p2')!;
    expect(p2.input.billMode).toBe('kwh');
    expect(p2.input.grid).toBe('mono');
    expect(p2.number).toBe(1);
    expect(b.settings.nextProposalNumber).toBe(3);

    expect(b.tasks[0].type).toBe('retorno');
    expect(b.tasks[0].reminderMin).toBe(60);
  });

  it('recusa arquivo que não é backup', () => {
    expect(() => parseBackup('{"a":1}')).toThrow();
    expect(() => parseBackup('texto')).toThrow();
  });
});
