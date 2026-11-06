import jsQR from 'jsqr'
import { loadImage } from './image'

export interface FactoryProduct {
  name: string
  description: string
  imageUrl: string | null
  dataUrl: string | null
  source: 'barcode' | 'wikimedia' | 'none' | 'original'
}

export async function decodeBarcode(dataUrl: string): Promise<string | null> {
  try {
    const img = await loadImage(dataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    return code?.data || null
  } catch (e) {
    console.warn('barcode decode failed', e)
    return null
  }
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('fetch image failed', e)
    return null
  }
}

export async function searchByBarcode(barcode: string): Promise<FactoryProduct | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`)
    if (!res.ok) return null
    const json = await res.json()
    const p = json?.product
    if (!p) return null
    const name = p.product_name || p.generic_name || 'Produto'
    const desc = p.brands ? `${p.brands} - ${p.quantity || ''}`.trim() : ''
    const imageUrl = p.image_front_url || p.image_url || null
    const dataUrl = imageUrl ? await fetchImageAsDataUrl(imageUrl) : null
    return { name, description: desc, imageUrl, dataUrl, source: 'barcode' }
  } catch (e) {
    console.warn('OFF search failed', e)
    return null
  }
}

export async function searchWikimedia(query: string): Promise<FactoryProduct | null> {
  try {
    const q = encodeURIComponent(query)
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=5&prop=imageinfo&iiprop=url&format=json&origin=*`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const pages = json?.query?.pages
    if (!pages) return null
    const first = Object.values(pages).find((p: any) => p.imageinfo?.[0]?.url) as any
    const imageUrl = first?.imageinfo?.[0]?.url || null
    if (!imageUrl) return null
    const dataUrl = await fetchImageAsDataUrl(imageUrl)
    return {
      name: query.slice(0, 60),
      description: 'Imagem de referência (Wikimedia Commons)',
      imageUrl,
      dataUrl,
      source: 'wikimedia',
    }
  } catch (e) {
    console.warn('Wikimedia search failed', e)
    return null
  }
}

export async function searchByText(query: string): Promise<FactoryProduct | null> {
  const q = query.trim()
  if (!q) return null
  const variants = Array.from(new Set([q, q.split(/\s+/).slice(0, 4).join(' ')]))
  for (const v of variants) {
    // 1) Open Food Facts search
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(v)}&search_simple=1&action=process&json=1&page_size=5`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        const p = json?.products?.[0]
        if (p) {
          const name = p.product_name || p.generic_name || v
          const desc = [p.brands, p.quantity].filter(Boolean).join(' - ')
          const imageUrl = p.image_front_url || p.image_url || null
          const dataUrl = imageUrl ? await fetchImageAsDataUrl(imageUrl) : null
          return { name, description: desc, imageUrl, dataUrl, source: 'barcode' }
        }
      }
    } catch (e) {
      console.warn('OFF text search failed', e)
    }
    // 2) Wikimedia
    const w = await searchWikimedia(v)
    if (w) return w
  }
  return null
}

export async function findFactoryProduct(photoDataUrl: string, caption: string, ocrText: string = ''): Promise<FactoryProduct> {
  // 1) código de barras
  const barcode = await decodeBarcode(photoDataUrl)
  if (barcode) {
    const r = await searchByBarcode(barcode)
    if (r) return r
  }
  // 2) OCR text search (priorizar palavras em maiúsculas / marcas)
  const ocrLines = (ocrText || '').split(/\n/).map((s) => s.trim()).filter(Boolean)
  const capitalized = ocrLines
    .join(' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && /^[A-Z]/.test(w))
  const ocrQuery = [...new Set([...capitalized, ...ocrLines])].join(' ').slice(0, 120)
  if (ocrQuery) {
    const r2 = await searchByText(ocrQuery)
    if (r2) return r2
  }
  // 3) caption search
  if (caption) {
    const r3 = await searchByText(caption)
    if (r3) return r3
  }
  return { name: caption || 'Produto', description: ocrText.slice(0, 120), imageUrl: null, dataUrl: null, source: 'none' }
}