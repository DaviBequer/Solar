
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, Clock, Calendar as CalendarIcon, MapPin, 
  Briefcase, Banknote, RefreshCcw, Headset, MoreHorizontal, Check, 
  ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, Trash2
} from '../Icons';
import { Task, Lead, SolarTaskType } from '../../public/types';
import { TaskService, LeadService } from '../../services/db';
import { useUI } from '../../context/UIContext';

export const Tasks: React.FC = () => {
  const { confirm, showToast } = useUI();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Visualização
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');
  
  // Estado do Calendário
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(new Date());

  // Estado para expandir o resumo (Acordeão)
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // --- DATA LOADING ---
  const loadData = async () => {
    setLoading(true);
    try {
        const [tData, lData] = await Promise.all([TaskService.getAll(), LeadService.getAll()]);
        setTasks(tData);
        setLeads(lData);
    } catch (error) {
        console.error("Erro ao carregar agenda:", error);
        showToast("Erro", "Falha ao carregar tarefas.", "error");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Ajusta weekStart para o domingo da semana atual da selectedDate
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    setWeekStart(start);
  }, []);

  // --- HELPERS DE DATA SEGURA ---
  const safeDate = (dateInput: any): Date | null => {
      if (!dateInput) return null;
      if (typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
          return dateInput.toDate();
      }
      const d = new Date(dateInput);
      return isNaN(d.getTime()) ? null : d;
  };

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() && 
             d1.getMonth() === d2.getMonth() && 
             d1.getFullYear() === d2.getFullYear();
  };

  // --- CALENDAR LOGIC (WEEK) ---
  const weekDays = useMemo(() => {
      const days = [];
      const current = new Date(weekStart);
      for (let i = 0; i < 7; i++) {
          days.push(new Date(current));
          current.setDate(current.getDate() + 1);
      }
      return days;
  }, [weekStart]);

  const changeWeek = (direction: 'prev' | 'next') => {
      const newStart = new Date(weekStart);
      newStart.setDate(newStart.getDate() + (direction === 'next' ? 7 : -7));
      setWeekStart(newStart);
  };

  // --- CALENDAR LOGIC (MONTH) ---
  const monthDays = useMemo(() => {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      
      const startDate = new Date(firstDayOfMonth);
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Começa no Domingo anterior
      
      const endDate = new Date(lastDayOfMonth);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // Termina no Sábado posterior
      
      const days = [];
      const current = new Date(startDate);
      while (current <= endDate) {
          days.push(new Date(current));
          current.setDate(current.getDate() + 1);
      }
      return days;
  }, [selectedDate.getMonth(), selectedDate.getFullYear()]);

  const changeMonth = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
      
      // Sincroniza a weekStart também para quando voltar para a visão semanal
      const start = new Date(newDate);
      start.setDate(newDate.getDate() - newDate.getDay());
      setWeekStart(start);
  };

  // --- FILTER TASKS FOR CURRENT SELECTION (Day View) ---
  const dailyTasks = useMemo(() => {
      return tasks.filter(task => {
          const taskDate = safeDate(task.scheduledDate);
          return taskDate && isSameDay(taskDate, selectedDate);
      }).sort((a, b) => {
          const dateA = safeDate(a.scheduledDate)?.getTime() || 0;
          const dateB = safeDate(b.scheduledDate)?.getTime() || 0;
          return dateA - dateB;
      });
  }, [tasks, selectedDate]);

  // --- FILTER TASKS FOR CURRENT PERIOD (Week/Month Stats & Expanded List) ---
  const periodTasks = useMemo(() => {
      let filtered: Task[] = [];
      
      if (viewMode === 'WEEK') {
          const endWeek = new Date(weekStart);
          endWeek.setDate(endWeek.getDate() + 6);
          endWeek.setHours(23, 59, 59);
          
          filtered = tasks.filter(t => {
              const d = safeDate(t.scheduledDate);
              return d && d >= weekStart && d <= endWeek;
          });
      } else {
          const startMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          const endMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);
          
          filtered = tasks.filter(t => {
              const d = safeDate(t.scheduledDate);
              return d && d >= startMonth && d <= endMonth;
          });
      }
      
      return filtered.sort((a, b) => {
          const dateA = safeDate(a.scheduledDate)?.getTime() || 0;
          const dateB = safeDate(b.scheduledDate)?.getTime() || 0;
          return dateA - dateB;
      });
  }, [tasks, viewMode, weekStart, selectedDate]);

  // --- STATS GENERATION (Baseado em periodTasks) ---
  const currentStats = useMemo(() => {
      return {
          total: periodTasks.length,
          orcamento: periodTasks.filter(t => t.solarType === 'Visita Orçamento').length,
          tecnica: periodTasks.filter(t => t.solarType === 'Visita Técnica').length,
          posvenda: periodTasks.filter(t => t.solarType === 'Pós-venda').length,
          done: periodTasks.filter(t => t.status === 'Done').length
      };
  }, [periodTasks]);

  // --- HELPERS VISUAIS ---
  const getTaskIcon = (type?: SolarTaskType) => {
      switch(type) {
          case 'Visita Orçamento': return <Banknote size={16} />;
          case 'Visita Técnica': return <Briefcase size={16} />;
          case 'Retorno': return <RefreshCcw size={16} />;
          case 'Pós-venda': return <Headset size={16} />;
          default: return <Clock size={16} />;
      }
  };

  const getTaskColorTheme = (type?: SolarTaskType) => {
      switch(type) {
          case 'Visita Orçamento': return { bg: 'bg-nior-gold', text: 'text-nior-goldDark', border: 'border-nior-gold', dot: 'bg-nior-gold' };
          case 'Visita Técnica': return { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500', dot: 'bg-blue-500' };
          case 'Retorno': return { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500', dot: 'bg-emerald-500' };
          case 'Pós-venda': return { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500', dot: 'bg-purple-500' };
          default: return { bg: 'bg-gray-400', text: 'text-gray-500', border: 'border-gray-400', dot: 'bg-gray-400' };
      }
  };

  const formatTime = (dateInput?: any) => {
      const date = safeDate(dateInput);
      if (!date) return '--:--';
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getLeadInfo = (id?: string) => {
      return leads.find(l => l.id === id);
  };

  // --- ACTIONS ---
  const completeTask = async (task: Task, e: React.MouseEvent) => {
      e.stopPropagation();
      const updatedTask: Task = { ...task, status: task.status === 'Done' ? 'Pending' : 'Done' };
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
      await TaskService.update(updatedTask);
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
      e.stopPropagation();
      confirm({
          title: "Excluir Agendamento?",
          description: "Essa ação não pode ser desfeita.",
          type: "danger",
          onConfirm: async () => {
              setTasks(prev => prev.filter(t => t.id !== taskId));
              await TaskService.delete(taskId);
              showToast("Removido", "Agendamento excluído.", "success");
          }
      });
  };

  return (
    <div className="pb-32 px-4 pt-4 min-h-screen bg-[#F8FAFC]">
      
      {/* HEADER: Mês e Ano & Toggle */}
      <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center px-2">
            <div>
                <h1 className="text-2xl font-bold text-nior-navy capitalize flex items-center gap-2">
                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long' })}
                    <span className="text-gray-300 font-light">{selectedDate.getFullYear()}</span>
                </h1>
                <p className="text-gray-400 text-xs font-medium">
                    Gestão de Agenda
                </p>
            </div>
            
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                <button 
                    onClick={() => setViewMode('WEEK')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'WEEK' ? 'bg-nior-navy text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <CalendarDays size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('MONTH')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'MONTH' ? 'bg-nior-navy text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <LayoutGrid size={18} />
                </button>
            </div>
          </div>

          {/* SUMMARY CARD (EXPANDABLE) */}
          <div 
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center animate-in slide-in-from-top-2 cursor-pointer hover:border-nior-gold/30 transition-all active:scale-[0.98]"
          >
              <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {viewMode === 'WEEK' ? 'Resumo da Semana' : 'Resumo do Mês'}
                  </span>
                  <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-nior-navy">{currentStats.total}</span>
                      <span className="text-xs text-gray-500 font-medium">tarefas</span>
                  </div>
              </div>
              
              <div className="flex gap-3">
                  {currentStats.orcamento > 0 && (
                      <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-nior-gold/10 flex items-center justify-center text-nior-goldDark mb-1">
                              <Banknote size={14} />
                          </div>
                          <span className="text-[10px] font-bold text-nior-goldDark">{currentStats.orcamento}</span>
                      </div>
                  )}
                  {currentStats.tecnica > 0 && (
                      <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-1">
                              <Briefcase size={14} />
                          </div>
                          <span className="text-[10px] font-bold text-blue-600">{currentStats.tecnica}</span>
                      </div>
                  )}
                  {currentStats.done > 0 && (
                      <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-1">
                              <CheckCircle size={14} />
                          </div>
                          <span className="text-[10px] font-bold text-green-600">{currentStats.done}</span>
                      </div>
                  )}
              </div>
          </div>

          {/* EXPANDED LIST (ALL TASKS IN PERIOD) */}
          {isSummaryExpanded && (
              <div className="bg-white rounded-2xl p-2 shadow-inner border border-gray-100 animate-in slide-in-from-top-4 fade-in duration-300">
                  {periodTasks.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-4">Nenhuma tarefa neste período.</p>
                  ) : (
                      <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar space-y-1">
                          {periodTasks.map(task => {
                              const date = safeDate(task.scheduledDate);
                              const lead = getLeadInfo(task.linkedLeadId);
                              const theme = getTaskColorTheme(task.solarType);
                              
                              return (
                                  <div key={task.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                                      <div className="flex items-center gap-3 overflow-hidden">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${theme.bg.replace('bg-', 'bg-').replace('500', '100')} ${theme.text}`}>
                                              {getTaskIcon(task.solarType)}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                              <span className="text-xs font-bold text-nior-navy truncate">{lead?.name || task.title}</span>
                                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                  {date ? date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) : '--/--'} 
                                                  <span>•</span>
                                                  {formatTime(date)}
                                              </span>
                                          </div>
                                      </div>
                                      <button 
                                          onClick={(e) => handleDeleteTask(e, task.id)}
                                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* CALENDAR VIEW */}
      <div className="bg-white rounded-[1.5rem] p-4 shadow-soft border border-gray-100 mb-6 relative overflow-hidden transition-all duration-300">
          
          {/* Controls */}
          <div className="flex justify-between items-center mb-4">
              <button onClick={() => viewMode === 'WEEK' ? changeWeek('prev') : changeMonth('prev')} className="p-1 text-gray-300 hover:text-nior-navy transition-colors"><ChevronLeft size={20} /></button>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {viewMode === 'WEEK' 
                    ? `Semana de ${weekDays[0].getDate()} a ${weekDays[6].getDate()}` 
                    : selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => viewMode === 'WEEK' ? changeWeek('next') : changeMonth('next')} className="p-1 text-gray-300 hover:text-nior-navy transition-colors"><ChevronRight size={20} /></button>
          </div>
          
          {/* WEEK STRIP */}
          {viewMode === 'WEEK' && (
              <div className="grid grid-cols-7 gap-1 animate-in slide-in-from-left duration-300">
                  {weekDays.map((day, idx) => {
                      const isSelected = isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, new Date());
                      const dayTasks = tasks.filter(t => {
                          const d = safeDate(t.scheduledDate);
                          return d && isSameDay(d, day);
                      });
                      const hasTasks = dayTasks.length > 0;

                      return (
                          <button 
                              key={idx}
                              onClick={() => setSelectedDate(day)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all relative ${
                                  isSelected 
                                  ? 'bg-nior-navy text-white shadow-lg shadow-nior-navy/30 scale-105' 
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                          >
                              <span className="text-[9px] font-bold uppercase mb-1">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</span>
                              <span className={`text-base font-bold ${isSelected ? 'text-nior-gold' : 'text-nior-navy'}`}>{day.getDate()}</span>
                              
                              {/* Dot indicator for tasks */}
                              {!isSelected && hasTasks && (
                                  <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-nior-gold"></div>
                              )}
                              {!isSelected && isToday && (
                                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500 border border-white"></div>
                              )}
                          </button>
                      );
                  })}
              </div>
          )}

          {/* MONTH GRID */}
          {viewMode === 'MONTH' && (
              <div className="animate-in zoom-in duration-300">
                  <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                      {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                          <span key={d} className="text-[9px] font-bold text-gray-300 uppercase">{d}</span>
                      ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                      {monthDays.map((day, idx) => {
                          const isSelected = isSameDay(day, selectedDate);
                          const isToday = isSameDay(day, new Date());
                          const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                          
                          const dayTasks = tasks.filter(t => {
                              const d = safeDate(t.scheduledDate);
                              return d && isSameDay(d, day);
                          });
                          
                          const mainTask = dayTasks.find(t => t.solarType === 'Visita Orçamento') || dayTasks[0];

                          return (
                              <button 
                                  key={idx}
                                  onClick={() => setSelectedDate(day)}
                                  className={`h-14 rounded-lg flex flex-col items-center justify-start pt-2 relative transition-all ${
                                      !isCurrentMonth ? 'opacity-30' : ''
                                  } ${
                                      isSelected 
                                      ? 'bg-nior-navy text-white shadow-md' 
                                      : isToday ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                                  }`}
                              >
                                  <span className={`text-xs font-medium ${isToday && !isSelected ? 'text-blue-600 font-bold' : ''}`}>{day.getDate()}</span>
                                  
                                  <div className="flex flex-wrap gap-0.5 justify-center mt-1 px-0.5 w-full">
                                      {dayTasks.slice(0, 4).map((task, i) => (
                                          <div 
                                            key={i} 
                                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : getTaskColorTheme(task.solarType).dot}`}
                                            title={task.title}
                                          ></div>
                                      ))}
                                      {dayTasks.length > 4 && (
                                          <span className={`text-[6px] font-bold leading-none ${isSelected ? 'text-white' : 'text-gray-400'}`}>+</span>
                                      )}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>
          )}
      </div>

      {/* TASKS LIST */}
      <div className="mb-4 flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 bg-nior-navy rounded-full"></div>
          <span className="text-xs font-bold text-nior-navy uppercase tracking-widest">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <div className="animate-spin mb-2"><MoreHorizontal size={24}/></div>
              <p className="text-xs">Sincronizando agenda...</p>
          </div>
      ) : dailyTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-6 text-center opacity-60 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2 text-gray-300">
                  <CalendarIcon size={24} />
              </div>
              <h3 className="text-nior-navy font-bold text-sm">Dia Livre</h3>
              <p className="text-xs text-gray-400 max-w-[200px]">Sem tarefas para esta data.</p>
          </div>
      ) : (
          <div className="relative pl-4 space-y-6">
              <div className="absolute top-4 bottom-4 left-[21px] w-0.5 bg-gray-200 rounded-full"></div>

              {dailyTasks.map((task, idx) => {
                  const theme = getTaskColorTheme(task.solarType);
                  const isDone = task.status === 'Done';
                  const lead = getLeadInfo(task.linkedLeadId);
                  const time = formatTime(task.scheduledDate);

                  return (
                      <div key={task.id} className={`relative flex gap-4 group ${isDone ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                          
                          <div className={`relative z-10 w-4 h-4 rounded-full border-2 bg-white shrink-0 mt-6 transition-colors ${isDone ? 'border-gray-300' : 'border-nior-navy group-hover:border-nior-gold'}`}>
                              {!isDone && <div className="absolute inset-0.5 rounded-full bg-nior-navy group-hover:bg-nior-gold transition-colors"></div>}
                          </div>

                          <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-sm font-extrabold ${isDone ? 'text-gray-400' : 'text-nior-navy'}`}>{time}</span>
                                  <div className="h-px bg-gray-200 flex-1"></div>
                              </div>

                              <div 
                                  className={`bg-white rounded-2xl p-4 shadow-sm border transition-all relative overflow-hidden ${
                                      isDone 
                                      ? 'border-gray-100 bg-gray-50' 
                                      : 'border-gray-100 hover:border-nior-gold/30 hover:shadow-md'
                                  }`}
                              >
                                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${theme.bg}`}></div>

                                  <div className="flex justify-between items-start pl-3">
                                      <div className="flex-1 pr-4">
                                          <div className="flex items-center gap-2 mb-2">
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${theme.text.replace('text-', 'bg-').replace('600', '50')} ${theme.border.replace('border-', 'border-').replace('500', '100')}`}>
                                                  {getTaskIcon(task.solarType)}
                                                  {task.solarType || 'Tarefa'}
                                              </span>
                                          </div>

                                          <h3 className={`font-bold text-base leading-tight mb-1 ${isDone ? 'text-gray-500 line-through' : 'text-nior-navy'}`}>
                                              {lead?.name || task.title}
                                          </h3>
                                          
                                          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                              {task.description || 'Sem detalhes adicionais.'}
                                          </p>

                                          {lead?.address && (
                                              <div className="flex items-start gap-1.5 text-[10px] text-gray-400 bg-gray-50 p-2 rounded-lg">
                                                  <MapPin size={12} className="shrink-0 mt-0.5 text-gray-300" />
                                                  <span className="leading-snug">{lead.address}</span>
                                              </div>
                                          )}
                                      </div>

                                      <div className="flex flex-col gap-2 shrink-0">
                                          <button 
                                              onClick={(e) => completeTask(task, e)}
                                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                                                  isDone 
                                                  ? 'bg-green-100 text-green-600' 
                                                  : 'bg-gray-50 text-gray-300 hover:bg-nior-navy hover:text-white'
                                              }`}
                                          >
                                              <Check size={18} strokeWidth={3} />
                                          </button>
                                          
                                          <button 
                                              onClick={(e) => handleDeleteTask(e, task.id)}
                                              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm bg-white border border-gray-100 text-gray-300 hover:text-red-500 hover:border-red-100"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
};
