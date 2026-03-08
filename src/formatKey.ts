/**
 * Extracts the note name from a WritKey value like "Major:G" or "Minor:Ab".
 * Returns the raw value unchanged if no colon is present.
 */
export function formatKey(raw: string): string {
  const colon = raw.lastIndexOf(":")
  return colon >= 0 ? raw.slice(colon + 1).trim() : raw.trim()
}
