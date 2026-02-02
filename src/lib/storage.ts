/**
 * IndexedDB persistence — no external dependencies.
 * Stores document state (annotations, page list) keyed by document id.
 */

const DB_NAME = 'pdf-annotator-db';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

export interface StoredDocumentState {
  annotations: unknown[];
  pages: unknown[];
  currentPage?: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'docId' });
      }
    };
  });
}

export function getDocumentState(docId: string): Promise<StoredDocumentState> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(docId);
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
        req.onsuccess = () => {
          db.close();
          const row = req.result;
          const currentPage = row?.currentPage;
          resolve({
            annotations: row?.annotations ?? [],
            pages: row?.pages ?? [],
            currentPage: typeof currentPage === 'number' && currentPage >= 1 ? currentPage : undefined,
          });
        };
      })
  );
}

export function saveDocumentState(
  docId: string,
  state: StoredDocumentState
): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ docId, ...state });
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
        req.onsuccess = () => {
          db.close();
          resolve();
        };
      })
  );
}
