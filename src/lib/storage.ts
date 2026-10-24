// IndexedDB persistence for variables and history.

const DB_NAME = 'scratchpad-calculator';
const DB_VERSION = 1;
const STORE = 'state';
const RECORD_KEY = 'calculator.v2';

/** Where earlier builds kept the same record; migrated once, then removed. */
const LEGACY_STORAGE_KEY = 'calculator.v2';

export interface PersistedState {
  variables?: unknown;
  history?: unknown;
}

let opening: Promise<IDBDatabase> | null = null;

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (!opening) {
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB open was blocked'));
    });

    // Let a later call retry instead of caching the failure.
    opening.catch(() => {
      opening = null;
    });
  }

  return opening;
}

function readLegacy(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PersistedState) : null;
  } catch {
    return null;
  }
}

function clearLegacy(): void {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Nothing to clean up if localStorage is unavailable.
  }
}

/** Resolves to the saved state, or an empty object when nothing usable is stored. */
export async function loadState(): Promise<PersistedState> {
  try {
    const db = await openDatabase();
    const stored: unknown = await promisify(
      db.transaction(STORE, 'readonly').objectStore(STORE).get(RECORD_KEY)
    );

    if (stored && typeof stored === 'object') return stored as PersistedState;

    const legacy = readLegacy();
    if (legacy) {
      await saveState(legacy);
      clearLegacy();
      return legacy;
    }

    return {};
  } catch {
    // IndexedDB can be blocked (e.g. some private modes); fall back to what
    // earlier builds left behind so the user still sees their data.
    return readLegacy() ?? {};
  }
}

/**
 * Writes are queued per connection in call order, so the last call wins.
 * Rejects when the write fails; callers decide whether that matters.
 */
export async function saveState(state: PersistedState): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(state, RECORD_KEY);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write was aborted'));
  });
}
