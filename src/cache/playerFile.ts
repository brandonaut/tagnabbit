const DB_NAME = "tagnabbit-player"
const DB_VERSION = 2
const TRACKS_STORE = "tracks"
const GLOBAL_STORE = "globalState"
const GLOBAL_KEY = "global"

export interface PlaylistTrack {
  id: string
  blob: Blob
  name: string
  type: string
  order: number
}

export interface GlobalPlayerState {
  mono: boolean
  activeTrackId: string | null
}

const DEFAULT_GLOBAL_STATE: GlobalPlayerState = { mono: false, activeTrackId: null }

// Memoized so every caller shares one connection instead of each racing to open
// its own — concurrent indexedDB.open() calls on first-ever use (e.g. the
// mount-restore read firing at the same time as an immediate add-tracks call)
// were the likely cause of a real bug where a fresh, empty database only ever
// ended up with the first file of a multi-file add actually visible.
let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        // The old single-record "playerFile" store from schema v1 is left alone —
        // orphaned, unused, not worth migrating a single record out of.
        if (!db.objectStoreNames.contains(TRACKS_STORE)) {
          db.createObjectStore(TRACKS_STORE, { keyPath: "id" })
        }
        if (!db.objectStoreNames.contains(GLOBAL_STORE)) {
          db.createObjectStore(GLOBAL_STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        dbPromise = null // let a later call retry instead of caching a failure forever
        reject(req.error)
      }
    })
  }
  return dbPromise
}

// All reads/writes below are best-effort: unsupported storage falls back
// silently to an in-memory-only session rather than surfacing an error, per
// the practice-audio-player spec — except addTracks's quota handling, which
// reports per-file failures so the UI can show a clear message.

export async function getPlaylist(): Promise<PlaylistTrack[]> {
  try {
    const db = await openDB()
    const tracks = await new Promise<PlaylistTrack[]>((resolve, reject) => {
      const req = db.transaction(TRACKS_STORE, "readonly").objectStore(TRACKS_STORE).getAll()
      req.onsuccess = () => resolve(req.result as PlaylistTrack[])
      req.onerror = () => reject(req.error)
    })
    return tracks.sort((a, b) => a.order - b.order)
  } catch {
    return []
  }
}

export async function getGlobalState(): Promise<GlobalPlayerState> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(GLOBAL_STORE, "readonly").objectStore(GLOBAL_STORE).get(GLOBAL_KEY)
      req.onsuccess = () =>
        resolve((req.result as GlobalPlayerState | undefined) ?? DEFAULT_GLOBAL_STATE)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return DEFAULT_GLOBAL_STATE
  }
}

export async function setGlobalState(partial: Partial<GlobalPlayerState>): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(GLOBAL_STORE, "readwrite")
      const store = tx.objectStore(GLOBAL_STORE)
      const getReq = store.get(GLOBAL_KEY)
      getReq.onsuccess = () => {
        const existing = (getReq.result as GlobalPlayerState | undefined) ?? DEFAULT_GLOBAL_STATE
        store.put({ ...existing, ...partial }, GLOBAL_KEY)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Best-effort.
  }
}

export interface AddTracksResult {
  added: PlaylistTrack[]
  failed: { name: string; reason: "quota" | "error" }[]
}

// Persists each file in its own transaction, so a failure partway through a
// batch (most likely a storage-quota error) leaves everything that already
// succeeded in place rather than rolling the whole batch back.
export async function addTracks(files: File[]): Promise<AddTracksResult> {
  const result: AddTracksResult = { added: [], failed: [] }

  let db: IDBDatabase
  try {
    db = await openDB()
  } catch {
    return result
  }

  const existing = await getPlaylist()
  let nextOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.order)) + 1 : 0

  for (const file of files) {
    const track: PlaylistTrack = {
      id: crypto.randomUUID(),
      blob: file,
      name: file.name,
      type: file.type,
      order: nextOrder,
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(TRACKS_STORE, "readwrite")
        tx.objectStore(TRACKS_STORE).add(track)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      result.added.push(track)
      nextOrder++
    } catch (err) {
      const isQuota = err instanceof DOMException && err.name === "QuotaExceededError"
      result.failed.push({ name: file.name, reason: isQuota ? "quota" : "error" })
    }
  }

  return result
}

export async function reorderTracks(orderedIds: string[]): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, "readwrite")
      const store = tx.objectStore(TRACKS_STORE)
      for (const [index, id] of orderedIds.entries()) {
        const getReq = store.get(id)
        getReq.onsuccess = () => {
          const existing = getReq.result as PlaylistTrack | undefined
          if (existing) store.put({ ...existing, order: index })
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Best-effort.
  }
}

export async function removeTrack(id: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, "readwrite")
      tx.objectStore(TRACKS_STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Best-effort.
  }
}
