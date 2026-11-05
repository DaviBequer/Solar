
import React, { useEffect, useState, useMemo } from 'react';
import { Search, Plus, MoreHorizontal, Share2, Zap, Banknote, Wallet, Printer } from 'lucide-react';
import { Lead, SavedProposal } from '../../public/types';
import { LeadService } from '../../services/db';
import { LeadDetailsModal } from '../crm/LeadDetailsModal';
import { useUI } from '../../context/UIContext';

interface CRMProps {
    onOpenProposal: (proposal: SavedProposal) => void; 
    refreshTrigger?: number; 
}

export const CRM: React.FC<CRMProps> = ({ onOpenProposal, refreshTrigger = 0 }) => {
  const { showToast } = useUI();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = async () => {
    const data = await LeadService.getAll();
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [refreshTrigger]);

  useEffect(() => {
      const handlePopState = (event: PopStateEvent) => {
          if (!event.state?.leadId) {
              setSelectedLead(null);
          } else {
              const lead = leads.find(l => l.id === event.state.leadId);
              if (lead) setSelectedLead(lead);
          }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [leads]);

  const handleOpenLead = (lead: Lead) => {
      window.history.pushState({ ...window.history.state, leadId: lead.id }, '', `#lead/${lead.id}`);
      setSelectedLead(lead);
  };

  const handleCloseLead = () => {
      window.history.back();
  };

  const handleUpdateStatus = async (status: Lead['status']) => {
      if (selectedLead) {
          const updatedLead = { ...selectedLead, status };
          await LeadService.update(updatedLead);
          setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
          setSelectedLead(updatedLead);
      }
  };

  const handleDeleteLead = async (id: string) => {
      await LeadService.delete(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      setSelectedLead(null);
  };

  const handleCreateLead = async () => {
      if (!filter.trim()) return;
      const newLead = await LeadService.create({ name: filter, status: 'Novo' });
      setLeads(prev => [newLead, ...prev]);
      setFilter('');
      handleOpenLead(newLead); 
  };

  const handleShareAll = async () => {
      const leadsToShare = leads.filter(l => l.status === 'Novo');
      if (leadsToShare.length === 0) { showToast("Aviso", "Sem novos leads para compartilhar.", "warning"); return; }
      
      let text = `RELATÓRIO DE NOVOS LEADS\n`;
      leadsToShare.forEach(l => text += `\n${l.name} - ${l.phone || 'Sem tel'}`);
      
      if (navigator.share) {
          try {
            await navigator.share({ title: 'Leads', text });
          } catch (e) { console.error(e); }
      }
      else { 
          await navigator.clipboard.writeText(text); 
          showToast("Copiado", "Relatório copiado para a área de transferência.", "success"); 
      }
  };

  const formatInverter = (model: string) => {
      if (!model) return '';
      const clean = model.replace(/k/gi, '').trim();
      if (/^[\d.,]+$/.test(clean)) return `${clean}K`;
      return model;
  };

  const renderTechTags = (lead: Lead) => {
      if (!lead.lastProposalSummary) return null;
      const { systemType, panelCount, panelPower, inverterModel, paymentMethod } = lead.lastProposalSummary;
      const isOnGrid = systemType === 'ON-GRID';
      return (
          <div className="flex flex-wrap gap-2 mt-2">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${isOnGrid ? 'bg-nior-gold/10 border-nior-gold/20' : 'bg-blue-50 border-blue-100'}`}>
                  <Zap size={10} className={isOnGrid ? "text-nior-goldDark" : "text-blue-600"} fill="currentColor" />
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${isOnGrid ? 'text-nior-goldDark' : 'text-blue-700'}`}>
                      {systemType === 'ON-GRID' ? 'ON-GRID' : systemType} • {panelCount}x {panelPower}W • {formatInverter(inverterModel)}
                  </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-100">
                  {paymentMethod === 'VISTA' ? <Banknote size={10} className="text-gray-500"/> : <Wallet size={10} className="text-gray-500"/>}
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                      {paymentMethod === 'VISTA' ? 'À Vista' : paymentMethod === 'FINAN' ? 'Financiado' : 'Entrada + Parc.'}
                  </span>
              </div>
          </div>
      );
  };

  const groupedLeads = useMemo(() => {
      const filtered = leads.filter(l => l.name.toLowerCase().includes(filter.toLowerCase()));
      const groups: Record<string, Lead[]> = { 'Em Negociação': [], 'Novo': [], 'Vendido': [], 'Perdido': [] };
      filtered.forEach(lead => {
          if (groups[lead.status]) groups[lead.status].push(lead);
          else groups['Novo'].push(lead);
      });
      return groups;
  }, [leads, filter]);

  const sections = ['Em Negociação', 'Novo', 'Vendido', 'Perdido'];

  return (
    <div className="pb-32 px-4 pt-6 min-h-screen bg-gray-50/50">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-nior-navy">Meus Leads</h1>
           <p className="text-gray-400 text-sm">Gerencie suas oportunidades</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleShareAll} className="bg-white text-nior-navy p-3 rounded-full shadow-sm border border-gray-100 active:scale-95 transition-transform">
                <Share2 size={20} />
            </button>
            <button onClick={fetchLeads} className="bg-white text-gray-500 p-3 rounded-full shadow-sm border border-gray-100 active:scale-95 transition-transform">
                <MoreHorizontal size={20} />
            </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar ou criar cliente..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-white pl-12 pr-20 py-4 rounded-2xl shadow-sm outline-none border border-transparent focus:border-nior-gold/50 transition-all text-nior-navy placeholder-gray-300"
        />
        {filter.trim().length > 0 && (
            <button onClick={handleCreateLead} className="absolute right-2 top-1/2 -translate-y-1/2 bg-nior-navy text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-nior-blue transition-colors shadow-sm">
                <Plus size={14} /> Criar
            </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse"></div>)}</div>
      ) : (
        <div className="space-y-8">
            {sections.map(status => {
                const groupLeads = groupedLeads[status];
                if (groupLeads.length === 0) return null;
                return (
                    <div key={status}>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className={`w-2 h-2 rounded-full ${status === 'Vendido' ? 'bg-green-500' : status === 'Perdido' ? 'bg-red-500' : status === 'Em Negociação' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{status} ({groupLeads.length})</h3>
                        </div>
                        <div className="space-y-3">
                            {groupLeads.map((lead) => (
                                <div key={lead.id} onClick={() => handleOpenLead(lead)} className={`bg-white p-5 rounded-3xl shadow-soft border transition-all duration-200 cursor-pointer active:scale-[0.98] group relative overflow-hidden ${lead.lastProposalSummary?.systemType === 'ON-GRID' ? 'border-nior-gold/30' : 'border-gray-50'}`}>
                                    {lead.lastProposalSummary?.systemType === 'ON-GRID' && <div className="absolute top-0 right-0 w-24 h-24 bg-nior-gold/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>}
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-nior-navy/5 flex items-center justify-center text-nior-navy font-bold text-lg shrink-0">{lead.name.charAt(0)}</div>
                                            <div>
                                                <h3 className="font-bold text-nior-navy text-lg leading-tight">{lead.name}</h3>
                                                <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</span></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {lead.proposalValue ? (
                                                <div className="text-right">
                                                    <span className="block text-xs text-gray-400 uppercase font-bold tracking-wider">Valor</span>
                                                    <span className="text-sm font-bold text-nior-navy">{lead.proposalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                </div>
                                            ) : null}
                                            {(lead.proposalValue || lead.lastProposalSummary) && (
                                                <div className="bg-gray-100 p-1.5 rounded-full text-gray-500 shadow-sm mt-1" title="Possui Orçamento">
                                                    <Printer size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {renderTechTags(lead)}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {selectedLead && (
          <LeadDetailsModal 
              lead={selectedLead} 
              onClose={handleCloseLead} 
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDeleteLead}
              onOpenProposal={onOpenProposal}
          />
      )}
    </div>
  );
};
