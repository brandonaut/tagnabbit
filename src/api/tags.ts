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
}

export interface SearchResult {
  available: number;
  count: number;
  tags: Tag[];
}

function getText(el: Element, tag: string): string {
  return el.querySelector(tag)?.textContent?.trim() ?? '';
}

export async function searchTags(query: string): Promise<SearchResult> {
  const url = `https://www.barbershoptags.com/api.php?q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const xml = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid response from server');
  }

  const tagsEl = doc.querySelector('tags');
  const available = parseInt(tagsEl?.getAttribute('available') ?? '0', 10);
  const count = parseInt(tagsEl?.getAttribute('count') ?? '0', 10);

  const tags: Tag[] = Array.from(doc.querySelectorAll('tag')).map(el => ({
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
  }));

  return { available, count, tags };
}
