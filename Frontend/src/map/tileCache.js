const DB_NAME = 'madalogistix_map_tiles'
const DB_VERSION = 1
const STORE_NAME = 'tiles'
const MAX_CACHE_SIZE = 500

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function getCachedTile(url) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(url)
      req.onsuccess = () => resolve(req.result?.blob || null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function cacheTile(url, blob) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({ url, blob, timestamp: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* noop */ }
}

export async function trimCache() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const idx = store.index('timestamp')
    let count = 0
    const totalReq = store.count()
    return new Promise((resolve) => {
      totalReq.onsuccess = () => {
        const total = totalReq.result
        if (total <= MAX_CACHE_SIZE) return resolve()
        const toDelete = total - MAX_CACHE_SIZE
        const cursor = idx.openCursor()
        let deleted = 0
        cursor.onsuccess = (e) => {
          const c = e.target.result
          if (!c || deleted >= toDelete) return resolve()
          c.delete()
          deleted++
          c.continue()
        }
      }
    })
  } catch { /* noop */ }
}

export function tileUrlToCacheKey(url) {
  return url
}
