
import React, { useState, useRef, useEffect } from 'react';
import { 
    Loader2, ArrowLeft, Sun, Check, Zap,
    TrendingUp, Cpu, Share2, LayoutGrid, Clock, ShieldCheck, Wallet, Banknote, Smartphone, X, Download, Layers
} from '../Icons';
import { Lead, SolarSystemConfig } from '../../public/types';
import { useUI } from '../../context/UIContext';

interface ProposalPresentationProps {
    lead?: Lead;
    config: SolarSystemConfig;
    results: {
        monthlyGeneration: number;
        totalPrice: number;
        monthlySavings: number;
        grossPrice: number;
        discountUsed: number;
        accumulatedSavings: number;
        sixYearSavings?: number;
        comparisonTimeframe?: number;
        paybackYears: number;
        annualSavings: number;
        totalModules?: number;
        kitDetails?: any;
    };
    paymentMethod: 'VISTA' | 'FINAN' | 'ENTRY';
    monthlyInstallment: number;
    downPayment: number;
    installmentsCount: number;
    onBack: () => void;
    onPrint: () => void;
    panelPower: number;
    interestRate?: number;
    isDiscountApplied: boolean;
    companyName?: string;
    companyLogo?: string;
}

export const ProposalPresentation: React.FC<ProposalPresentationProps> = ({
    lead,
    config,
    results,
    paymentMethod,
    monthlyInstallment,
    installmentsCount,
    onBack,
    panelPower,
    isDiscountApplied,
    companyName,
    companyLogo,
    downPayment
}) => {
    const { showToast } = useUI();
    const [isGenerating, setIsGenerating] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [additionalInfo, setAdditionalInfo] = useState('');

    const inverterPowerVal = React.useMemo(() => {
        const model = results.kitDetails?.inverter || '';
        const match = model.match(/[\d.,]+/);
        if (match) {
            return parseFloat(match[0].replace(',', '.'));
        }
        return 0;
    }, [results.kitDetails]);

    const isSinglePhase = config.voltage === '110v' || config.voltage === '220v';
    const hasPowerBarrier = inverterPowerVal > 7.5 && isSinglePhase;
    
    // SCALE LOGIC (Visualização em Tela)
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Dimensões A4 em Pixel (96 DPI)
    const A4_WIDTH_PX = 794; 
    const A4_HEIGHT_PX = 1123; 

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const availableWidth = containerRef.current.offsetWidth;
                const newScale = Math.min(1, (availableWidth - 24) / A4_WIDTH_PX);
                setScale(newScale);
            }
        };

        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleGeneratePDF = async (mode: 'SHARE' | 'WA') => {
        if (!contentRef.current) return;
        
        setIsGenerating(true);
        setShowShareModal(false);
        
        // 1. Scroll para o topo
        window.scrollTo(0, 0);
        
        // 2. Aguardar Fontes
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        // 3. CONTAINER DE IMPRESSÃO (OVERLAY VISÍVEL)
        const printContainer = document.createElement('div');
        printContainer.id = 'print-container-overlay';
        Object.assign(printContainer.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '99999',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            overflow: 'auto'
        });

        const loadingMsg = document.createElement('div');
        loadingMsg.innerText = "Gerando PDF...";
        Object.assign(loadingMsg.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#1B2A49',
            fontWeight: 'bold',
            zIndex: '100000',
            padding: '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        });
        printContainer.appendChild(loadingMsg);

        document.body.appendChild(printContainer);

        try {
            // 4. CLONE DO CONTEÚDO
            const clone = contentRef.current.cloneNode(true) as HTMLElement;

            clone.removeAttribute('id');
            Object.assign(clone.style, {
                transform: 'none', 
                margin: '0 auto',
                padding: '0',
                width: '794px',
                minHeight: '1123px',
                height: 'auto',
                boxShadow: 'none',
                backgroundColor: '#ffffff',
                display: 'block',
                position: 'relative'
            });

            printContainer.appendChild(clone);

            // 5. AGUARDAR IMAGENS
            const images = Array.from(clone.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                    setTimeout(resolve, 1500); 
                });
            }));

            await new Promise(resolve => setTimeout(resolve, 500));

            // 6. GERAÇÃO DO NOME
            const dateObj = new Date();
            const dateStr = dateObj.toLocaleDateString('pt-BR').replace(/\//g, '-');
            const methodMap: Record<string, string> = { 
                'VISTA': 'A Vista', 
                'FINAN': 'Financiado', 
                'ENTRY': 'Entrada Parcelada' 
            };
            const methodStr = methodMap[paymentMethod] || 'Proposta';
            const cleanName = (lead?.name || 'Cliente')
                .replace(/[^\w\sÀ-ÿ-]/g, '')
                .trim()
                .replace(/\s+/g, ' ');
            const fileName = `${cleanName} - ${methodStr} - ${dateStr}.pdf`;
            
            // 7. CONFIGURAÇÃO HTML2PDF
            const opt = {
                margin: 0,
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 }, 
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    scrollY: 0,
                    windowWidth: 794,
                    width: 794,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { 
                    unit: 'px', 
                    format: [A4_WIDTH_PX, A4_HEIGHT_PX],
                    orientation: 'portrait',
                    compress: true
                }
            };

            // @ts-ignore
            const html2pdf = (window as any).html2pdf;

            if (html2pdf) {
                const worker = html2pdf().set(opt).from(clone);
                
                if (mode === 'WA') {
                    await worker.save();
                    const cleanPhone = lead?.phone?.replace(/\D/g, '') || '';
                    if (cleanPhone.length >= 10) {
                        setTimeout(() => {
                            const message = encodeURIComponent(`Olá ${lead?.name || 'Cliente'}, segue a proposta comercial.`);
                            const url = `https://wa.me/55${cleanPhone}?text=${message}`;
                            window.open(url, '_blank');
                        }, 500);
                    } else {
                        showToast("Aviso", "Número de telefone inválido.", "warning");
                    }
                } else {
                    try {
                        const pdfBlob = await worker.output('blob');
                        if (pdfBlob) {
                            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
                            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                await navigator.share({
                                    files: [file],
                                    title: 'Proposta Solar',
                                    text: `Proposta para ${lead?.name || 'Cliente'}`
                                });
                            } else {
                                await worker.save();
                            }
                        } else {
                            await worker.save();
                        }
                    } catch (shareError) {
                        const fallbackWorker = html2pdf().set(opt).from(clone);
                        await fallbackWorker.save();
                    }
                }
                showToast("Sucesso", "PDF gerado com sucesso!", "success");
            } else {
                showToast("Erro", "Biblioteca de PDF não carregada.", "error");
            }

        } catch (error) {
            console.error("PDF Error:", error);
            showToast("Erro", "Não foi possível gerar o PDF.", "error");
        } finally {
            if (document.body.contains(printContainer)) {
                document.body.removeChild(printContainer);
            }
            setIsGenerating(false);
        }
    };

    const handleMainAction = () => {
        const hasPhone = lead?.phone && lead.phone.replace(/\D/g, '').length >= 10;
        if (hasPhone) {
            setShowShareModal(true);
        } else {
            handleGeneratePDF('SHARE');
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const safeMonthlySavings = results.monthlySavings || 0;
    const safeTotalPrice = results.totalPrice || 0;
    
    const isFinanced = paymentMethod !== 'VISTA';
    
    let costSystem = safeTotalPrice;
    if (isFinanced) {
        costSystem = (monthlyInstallment * installmentsCount) + (downPayment || 0);
    }

    const costNoSolar = safeMonthlySavings * 12 * 6;
    const profit = Math.max(0, costNoSolar - costSystem);
    
    const maxVal = Math.max(costNoSolar, costSystem, profit, 1);
    const getPercent = (val: number) => Math.min((val / maxVal) * 100, 100);

    const inverterFullString = results.kitDetails?.inverter || '0';
    const inverterPowerMatch = inverterFullString.match(/(\d+[.,]?\d*)/);
    let inverterPowerDisplay = '---';
    if (inverterPowerMatch) {
        const powerStr = inverterPowerMatch[0].replace(',', '.');
        const powerNum = parseFloat(powerStr);
        if (!isNaN(powerNum)) {
            inverterPowerDisplay = `${powerNum.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
        }
    }
    const inverterBrandDisplay = config.inverterBrand || '---';

    const years = Math.floor(results.paybackYears);
    const months = Math.round((results.paybackYears % 1) * 12);

    return (
        <div className="fixed inset-0 z-[200] bg-gray-200 overflow-y-auto font-sans overflow-x-hidden">
            
            <div className="fixed top-4 left-20 z-50 print:hidden" data-html2canvas-ignore="true">
                <textarea 
                    placeholder="Info adicional..."
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-nior-gold w-48 h-24 resize-none"
                />
            </div>

            {/* CONTAINER PRINCIPAL DE VIEWPORT */}
            <div 
                ref={containerRef}
                className="flex justify-center min-h-screen pt-24 pb-10 w-full px-4 sm:px-0"
            >
                {/* WRAPPER DE ESCALA VISUAL */}
                <div 
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        height: `${A4_HEIGHT_PX * scale}px`,
                        width: `${A4_WIDTH_PX}px`,
                        minHeight: `${A4_HEIGHT_PX * scale}px`
                    }}
                    className="transition-transform duration-200 ease-out"
                >
                    {/* A4 REAL */}
                    <div className="shadow-2xl mx-auto rounded-none sm:rounded-sm overflow-hidden bg-white w-[210mm] min-h-[297mm]">
                        <div 
                            id="proposal-content" 
                            ref={contentRef}
                            className="w-[210mm] min-h-[297mm] relative text-nior-navy flex flex-col overflow-hidden bg-[#F8FAFC]"
                            style={{
                                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                                backgroundSize: '24px 24px'
                            }}
                        >
                            {/* CABEÇALHO AZUL */}
                            <div className="bg-[#1B2A49] text-white pt-8 pb-8 px-8 rounded-b-[2.5rem] relative shrink-0 z-10">
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-[10px] font-bold text-[#C4A462] uppercase tracking-widest mb-1">Proposta Comercial</p>
                                        <h1 className="text-4xl font-bold mb-1 leading-tight flex items-start gap-4">
                                            {lead?.name || 'Cliente'}
                                            {additionalInfo && <span className="text-xs text-white/70 font-normal whitespace-pre-wrap">{additionalInfo}</span>}
                                        </h1>
                                        <p className="text-xs text-white/60 font-medium">
                                            {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    
                                    <div className="bg-white rounded-2xl w-20 h-20 flex items-center justify-center p-3 shadow-lg shrink-0 ml-4">
                                        {companyLogo ? (
                                            <img 
                                                src={companyLogo} 
                                                alt="Logo" 
                                                className="w-full h-full object-contain" 
                                            />
                                        ) : (
                                            <Sun className="text-[#C4A462]" size={32} />
                                        )}
                                    </div>
                                </div>

                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            </div>

                            {/* CONTEÚDO BRANCO */}
                            <div className="px-8 mt-6 relative z-0 flex-1 flex flex-col bg-[#F8FAFC]">
                                
                                <div className={`flex-1 flex flex-col ${isFinanced ? 'justify-start gap-5' : 'justify-evenly gap-6'}`}>

                                    <div>
                                        <h3 className="text-[10px] font-bold text-[#1B2A49]/70 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                                            <LayoutGrid size={12} /> Resumo do Projeto
                                        </h3>
                                        
                                        <div className="grid grid-cols-3 gap-3 mb-3">
                                            <div className="bg-[#C4A462] rounded-2xl p-2 text-center text-[#1B2A49] shadow-lg flex flex-col items-center justify-center h-20">
                                                <LayoutGrid size={18} className="mb-1 opacity-80" />
                                                <span className="text-xl font-extrabold leading-none block">{results.totalModules || 0}</span>
                                                <span className="text-[8px] font-bold uppercase opacity-80 mt-0.5">Módulos</span>
                                            </div>
                                            <div className="bg-[#C4A462] rounded-2xl p-2 text-center text-[#1B2A49] shadow-lg flex flex-col items-center justify-center h-20">
                                                <Zap size={18} className="mb-1 opacity-80" />
                                                <span className="text-xl font-extrabold leading-none block">{panelPower}W</span>
                                                <span className="text-[8px] font-bold uppercase opacity-80 mt-0.5">Potência</span>
                                            </div>
                                            <div className="bg-[#C4A462] rounded-2xl p-2 text-center text-[#1B2A49] shadow-lg flex flex-col items-center justify-center h-20">
                                                {config.systemType === 'AMPLIACAO' ? (
                                                    <>
                                                        <Layers size={18} className="mb-1 opacity-80" />
                                                        <span className="text-xl font-extrabold leading-none block">Ampliação</span>
                                                        <span className="text-[8px] font-bold uppercase opacity-80 mt-0.5">Somente Módulos</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Cpu size={18} className="mb-1 opacity-80" />
                                                        <span className="text-xl font-extrabold leading-none block">{inverterPowerDisplay}</span>
                                                        <span className="text-[8px] font-bold uppercase opacity-80 mt-0.5">{inverterBrandDisplay}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-white border border-[#C4A462] rounded-2xl p-2 text-center shadow-md flex flex-col items-center justify-center h-16">
                                                <span className="text-lg font-bold text-[#1B2A49] leading-none block">{results.monthlyGeneration}</span>
                                                <span className="text-[7px] font-bold text-[#9C8040] uppercase mt-0.5">Geração kWh</span>
                                            </div>
                                            <div className="bg-white border border-[#C4A462] rounded-2xl p-2 text-center shadow-md flex flex-col items-center justify-center h-16">
                                                <span className="text-[10px] font-bold text-[#1B2A49] leading-none block mt-0.5">{formatCurrency(results.annualSavings)}</span>
                                                <span className="text-[7px] font-bold text-[#9C8040] uppercase mt-0.5">Economia/Ano</span>
                                            </div>
                                            <div className="bg-white border border-[#C4A462] rounded-2xl p-2 text-center shadow-md flex flex-col items-center justify-center h-16">
                                                <div className="flex items-center justify-center gap-3 leading-none">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-lg font-bold text-[#1B2A49] leading-none">{years}</span>
                                                        <span className="text-[6px] font-bold text-gray-400 uppercase">Anos</span>
                                                    </div>
                                                    <div className="w-[0.5px] h-6 bg-gray-300"></div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-lg font-bold text-[#1B2A49] leading-none">{months}</span>
                                                        <span className="text-[6px] font-bold text-gray-400 uppercase">Meses</span>
                                                    </div>
                                                </div>
                                                <span className="text-[6px] font-bold text-[#9C8040] uppercase mt-1 tracking-tight">Retorno</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-[#C4A462] text-[#1B2A49] text-[8px] font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider shadow-sm">
                                            Condição Especial
                                        </div>
                                        
                                        {isFinanced ? (
                                            <div className="mt-2">
                                                <div className="flex flex-col items-center mb-4">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Investimento Total</span>
                                                    {isDiscountApplied && results.discountUsed > 0 && (
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <div className="relative">
                                                                <span className="text-xs font-bold text-gray-300 block">{formatCurrency(results.grossPrice)}</span>
                                                                <div className="absolute top-[50%] left-0 w-full h-[1px] bg-red-400"></div>
                                                            </div>
                                                            <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">-{formatCurrency(results.discountUsed)}</span>
                                                        </div>
                                                    )}
                                                    <span className="text-3xl font-extrabold text-[#1B2A49] tracking-tight">{formatCurrency(safeTotalPrice)}</span>
                                                </div>

                                                <div className="h-px bg-gray-100 w-full mb-4"></div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-2 border border-gray-100">
                                                        <span className="text-[8px] font-bold text-gray-400 uppercase mb-1">Condição</span>
                                                        <div className="flex items-center gap-1.5">
                                                            {paymentMethod === 'ENTRY' ? <Wallet size={12} className="text-[#1B2A49]"/> : <Banknote size={12} className="text-[#1B2A49]"/>}
                                                            <span className="text-xs font-bold text-[#1B2A49]">
                                                                {paymentMethod === 'ENTRY' ? 'Entrada + Parc.' : 'Financiamento'}
                                                            </span>
                                                        </div>
                                                        {downPayment > 0 && (
                                                            <span className="text-[9px] font-bold text-[#1B2A49] mt-1 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                                Entrada: {formatCurrency(downPayment)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col items-center justify-center bg-[#1B2A49] text-white rounded-xl p-2 shadow-md">
                                                        <span className="text-[8px] font-bold text-white/60 uppercase mb-1">Parcelas ({installmentsCount}x)</span>
                                                        <span className="text-lg font-extrabold text-[#C4A462]">{formatCurrency(monthlyInstallment)}</span>
                                                        <span className="text-[7px] text-white/50">Mensais Fixas</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center mt-3 mb-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Investimento Total</span>
                                                
                                                {isDiscountApplied && results.discountUsed > 0 && (
                                                    <div className="flex flex-col items-center justify-center mb-1">
                                                        <div className="relative inline-block">
                                                            <span className="text-sm font-bold text-gray-300 block leading-none px-1">
                                                                {formatCurrency(results.grossPrice)}
                                                            </span>
                                                            <div className="absolute top-[50%] left-0 w-full h-[1px] bg-red-400"></div>
                                                        </div>
                                                        <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 border border-emerald-100">
                                                            Economia de {formatCurrency(results.discountUsed)}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                <span className="text-5xl font-extrabold text-[#1B2A49] tracking-tight block mb-4 mt-2">
                                                    <span className="text-2xl align-top mr-1">R$</span>
                                                    {safeTotalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </span>

                                                <div className="h-px bg-gray-100 w-full mb-4"></div>

                                                <div className="flex justify-center flex-col items-center">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Condição de Pagamento</span>
                                                    <span className="text-xl font-bold text-[#1B2A49]">À Vista</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 rounded-[2rem] p-5 border border-gray-100">
                                        <h3 className="text-[10px] font-bold text-[#1B2A49] uppercase tracking-widest mb-4 text-center">
                                            Projeção de Economia (6 Anos)
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-[9px] font-bold text-[#1B2A49] mb-1">
                                                    <span>Celesc</span>
                                                    <span>{formatCurrency(costNoSolar)}</span>
                                                </div>
                                                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#1B2A49] rounded-full" style={{ width: '100%' }}></div>
                                                </div>
                                            </div>

                                            {/* Custo do Sistema AGORA APARECE SEMPRE */}
                                            <div>
                                                <div className="flex justify-between text-[9px] font-bold text-gray-500 mb-1">
                                                    <span>Custo do Sistema</span>
                                                    <span>{formatCurrency(costSystem)}</span>
                                                </div>
                                                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden border border-[#1B2A49]">
                                                    <div className="h-full bg-white rounded-full border border-[#1B2A49]" style={{ width: `${getPercent(costSystem)}%` }}></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-[9px] font-bold text-[#C4A462] mb-1">
                                                    <span>Seu Lucro Líquido</span>
                                                    <span>{formatCurrency(profit)}</span>
                                                </div>
                                                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden border border-[#C4A462]">
                                                    <div className="h-full bg-[#C4A462] rounded-full" style={{ width: `${getPercent(profit)}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                            <ShieldCheck size={12} /> Garantias
                                        </h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-[#1B2A49] text-white rounded-2xl p-2 flex flex-col items-center justify-center text-center h-16">
                                                <span className="text-lg font-extrabold text-[#C4A462] leading-none mb-0.5">30 Anos</span>
                                                <span className="text-[6px] font-bold uppercase tracking-wider">Performance</span>
                                            </div>
                                            <div className="bg-white border border-[#1B2A49] text-[#1B2A49] rounded-2xl p-2 flex flex-col items-center justify-center text-center h-16">
                                                <span className="text-lg font-extrabold leading-none mb-0.5">15 Anos</span>
                                                <span className="text-[6px] font-bold uppercase tracking-wider">Garantia Inv.</span>
                                            </div>
                                            <div className="bg-[#C4A462] text-[#1B2A49] rounded-2xl p-2 flex flex-col items-center justify-center text-center h-16 shadow-sm">
                                                <span className="text-lg font-extrabold leading-none mb-0.5">100%</span>
                                                <span className="text-[6px] font-bold uppercase tracking-wider">Homologação</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                <div className="text-center pb-6 pt-4 mt-auto">
                                    <div className="w-full h-px bg-gray-200 mb-3"></div>
                                    


                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <Zap size={12} className="text-[#C4A462] fill-current" />
                                        <span className="text-xs font-bold text-[#1B2A49] uppercase tracking-widest">{companyName || 'Energia Solar'}</span>
                                    </div>
                                    <div className="text-[9px] text-gray-500 font-semibold italic flex flex-col items-center">
                                        <span>"Ao Rei eterno, o Deus único, imortal e invisível, sejam honra e glória para todo o sempre. Amém."</span>
                                        <span className="mt-0.5">1 Timóteo 1:17</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div 
                className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50 flex justify-center print:hidden pb-safe"
                data-html2canvas-ignore="true"
            >
                <div className="w-full max-w-md flex flex-col gap-3">
                    {hasPowerBarrier && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-red-100 p-1 rounded-lg text-red-600 shrink-0">
                                <Zap size={14} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-red-800 uppercase leading-tight">Barreira Técnica</p>
                                <p className="text-[9px] text-red-600 font-medium mt-0.5">
                                    Inversores acima de 7,5kW exigem rede Bifásica ou Trifásica. Altere o tipo de rede antes de enviar.
                                </p>
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={handleMainAction}
                        disabled={isGenerating || hasPowerBarrier}
                        className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${
                            hasPowerBarrier 
                            ? 'bg-gray-300 text-gray-500 shadow-none' 
                            : 'bg-green-600 text-white shadow-green-600/30 hover:bg-green-700'
                        }`}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={20} className="animate-spin text-white" />
                                <span>Gerando PDF...</span>
                            </>
                        ) : (
                            <>
                                <Share2 size={20} className={hasPowerBarrier ? 'text-gray-400' : 'text-white'} />
                                <span>Compartilhar Proposta</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {showShareModal && (
                <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-nior-navy text-lg">Como deseja enviar?</h3>
                            <button onClick={() => setShowShareModal(false)} className="p-1 bg-gray-100 rounded-full text-gray-400 hover:text-nior-navy"><X size={18}/></button>
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={() => handleGeneratePDF('WA')}
                                className="w-full p-4 bg-green-600 text-white rounded-2xl flex items-center justify-between shadow-lg shadow-green-600/20 active:scale-95 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <Smartphone size={24} />
                                    <div className="text-left">
                                        <span className="block font-bold text-sm">Enviar no WhatsApp</span>
                                        <span className="block text-[10px] text-white/80">Para {lead?.name?.split(' ')[0]}</span>
                                    </div>
                                </div>
                                <ArrowLeft size={18} className="rotate-180" />
                            </button>

                            <button 
                                onClick={() => handleGeneratePDF('SHARE')}
                                className="w-full p-4 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-between hover:bg-gray-200 active:scale-95 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <Download size={24} />
                                    <div className="text-left">
                                        <span className="block font-bold text-sm">Salvar / Outros</span>
                                        <span className="block text-[10px] text-gray-400">Compartilhamento nativo</span>
                                    </div>
                                </div>
                                <ArrowLeft size={18} className="rotate-180" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
