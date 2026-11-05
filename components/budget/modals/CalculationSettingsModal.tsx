
import React, { useState, useEffect } from 'react';
import { X, Check, Handshake, Settings, Tag, TrendingUp, Percent, Zap, Building2, FileText, Anchor, Save, Info, Briefcase, UploadCloud, Lock, Calculator, RotateCcw } from 'lucide-react';
import { CalculationParams } from '../../../public/types';

interface CalculationSettingsModalProps {
    params: CalculationParams; // Local Params (Current Proposal)
    globalParams?: CalculationParams; // Global Defaults (System)
    systemBasePrice?: number; // Preço do Kit + Estrutura + Bateria (Sem Ancoragem/Desconto)
    onClose: () => void;
    onSave: (params: CalculationParams, saveAsGlobal: boolean) => void;
}

export const CalculationSettingsModal: React.FC<CalculationSettingsModalProps> = ({ 
    params, 
    globalParams,
    systemBasePrice = 0,
    onClose, 
    onSave 
}) => {
    const [activeTab, setActiveTab] = useState<'ADJUSTABLE' | 'FIXED'>('ADJUSTABLE');
    
    // MUDANÇA: Inicializa como MANUAL sempre por padrão ao abrir
    const [calcMode, setCalcMode] = useState<'AUTO' | 'MANUAL' | 'FIXED'>('MANUAL');

    // --- SCROLL LOCK EFFECT ---
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Helper de formatação
    const formatValue = (val: number, precision: number = 2) => 
        val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: precision }) : '';

    // --- ESTADO DOS INPUTS ---
    // Inicializa com os parametros LOCAIS (pois a aba inicial é Adjustable)
    const [inputs, setInputs] = useState({
        tariff: formatValue(params.tariff),
        anchoring: formatValue(params.anchoring),
        discount: formatValue(params.discount),
        spread: formatValue(params.spread, 3),
        iof: formatValue(params.iof),
        commission: formatValue(params.commission),
        overprice: formatValue(params.overprice),
        tax: formatValue(params.tax)
    });

    // Novo Estado para o Valor Final do Projeto (Cálculo Reverso)
    const [finalProjectValue, setFinalProjectValue] = useState('');
    const [fixedPriceInput, setFixedPriceInput] = useState('');

    // Estados para Identidade Visual (PDF) - Sempre Local
    const [companyName, setCompanyName] = useState(params.proposalCompanyName || '');
    const [companyLogo, setCompanyLogo] = useState<string | undefined>(params.proposalCompanyLogo);

    // --- EFFECT: TROCA DE ABA CARREGA DADOS DIFERENTES ---
    useEffect(() => {
        const sourceParams = activeTab === 'FIXED' && globalParams ? globalParams : params;
        
        setInputs({
            tariff: formatValue(sourceParams.tariff),
            anchoring: formatValue(sourceParams.anchoring),
            discount: formatValue(sourceParams.discount),
            spread: formatValue(sourceParams.spread, 3),
            iof: formatValue(sourceParams.iof),
            commission: formatValue(sourceParams.commission),
            overprice: formatValue(sourceParams.overprice),
            tax: formatValue(sourceParams.tax)
        });
        
        // Se já tiver um modo salvo no params, respeita, senão mantém manual
        if (sourceParams.priceCalculationMode) {
            setCalcMode(sourceParams.priceCalculationMode);
        } else {
            // Força Manual como default se não houver salvo
            setCalcMode('MANUAL'); 
        }

        if (sourceParams.fixedPrice) {
            setFixedPriceInput(formatValue(sourceParams.fixedPrice));
        } else {
            setFixedPriceInput('');
        }
        
        // Calcula valor final inicial
        const initialTablePrice = systemBasePrice + sourceParams.anchoring;
        const initialFinalPrice = initialTablePrice - sourceParams.discount;
        setFinalProjectValue(formatValue(initialFinalPrice));
        
    }, [activeTab, params, globalParams, systemBasePrice]);

    const parseValue = (str: string) => {
        if (!str) return 0;
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    };

    const handleMaskedChange = (field: keyof typeof inputs, value: string, precision: number = 2) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) {
            setInputs(prev => ({ ...prev, [field]: '' }));
            
            // Se limpar desconto/ancoragem, atualiza o Valor Final também (apenas visualização)
            if (field === 'discount' || field === 'anchoring') {
                const currentAnchoring = field === 'anchoring' ? 0 : parseValue(inputs.anchoring);
                const currentDiscount = field === 'discount' ? 0 : parseValue(inputs.discount);
                const newFinal = (systemBasePrice + currentAnchoring) - currentDiscount;
                setFinalProjectValue(formatValue(newFinal));
            }
            return;
        }
        
        const divisor = Math.pow(10, precision);
        const numberValue = parseInt(digits) / divisor;
        const formatted = numberValue.toLocaleString('pt-BR', { minimumFractionDigits: precision, maximumFractionDigits: precision });
        
        setInputs(prev => ({ ...prev, [field]: formatted }));

        // LÓGICA REATIVA: Se alterar desconto/ancoragem manualmente, atualiza o Valor Final
        if (field === 'discount' || field === 'anchoring') {
            const currentAnchoring = field === 'anchoring' ? numberValue : parseValue(inputs.anchoring);
            const currentDiscount = field === 'discount' ? numberValue : parseValue(inputs.discount);
            
            const tablePrice = systemBasePrice + currentAnchoring;
            const newFinalPrice = Math.max(0, tablePrice - currentDiscount);
            setFinalProjectValue(formatValue(newFinalPrice));
        }
    };

    // --- CÁLCULO REVERSO (ALTERAR VALOR FINAL -> CALCULAR DESCONTO) ---
    const handleFinalValueChange = (val: string) => {
        // Se estiver no modo MANUAL ou FIXED, não permite cálculo reverso automático
        if (calcMode !== 'AUTO') return;

        const digits = val.replace(/\D/g, '');
        if (!digits) {
            setFinalProjectValue('');
            return;
        }
        const numberValue = parseInt(digits) / 100;
        setFinalProjectValue(numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

        // Cálculo: Novo Desconto = (Base + Ancoragem) - Novo Valor Final
        const currentAnchoring = parseValue(inputs.anchoring);
        const tablePrice = systemBasePrice + currentAnchoring;
        const newDiscount = Math.max(0, tablePrice - numberValue);

        setInputs(prev => ({ ...prev, discount: formatValue(newDiscount) }));
    };

    const handleFixedPriceChange = (val: string) => {
        const digits = val.replace(/\D/g, '');
        if (!digits) {
            setFixedPriceInput('');
            return;
        }
        const numberValue = parseInt(digits) / 100;
        setFixedPriceInput(numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    };

    // --- NOVO: RESETAR ANCORAGEM E DESCONTO ---
    const handleResetValues = () => {
        setInputs(prev => ({ ...prev, anchoring: '', discount: '' }));
        // Atualiza valor final para o preço base puro
        setFinalProjectValue(formatValue(systemBasePrice));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setCompanyLogo(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        const newParams: CalculationParams = {
            tariff: parseValue(inputs.tariff),
            anchoring: calcMode === 'FIXED' ? 0 : parseValue(inputs.anchoring),
            discount: calcMode === 'FIXED' ? 0 : parseValue(inputs.discount),
            spread: parseValue(inputs.spread),
            iof: parseValue(inputs.iof),
            commission: parseValue(inputs.commission),
            overprice: parseValue(inputs.overprice),
            tax: parseValue(inputs.tax),
            proposalCompanyName: companyName,
            proposalCompanyLogo: companyLogo,
            priceCalculationMode: calcMode, // SALVA O ESTADO DO BOTÃO
            fixedPrice: calcMode === 'FIXED' ? parseValue(fixedPriceInput) : undefined
        };

        const saveAsGlobal = activeTab === 'FIXED';
        onSave(newParams, saveAsGlobal);
        onClose();
    };

    return (
        // ATUALIZADO: Tela cheia no mobile (p-0, rounded-none, h-full)
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="bg-[#F8FAFC] w-full h-full sm:h-auto sm:max-w-sm sm:max-h-[90vh] rounded-none sm:rounded-[2rem] shadow-2xl relative z-10 animate-in zoom-in duration-300 flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-6 pb-4 flex justify-between items-start shrink-0 bg-white border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-nior-navy uppercase tracking-tight">Configurar Proposta</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            {activeTab === 'FIXED' ? 'Padrões do Sistema (Global)' : 'Ajustes deste Cliente (Local)'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-nior-navy hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* --- TABS --- */}
                <div className="px-6 py-4 shrink-0 bg-white">
                    <div className="bg-gray-100 p-1 rounded-xl flex">
                        <button
                            onClick={() => setActiveTab('ADJUSTABLE')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'ADJUSTABLE' 
                                ? 'bg-white text-nior-navy shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Handshake size={14} />
                            Negociação
                        </button>
                        <button
                            onClick={() => setActiveTab('FIXED')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'FIXED' 
                                ? 'bg-nior-navy text-white shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Settings size={14} />
                            Taxas Fixas
                        </button>
                    </div>
                </div>

                {/* Form Grid Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 pt-4 bg-[#F8FAFC]">
                    
                    {/* --- ABA 1: AJUSTÁVEIS (Negociação Local) --- */}
                    {activeTab === 'ADJUSTABLE' && (
                        <div className="space-y-6 animate-in slide-in-from-left duration-300">
                            
                            {/* BLOCO 1: VALOR FINAL DO PROJETO (REVERSO - DESIGN PREMIUM) */}
                            <div className="relative py-2">
                                {/* Bordas com Degradê (Forte no centro, fraco nas pontas) */}
                                <div className="absolute top-0 inset-x-8 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80"></div>
                                <div className="absolute bottom-0 inset-x-8 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80"></div>
                                
                                <div className="bg-gradient-to-b from-white to-emerald-50/40 rounded-[1.5rem] p-6 shadow-sm border-x border-emerald-100/30 relative overflow-hidden group">
                                    
                                    {/* Header Interno */}
                                    <div className="flex justify-between items-start mb-1 relative z-10">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                                <Briefcase size={14} /> Prévia
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-medium tracking-wide">Valor Final do Projeto</span>
                                        </div>
                                        
                                        {/* TOGGLE MODO DE CÁLCULO */}
                                        <div className="flex bg-emerald-100/50 p-0.5 rounded-lg border border-emerald-200/50">
                                            <button 
                                                onClick={() => setCalcMode('AUTO')}
                                                className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                                                    calcMode === 'AUTO' 
                                                    ? 'bg-white text-emerald-700 shadow-sm' 
                                                    : 'text-emerald-400 hover:text-emerald-600'
                                                }`}
                                            >
                                                Auto
                                            </button>
                                            <button 
                                                onClick={() => setCalcMode('MANUAL')}
                                                className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                                                    calcMode === 'MANUAL' 
                                                    ? 'bg-white text-emerald-700 shadow-sm' 
                                                    : 'text-emerald-400 hover:text-emerald-600'
                                                }`}
                                            >
                                                Manual
                                            </button>
                                            <button 
                                                onClick={() => setCalcMode('FIXED')}
                                                className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                                                    calcMode === 'FIXED' 
                                                    ? 'bg-white text-emerald-700 shadow-sm' 
                                                    : 'text-emerald-400 hover:text-emerald-600'
                                                }`}
                                            >
                                                Fixo
                                            </button>
                                        </div>
                                    </div>

                                    {/* Input Gigante Centralizado */}
                                    <div className="flex items-baseline justify-center relative z-10 my-3">
                                        <span className={`text-2xl font-bold mr-1 ${calcMode === 'MANUAL' ? 'text-gray-300' : 'text-emerald-600/50'}`}>R$</span>
                                        {calcMode === 'FIXED' ? (
                                            <input 
                                                inputMode="numeric"
                                                autoFocus
                                                className="bg-transparent w-full text-5xl font-extrabold outline-none text-center tracking-tight transition-colors text-nior-navy placeholder-emerald-200/50"
                                                value={fixedPriceInput}
                                                onChange={e => handleFixedPriceChange(e.target.value)}
                                                placeholder="0,00"
                                            />
                                        ) : (
                                            <input 
                                                inputMode="numeric"
                                                autoFocus={calcMode === 'AUTO'}
                                                readOnly={calcMode === 'MANUAL'} 
                                                className={`bg-transparent w-full text-5xl font-extrabold outline-none text-center tracking-tight transition-colors ${
                                                    calcMode === 'AUTO' 
                                                    ? 'text-nior-navy placeholder-emerald-200/50' 
                                                    : 'text-gray-400 cursor-not-allowed'
                                                }`}
                                                value={finalProjectValue}
                                                onChange={e => handleFinalValueChange(e.target.value)}
                                                placeholder="0,00"
                                            />
                                        )}
                                        {calcMode === 'MANUAL' && <Lock size={20} className="text-gray-300 absolute right-0 top-1/2 -translate-y-1/2" />}
                                    </div>
                                    
                                    {/* Helper Footer */}
                                    <p className="text-center text-[9px] text-emerald-600/70 font-bold relative z-10 uppercase tracking-wider">
                                        {calcMode === 'AUTO' 
                                            ? "O desconto ajusta-se automaticamente" 
                                            : calcMode === 'FIXED'
                                            ? "Valor final fixo (Sem desconto/ancoragem)"
                                            : "Cálculo automático desativado"}
                                    </p>

                                    {/* Background Decor */}
                                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-200/20 rounded-full blur-2xl pointer-events-none"></div>
                                </div>
                            </div>

                            {/* Separador */}
                            <div className="h-px bg-gray-200 w-full"></div>

                            {/* BLOCO 2: AJUSTES MANUAIS (DISCOUNT/ANCHORING) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ajuste Fino Manual</p>
                                    <button 
                                        onClick={handleResetValues}
                                        className="text-[9px] font-bold text-nior-goldDark uppercase tracking-widest bg-nior-gold/10 px-2 py-1 rounded-md hover:bg-nior-gold/20 transition-colors flex items-center gap-1"
                                        title="Zerar Ancoragem e Desconto"
                                    >
                                        <RotateCcw size={10} /> Zerar
                                    </button>
                                </div>
                                
                                {/* Ancoragem Local */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Anchor size={12} /> Ancoragem
                                    </label>
                                    <div className="bg-white rounded-xl px-4 py-3 border border-gray-200 flex items-center shadow-sm transition-colors focus-within:border-nior-gold/50 focus-within:bg-white">
                                        <span className="text-sm font-bold text-gray-400 mr-2">R$</span>
                                        <input 
                                            inputMode="numeric"
                                            className="bg-transparent w-full text-lg font-bold text-nior-navy outline-none placeholder-gray-300"
                                            value={inputs.anchoring}
                                            onChange={e => handleMaskedChange('anchoring', e.target.value)}
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>

                                {/* Desconto Local */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Tag size={12} /> Desconto
                                    </label>
                                    <div className="bg-white rounded-xl px-4 py-3 border border-gray-200 flex items-center shadow-sm transition-colors focus-within:border-nior-gold/50 focus-within:bg-white">
                                        <span className="text-sm font-bold text-gray-400 mr-2">R$</span>
                                        <input 
                                            inputMode="numeric"
                                            className="bg-transparent w-full text-lg font-bold text-nior-navy outline-none placeholder-gray-300"
                                            value={inputs.discount}
                                            onChange={e => handleMaskedChange('discount', e.target.value)}
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* --- ABA 2: FIXOS (Sistema Global) --- */}
                    {activeTab === 'FIXED' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-right duration-300">
                            
                            {/* Identidade do PDF */}
                            <div className="col-span-2 bg-white p-4 rounded-2xl border border-gray-200 mb-2">
                                <label className="text-[10px] font-bold text-nior-navy uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <FileText size={12} className="text-nior-gold" /> Identidade da Proposta (PDF)
                                </label>
                                <div className="flex gap-4">
                                    <div className="shrink-0">
                                        <label className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-nior-gold transition-colors overflow-hidden relative shadow-sm">
                                            {companyLogo ? (
                                                <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <>
                                                    <UploadCloud size={20} className="text-gray-300 mb-1" />
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase">Logo</span>
                                                </>
                                            )}
                                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                        </label>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] text-gray-400 font-bold uppercase mb-1 block">Nome da Empresa</label>
                                        <input 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-nior-navy outline-none focus:border-nior-gold"
                                            placeholder="Ex: Minha Energia Solar"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Ancoragem Padrão */}
                            <div className="col-span-2 space-y-1">
                                <label className="text-[9px] font-bold text-nior-navy uppercase tracking-wider block flex items-center gap-1">
                                    <Anchor size={10} /> Ancoragem Padrão (Novos Clientes)
                                </label>
                                <div className="bg-blue-50/50 rounded-xl px-3 py-2.5 border border-blue-100 flex items-center shadow-sm focus-within:border-nior-gold/50 transition-colors">
                                    <span className="text-xs font-bold text-blue-400 mr-1">R$</span>
                                    <input 
                                        inputMode="numeric"
                                        className="bg-transparent w-full text-sm font-bold text-blue-900 outline-none"
                                        value={inputs.anchoring}
                                        onChange={e => handleMaskedChange('anchoring', e.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            {/* Desconto Padrão */}
                            <div className="col-span-2 space-y-1">
                                <label className="text-[9px] font-bold text-nior-navy uppercase tracking-wider block flex items-center gap-1">
                                    <Tag size={10} /> Desconto Padrão (Novos Clientes)
                                </label>
                                <div className="bg-blue-50/50 rounded-xl px-3 py-2.5 border border-blue-100 flex items-center shadow-sm focus-within:border-nior-gold/50 transition-colors">
                                    <span className="text-xs font-bold text-blue-400 mr-1">R$</span>
                                    <input 
                                        inputMode="numeric"
                                        className="bg-transparent w-full text-sm font-bold text-blue-900 outline-none"
                                        value={inputs.discount}
                                        onChange={e => handleMaskedChange('discount', e.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            {/* DIVISOR */}
                            <div className="col-span-2 h-px bg-gray-200 my-1"></div>

                            {/* Spread */}
                            <div className="space-y-1 col-span-2 bg-white p-3 rounded-2xl border border-gray-200">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <TrendingUp size={10} /> Spread
                                </label>
                                <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 flex items-center shadow-sm">
                                    <input 
                                        inputMode="numeric"
                                        className="bg-transparent w-full text-base font-bold text-nior-navy outline-none"
                                        value={inputs.spread}
                                        onChange={e => handleMaskedChange('spread', e.target.value, 3)}
                                        placeholder="0,000"
                                    />
                                    <span className="text-xs font-bold text-gray-400 ml-1">%</span>
                                </div>
                            </div>

                            {/* Outras Taxas (Tarifa, IOF, Comissão, Overprice, Imposto) ... */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1"><Zap size={10} /> Tarifa</label>
                                <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-200 flex items-center shadow-sm"><span className="text-xs font-bold text-gray-400 mr-1">R$</span><input inputMode="numeric" className="bg-transparent w-full text-sm font-bold text-nior-navy outline-none" value={inputs.tariff} onChange={e => handleMaskedChange('tariff', e.target.value)} placeholder="0,00"/></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1"><Building2 size={10} /> IOF</label>
                                <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-200 flex items-center shadow-sm"><input inputMode="numeric" className="bg-transparent w-full text-sm font-bold text-nior-navy outline-none" value={inputs.iof} onChange={e => handleMaskedChange('iof', e.target.value)} placeholder="0,00"/><span className="text-xs font-bold text-gray-400 ml-1">%</span></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1"><Percent size={10} /> Comissão</label>
                                <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-200 flex items-center shadow-sm"><input inputMode="numeric" className="bg-transparent w-full text-sm font-bold text-nior-navy outline-none" value={inputs.commission} onChange={e => handleMaskedChange('commission', e.target.value)} placeholder="0,00"/><span className="text-xs font-bold text-gray-400 ml-1">%</span></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1"><TrendingUp size={10} /> Overprice</label>
                                <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-200 flex items-center shadow-sm"><input inputMode="numeric" className="bg-transparent w-full text-sm font-bold text-nior-navy outline-none" value={inputs.overprice} onChange={e => handleMaskedChange('overprice', e.target.value)} placeholder="0,00"/><span className="text-xs font-bold text-gray-400 ml-1">%</span></div>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1"><FileText size={10} /> Imposto</label>
                                <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-200 flex items-center shadow-sm"><input inputMode="numeric" className="bg-transparent w-full text-sm font-bold text-nior-navy outline-none" value={inputs.tax} onChange={e => handleMaskedChange('tax', e.target.value)} placeholder="0,00"/><span className="text-xs font-bold text-gray-400 ml-1">%</span></div>
                            </div>

                        </div>
                    )}

                </div>

                {/* Footer Action */}
                <div className="p-6 pt-2 flex justify-center shrink-0 bg-white border-t border-gray-100">
                    <button 
                        onClick={handleSave}
                        className="w-full py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 font-bold bg-nior-navy text-white border-2 border-nior-navy hover:bg-nior-blue"
                        title={activeTab === 'FIXED' ? "Salvar como Padrão Global" : "Salvar nesta Proposta"}
                    >
                        {activeTab === 'FIXED' ? <Save size={24} /> : <Check size={24} />}
                        <span className="text-xs uppercase tracking-wide">
                            {activeTab === 'FIXED' ? 'Salvar Padrão' : 'Aplicar'}
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
};
