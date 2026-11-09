import { HF_TOKEN, hasHF } from '../lib/supabase'
import { loadImage, resizeToDataUrl } from './image'

export interface Recognition {
  caption: string
  name: string
  tags: string[]
  provider: string
  status: string
  plate?: string
  expression?: string
}

const MOCK_CAPTIONS = [
  'a product photo of a sleek electronic device on a white background',
  'a packaged consumer good with colorful branding',
  'a fashion accessory displayed for e-commerce',
]

export async function recognizeProduct(dataUrl: string): Promise<Recognition> {
  // Ordem 100% gratuita: Gemini (free tier) -> Hugging Face -> mock
  const errors: string[] = []

  const gemKey = (import.meta.env.VITE_GEMINI_KEY as string | undefined) || ''
  if (!gemKey) errors.push('gemini:sem-chave')
  if (gemKey) {
    const gemModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']
    const imgBase64 = dataUrl.split(',')[1] || ''
    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/png', data: imgBase64 } },
            {
              text: "Responda em português, exatamente neste formato:\nNOME: <nome curto do produto, máx. 8 palavras>\nDESCRIÇÃO: <descrição detalhada incluindo marca, tipo, cor e embalagem>\nPLACA: <placa de veículo visível na imagem, apenas letras e números, ou NÃO>\nEXPRESSÃO: <se houver um rosto humano visível, descreva a expressão facial (alegre, triste, neutra, surpresa, brava, etc.) e o sentimento aparente; caso contrário NÃO>",
            },
          ],
        },
      ],
    })
    for (const gm of gemModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${gm}:generateContent?key=${gemKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          },
        )
        if (res.ok) {
          const json = await res.json()
          const text =
            json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join(' ').trim() || ''
          if (text) {
            const parsed = parseGemini(text)
            return buildRecognition(parsed.caption, `gemini:${gm}`, 'ok', parsed.name, parsed.plate, parsed.expression)
          }
        }
        console.warn(`Gemini ${gm} failed`, res.status)
        errors.push(`gemini:${gm}:${res.status}`)
      } catch (e) {
        console.warn(`Gemini ${gm} error`, e)
        errors.push(`gemini:${gm}:erro-rede`)
      }
    }
  }

  const models = ['Salesforce/blip-image-captioning-base', 'nlpconnect/vit-gpt2-image-captioning']
  if (!hasHF) errors.push('hf:sem-token')
  if (hasHF) {
    let hfLast = ''
    for (const model of models) {
      for (let attempt = 0; attempt < 1; attempt++) {
        try {
          const blob = dataUrlToBlobLocal(dataUrl)
          const res = await fetch(
            `https://router.huggingface.co/hf-inference/models/${model}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${HF_TOKEN}` },
              body: blob,
            },
          )
          if (res.ok) {
            const json = await res.json()
            const caption = (Array.isArray(json) ? json[0]?.generated_text : json?.generated_text) || ''
            if (caption) return buildRecognition(caption, `huggingface:${model}`, 'ok')
          }
          console.warn(`HF ${model} attempt ${attempt} status ${res.status}`)
          hfLast = `${model}:${res.status}`
        } catch (e) {
          console.warn(`HF ${model} attempt ${attempt} error`, e)
          hfLast = `${model}:erro-rede`
        }
      }
    }
    if (hfLast) errors.push(`hf:${hfLast}`)
  }

  // mock fallback
  console.warn('recognizeProduct: todos os provedores falharam, usando mock. Erros:', errors)
  const caption = MOCK_CAPTIONS[Math.floor(Math.random() * MOCK_CAPTIONS.length)]
  return buildRecognition(caption, 'mock', errors.join(' | ') || 'fallback')
}

function buildRecognition(
  caption: string,
  provider = 'huggingface',
  status = 'ok',
  nameOverride?: string,
  plate?: string,
  expression?: string,
): Recognition {
  const clean = caption.replace(/[*#]+/g, ' ').replace(/\s+/g, ' ').trim()
  const words = clean.toLowerCase().split(/\W+/).filter(Boolean)
  const name =
    nameOverride?.trim() || clean.split(/[,.;:\n]/)[0].split(' ').slice(0, 8).join(' ')
  const tags = Array.from(new Set(words.filter((w) => w.length > 3))).slice(0, 8)
  return { caption: clean, name, tags, provider, status, plate, expression }
}

function parseGemini(text: string): { name?: string; caption: string; plate?: string; expression?: string } {
  const nameMatch = text.match(/NOME\s*:\s*(.+)/i)
  const descMatch = text.match(/DESCRI[ÇC][ÃA]O\s*:\s*([\s\S]+?)(?=\n\s*(PLACA|EXPRESS[ÃA]O)\s*:|$)/i)
  const plateMatch = text.match(/PLACA\s*:\s*([A-Za-z0-9-]+)/i)
  const exprMatch = text.match(/EXPRESS[ÃA]O\s*:\s*([^\n]+)/i)
  const name = nameMatch?.[1]?.replace(/[*#]+/g, ' ').replace(/\s+/g, ' ').trim()
  const caption = (descMatch?.[1] || text).replace(/[*#]+/g, ' ').replace(/\s+/g, ' ').trim()
  const plateRaw = plateMatch?.[1]?.trim()
  const plate =
    plateRaw && !/^(n[aã]o|none|nenhuma)$/i.test(plateRaw) ? plateRaw.toUpperCase() : undefined
  const exprRaw = exprMatch?.[1]?.trim()
  const expression =
    exprRaw && !/^(n[aã]o|none|nenhuma)$/i.test(exprRaw) ? exprRaw : undefined
  return { name, caption, plate, expression }
}

export async function generateDigitalIllustration(
  caption: string,
  opts: { width?: number; height?: number; originalDataUrl?: string } = {},
): Promise<{ dataUrl: string; width: number; height: number }> {
  const w = opts.width || 1024
  const h = opts.height || 1024
  const shortCaption = caption.slice(0, 120)
  const prompt = encodeURIComponent(
    `digital product illustration in Portuguese, clean white background, e-commerce showcase, high detail, ${shortCaption}, vector style, studio lighting`,
  )
  // 1) Tentar Hugging Face Inference (gratuito com token)
  if (hasHF) {
    try {
      const model = 'stabilityai/stable-diffusion-2-1'
      const res = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `digital product illustration, clean white background, e-commerce showcase, high detail, ${shortCaption}, vector style, studio lighting`,
          parameters: { width: Math.min(w, 512), height: Math.min(h, 512) },
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const dataUrl = await blobToDataUrl(blob)
        const resized = await resizeToDataUrl(dataUrl, 1024, 'image/png')
        return resized
      }
      const txt = await res.text().catch(() => '')
      console.warn('HF image gen failed', res.status, txt)
    } catch (e) {
      console.warn('HF image gen error', e)
    }
  }

  // 2) Tentar Pollinations (pode funcionar em cache)
  try {
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=${Math.min(w, 256)}&height=${Math.min(h, 256)}&nologo=true&seed=${Math.floor(Math.random() * 1e6)}`
    const res = await fetch(url, { mode: 'cors' })
    if (res.ok) {
      const blob = await res.blob()
      const dataUrl = await blobToDataUrl(blob)
      const resized = await resizeToDataUrl(dataUrl, 1024, 'image/png')
      return resized
    }
  } catch (e) {
    console.warn('Pollinations unavailable', e)
  }

  // 3) Fallback local: PNG leve padronizado
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  if (opts.originalDataUrl) {
    try {
      const img = await loadImage(opts.originalDataUrl)
      const scale = Math.min(w / img.width, h / img.height) * 0.85
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
    } catch (e) {
      console.warn('fallback draw failed', e)
    }
  }
  const dataUrl = canvas.toDataURL('image/png', 0.92)
  return { dataUrl, width: w, height: h }
}

function dataUrlToBlobLocal(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

// helper re-export
export { loadImage }