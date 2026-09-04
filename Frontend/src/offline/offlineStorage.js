const DB_NAME = 'madalogistics-offline'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('deliveries')) {
        db.createObjectStore('deliveries', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const offlineStorage = {
  async save(key, data) {
    const db = await openDB()
    const tx = db.transaction(key, 'readwrite')
    tx.objectStore(key).put(data)
    return tx.done
  },
  async getAll(key) {
    const db = await openDB()
    return new Promise((resolve) => {
      const result = []
      const tx = db.transaction(key, 'readonly')
      const cursor = tx.objectStore(key).openCursor()
      cursor.onsuccess = (event) => {
        const c = event.target.result
        if (c) { result.push(c.value); c.continue() }
        else resolve(result)
      }
    })
  },
}
