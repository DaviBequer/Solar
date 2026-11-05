
import React from 'react';
import { Save, FileDown } from 'lucide-react';

interface ProposalActionsProps {
    onSaveProposal: () => void;
    onOpenPdf: () => void;
}

export const ProposalActions: React.FC<ProposalActionsProps> = ({
    onSaveProposal,
    onOpenPdf
}) => {
    return (
        <div className="flex justify-center items-center gap-4 mt-0 mb-32 px-4 animate-in fade-in slide-in-from-bottom duration-500 print:hidden">
            
            {/* SALVAR */}
            <button 
                onClick={onSaveProposal}
                className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-emerald-600 hover:border-emerald-500 transition-all active:scale-95 flex items-center justify-center"
                title="Salvar"
            >
                <Save size={24} />
            </button>

            {/* ABRIR PREVIEW DO PDF */}
            <button 
                onClick={onOpenPdf}
                className="w-14 h-14 rounded-2xl bg-white text-nior-navy border-2 border-nior-navy shadow-lg shadow-nior-navy/10 hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center"
                title="Gerar PDF"
            >
                <FileDown size={24} strokeWidth={2.5} />
            </button>

        </div>
    );
};
