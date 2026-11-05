
import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Calendar, Zap, CheckCircle2, AlertCircle, Banknote, MapPin, Trash2, ExternalLink, ChevronRight, FileText, StickyNote, PenLine, Check, Loader2, Home, CalendarClock, Briefcase, RefreshCcw, Headset, Plus, ArrowLeft, Share2, Save, RefreshCw, Bell, BellRing, MessageSquare, Wallet, Camera, Image as ImageIcon, LayoutGrid, List, Printer } from 'lucide-react';
import { Lead, SavedProposal, SolarTaskType, Task, LeadRecord, LeadImage, ProposalStatus } from '../../public/types';
import { ProposalService, LeadService, TaskService, SettingsService } from '../../services/db';
import { useUI } from '../../context/UIContext';
import { CommissionModal } from './CommissionModal';

interface LeadDetailsModalProps {
    lead: Lead;
    onClose: () => void;
    onUpdateStatus?: (status: Lead['status']) => void;
    onDelete?: (id: string) => void;
    onOpenProposal: (proposal: SavedProposal) => void;
}

const DetailSection: React.FC<{ title: string; children: React.ReactNode; icon?: React.ElementType, action?: React.ReactNode }> = ({ title, children, icon: Icon, action }) => (
    <div className="mb-8">
        <div className="flex justify-between items-center mb-4 px-1 border-b border-gray-100 pb-2">
            <h4 className="text-xs font-bold text-nior-navy uppercase tracking-widest flex items-center gap-2">
                {Icon && <Icon size={14} className="text-nior-gold" />}
                {title}
            </h4>
            {action}
        </div>
        <div className="bg-white rounded-[1.5rem] p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            {children}
        </div>
    </div>
);

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ 
    lead, 
    onClose, 
    onUpdateStatus, 
    onDelete,
    onOpenProposal
}) => {
    const { showToast, confirm } = useUI();
    const [name, setName] = useState(lead.name);
    const [phone, setPhone] = useState(lead.phone || '');
    const [address, setAddress] = useState(lead.address ? lead.address.split(', Nº')[0] : '');
    const [addressNumber, setAddressNumber] = useState(lead.address && lead.address.includes('Nº') ? lead.address.split('Nº')[1].trim() : ''); 
    const [currentStatus, setCurrentStatus] = useState<Lead['status']>(lead.status);
    
    const [records, setRecords] = useState<LeadRecord[]>(lead.records || []);
    const [newRecordContent, setNewRecordContent] = useState('');

    const [attachments, setAttachments] = useState<LeadImage[]>(lead.attachments || []);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [coords, setCoords] = useState<{lat: number, lng: number} | null>(
        lead.lat && lead.lng ? { lat: lead.lat, lng: lead.lng } : null
    );

    const [proposals, setProposals] = useState<SavedProposal[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingProposals, setLoadingProposals] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [showCommissionModal, setShowCommissionModal] = useState(false);
    const [selectedProposalForSale, setSelectedProposalForSale] = useState<SavedProposal | null>(null);
    
    const [proposalViewMode, setProposalViewMode] = useState<'LIST' | 'GALLERY'>('LIST');
    
    const firstRender = useRef(true);

    const [agendaView, setAgendaView] = useState<'LIST' | 'FORM'>('LIST');
    const [scheduleType, setScheduleType] = useState<SolarTaskType>('Visita Orçamento');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [scheduleDesc, setScheduleDesc] = useState('');
    const [reminderMinutes, setReminderMinutes] = useState<number>(0); 
    const [isScheduling, setIsScheduling] = useState(false);

    const safeDate = (dateInput: any): Date | null => {
        if (!dateInput) return null;
        if (typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
            return dateInput.toDate();
        }
        const d = new Date(dateInput);
        return isNaN(d.getTime()) ? null : d;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 11) val = val.substring(0, 11);
        if (val.length > 10) val = val.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        else if (val.length > 6) val = val.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        else if (val.length > 2) val = val.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        else if (val.length > 0) val = val.replace(/^(\d{0,2})/, '($1');
        setPhone(val);
    };

    const saveLeadData = async () => {
        setSaveStatus('saving');
        try {
            let finalAddress = address;
            if (addressNumber.trim() && !address.includes(', Nº')) {
                finalAddress = `${address}, Nº ${addressNumber}`;
            } else if (addressNumber.trim()) {
                finalAddress = `${address} ${addressNumber}`;
            }
            
            await LeadService.update({
                ...lead,
                name,
                phone,
                address: finalAddress,
                status: currentStatus,
                lat: coords?.lat,
                lng: coords?.lng,
                records, 
                attachments 
            });
            
            if (onUpdateStatus && currentStatus !== lead.status) onUpdateStatus(currentStatus);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            setSaveStatus('idle'); 
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await LeadService.uploadImage(lead.id, file);
            const newAttachment: LeadImage = {
                id: Math.random().toString(36).substr(2, 9),
                url,
                name: file.name,
                createdAt: new Date().toISOString()
            };
            const updatedAttachments = [newAttachment, ...attachments];
            setAttachments(updatedAttachments);
            await LeadService.update({ ...lead, attachments: updatedAttachments });
            showToast("Sucesso", "Imagem anexada.", "success");
        } catch (error) {
            console.error("Upload failed", error);
            showToast("Erro", "Falha ao enviar imagem.", "error");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteAttachment = async (id: string) => {
        confirm({
            title: "Remover Anexo?",
            description: "Deseja excluir esta imagem?",
            type: "danger",
            onConfirm: async () => {
                const updatedAttachments = attachments.filter(a => a.id !== id);
                setAttachments(updatedAttachments);
                await LeadService.update({ ...lead, attachments: updatedAttachments });
                showToast("Removido", "Anexo excluído.", "info");
            }
        });
    };

    const handleAddRecord = async () => {
        if (!newRecordContent.trim()) return;
        const newRecord: LeadRecord = {
            id: Math.random().toString(36).substr(2, 9),
            content: newRecordContent,
            date: new Date().toISOString()
        };
        const updatedRecords = [newRecord, ...records];
        setRecords(updatedRecords);
        setNewRecordContent('');
        await LeadService.update({ ...lead, records: updatedRecords });
        showToast("Salvo", "Registro adicionado.", "success");
    };

    const handleDeleteRecord = async (id: string) => {
        confirm({
            title: "Apagar Registro?",
            description: "Esta ação removerá a anotação permanentemente.",
            type: "danger",
            onConfirm: async () => {
                const updatedRecords = records.filter(r => r.id !== id);
                setRecords(updatedRecords);
                await LeadService.update({ ...lead, records: updatedRecords });
                showToast("Removido", "Registro apagado.", "info");
            }
        });
    };

    const formatRecordText = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                return <strong key={i} className="font-extrabold text-nior-navy">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                return <em key={i} className="italic text-nior-navy/80">{part.slice(1, -1)}</em>;
            }
            return part;
        });
    };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        const timer = setTimeout(saveLeadData, 800); 
        return () => clearTimeout(timer);
    }, [name, phone, address, addressNumber, currentStatus, coords]); 

    const fetchData = async () => {
        setLoadingProposals(true);
        try {
            const pData = await ProposalService.getByLeadId(lead.id);
            setProposals(pData);

            const allTasks = await TaskService.getAll();
            const leadTasks = allTasks
                .filter(t => t.linkedLeadId === lead.id)
                .sort((a,b) => {
                    const dateA = safeDate(a.scheduledDate)?.getTime() || 0;
                    const dateB = safeDate(b.scheduledDate)?.getTime() || 0;
                    return dateB - dateA;
                });
            setTasks(leadTasks);

        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        } finally {
            setLoadingProposals(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (!coords && lead.address && lead.address.includes('Lat:')) {
            try {
                const latMatch = lead.address.match(/Lat: ([-\d.]+)/);
                const lngMatch = lead.address.match(/Long: ([-\d.]+)/);
                if (latMatch && lngMatch) {
                    setCoords({ lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) });
                }
            } catch (e) {}
        }
    }, [lead.id]);

    const handleShareProfile = async () => {
        const fullAddress = addressNumber.trim() ? `${address}, Nº ${addressNumber}` : address;
        let mapsLink = '';
        if (fullAddress && fullAddress.trim()) {
            mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
        } else if (coords) {
            mapsLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
        }

        let proposalsListText = '';
        if (proposals.length > 0) {
            proposalsListText = `\n💲 *HISTÓRICO DE ORÇAMENTOS*\n`;
            proposals.forEach((p, idx) => {
                const finalVal = p.totalPrice;
                const discount = p.calculationParams?.discount || 0;
                const fmtFinal = finalVal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
                const sysType = p.systemType || 'Solar';
                proposalsListText += `\n*#${idx + 1}* • ${sysType}\nGer: ${p.monthlyGeneration} kWh\n*Valor: ${fmtFinal}*\n`;
            });
        }

        let recordsText = '';
        if (records.length > 0) {
            recordsText = `\n📄 *REGISTROS*\n`;
            records.slice(0, 5).forEach(r => { 
                recordsText += `_• ${new Date(r.date).toLocaleDateString()}: ${r.content}_\n`;
            });
        }

        let text = `📋 *PERFIL DO CLIENTE*\n\n`;
        if (name) text += `👤 *Nome:* ${name}\n`;
        if (phone && phone.trim()) text += `📞 *Telefone:* ${phone}\n`;
        if (fullAddress && fullAddress.trim()) text += `📍 *Endereço:* ${fullAddress}\n`;
        if (mapsLink) text += `🔗 *Maps:* ${mapsLink}\n`;
        text += proposalsListText + recordsText;
        text = text.trim();

        const appConfig = await SettingsService.getAppConfig();
        const defaultPhone = appConfig?.defaultSharePhone?.replace(/\D/g, '');

        if (defaultPhone && defaultPhone.length >= 10) {
            const url = `https://wa.me/55${defaultPhone}?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        } else if (navigator.share) {
            try { await navigator.share({ text: text }); } catch (error: any) { if (error.name !== 'AbortError') console.log('Erro ao compartilhar', error); }
        } else {
            navigator.clipboard.writeText(text);
            showToast("Copiado", "Perfil copiado para a área de transferência.", "success");
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val);
    const formatTaskDate = (dateInput: any) => {
        const d = safeDate(dateInput);
        if (!d) return '-';
        return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Novo': return 'bg-blue-100 text-blue-700';
            case 'Vendido': return 'bg-green-100 text-green-700';
            case 'Em Negociação': return 'bg-amber-100 text-amber-700';
            case 'Perdido': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            setLocationStatus('loading');
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCoords({ lat: latitude, lng: longitude }); 
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();
                        let streetText = '';
                        if (data && data.address) {
                            const { road, suburb, neighbourhood, city, town, village, municipality } = data.address;
                            const street = road || '';
                            const neighbor = suburb || neighbourhood || '';
                            const cit = city || town || village || municipality || '';
                            const parts = [street, neighbor, cit].filter(Boolean);
                            streetText = parts.join(', ');
                        } else {
                            streetText = 'Endereço não encontrado pelo GPS';
                        }
                        setAddress(streetText);
                        setLocationStatus('success');
                        setTimeout(() => setLocationStatus('idle'), 3000);
                    } catch (error) {
                        setAddress("Localização obtida (GPS)"); 
                        setLocationStatus('idle');
                    }
                },
                (err) => {
                    showToast("Erro GPS", "Não foi possível obter localização.", "error");
                    setLocationStatus('idle');
                },
                { enableHighAccuracy: true }
            );
        } else {
            showToast("Erro", "Geolocalização não suportada.", "error");
        }
    };

    const openGoogleMaps = () => {
        if (coords) {
            window.open(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`, '_blank');
            return;
        }
        const fullSearch = [address, addressNumber].filter(Boolean).join(', ');
        if (!fullSearch) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullSearch)}`;
        window.open(url, '_blank');
    };

    const handleDeleteProposal = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        confirm({
            title: "Excluir Orçamento?",
            description: "Tem certeza que deseja excluir este orçamento do histórico?",
            type: "danger",
            onConfirm: async () => {
                await ProposalService.delete(id);
                setProposals(prev => prev.filter(p => p.id !== id));
                showToast("Excluído", "Orçamento removido.", "info");
            }
        });
    };

    const handleUpdateProposalStatus = async (proposal: SavedProposal, newStatus: ProposalStatus) => {
        const updatedProposal = { ...proposal, status: newStatus };
        await ProposalService.save(updatedProposal);
        setProposals(prev => prev.map(p => p.id === proposal.id ? updatedProposal : p));
    };

    const getProposalStatusColor = (status?: ProposalStatus) => {
        switch (status) {
            case 'Aprovado': return 'bg-green-100 text-green-700 border-green-200';
            case 'Rejeitado': return 'bg-red-50 text-red-600 border-red-100';
            case 'Enviado': return 'bg-blue-50 text-blue-600 border-blue-100';
            default: return 'bg-gray-100 text-gray-500 border-gray-200';
        }
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) { showToast("Aviso", "Notificações não suportadas", "warning"); return false; }
        if (Notification.permission === "granted") return true;
        if (Notification.permission !== "denied") { const permission = await Notification.requestPermission(); return permission === "granted"; }
        return false;
    };

    const handleReminderChange = async (minutes: number) => {
        if (minutes > 0) {
            const granted = await requestNotificationPermission();
            if (granted) setReminderMinutes(minutes);
            else { showToast("Permissão Negada", "Ative as notificações do navegador.", "error"); setReminderMinutes(0); }
        } else setReminderMinutes(0);
    };

    const handleCreateTask = async () => {
        if (!scheduleDate || !scheduleTime) { showToast("Aviso", "Defina data e hora.", "warning"); return; }
        setIsScheduling(true);
        try {
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
            const newTask: Task = {
                id: Math.random().toString(36).substr(2, 9),
                title: `${scheduleType} - ${name}`,
                category: 'Solar',
                status: 'Pending',
                createdAt: new Date(),
                linkedLeadId: lead.id,
                solarType: scheduleType,
                scheduledDate: scheduledDateTime,
                description: scheduleDesc || `Agendamento para ${name}`,
                reminderMinutes: reminderMinutes,
                notified: false
            };
            await TaskService.create(newTask);
            setScheduleDesc(''); setScheduleDate(''); setScheduleTime(''); setReminderMinutes(0); setAgendaView('LIST'); fetchData();
            showToast("Sucesso", "Agendamento criado!", "success");
        } catch (error) { showToast("Erro", "Falha ao criar tarefa.", "error"); } finally { setIsScheduling(false); }
    };

    const handleDeleteClick = () => {
        confirm({
            title: "Excluir Cliente?",
            description: "Tem certeza que deseja apagar este cliente e todo seu histórico? Ação irreversível.",
            type: "danger",
            onConfirm: () => {
                if (onDelete) onDelete(lead.id);
                onClose();
                showToast("Excluído", "Cliente removido com sucesso.", "success");
            }
        });
    };

    const handleAutoUpdateStatus = async () => {
        if (updatingStatus) return;
        
        const statuses: Lead['status'][] = ['Novo', 'Em Negociação', 'Vendido', 'Perdido'];
        const currentIdx = statuses.indexOf(currentStatus);
        const nextStatus = statuses[(currentIdx + 1) % statuses.length];

        if (nextStatus === 'Vendido') {
            // Verifica se há dados básicos
            if (!phone || !address) {
                showToast("Aviso", "Preencha o telefone e endereço antes de fechar a venda.", "warning");
                return;
            }

            // Busca a proposta mais recente ou aprovada
            const bestProposal = proposals.find(p => p.status === 'Aprovado') || proposals[0];
            
            if (!bestProposal) {
                showToast("Aviso", "É necessário ter pelo menos um orçamento para fechar a venda.", "warning");
                return;
            }

            setSelectedProposalForSale(bestProposal);
            setShowCommissionModal(true);
            return;
        }

        setUpdatingStatus(true);
        setCurrentStatus(nextStatus);
        setUpdatingStatus(false);
    };

    const handleConfirmSale = async (isManual: boolean, commissionValue: number) => {
        if (!selectedProposalForSale) return;

        setUpdatingStatus(true);
        try {
            // Atualiza a proposta
            const updatedProposal: SavedProposal = {
                ...selectedProposalForSale,
                status: 'Aprovado',
                commissionData: {
                    isManual,
                    value: commissionValue
                }
            };
            await ProposalService.save(updatedProposal);

            // Atualiza o Lead
            const updatedLead: Lead = {
                ...lead,
                name,
                phone,
                address: addressNumber.trim() ? `${address}, Nº ${addressNumber}` : address,
                status: 'Vendido',
                proposalValue: selectedProposalForSale.totalPrice,
                commissionValue: commissionValue,
                isManualCommission: isManual
            };
            await LeadService.update(updatedLead);
            
            setCurrentStatus('Vendido');
            setShowCommissionModal(false);
            fetchData();
            showToast("Sucesso", "Venda confirmada e registrada!", "success");
            if (onUpdateStatus) onUpdateStatus('Vendido');
        } catch (error) {
            showToast("Erro", "Falha ao registrar venda.", "error");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const TASK_OPTIONS: { type: SolarTaskType, label: string, icon: any }[] = [
        { type: 'Visita Orçamento', label: 'Orçamento', icon: Banknote },
        { type: 'Visita Técnica', label: 'Técnica', icon: Briefcase },
        { type: 'Retorno', label: 'Retorno', icon: RefreshCcw },
        { type: 'Pós-venda', label: 'Pós-Venda', icon: Headset },
    ];

    const REMINDER_OPTIONS = [ { value: 0, label: 'Sem Lembrete' }, { value: 60, label: '1 Hora Antes' }, { value: 720, label: '12 Horas Antes' }, { value: 1440, label: '1 Dia Antes' }, ];

    const ProposalGalleryItem: React.FC<{ prop: SavedProposal }> = ({ prop }) => (
        <div 
            onClick={() => onOpenProposal(prop)}
            className="aspect-square bg-gray-50 rounded-2xl border border-gray-200 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all"
        >
            {prop.coverImage ? (
                <img src={prop.coverImage} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Capa" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                    <Zap size={32} className="mb-2 opacity-50" />
                    <span className="text-[10px] font-bold uppercase">Sem Foto</span>
                </div>
            )}
            
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
                <span className="text-white font-bold text-sm block">{formatCurrency(prop.totalPrice)}</span>
                <div className="flex justify-between items-end">
                    <span className="text-white/80 text-[10px]">{new Date(prop.date).toLocaleDateString()}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-white/20 text-white backdrop-blur-sm`}>
                        {prop.status || 'Rascunho'}
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-nior-navy/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="bg-[#F8FAFC] w-full h-full sm:max-w-5xl sm:h-[90vh] rounded-none sm:rounded-[2.5rem] shadow-2xl relative z-10 animate-in zoom-in duration-300 flex flex-col overflow-hidden">
                
                <div className="bg-white px-6 py-5 border-b border-gray-100 relative z-20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                            <X size={20} />
                        </button>
                        <div className="flex-1 max-w-[200px] sm:max-w-xs">
                            <input 
                                className="text-xl sm:text-2xl font-bold text-nior-navy leading-tight bg-transparent border-b border-transparent hover:border-gray-200 focus:border-nior-gold outline-none w-full transition-colors"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={saveLeadData}
                            />
                            <button 
                                onClick={handleAutoUpdateStatus}
                                disabled={updatingStatus}
                                className={`mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer hover:opacity-80 transition-all active:scale-95 ${getStatusColor(currentStatus)}`}
                            >
                                {updatingStatus ? <Loader2 size={10} className="animate-spin" /> : null}
                                {currentStatus}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                            saveStatus === 'saving' ? 'bg-amber-50 text-amber-600' : 
                            saveStatus === 'saved' ? 'bg-green-50 text-green-600' : 'opacity-0'
                        }`}>
                            {saveStatus === 'saving' ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                            {saveStatus === 'saving' ? 'Salvando...' : 'Salvo'}
                        </div>

                        <button onClick={handleShareProfile} className="p-2.5 rounded-xl text-nior-navy bg-white border border-gray-200 shadow-sm hover:bg-nior-navy hover:text-white hover:border-nior-navy transition-all active:scale-95">
                            <Share2 size={20} />
                        </button>

                        {onDelete && (<button onClick={handleDeleteClick} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors" title="Excluir Lead"><Trash2 size={20} /></button>)}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 max-w-6xl mx-auto">
                        
                        <div className="space-y-6">
                            <DetailSection title="Contato e Localização" icon={User}>
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"><Phone size={18} /></div>
                                        <div className="flex-1">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Telefone / WhatsApp</p>
                                            <input className="w-full text-base font-bold text-nior-navy bg-transparent outline-none border-b border-gray-100 focus:border-nior-gold transition-colors py-1" value={phone} onChange={handlePhoneChange} onBlur={saveLeadData} placeholder="(00) 00000-0000" inputMode="tel"/>
                                        </div>
                                        <a href={`https://wa.me/55${phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100"><Zap size={16} /></a>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <button onClick={handleGetLocation} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${locationStatus === 'success' ? 'bg-green-500 text-white' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'}`} title="Obter Localização Exata (GPS)">{locationStatus === 'loading' ? <Loader2 size={18} className="animate-spin" /> : locationStatus === 'success' ? <Check size={18} /> : <MapPin size={18} />}</button>
                                            <button onClick={openGoogleMaps} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" title="Abrir no Maps"><ExternalLink size={18} /></button>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Endereço Completo</p><textarea className="w-full text-xs font-medium text-nior-navy bg-gray-50 rounded-xl p-3 outline-none resize-none h-24 border border-transparent focus:border-nior-gold focus:bg-white transition-all" value={address} onChange={e => setAddress(e.target.value)} onBlur={saveLeadData} placeholder="Rua, Bairro, Cidade..." /></div>
                                            <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Número</p><div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 border border-transparent focus-within:border-nior-gold focus-within:bg-white transition-all"><Home size={14} className="text-gray-400 ml-1" /><input className="bg-transparent w-full text-sm font-bold text-nior-navy outline-none" value={addressNumber} onChange={e => setAddressNumber(e.target.value.replace(/\D/g, ''))} onBlur={saveLeadData} placeholder="Nº da Casa" inputMode="numeric" pattern="[0-9]*" /></div></div>
                                        </div>
                                    </div>
                                </div>
                            </DetailSection>

                            <DetailSection title="Anexos" icon={ImageIcon}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-nior-gold/50 transition-colors group">
                                            {isUploading ? <Loader2 className="animate-spin text-nior-gold mb-2" size={24} /> : <Camera className="text-gray-400 group-hover:text-nior-gold mb-2" size={24} />}
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Câmera</span>
                                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                        </label>
                                        <label className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-nior-gold/50 transition-colors group">
                                            {isUploading ? <Loader2 className="animate-spin text-nior-gold mb-2" size={24} /> : <FileText className="text-gray-400 group-hover:text-nior-gold mb-2" size={24} />}
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Galeria</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                        </label>
                                    </div>
                                    {attachments.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {attachments.map((img) => (
                                                <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square border border-gray-100">
                                                    <img src={img.url} alt="Attachment" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <a href={img.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/20 rounded-full text-white hover:bg-white/40"><ExternalLink size={14} /></a>
                                                        <button onClick={() => handleDeleteAttachment(img.id)} className="p-1.5 bg-red-500/80 rounded-full text-white hover:bg-red-500"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </DetailSection>

                            <DetailSection title="Registros" icon={MessageSquare}>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <textarea placeholder="Adicionar novo registro..." className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-nior-navy outline-none focus:border-nior-gold transition-colors placeholder-gray-300 resize-none h-24" value={newRecordContent} onChange={e => setNewRecordContent(e.target.value)} />
                                        <button onClick={handleAddRecord} className="bg-nior-navy text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-nior-blue transition-colors shadow-sm active:scale-95 self-end text-xs font-bold uppercase tracking-wider"><Plus size={16} /> Adicionar</button>
                                    </div>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                        {records.length === 0 ? <p className="text-center text-xs text-gray-400 py-4 italic">Nenhum registro adicionado.</p> : records.map(record => (
                                            <div key={record.id} className="bg-gray-50/50 p-3 rounded-xl border border-gray-50 flex justify-between items-start group hover:bg-white hover:border-gray-200 transition-all">
                                                <div className="flex-1 pr-2"><p className="text-sm text-nior-navy font-medium leading-snug whitespace-pre-wrap">{formatRecordText(record.content)}</p><span className="text-[10px] text-gray-400 mt-1 block">{new Date(record.date).toLocaleDateString()} às {new Date(record.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                                                <button onClick={() => handleDeleteRecord(record.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DetailSection>
                        </div>

                        <div>
                            <DetailSection title="Agenda do Cliente" icon={CalendarClock}>
                                {agendaView === 'LIST' ? (
                                    <div className="space-y-3">
                                        <button onClick={() => setAgendaView('FORM')} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-nior-gold hover:text-nior-gold hover:bg-nior-gold/5 transition-all font-bold text-sm"><Plus size={18} /> Novo Agendamento</button>
                                        {tasks.length === 0 ? <div className="text-center py-4 text-gray-400 text-xs">Nenhum agendamento registrado.</div> : <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">{tasks.map(task => (<div key={task.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center"><div><span className="text-[10px] font-bold text-nior-navy uppercase block mb-0.5">{task.solarType || 'Tarefa'}</span><span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={10} /> {formatTaskDate(task.scheduledDate)}{task.reminderMinutes && task.reminderMinutes > 0 && <Bell size={10} className="text-nior-gold ml-1" fill="currentColor" />}</span></div><div className={`w-2 h-2 rounded-full ${task.status === 'Done' ? 'bg-green-500' : 'bg-amber-500'}`}></div></div>))}</div>}
                                    </div>
                                ) : (
                                    <div className="animate-in slide-in-from-right duration-300">
                                        <div className="flex items-center gap-2 mb-4"><button onClick={() => setAgendaView('LIST')} className="p-1 rounded-full hover:bg-gray-100 text-gray-400"><ArrowLeft size={16} /></button><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Novo Evento</span></div>
                                        <div className="space-y-4">
                                            <div><label className="text-[10px] text-gray-400 font-bold uppercase mb-2 block">Tipo de Tarefa</label><div className="grid grid-cols-2 gap-2">{TASK_OPTIONS.map((opt) => { const Icon = opt.icon; const isSelected = scheduleType === opt.type; return (<button key={opt.type} onClick={() => setScheduleType(opt.type)} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all border ${isSelected ? 'bg-nior-navy text-white border-nior-navy shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}><Icon size={20} className="mb-1" strokeWidth={isSelected ? 2.5 : 2} /><span className="text-[10px] font-bold uppercase whitespace-nowrap">{opt.label}</span></button>)})}</div></div>
                                            <div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Data</label><input type="date" className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-nior-navy font-bold outline-none focus:border-nior-gold transition-colors shadow-sm" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} /></div><div><label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Hora</label><input type="time" className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-nior-navy font-bold outline-none focus:border-nior-gold transition-colors shadow-sm" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} /></div></div>
                                            <div><label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block flex items-center gap-1"><BellRing size={10} /> Notificação</label><div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto hide-scrollbar">{REMINDER_OPTIONS.map((opt) => (<button key={opt.value} onClick={() => handleReminderChange(opt.value)} className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${reminderMinutes === opt.value ? 'bg-white text-nior-goldDark shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{opt.label}</button>))}</div></div>
                                            <div><label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Detalhes</label><input className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-nior-navy outline-none focus:border-nior-gold placeholder-gray-300 transition-colors shadow-sm" placeholder="Ex: Levar amostra do painel..." value={scheduleDesc} onChange={e => setScheduleDesc(e.target.value)} /></div>
                                            <button onClick={handleCreateTask} disabled={isScheduling} className="w-full bg-nior-gold text-nior-navy font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-nior-gold/20 hover:bg-[#D4B472] transition-all disabled:opacity-50 mt-2">{isScheduling ? 'Agendando...' : 'Confirmar Agendamento'}</button>
                                        </div>
                                    </div>
                                )}
                            </DetailSection>

                            <DetailSection 
                                title="Histórico de Orçamentos" 
                                icon={FileText} 
                                action={
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setProposalViewMode(prev => prev === 'LIST' ? 'GALLERY' : 'LIST')} className="p-1 text-gray-400 hover:text-nior-navy transition-colors bg-gray-50 rounded-lg">
                                            {proposalViewMode === 'LIST' ? <LayoutGrid size={14} /> : <List size={14} />}
                                        </button>
                                        <button onClick={fetchData} className="p-1 text-gray-400 hover:text-nior-navy"><RefreshCw size={14}/></button>
                                    </div>
                                }
                            >
                                {loadingProposals ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-gray-400"><Loader2 size={24} className="animate-spin mb-2" /><span className="text-xs">Buscando propostas...</span></div>
                                ) : proposals.length > 0 ? (
                                    proposalViewMode === 'LIST' ? (
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                            {proposals.map((prop) => (
                                                <div key={prop.id} onClick={() => onOpenProposal(prop)} className="bg-white border border-gray-100 p-4 rounded-2xl cursor-pointer hover:shadow-md hover:border-nior-gold/20 transition-all group relative overflow-hidden flex flex-col gap-2">
                                                    
                                                    <div className="flex justify-between items-center text-gray-400 text-[10px] font-medium uppercase tracking-wide">
                                                        <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(prop.date).toLocaleDateString()}</span>
                                                        <span>#{prop.id.substring(0,4)}</span>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <span className="text-lg font-extrabold text-nior-navy">{formatCurrency(prop.totalPrice)}</span>
                                                        
                                                        <div className="relative group/status" onClick={e => e.stopPropagation()}>
                                                            <button className={`text-[9px] font-bold px-2 py-1 rounded-md border uppercase transition-colors ${getProposalStatusColor(prop.status)}`}>
                                                                {prop.status || 'Rascunho'}
                                                            </button>
                                                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl py-1 z-50 hidden group-hover/status:block w-24">
                                                                {['Rascunho', 'Enviado', 'Aprovado', 'Rejeitado'].map((s) => (
                                                                    <button 
                                                                        key={s}
                                                                        onClick={(e) => { e.stopPropagation(); handleUpdateProposalStatus(prop, s as ProposalStatus); }}
                                                                        className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-gray-600 hover:bg-gray-50 hover:text-nior-navy uppercase"
                                                                    >
                                                                        {s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 pt-2 border-t border-gray-50">
                                                        <span className="bg-gray-50 px-1.5 py-0.5 rounded">{prop.systemType || 'Solar'}</span>
                                                        <span>•</span>
                                                        <span>{prop.monthlyGeneration} kWh</span>
                                                        {prop.paymentMethod && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{prop.paymentMethod === 'VISTA' ? 'À Vista' : 'Finan.'}</span>
                                                            </>
                                                        )}
                                                        
                                                        <button 
                                                            onClick={(e) => handleDeleteProposal(e, prop.id)}
                                                            className="ml-auto text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                            {proposals.map(prop => <ProposalGalleryItem key={prop.id} prop={prop} />)}
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <AlertCircle size={32} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-sm text-gray-400 font-bold">Nenhum orçamento salvo.</p>
                                        <p className="text-xs text-gray-300 mt-1">Crie uma proposta na calculadora.</p>
                                    </div>
                                )}
                            </DetailSection>
                        </div>

                    </div>
                </div>

            </div>

            {showCommissionModal && selectedProposalForSale && (
                <CommissionModal 
                    totalPrice={selectedProposalForSale.totalPrice}
                    defaultCommission={
                        // Cálculo padrão: 50% sobre o overprice ou lógica de comissão salva
                        (selectedProposalForSale.totalPrice * (selectedProposalForSale.calculationParams?.commission || 0) / 100) +
                        ((selectedProposalForSale.calculationParams?.anchoring || 0) - (selectedProposalForSale.calculationParams?.discount || 0)) * 0.5
                    }
                    onConfirm={handleConfirmSale}
                    onClose={() => setShowCommissionModal(false)}
                />
            )}
        </div>
    );
};
