export type StoredTrack = {
  id: string
  fingerprint: string
  title: string
  artist: string
  album: string
  duration: number
  fileName: string
  relativePath: string
  addedAt: number
  favorite: boolean
  playCount: number
  lastPlayedAt: number | null
  file: Blob
}

export type PlaybackRecord = {
  id: string
  trackId: string
  playedAt: number
}

const databaseName = 'xiamusic-library'
let databasePromise: Promise<IDBDatabase> | null = null

function getDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      database.createObjectStore('tracks', { keyPath: 'id' })
      const history = database.createObjectStore('history', { keyPath: 'id' })
      history.createIndex('trackId', 'trackId', { unique: false })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      databasePromise = null
      reject(request.error ?? new Error('Unable to open the local music library.'))
    }
    request.onblocked = () => {
      databasePromise = null
      reject(new Error('The local music library is blocked by another open app window.'))
    }
  })

  return databasePromise
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('The local music library request failed.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('The local music library update was cancelled.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('The local music library update failed.'))
  })
}

export async function loadStoredTracks(): Promise<StoredTrack[]> {
  const database = await getDatabase()
  const transaction = database.transaction('tracks', 'readonly')
  const result = await requestResult(transaction.objectStore('tracks').getAll()) as StoredTrack[]
  await transactionDone(transaction)
  return result.sort((a, b) => a.addedAt - b.addedAt)
}

export async function saveStoredTracks(tracks: StoredTrack[]): Promise<void> {
  if (!tracks.length) return
  const database = await getDatabase()
  const transaction = database.transaction('tracks', 'readwrite')
  const store = transaction.objectStore('tracks')
  tracks.forEach(track => store.put(track))
  await transactionDone(transaction)
}

export async function updateStoredTrack(
  id: string,
  changes: Partial<Pick<StoredTrack, 'favorite' | 'playCount' | 'lastPlayedAt' | 'duration'>>
): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction('tracks', 'readwrite')
  const store = transaction.objectStore('tracks')
  const track = await requestResult(store.get(id)) as StoredTrack | undefined
  if (track) store.put({ ...track, ...changes })
  await transactionDone(transaction)
}

export async function removeStoredTrack(id: string): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction(['tracks', 'history'], 'readwrite')
  transaction.objectStore('tracks').delete(id)
  const historyStore = transaction.objectStore('history')
  const records = await requestResult(historyStore.index('trackId').getAllKeys(id))
  records.forEach(key => historyStore.delete(key))
  await transactionDone(transaction)
}

export async function addPlaybackRecord(trackId: string, playedAt: number): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction(['tracks', 'history'], 'readwrite')
  const tracks = transaction.objectStore('tracks')
  const track = await requestResult(tracks.get(trackId)) as StoredTrack | undefined
  if (track) tracks.put({ ...track, playCount: track.playCount + 1, lastPlayedAt: playedAt })
  transaction.objectStore('history').put({
    id: `${trackId}:${playedAt}`,
    trackId,
    playedAt
  } satisfies PlaybackRecord)
  await transactionDone(transaction)
}

export async function loadPlaybackHistory(): Promise<PlaybackRecord[]> {
  const database = await getDatabase()
  const transaction = database.transaction('history', 'readonly')
  const records = await requestResult(transaction.objectStore('history').getAll()) as PlaybackRecord[]
  await transactionDone(transaction)
  return records.sort((a, b) => b.playedAt - a.playedAt)
}
