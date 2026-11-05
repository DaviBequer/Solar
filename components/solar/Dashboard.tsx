
import React, { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, TrendingUp, Calendar, DollarSign, 
    Target, ArrowUpRight, Filter, PieChart,
    CheckCircle2, AlertCircle, Clock, Search, ChevronDown
} from '../Icons';
import { Lead, SavedProposal } from '../../public/types';
import { LeadService, ProposalService } from '../../services/db';

export const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [proposals, setProposals] = useState<SavedProposal[]>([]);
    
    // Filtros - Inicializa com o mês atual
    const currentMonthIndex = new Date().getMonth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(currentMonthIndex);

    // Carregar Dados
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [lData, pData] = await Promise.all([
                    LeadService.getAll(),
                    ProposalService.getAll()
                ]);
                setLeads(lData);
                setProposals(pData);
            } catch (error) {
                console.error("Erro ao carregar dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // --- CÁLCULOS FINANCEIROS ---
    
    // 1. Filtrar Propostas por Ano
    const proposalsInYear = useMemo(() => {
        return proposals.filter(p => {
            const d = new Date(p.date);
            return d.getFullYear() === selectedYear;
        });
    }, [proposals, selectedYear]);

    // 2. Dados do Gráfico (Faturamento Mensal)
    const monthlyRevenueData = useMemo(() => {
        const data = Array(12).fill(0);
        proposalsInYear.forEach(p => {
            if (p.status === 'Aprovado') { // Considera apenas aprovados para faturamento real
                const month = new Date(p.date).getMonth();
                data[month] += p.totalPrice;
            }
        });
        return data;
    }, [proposalsInYear]);

    // 3. Faturamento Total Anual
    const totalAnnualRevenue = monthlyRevenueData.reduce((a, b) => a + b, 0);

    // 4. KPIs do Período Selecionado (Mês ou Ano)
    const periodStats = useMemo(() => {
        let revenue = 0;
        let commission = 0;
        let count = 0;
        let potential = 0; // Em negociação

        const targetProposals = selectedMonth === 'ALL' 
            ? proposalsInYear 
            : proposalsInYear.filter(p => new Date(p.date).getMonth() === selectedMonth);

        targetProposals.forEach(p => {
            if (p.status === 'Aprovado') {
                revenue += p.totalPrice;
                // Soma a comissão salva ou calcula se não existir
                commission += p.commissionValue || (p.totalPrice * (p.calculationParams?.commission || 0) / 100);
                count++;
            } else if (p.status === 'Enviado' || !p.status || p.status === 'Rascunho') {
                potential += p.totalPrice;
            }
        });

        const avgTicket = count > 0 ? revenue / count : 0;

        return { revenue, commission, count, potential, avgTicket };
    }, [proposalsInYear, selectedMonth]);

    // 5. Funil de Vendas (Leads)
    const funnelStats = useMemo(() => {
        const stats = { Novo: 0, 'Em Negociação': 0, Vendido: 0, Perdido: 0 };
        leads.forEach(l => {
            if (stats[l.status] !== undefined) stats[l.status]++;
        });
        return stats;
    }, [leads]);

    const totalLeads = leads.length || 1; // Evitar divisão por zero

    // --- HELPERS VISUAIS ---
    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const fullMonthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const maxChartValue = Math.max(...monthlyRevenueData, 1);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
                <div className="animate-spin mb-4"><LayoutDashboard size={32}/></div>
                <p className="text-sm font-medium">Carregando indicadores...</p>
            </div>
        );
    }

    return (
        <div className="pb-32 px-4 pt-4 min-h-screen bg-[#F8FAFC] animate-in fade-in duration-300">
            
            {/* HEADER & FILTROS */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center px-2">
                    <div>
                        <h1 className="text-2xl font-bold text-nior-navy flex items-center gap-2">
                            Dashboard <TrendingUp size={20} className="text-nior-gold" />
                        </h1>
                        <p className="text-gray-400 text-xs font-medium">Visão geral do seu negócio</p>
                    </div>
                    
                    {/* Seletor de Ano */}
                    <div className="flex items-center gap-2">
                        <div className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
                            <Calendar size={14} className="text-gray-400" />
                            <select 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-transparent text-sm font-bold text-nior-navy outline-none appearance-none pr-2"
                            >
                                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filtro Segmentado (Estilo App) */}
                <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-md mx-auto">
                    <button 
                        onClick={() => setSelectedMonth('ALL')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                            selectedMonth === 'ALL' 
                            ? 'bg-white text-nior-navy shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Ano
                    </button>
                    
                    <button 
                        onClick={() => setSelectedMonth(currentMonthIndex)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                            selectedMonth === currentMonthIndex
                            ? 'bg-white text-nior-navy shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Mês Atual
                    </button>

                    <div className={`flex-1 relative py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        selectedMonth !== 'ALL' && selectedMonth !== currentMonthIndex
                        ? 'bg-white text-nior-navy shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}>
                        <span className="truncate">
                            {selectedMonth !== 'ALL' && selectedMonth !== currentMonthIndex 
                                ? monthNames[selectedMonth] 
                                : 'Outro'}
                        </span>
                        <ChevronDown size={12} />
                        <select
                            value={selectedMonth === 'ALL' ? '' : selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                            <option value="" disabled>Selecionar</option>
                            {monthNames.map((m, idx) => (
                                <option key={m} value={idx}>{fullMonthNames[idx]}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* --- CARDS DE KPI --- */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Faturamento */}
                <div className="col-span-2 bg-gradient-to-br from-nior-navy to-[#2a4069] rounded-[1.5rem] p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className="text-[10px] font-bold text-nior-gold uppercase tracking-widest flex items-center gap-1.5">
                            <DollarSign size={12} /> Comissão {selectedMonth === 'ALL' ? 'Anual' : (typeof selectedMonth === 'number' ? fullMonthNames[selectedMonth] : 'Mensal')}
                        </span>
                        {periodStats.commission > 0 && <div className="bg-white/10 px-2 py-0.5 rounded text-[9px] font-bold text-green-300 flex items-center gap-1"><ArrowUpRight size={10} /> Realizado</div>}
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-1">{formatCurrency(periodStats.commission)}</h2>
                        <div className="flex items-center gap-2 opacity-70 text-[10px]">
                            <span>{periodStats.count} vendas confirmadas</span>
                            <span>•</span>
                            <span>Faturamento: {formatCurrency(periodStats.revenue)}</span>
                        </div>
                    </div>
                </div>

                {/* Potencial (Pipeline) */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-2">
                        <Target size={12} /> Em Negociação
                    </span>
                    <span className="text-lg font-bold text-nior-navy">{formatCurrency(periodStats.potential)}</span>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '45%' }}></div>
                    </div>
                </div>

                {/* Conversão (Leads) */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-2">
                        <PieChart size={12} /> Taxa Conversão
                    </span>
                    <span className="text-lg font-bold text-nior-navy">
                        {totalLeads > 0 ? ((funnelStats.Vendido / totalLeads) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="text-[9px] text-gray-400">
                        {funnelStats.Vendido} vendidos de {totalLeads}
                    </span>
                </div>
            </div>

            {/* --- GRÁFICO DE FATURAMENTO (BARRAS CSS) --- */}
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-nior-navy uppercase tracking-wide flex items-center gap-2">
                        <TrendingUp size={16} className="text-nior-gold" />
                        Evolução Financeira
                    </h3>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        Total: {formatCurrency(totalAnnualRevenue)}
                    </span>
                </div>

                <div className="flex items-end justify-between h-40 gap-2 pb-2">
                    {monthlyRevenueData.map((val, idx) => {
                        const percent = (val / maxChartValue) * 100;
                        const isSelected = selectedMonth === idx;
                        const isCurrentMonth = new Date().getMonth() === idx && selectedYear === new Date().getFullYear();
                        
                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer" onClick={() => setSelectedMonth(idx)}>
                                <div className="relative w-full flex justify-center h-full items-end">
                                    {/* Tooltip Value */}
                                    <div className={`absolute -top-6 text-[9px] font-bold bg-nior-navy text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 ${isSelected ? 'opacity-100' : ''}`}>
                                        {(val / 1000).toFixed(0)}k
                                    </div>
                                    
                                    {/* Bar */}
                                    <div 
                                        className={`w-full max-w-[16px] rounded-t-sm transition-all duration-500 ease-out ${
                                            isSelected 
                                            ? 'bg-nior-gold' 
                                            : isCurrentMonth ? 'bg-nior-navy' : 'bg-gray-200 group-hover:bg-nior-navy/50'
                                        }`}
                                        style={{ height: `${Math.max(percent, 2)}%` }} // Min 2% height
                                    ></div>
                                </div>
                                {/* Label */}
                                <span className={`text-[9px] font-bold mt-2 uppercase ${isSelected ? 'text-nior-navy' : 'text-gray-300'}`}>
                                    {monthNames[idx].charAt(0)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- FUNIL DE VENDAS (STATUS) --- */}
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100 mb-6">
                <h3 className="text-sm font-bold text-nior-navy uppercase tracking-wide flex items-center gap-2 mb-4">
                    <Filter size={16} className="text-blue-500" />
                    Status dos Leads
                </h3>
                
                <div className="space-y-3">
                    {/* Novo */}
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-blue-600">Novos</span>
                            <span className="text-gray-600">{funnelStats.Novo}</span>
                        </div>
                        <div className="w-full bg-blue-50 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${(funnelStats.Novo / totalLeads) * 100}%` }}></div>
                        </div>
                    </div>

                    {/* Em Negociação */}
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-amber-600">Em Negociação</span>
                            <span className="text-gray-600">{funnelStats['Em Negociação']}</span>
                        </div>
                        <div className="w-full bg-amber-50 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${(funnelStats['Em Negociação'] / totalLeads) * 100}%` }}></div>
                        </div>
                    </div>

                    {/* Vendido */}
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-green-600">Vendidos</span>
                            <span className="text-gray-600">{funnelStats.Vendido}</span>
                        </div>
                        <div className="w-full bg-green-50 h-2 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${(funnelStats.Vendido / totalLeads) * 100}%` }}></div>
                        </div>
                    </div>

                    {/* Perdido */}
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-red-400">Perdidos</span>
                            <span className="text-gray-600">{funnelStats.Perdido}</span>
                        </div>
                        <div className="w-full bg-red-50 h-2 rounded-full overflow-hidden">
                            <div className="bg-red-300 h-full rounded-full transition-all duration-500" style={{ width: `${(funnelStats.Perdido / totalLeads) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ÚLTIMOS PROJETOS APROVADOS --- */}
            <div>
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-sm font-bold text-nior-navy uppercase tracking-wide flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-green-500" />
                        Últimas Vendas
                    </h3>
                </div>

                <div className="space-y-3">
                    {proposals
                        .filter(p => p.status === 'Aprovado')
                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 5)
                        .map(p => {
                            const leadName = leads.find(l => l.id === p.leadId)?.name || 'Cliente';
                            return (
                                <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                                    <div>
                                        <span className="text-xs font-bold text-nior-navy block">{leadName}</span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            {new Date(p.date).toLocaleDateString()}
                                            <span>•</span>
                                            {p.monthlyGeneration} kWh
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-sm font-extrabold text-green-600">{formatCurrency(p.totalPrice)}</span>
                                        <span className="text-[9px] font-bold text-gray-300 uppercase">Aprovado</span>
                                    </div>
                                </div>
                            );
                        })
                    }
                    {proposals.filter(p => p.status === 'Aprovado').length === 0 && (
                        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <AlertCircle size={24} className="mx-auto mb-2 opacity-50"/>
                            <p className="text-xs">Nenhuma venda registrada ainda.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
