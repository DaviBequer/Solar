
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calculator, X, Plus, Minus, Check, Zap, DollarSign, Percent } from '../Icons';
import { ConfirmModal } from '../modals/ConfirmModal';
import { UnitConsumption } from '../../public/types';

interface ConsumptionInputProps {
    consumption: number;
    tariff: number;
    isMoneyMode: boolean;
    onConsumptionChange: (val: string) => void;
    onToggleMode: () => void;
    onApplyKwh: (val: number, history: number[], units: UnitConsumption[]) => void;
    consumptionHistory?: number[];
    consumptionUnits?: UnitConsumption[];
    safetyMargin: number; 
    onSafetyMarginChange: (margin: number) => void;
}

// --- SUBCOMPONENT: CALCULADORA MODAL (MÉDIA PURA) ---
const ConsumptionCalculatorModal: React.FC<{
    initialUnits?: UnitConsumption[];
    onClose: () => void;
    onApply: (totalKwh: number, history: number[], units: UnitConsumption[]) => void;
}> = ({ initialUnits, onClose, onApply }) => {
    
    const firstInputRef = useRef<HTMLInputElement>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    
    // Inicializa com as unidades completas salvas OU cria a padrão
    const [units, setUnits] = useState<UnitConsumption[]>(() => {
        if (initialUnits && initialUnits.length > 0) {
            return initialUnits;
        }
        return [{ 
            id: '1', 
            name: 'Unidade Principal', 
            values: Array(12).fill('') 
        }];
    });

    useEffect(() => {
        if (firstInputRef.current) {
            setTimeout(() => {
                firstInputRef.current?.focus();
            }, 100);
        }
    }, []);

    const handleValueChange = (unitId: string, index: number, value: string) => {
        const numericValue = value.replace(/\D/g, '');
        setUnits(prev => prev.map(u => {
            if (u.id === unitId) {
                const newValues = [...u.values];
                newValues[index] = numericValue;
                return { ...u, values: newValues };
            }
            return u;
        }));
    };

    const addUnit = () => {
        setUnits(prev => [
            ...prev,
            { id: Math.random().toString(), name: `Unidade ${prev.length + 1}`, values: Array(12).fill('') }
        ]);
    };

    const removeUnit = (id: string) => {
        if (units.length > 1) {
            setUnits(prev => prev.filter(u => u.id !== id));
        }
    };

    const handleResetClick = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        setUnits([{ id: '1', name: 'Unidade Principal', values: Array(12).fill('') }]);
        setShowResetConfirm(false);
        setTimeout(() => firstInputRef.current?.focus(), 100);
    };

    const calculateTotal = () => {
        let grandTotalAverage = 0;
        
        units.forEach(unit => {
            const filledValues = unit.values
                .map(v => parseInt(v) || 0)
                .filter(v => v > 0);
            
            const unitTotal = filledValues.reduce((acc, val) => acc + val, 0);
            const count = filledValues.length;
            const unitAverage = count > 0 ? unitTotal / count : 0;
            grandTotalAverage += unitAverage;
        });
        
        return Math.ceil(grandTotalAverage);
    };

    const getHistoryArray = () => {
        return units[0].values.map(v => parseInt(v) || 0);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative z-10 animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                
                <div className="p-6 pb-2 flex justify-between items-center border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-nior-navy">Calculadora de Média</h3>
                        <p className="text-xs text-gray-400">Preencha os meses disponíveis</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleResetClick} 
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                            title="Limpar Campos"
                        >
                            <Minus size={18} />
                        </button>
                        <button onClick={onClose} className="p-2 bg-gray-100 text-nior-navy rounded-full hover:bg-gray-200">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {units.map((unit, unitIndex) => (
                        <div key={unit.id} className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-nior-navy uppercase tracking-wider">{unit.name}</span>
                                {units.length > 1 && (
                                    <button onClick={() => removeUnit(unit.id)} className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-sm">
                                        <Minus size={12} />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {unit.values.map((val, idx) => (
                                    <input 
                                        key={idx}
                                        ref={unitIndex === 0 && idx === 0 ? firstInputRef : null}
                                        inputMode="numeric"
                                        placeholder={`Mês ${idx + 1}`}
                                        className={`border rounded-lg p-2 text-center text-sm font-bold outline-none transition-all
                                            focus:border-green-500 focus:ring-1 focus:ring-green-500/20 focus:bg-white focus:text-nior-navy
                                            ${val 
                                                ? 'bg-white border-nior-gold text-nior-navy shadow-sm' 
                                                : 'bg-gray-50 border-gray-100 text-gray-400'
                                            }
                                        `}
                                        value={val}
                                        onChange={(e) => handleValueChange(unit.id, idx, e.target.value)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={addUnit}
                        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-nior-gold hover:text-nior-gold transition-all text-xs font-bold uppercase"
                    >
                        <Plus size={16} /> Adicionar Unidade Consumidora
                    </button>
                </div>

                <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50 rounded-b-[2rem]">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-sm font-bold text-gray-500">Média Real:</span>
                        <span className="text-2xl font-extrabold text-nior-navy tracking-tight">{calculateTotal()} kWh</span>
                    </div>
                    
                    <div className="flex justify-end">
                        <button 
                            onClick={() => {
                                onApply(calculateTotal(), getHistoryArray(), units);
                                onClose();
                            }}
                            className="w-14 h-14 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all flex items-center justify-center active:scale-95"
                            title="Aplicar Média"
                        >
                            <Check size={28} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal 
                isOpen={showResetConfirm}
                title="Limpar Campos?"
                description="Isso apagará todos os valores inseridos na calculadora. Essa ação não pode ser desfeita."
                type="danger"
                onConfirm={confirmReset}
                onCancel={() => setShowResetConfirm(false)}
            />
        </div>
    );
};

export const ConsumptionInput: React.FC<ConsumptionInputProps> = ({ 
    consumption, 
    tariff, 
    isMoneyMode, 
    onConsumptionChange, 
    onToggleMode,
    onApplyKwh,
    consumptionHistory,
    consumptionUnits,
    safetyMargin,
    onSafetyMarginChange
}) => {
    const [showCalculator, setShowCalculator] = useState(false);

    const formattedValue = useMemo(() => {
        if (consumption === 0) return '';
        return consumption.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    }, [consumption]);

    const handleApplyCalculator = (totalKwh: number, history: number[], units: UnitConsumption[]) => {
        onApplyKwh(totalKwh, history, units);
    };

    const conversionText = useMemo(() => {
        if (consumption === 0) return '---';
        if (isMoneyMode) {
            const kwh = Math.ceil(consumption / (tariff || 0.92));
            return `≈ ${kwh} kWh`;
        } else {
            const money = consumption * (tariff || 0.92);
            return `≈ ${money.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        }
    }, [consumption, isMoneyMode, tariff]);

    const hasValue = consumption > 0;
    const hasHistory = (consumptionHistory && consumptionHistory.length > 0 && consumptionHistory.some(h => h > 0)) || (consumptionUnits && consumptionUnits.length > 0);

    return (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 mb-4 relative overflow-hidden">
            
            {/* Header Line with Centered Filters - RESPONSIVE FIX */}
            <div className="flex flex-col sm:block mb-2 sm:mb-1 relative">
                <div className="flex justify-between items-center min-h-[32px] relative z-10">
                    <label className="text-[10px] font-bold text-nior-navy uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-nior-gold"></span>
                        Consumo Médio
                    </label>
                    
                    <button 
                        onClick={() => setShowCalculator(true)}
                        className={`p-2 rounded-xl text-nior-navy transition-all shadow-sm border group flex items-center gap-2 ${
                            hasHistory
                            ? 'bg-nior-gold text-white border-nior-gold hover:bg-nior-goldDark'
                            : 'bg-gray-50 border-gray-100 hover:bg-nior-gold hover:text-white'
                        }`}
                        title="Calculadora de Média"
                    >
                        <Calculator size={14} className="group-hover:scale-110 transition-transform" />
                        {hasHistory && (
                            <span className="text-[9px] font-bold uppercase">Editar</span>
                        )}
                    </button>
                </div>

                {/* FILTROS DE MARGEM: Abaixo no mobile, Absoluto no centro no desktop */}
                {/* FIX: Z-INDEX 20 to be clickable above z-10 header */}
                <div className="mt-3 sm:mt-0 flex justify-center sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-20">
                    <div className="flex bg-gray-100 p-0.5 rounded-lg shadow-sm">
                        {[0, 10, 20].map((m) => (
                            <button
                                key={m}
                                onClick={() => onSafetyMarginChange(m)}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-bold transition-all ${
                                    safetyMargin === m 
                                    ? 'bg-nior-navy text-white shadow-sm' 
                                    : 'text-gray-400 hover:text-nior-navy'
                                }`}
                            >
                                {m === 0 ? 'Real' : `+${m}%`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="relative h-14 flex items-center justify-center mt-1">
                <button 
                    onClick={onToggleMode}
                    className="absolute right-0 z-20 h-10 w-10 bg-nior-navy text-white rounded-xl shadow-lg shadow-nior-navy/20 flex items-center justify-center active:scale-95 transition-all hover:bg-nior-blue"
                    title="Alternar Unidade"
                >
                    {isMoneyMode ? (
                        <DollarSign size={20} className="text-nior-gold" />
                    ) : (
                        <Zap size={20} className="text-nior-gold fill-current" />
                    )}
                </button>

                <div className="flex items-baseline justify-center w-full max-w-[85%] pr-10 relative">
                    <div className="flex-1 flex justify-end items-baseline gap-1">
                        {isMoneyMode && (
                            <span className="text-2xl font-bold text-nior-navy opacity-40 select-none">R$</span>
                        )}
                        <input 
                            type="tel"
                            inputMode="numeric"
                            placeholder="0"
                            value={formattedValue}
                            onChange={(e) => onConsumptionChange(e.target.value)}
                            style={{ width: `${Math.max(1, formattedValue.length)}ch` }}
                            className="text-right bg-transparent text-4xl font-extrabold text-nior-navy outline-none placeholder-gray-200 tracking-tight p-0 border-none min-w-[1ch]"
                        />
                    </div>

                    <div className="flex-1 flex justify-start items-baseline">
                        {isMoneyMode ? (
                            <span className={`text-4xl font-extrabold text-nior-navy tracking-tight transition-opacity duration-200 ${hasValue ? 'opacity-100' : 'opacity-0'}`}>
                                ,00
                            </span>
                        ) : (
                            <span className="text-xl font-bold text-nior-navy opacity-40 select-none ml-1">kWh</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-lg font-medium text-gray-400 tracking-tight leading-none">
                    {conversionText}
                </span>
                <span className="bg-nior-navy px-3 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider shadow-sm border border-nior-navy">
                    Tarifa R$ {tariff.toFixed(2)}
                </span>
            </div>

            {showCalculator && (
                <ConsumptionCalculatorModal 
                    initialUnits={consumptionUnits}
                    onClose={() => setShowCalculator(false)} 
                    onApply={handleApplyCalculator} 
                />
            )}
        </div>
    );
};