
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SolarSystemConfig, SolarKit, Lead, CalculationParams, Scenario, SavedProposal, UnitConsumption, CustomPricing, ManualPricing, AppConfig } from '../../public/types';
import { LeadService, SettingsService, ProposalService } from '../../services/db';
import { Calculator, Presentation, Scale, Layers } from 'lucide-react';
import { useUI } from '../../context/UIContext'; // Contexto UI

import { ClientSelector } from './ClientSelector';
import { ConsumptionInput } from './ConsumptionInput';
import { SystemConfig } from './SystemConfig';
import { PaymentOptions } from './PaymentOptions';
import { ProposalResult } from './ProposalResult';
import { ProposalActions } from './ProposalActions'; 
import { ComparisonView } from './ComparisonView';
import { CalculationSettingsModal } from './modals/CalculationSettingsModal';
import { ProposalPresentation } from './ProposalPresentation';

interface BudgetGeneratorProps {
    availableKits: SolarKit[];
    proposalToLoad?: SavedProposal | null;
    manualPricing?: ManualPricing | null;
    appConfig?: AppConfig | null;
}

export const BudgetGenerator: React.FC<BudgetGeneratorProps> = ({ availableKits, proposalToLoad, manualPricing, appConfig }) => {
  const { showToast } = useUI();
  const [viewMode, setViewMode] = useState<'CALCULATOR' | 'COMPARISON' | 'PDF_PREVIEW'>('CALCULATOR');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [proposalsHistory, setProposalsHistory] = useState<SavedProposal[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [originalConsumption, setOriginalConsumption] = useState<number | null>(null);
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [loadedProposalData, setLoadedProposalData] = useState<{ price: number; config: string } | null>(null);

  const [customPricing, setCustomPricing] = useState<CustomPricing>({
      isActive: false,
      finalPrice: 0,
      tableValue: 0,
      visualDiscount: 0
  });

  const [config, setConfig] = useState<SolarSystemConfig>({
    consumption: 0, 
    consumptionHistory: [],
    consumptionUnits: [], 
    isMoneyMode: true, 
    roofType: 'Ceramica',
    voltage: '220v',
    moduleBrand: 'DMEGC',
    inverterBrand: 'SOFAR',
    safetyMargin: 20,
    manualInverter: null,
    platformCost: 0,
    hybridRules: { 
        hybrid: { threshold: 12, costLow: 3000, costHigh: 5000 },
        batteryPrice: 6000
    }
  });

  const lastValidPriceRef = useRef<number>(0);

  const [globalCalcParams, setGlobalCalcParams] = useState<CalculationParams>({
      tariff: 0.92,
      anchoring: 0,
      discount: 0,
      spread: 5.15,
      iof: 3.38,
      commission: 3,
      overprice: 0,
      tax: 11,
      priceCalculationMode: 'MANUAL' 
  });

  const [calcParams, setCalcParams] = useState<CalculationParams>(globalCalcParams);

  const [systemType, setSystemType] = useState<'ON-GRID' | 'HIBRIDO' | 'BATERIA' | 'AMPLIACAO'>('ON-GRID');
  const [preferredPanel, setPreferredPanel] = useState<number | null>(610); 
  const [paymentMethod, setPaymentMethod] = useState<'VISTA' | 'FINAN' | 'ENTRY'>('VISTA');
  const [manualModuleCount, setManualModuleCount] = useState<number | null>(null);
  const [installments, setInstallments] = useState(72); 
  const [downPayment, setDownPayment] = useState(0);
  const [interestRate, setInterestRate] = useState(2.10);
  const [batteryCount, setBatteryCount] = useState(1);

  // --- INIT ---
  useEffect(() => {
      LeadService.getAll().then(setLeads);
      const loadSettings = async () => {
          const savedParams = await SettingsService.getBudgetParams();
          if (savedParams) {
              if (!savedParams.priceCalculationMode) savedParams.priceCalculationMode = 'MANUAL';
              setGlobalCalcParams(savedParams);
              setCalcParams(savedParams); 
          }
          const savedSystemDefaults = await SettingsService.getSystemDefaults();
          if (savedSystemDefaults) {
              setConfig(prev => ({ ...prev, ...savedSystemDefaults }));
          }
      };
      loadSettings();
  }, []);

  // --- CARREGAR PROPOSTA EXTERNA (VIA CRM) ---
  useEffect(() => {
      if (proposalToLoad) {
          setSelectedLeadId(proposalToLoad.leadId);
          loadProposalState(proposalToLoad);
          ProposalService.getByLeadId(proposalToLoad.leadId).then(setProposalsHistory);
          setViewMode('CALCULATOR');
      }
  }, [proposalToLoad]);

  // --- HISTORY & NAVIGATION LOGIC ---
  useEffect(() => {
      const handlePopState = (event: PopStateEvent) => {
          const state = event.state;
          if (showSettingsModal) {
              setShowSettingsModal(false);
              return;
          }
          if (viewMode !== 'CALCULATOR') {
              setViewMode('CALCULATOR');
              return;
          }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [showSettingsModal, viewMode]);

  const openSettings = () => {
      window.history.pushState({ modal: 'settings' }, '', '#settings');
      setShowSettingsModal(true);
  };

  const closeSettings = () => {
      window.history.back();
  };

  const navigateToView = (mode: 'COMPARISON' | 'PDF_PREVIEW') => {
      window.history.pushState({ view: mode }, '', `#${mode.toLowerCase()}`);
      setViewMode(mode);
  };

  const navigateBackToCalculator = () => {
      window.history.back();
  };

  const handleSelectLead = async (id: string) => {
      setSelectedLeadId(id);
      setEditingProposalId(null);
      setOriginalConsumption(null);
      lastValidPriceRef.current = 0;
      setCustomPricing({ isActive: false, finalPrice: 0, tableValue: 0, visualDiscount: 0 });
      setLoadedProposalData(null);

      if (id) {
          const history = await ProposalService.getByLeadId(id);
          setProposalsHistory(history);
          if (config.consumption === 0 && history.length > 0) {
              loadProposalState(history[0]); 
          } else {
              if (config.consumption === 0) {
                  setCalcParams(globalCalcParams); 
                  setConfig(prev => ({ ...prev, consumption: 0, consumptionHistory: [], consumptionUnits: [], isMoneyMode: true, safetyMargin: 20, manualInverter: null, platformCost: 0 }));
                  setManualModuleCount(null);
              }
          }
      } else {
          setProposalsHistory([]);
          setCalcParams(globalCalcParams);
      }
  };

  const handleCreateLead = async (name: string) => {
      const newLead = await LeadService.create({ name, phone: '', status: 'Novo' });
      setLeads(prev => [newLead, ...prev]);
      setSelectedLeadId(newLead.id);
      setProposalsHistory([]);
      setEditingProposalId(null);
      setOriginalConsumption(null);
      lastValidPriceRef.current = 0;
      setCustomPricing({ isActive: false, finalPrice: 0, tableValue: 0, visualDiscount: 0 });
      setLoadedProposalData(null);
      setCalcParams(globalCalcParams); 
      if (config.consumption === 0) {
          setConfig(prev => ({ ...prev, consumption: 0, consumptionHistory: [], consumptionUnits: [], isMoneyMode: true, safetyMargin: 20, manualInverter: null, platformCost: 0 }));
          setManualModuleCount(null);
      }
      showToast("Sucesso", "Novo cliente criado!", "success");
  };

  const loadProposalState = (proposal: SavedProposal) => {
      const loadedConfig = { ...proposal.systemConfig };
      if (loadedConfig.safetyMargin === undefined) loadedConfig.safetyMargin = 20;
      
      if (!loadedConfig.hybridRules) {
          const legacyConfig = loadedConfig as any;
          if (legacyConfig.hybridRule) {
              loadedConfig.hybridRules = {
                  hybrid: legacyConfig.hybridRule,
                  batteryPrice: 6000 
              };
          } else {
              loadedConfig.hybridRules = { 
                  hybrid: { threshold: 12, costLow: 3000, costHigh: 5000 },
                  batteryPrice: 6000
              };
          }
      } else {
          const rules = loadedConfig.hybridRules as any;
          if (rules.battery && typeof rules.battery === 'object') {
              loadedConfig.hybridRules = {
                  hybrid: rules.hybrid || { threshold: 12, costLow: 3000, costHigh: 5000 },
                  batteryPrice: 6000
              };
          }
      }

      setConfig(loadedConfig);
      setPaymentMethod(proposal.paymentMethod);
      if (proposal.systemType) setSystemType(proposal.systemType);
      
      if (proposal.calculationParams) {
          setCalcParams({ ...proposal.calculationParams });
          if (proposal.calculationParams.discount > 0) {
              setIsDiscountApplied(true);
          } else {
              setIsDiscountApplied(false);
          }
      } else {
          setCalcParams(globalCalcParams);
          setIsDiscountApplied(false);
      }
      
      if (proposal.systemConfig.manualModuleCount !== undefined) {
          setManualModuleCount(proposal.systemConfig.manualModuleCount);
      } else {
          setManualModuleCount(null);
      }
      
      setEditingProposalId(proposal.id);
      setOriginalConsumption(proposal.systemConfig.consumption);
      
      if (proposal.customPricing) {
          setCustomPricing(proposal.customPricing);
      } else {
          setCustomPricing({ isActive: false, finalPrice: 0, tableValue: 0, visualDiscount: 0 });
      }

      // NOVO: Salva o estado original para travar o preço se nada mudar
      setLoadedProposalData({
          price: proposal.totalPrice,
          config: JSON.stringify({
              config: loadedConfig,
              systemType: proposal.systemType || 'ON-GRID',
              calcParams: proposal.calculationParams || globalCalcParams,
              customPricing: proposal.customPricing || { isActive: false, finalPrice: 0, tableValue: 0, visualDiscount: 0 },
              paymentMethod: proposal.paymentMethod
          })
      });
  };

  const handleConsumptionChange = (val: string) => {
      const digits = val.replace(/\D/g, '');
      const numberVal = parseInt(digits || '0');
      setConfig(prev => ({ ...prev, consumption: numberVal, consumptionHistory: [], consumptionUnits: [], manualInverter: null }));
      setManualModuleCount(null); 
      setCustomPricing(prev => ({...prev, isActive: false}));
      lastValidPriceRef.current = 0;
  };

  const handleApplyKwh = (kwh: number, history: number[], units: UnitConsumption[]) => {
      setConfig(prev => ({ 
          ...prev, 
          consumption: kwh, 
          consumptionHistory: history, 
          consumptionUnits: units, 
          isMoneyMode: false,
          manualInverter: null
      }));
      setManualModuleCount(null);
      setCustomPricing(prev => ({...prev, isActive: false}));
      lastValidPriceRef.current = 0;
  };

  const handleManualModuleCountChange = (count: number) => {
      if (config.consumption <= 0) return;
      const newCount = Math.max(1, count);
      setManualModuleCount(newCount);
      setCustomPricing(prev => ({...prev, isActive: false}));
  };

  const handleSystemTypeChange = (type: 'ON-GRID' | 'HIBRIDO' | 'BATERIA' | 'AMPLIACAO') => {
      setSystemType(type);
      if (type === 'HIBRIDO' || type === 'BATERIA') {
          updateSystemConfig({ inverterBrand: 'SAJ' });
          if (!config.platformCost) {
              setConfig(prev => ({ ...prev, platformCost: 5000 }));
          }
      }
  };

  const handleToggleMode = () => setConfig(prev => ({ ...prev, isMoneyMode: !prev.isMoneyMode }));

  const updateSystemConfig = (updates: Partial<SolarSystemConfig>) => {
      setConfig(prev => {
          const newState = { ...prev, ...updates };
          if (updates.roofType || updates.moduleBrand || updates.inverterBrand) {
              SettingsService.saveSystemDefaults({ roofType: newState.roofType, moduleBrand: newState.moduleBrand, inverterBrand: newState.inverterBrand });
          }
          return newState;
      });
      if (updates.inverterBrand || updates.moduleBrand) {
          setCustomPricing(prev => ({...prev, isActive: false}));
      }
  };

  const currentBillValue = useMemo(() => {
      return config.isMoneyMode 
          ? config.consumption 
          : config.consumption * (calcParams.tariff || 0.92);
  }, [config.consumption, config.isMoneyMode, calcParams.tariff]);

  const results = useMemo(() => {
    if (config.consumption <= 0 && !manualModuleCount) {
        return { monthlyGeneration: 0, totalPrice: 0, monthlySavings: 0, accumulatedSavings: 0, comparisonTimeframe: 6, paybackYears: 0, annualSavings: 0, discountUsed: 0, grossPrice: 0, commissionData: { total: 0, net: 0, taxVal: 0, overpriceVal: 0, baseVal: 0 }, totalModules: 0, kitDetails: undefined, kitNotFound: false, systemBasePrice: 0 };
    }

    const tariff = calcParams.tariff || 0.92;
    const baseMonthlyKwh = config.isMoneyMode ? config.consumption / tariff : config.consumption;
    const marginMultiplier = 1 + ((config.safetyMargin || 0) / 100);
    const targetMonthlyKwh = baseMonthlyKwh * marginMultiplier;

    let selectedKit: SolarKit | undefined;
    let finalPanelCount = 0;
    let kitNotFound = false;
    let manualCalculationUsed = false;

    if (manualModuleCount) {
        finalPanelCount = manualModuleCount;
        const targetPowerW = manualModuleCount * (preferredPanel || 610);
        
        const compatibleKits = availableKits.filter(k => {
             if (preferredPanel === 585) return k.panel585 === manualModuleCount;
             if (preferredPanel === 610) return k.panel610 === manualModuleCount;
             if (preferredPanel === 700) return k.panel700 === manualModuleCount;
             return false;
        });

        if (config.manualInverter) {
            selectedKit = compatibleKits.find(k => k.inverter === config.manualInverter);
        } else {
            selectedKit = compatibleKits.find(k => k.inverter.toLowerCase().includes(config.inverterBrand.toLowerCase()));
            if (!selectedKit && compatibleKits.length > 0) selectedKit = compatibleKits[0];
        }

        if (!selectedKit) {
            kitNotFound = true;
            if (manualPricing) {
                const invModel = config.manualInverter || '5K';
                const invPower = invModel.replace(/[^0-9.,Kk]/g, '').toUpperCase();
                const invPowerComma = invPower.replace('.', ',');
                const invPowerDot = invPower.replace(',', '.');
                const moduleBasePrice = manualPricing.modulePrice || 0;
                const moduleBrandPrice = manualPricing.moduleBrandPrices[config.moduleBrand] || 0;
                const inverterBasePrice = manualPricing.inverterPrices[invPowerComma] || manualPricing.inverterPrices[invPowerDot] || manualPricing.inverterPrices[invPower] || 0;
                const inverterBrandPrice = manualPricing.inverterBrandPrices[config.inverterBrand] || 0;
                
                const modulesTotal = manualModuleCount * (moduleBasePrice + moduleBrandPrice);
                
                // SE FOR AMPLIAÇÃO, NÃO SOMA INVERSOR
                let inverterTotal = inverterBasePrice + inverterBrandPrice;
                if (systemType === 'AMPLIACAO') {
                    inverterTotal = 0;
                }

                const calculatedManualPrice = modulesTotal + inverterTotal;

                if (calculatedManualPrice > 0) {
                    manualCalculationUsed = true;
                    selectedKit = {
                        id: 'manual-calc',
                        gm: Math.floor(targetPowerW * 0.125).toString(),
                        inverter: systemType === 'AMPLIACAO' ? 'AMPLIACAO' : (config.manualInverter || `Inversor ${invPower}`),
                        panel585: preferredPanel === 585 ? manualModuleCount : 0,
                        panel610: preferredPanel === 610 ? manualModuleCount : 0,
                        panel700: preferredPanel === 700 ? manualModuleCount : 0,
                        price: calculatedManualPrice
                    };
                }
            }

            if (!selectedKit) {
                selectedKit = {
                    id: 'custom',
                    gm: Math.floor(targetPowerW * 0.125).toString(),
                    inverter: systemType === 'AMPLIACAO' ? 'AMPLIACAO' : (config.manualInverter || `${config.inverterBrand} (Manual)`),
                    panel585: preferredPanel === 585 ? manualModuleCount : 0,
                    panel610: preferredPanel === 610 ? manualModuleCount : 0,
                    panel700: preferredPanel === 700 ? manualModuleCount : 0,
                    price: 0
                };
            }
        }

    } else {
        let candidates = availableKits.filter(k => {
            const kitGm = parseInt(k.gm.replace(/\D/g, '') || '0');
            return kitGm >= targetMonthlyKwh;
        });

        candidates.sort((a, b) => {
            const gmA = parseInt(a.gm.replace(/\D/g, '') || '0');
            const gmB = parseInt(b.gm.replace(/\D/g, '') || '0');
            if (gmA !== gmB) return gmA - gmB;
            return a.price - b.price;
        });

        if (config.manualInverter) {
            selectedKit = candidates.find(k => k.inverter === config.manualInverter);
        }

        if (!selectedKit) {
            selectedKit = candidates.find(k => {
                const brandMatch = k.inverter.toLowerCase().includes(config.inverterBrand.toLowerCase());
                const panelMatch = (preferredPanel === 585 && k.panel585 > 0) ||
                                   (preferredPanel === 610 && k.panel610 > 0) ||
                                   (preferredPanel === 700 && k.panel700 > 0);
                return brandMatch && panelMatch;
            });
        }

        if (!selectedKit) selectedKit = candidates[0];
        
        if (selectedKit) {
            if (preferredPanel === 585) finalPanelCount = selectedKit.panel585;
            else if (preferredPanel === 610) finalPanelCount = selectedKit.panel610;
            else if (preferredPanel === 700) finalPanelCount = selectedKit.panel700;
            else finalPanelCount = selectedKit.panel585 + selectedKit.panel610 + selectedKit.panel700;
        }
    }

    const kitGm = selectedKit ? parseInt(selectedKit.gm.replace(/\D/g, '') || '0') : 0;
    
    let finalPrice = 0;
    let tablePrice = 0;
    let systemBasePrice = 0;
    let discountUsed = 0;

    if (customPricing.isActive) {
        finalPrice = customPricing.finalPrice;
        discountUsed = customPricing.visualDiscount;
        tablePrice = finalPrice + discountUsed;
        systemBasePrice = finalPrice; 
    } else {
        let kitPrice = selectedKit ? selectedKit.price : 0;
        if (!manualCalculationUsed && kitNotFound && lastValidPriceRef.current > 0) {
            kitPrice = lastValidPriceRef.current;
        } else if (selectedKit && selectedKit.id !== 'custom') {
            lastValidPriceRef.current = selectedKit.price;
        }

        let basePrice = kitPrice;
        if (config.roofType === 'Laje') basePrice += 1000;
        
        if (systemType !== 'ON-GRID' && systemType !== 'AMPLIACAO') {
            const rules = config.hybridRules || { 
                hybrid: { threshold: 12, costLow: 3000, costHigh: 5000 },
                batteryPrice: 6000
            };
            const platformCost = finalPanelCount > rules.hybrid.threshold ? rules.hybrid.costHigh : rules.hybrid.costLow;
            basePrice += platformCost;
            if (systemType === 'BATERIA') {
                const battPrice = rules.batteryPrice || 6000;
                basePrice += (batteryCount * battPrice);
            }
        }

        systemBasePrice = basePrice;
        
        if (calcParams.priceCalculationMode === 'FIXED' && calcParams.fixedPrice !== undefined) {
            finalPrice = calcParams.fixedPrice;
            tablePrice = finalPrice;
            discountUsed = 0;
        } else {
            tablePrice = basePrice + calcParams.anchoring;
            finalPrice = tablePrice - calcParams.discount;
            discountUsed = calcParams.discount;
        }
    }

    // NOVO: Se for uma proposta carregada e NADA mudou, força o preço salvo
    if (loadedProposalData) {
        const currentConfigHash = JSON.stringify({
            config,
            systemType,
            calcParams,
            customPricing,
            paymentMethod
        });
        
        if (currentConfigHash === loadedProposalData.config) {
            finalPrice = loadedProposalData.price;
            tablePrice = finalPrice;
            discountUsed = 0;
            systemBasePrice = finalPrice;
        }
    }
    
    const overpriceCalculation = customPricing.isActive ? 0 : Math.max(0, calcParams.anchoring - calcParams.discount);
    const commissionFromSale = finalPrice * (calcParams.commission / 100);
    const commissionFromOverprice = customPricing.isActive ? 0 : (overpriceCalculation * 0.50);
    const totalCommission = commissionFromSale + commissionFromOverprice;
    const taxValue = totalCommission * (calcParams.tax / 100);
    
    // NOVO: Economia baseada na geração real (limitada pelo consumo)
    const generationValue = kitGm * tariff;
    const monthlySavings = Math.min(generationValue, currentBillValue);
    const annualSavings = monthlySavings * 12;

    let investmentBasis = finalPrice; 
    if (paymentMethod !== 'VISTA') {
        const loanPrincipal = Math.max(0, finalPrice - downPayment);
        const financedAmount = loanPrincipal * (1 + ((calcParams.iof + calcParams.spread) / 100));
        const monthlyRate = interestRate / 100;
        const installmentVal = financedAmount * ((monthlyRate * Math.pow(1 + monthlyRate, installments)) / (Math.pow(1 + monthlyRate, installments) - 1));
        investmentBasis = (installmentVal * installments) + downPayment;
    }

    const paybackYears = annualSavings > 0 ? investmentBasis / annualSavings : 0;
    const comparisonTimeframe = paybackYears >= 5.5 ? Math.ceil(paybackYears) + 1 : 6;

    return {
      monthlyGeneration: kitGm,
      monthlySavings, 
      annualSavings,
      accumulatedSavings: annualSavings * comparisonTimeframe,
      comparisonTimeframe,
      totalPrice: Math.floor(finalPrice),
      grossPrice: Math.floor(tablePrice),
      systemBasePrice: Math.floor(systemBasePrice),
      discountUsed: discountUsed,
      paybackYears: Number(paybackYears.toFixed(1)),
      kitDetails: selectedKit,
      totalModules: finalPanelCount,
      commissionData: { total: totalCommission, net: totalCommission - taxValue, taxVal: taxValue, overpriceVal: commissionFromOverprice, baseVal: commissionFromSale },
      kitNotFound,
    };
  }, [config, availableKits, preferredPanel, calcParams, systemType, batteryCount, manualModuleCount, currentBillValue, paymentMethod, installments, downPayment, interestRate, customPricing, manualPricing, loadedProposalData]);

  const calculateInstallment = () => {
      if (paymentMethod === 'VISTA') return 0;
      const baseValue = results.totalPrice;
      if (baseValue === 0) return 0;
      const loanPrincipal = Math.max(0, baseValue - downPayment);
      const financedAmount = loanPrincipal * (1 + ((calcParams.iof + calcParams.spread) / 100));
      const monthlyRate = interestRate / 100;
      return financedAmount * ((monthlyRate * Math.pow(1 + monthlyRate, installments)) / (Math.pow(1 + monthlyRate, installments) - 1));
  };

  const handleSaveProposalToDb = async () => { 
      if (!selectedLeadId) {
          showToast("Aviso", "Selecione um cliente para salvar.", "warning");
          return;
      }

      let idToSave = Math.random().toString(36).substr(2, 9);
      let isUpdate = false;

      if (editingProposalId && config.consumption === originalConsumption) {
          idToSave = editingProposalId;
          isUpdate = true;
      }

      const savedTotalPrice = results.totalPrice;
      const savedParams = { ...calcParams };
      
      const proposal: SavedProposal = {
          id: idToSave,
          leadId: selectedLeadId,
          date: new Date().toISOString(),
          totalPrice: savedTotalPrice,
          monthlyGeneration: results.monthlyGeneration,
          systemConfig: {
              ...config,
              manualModuleCount: manualModuleCount
          },
          paymentMethod: paymentMethod,
          systemType: systemType,
          panelCount: results.totalModules,
          panelPower: preferredPanel || 610,
          inverterModel: results.kitDetails?.inverter || 'N/A',
          calculationParams: savedParams,
          customPricing: customPricing 
      };

      await ProposalService.save(proposal);
      
      // NOVO: Atualiza o estado de carregamento para manter o preço travado após salvar
      setLoadedProposalData({
          price: proposal.totalPrice,
          config: JSON.stringify({
              config: proposal.systemConfig,
              systemType: proposal.systemType || 'ON-GRID',
              calcParams: proposal.calculationParams || globalCalcParams,
              customPricing: proposal.customPricing || { isActive: false, finalPrice: 0, tableValue: 0, visualDiscount: 0 },
              paymentMethod: proposal.paymentMethod
          })
      });

      showToast("Sucesso", isUpdate ? "Orçamento atualizado!" : "Orçamento salvo!", "success");
      
      setEditingProposalId(idToSave);
      setOriginalConsumption(config.consumption);
      
      const history = await ProposalService.getByLeadId(selectedLeadId);
      setProposalsHistory(history);
  };

  const handlePrint = () => {
      window.print();
  };

  const handleSettingsSave = (newParams: CalculationParams, saveAsGlobal: boolean) => {
      setCalcParams(newParams);
      if (saveAsGlobal) {
          setGlobalCalcParams(newParams);
          SettingsService.saveBudgetParams(newParams);
          showToast("Sucesso", "Padrões globais atualizados.", "success");
      } else {
          showToast("Aplicado", "Parâmetros aplicados nesta proposta.", "info");
      }
  };

  return (
    <div className="pb-32 pt-2 px-4 bg-gray-50 min-h-screen animate-in fade-in zoom-in duration-300 relative">
      
      {viewMode === 'CALCULATOR' && (
          <div className="print:hidden">
              <ClientSelector leads={leads} selectedLeadId={selectedLeadId} onSelectLead={handleSelectLead} onCreateLead={handleCreateLead} proposalsHistory={proposalsHistory} onLoadProposal={loadProposalState} />
              <ConsumptionInput 
                  consumption={config.consumption} 
                  tariff={calcParams.tariff} 
                  isMoneyMode={config.isMoneyMode} 
                  onConsumptionChange={handleConsumptionChange} 
                  onToggleMode={handleToggleMode} 
                  onApplyKwh={handleApplyKwh} 
                  consumptionHistory={config.consumptionHistory} 
                  consumptionUnits={config.consumptionUnits}
                  safetyMargin={config.safetyMargin || 0}
                  onSafetyMarginChange={(m) => setConfig(prev => ({...prev, safetyMargin: m}))}
              />
              <SystemConfig 
                  roofType={config.roofType} 
                  onRoofChange={(t) => updateSystemConfig({ roofType: t })} 
                  voltage={config.voltage} 
                  onVoltageChange={(v) => updateSystemConfig({ voltage: v as SolarSystemConfig['voltage'] })} 
                  systemType={systemType} 
                  onSystemTypeChange={handleSystemTypeChange} 
                  preferredPanel={preferredPanel} 
                  onPanelChange={setPreferredPanel} 
                  moduleBrand={config.moduleBrand} 
                  onModuleBrandChange={(b) => updateSystemConfig({ moduleBrand: b })} 
                  inverterBrand={config.inverterBrand} 
                  onInverterBrandChange={(b) => updateSystemConfig({ inverterBrand: b })} 
                  selectedKit={results.kitDetails} 
                  batteryCount={batteryCount} 
                  onBatteryCountChange={setBatteryCount} 
                  manualModuleCount={manualModuleCount} 
                  onManualModuleCountChange={handleManualModuleCountChange}
                  availableKits={availableKits}
                  manualInverter={config.manualInverter}
                  onManualInverterSelect={(inv) => updateSystemConfig({ manualInverter: inv || null })}
                  hasConsumption={config.consumption > 0} 
                  platformCost={config.platformCost}
                  onPlatformCostChange={(c) => setConfig(prev => ({...prev, platformCost: c}))}
                  hybridRules={config.hybridRules!}
                  onHybridRulesChange={(r) => setConfig(prev => ({...prev, hybridRules: r}))}
              />
              <PaymentOptions 
                  paymentMethod={paymentMethod} 
                  onPaymentChange={setPaymentMethod} 
                  installments={installments} 
                  onInstallmentsChange={setInstallments} 
                  downPayment={downPayment} 
                  onDownPaymentChange={setDownPayment} 
                  interestRate={interestRate} 
                  onInterestRateChange={setInterestRate} 
                  totalPrice={results.totalPrice} 
              />
              <ProposalResult 
                  totalPrice={results.totalPrice} 
                  grossPrice={results.grossPrice} 
                  discountValue={results.discountUsed} 
                  downPayment={downPayment} 
                  monthlyInstallment={calculateInstallment()} 
                  monthlySavings={currentBillValue} 
                  accumulatedSavings={results.accumulatedSavings} 
                  comparisonTimeframe={results.comparisonTimeframe} 
                  paybackYears={results.paybackYears} 
                  annualSavings={results.annualSavings} 
                  monthlyGeneration={results.monthlyGeneration} 
                  paymentMethod={paymentMethod} 
                  commissionData={results.commissionData} 
                  onOpenSettings={openSettings} 
                  kitDetails={results.kitDetails} 
                  totalModules={results.totalModules}
                  moduleBrand={config.moduleBrand}
                  installments={installments}
                  anchoring={calcParams.anchoring}
                  taxRate={calcParams.tax}
                  isDiscountApplied={isDiscountApplied}
                  toggleDiscount={() => setIsDiscountApplied(!isDiscountApplied)}
                  interestRate={interestRate}
                  kitNotFound={results.kitNotFound}
                  customPricing={customPricing}
                  onUpdateCustomPricing={setCustomPricing}
              />
              
              <ProposalActions 
                  onSaveProposal={handleSaveProposalToDb} 
                  onOpenPdf={() => navigateToView('PDF_PREVIEW')}
              />
          </div>
      )}

      {viewMode === 'PDF_PREVIEW' && (
          <div className="animate-in fade-in">
              <ProposalPresentation 
                  lead={leads.find(l => l.id === selectedLeadId)} 
                  config={{...config, systemType}} 
                  results={{ 
                      ...results, 
                      monthlySavings: currentBillValue, 
                      sixYearSavings: results.accumulatedSavings,
                      grossPrice: results.grossPrice, 
                      discountUsed: results.discountUsed
                  }} 
                  paymentMethod={paymentMethod} 
                  monthlyInstallment={calculateInstallment()} 
                  downPayment={downPayment} 
                  installmentsCount={installments}
                  onBack={navigateBackToCalculator}
                  onPrint={handlePrint}
                  panelPower={preferredPanel || 610}
                  interestRate={interestRate}
                  isDiscountApplied={isDiscountApplied}
                  companyName={calcParams.proposalCompanyName}
                  companyLogo={calcParams.proposalCompanyLogo}
              />
          </div>
      )}

      {viewMode === 'COMPARISON' && (
          <ComparisonView scenarios={scenarios} onBack={navigateBackToCalculator} onRemoveScenario={(id) => setScenarios(scenarios.filter(s => s.id !== id))} leads={leads} selectedLeadId={selectedLeadId} />
      )}

      {showSettingsModal && (
          <CalculationSettingsModal 
              params={calcParams} 
              globalParams={globalCalcParams} 
              systemBasePrice={results.systemBasePrice} 
              onClose={closeSettings} 
              onSave={handleSettingsSave} 
          />
      )}
      
    </div>
  );
};
