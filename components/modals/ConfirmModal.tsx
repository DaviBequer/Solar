
import React, { useEffect } from 'react';
import { AlertTriangle, Minus, Check, X, Info } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'success' | 'info';
    isAlert?: boolean; // Novo: Se true, esconde o botão cancelar
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    description,
    onConfirm,
    onCancel,
    type = 'danger',
    isAlert = false
}) => {
    
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    let Icon = AlertTriangle;
    let iconBg = 'bg-amber-100';
    let iconColor = 'text-amber-600';
    let confirmBtnClass = 'bg-nior-navy hover:bg-nior-blue text-white'; // Default Primary

    if (type === 'danger') {
        Icon = Minus;
        iconBg = 'bg-red-50';
        iconColor = 'text-red-500';
        confirmBtnClass = 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30';
    } else if (type === 'success') {
        Icon = Check;
        iconBg = 'bg-green-50';
        iconColor = 'text-green-600';
        confirmBtnClass = 'bg-nior-navy hover:bg-nior-blue text-white shadow-nior-navy/30';
    } else if (type === 'info') {
        Icon = Info;
        iconBg = 'bg-blue-50';
        iconColor = 'text-blue-600';
        confirmBtnClass = 'bg-nior-navy hover:bg-nior-blue text-white shadow-nior-navy/30';
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-auto">
            {/* Premium Backdrop */}
            <div 
                className="absolute inset-0 bg-nior-navy/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
                onClick={isAlert ? onConfirm : onCancel}
            ></div>
            
            {/* Premium Card Design */}
            <div className="bg-[#F8FAFC] w-full max-w-xs sm:max-w-sm rounded-[2rem] shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 overflow-hidden border border-white/20 p-6 flex flex-col items-center text-center">
                
                {/* Decorative Blob */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white to-transparent opacity-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                {/* Close Icon (Gray) */}
                {!isAlert && (
                    <button 
                        onClick={onCancel}
                        className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-400 hover:text-nior-navy rounded-full transition-colors z-20"
                    >
                        <X size={18} />
                    </button>
                )}

                {/* Icon Circle */}
                <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mb-5 shadow-sm border border-white/50 relative z-10`}>
                    <Icon size={32} className={iconColor} strokeWidth={2.5} />
                </div>

                <h3 className="text-xl font-extrabold text-nior-navy mb-2 leading-tight relative z-10">
                    {title}
                </h3>
                
                <p className="text-xs font-medium text-gray-500 mb-8 leading-relaxed max-w-[240px] relative z-10">
                    {description}
                </p>

                <div className="flex gap-3 w-full justify-center relative z-10">
                    {/* Cancel Button */}
                    {!isAlert && (
                        <button 
                            onClick={onCancel}
                            className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 hover:text-nior-navy transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                    )}
                    
                    {/* Confirm Button */}
                    <button 
                        onClick={onConfirm}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${confirmBtnClass}`}
                    >
                        {isAlert ? <Check size={18} /> : null}
                        <span>{isAlert ? 'Entendi' : 'Confirmar'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
