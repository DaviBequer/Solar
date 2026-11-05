
import React, { useState } from 'react';
import { CheckCircle2, X, DollarSign, Calculator, PenLine, Loader2 } from 'lucide-react';

interface CommissionModalProps {
    totalPrice: number;
    defaultCommission: number; // Valor calculado pelo sistema
    onConfirm: (isManual: boolean, value: number) => void;
    onClose: () => void;
}

export const CommissionModal: React.FC<CommissionModalProps> = ({
    totalPrice,
    defaultCommission,
    onConfirm,
    onClose
}) => {
    const [isManual, setIsManual] = useState(false);
    const [manualValue, setManualValue] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const handleConfirm = () => {
        setIsSaving(true);
        const numericValue = parseFloat(manualValue.replace(/\D/g, '')) / 100;
        onConfirm(isManual, isManual ? numericValue : defaultCommission);
    };

    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        if (rawValue === '') {
            setManualValue('');
            return;
        }
        const numericValue = parseFloat(rawValue) / 100;
        setManualValue(numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-nior-navy/80 backdrop-blur-md transition-opacity" onClick={onClose}></div>
            
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 animate-in zoom-in duration-300 overflow-hidden">
                {/* Header */}
                <div className="bg-nior-navy p-8 text-white text-center relative">
                    <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                    <div className="w-16 h-16 bg-nior-gold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-nior-gold/20">
                        <DollarSign size={32} className="text-nior-navy" />
                    </div>
                    <h3 className="text-xl font-bold">Confirmar Fechamento</h3>
                    <p className="text-white/60 text-sm mt-1">Defina a comissão final da venda</p>
                </div>

                <div className="p-8 space-y-6">
                    {/* Resumo do Projeto */}
                    <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase">Valor do Projeto</span>
                        <span className="text-lg font-extrabold text-nior-navy">{formatCurrency(totalPrice)}</span>
                    </div>

                    {/* Opções de Comissão */}
                    <div className="space-y-3">
                        <button 
                            onClick={() => setIsManual(false)}
                            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                                !isManual ? 'border-nior-gold bg-nior-gold/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!isManual ? 'bg-nior-gold text-nior-navy' : 'bg-gray-100 text-gray-400'}`}>
                                    <Calculator size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-nior-navy uppercase">Cálculo Padrão</p>
                                    <p className="text-sm font-bold text-nior-navy/60">{formatCurrency(defaultCommission)}</p>
                                </div>
                            </div>
                            {!isManual && <CheckCircle2 size={20} className="text-nior-gold" />}
                        </button>

                        <button 
                            onClick={() => setIsManual(true)}
                            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                                isManual ? 'border-nior-gold bg-nior-gold/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isManual ? 'bg-nior-gold text-nior-navy' : 'bg-gray-100 text-gray-400'}`}>
                                    <PenLine size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-nior-navy uppercase">Valor Manual</p>
                                    <p className="text-sm font-bold text-nior-navy/60">Inserir valor personalizado</p>
                                </div>
                            </div>
                            {isManual && <CheckCircle2 size={20} className="text-nior-gold" />}
                        </button>
                    </div>

                    {/* Input Manual */}
                    {isManual && (
                        <div className="animate-in slide-in-from-top duration-300">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Valor da Comissão (R$)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                                <input 
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-nior-navy outline-none focus:border-nior-gold transition-all"
                                    value={manualValue}
                                    onChange={handleManualChange}
                                    placeholder="0,00"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {/* Botão de Confirmação */}
                    <button 
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className="w-full bg-nior-navy text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-nior-blue transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                        Confirmar e Marcar como Vendido
                    </button>
                </div>
            </div>
        </div>
    );
};
