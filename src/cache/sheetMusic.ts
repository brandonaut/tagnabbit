import { proxyUrl } from '../proxyUrl';

const CACHE_NAME = 'tagnabbit-sheet-music';
const LRU_KEY = 'sheet-music-lru';
const MAX_ENTRIES = 15;

function getLRU(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LRU_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveLRU(urls: string[]): void {
  localStorage.setItem(LRU_KEY, JSON.stringify(urls));
}

export interface SheetMusicData {
  objectUrl: string;
  mimeType: string;
}

export async function getSheetMusic(url: string): Promise<SheetMusicData> {
  const cache = await caches.open(CACHE_NAME);
  let lru = getLRU();

  const cached = await cache.match(url);
  if (cached) {
    // Promote to most-recently-used
    lru = [url, ...lru.filter(u => u !== url)];
    saveLRU(lru);
    const blob = await cached.blob();
    return { objectUrl: URL.createObjectURL(blob), mimeType: blob.type };
  }

  // Fetch fresh copy (proxy in dev to avoid CORS)
  const response = await fetch(proxyUrl(url));
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet music: ${response.status}`);
  }

  // Evict least-recently-used entries until under the limit
  lru = lru.filter(u => u !== url);
  while (lru.length >= MAX_ENTRIES) {
    const evicted = lru.pop()!;
    await cache.delete(evicted);
  }

  // Store response in cache (clone so we can still read the body)
  await cache.put(url, response.clone());

  lru = [url, ...lru];
  saveLRU(lru);

  const blob = await response.blob();
  return { objectUrl: URL.createObjectURL(blob), mimeType: blob.type };
}
