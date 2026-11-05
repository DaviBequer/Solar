
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BudgetGenerator } from './components/budget/BudgetGenerator';
import { CRM } from './components/solar/CRM';
import { Tasks } from './components/solar/Tasks';
import { SolarTable } from './components/solar/SolarTable';
import { Dashboard } from './components/solar/Dashboard'; 
import { UIProvider, useUI } from './context/UIContext'; // NOVO IMPORT

import { 
    Settings, Sun as SunIcon, Calendar, 
    CheckCircle, Type, LogOut, Database,
    Download, Upload, SlidersHorizontal,
    Users, Loader2,
    LayoutGrid, Cpu, Info, PieChart, Maximize2, X,
    Settings as SettingsIcon
} from './components/Icons';
import { SolarService, SettingsService, LeadService, ProposalService, TaskService } from './services/db';
import { SolarKit, AppConfig, SavedProposal, ManualPricing, Lead } from './public/types';

// Navegação Interna do Solar (Updated)
type SolarTab = 'budget' | 'crm' | 'agenda' | 'dashboard';

// Abas de Configuração (Atualizadas)
type SettingsTab = 'general' | 'data';

const APP_VERSION = "v2.3 (Nio Legend)";

const AppContent: React.FC = () => {
  // --- USANDO O CONTEXTO DE UI ---
  const { showToast } = useUI();

  // --- STATE (SOLAR ONLY) ---
  const [activeSolarTab, setActiveSolarTab] = useState<SolarTab>(() => {
      return (localStorage.getItem('nior_solar_tab') as SolarTab) || 'budget';
  });

  // --- STATE DE DADOS ---
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [solarKits, setSolarKits] = useState<SolarKit[]>([]);
  const [manualPricing, setManualPricing] = useState<ManualPricing | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [crmRefreshTrigger, setCrmRefreshTrigger] = useState(0);
  const [pendingProposal, setPendingProposal] = useState<SavedProposal | null>(null);
  const [userRole, setUserRole] = useState<'vendedor' | 'integrador'>('vendedor');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // --- PERSISTÊNCIA LOCAL ---
  useEffect(() => {
      localStorage.setItem('nior_solar_tab', activeSolarTab);
  }, [activeSolarTab]);

  // --- NAVIGATION HELPERS ---
  const navigateToSolarTab = (tab: SolarTab) => {
      setActiveSolarTab(tab);
      window.scrollTo(0, 0);
  };

  // --- LOAD DATA ---
  useEffect(() => {
      const initApp = async () => {
          try {
              let config = await SettingsService.getAppConfig();
              
              setAppConfig(config || { 
                  appName: 'Nio', 
                  appLogo: '/logo.png', 
                  theme: 'light', 
                  defaultSharePhone: ''
              });
              
              const [kits, manualPrice] = await Promise.all([
                  SolarService.getAll(),
                  SettingsService.getManualPricing()
              ]);
              
              setSolarKits(kits);
              setManualPricing(manualPrice);
              
          } catch (error) {
              console.error("Erro ao inicializar app:", error);
              setAppConfig({ 
                  appName: 'Nio', 
                  appLogo: '/logo.png', 
                  theme: 'light', 
                  defaultSharePhone: ''
              });
          }
      };
      initApp();
  }, []);

  // --- THEME ENGINE ---
  useEffect(() => {
      if (!appConfig) return;
      if (appConfig.theme === 'dark') {
          document.body.style.backgroundColor = '#0F172A';
          document.body.style.color = '#F8FAFC';
      } else {
          document.body.style.backgroundColor = '#F8FAFC';
          document.body.style.color = '#1B2A49';
      }
      document.title = appConfig.appName;
  }, [appConfig]);

  // --- HANDLERS CONFIG ---
  const handleUpdateKits = async (kits: SolarKit[]) => {
      await SolarService.batchSave(kits);
      setSolarKits(kits);
  };

  const handleOpenProposal = (proposal: SavedProposal) => {
      setPendingProposal(proposal);
      navigateToSolarTab('budget');
      setShowSettings(false);
  };

  if (!appConfig) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-nior-navy rounded-full animate-spin"></div>
          </div>
      );
  }

  const isDark = appConfig?.theme === 'dark';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50/30 text-nior-navy'}`}>
      <main className="w-full min-h-screen relative flex flex-col pb-safe">
        
        {/* HEADER CENTRALIZADO */}
        <div className={`px-6 pt-6 pb-2 relative bg-inherit min-h-[60px] print:hidden grid grid-cols-[1fr_auto_1fr] items-center`}>
             <div></div>
             <div className="flex items-center gap-3 select-none">
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="h-9 w-auto object-contain drop-shadow-sm pointer-events-none" 
                    onError={(e) => {
                        e.currentTarget.onerror = null; // Previne loop infinito
                        e.currentTarget.style.display = 'none'; // Esconde se falhar
                    }} 
                />
                <span className="text-2xl font-black tracking-tight text-nior-navy">
                    {appConfig.appName}
                </span>
             </div>
             <div className="flex justify-end">
                 <button 
                    onClick={() => setShowSettingsModal(true)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 z-10 ${isDark ? 'bg-white/5 text-white' : 'bg-white text-nior-navy shadow-sm border border-gray-100'}`}
                 >
                     <SettingsIcon size={20} />
                 </button>
             </div>
        </div>

        {/* --- CONTEÚDO PRINCIPAL --- */}
        <div className="flex-1 w-full relative flex flex-col">
            
             {/* FLOATING DRAGGABLE PRICE TABLE */}
             {showSettings && (
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed inset-0 z-[100] bg-white flex flex-col"
                 >
                    <div className="p-6 bg-nior-navy text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <Database size={20} className="text-nior-gold" />
                            <h3 className="font-bold">Tabela de Preços (Kits)</h3>
                        </div>
                        <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <SolarTable 
                            kits={solarKits} 
                            onUpdate={handleUpdateKits} 
                            viewMode="PROJECT" 
                        />
                    </div>
                 </motion.div>
             )}

             {/* SETTINGS MODAL */}
             {showSettingsModal && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                     <div className="absolute inset-0 bg-nior-navy/60 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}></div>
                     <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative z-10">
                         <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-nior-navy">Configurações</h3>
                             <button onClick={() => setShowSettingsModal(false)}><X size={20} /></button>
                         </div>
                         <div className="space-y-4">
                             <div>
                                 <label className="text-xs font-bold text-gray-400 uppercase">Nome do App</label>
                                 <input className="w-full bg-gray-50 rounded-xl p-3 text-sm" value={appConfig?.appName} onChange={(e) => setAppConfig({...appConfig!, appName: e.target.value})} />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-gray-400 uppercase">Perfil</label>
                                 <div className="flex gap-2 mt-2">
                                     <button onClick={() => setUserRole('vendedor')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${userRole === 'vendedor' ? 'bg-nior-navy text-white' : 'bg-gray-100'}`}>Vendedor</button>
                                     <button onClick={() => setUserRole('integrador')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${userRole === 'integrador' ? 'bg-nior-navy text-white' : 'bg-gray-100'}`}>Integrador</button>
                                 </div>
                             </div>
                             <button onClick={() => { setShowSettings(true); setShowSettingsModal(false); }} className="w-full py-3 bg-gray-100 rounded-xl text-xs font-bold text-nior-navy hover:bg-gray-200">Tabela de Preços</button>
                         </div>
                     </div>
                 </div>
             )}

             {/* VIEW PRINCIPAL SOLAR */}
             <div className="w-full h-full pb-24">
                 {activeSolarTab === 'budget' && (
                     <div className="w-full max-w-[95%] xl:max-w-[1800px] px-0 sm:px-4 mx-auto pt-2 md:pt-6 animate-in fade-in">
                         <BudgetGenerator availableKits={solarKits} proposalToLoad={pendingProposal} manualPricing={manualPricing} appConfig={appConfig} />
                     </div>
                 )}
                 {activeSolarTab === 'crm' && (
                     <div className="w-full max-w-[95%] xl:max-w-[1800px] mx-auto pt-2 md:pt-6 animate-in fade-in">
                         <CRM onOpenProposal={handleOpenProposal} refreshTrigger={crmRefreshTrigger} />
                     </div>
                 )}
                 {activeSolarTab === 'agenda' && (
                     <div className="w-full max-w-[95%] xl:max-w-[1800px] mx-auto pt-2 md:pt-6 animate-in fade-in">
                         <Tasks />
                     </div>
                 )}
                 {activeSolarTab === 'dashboard' && (
                     <div className="w-full max-w-[95%] xl:max-w-[1800px] mx-auto pt-2 md:pt-6 animate-in fade-in">
                         <Dashboard />
                     </div>
                 )}
             </div>


        </div>

         {/* BOTTOM NAV */}
         {!showSettings && (
            <div className="fixed bottom-0 left-0 right-0 z-50 print:hidden">
              <div className={`w-full pb-safe pt-2 px-2 sm:px-4 flex justify-between items-center shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] border-t-2 backdrop-blur-xl ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-gray-100/95 border-nior-navy'}`}>
                <NavButton isActive={activeSolarTab === 'budget'} onClick={() => navigateToSolarTab('budget')} icon={<SunIcon size={22} strokeWidth={activeSolarTab === 'budget' ? 2.5 : 2} />} label="Solar" colorClass="text-nior-navy" />
                <NavButton isActive={activeSolarTab === 'crm'} onClick={() => navigateToSolarTab('crm')} icon={<Users size={22} strokeWidth={activeSolarTab === 'crm' ? 2.5 : 2} />} label="Clientes" colorClass="text-nior-navy" />
                <NavButton isActive={activeSolarTab === 'agenda'} onClick={() => navigateToSolarTab('agenda')} icon={<Calendar size={22} strokeWidth={activeSolarTab === 'agenda' ? 2.5 : 2} />} label="Agenda" colorClass="text-nior-navy" />
                <NavButton isActive={activeSolarTab === 'dashboard'} onClick={() => navigateToSolarTab('dashboard')} icon={<PieChart size={22} strokeWidth={activeSolarTab === 'dashboard' ? 2.5 : 2} />} label="Dash" colorClass="text-nior-navy" />
              </div>
            </div>
        )}

      </main>
    </div>
  );
};

const NavButton: React.FC<{ isActive: boolean; onClick: () => void; icon: React.ReactNode; label: string; colorClass: string; }> = ({ isActive, onClick, icon, label, colorClass }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center py-2.5 transition-all duration-300 group relative outline-none select-none touch-manipulation`}>
        {isActive && <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full opacity-10 bg-current ${colorClass} blur-lg transition-all duration-500`}></div>}
        <div className={`transition-all duration-300 transform ${isActive ? `-translate-y-1 scale-110 ${colorClass} drop-shadow-md` : 'text-gray-400 group-hover:text-gray-500 scale-100'}`}>{icon}</div>
        <span className={`text-[10px] font-bold mt-1 transition-all duration-300 uppercase tracking-widest ${isActive ? `${colorClass} opacity-100 translate-y-0` : 'text-gray-400 opacity-70 group-hover:opacity-100'}`}>{label}</span>
    </button>
);

const App: React.FC = () => (
    <UIProvider>
        <AppContent />
    </UIProvider>
);

export default App;
