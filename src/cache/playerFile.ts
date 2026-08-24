const DB_NAME = "tagnabbit-player"
const DB_VERSION = 1
const STORE_NAME = "playerFile"
const RECORD_KEY = "current"

export interface PlayerFileRecord {
  blob: Blob
  name: string
  type: string
  position: number
  balance: number
  mono: boolean
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// All reads/writes below are best-effort: unsupported storage or an
// exhausted quota falls back silently to an in-memory-only session rather
// than surfacing an error, per the practice-audio-player spec.

export async function getStoredPlayerFile(): Promise<PlayerFileRecord | null> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(RECORD_KEY)
      req.onsuccess = () => resolve((req.result as PlayerFileRecord | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function storePlayerFile(record: PlayerFileRecord): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      tx.objectStore(STORE_NAME).put(record, RECORD_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Best-effort.
  }
}

export async function updatePlayerFileState(
  partial: Pick<PlayerFileRecord, "position" | "balance" | "mono">,
): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(RECORD_KEY)
      getReq.onsuccess = () => {
        const existing = getReq.result as PlayerFileRecord | undefined
        if (existing) store.put({ ...existing, ...partial }, RECORD_KEY)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Best-effort.
  }
}
