const DB_NAME = 'sonit';
const DB_VERSION = 1;

export type StoreName = 'kits' | 'leads' | 'proposals' | 'tasks' | 'files' | 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of ['kits', 'leads', 'proposals', 'tasks', 'files'] as const) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function put(store: StoreName, value: unknown, key?: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  if (key !== undefined) tx.objectStore(store).put(value, key);
  else tx.objectStore(store).put(value);
  return done(tx);
}

export async function putMany(store: StoreName, values: unknown[]): Promise<void> {
  if (values.length === 0) return;
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const v of values) os.put(v);
  return done(tx);
}

export async function remove(store: StoreName, key: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  return done(tx);
}

export async function clear(store: StoreName): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).clear();
  return done(tx);
}

/** Grava em várias tabelas numa só transação: ou tudo entra, ou nada muda. */
export async function transact(stores: StoreName[], write: (tx: IDBTransaction) => void): Promise<void> {
  const db = await open();
  const tx = db.transaction(stores, 'readwrite');
  try {
    write(tx);
  } catch (e) {
    tx.abort();
    throw e;
  }
  return done(tx);
}

export interface StoredFile {
  id: string;
  blob: Blob;
}

export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* o navegador pode negar; os dados continuam salvos normalmente */
  }
}
