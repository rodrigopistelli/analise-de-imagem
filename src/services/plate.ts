import Tesseract from 'tesseract.js'

const MERCOSUL = /(?:^|[^A-Z0-9])([A-Z]{3}[- ]?[0-9][A-Z][0-9]{2})(?![A-Z0-9])/
const OLD = /(?:^|[^A-Z0-9])([A-Z]{3}[- ]?[0-9]{4})(?![A-Z0-9])/
const VEHICLE_HINT =
  /\b(placa|ve[ií]culo|carro|moto|caminh[aã]o|autom[oó]vel|ford|fiat|volkswagen|vw|chevrolet|honda|toyota|hyundai|renault|nissan|jeep|peugeot|citro[eë]n|bmw|mercedes|audi|scania|volvo)\b/i

/** Indica se o texto tem indícios de que a imagem é de um veículo/placa. */
export function looksLikeVehicle(text: string | null | undefined): boolean {
  return Boolean(text && VEHICLE_HINT.test(text))
}

/** Normaliza e valida uma placa (Mercosul ABC1D23 ou antiga ABC1234). */
export function normalizePlate(value: string | null | undefined): string | null {
  if (!value) return null
  const text = value.toUpperCase()
  const m = text.match(MERCOSUL) || text.match(OLD)
  return m ? m[1].replace(/[\s-]/g, '') : null
}

/** Extrai uma placa de um texto de OCR. */
export function extractPlateFromText(text: string | null | undefined): string | null {
  if (!text) return null
  return normalizePlate(text)
}

function preprocess(dataUrl: string, mode: 'gray' | 'threshold'): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.max(1, Math.min(3, 1200 / Math.max(1, img.width)))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      let min = 255
      let max = 0
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        d[i] = d[i + 1] = d[i + 2] = g
        if (g < min) min = g
        if (g > max) max = g
      }
      const range = max - min || 1
      for (let i = 0; i < d.length; i += 4) {
        const v = ((d[i] - min) / range) * 255
        if (mode === 'threshold') {
          const c = v > 120 ? 255 : 0
          d[i] = d[i + 1] = d[i + 2] = c
        } else {
          const c = v > 127 ? Math.min(255, v + 25) : Math.max(0, v - 25)
          d[i] = d[i + 1] = d[i + 2] = c
        }
      }
      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/** Lê uma placa usando OCR local e gratuito (whitelist alfanumérica). */
export async function readPlateFromImage(
  dataUrl: string,
  knownText = '',
): Promise<{ plate: string | null; raw: string }> {
  const fromKnown = extractPlateFromText(knownText)
  if (fromKnown) return { plate: fromKnown, raw: knownText }

  let worker: Tesseract.Worker | null = null
  try {
    const variants: string[] = []
    variants.push(await preprocess(dataUrl, 'gray'))
    variants.push(await preprocess(dataUrl, 'threshold'))

    worker = await Tesseract.createWorker('eng', undefined, { logger: () => {} })
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
    })

    for (const v of variants) {
      const { data } = await worker.recognize(v)
      const raw = (data?.text || '').trim()
      const plate = extractPlateFromText(raw)
      if (plate) return { plate, raw }
    }
    return { plate: null, raw: '' }
  } catch (e) {
    console.warn('Plate OCR failed', e)
    return { plate: null, raw: '' }
  } finally {
    if (worker) await worker.terminate().catch(() => {})
  }
}
