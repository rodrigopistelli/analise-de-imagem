export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function resizeToDataUrl(
  src: string,
  maxSide: number,
  format: 'image/png' | 'image/webp' | 'image/jpeg' = 'image/png',
  quality = 0.92,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(src)
  let w = img.width
  let h = img.height
  if (Math.max(w, h) > maxSide) {
    const scale = maxSide / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const dataUrl = canvas.toDataURL(format, quality)
  return { dataUrl, width: w, height: h }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export function stripDataPrefix(dataUrl: string): string {
  return dataUrl.split(',')[1] || ''
}