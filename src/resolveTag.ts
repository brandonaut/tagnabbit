import { fetchTagById, type Tag } from "./api/tags"
import { getAdhocTag, getCachedTagById, storeAdhocTag } from "./cache/tagDatabase"

// Resolves a tag by id for direct/deep-link navigation: full-catalog cache,
// then previously fetched ad-hoc tags, then a live fetch (cached for next time).
export async function resolveTag(id: string): Promise<Tag | null> {
  const cached = await getCachedTagById(id)
  if (cached) return cached

  const adhoc = await getAdhocTag(id)
  if (adhoc) return adhoc

  try {
    const fetched = await fetchTagById(id)
    if (fetched) await storeAdhocTag(fetched)
    return fetched
  } catch {
    return null
  }
}
