import { proxyUrl } from '../proxyUrl';

const CACHE_NAME = 'tagnabbit-sheet-music';
const LRU_KEY = 'sheet-music-lru';
const MAX_BYTES = 50 * 1024 * 1024; // 50MB

interface LRUEntry {
  url: string;
  size: number;
  cachedAt: string;
}

function getLRU(): LRUEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LRU_KEY) ?? '[]');
    // Migrate from old string[] format — clear tracking and start fresh.
    // Orphaned Cache API entries are harmless; they'll be re-tracked on next access.
    if (raw.length > 0 && typeof raw[0] === 'string') {
      localStorage.removeItem(LRU_KEY);
      return [];
    }
    return raw as LRUEntry[];
  } catch {
    return [];
  }
}

function saveLRU(entries: LRUEntry[]): void {
  localStorage.setItem(LRU_KEY, JSON.stringify(entries));
}

export interface SheetMusicData {
  objectUrl: string;
  mimeType: string;
}

export async function getSheetMusic(url: string): Promise<SheetMusicData> {
  // Cache Storage API requires a secure context and isn't available everywhere
  // (e.g. some mobile browsers). Fall back to a plain fetch when it's absent.
  if (typeof caches === 'undefined') {
    const response = await fetch(proxyUrl(url));
    if (!response.ok) throw new Error(`Failed to fetch sheet music: ${response.status}`);
    const blob = await response.blob();
    return { objectUrl: URL.createObjectURL(blob), mimeType: blob.type };
  }

  const cache = await caches.open(CACHE_NAME);
  let lru = getLRU();

  const cached = await cache.match(url);
  if (cached) {
    const blob = await cached.blob();
    const existing = lru.find(e => e.url === url);
    // If size wasn't tracked (migrated entry), measure it now
    const size = existing?.size ?? blob.size;
    lru = [
      { url, size, cachedAt: existing?.cachedAt ?? new Date().toISOString() },
      ...lru.filter(e => e.url !== url),
    ];
    saveLRU(lru);
    return { objectUrl: URL.createObjectURL(blob), mimeType: blob.type };
  }

  const response = await fetch(proxyUrl(url));
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet music: ${response.status}`);
  }

  const blob = await response.blob();
  const size = blob.size;

  // Evict least-recently-used entries until there's room for the new entry
  lru = lru.filter(e => e.url !== url);
  let totalSize = lru.reduce((sum, e) => sum + e.size, 0);
  while (lru.length > 0 && totalSize + size > MAX_BYTES) {
    const evicted = lru.pop()!;
    await cache.delete(evicted.url);
    totalSize -= evicted.size;
  }

  await cache.put(url, new Response(blob, { headers: { 'Content-Type': blob.type } }));
  lru = [{ url, size, cachedAt: new Date().toISOString() }, ...lru];
  saveLRU(lru);

  return { objectUrl: URL.createObjectURL(blob), mimeType: blob.type };
}
