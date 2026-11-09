import { computeHash, hammingDistance } from './imageHash'

export interface KnowledgeEntry {
  id: string
  name: string
  description: string
  dataUrl: string
  hash: string
  createdAt: number
}

const DB_NAME = 'productshowcase-kb'
const STORE = 'knowledge'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveEntry(entry: Omit<KnowledgeEntry, 'id' | 'hash' | 'createdAt'> & { dataUrl: string }): Promise<KnowledgeEntry> {
  const hash = await computeHash(entry.dataUrl)
  const full: KnowledgeEntry = {
    id: 'kb_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: entry.name,
    description: entry.description,
    dataUrl: entry.dataUrl,
    hash,
    createdAt: Date.now(),
  }
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(full)
    tx.oncomplete = () => resolve(full)
    tx.onerror = () => reject(tx.error)
  })
}

export async function listEntries(): Promise<KnowledgeEntry[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as KnowledgeEntry[]) || [])
    req.onerror = () => reject(req.error)
  })
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function findBestMatch(hash: string, threshold = 12): Promise<KnowledgeEntry | null> {
  const entries = await listEntries()
  if (entries.length === 0) return null
  let best: KnowledgeEntry | null = null
  let bestDist = Infinity
  for (const e of entries) {
    const d = hammingDistance(hash, e.hash)
    if (d < bestDist) {
      bestDist = d
      best = e
    }
  }
  if (best && bestDist <= threshold) return best
  return null
}
