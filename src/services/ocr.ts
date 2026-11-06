import Tesseract from 'tesseract.js'

function preprocess(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      // grayscale + contrast stretch
      let min = 255, max = 0
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        d[i] = d[i + 1] = d[i + 2] = g
        if (g < min) min = g
        if (g > max) max = g
      }
      const range = max - min || 1
      for (let i = 0; i < d.length; i += 4) {
        const v = ((d[i] - min) / range) * 255
        const c = v > 127 ? Math.min(255, v + 30) : Math.max(0, v - 30)
        d[i] = d[i + 1] = d[i + 2] = c
      }
      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export async function extractTextFromImage(dataUrl: string): Promise<string> {
  const variants = [dataUrl]
  try {
    variants.push(await preprocess(dataUrl))
  } catch {}
  let best = ''
  for (const v of variants) {
    try {
      const { data } = await Tesseract.recognize(v, 'por+eng', { logger: () => {} })
      const text = (data?.text || '').trim()
      if (text.length > best.length) best = text
    } catch (e) {
      console.warn('OCR failed', e)
    }
  }
  return best
}