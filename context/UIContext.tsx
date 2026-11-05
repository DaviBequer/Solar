
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X, Check, AlertTriangle, Info, Minus } from 'lucide-react';

// --- TYPES ---
export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    title: string;
    message: string;
    type: ToastType;
}

interface ConfirmOptions {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'success';
    onConfirm: () => void;
}

interface UIContextData {
    showToast: (title: string, message: string, type?: ToastType) => void;
    confirm: (options: ConfirmOptions) => void;
}

const UIContext = createContext<UIContextData>({} as UIContextData);

export const useUI = () => useContext(UIContext);

// --- COMPONENTES VISUAIS INTERNOS ---

const ToastItem: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(toast.id), 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    let bg = 'bg-white';
    let border = 'border-gray-100';
    let iconColor = 'text-gray-500';
    let Icon = Info;

    switch (toast.type) {
        case 'success':
            bg = 'bg-white';
            border = 'border-l-4 border-l-green-500';
            iconColor = 'text-green-500';
            Icon = Check;
            break;
        case 'error':
            bg = 'bg-white';
            border = 'border-l-4 border-l-red-500';
            iconColor = 'text-red-500';
            Icon = AlertTriangle;
            break;
        case 'warning':
            bg = 'bg-white';
            border = 'border-l-4 border-l-amber-500';
            iconColor = 'text-amber-500';
            Icon = AlertTriangle;
            break;
        case 'info':
            bg = 'bg-white';
            border = 'border-l-4 border-l-blue-500';
            iconColor = 'text-blue-500';
            Icon = Info;
            break;
    }

    return (
        <div className={`${bg} ${border} shadow-lg rounded-r-lg p-4 mb-3 flex items-start gap-3 min-w-[300px] max-w-sm animate-in slide-in-from-right fade-in duration-300 relative overflow-hidden pointer-events-auto`}>
            <div className={`mt-0.5 ${iconColor}`}><Icon size={18} /></div>
            <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-800 leading-tight">{toast.title}</h4>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{toast.message}</p>
            </div>
            <button onClick={() => onClose(toast.id)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={14} />
            </button>
        </div>
    );
};

const ConfirmModal: React.FC<{ options: ConfirmOptions; onClose: () => void }> = ({ options, onClose }) => {
    if (!options) return null;

    let btnColor = 'bg-nior-navy hover:bg-nior-blue';
    let Icon = AlertTriangle;
    let iconBg = 'bg-amber-100';
    let iconText = 'text-amber-600';

    if (options.type === 'danger') {
        btnColor = 'bg-red-500 hover:bg-red-600 shadow-red-500/30';
        Icon = Minus;
        iconBg = 'bg-red-50';
        iconText = 'text-red-500';
    } else if (options.type === 'success') {
        Icon = Check;
        iconBg = 'bg-green-50';
        iconText = 'text-green-600';
    } else if (options.type === 'info') {
        Icon = Info;
        iconBg = 'bg-blue-50';
        iconText = 'text-blue-600';
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-nior-navy/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#F8FAFC] w-full max-w-sm rounded-[2rem] shadow-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 relative overflow-hidden border border-white/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white to-transparent opacity-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                
                <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mb-5 shadow-sm border border-white/50 relative z-10`}>
                    <Icon size={32} className={iconText} strokeWidth={2.5} />
                </div>

                <h3 className="text-xl font-extrabold text-nior-navy mb-2 leading-tight relative z-10">{options.title}</h3>
                <p className="text-xs font-medium text-gray-500 mb-8 leading-relaxed relative z-10">{options.description}</p>

                <div className="flex gap-3 w-full justify-center relative z-10">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 transition-all active:scale-95"
                    >
                        {options.cancelText || 'Cancelar'}
                    </button>
                    <button 
                        onClick={() => { options.onConfirm(); onClose(); }}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-white text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${btnColor}`}
                    >
                        {options.confirmText || 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- PROVIDER ---

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

    const showToast = useCallback((title: string, message: string, type: ToastType = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, title, message, type }]);
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => {
        setConfirmOptions(options);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <UIContext.Provider value={{ showToast, confirm }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onClose={removeToast} />
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmOptions && (
                <ConfirmModal options={confirmOptions} onClose={() => setConfirmOptions(null)} />
            )}
        </UIContext.Provider>
    );
};
