
import React, { useState, useEffect } from 'react';
import { User, ChevronDown, Search, Plus, History, Clock, X, Check } from 'lucide-react';
import { Lead, SavedProposal } from '../../public/types';

interface ClientSelectorProps {
    leads: Lead[];
    selectedLeadId: string;
    onSelectLead: (id: string) => void;
    onCreateLead: (name: string) => void;
    proposalsHistory: SavedProposal[];
    onLoadProposal: (proposal: SavedProposal) => void;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({ 
    leads, 
    selectedLeadId, 
    onSelectLead, 
    onCreateLead,
    proposalsHistory,
    onLoadProposal
}) => {
    const [inputValue, setInputValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const selectedLead = leads.find(l => l.id === selectedLeadId);

    // Sincroniza input quando um lead é selecionado externamente
    useEffect(() => {
        if (selectedLead) {
            setInputValue(selectedLead.name);
        } else {
            setInputValue('');
        }
    }, [selectedLead]);

    // Filtragem de Leads
    const filteredLeads = leads.filter(l => 
        l.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    const hasExactMatch = filteredLeads.some(l => l.name.toLowerCase() === inputValue.toLowerCase());
    const showCreateOption = inputValue.trim().length > 0 && !hasExactMatch;

    const handleSelect = (lead: Lead) => {
        onSelectLead(lead.id);
        setShowDropdown(false);
    };

    const handleCreate = () => {
        if (inputValue.trim()) {
            onCreateLead(inputValue);
            setShowDropdown(false);
        }
    };

    const handleInputFocus = () => {
        if (selectedLead) {
            // Se já tem lead selecionado, ao clicar no input, limpa seleção para buscar outro?
            // Não, o usuário pediu para editar/buscar. 
            // Vamos apenas abrir o dropdown e selecionar o texto para facilitar
            setShowDropdown(true);
        } else {
            setShowDropdown(true);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (selectedLead && e.target.value !== selectedLead.name) {
            // Se mudou o texto, desmarca o lead atual logicamente (mas mantém visual até selecionar outro)
            // Na verdade, melhor manter o ID até que ele selecione outro ou crie
        }
        setShowDropdown(true);
    };

    return (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 mb-4 relative z-50">
            <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-bold text-nior-navy uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-nior-gold"></span>
                    Cliente da Proposta
                </label>
                
                {/* ÍCONE DE HISTÓRICO (APARECE SE TIVER PROPOSTAS) */}
                {selectedLeadId && proposalsHistory.length > 0 && (
                    <button 
                        onClick={() => setShowHistoryModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-nior-navy text-white rounded-full text-[10px] font-bold shadow-lg shadow-nior-navy/20 hover:scale-105 transition-transform animate-in fade-in"
                    >
                        <History size={12} />
                        Histórico ({proposalsHistory.length})
                    </button>
                )}
            </div>
            
            <div className="relative">
                <div className={`flex items-center w-full bg-gray-50 border transition-all rounded-xl ${showDropdown ? 'border-nior-gold ring-1 ring-nior-gold/20' : 'border-gray-200'}`}>
                    <div className="pl-4 text-gray-400">
                        {selectedLead ? <User size={18} className="text-nior-navy" /> : <Search size={18} />}
                    </div>
                    <input 
                        type="text"
                        placeholder="Digite o nome do cliente..."
                        className="w-full bg-transparent p-3 text-sm font-bold text-nior-navy outline-none placeholder-gray-400"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        // Delay para permitir clique nas opções antes de fechar
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    />
                    {selectedLeadId && (
                        <div className="pr-3 animate-in zoom-in">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                    )}
                </div>

                {/* DROPDOWN MENU */}
                {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Lista de Existentes */}
                        {filteredLeads.map(lead => (
                            <button 
                                key={lead.id}
                                onMouseDown={() => handleSelect(lead)} // onMouseDown fires before onBlur
                                className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 flex justify-between items-center group transition-colors"
                            >
                                <span className="font-medium text-gray-700 group-hover:text-nior-navy text-sm">{lead.name}</span>
                                {lead.status === 'Novo' && <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Novo</span>}
                            </button>
                        ))}

                        {/* Opção Criar Novo */}
                        {showCreateOption && (
                            <button 
                                onMouseDown={handleCreate}
                                className="w-full text-left px-4 py-3 bg-nior-gold/10 hover:bg-nior-gold/20 flex items-center gap-2 text-nior-goldDark font-bold text-sm transition-colors"
                            >
                                <Plus size={16} />
                                Criar "{inputValue}"
                            </button>
                        )}

                        {filteredLeads.length === 0 && !showCreateOption && !inputValue && (
                            <div className="px-4 py-3 text-xs text-gray-400 text-center">
                                Digite para buscar ou criar...
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- MODAL DE HISTÓRICO --- */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowHistoryModal(false)}></div>
                    
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative z-10 animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 pb-2 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-nior-navy">Histórico de Orçamentos</h3>
                                <p className="text-xs text-gray-400">Propostas salvas para {selectedLead?.name}</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {proposalsHistory.map((prop, idx) => (
                                <button 
                                    key={prop.id}
                                    onClick={() => {
                                        onLoadProposal(prop);
                                        setShowHistoryModal(false);
                                    }}
                                    className="w-full bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:border-nior-gold/50 hover:shadow-md transition-all text-left group relative overflow-hidden"
                                >
                                    {idx === 0 && (
                                        <div className="absolute top-0 right-0 bg-nior-gold text-nior-navy text-[8px] font-bold px-2 py-1 rounded-bl-xl">
                                            MAIS RECENTE
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                                            <Clock size={12} />
                                            {new Date(prop.date).toLocaleDateString('pt-BR')} às {new Date(prop.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Investimento</span>
                                            <span className="text-lg font-bold text-nior-navy group-hover:text-nior-goldDark transition-colors">
                                                {prop.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Geração</span>
                                            <span className="text-sm font-bold text-gray-600">
                                                {prop.monthlyGeneration} kWh
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
