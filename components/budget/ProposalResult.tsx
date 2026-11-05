
import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Wallet, X, Calculator, Scissors, TrendingDown, Zap, ArrowDown, SlidersHorizontal, ChevronUp, Calendar, Info, AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { CustomPricing } from '../../public/types';

interface CommissionData { total: number; net: number; taxVal: number; overpriceVal: number; baseVal: number; }
interface ProposalResultProps {
    totalPrice: number;
    grossPrice: number;     
    discountValue: number;  
    downPayment?: number;
    monthlyInstallment: number;
    monthlySavings: number; 
    accumulatedSavings: number;
    comparisonTimeframe: number;
    paybackYears: number;
    annualSavings: number;
    monthlyGeneration?: number;
    paymentMethod: 'VISTA' | 'FINAN' | 'ENTRY';
    commissionData: CommissionData;
    onOpenSettings: () => void;
    kitDetails?: any;
    totalModules?: number;
    moduleBrand?: string;
    installments?: number;
    anchoring: number; 
    taxRate: number;
    isDiscountApplied: boolean;
    toggleDiscount: () => void;
    interestRate?: number;
    
    // NOVOS PROPS PARA PREÇO MANUAL
    kitNotFound?: boolean;
    customPricing?: CustomPricing; // Recebe o estado atual de preço customizado
    onUpdateCustomPricing?: (pricing: CustomPricing) => void; // Função para salvar
}

export const ProposalResult: React.FC<ProposalResultProps> = ({
    totalPrice, grossPrice, discountValue, downPayment = 0, monthlyInstallment, monthlySavings,
    accumulatedSavings, comparisonTimeframe, paybackYears, annualSavings, monthlyGeneration = 0,
    paymentMethod, commissionData, onOpenSettings, kitDetails, totalModules, moduleBrand, installments,
    anchoring, taxRate, isDiscountApplied, toggleDiscount, interestRate,
    kitNotFound, customPricing, onUpdateCustomPricing
}) => {
    
    const [showInfo, setShowInfo] = useState(false);
    const [showCommission, setShowCommission] = useState(false);
    
    // Estado para o Modal de Preço Customizado
    const [showCustomPriceModal, setShowCustomPriceModal] = useState(false);
    const [tempTableValue, setTempTableValue] = useState('');
    const [tempDiscount, setTempDiscount] = useState('');
    const [tempFinalPrice, setTempFinalPrice] = useState('');

    useEffect(() => {
        if (showCustomPriceModal && customPricing) {
            setTempTableValue(customPricing.tableValue > 0 ? (customPricing.tableValue * 100).toFixed(0) : '');
            setTempDiscount(customPricing.visualDiscount > 0 ? (customPricing.visualDiscount * 100).toFixed(0) : '');
            setTempFinalPrice(customPricing.finalPrice > 0 ? (customPricing.finalPrice * 100).toFixed(0) : '');
        } else if (showCustomPriceModal) {
            // Se abriu e não tinha dados prévios, limpa ou usa defaults
            setTempTableValue('');
            setTempDiscount('');
            setTempFinalPrice('');
        }
    }, [showCustomPriceModal, customPricing]);

    const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    const formatBRLNoDecimals = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
    
    const isFinanced = paymentMethod === 'FINAN' || paymentMethod === 'ENTRY';

    // Se tiver custom pricing ativo, usa os valores dele para exibição, caso contrário usa props
    // Nota: O cálculo real de totalPrice já deve vir corrigido do BudgetGenerator se customPricing estiver ativo.
    // Aqui tratamos apenas a exibição "Tabela" vs "Final".
    
    const displaySystemValue = totalPrice; // O valor final já vem calculado
    const displayGrossPrice = grossPrice; // O valor de tabela já vem calculado

    let investmentBasis = displaySystemValue;
    if (isFinanced) {
        investmentBasis = (downPayment || 0) + (monthlyInstallment * (installments || 0));
    }

    const safeMonthlySavings = monthlySavings > 0 ? monthlySavings : 1;
    
    const rawMonths = investmentBasis / safeMonthlySavings;
    const totalMonthsInt = Math.round(rawMonths);
    const displayYears = Math.floor(totalMonthsInt / 12);
    const displayMonths = totalMonthsInt % 12;

    let dynamicTimeframe = 6;
    const paybackFloat = totalMonthsInt / 12;
    if (paybackFloat >= 5.5) dynamicTimeframe = Math.ceil(paybackFloat) + 1;

    const utilityCostInPeriod = monthlySavings * 12 * dynamicTimeframe;
    const netSavingsInPeriod = utilityCostInPeriod - investmentBasis;

    const currentOverpriceAmount = isDiscountApplied ? Math.max(0, anchoring - discountValue) : anchoring;
    const currentOverpriceCommission = currentOverpriceAmount * 0.50; 
    
    const currentTotalCommission = commissionData.baseVal + currentOverpriceCommission;
    const currentTaxValue = currentTotalCommission * (taxRate / 100);
    const currentNetCommission = currentTotalCommission - currentTaxValue;

    const calculatedAnnualSavings = monthlySavings * 12;

    const block4TopLabel = `CELESC (${dynamicTimeframe} ANOS)`;
    const block4TopValue = utilityCostInPeriod;
    const block4BottomLabel = 'LUCRO';
    const block4BottomValue = netSavingsInPeriod;

    const monthlyPocketSavings = monthlySavings - monthlyInstallment;
    const isPositiveCashflow = isFinanced && monthlyPocketSavings > 0;

    // --- HANDLERS PARA O MODAL CUSTOM ---
    const handleCurrencyInput = (val: string, setter: (v: string) => void) => {
        const digits = val.replace(/\D/g, '');
        // Se começar com zero e tiver mais dígitos, remove o zero à esquerda
        const cleanDigits = digits.replace(/^0+/, '');
        setter(cleanDigits);
    };

    const formatInputDisplay = (digits: string) => {
        if (!digits) return ''; 
        const val = parseInt(digits) / 100;
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleSaveCustomPrice = () => {
        if (onUpdateCustomPricing) {
            // Valor do Projeto (Base)
            const finalVal = parseInt(tempFinalPrice || '0') / 100;
            // Desconto (Visual)
            const discountVal = parseInt(tempDiscount || '0') / 100;
            
            // Valor de Tabela = Base + Desconto
            const tableVal = finalVal + discountVal;

            onUpdateCustomPricing({
                isActive: true, // Sempre ativa ao salvar
                tableValue: tableVal,
                visualDiscount: discountVal,
                finalPrice: finalVal
            });
        }
        setShowCustomPriceModal(false);
    };

    const handleClearCustomPrice = () => {
        if (onUpdateCustomPricing) {
            onUpdateCustomPricing({
                isActive: false,
                tableValue: 0,
                visualDiscount: 0,
                finalPrice: 0
            });
        }
        setShowCustomPriceModal(false);
    };

    // Ícone de Aviso removido por solicitação
    const showWarningIcon = false; 

    return (
        <div className="relative mb-2">
            
            <div className="bg-nior-navy rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden text-white group border border-white/5">
                {/* Background Blobs */}
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-nior-blue/30 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute bottom-[-30px] left-[-30px] w-40 h-40 bg-nior-gold/10 rounded-full blur-[60px] pointer-events-none"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8">
                        <label className="text-[10px] font-bold text-nior-goldLight uppercase tracking-widest flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-nior-gold animate-pulse"></span>
                            Investimento
                        </label>

                        {/* Control Buttons */}
                        <div className="flex gap-2 relative">
                             {/* INFO BUTTON */}
                             <button onClick={() => { setShowInfo(!showInfo); setShowCommission(false); }} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors backdrop-blur-md border border-white/5 ${showInfo ? 'bg-white text-nior-navy' : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'}`}>
                                <Info size={14} />
                             </button>

                             {/* WALLET BUTTON (Commission) */}
                             <button onClick={() => { setShowCommission(!showCommission); setShowInfo(false); }} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors backdrop-blur-md border border-white/5 ${showCommission ? 'bg-white text-nior-navy' : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'}`}>
                                <Wallet size={14} />
                             </button>

                             {/* MANUAL PRICE BUTTON */}
                             <button onClick={() => setShowCustomPriceModal(true)} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white backdrop-blur-md border border-white/5">
                                <Calculator size={14} />
                             </button>

                             <button onClick={onOpenSettings} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white backdrop-blur-md border border-white/5">
                                <SlidersHorizontal size={14} />
                             </button>

                             {/* INFO POPUP (CLIENT DATA) */}
                             {showInfo && (
                                <div className="absolute top-10 right-0 z-50 bg-white text-nior-navy p-4 rounded-2xl shadow-2xl w-64 border border-gray-100 animate-in fade-in zoom-in duration-200">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-nior-navy">Detalhes do Projeto</span>
                                        <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                                    </div>
                                    
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-medium">Valor de Tabela</span>
                                            <span className="font-bold text-gray-400 line-through decoration-red-400/50">{formatBRL(grossPrice)}</span>
                                        </div>
                                        
                                        {discountValue > 0 && isDiscountApplied && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">Desconto Aplicado</span>
                                                <span className="font-bold text-emerald-600">-{formatBRL(discountValue)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between pt-1 border-t border-dashed border-gray-200 mt-1">
                                            <span className="font-bold text-nior-navy">Valor do Sistema</span>
                                            <span className="font-extrabold text-nior-navy">{formatBRL(displaySystemValue)}</span>
                                        </div>

                                        {/* Seção Financiamento */}
                                        {(isFinanced) && installments && installments > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50/50 -mx-4 px-4 pb-1">
                                                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Simulação Financiamento</span>
                                                
                                                {downPayment > 0 && (
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-gray-500 font-medium">Entrada</span>
                                                        <span className="font-bold text-nior-navy">{formatBRL(downPayment)}</span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-gray-500 font-medium">Parcelas ({installments}x)</span>
                                                    <span className="font-bold text-nior-navy">{formatBRL(monthlyInstallment)}/mês</span>
                                                </div>

                                                <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                                                    <span className="font-bold text-nior-navy">Total c/ Juros</span>
                                                    <span className="font-extrabold text-nior-goldDark">{formatBRL(investmentBasis)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             )}

                             {/* COMMISSION POPUP (SELLER DATA) */}
                             {showCommission && (
                                <div className="absolute top-10 right-0 z-50 bg-white text-nior-navy p-4 rounded-2xl shadow-2xl w-60 border border-gray-100 animate-in fade-in zoom-in duration-200">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-nior-navy flex items-center gap-1">
                                            <Wallet size={10} className="text-nior-gold" />
                                            Resumo de Ganhos
                                        </span>
                                        <button onClick={() => setShowCommission(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                                    </div>
                                    
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium">Comissão</span>
                                            <span className="font-bold text-gray-700">{formatBRL(commissionData.baseVal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium">Overprice ({isDiscountApplied ? 'c/ Desc' : 'Cheio'})</span>
                                            <span className={`font-bold ${currentOverpriceCommission > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {currentOverpriceCommission > 0 ? '+' : ''}{formatBRL(currentOverpriceCommission)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-red-500/80">
                                            <span className="font-medium">Imposto</span>
                                            <span className="font-bold">-{formatBRL(currentTaxValue)}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 mt-2">
                                            <span className="font-bold text-nior-navy text-[10px] uppercase tracking-wider">Líquido Estimado</span>
                                            <span className="font-extrabold text-emerald-600 text-sm">{formatBRL(currentNetCommission)}</span>
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>
                    </div>

                    <div className={`flex flex-col items-center justify-center mb-8 relative transition-transform duration-300 ${discountValue > 0 ? 'cursor-pointer active:scale-95' : ''}`} onClick={() => { if (discountValue > 0) toggleDiscount(); }}>
                        
                        {/* ÍCONE DE AVISO PARA PREÇO MANUAL REMOVIDO */}

                        {discountValue > 0 && isDiscountApplied ? (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                <div className="relative"><span className="text-lg text-white/40 font-bold line-through decoration-red-400 decoration-2 decoration-slice">{formatBRLNoDecimals(grossPrice)}</span></div>
                                <h2 className="text-[3.5rem] leading-none font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-200 tracking-tight drop-shadow-xl mt-1">{formatBRLNoDecimals(totalPrice)}</h2>
                                <div className="mt-2 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full shadow-lg shadow-emerald-900/20"><Scissors size={12} className="text-emerald-400" /><span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">Desconto de {formatBRLNoDecimals(discountValue)}</span></div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center animate-in fade-in duration-300">
                                <h2 className="text-[4rem] leading-none font-extrabold text-white tracking-tight drop-shadow-lg">{formatBRLNoDecimals(grossPrice)}</h2>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                        
                        {/* 1. SE FINANCIADO: PARCELA (Primeiro Bloco) */}
                        {isFinanced && (
                            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col justify-center items-center shadow-lg relative overflow-hidden h-28 group/installment">
                                {/* Background Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50 pointer-events-none"></div>

                                <div className="flex flex-col items-center relative z-10">
                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Wallet size={10} /> Parcela ({installments}x)
                                    </span>
                                    <span className="text-2xl font-extrabold text-white tracking-tight leading-none text-center">
                                        {formatBRL(monthlyInstallment)}
                                    </span>
                                    {isPositiveCashflow && (
                                        <div className="mt-2 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                            <TrendingUp size={8} className="text-emerald-400" />
                                            <span className="text-[8px] font-bold text-emerald-300">Economia: {formatBRL(monthlyPocketSavings)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 2. Retorno */}
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center h-28 relative overflow-hidden backdrop-blur-sm shadow-inner">
                            <span className="text-[9px] font-bold text-nior-goldLight uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Clock size={10} /> RETORNO
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-extrabold text-white tracking-tight leading-none">{displayYears}</span>
                                    <span className="text-[7px] text-white/60 font-bold uppercase mt-0.5">Anos</span>
                                </div>
                                <div className="h-6 w-px bg-white/20"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-extrabold text-white tracking-tight leading-none">{displayMonths}</span>
                                    <span className="text-[7px] text-white/60 font-bold uppercase mt-0.5">Meses</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Econ. Anual */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center transition-colors hover:bg-white/10 h-28">
                            <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Calendar size={10} /> ECON. ANUAL
                            </span>
                            <p className="text-xl font-bold text-emerald-400 tracking-tight text-center leading-none">
                                {formatBRL(calculatedAnnualSavings)}
                            </p>
                        </div>

                        {/* 4. Geração Mensal */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center transition-colors hover:bg-white/10 h-28">
                            <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-center">
                                <Zap size={10} /> {moduleBrand || 'MÓDULOS'}
                            </span>
                            <p className="text-xl font-bold text-cyan-300 tracking-tight text-center leading-none">
                                {monthlyGeneration} kWh
                            </p>
                        </div>

                        {/* 5. Comparativo */}
                        <div className={`bg-white/5 rounded-2xl p-2 border border-white/5 flex flex-col items-center justify-between shadow-lg relative overflow-hidden group/profit h-28 ${isFinanced ? 'col-span-2' : ''}`}>
                            <div className="bg-white w-full rounded-xl p-2 flex flex-col items-center shadow-sm mb-1 relative z-10 min-h-[45px] justify-center">
                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                                    <TrendingDown size={8} className="text-red-500" /> 
                                    {block4TopLabel}
                                </span>
                                <span className="text-xs font-bold text-gray-600 line-through decoration-red-400/50 leading-tight">
                                    {formatBRL(block4TopValue)}
                                </span>
                            </div>

                            <div className="flex flex-col items-center leading-none pb-1 relative z-10 flex-1 justify-center">
                                <span className="text-[8px] font-bold text-white/50 uppercase tracking-wider mb-0.5">
                                    {block4BottomLabel}
                                </span>
                                <p className="text-lg font-extrabold text-white tracking-tight leading-none">
                                    {formatBRL(block4BottomValue)}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* --- MODAL DE PREÇO CUSTOMIZADO (CENTRALIZADO) --- */}
            {showCustomPriceModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-nior-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setShowCustomPriceModal(false)}></div>
                    
                    {/* Alterado para centralização correta e padding responsivo */}
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative z-10 animate-in zoom-in duration-300 p-6 flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-nior-navy flex items-center gap-2">
                                <AlertTriangle size={20} className="text-amber-500" />
                                Definir Valor do Projeto
                            </h3>
                            <button onClick={() => setShowCustomPriceModal(false)} className="p-1 bg-gray-100 rounded-full text-gray-400 hover:text-nior-navy"><X size={18} /></button>
                        </div>

                        <div className="space-y-4">
                            {/* VALOR DO PROJETO (PREÇO BASE/FINAL) */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Valor do Projeto (R$)</label>
                                <div className="bg-nior-navy/5 border border-nior-navy/20 rounded-xl px-4 py-3 flex items-center">
                                    <span className="text-sm font-bold text-nior-navy mr-2">R$</span>
                                    <input 
                                        type="tel" 
                                        inputMode="numeric" 
                                        autoFocus
                                        placeholder="0,00"
                                        className="bg-transparent w-full text-xl font-extrabold text-nior-navy outline-none"
                                        value={formatInputDisplay(tempFinalPrice)}
                                        onChange={(e) => handleCurrencyInput(e.target.value, setTempFinalPrice)}
                                    />
                                </div>
                            </div>

                            {/* VALOR DO DESCONTO (ADICIONAL VISUAL) */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Desconto Aplicado (R$)</label>
                                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center">
                                    <span className="text-sm font-bold text-gray-400 mr-2">R$</span>
                                    <input 
                                        type="tel" 
                                        inputMode="numeric" 
                                        placeholder="0,00"
                                        className="bg-transparent w-full text-lg font-bold text-emerald-600 outline-none"
                                        value={formatInputDisplay(tempDiscount)}
                                        onChange={(e) => handleCurrencyInput(e.target.value, setTempDiscount)}
                                    />
                                </div>
                                <p className="text-[9px] text-gray-400 mt-2 leading-tight">
                                    O <b>Valor Cheio</b> será a soma do Projeto + Desconto. Ao clicar no valor cheio na proposta, ele se transformará no Valor do Projeto.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={handleClearCustomPrice}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold text-sm hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <RotateCcw size={18} className="mx-auto" />
                            </button>
                            <button 
                                onClick={handleSaveCustomPrice}
                                className="flex-[3] py-3 rounded-xl bg-nior-navy text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                                <Check size={18} /> Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
