import { type Tag, type SearchResult } from '../api/tags';

const DB_NAME = 'tagnabbit';
const DB_VERSION = 1;
const STORE_NAME = 'tagstore';

export interface TagCacheMeta {
  count: number;
  cachedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPutAll(db: IDBDatabase, entries: [string, unknown][]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const [key, value] of entries) store.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedAllTags(): Promise<Tag[] | null> {
  const db = await openDB();
  return (await dbGet<Tag[]>(db, 'tags')) ?? null;
}

export async function storeAllTags(tags: Tag[]): Promise<void> {
  const db = await openDB();
  const meta: TagCacheMeta = { count: tags.length, cachedAt: new Date().toISOString() };
  await dbPutAll(db, [['tags', tags], ['meta', meta]]);
}

export async function getTagCacheMeta(): Promise<TagCacheMeta | null> {
  const db = await openDB();
  return (await dbGet<TagCacheMeta>(db, 'meta')) ?? null;
}

const LOCAL_SEARCH_LIMIT = 100;

export function searchLocal(tags: Tag[], query: string): SearchResult {
  const q = query.trim().toLowerCase();
  if (!q) return { available: 0, count: 0, tags: [] };

  const matched = tags.filter(tag =>
    tag.title.toLowerCase().includes(q) ||
    tag.altTitle.toLowerCase().includes(q) ||
    tag.arranger.toLowerCase().includes(q)
  );

  return {
    available: matched.length,
    count: Math.min(matched.length, LOCAL_SEARCH_LIMIT),
    tags: matched.slice(0, LOCAL_SEARCH_LIMIT),
  };
}
