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
  async save(storeName, data) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const req = tx.objectStore(storeName).put(data)
      req.onsuccess = () => resolve(req.result)
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
    })
  },

  async getAll(storeName) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const result = []
      const tx = db.transaction(storeName, 'readonly')
      const cursor = tx.objectStore(storeName).openCursor()
      cursor.onsuccess = (event) => {
        const c = event.target.result
        if (c) {
          result.push({ ...c.value, id: c.primaryKey ?? c.value.id })
          c.continue()
        } else {
          resolve(result)
        }
      }
      cursor.onerror = () => reject(cursor.error)
    })
  },

  async remove(storeName, id) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const req = tx.objectStore(storeName).delete(id)
      req.onsuccess = () => resolve()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },
}
