
import React, { useState } from 'react';
import { Scenario, Lead } from '../../public/types';
import { 
    ArrowLeft, Layers, Zap, Check, Box, Activity, LayoutGrid, 
    Home, Warehouse, Factory, Mountain, Car, Cable, Aperture, 
    Banknote, CreditCard, Wallet, Share2, FileText, Smartphone, X, Download, SlidersHorizontal, Clock, TrendingDown, CalendarCheck, ArrowDown, Cpu, ShieldCheck
} from 'lucide-react';
import { ClientSelector } from './ClientSelector';

interface ComparisonViewProps {
    scenarios: Scenario[];
    onBack: () => void;
    onRemoveScenario: (id: string) => void;
    leads: Lead[];
    selectedLeadId: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
    scenarios,
    onBack,
    onRemoveScenario,
    leads,
    selectedLeadId
}) => {
    const activeScenarios = scenarios.slice(0, 2); 
    const base = activeScenarios[0];
    const compare = activeScenarios[1];
    const lead = leads.find(l => l.id === selectedLeadId);

    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [tempPhone, setTempPhone] = useState('');

    if (!base) return <div className="text-center py-10">Nenhum cenário selecionado.</div>;

    // --- HELPERS VISUAIS ---
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    
    const getRoofIcon = (type: string) => {
        switch(type) {
            case 'Fibrocimento': return Warehouse;
            case 'Metalico': return Factory;
            case 'Laje': return LayoutGrid;
            case 'Solo': return Mountain;
            case 'Carport': return Car;
            default: return Home;
        }
    };

    const getSystemPower = (scenario: Scenario) => {
        if (!scenario.results.kitDetails) return 0;
        const kit = scenario.results.kitDetails;
        
        // CORREÇÃO: Tenta usar a potência preferida se disponível na config, senão soma tudo
        const pref = scenario.config.preferredPanel;
        if (pref === 585) return (kit.panel585 || 0) * 585 / 1000;
        if (pref === 610) return (kit.panel610 || 0) * 610 / 1000;
        if (pref === 700) return (kit.panel700 || 0) * 700 / 1000;

        // Fallback (Soma)
        const p585 = (kit.panel585 || 0) * 585;
        const p610 = (kit.panel610 || 0) * 610;
        const p700 = (kit.panel700 || 0) * 700;
        return (p585 + p610 + p700) / 1000;
    };

    const getTotalModules = (scenario: Scenario) => {
        if (!scenario.results.kitDetails) return 0;
        const kit = scenario.results.kitDetails;
        
        // CORREÇÃO: Prioriza a potência preferida da configuração para evitar soma de todas as colunas
        const pref = scenario.config.preferredPanel;
        if (pref === 585) return kit.panel585 || 0;
        if (pref === 610) return kit.panel610 || 0;
        if (pref === 700) return kit.panel700 || 0;

        // Fallback
        return (kit.panel585 || 0) + (kit.panel610 || 0) + (kit.panel700 || 0);
    };

    const getFormattedInverter = (scenario: Scenario) => {
        let text = scenario.results.kitDetails?.inverter || '---';
        text = text.replace(/k/gi, '');
        if (/^[\d.,]+$/.test(text)) text += 'K';
        return text;
    };

    // 1. Linha Unificada (Dado igual)
    const UnifiedRow = ({ icon: Icon, label, value, subValue }: { icon?: any, label: string, value: string, subValue?: string }) => (
        <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2">
                {Icon && <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400"><Icon size={14} /></div>}
                <span className="text-xs font-medium text-gray-500">{label}</span>
            </div>
            <div className="text-right">
                <span className="block text-sm font-bold text-nior-navy">{value}</span>
                {subValue && <span className="block text-[10px] text-gray-400">{subValue}</span>}
            </div>
        </div>
    );

    // 2. Linha Dividida (Dado diferente)
    const SplitRow = ({ label, icon: Icon, leftValue, rightValue, leftSub, rightSub }: { label: string, icon?: any, leftValue: string, rightValue: string, leftSub?: string, rightSub?: string }) => (
        <div className="py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 mb-2">
                {Icon && <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400"><Icon size={14} /></div>}
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-nior-navy/5 p-2 rounded-xl border border-nior-navy/10 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-4 h-4 bg-nior-navy/10 rounded-bl-lg"></div>
                    <span className="block text-sm font-bold text-nior-navy">{leftValue}</span>
                    {leftSub && <span className="block text-[9px] text-nior-navy/70 font-medium">{leftSub}</span>}
                </div>
                <div className="bg-nior-gold/10 p-2 rounded-xl border border-nior-gold/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-4 h-4 bg-nior-gold/20 rounded-bl-lg"></div>
                    <span className="block text-sm font-bold text-nior-goldDark">{rightValue}</span>
                    {rightSub && <span className="block text-[9px] text-nior-goldDark/70 font-medium">{rightSub}</span>}
                </div>
            </div>
        </div>
    );

    // --- WHATSAPP LOGIC ---
    const generatePDF = () => {
        alert("PDF Gerado com Sucesso! (Simulação)");
        return true;
    };

    const handleSendWhatsApp = () => {
        const targetPhone = lead?.phone || tempPhone;
        if (!targetPhone) { setShowPhoneModal(true); return; }
        const cleanPhone = targetPhone.replace(/\D/g, '');
        if (cleanPhone.length < 10) { alert("Número de telefone inválido."); return; }
        if (generatePDF()) {
            const message = encodeURIComponent(`Olá ${lead?.name || ''}, aqui está o comparativo dos orçamentos de energia solar.`);
            const url = `https://wa.me/55${cleanPhone}?text=${message}`;
            window.open(url, '_blank');
            setShowPhoneModal(false);
        }
    };

    const hasCompare = !!compare;

    // --- VERIFICAÇÃO DE DIFERENÇAS (GRANULAR) ---
    // Sistema
    const diffRoof = hasCompare && base.config.roofType !== compare.config.roofType;
    const diffVoltage = hasCompare && base.config.voltage !== compare.config.voltage;
    const diffModules = hasCompare && (getTotalModules(base) !== getTotalModules(compare));
    const diffInverter = hasCompare && (base.results.kitDetails?.inverter !== compare.results.kitDetails?.inverter);
    
    // Financeiro
    const diffMethod = hasCompare && base.payment.method !== compare.payment.method;
    const diffInstallments = hasCompare && base.payment.installments !== compare.payment.installments;
    const diffPrice = hasCompare && base.results.totalPrice !== compare.results.totalPrice;
    
    // Geração
    const diffGeneration = hasCompare && base.results.monthlyGeneration !== compare.results.monthlyGeneration;

    return (
        <div className="pb-32 animate-in fade-in slide-in-from-right duration-300">
            
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm text-nior-navy hover:bg-gray-50 transition-colors border border-gray-100">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-nior-navy flex items-center gap-2">
                            <Layers size={20} className="text-nior-gold" />
                            Comparativo
                        </h2>
                        <p className="text-xs text-gray-400">
                            Análise Técnica e Financeira
                        </p>
                    </div>
                </div>
            </div>

            {/* CLIENT SELECTOR (Read Only) */}
            <div className="opacity-90 pointer-events-none grayscale-[0.2] mb-2 scale-[0.98] origin-top">
                <ClientSelector 
                    leads={leads} 
                    selectedLeadId={selectedLeadId} 
                    onSelectLead={() => {}} 
                    onCreateLead={() => {}} 
                    proposalsHistory={[]} 
                    onLoadProposal={() => {}} 
                />
            </div>

            {/* --- CARD SISTEMA (GRANULAR) --- */}
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 mb-4 relative overflow-hidden">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                    <label className="text-[10px] font-bold text-nior-navy uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-nior-gold"></span>
                        Especificações Técnicas
                    </label>
                </div>

                {/* Tipo de Sistema (Geralmente igual) */}
                <UnifiedRow icon={Zap} label="Tipo de Sistema" value={base.config.systemType} />

                {/* Estrutura */}
                {!diffRoof ? (
                    <UnifiedRow icon={getRoofIcon(base.config.roofType)} label="Estrutura" value={base.config.roofType} />
                ) : (
                    <SplitRow label="Estrutura" icon={Home} leftValue={base.config.roofType} rightValue={compare.config.roofType} />
                )}

                {/* Rede */}
                {!diffVoltage ? (
                    <UnifiedRow icon={base.config.voltage === 'trifasico' ? Aperture : Cable} label="Rede" value={base.config.voltage === '220v' ? 'Monofásico' : base.config.voltage} />
                ) : (
                    <SplitRow label="Rede" icon={Cable} leftValue={base.config.voltage} rightValue={compare.config.voltage} />
                )}

                {/* Módulos */}
                {!diffModules ? (
                    <UnifiedRow icon={LayoutGrid} label="Módulos" value={`${getTotalModules(base)}x Painéis`} subValue={`${getSystemPower(base).toFixed(2)} kWp`} />
                ) : (
                    <SplitRow 
                        label="Módulos" 
                        icon={LayoutGrid}
                        leftValue={`${getTotalModules(base)}x`} 
                        leftSub={`${getSystemPower(base).toFixed(2)} kWp`}
                        rightValue={`${getTotalModules(compare)}x`}
                        rightSub={`${getSystemPower(compare).toFixed(2)} kWp`}
                    />
                )}

                {/* Inversor */}
                {!diffInverter ? (
                    <UnifiedRow icon={Cpu} label="Inversor" value={getFormattedInverter(base)} subValue={base.config.inverterBrand} />
                ) : (
                    <SplitRow 
                        label="Inversor" 
                        icon={Cpu}
                        leftValue={getFormattedInverter(base)} 
                        leftSub={base.config.inverterBrand}
                        rightValue={getFormattedInverter(compare)}
                        rightSub={compare.config.inverterBrand}
                    />
                )}
            </div>

            {/* --- CARD FINANCEIRO (GRANULAR) --- */}
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 mb-4 relative overflow-hidden">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                    <label className="text-[10px] font-bold text-nior-navy uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-nior-gold"></span>
                        Condições Financeiras
                    </label>
                </div>

                {/* Método de Pagamento */}
                {!diffMethod ? (
                    <UnifiedRow 
                        icon={base.payment.method === 'VISTA' ? Banknote : CreditCard} 
                        label="Forma de Pagamento" 
                        value={base.payment.method === 'VISTA' ? 'À Vista' : base.payment.method === 'ENTRY' ? 'Entrada + Parc.' : 'Financiamento'} 
                    />
                ) : (
                    <SplitRow 
                        label="Forma de Pagamento"
                        icon={Wallet}
                        leftValue={base.payment.method === 'VISTA' ? 'À Vista' : 'Financiado'}
                        rightValue={compare.payment.method === 'VISTA' ? 'À Vista' : 'Financiado'}
                    />
                )}

                {/* Investimento Total */}
                {!diffPrice ? (
                    <div className="py-4 text-center">
                        <span className="text-xs font-bold text-gray-400 uppercase">Investimento Total</span>
                        <span className="block text-3xl font-extrabold text-nior-navy tracking-tight">{formatCurrency(base.results.totalPrice)}</span>
                    </div>
                ) : (
                    <div className="py-4 grid grid-cols-2 gap-4">
                        <div className="text-center border-r border-gray-100">
                            <span className="text-[9px] font-bold text-nior-navy/50 uppercase block mb-1">Opção 1</span>
                            <span className="block text-xl font-extrabold text-nior-navy">{formatBRL(base.results.totalPrice)}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-[9px] font-bold text-nior-goldDark/50 uppercase block mb-1">Opção 2</span>
                            <span className="block text-xl font-extrabold text-nior-goldDark">{formatBRL(compare.results.totalPrice)}</span>
                        </div>
                    </div>
                )}

                {/* Parcelas / Payback */}
                {(!hasCompare || (base.payment.method !== 'VISTA' || compare.payment.method !== 'VISTA')) && (
                    !diffInstallments && !diffMethod ? (
                        <UnifiedRow icon={Clock} label="Prazo" value={`${base.payment.installments}x Parcelas`} subValue={`de ${formatCurrency(base.payment.monthlyInstallment)}`} />
                    ) : (
                        <SplitRow 
                            label={base.payment.method === 'VISTA' && compare.payment.method === 'VISTA' ? 'Retorno' : 'Parcelas'}
                            icon={Clock}
                            leftValue={base.payment.method === 'VISTA' ? 'Imediato' : `${base.payment.installments}x`}
                            leftSub={base.payment.method !== 'VISTA' ? formatCurrency(base.payment.monthlyInstallment) : undefined}
                            rightValue={compare.payment.method === 'VISTA' ? 'Imediato' : `${compare.payment.installments}x`}
                            rightSub={compare.payment.method !== 'VISTA' ? formatCurrency(compare.payment.monthlyInstallment) : undefined}
                        />
                    )
                )}
            </div>

            {/* --- CARD PERFORMANCE --- */}
            <div className="bg-nior-navy rounded-[2rem] p-5 shadow-2xl relative overflow-hidden text-white mb-20 border border-white/5">
                <div className="absolute top-0 right-0 w-40 h-40 bg-nior-gold/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                        <label className="text-[10px] font-bold text-nior-gold uppercase tracking-widest flex items-center gap-2">
                            <TrendingDown size={12} /> Performance
                        </label>
                    </div>

                    {!diffGeneration ? (
                        <div className="flex justify-between items-center py-2">
                            <span className="text-xs text-white/70">Geração Mensal</span>
                            <span className="text-xl font-bold text-cyan-300">{base.results.monthlyGeneration} kWh</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <span className="text-[9px] uppercase text-white/50 block mb-1">Opção 1</span>
                                <span className="text-lg font-bold text-cyan-300">{base.results.monthlyGeneration} kWh</span>
                            </div>
                            <div className="border-l border-white/10">
                                <span className="text-[9px] uppercase text-nior-gold/50 block mb-1">Opção 2</span>
                                <span className="text-lg font-bold text-nior-gold">{compare.results.monthlyGeneration} kWh</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                        <span className="text-xs text-white/70">Economia Anual</span>
                        {base.results.annualSavings === compare.results.annualSavings ? (
                            <span className="text-xl font-bold text-emerald-400">{formatCurrency(base.results.annualSavings)}</span>
                        ) : (
                            <div className="text-right">
                                <span className="block text-sm font-bold text-emerald-400">{formatCurrency(base.results.annualSavings)}</span>
                                <span className="block text-xs font-bold text-nior-gold">{formatCurrency(compare.results.annualSavings)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- ACTION BUTTON FIXED --- */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
                <button 
                    onClick={handleSendWhatsApp}
                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-600/30 flex items-center justify-center gap-3 hover:bg-green-700 active:scale-95 transition-all"
                >
                    <div className="bg-white/20 p-1.5 rounded-lg">
                        <FileText size={20} />
                    </div>
                    <span>Gerar PDF & Enviar</span>
                    <Share2 size={20} />
                </button>
            </div>

            {/* --- MODAL TELEFONE (Mantido) --- */}
            {showPhoneModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-nior-navy/60 backdrop-blur-sm transition-opacity" onClick={() => setShowPhoneModal(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 animate-in zoom-in duration-300 shadow-2xl">
                        <button onClick={() => setShowPhoneModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                            <X size={18} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <Smartphone size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-nior-navy">O cliente tem WhatsApp?</h3>
                            <p className="text-sm text-gray-500 mt-1">Nenhum número encontrado no cadastro.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block text-left ml-1">Informe o Número</label>
                                <input 
                                    autoFocus
                                    type="tel"
                                    placeholder="(00) 00000-0000"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-nior-navy font-bold outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-center text-lg"
                                    value={tempPhone}
                                    onChange={e => setTempPhone(e.target.value)}
                                />
                            </div>

                            <button 
                                onClick={handleSendWhatsApp}
                                className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-all"
                            >
                                <Share2 size={18} />
                                Enviar no WhatsApp
                            </button>

                            <button 
                                onClick={() => { generatePDF(); setShowPhoneModal(false); }}
                                className="w-full py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                            >
                                <Download size={18} />
                                Apenas Baixar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
