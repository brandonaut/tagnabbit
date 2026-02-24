import { proxyUrl } from '../proxyUrl';

export interface Tag {
  id: string;
  title: string;
  altTitle: string;
  version: string;
  key: string;
  parts: string;
  type: string;
  arranger: string;
  downloaded: number;
  rating: string;
  ratingCount: string;
  sheetMusicUrl: string;
  sheetMusicAltUrl: string;
  hasLearningTracks: boolean;
}

export interface SearchResult {
  available: number;
  count: number;
  tags: Tag[];
}

function getText(el: Element, tag: string): string {
  return el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}

function parseTagsXml(xml: string): SearchResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid response from server');
  }

  const tagsEl = doc.getElementsByTagName('tags')[0];
  const available = parseInt(tagsEl?.getAttribute('available') ?? '0', 10);
  const count = parseInt(tagsEl?.getAttribute('count') ?? '0', 10);

  const tags: Tag[] = Array.from(doc.getElementsByTagName('tag')).map(el => ({
    id: getText(el, 'id'),
    title: getText(el, 'Title'),
    altTitle: getText(el, 'AltTitle'),
    version: getText(el, 'Version'),
    key: getText(el, 'WritKey'),
    parts: getText(el, 'Parts'),
    type: getText(el, 'Type'),
    arranger: getText(el, 'Arranger'),
    downloaded: parseInt(getText(el, 'Downloaded') || '0', 10),
    rating: getText(el, 'Rating'),
    ratingCount: getText(el, 'RatingCount'),
    sheetMusicUrl: getText(el, 'SheetMusic'),
    sheetMusicAltUrl: getText(el, 'SheetMusicAlt'),
    hasLearningTracks: !!(
      getText(el, 'AllParts') ||
      getText(el, 'Bass') ||
      getText(el, 'Bari') ||
      getText(el, 'Lead') ||
      getText(el, 'Tenor') ||
      getText(el, 'TeachVid')
    ),
  }));

  return { available, count, tags };
}

export async function searchTags(query: string): Promise<SearchResult> {
  const url = proxyUrl(`https://www.barbershoptags.com/api.php?q=${encodeURIComponent(query)}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return parseTagsXml(await response.text());
}

const PAGE_SIZE = 500;

export async function getTagCount(): Promise<number> {
  const url = proxyUrl('https://www.barbershoptags.com/api.php?n=1&start=1');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return parseTagsXml(await response.text()).available;
}

export async function fetchAllTags(
  onProgress: (fetched: number, total: number) => void
): Promise<Tag[]> {
  const firstResponse = await fetch(
    proxyUrl(`https://www.barbershoptags.com/api.php?n=${PAGE_SIZE}&start=1`)
  );
  if (!firstResponse.ok) throw new Error(`Request failed: ${firstResponse.status}`);

  const first = parseTagsXml(await firstResponse.text());
  const total = first.available;
  const allTags: Tag[] = [...first.tags];
  onProgress(allTags.length, total);

  let start = PAGE_SIZE + 1;
  while (allTags.length < total) {
    const response = await fetch(
      proxyUrl(`https://www.barbershoptags.com/api.php?n=${PAGE_SIZE}&start=${start}`)
    );
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    const page = parseTagsXml(await response.text());
    if (page.tags.length === 0) break; // safety valve
    allTags.push(...page.tags);
    onProgress(allTags.length, total);
    start += PAGE_SIZE;
  }

  return allTags;
}
