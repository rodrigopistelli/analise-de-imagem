import * as faceapi from '@vladmandic/face-api'

const MODEL_URL = '/models'
let modelsLoaded = false
let loadPromise: Promise<void> | null = null

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ])
      modelsLoaded = true
    } catch (e) {
      console.warn('Falha ao carregar modelos de face:', e)
      loadPromise = null
      throw e
    }
  })()
  return loadPromise
}

export function areFaceModelsLoaded(): boolean {
  return modelsLoaded
}

export interface DetectedFace {
  box: { x: number; y: number; width: number; height: number }
  descriptor: number[]
  expressions: Record<string, number>
  dominantExpression: string
  expressionLabel: string
}

const EXPR_LABELS: Record<string, string> = {
  happy: 'alegre',
  sad: 'triste',
  angry: 'brava',
  surprised: 'surpresa',
  fearful: 'amedrontada',
  disgusted: 'desgostosa',
  neutral: 'neutra',
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

export async function detectFaces(dataUrl: string): Promise<DetectedFace[]> {
  await loadFaceModels()
  const img = await dataUrlToImage(dataUrl)
  const detections = await faceapi
    .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors()
    .withFaceExpressions()

  return detections.map((d) => {
    const expr = d.expressions as unknown as Record<string, number>
    const dominant = Object.entries(expr).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'
    return {
      box: {
        x: d.detection.box.x,
        y: d.detection.box.y,
        width: d.detection.box.width,
        height: d.detection.box.height,
      },
      descriptor: Array.from(d.descriptor),
      expressions: expr,
      dominantExpression: dominant,
      expressionLabel: EXPR_LABELS[dominant] || dominant,
    }
  })
}

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

export interface FaceMatch {
  entry: { id: string; name: string; description: string; faceDescriptor?: number[] }
  distance: number
  face: DetectedFace
}

export function matchFaces(
  faces: DetectedFace[],
  entries: { id: string; name: string; description: string; faceDescriptor?: number[] }[],
  threshold = 0.55,
): FaceMatch[] {
  const results: FaceMatch[] = []
  const faceEntries = entries.filter((e) => e.faceDescriptor && e.faceDescriptor.length > 0)
  for (const face of faces) {
    let best: (typeof faceEntries)[0] | null = null
    let bestDist = Infinity
    for (const e of faceEntries) {
      const d = euclideanDistance(face.descriptor, e.faceDescriptor!)
      if (d < bestDist) {
        bestDist = d
        best = e
      }
    }
    if (best && bestDist <= threshold) {
      results.push({ entry: best, distance: bestDist, face })
    }
  }
  return results
}
