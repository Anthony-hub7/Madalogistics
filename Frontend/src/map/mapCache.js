const DB_NAME = 'madalogistix-map'
const DB_VERSION = 2

const STORES = {
  tiles: { max: 2500 },
  routes: { max: 200 },
  geo: { max: 500 },
  meta: { max: 300 },
}

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      for (const name of Object.keys(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'key' })
          store.createIndex('ts', 'ts', { unique: false })
        }
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function get(storeName, key) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function put(storeName, key, value) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).put({ key, ...value, ts: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* noop */ }
}

export async function trim(storeName) {
  try {
    const db = await openDB()
    const max = STORES[storeName]?.max ?? 500
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const idx = store.index('ts')
    const totalReq = store.count()
    return new Promise((resolve) => {
      totalReq.onsuccess = () => {
        const total = totalReq.result
        if (total <= max) return resolve()
        let deleted = 0
        const toDelete = total - max
        const cursor = idx.openCursor()
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

export async function getTile(z, x, y) {
  const row = await get('tiles', `${z}/${x}/${y}`)
  return row?.blob || null
}

export async function putTile(z, x, y, blob) {
  await put('tiles', `${z}/${x}/${y}`, { blob })
  await trim('tiles')
}

export async function touchTile(z, x, y) {
  try {
    const db = await openDB()
    const key = `${z}/${x}/${y}`
    const tx = db.transaction('tiles', 'readwrite')
    const store = tx.objectStore('tiles')
    const req = store.get(key)
    req.onsuccess = () => {
      const row = req.result
      if (row) {
        store.put({ ...row, ts: Date.now() })
      }
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* noop */ }
}

export async function getRoute(points, profile = 'driving') {
  const key = hashPoints(points, profile)
  const row = await get('routes', key)
  return row?.body || null
}

export async function putRoute(points, profile, body) {
  await put('routes', hashPoints(points, profile), { body })
  await trim('routes')
}

export async function getGeo(key) {
  const row = await get('geo', key)
  return row?.body || null
}

export async function putGeo(key, body) {
  await put('geo', key, { body })
  await trim('geo')
}

export async function getMeta(key) {
  const row = await get('meta', key)
  return row?.body || null
}

export async function putMeta(key, body) {
  await put('meta', key, { body })
  await trim('meta')
}

export function tileUrlToCoords(url) {
  const m = url.match(/\/(\d+)\/(\d+)\/(\d+)/)
  if (!m) return null
  return { z: +m[1], x: +m[2], y: +m[3] }
}

function hashPoints(points, profile) {
  const str = points.map(p => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join(';') + ':' + profile
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return 'r' + (h >>> 0).toString(36)
}

export function hashGeo(q, lat, lon) {
  const s = `${q || ''}:${lat || ''}:${lon || ''}`
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return 'g' + (h >>> 0).toString(36)
}

export async function quotaEstimate() {
  if (!navigator.storage?.estimate) return null
  const est = await navigator.storage.estimate()
  return { used: est.usage, quota: est.quota }
}
