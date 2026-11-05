
import React from 'react';
import { Banknote, CreditCard, Wallet } from 'lucide-react';

interface PaymentOptionsProps {
    paymentMethod: 'VISTA' | 'FINAN' | 'ENTRY';
    onPaymentChange: (method: 'VISTA' | 'FINAN' | 'ENTRY') => void;
    installments: number;
    onInstallmentsChange: (val: number) => void;
    downPayment: number;
    onDownPaymentChange: (val: number) => void;
    interestRate: number;
    onInterestRateChange: (rate: number) => void;
    totalPrice?: number; // Nova prop para cálculo do resumo
}

export const PaymentOptions: React.FC<PaymentOptionsProps> = ({ 
    paymentMethod, 
    onPaymentChange,
    installments,
    onInstallmentsChange,
    downPayment,
    onDownPaymentChange,
    interestRate,
    onInterestRateChange,
    totalPrice = 0
}) => {
    const installmentOptions = [12, 24, 36, 48, 60, 72];
    
    // Escala de Taxas Permitidas
    const ALLOWED_RATES = [1.49, 1.59, 1.69, 1.79, 1.89, 1.99, 2.10];

    const formatCurrencyInput = (val: number) => {
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatCurrencyDisplay = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const handleDownPaymentChange = (val: string) => {
        const digits = val.replace(/\D/g, '');
        onDownPaymentChange(parseInt(digits || '0') / 100);
    };

    // --- LÓGICA DE CLIQUE DUPLO (ESQUERDA/DIREITA) ---
    const handleRateDecrease = () => {
        const currentIndex = ALLOWED_RATES.indexOf(interestRate);
        if (currentIndex > 0) {
            onInterestRateChange(ALLOWED_RATES[currentIndex - 1]);
        }
    };

    const handleRateIncrease = () => {
        const currentIndex = ALLOWED_RATES.indexOf(interestRate);
        if (currentIndex < ALLOWED_RATES.length - 1) {
            onInterestRateChange(ALLOWED_RATES[currentIndex + 1]);
        }
    };

    return (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 mb-4">
            <label className="text-[10px] font-bold text-nior-navy uppercase tracking-widest mb-4 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-nior-gold"></span>
                Condições de Pagamento
            </label>

            {/* Grid de Opções de Pagamento */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                
                {/* À VISTA - AGORA DOURADO */}
                <button 
                    onClick={() => onPaymentChange('VISTA')}
                    className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border active:scale-95 ${
                        paymentMethod === 'VISTA'
                        ? 'bg-nior-gold text-white border-nior-gold shadow-lg shadow-nior-gold/20'
                        : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                    }`}
                >
                    <Banknote size={24} strokeWidth={paymentMethod === 'VISTA' ? 2 : 1.5} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">À Vista</span>
                </button>

                {/* FINANCIADO */}
                <button 
                    onClick={() => onPaymentChange('FINAN')}
                    className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border active:scale-95 ${
                        paymentMethod === 'FINAN'
                        ? 'bg-nior-navy text-white border-nior-navy shadow-lg shadow-nior-navy/20'
                        : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                    }`}
                >
                    <CreditCard size={24} strokeWidth={paymentMethod === 'FINAN' ? 2 : 1.5} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Financiado</span>
                </button>

                {/* FINAN + ENTRADA */}
                <button 
                    onClick={() => onPaymentChange('ENTRY')}
                    className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border active:scale-95 ${
                        paymentMethod === 'ENTRY'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                        : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                    }`}
                >
                    <Wallet size={24} strokeWidth={paymentMethod === 'ENTRY' ? 2 : 1.5} />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-center leading-tight">Finan. +<br/>Entrada</span>
                </button>
            </div>

            {/* Parcelas & Detalhes (Apenas se não for À Vista) */}
            {paymentMethod !== 'VISTA' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
                    
                    {/* Seletor de Parcelas */}
                    <div className="flex justify-between gap-2 overflow-x-auto hide-scrollbar">
                        {installmentOptions.map(opt => (
                            <button
                                key={opt}
                                onClick={() => onInstallmentsChange(opt)}
                                className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all border min-w-[45px] ${
                                    installments === opt
                                    ? (paymentMethod === 'ENTRY' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-nior-navy text-white border-nior-navy shadow-md')
                                    : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                                }`}
                            >
                                {opt}x
                            </button>
                        ))}
                    </div>

                    {/* Inputs de Detalhes - Layout Dinâmico */}
                    <div className={`grid gap-4 ${paymentMethod === 'ENTRY' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        
                        {/* Taxa de Juros (Controlável por Áreas Invisíveis) */}
                        <div className="flex flex-col items-center relative">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Taxa de Juros</span>
                            
                            <div className="w-full bg-gray-50 rounded-xl py-3 px-4 border border-gray-200 flex items-center justify-center shadow-inner relative overflow-hidden select-none">
                                {/* Botão Invisível Esquerdo (Diminuir) */}
                                <button 
                                    onClick={handleRateDecrease} 
                                    className="absolute left-0 top-0 w-1/2 h-full z-10 active:bg-black/5 transition-colors cursor-pointer outline-none"
                                ></button>
                                
                                {/* Botão Invisível Direito (Aumentar) */}
                                <button 
                                    onClick={handleRateIncrease} 
                                    className="absolute right-0 top-0 w-1/2 h-full z-10 active:bg-black/5 transition-colors cursor-pointer outline-none"
                                ></button>

                                <span className="text-nior-navy font-bold text-base transition-all duration-200">
                                    {interestRate.toFixed(2)}% a.m
                                </span>
                            </div>
                        </div>

                        {/* Valor Entrada (Apenas para ENTRY) */}
                        {paymentMethod === 'ENTRY' && (
                            <div className="flex flex-col items-center animate-in fade-in slide-in-from-right duration-300">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Valor da Entrada</span>
                                <div className="w-full bg-white rounded-xl py-3 px-4 border border-emerald-200 flex items-center justify-center relative shadow-sm">
                                    <span className="text-gray-400 text-xs font-bold absolute left-3">R$</span>
                                    <input 
                                        type="tel"
                                        inputMode="numeric"
                                        className="w-full text-center bg-transparent font-bold text-base text-nior-navy outline-none"
                                        value={downPayment > 0 ? formatCurrencyInput(downPayment) : '0,00'}
                                        onChange={(e) => handleDownPaymentChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RESUMO SIMPLIFICADO (APENAS VALOR FINANCIADO) */}
                    {paymentMethod === 'ENTRY' && (
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col items-center justify-center animate-in fade-in slide-in-from-top-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor a Financiar</span>
                            <span className="text-xl font-extrabold text-nior-navy tracking-tight">
                                {formatCurrencyDisplay(Math.max(0, totalPrice - downPayment))}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
