import { supabase, hasSupabase } from '../lib/supabase'
import type { Product } from '../types/product'
import { dataUrlToBlob } from './image'

const DB_NAME = 'productshowcase'
const STORE = 'products'
const BUCKET = 'products'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
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

async function localSave(p: Product): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(p)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function localList(): Promise<Product[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as Product[]) || [])
    req.onerror = () => reject(req.error)
  })
}

async function localDelete(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function uploadImage(dataUrl: string, path: string): Promise<string> {
  if (!supabase) return dataUrl
  const blob = dataUrlToBlob(dataUrl)
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function saveProduct(p: Product): Promise<Product> {
  if (hasSupabase && supabase) {
    try {
      const origPath = `${p.id}/original.png`
      const digPath = `${p.id}/digital.png`
      const [origUrl, digUrl] = await Promise.all([
        uploadImage(p.originalDataUrl, origPath),
        uploadImage(p.digitalDataUrl, digPath),
      ])
      const row = {
        id: p.id,
        name: p.name,
        description: p.description,
        tags: p.tags,
        original_url: origUrl,
        factory_url: p.factoryDataUrl ? await uploadImage(p.factoryDataUrl, `${p.id}/factory.png`) : p.factoryImageUrl || null,
        digital_url: digUrl,
        format: p.digitalFormat,
        width: p.width,
        height: p.height,
        created_at: new Date(p.createdAt).toISOString(),
      }
      const { error } = await supabase.from('products').upsert(row)
      if (error) throw error
      return { ...p, originalDataUrl: origUrl, digitalDataUrl: digUrl }
    } catch (e) {
      console.warn('Supabase save failed, falling back to local', e)
    }
  }
  await localSave(p)
  return p
}

export async function listProducts(): Promise<Product[]> {
  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        tags: r.tags || [],
        originalDataUrl: r.original_url,
        factoryDataUrl: r.factory_url || undefined,
        factoryImageUrl: r.factory_url || undefined,
        digitalDataUrl: r.digital_url,
        digitalFormat: r.format || 'png',
        createdAt: new Date(r.created_at).getTime(),
        width: r.width,
        height: r.height,
      }))
    } catch (e) {
      console.warn('Supabase list failed, falling back to local', e)
    }
  }
  const list = await localList()
  return list.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteProduct(id: string): Promise<void> {
  if (hasSupabase && supabase) {
    try {
      await supabase.from('products').delete().eq('id', id)
      await supabase.storage.from(BUCKET).remove([`${id}/original.png`, `${id}/digital.png`])
      return
    } catch (e) {
      console.warn('Supabase delete failed, falling back to local', e)
    }
  }
  await localDelete(id)
}

export { hasSupabase }