/**
 * Fetches all tags from barbershoptags.com and writes them to
 * public/tags-snapshot.json for bundling with the app.
 *
 * Run with: bun run fetch-tags
 *
 * Re-run before each deploy to keep the bundled snapshot reasonably fresh.
 * The in-app staleness check will still trigger a background refresh if the
 * snapshot is more than 7 days old when a user first opens the app.
 */

import { DOMParser } from '@xmldom/xmldom';
import { writeFileSync, mkdirSync } from 'fs';

// Polyfill DOMParser so src/api/tags.ts can run outside a browser context.
(globalThis as unknown as Record<string, unknown>).DOMParser = DOMParser;

const { fetchAllTags } = await import('../src/api/tags.ts');

console.log('Fetching all tags from barbershoptags.com…');
const tags = await fetchAllTags((fetched: number, total: number) => {
  process.stdout.write(`\r  ${fetched.toLocaleString()} / ${total.toLocaleString()} tags`);
});
process.stdout.write('\n');

mkdirSync('public', { recursive: true });
const outPath = 'public/tags-snapshot.json';
writeFileSync(outPath, JSON.stringify({ cachedAt: new Date().toISOString(), tags }));
console.log(`Wrote ${tags.length.toLocaleString()} tags to ${outPath}`);
