import { loadImage } from './image'

/** Calcula um hash perceptual (aHash 8x8) de uma imagem. */
export async function computeHash(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 8
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, 8, 8)
  const data = ctx.getImageData(0, 0, 8, 8).data
  const gray: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }
  const avg = gray.reduce((a, b) => a + b, 0) / gray.length
  let bits = ''
  for (const g of gray) bits += g >= avg ? '1' : '0'
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
  }
  return hex
}

/** Distância de Hamming entre dois hashes hexadecimais. */
export function hammingDistance(h1: string, h2: string): number {
  if (!h1 || !h2 || h1.length !== h2.length) return 64
  let d = 0
  for (let i = 0; i < h1.length; i++) {
    let x = parseInt(h1[i], 16) ^ parseInt(h2[i], 16)
    while (x) {
      d += x & 1
      x >>= 1
    }
  }
  return d
}
