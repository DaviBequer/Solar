
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SlidersHorizontal, Home, Zap, Battery, Cpu, Warehouse, Factory, LayoutGrid, Mountain, Car, X, Plus, Minus, Cable, Activity, Aperture, Check, ArrowRight, Settings, Edit3, Layers } from 'lucide-react';
import { RoofType, ModuleBrand, InverterBrand, SolarKit, HybridRulesSet, CostRule } from '../../public/types';

interface SystemConfigProps {
    roofType: RoofType;
    onRoofChange: (type: RoofType) => void;
    voltage: string; // '110v' | '220v' | 'bifasico' | 'trifasico'
    onVoltageChange: (voltage: string) => void;
    systemType: 'ON-GRID' | 'HIBRIDO' | 'BATERIA' | 'AMPLIACAO';
    onSystemTypeChange: (type: 'ON-GRID' | 'HIBRIDO' | 'BATERIA' | 'AMPLIACAO') => void;
    preferredPanel: number | null;
    onPanelChange: (watts: number) => void;
    moduleBrand: ModuleBrand;
    onModuleBrandChange: (brand: ModuleBrand) => void;
    inverterBrand: InverterBrand;
    onInverterBrandChange: (brand: InverterBrand) => void;
    selectedKit?: SolarKit;
    batteryCount: number;
    onBatteryCountChange: (count: number) => void;
    manualModuleCount: number | null;
    onManualModuleCountChange: (count: number) => void;
    availableKits: SolarKit[];
    onManualInverterSelect: (inverter: string) => void;
    manualInverter: string | null | undefined;
    hasConsumption: boolean; 
    // NOVO: Regras Híbridas (Objeto Completo)
    hybridRules: HybridRulesSet;
    onHybridRulesChange: (rules: HybridRulesSet) => void;
    // Added platformCost props to match BudgetGenerator usage
    platformCost?: number;
    onPlatformCostChange?: (cost: number) => void;
}

export const SystemConfig: React.FC<SystemConfigProps> = ({
    roofType,
    onRoofChange,
    voltage,
    onVoltageChange,
    systemType,
    onSystemTypeChange,
    preferredPanel,
    onPanelChange,
    moduleBrand,
    onModuleBrandChange,
    inverterBrand,
    onInverterBrandChange,
    selectedKit,
    batteryCount,
    onBatteryCountChange,
    manualModuleCount,
    onManualModuleCountChange,
    availableKits,
    onManualInverterSelect,
    manualInverter,
    hasConsumption,
    hybridRules,
    onHybridRulesChange,
    platformCost,
    onPlatformCostChange
}) => {
    const [isRoofDropdownOpen, setIsRoofDropdownOpen] = useState(false);
    const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    
    // Controle da Aba de Regra no Modal (Híbrido vs Bateria)
    const [activeRuleTab, setActiveRuleTab] = useState<'hybrid' | 'battery'>('hybrid');

    // NOVO: Estado para Modal de Inversores
    const [showInverterSelector, setShowInverterSelector] = useState(false);
    // Estado para input manual
    const [customInverterInput, setCustomInverterInput] = useState('');
    
    const roofDropdownRef = useRef<HTMLDivElement>(null);
    const networkDropdownRef = useRef<HTMLDivElement>(null);

    // Fecha os dropdowns se clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roofDropdownRef.current && !roofDropdownRef.current.contains(event.target as Node)) {
                setIsRoofDropdownOpen(false);
            }
            if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target as Node)) {
                setIsNetworkDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const roofOptions: { id: RoofType, label: string, icon: React.ElementType }[] = [
        { id: 'Ceramica', label: 'Cerâmica', icon: Home },
        { id: 'Fibrocimento', label: 'Fibrocimento', icon: Warehouse },
        { id: 'Metalico', label: 'Metálico', icon: Factory },
        { id: 'Laje', label: 'Laje', icon: LayoutGrid },
        { id: 'Solo', label: 'Solo', icon: Mountain },
        { id: 'Carport', label: 'Carport', icon: Car },
    ];

    const selectedRoof = roofOptions.find(opt => opt.id === roofType) || roofOptions[0];

    const networkOptions: { id: string, label: string, icon: React.ElementType }[] = [
        { id: '220v', label: 'Monofásico', icon: Activity },
        { id: 'bifasico', label: 'Bifásico', icon: Cable },
        { id: 'trifasico', label: 'Trifásico', icon: Aperture },
    ];

    // Fallback para 110v se vier do banco antigo
    const selectedNetwork = networkOptions.find(opt => opt.id === voltage) || 
                            (voltage === '110v' ? { id: '110v', label: 'Monofásico (110)', icon: Activity } : networkOptions[0]);

    // Helper para determinar classes dinâmicas baseadas no sistema selecionado
    const getSystemTheme = (type: 'ON-GRID' | 'HIBRIDO' | 'BATERIA' | 'AMPLIACAO') => {
        switch(type) {
            case 'HIBRIDO': return { 
                main: 'bg-blue-600 text-white border-blue-600 shadow-md',
                panelActive: 'bg-blue-50 text-blue-700 border-blue-200'
            };
            case 'BATERIA': return { 
                main: 'bg-emerald-600 text-white border-emerald-600 shadow-md', // Verde natural
                panelActive: 'bg-emerald-50 text-emerald-700 border-emerald-200'
            };
            case 'AMPLIACAO': return {
                main: 'bg-purple-600 text-white border-purple-600 shadow-md',
                panelActive: 'bg-purple-50 text-purple-700 border-purple-200'
            };
            default: return { 
                main: 'bg-nior-gold text-white border-nior-gold shadow-md font-bold',
                panelActive: 'bg-nior-gold/20 text-nior-goldDark border-nior-gold'
            };
        }
    };

    const currentTheme = getSystemTheme(systemType);

    // --- CÁLCULO DE EXIBIÇÃO DE EQUIPAMENTOS ---
    const getPanelCount = () => {
        if (!selectedKit) return 0;
        // Strict logic: Returns only the column of the selected power
        if (preferredPanel === 585) return selectedKit.panel585;
        if (preferredPanel === 610) return selectedKit.panel610;
        if (preferredPanel === 700) return selectedKit.panel700;
        
        // Fallback (se não tiver kit exato, soma todos os paineis ou usa manual)
        if (manualModuleCount) return manualModuleCount;
        return selectedKit.panel585 + selectedKit.panel610 + selectedKit.panel700;
    };

    const panelCount = getPanelCount();
    
    // NOVO: Cálculo da potência numérica para validação de rede
    const inverterPowerVal = useMemo(() => {
        const model = manualInverter || selectedKit?.inverter || '';
        const match = model.match(/[\d.,]+/);
        if (match) {
            return parseFloat(match[0].replace(',', '.'));
        }
        return 0;
    }, [manualInverter, selectedKit]);

    const isSinglePhase = voltage === '110v' || voltage === '220v';
    const showInverterWarning = inverterPowerVal > 7.5 && isSinglePhase;

    // FORMATADOR DE INVERSOR
    // Se houver um inversor manual selecionado, usa ele. Senão, usa do kit.
    let inverterModel = manualInverter || selectedKit?.inverter || '---';
    
    // Extrai apenas a parte numérica (com ponto ou vírgula) para exibir no card
    const inverterMatch = inverterModel.match(/[\d.,]+/);
    if (inverterMatch) {
        const val = parseFloat(inverterMatch[0].replace(',', '.'));
        if (!isNaN(val)) {
            inverterModel = val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'K';
        } else {
            inverterModel = inverterMatch[0].replace('.', ',') + 'K';
        }
    } else {
        inverterModel = inverterModel.replace(/k/gi, '').replace('.', ',');
        if (/^[\d.,]+$/.test(inverterModel)) {
            const val = parseFloat(inverterModel.replace(',', '.'));
            if (!isNaN(val)) {
                inverterModel = val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'K';
            } else {
                inverterModel += 'K';
            }
        }
    }

    // --- LOGICA DE AJUSTE MANUAL ---
    const handleModuleAdjust = (direction: 'prev' | 'next') => {
        if (!hasConsumption) return;
        const newCount = direction === 'next' ? panelCount + 1 : Math.max(1, panelCount - 1);
        onManualModuleCountChange(newCount);
    };

    // --- HANDLERS DA REGRA HÍBRIDA ---
    const updateRuleHybrid = (field: keyof CostRule, valStr: string) => {
        const val = valStr === '' ? 0 : parseInt(valStr.replace(/\D/g, ''));
        onHybridRulesChange({
            ...hybridRules,
            hybrid: {
                ...hybridRules.hybrid,
                [field]: val
            }
        });
    };

    const updateBatteryPrice = (valStr: string) => {
        const val = valStr === '' ? 0 : parseInt(valStr.replace(/\D/g, ''));
        onHybridRulesChange({
            ...hybridRules,
            batteryPrice: val
        });
    };

    // Helper para input vazio visualmente quando é zero
    const displayVal = (val: number) => {
        if (val === 0) return '';
        return val.toString();
    };

    const displayCurrency = (val: number) => {
        if (val === 0) return '';
        return (val / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // --- LISTA DE INVERSORES DISPONÍVEIS (FILTRADA E ORDENADA) ---
    const uniqueInverters = useMemo(() => {
        const list = new Set<string>();
        // Filtra inversores da marca selecionada
        availableKits.forEach(k => {
            if (k.inverter) list.add(k.inverter);
        });
        return Array.from(list).sort((a,b) => {
            // Tenta ordenar por potência numérica, considerando decimais (vírgula ou ponto)
            const getNum = (str: string) => {
                // Remove 'K', troca vírgula por ponto para parsear
                const clean = str.toUpperCase().replace('K', '').replace(',', '.');
                return parseFloat(clean) || 0;
            };
            
            return getNum(a) - getNum(b);
        });
    }, [availableKits]);

    // Formatador para o Grid (Exibe apenas números, mantendo decimais)
    const formatGridLabel = (name: string) => {
        // Tenta extrair o número preservando decimais (ex: 7,5 ou 7.5)
        const match = name.match(/[\d.,]+/);
        if (match) {
            const val = parseFloat(match[0].replace(',', '.'));
            if (!isNaN(val)) {
                return val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
            }
            return match[0].replace('.', ',');
        }
        return name;
    };

    const handleOpenInverterSelector = () => {
        if (!hasConsumption) return;
        if (systemType === 'AMPLIACAO') return;
        // Preenche o input com o valor atual (apenas números)
        const currentVal = manualInverter || selectedKit?.inverter || '';
        const numericPart = currentVal.replace(/[^0-9.,]/g, '');
        setCustomInverterInput(numericPart);
        setShowInverterSelector(true);
    };

    const handleApplyCustomInverter = () => {
        if (!customInverterInput.trim()) {
            onManualInverterSelect(''); // Volta para automático
        } else {
            // Garante formato "XK" se o usuário digitar só numero
            let val = customInverterInput.toUpperCase().trim();
            if (/^[\d.,]+$/.test(val)) val += 'K';
            onManualInverterSelect(val);
        }
        setShowInverterSelector(false);
    };

    return (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 mb-4 relative">
            <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-bold text-nior-navy uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-nior-gold"></span>
                    Configuração do Sistema
                </label>
                <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="p-2 -mr-2 text-gray-400 hover:text-nior-gold hover:bg-nior-gold/10 rounded-full transition-all"
                >
                    <SlidersHorizontal size={16} />
                </button>
            </div>

            {/* Grid 2 Colunas: Estrutura & Rede */}
            <div className="grid grid-cols-2 gap-3 mb-2">
                {/* Roof Type Selector */}
                <div className="relative" ref={roofDropdownRef}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Estrutura</p>
                    <button 
                        onClick={() => { setIsRoofDropdownOpen(!isRoofDropdownOpen); setIsNetworkDropdownOpen(false); }}
                        className={`w-full bg-white border rounded-xl py-3 px-3 flex items-center justify-center gap-2 transition-all shadow-sm ${
                            isRoofDropdownOpen ? 'border-nior-gold ring-1 ring-nior-gold text-nior-goldDark' : 'border-nior-gold text-nior-navy'
                        }`}
                    >
                        <selectedRoof.icon size={18} strokeWidth={2.5} className="text-nior-gold shrink-0" />
                        <span className="font-bold text-xs sm:text-sm uppercase tracking-wide truncate">{selectedRoof.label}</span>
                    </button>
                    {isRoofDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                            {roofOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => { onRoofChange(opt.id); setIsRoofDropdownOpen(false); }}
                                    className={`w-full py-3 px-4 flex items-center justify-start gap-3 transition-colors border-b border-gray-50 last:border-0 ${roofType === opt.id ? 'bg-nior-gold/5 text-nior-goldDark font-bold' : 'text-gray-500 hover:bg-gray-50 font-medium'}`}
                                >
                                    <opt.icon size={16} strokeWidth={roofType === opt.id ? 2.5 : 2} className={roofType === opt.id ? 'text-nior-gold' : ''} />
                                    <span className="text-xs sm:text-sm uppercase tracking-wide">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Network Type Selector */}
                <div className="relative" ref={networkDropdownRef}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Tipo de Rede</p>
                    <button 
                        onClick={() => { setIsNetworkDropdownOpen(!isNetworkDropdownOpen); setIsRoofDropdownOpen(false); }}
                        className={`w-full bg-white border rounded-xl py-3 px-3 flex items-center justify-center gap-2 transition-all shadow-sm ${
                            isNetworkDropdownOpen ? 'border-nior-gold ring-1 ring-nior-gold text-nior-goldDark' : 'border-nior-gold text-nior-navy'
                        }`}
                    >
                        <selectedNetwork.icon size={18} strokeWidth={2.5} className="text-nior-gold shrink-0" />
                        <span className="font-bold text-xs sm:text-sm uppercase tracking-wide truncate">{selectedNetwork.label}</span>
                    </button>
                    {isNetworkDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                            {networkOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => { onVoltageChange(opt.id); setIsNetworkDropdownOpen(false); }}
                                    className={`w-full py-3 px-4 flex items-center justify-start gap-3 transition-colors border-b border-gray-50 last:border-0 ${voltage === opt.id ? 'bg-nior-gold/5 text-nior-goldDark font-bold' : 'text-gray-500 hover:bg-gray-50 font-medium'}`}
                                >
                                    <opt.icon size={16} strokeWidth={voltage === opt.id ? 2.5 : 2} className={voltage === opt.id ? 'text-nior-gold' : ''} />
                                    <span className="text-xs sm:text-sm uppercase tracking-wide">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* AVISO DE BARREIRA DE POTÊNCIA */}
            {showInverterWarning && (
                <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-red-100 p-1 rounded-lg text-red-600 shrink-0">
                        <Zap size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-red-800 uppercase leading-tight">Barreira Técnica</p>
                        <p className="text-[9px] text-red-600 font-medium mt-0.5">
                            Inversores acima de 7,5kW exigem rede Bifásica ou Trifásica. Altere o tipo de rede.
                        </p>
                    </div>
                </div>
            )}

            {/* System Type Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {(['ON-GRID', 'HIBRIDO', 'BATERIA', 'AMPLIACAO'] as const).map((type) => {
                    const isSelected = systemType === type;
                    const theme = getSystemTheme(type);
                    let Icon = Zap;
                    if (type === 'HIBRIDO') Icon = Cpu;
                    if (type === 'BATERIA') Icon = Battery;
                    if (type === 'AMPLIACAO') Icon = Layers;
                    
                    // Ajuste de label para caber
                    let label: string = type;
                    if (type === 'AMPLIACAO') label = 'AMPLIA.';

                    return (
                        <button
                            key={type}
                            onClick={() => onSystemTypeChange(type)}
                            className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border ${isSelected ? theme.main : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                        >
                            <Icon size={16} />
                            <span className="text-[9px] font-bold">{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* CONTROLES ESPECÍFICOS PARA HIBRIDO/BATERIA (CAMPO MANUAL REMOVIDO) */}
            {systemType === 'BATERIA' && (
                <div className={`rounded-2xl p-4 border mb-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-emerald-50 border-emerald-100`}>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 text-emerald-800">
                            <Battery size={18} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Qtd. Baterias</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white rounded-lg p-1 shadow-sm border border-emerald-200">
                            <button onClick={() => onBatteryCountChange(Math.max(1, batteryCount - 1))} className="w-8 h-8 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md transition-colors"><Minus size={14} strokeWidth={3} /></button>
                            <span className="font-bold text-emerald-800 text-lg w-4 text-center">{batteryCount}</span>
                            <button onClick={() => onBatteryCountChange(batteryCount + 1)} className="w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-sm"><Plus size={14} strokeWidth={3} /></button>
                        </div>
                    </div>
                    <p className="text-[9px] text-emerald-600/70 text-right pr-1">
                        + R$ {((hybridRules.batteryPrice || 6000) / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2})} por bateria
                    </p>
                </div>
            )}

            {/* Panel Power Grid */}
            <div className="grid grid-cols-3 gap-2">
                {[585, 610, 700].map((power) => (
                    <button
                        key={power}
                        onClick={() => onPanelChange(power)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all border ${preferredPanel === power ? currentTheme.main : 'bg-white text-gray-400 border-gray-200'}`}
                    >
                        {power}W
                    </button>
                ))}
            </div>

            {/* --- CARDS DE QUANTIDADE E INVERSOR (COM CONTROLE LATERAL) --- */}
            <div className={`grid grid-cols-2 gap-4 mt-6 ${!hasConsumption ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                
                {/* MODULES CARD - Side buttons for adjustment */}
                <div className="bg-gray-50 rounded-2xl border border-gray-100 h-28 relative group select-none transition-colors hover:bg-gray-100 overflow-hidden flex flex-col justify-center">
                    <button onClick={() => handleModuleAdjust('prev')} className="absolute left-0 top-0 w-1/3 h-full z-10 active:bg-black/5 transition-colors cursor-pointer outline-none"></button>
                    <button onClick={() => handleModuleAdjust('next')} className="absolute right-0 top-0 w-1/3 h-full z-10 active:bg-black/5 transition-colors cursor-pointer outline-none"></button>
                    <div className="flex items-center justify-center w-full gap-3 relative z-0">
                        <span className={`font-extrabold text-nior-navy text-center ${manualModuleCount ? 'text-nior-goldDark' : ''} text-4xl`}>{panelCount}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 text-center">{moduleBrand}</span>
                </div>

                {/* INVERTER CARD - Center click to edit */}
                <div 
                    onClick={handleOpenInverterSelector}
                    className={`bg-gray-50 rounded-2xl border ${manualInverter ? 'border-nior-gold/50 bg-nior-gold/5' : 'border-gray-100'} h-28 relative group select-none transition-all hover:bg-gray-100 overflow-hidden flex flex-col justify-center ${systemType === 'AMPLIACAO' ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
                >
                    {systemType === 'AMPLIACAO' ? (
                        <>
                            <div className="flex items-center justify-center mb-1">
                                <Layers size={24} className="text-purple-600" />
                            </div>
                            <span className="font-extrabold text-purple-800 text-center leading-tight text-xl">
                                Ampliação
                            </span>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Somente Módulos
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className={`font-extrabold text-nior-navy text-center leading-tight ${inverterModel.length > 5 ? 'text-lg' : 'text-3xl'}`}>
                                {inverterModel === '---' ? '0K' : inverterModel}
                            </span>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {inverterBrand}
                                </span>
                                {manualInverter && <Edit3 size={10} className="text-nior-gold" />}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MODAL CONFIGURAÇÕES (MARCAS + REGRAS) */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowSettingsModal(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative z-10 animate-in zoom-in duration-200 overflow-hidden max-h-[90vh] flex flex-col">
                        
                        <div className="p-5 pb-3 flex justify-between items-center border-b border-gray-100">
                            <h3 className="text-sm font-bold text-nior-navy uppercase tracking-widest flex items-center gap-2">
                                <Settings size={16} /> Ajustes do Sistema
                            </h3>
                            <button onClick={() => setShowSettingsModal(false)} className="p-1 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X size={16} /></button>
                        </div>
                        
                        <div className="p-5 overflow-y-auto space-y-6">
                            
                            {/* MARCAS */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Módulos</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['DMEGC', 'Trina', 'WEG'].map(brand => (
                                        <button key={brand} onClick={() => onModuleBrandChange(brand as ModuleBrand)} className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all border ${moduleBrand === brand ? 'bg-nior-navy text-white border-nior-navy shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{brand}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Inversor</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['SAJ', 'SOFAR', 'WEG'].map(brand => (
                                        <button key={brand} onClick={() => onInverterBrandChange(brand as InverterBrand)} className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all border ${inverterBrand === brand ? 'bg-nior-navy text-white border-nior-navy shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{brand}</button>
                                    ))}
                                </div>
                            </div>

                            {/* REGRA DE PRECIFICAÇÃO CONDICIONAL */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Cpu size={16} className="text-blue-600" />
                                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Regra de Custo</h4>
                                </div>

                                {/* ABAS DE TIPO DE REGRA */}
                                <div className="bg-gray-100 p-1 rounded-xl flex mb-3">
                                    <button 
                                        onClick={() => setActiveRuleTab('hybrid')}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                            activeRuleTab === 'hybrid' 
                                            ? 'bg-white text-blue-700 shadow-sm' 
                                            : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        Híbrido
                                    </button>
                                    <button 
                                        onClick={() => setActiveRuleTab('battery')}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                            activeRuleTab === 'battery' 
                                            ? 'bg-white text-emerald-700 shadow-sm' 
                                            : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        Baterias
                                    </button>
                                </div>

                                {/* CONTEÚDO DA ABA */}
                                {activeRuleTab === 'hybrid' ? (
                                    <div className="rounded-xl p-3 border border-blue-100 bg-blue-50/50 space-y-3">
                                        <p className="text-[9px] text-blue-600/70 mb-2 font-medium">Configura o custo da plataforma (Inversor Híbrido) baseado na quantidade de módulos.</p>
                                        
                                        {/* LIMITE DE MÓDULOS */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Limite de Módulos</label>
                                            <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1 border border-blue-200">
                                                <input 
                                                    type="text"
                                                    inputMode="numeric"
                                                    className="w-10 text-center font-bold text-blue-700 bg-transparent outline-none text-sm placeholder-blue-300"
                                                    value={displayVal(hybridRules.hybrid.threshold)}
                                                    onChange={(e) => updateRuleHybrid('threshold', e.target.value)}
                                                    placeholder="0"
                                                />
                                                <span className="text-[9px] font-bold text-gray-400">pçs</span>
                                            </div>
                                        </div>

                                        <div className="h-px w-full bg-blue-100/50"></div>

                                        {/* CUSTO BAIXO */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-[9px] text-gray-400">
                                                <span>Se Módulos ≤ {hybridRules.hybrid.threshold}</span>
                                                <span className="text-gray-600 font-bold">Custo Baixo</span>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-lg flex items-center px-3 py-2 shadow-sm focus-within:ring-1 transition-all">
                                                <span className="text-xs font-bold text-gray-400 mr-2">R$</span>
                                                <input 
                                                    type="tel"
                                                    inputMode="numeric"
                                                    className="w-full bg-transparent font-bold text-gray-700 outline-none text-sm placeholder-gray-300"
                                                    value={displayCurrency(hybridRules.hybrid.costLow * 100)} 
                                                    onChange={(e) => updateRuleHybrid('costLow', e.target.value)}
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>

                                        {/* CUSTO ALTO */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-[9px] text-gray-400">
                                                <span>Se Módulos &gt; {hybridRules.hybrid.threshold}</span>
                                                <span className="text-gray-600 font-bold">Custo Alto</span>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-lg flex items-center px-3 py-2 shadow-sm focus-within:ring-1 transition-all">
                                                <span className="text-xs font-bold text-gray-400 mr-2">R$</span>
                                                <input 
                                                    type="tel"
                                                    inputMode="numeric"
                                                    className="w-full bg-transparent font-bold text-gray-700 outline-none text-sm placeholder-gray-300"
                                                    value={displayCurrency(hybridRules.hybrid.costHigh * 100)}
                                                    onChange={(e) => updateRuleHybrid('costHigh', e.target.value)}
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl p-3 border border-emerald-100 bg-emerald-50/50 space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Battery size={16} className="text-emerald-600" />
                                            <p className="text-[9px] text-emerald-600/70 font-medium">Preço individual de cada bateria.</p>
                                        </div>

                                        {/* PREÇO BATERIA */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block">Preço Unitário da Bateria</label>
                                            <div className="bg-white border border-gray-200 rounded-lg flex items-center px-3 py-3 shadow-sm focus-within:ring-1 focus-within:border-emerald-400 transition-all">
                                                <span className="text-sm font-bold text-emerald-600 mr-2">R$</span>
                                                <input 
                                                    type="tel"
                                                    inputMode="numeric"
                                                    className="w-full bg-transparent font-bold text-emerald-800 outline-none text-base placeholder-emerald-200"
                                                    value={displayCurrency((hybridRules.batteryPrice || 0) * 100)}
                                                    onChange={(e) => updateBatteryPrice(e.target.value)}
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setShowSettingsModal(false)} className="w-full py-3 bg-gray-100 text-nior-navy font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-gray-200 transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SELEÇÃO INVERSOR (GRID LAYOUT + MANUAL INPUT) */}
            {showInverterSelector && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowInverterSelector(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative z-20 animate-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-5 pb-4 flex justify-between items-center bg-white z-10 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-nior-navy">Editar Inversor</h3>
                                <p className="text-xs text-gray-400">Escolha ou digite a potência</p>
                            </div>
                            <button onClick={() => setShowInverterSelector(false)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X size={18} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-5">
                            
                            {/* INPUT MANUAL */}
                            <div className="mb-6">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Potência Manual</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input 
                                            type="tel"
                                            inputMode="decimal"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-nior-navy outline-none focus:border-nior-gold focus:bg-white transition-all shadow-sm"
                                            placeholder="Ex: 8.5"
                                            value={customInverterInput}
                                            onChange={(e) => setCustomInverterInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">kW</span>
                                    </div>
                                    <button 
                                        onClick={handleApplyCustomInverter}
                                        className="bg-nior-navy text-white px-4 rounded-xl font-bold shadow-lg shadow-nior-navy/20 active:scale-95 transition-transform"
                                    >
                                        <Check size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 w-full mb-4"></div>

                            {/* Grid de Inversores Existentes */}
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Disponíveis nos Kits</label>
                            <div className="grid grid-cols-4 gap-3 mb-4">
                                {uniqueInverters.map((inv, idx) => {
                                    const isActive = manualInverter === inv;
                                    const label = formatGridLabel(inv);
                                    return (
                                        <button 
                                            key={idx}
                                            onClick={() => { onManualInverterSelect(inv); setShowInverterSelector(false); }}
                                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm active:scale-95 ${
                                                isActive 
                                                ? 'bg-nior-navy text-white shadow-nior-navy/30 scale-105 ring-2 ring-nior-gold border-transparent' 
                                                : 'bg-white border border-gray-100 text-nior-navy hover:border-nior-gold/50'
                                            }`}
                                        >
                                            <span className="font-extrabold text-sm leading-none break-all">{label}</span>
                                            <span className="text-[8px] font-bold opacity-60 uppercase mt-0.5">KW</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Botão Reset (Automático) */}
                            <button 
                                onClick={() => { onManualInverterSelect(''); setShowInverterSelector(false); }}
                                className={`w-full p-4 rounded-2xl border-2 border-dashed flex justify-between items-center transition-all ${!manualInverter ? 'border-nior-gold bg-nior-gold/5 text-nior-goldDark' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                            >
                                <span className="font-bold text-sm uppercase tracking-wide">Automático (Tabela)</span>
                                {!manualInverter && <Check size={18} />}
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
