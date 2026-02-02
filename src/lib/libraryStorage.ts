/**
 * IndexedDB persistence for Cognote library: folders and PDF documents.
 * Blobs stored separately so listing is fast.
 */

const DB_NAME = 'black-book-library';
const DB_VERSION = 1;
const STORE_FOLDERS = 'folders';
const STORE_LIBRARY = 'library';
const STORE_BLOBS = 'libraryBlobs';

export interface Folder {
  id: string;
  name: string;
}

export interface LibraryDocument {
  id: string;
  fileName: string;
  folderId: string | null;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
        db.createObjectStore(STORE_LIBRARY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
  });
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function getLibrary(): Promise<{
  folders: Folder[];
  documents: LibraryDocument[];
}> {
  const db = await openDb();
  const folders = await new Promise<Folder[]>((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, 'readonly');
    const req = tx.objectStore(STORE_FOLDERS).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
  const documents = await new Promise<LibraryDocument[]>((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARY, 'readonly');
    const req = tx.objectStore(STORE_LIBRARY).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  documents.sort((a, b) => a.createdAt - b.createdAt);
  return { folders, documents };
}

export async function getLibraryBlob(id: string): Promise<Blob> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const req = tx.objectStore(STORE_BLOBS).get(id);
    req.onsuccess = () => {
      db.close();
      const row = req.result;
      if (row?.blob) resolve(row.blob);
      else reject(new Error('Document not found'));
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function addToLibrary(
  id: string,
  fileName: string,
  folderId: string | null,
  blob: Blob
): Promise<void> {
  const db = await openDb();
  const doc: LibraryDocument = { id, fileName, folderId, createdAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_LIBRARY, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_LIBRARY).put(doc);
    tx.objectStore(STORE_BLOBS).put({ id, blob });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function updateLibraryDocument(
  id: string,
  updates: { fileName?: string; folderId?: string | null }
): Promise<void> {
  const db = await openDb();
  const existing = await new Promise<LibraryDocument | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARY, 'readonly');
    const req = tx.objectStore(STORE_LIBRARY).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!existing) {
    db.close();
    return;
  }
  const updated = { ...existing, ...updates };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARY, 'readwrite');
    tx.objectStore(STORE_LIBRARY).put(updated);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function deleteFromLibrary(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_LIBRARY, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_LIBRARY).delete(id);
    tx.objectStore(STORE_BLOBS).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function createFolder(name: string): Promise<Folder> {
  const id = genId();
  const folder: Folder = { id, name };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, 'readwrite');
    tx.objectStore(STORE_FOLDERS).put(folder);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
  return folder;
}

export async function updateFolder(id: string, name: string): Promise<void> {
  const db = await openDb();
  const existing = await new Promise<Folder | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, 'readonly');
    const req = tx.objectStore(STORE_FOLDERS).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!existing) {
    db.close();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, 'readwrite');
    tx.objectStore(STORE_FOLDERS).put({ ...existing, name });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await openDb();
  const documents = await new Promise<LibraryDocument[]>((resolve, reject) => {
    const tx = db.transaction(STORE_LIBRARY, 'readonly');
    const req = tx.objectStore(STORE_LIBRARY).getAll();
    req.onsuccess = () => resolve((req.result ?? []).filter((d: LibraryDocument) => d.folderId === id));
    req.onerror = () => reject(req.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_LIBRARY, STORE_FOLDERS], 'readwrite');
    const libStore = tx.objectStore(STORE_LIBRARY);
    for (const doc of documents) {
      libStore.put({ ...doc, folderId: null });
    }
    tx.objectStore(STORE_FOLDERS).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
