
import { 
  SolarKit, Lead, Task, AppConfig, CalculationParams, SavedProposal, LeadProposalSummary, ManualPricing, BackupData
} from "../public/types"; 

// --- INDEXED DB HELPERS ---
const DB_NAME = 'SonitDB';
const DB_VERSION = 1;

const STORES = {
    KITS: 'kits',
    LEADS: 'leads',
    PROPOSALS: 'proposals',
    TASKS: 'tasks',
    SETTINGS: 'settings' // Armazena configurações chave-valor (AppConfig, Pricing, etc)
};

// Chaves para o store 'settings'
const SETTING_KEYS = {
    BUDGET: 'budget_params',
    DEFAULTS: 'system_defaults',
    APP_CONFIG: 'app_config',
    MANUAL_PRICING: 'manual_pricing'
};

// Singleton da Conexão
let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // Create Object Stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.KITS)) db.createObjectStore(STORES.KITS, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORES.LEADS)) db.createObjectStore(STORES.LEADS, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORES.PROPOSALS)) db.createObjectStore(STORES.PROPOSALS, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORES.TASKS)) db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) db.createObjectStore(STORES.SETTINGS); // Key-Value store
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });

    return dbPromise;
};

// --- GENERIC DB OPERATIONS ---

const dbGetAll = async <T>(storeName: string): Promise<T[]> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const dbPut = async (storeName: string, value: any, key?: string): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = key ? store.put(value, key) : store.put(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const dbBatchPut = async (storeName: string, values: any[]): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        values.forEach(val => store.put(val));
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const dbGet = async <T>(storeName: string, key: string): Promise<T | null> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

const dbDelete = async (storeName: string, key: string): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const dbClear = async (storeName: string): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- MIGRATION UTILS (LocalStorage -> IndexedDB) ---
// Executa uma vez se detectar dados no LocalStorage e nada no IndexedDB
const migrateDataIfNeeded = async () => {
    try {
        const hasMigrated = localStorage.getItem('sonit_migrated_v1');
        if (hasMigrated) return;

        console.log("Iniciando migração para IndexedDB...");
        
        const lsKeys = {
            KITS: 'sonit_kits',
            LEADS: 'sonit_leads',
            PROPOSALS: 'sonit_proposals',
            TASKS: 'sonit_tasks',
            BUDGET: 'sonit_settings_budget',
            DEFAULTS: 'sonit_settings_defaults',
            APP: 'sonit_app_config',
            MANUAL: 'sonit_manual_pricing'
        };

        const getLS = (k: string) => {
            const i = localStorage.getItem(k);
            return i ? JSON.parse(i) : null;
        };

        // 1. Kits
        const kits = getLS(lsKeys.KITS);
        if (Array.isArray(kits) && kits.length > 0) await dbBatchPut(STORES.KITS, kits);

        // 2. Leads
        const leads = getLS(lsKeys.LEADS);
        if (Array.isArray(leads) && leads.length > 0) await dbBatchPut(STORES.LEADS, leads);

        // 3. Proposals
        const props = getLS(lsKeys.PROPOSALS);
        if (Array.isArray(props) && props.length > 0) await dbBatchPut(STORES.PROPOSALS, props);

        // 4. Tasks
        const tasks = getLS(lsKeys.TASKS);
        if (Array.isArray(tasks) && tasks.length > 0) await dbBatchPut(STORES.TASKS, tasks);

        // 5. Settings
        const budget = getLS(lsKeys.BUDGET);
        if (budget) await dbPut(STORES.SETTINGS, budget, SETTING_KEYS.BUDGET);

        const defaults = getLS(lsKeys.DEFAULTS);
        if (defaults) await dbPut(STORES.SETTINGS, defaults, SETTING_KEYS.DEFAULTS);

        const app = getLS(lsKeys.APP);
        if (app) await dbPut(STORES.SETTINGS, app, SETTING_KEYS.APP_CONFIG);

        const manual = getLS(lsKeys.MANUAL);
        if (manual) await dbPut(STORES.SETTINGS, manual, SETTING_KEYS.MANUAL_PRICING);

        // Mark as migrated
        localStorage.setItem('sonit_migrated_v1', 'true');
        
        // Clear Old Data to free up space (Optional, but good practice)
        // Object.values(lsKeys).forEach(k => localStorage.removeItem(k));
        
        console.log("Migração concluída com sucesso.");

    } catch (e) {
        console.error("Falha na migração:", e);
    }
};

// Initialize Migration immediately
migrateDataIfNeeded();

const generateId = () => Math.random().toString(36).substr(2, 9);

export const getDbConnectionStatus = () => "ONLINE (IndexedDB)";

// --- SERVIÇOS DE VENDAS (SOLAR) ---

export const SolarService = {
    getAll: async (): Promise<SolarKit[]> => {
        return dbGetAll<SolarKit>(STORES.KITS);
    },
    save: async (kit: SolarKit) => { 
        await dbPut(STORES.KITS, kit);
    },
    batchSave: async (newKits: SolarKit[]) => { 
        await dbBatchPut(STORES.KITS, newKits);
    },
    delete: async (id: string) => { 
        await dbDelete(STORES.KITS, id);
    },
    clearAll: async () => {
        await dbClear(STORES.KITS);
    }
};

export const LeadService = {
    getAll: async (): Promise<Lead[]> => {
        const leads = await dbGetAll<Lead>(STORES.LEADS);
        return leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    create: async (lead: Partial<Lead>): Promise<Lead> => {
        const newLead: Lead = {
            id: generateId(),
            name: lead.name || 'Novo Lead',
            phone: lead.phone || '',
            status: 'Novo',
            createdAt: new Date(),
            ...lead
        };
        await dbPut(STORES.LEADS, newLead);
        return newLead;
    },
    update: async (lead: Lead) => { 
        await dbPut(STORES.LEADS, lead);
    },
    // NOVO: Otimizado para grandes importações
    batchSave: async (leads: Lead[]) => {
        await dbBatchPut(STORES.LEADS, leads);
    },
    delete: async (id: string) => {
        await dbDelete(STORES.LEADS, id);
        
        // Clean related data manually (IDB doesn't have cascades)
        const proposals = await ProposalService.getByLeadId(id);
        for (const p of proposals) await ProposalService.delete(p.id);
        
        const tasks = await TaskService.getAll();
        const leadTasks = tasks.filter(t => t.linkedLeadId === id);
        for (const t of leadTasks) await TaskService.delete(t.id);
    },
    uploadImage: async (leadId: string, file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }
};

export const ProposalService = {
    getByLeadId: async (leadId: string): Promise<SavedProposal[]> => {
        const proposals = await dbGetAll<SavedProposal>(STORES.PROPOSALS);
        return proposals
            .filter(p => p.leadId === leadId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    getAll: async (): Promise<SavedProposal[]> => {
        const proposals = await dbGetAll<SavedProposal>(STORES.PROPOSALS);
        return proposals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    save: async (proposal: SavedProposal) => {
        await dbPut(STORES.PROPOSALS, proposal);
        
        // Update Lead Summary
        const summary: LeadProposalSummary | null = (proposal.systemType && proposal.panelCount) ? {
            systemType: proposal.systemType,
            panelCount: proposal.panelCount,
            panelPower: proposal.panelPower || 0,
            inverterModel: proposal.inverterModel || 'N/A',
            paymentMethod: proposal.paymentMethod,
            totalPrice: proposal.totalPrice,
            monthlyGeneration: proposal.monthlyGeneration,
            voltage: proposal.systemConfig.voltage,
            roofType: proposal.systemConfig.roofType,
        } : null;

        const lead = await dbGet<Lead>(STORES.LEADS, proposal.leadId);
        if (lead) {
            lead.proposalValue = proposal.totalPrice;
            lead.status = 'Em Negociação';
            if (summary) lead.lastProposalSummary = summary;
            await dbPut(STORES.LEADS, lead);
        }
    },
    batchSave: async (proposals: SavedProposal[]) => {
        await dbBatchPut(STORES.PROPOSALS, proposals);
    },
    delete: async (id: string) => { 
        await dbDelete(STORES.PROPOSALS, id);
    }
};

export const TaskService = {
    getAll: async (): Promise<Task[]> => {
        const tasks = await dbGetAll<Task>(STORES.TASKS);
        return tasks.map(t => ({
            ...t,
            createdAt: new Date(t.createdAt),
            scheduledDate: t.scheduledDate ? new Date(t.scheduledDate) : undefined
        })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    create: async (task: Task) => { 
        const taskToSave = {
            ...task,
            createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
            scheduledDate: task.scheduledDate instanceof Date ? task.scheduledDate.toISOString() : task.scheduledDate
        };
        await dbPut(STORES.TASKS, taskToSave);
    },
    update: async (task: Task) => { 
        const taskToSave = {
            ...task,
            createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
            scheduledDate: task.scheduledDate instanceof Date ? task.scheduledDate.toISOString() : task.scheduledDate
        };
        await dbPut(STORES.TASKS, taskToSave);
    },
    batchSave: async (tasks: Task[]) => {
        const safeTasks = tasks.map(t => ({
            ...t,
            createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
            scheduledDate: t.scheduledDate instanceof Date ? t.scheduledDate.toISOString() : t.scheduledDate
        }));
        await dbBatchPut(STORES.TASKS, safeTasks);
    },
    delete: async (id: string) => { 
        await dbDelete(STORES.TASKS, id);
    }
};

export const SettingsService = {
    getBudgetParams: async (): Promise<CalculationParams | null> => {
        return dbGet<CalculationParams>(STORES.SETTINGS, SETTING_KEYS.BUDGET);
    },
    saveBudgetParams: async (params: CalculationParams) => { 
        await dbPut(STORES.SETTINGS, params, SETTING_KEYS.BUDGET);
    },
    getSystemDefaults: async (): Promise<any | null> => {
        return dbGet(STORES.SETTINGS, SETTING_KEYS.DEFAULTS);
    },
    saveSystemDefaults: async (defaults: any) => { 
        await dbPut(STORES.SETTINGS, defaults, SETTING_KEYS.DEFAULTS);
    },
    getAppConfig: async (): Promise<AppConfig | null> => {
        return dbGet(STORES.SETTINGS, SETTING_KEYS.APP_CONFIG);
    },
    saveAppConfig: async (config: AppConfig) => { 
        await dbPut(STORES.SETTINGS, config, SETTING_KEYS.APP_CONFIG);
    },
    getManualPricing: async (): Promise<ManualPricing | null> => {
        return dbGet(STORES.SETTINGS, SETTING_KEYS.MANUAL_PRICING);
    },
    saveManualPricing: async (pricing: ManualPricing) => { 
        await dbPut(STORES.SETTINGS, pricing, SETTING_KEYS.MANUAL_PRICING);
    },
};

// --- BACKUP & RESTORE SERVICE (FULL SYSTEM) ---
export const BackupService = {
    createBackup: async (): Promise<string> => {
        const data: BackupData = {
            version: 1,
            timestamp: new Date().toISOString(),
            appConfig: await SettingsService.getAppConfig(),
            budgetParams: await SettingsService.getBudgetParams(),
            manualPricing: await SettingsService.getManualPricing(),
            kits: await SolarService.getAll(),
            leads: await LeadService.getAll(),
            proposals: await ProposalService.getAll(),
            tasks: await TaskService.getAll()
        };
        return JSON.stringify(data, null, 2);
    },

    restoreBackup: async (jsonContent: string): Promise<boolean> => {
        try {
            const data: BackupData = JSON.parse(jsonContent);
            if (!data || !data.timestamp) throw new Error("Arquivo de backup inválido");

            // 1. Limpar Estado Anterior
            await dbClear(STORES.KITS);
            await dbClear(STORES.LEADS);
            await dbClear(STORES.PROPOSALS);
            await dbClear(STORES.TASKS);
            await dbClear(STORES.SETTINGS);

            // 2. Ordem de Importação Lógica

            // Passo A: Configurações
            if (data.appConfig) await SettingsService.saveAppConfig(data.appConfig);
            if (data.budgetParams) await SettingsService.saveBudgetParams(data.budgetParams);
            if (data.manualPricing) await SettingsService.saveManualPricing(data.manualPricing);

            // Passo B: Tabelas e Dados (Batch Put para performance)
            if (data.kits && Array.isArray(data.kits)) {
                await SolarService.batchSave(data.kits);
            }

            if (data.leads && Array.isArray(data.leads)) {
                await LeadService.batchSave(data.leads);
            }

            if (data.proposals && Array.isArray(data.proposals)) {
                await ProposalService.batchSave(data.proposals);
            }

            if (data.tasks && Array.isArray(data.tasks)) {
                await TaskService.batchSave(data.tasks);
            }

            return true;
        } catch (error) {
            console.error("Backup Restore Failed:", error);
            throw error;
        }
    }
};
