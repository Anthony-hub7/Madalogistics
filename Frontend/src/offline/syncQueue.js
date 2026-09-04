class SyncQueue {
  constructor() {
    this.queue = []
  }

  add(action) {
    this.queue.push({ ...action, timestamp: Date.now() })
  }

  async process() {
    while (this.queue.length > 0) {
      const action = this.queue.shift()
      try {
        await action.execute()
      } catch (err) {
        console.error('Sync failed for action:', action, err)
        this.queue.unshift(action)
        break
      }
    }
  }

  get pending() {
    return this.queue.length
  }
}

export const syncQueue = new SyncQueue()
