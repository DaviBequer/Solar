
import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Search, Plus, CheckSquare, Square, X, Loader2, Minus, Settings, LayoutGrid, Cpu, ArrowRight, Upload, Check } from 'lucide-react';
import { SolarKit, ManualPricing } from '../../public/types';
import { useUI } from '../../context/UIContext';
import { SolarService } from '../../services/db';

interface SolarTableProps {
    kits: SolarKit[];
    onUpdate: (kits: SolarKit[]) => void;
    manualPricing?: ManualPricing | null;
    onUpdateManual?: (pricing: ManualPricing) => void;
    viewMode?: 'PROJECT' | 'MANUAL' | 'BOTH';
}

export const SolarTable: React.FC<SolarTableProps> = ({ kits, onUpdate, viewMode = 'PROJECT' }) => {
  const { showToast, confirm } = useUI();
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- IMPORT PREVIEW STATE ---
  const [previewKits, setPreviewKits] = useState<SolarKit[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // --- CSV PARSER ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const newKits: SolarKit[] = [];

      // Helper to split CSV line respecting quotes
      const splitCSVLine = (line: string) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                  inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                  result.push(current.trim());
                  current = '';
              } else {
                  current += char;
              }
          }
          result.push(current.trim());
          return result;
      };

      // Skip header if it exists
      const startIdx = lines[0]?.toLowerCase().includes('gm') ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = splitCSVLine(line);
        if (cols.length >= 6) {
            const gmRaw = cols[0]?.trim() || '';
            const gm = gmRaw.replace(/\D/g, ''); 
            
            const p585 = parseInt(cols[1]?.trim() || '0');
            const p610 = parseInt(cols[2]?.trim() || '0');
            const p700 = parseInt(cols[3]?.trim() || '0');
            
            // Inversor: Keep as string, remove quotes if present
            let inv = cols[4]?.trim() || '';
            if (inv.startsWith('"') && inv.endsWith('"')) {
                inv = inv.substring(1, inv.length - 1);
            }

            // Lógica solicitada: Se o valor for 3.5 no CSV, deve ser lido como 3,5 na aplicação
            // O parseFloat lida com o ponto, e o toLocaleString('pt-BR') converte para vírgula
            const invNum = parseFloat(inv.replace(',', '.'));
            if (!isNaN(invNum) && !inv.includes(' ') && inv !== '') {
                inv = invNum.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            }
            
            // Valor: Handle potential commas or dots
            const valRaw = cols[5]?.trim() || '0';
            const val = parseFloat(valRaw.replace(',', '.'));

            if (gm && !isNaN(val)) {
                newKits.push({
                    id: Math.random().toString(36).substr(2, 9),
                    gm: gm,
                    panel585: p585,
                    panel610: p610,
                    panel700: p700,
                    inverter: inv,
                    price: val
                });
            }
        }
      }

      if (newKits.length > 0) {
        handleDirectImport(newKits);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        showToast("Formato Inválido", "CSV vazio ou incorreto. Use: GM, 585, 610, 700, Inversor, Valor", "warning");
      }
    };
    reader.readAsText(file);
  };

  const handleDirectImport = async (kitsToImport: SolarKit[]) => {
      setSaving(true);
      await SolarService.batchSave(kitsToImport);
      onUpdate([...kitsToImport, ...kits]);
      setSaving(false);
      showToast("Sucesso", `${kitsToImport.length} kits importados.`, "success");
  };

  const handleConfirmImport = async () => {
      setSaving(true);
      await SolarService.batchSave(previewKits);
      onUpdate([...previewKits, ...kits]);
      setPreviewKits([]);
      setShowPreviewModal(false);
      setSaving(false);
      showToast("Sucesso", `${previewKits.length} kits importados.`, "success");
  };

  // --- CRUD OPERATIONS (PROJECT TAB) ---
  const handleAddRow = async () => {
    setSaving(true);
    const newKit: SolarKit = {
        id: Math.random().toString(36).substr(2, 9),
        gm: '0',
        panel585: 0,
        panel610: 0,
        panel700: 0,
        inverter: 'Novo Inversor',
        price: 0
    };
    await SolarService.save(newKit);
    onUpdate([newKit, ...kits]);
    setSaving(false);
    showToast("Sucesso", "Novo kit adicionado", "success");
  };

  const handleLocalUpdate = (id: string, field: keyof SolarKit, value: any) => {
    onUpdate(kits.map(k => {
        if (k.id === id) {
            return { ...k, [field]: value };
        }
        return k;
    }));
  };

  const handleSaveRow = async (id: string) => {
      const kitToSave = kits.find(k => k.id === id);
      if (kitToSave) {
          await SolarService.save(kitToSave);
      }
  };

  const handleDelete = (id: string) => {
    confirm({
        title: 'Excluir Kit?',
        description: 'Esta ação removerá o kit da tabela permanentemente.',
        type: 'danger',
        onConfirm: async () => {
            await SolarService.delete(id);
            onUpdate(kits.filter(k => k.id !== id));
            showToast("Removido", "Kit excluído com sucesso", "success");
        }
    });
  };

  const handleClearAll = async () => {
    confirm({
        title: 'Apagar Tudo?',
        description: 'ATENÇÃO: Isso excluirá TODOS os kits da tabela no banco de dados. Tem certeza?',
        type: 'danger',
        onConfirm: async () => {
            setSaving(true);
            await SolarService.clearAll();
            onUpdate([]);
            setSaving(false);
            showToast("Limpeza Concluída", "Todos os kits foram removidos.", "info");
        }
    });
  };

  // --- SELECTION LOGIC ---
  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
      if (newSet.size === 0) setIsSelectionMode(false);
  };

  const handleBulkDelete = () => {
      confirm({
          title: 'Excluir Selecionados?',
          description: `Deseja apagar os ${selectedIds.size} itens selecionados?`,
          type: 'danger',
          onConfirm: async () => {
              setSaving(true);
              const promises = Array.from(selectedIds).map((id) => SolarService.delete(id as string));
              await Promise.all(promises);
              onUpdate(kits.filter(k => !selectedIds.has(k.id)));
              setSelectedIds(new Set());
              setIsSelectionMode(false);
              setSaving(false);
              showToast("Removido", `${selectedIds.size} itens excluídos`, "success");
          }
      });
  };

  const handleRowClick = (id: string) => {
      if (isSelectionMode) {
          toggleSelection(id);
      }
  };

  const filteredKits = kits.filter(k => 
    k.gm.includes(filter) || 
    k.inverter.toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => {
      const gmA = parseInt(a.gm.replace(/\D/g, '') || '0');
      const gmB = parseInt(b.gm.replace(/\D/g, '') || '0');
      return gmA - gmB;
  });

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header Actions */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
            type="text" 
            placeholder="Buscar kit..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-gray-50 pl-11 pr-4 py-3 rounded-2xl shadow-sm outline-none border border-transparent focus:border-nior-gold/50 transition-all text-sm text-nior-navy placeholder-gray-300"
            />
        </div>
        <div className="flex gap-2">
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button 
                onClick={() => setIsSelectionMode(!isSelectionMode)} 
                className={`p-3 rounded-2xl border transition-all shadow-sm ${isSelectionMode ? 'bg-nior-navy text-white border-nior-navy' : 'bg-white text-nior-navy border-gray-200 hover:bg-gray-50'}`}
                title="Modo Seleção"
            >
                <CheckSquare size={20} />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-gray-200 text-nior-navy p-3 rounded-2xl hover:bg-gray-50 shadow-sm" title="Importar CSV"><Upload size={20} /></button>
            <button onClick={handleClearAll} className="bg-white border border-gray-200 text-gray-500 p-3 rounded-2xl hover:bg-gray-50 shadow-sm" title="Limpar Tudo"><Trash2 size={20} /></button>
            <button onClick={handleAddRow} className="bg-nior-navy text-white px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={20} /></button>
        </div>
      </div>

      {/* --- THE TABLE --- */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-nior-navy text-white text-xs uppercase tracking-wider font-bold z-10">
                <tr>
                    {isSelectionMode && <th className="px-4 py-4 w-[5%] text-center">#</th>}
                    <th className="px-6 py-4 w-[15%]">GM (kWh)</th>
                    <th className="px-4 py-4 text-center w-[10%]">585W</th>
                    <th className="px-4 py-4 text-center w-[10%]">610W</th>
                    <th className="px-4 py-4 text-center w-[10%]">700W</th>
                    <th className="px-6 py-4 w-[30%]">INVERSOR</th>
                    <th className="px-6 py-4 text-right w-[20%]">VALOR (R$)</th>
                    <th className="px-4 py-4 w-[5%]"></th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {filteredKits.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                            Nenhum registro encontrado.
                        </td>
                    </tr>
                ) : (
                    filteredKits.map((kit) => {
                        const isSelected = selectedIds.has(kit.id);
                        return (
                            <tr 
                                key={kit.id} 
                                className={`transition-colors group ${isSelected ? 'bg-nior-gold/20' : 'hover:bg-gray-50'}`}
                                onClick={() => handleRowClick(kit.id)}
                            >
                                {isSelectionMode && (
                                    <td className="p-4 text-center">
                                        {isSelected ? <CheckSquare className="text-nior-navy mx-auto" /> : <Square className="text-gray-300 mx-auto" />}
                                    </td>
                                )}

                                {/* GM */}
                                <td className="p-4">
                                    <div className="relative">
                                        <input 
                                            value={kit.gm}
                                            type="text"
                                            disabled={isSelectionMode}
                                            onChange={(e) => handleLocalUpdate(kit.id, 'gm', e.target.value)}
                                            onBlur={() => handleSaveRow(kit.id)}
                                            className="w-full bg-transparent font-bold text-nior-navy outline-none px-2 py-2 disabled:text-gray-500"
                                        />
                                        <span className="absolute right-4 top-3 text-xs text-gray-400 pointer-events-none">kWh</span>
                                    </div>
                                </td>
                                
                                {/* 585W */}
                                <td className="p-4">
                                    <input 
                                        type="number"
                                        value={kit.panel585}
                                        disabled={isSelectionMode}
                                        onChange={(e) => handleLocalUpdate(kit.id, 'panel585', parseInt(e.target.value))}
                                        onBlur={() => handleSaveRow(kit.id)}
                                        className={`w-full text-center rounded-xl text-gray-600 outline-none py-2 ${kit.panel585 > 0 ? 'bg-blue-50 font-bold text-blue-700' : 'bg-gray-50 opacity-50'}`}
                                    />
                                </td>

                                {/* 610W */}
                                <td className="p-4">
                                    <input 
                                        type="number"
                                        value={kit.panel610}
                                        disabled={isSelectionMode}
                                        onChange={(e) => handleLocalUpdate(kit.id, 'panel610', parseInt(e.target.value))}
                                        onBlur={() => handleSaveRow(kit.id)}
                                        className={`w-full text-center rounded-xl text-gray-600 outline-none py-2 ${kit.panel610 > 0 ? 'bg-blue-50 font-bold text-blue-700' : 'bg-gray-50 opacity-50'}`}
                                    />
                                </td>

                                {/* 700W */}
                                <td className="p-4">
                                    <input 
                                        type="number"
                                        value={kit.panel700}
                                        disabled={isSelectionMode}
                                        onChange={(e) => handleLocalUpdate(kit.id, 'panel700', parseInt(e.target.value))}
                                        onBlur={() => handleSaveRow(kit.id)}
                                        className={`w-full text-center rounded-xl text-gray-600 outline-none py-2 ${kit.panel700 > 0 ? 'bg-blue-50 font-bold text-blue-700' : 'bg-gray-50 opacity-50'}`}
                                    />
                                </td>

                                {/* INVERSOR */}
                                <td className="p-4">
                                    <input 
                                        value={kit.inverter}
                                        disabled={isSelectionMode}
                                        onChange={(e) => handleLocalUpdate(kit.id, 'inverter', e.target.value)}
                                        onBlur={() => handleSaveRow(kit.id)}
                                        className="w-full bg-transparent text-nior-navy outline-none px-2 py-2 disabled:text-gray-500"
                                    />
                                </td>

                                {/* VALOR */}
                                <td className="p-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-gray-400 text-xs">R$</span>
                                        <input 
                                            type="number"
                                            value={kit.price}
                                            disabled={isSelectionMode}
                                            onChange={(e) => handleLocalUpdate(kit.id, 'price', parseFloat(e.target.value))}
                                            onBlur={() => handleSaveRow(kit.id)}
                                            className="w-32 text-right font-bold text-nior-navy outline-none py-2 bg-transparent disabled:text-gray-600"
                                        />
                                    </div>
                                </td>

                                {/* DELETE */}
                                <td className="p-4 text-center">
                                    {!isSelectionMode && (
                                        <button 
                                            onClick={() => handleDelete(kit.id)}
                                            className="bg-gray-100 text-gray-500 p-3 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
      </div>

      {/* FLOATING BULK ACTIONS */}
      {isSelectionMode && (
          <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
              <div className="bg-nior-navy text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="bg-white/20 px-3 py-1 rounded-lg font-bold">
                          {selectedIds.size}
                      </div>
                      <span className="text-sm font-medium">Selecionados</span>
                  </div>
                  <div className="flex items-center gap-4">
                      <button 
                        onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
                        className="w-10 h-10 bg-gray-100 text-nior-navy rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm"
                        title="Cancelar"
                      >
                          <X size={20} />
                      </button>
                      <button 
                        onClick={handleBulkDelete}
                        className="w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm"
                        title="Excluir"
                      >
                          <Minus size={20} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- PREVIEW MODAL (NEW) --- */}
      {showPreviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowPreviewModal(false)}></div>
              
              <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[2rem] shadow-2xl relative z-10 animate-in zoom-in duration-300 flex flex-col overflow-hidden">
                  
                  {/* Header */}
                  <div className="p-6 pb-2 bg-white border-b border-gray-100 flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-bold text-nior-navy flex items-center gap-2">
                              <Upload size={20} className="text-nior-gold" />
                              Pré-visualização
                          </h3>
                          <p className="text-sm text-gray-400">Verifique os dados antes de importar.</p>
                      </div>
                      <div className="bg-nior-navy/5 text-nior-navy px-3 py-1 rounded-lg text-xs font-bold">
                          {previewKits.length} Itens
                      </div>
                  </div>

                  {/* Scrollable Preview Table */}
                  <div className="flex-1 overflow-auto p-0">
                      <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                              <tr className="text-xs uppercase tracking-wider font-bold text-gray-500">
                                  <th className="px-4 py-3">GM</th>
                                  <th className="px-2 py-3 text-center">585W</th>
                                  <th className="px-2 py-3 text-center">610W</th>
                                  <th className="px-2 py-3 text-center">700W</th>
                                  <th className="px-4 py-3">Inversor</th>
                                  <th className="px-4 py-3 text-right">Valor</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                              {previewKits.map((kit, i) => (
                                  <tr key={i} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 font-bold text-nior-navy">{kit.gm} kWh</td>
                                      <td className={`px-2 py-2 text-center ${kit.panel585 > 0 ? 'text-blue-600 font-bold' : 'text-gray-300'}`}>{kit.panel585 || '-'}</td>
                                      <td className={`px-2 py-2 text-center ${kit.panel610 > 0 ? 'text-blue-600 font-bold' : 'text-gray-300'}`}>{kit.panel610 || '-'}</td>
                                      <td className={`px-2 py-2 text-center ${kit.panel700 > 0 ? 'text-blue-600 font-bold' : 'text-gray-300'}`}>{kit.panel700 || '-'}</td>
                                      <td className="px-4 py-2">{kit.inverter}</td>
                                      <td className="px-4 py-2 text-right font-bold text-green-600">R$ {kit.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                      <button 
                          onClick={() => { setShowPreviewModal(false); setPreviewKits([]); }}
                          className="w-14 h-14 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm"
                      >
                          <X size={24} />
                      </button>
                      <button 
                          onClick={handleConfirmImport}
                          disabled={saving}
                          className="w-14 h-14 bg-gray-200 text-nior-navy rounded-full shadow-lg flex items-center justify-center hover:bg-gray-300 transition-all active:scale-95 disabled:opacity-50"
                      >
                          {saving ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
