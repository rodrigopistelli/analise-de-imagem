import { useRef, useState } from 'react'
import { Camera, Check, Copy, ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import CameraCapture from '../components/CameraCapture'
import { fileToDataUrl, resizeToDataUrl } from '../services/image'
import { recognizeProduct } from '../services/ai'
import { findFactoryProduct } from '../services/productSearch'
import type { FactoryProduct } from '../services/productSearch'
import { extractTextFromImage } from '../services/ocr'
import {
  extractPlateFromText,
  looksLikeVehicle,
  normalizePlate,
  readPlateFromImage,
} from '../services/plate'

interface ScanInfo {
  name: string
  color: string
  format: string
  caption: string
  expression: string | null
  provider: string
  status: string
  plate: string | null
  factory: FactoryProduct | null
}

function hexToName(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const d = mx - mn
  if (d < 25) return 'neutro (preto, branco ou cinza)'
  let hue = 0
  if (mx !== mn) {
    if (mx === r) hue = ((g - b) / d) % 6
    else if (mx === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue = Math.round((hue * 60 + 360) % 360)
  }
  const map: Record<string, string> = {
    '0': 'vermelho', '30': 'laranja', '60': 'amarelo', '90': 'amarelo/verde', '120': 'verde',
    '150': 'verde', '180': 'ciano', '210': 'azul', '240': 'azul', '270': 'roxo',
    '300': 'roxo/magenta', '330': 'rosa',
  }
  const label = map[Math.floor(hue / 30) * 30] || 'variada'
  return `${label} (cor média ${hex})`
}

function isValidOcrText(t: string): boolean {
  const tokens = t.split(/[^A-Za-zÀ-ÿ0-9]+/).filter((s) => s.trim().length > 0)
  if (tokens.length === 0) return false
  if (tokens.some((s) => s.length < 3)) return false
  return !/[=:;'"“”‘’…]/.test(t)
}

async function averageColor(dataUrl: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 8
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, 8, 8)
  const d = ctx.getImageData(0, 0, 8, 8).data
  let r = 0, g = 0, b = 0
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] }
  const n = d.length / 4
  return '#' + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')
}

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const i = new Image()
    i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight })
    i.src = dataUrl
  })
}

function sourceLabel(source: FactoryProduct['source']): string {
  switch (source) {
    case 'barcode':
      return 'Open Food Facts (código de barras)'
    case 'wikimedia':
      return 'Wikimedia Commons'
    case 'original':
      return 'foto original'
    default:
      return 'não encontrada'
  }
}

export default function CameraScan() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [stage, setStage] = useState('')
  const [info, setInfo] = useState<ScanInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const analyze = async (dataUrl: string) => {
    setAnalyzing(true)
    setInfo(null)
    setError(null)
    try {
      setStage('Analisando...')
      const rec = await recognizeProduct(dataUrl)

      setStage('Analisando imagem...')
      const ocrRes = await extractTextFromImage(dataUrl)

      const avg = await averageColor(dataUrl)
      const dims = await imageSize(dataUrl)
      const format = `${dims.w} x ${dims.h} px`

      setStage('Analisando imagem...')
      const context = `${rec.name} ${rec.caption} ${ocrRes}`
      const likelyVehicle = looksLikeVehicle(context)
      const ocrTokens = ocrRes.trim().split(/\s+/).filter(Boolean)
      const plateCandidate =
        normalizePlate(rec.plate) || (likelyVehicle ? extractPlateFromText(ocrRes) : null)
      const shouldRunPlateOcr =
        !plateCandidate && (likelyVehicle || ocrTokens.length === 0 || ocrTokens.length <= 2)

      const [fp, plate] = await Promise.all([
        findFactoryProduct(dataUrl, rec.name || rec.caption, ocrRes),
        plateCandidate
          ? Promise.resolve(plateCandidate)
          : shouldRunPlateOcr
            ? readPlateFromImage(dataUrl, ocrRes).then((r) => r.plate)
            : Promise.resolve(null),
      ])

      const hasImage = Boolean(fp.dataUrl || fp.imageUrl)
      const ocrClean = isValidOcrText(ocrRes) ? ocrRes : ''

      setInfo({
        name: rec.name?.trim() || ocrClean || fp.name,
        color: hexToName(avg),
        format,
        caption: rec.caption,
        expression: rec.expression?.trim() || null,
        provider: rec.provider,
        status: rec.status,
        plate,
        factory: hasImage ? fp : null,
      })
    } catch (e) {
      setError('Falha na análise: ' + (e as Error).message)
    } finally {
      setAnalyzing(false)
      setStage('')
    }
  }

  const loadImage = async (f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Arquivo inválido. Envie uma imagem (PNG, JPG, WEBP).')
      return
    }
    try {
      setError(null)
      setInfo(null)
      const du = await fileToDataUrl(f)
      const r = await resizeToDataUrl(du, 1024, 'image/png')
      setImage(r.dataUrl)
      await analyze(r.dataUrl)
    } catch (e) {
      setError('Falha ao carregar a imagem: ' + (e as Error).message)
    }
  }

  const onCapture = async (f: File) => {
    setShowCamera(false)
    await loadImage(f)
  }

  const clear = () => {
    setImage(null)
    setInfo(null)
    setError(null)
    setStage('')
    setCopied(false)
  }

  const copyPlate = async (plate: string) => {
    try {
      await navigator.clipboard.writeText(plate)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Não foi possível copiar a placa. Copie manualmente.')
    }
  }

  return (
    <div className="page">
      <h1>Captura e Análise do Produto</h1>
      <p className="subtitle">
        Carregue uma imagem ou abra a câmera. O app descreve o objeto e, se encontrar, mostra a embalagem
        original de fábrica.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void loadImage(f)
          e.target.value = ''
        }}
      />

      <div className="grid two">
        {/* Painel 1 — imagem */}
        <section className="panel">
          <h2>1. Imagem carregada</h2>
          <div className="camera-zone">
            {image ? (
              <img src={image} alt="produto" className="camera-frame" />
            ) : (
              <div className="upload-placeholder" style={{ height: '100%', justifyContent: 'center' }}>
                <ImagePlus size={40} />
                <p>Carregue uma imagem ou use a câmera</p>
                <small>PNG, JPG, WEBP</small>
              </div>
            )}
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => setShowCamera(true)} disabled={analyzing}>
              <Camera size={16} /> Abrir câmera
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()} disabled={analyzing}>
              <ImagePlus size={16} /> Carregar imagem
            </button>
            {image && (
              <button className="btn" onClick={() => void analyze(image)} disabled={analyzing}>
                <RefreshCw size={16} /> {analyzing ? 'Analisando…' : 'Reanalisar'}
              </button>
            )}
            <button className="btn" onClick={clear} disabled={analyzing || (!image && !info)}>
              <Trash2 size={16} /> Limpar
            </button>
          </div>

          {analyzing && (
            <div className="center">
              <span className="spin">⟳</span> {stage}
            </div>
          )}
          {error && (
            <div className="placeholder" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
        </section>

        {/* Painel 2 + 3 — descrição e embalagem */}
        <div className="stack">
          <section className="panel">
            <h2>2. Descrição da imagem</h2>
            {info ? (
              <div className="form">
                <label>Nome do objeto</label>
                <input value={info.name} readOnly />
                <label>Cor dominante</label>
                <input value={info.color} readOnly />
                <label>Formato / dimensões</label>
                <input value={info.format} readOnly />
                <label>Descrição</label>
                <textarea value={info.caption} readOnly rows={5} />
                {info.expression && (
                  <>
                    <label>Feição / Expressão</label>
                    <input value={info.expression} readOnly />
                  </>
                )}
                {info.provider === 'mock' && (
                  <p className="desc" style={{ color: 'var(--danger)' }}>
                    ⚠️ Reconhecimento por IA indisponível (modo local) [v3]. Verifique a conexão com a
                    internet e as chaves de IA no Vercel. O resultado acima é genérico.
                    {info.status && info.status !== 'fallback' && (
                      <><br />Detalhe: {info.status}</>
                    )}
                    {(!info.status || info.status === 'fallback') && (
                      <><br />Detalhe: nenhum erro registrado (verifique o console do navegador).</>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <div className="placeholder">
                {analyzing ? 'Analisando imagem…' : 'Nenhuma imagem analisada ainda.'}
              </div>
            )}
          </section>

          {info?.plate && (
            <section className="panel">
              <h2>3. Placa detectada</h2>
              <div className="form">
                <label>Placa</label>
                <input value={info.plate} readOnly className="plate-value" />

                <div className="row">
                  <button className="btn" onClick={() => void copyPlate(info.plate!)}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Placa copiada' : 'Copiar placa'}
                  </button>
                  <a
                    className="btn"
                    href="https://www.gov.br/pt-br/servicos/consultar-online-os-dados-de-placa-veicular"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consultar no Gov.br
                  </a>
                  <a
                    className="btn"
                    href="https://www.gov.br/pt-br/apps/sinesp-cidadao"
                    target="_blank"
                    rel="noreferrer"
                  >
                    SINESP Cidadão
                  </a>
                </div>
              </div>
            </section>
          )}

          {info?.factory && (
            <section className="panel">
              <h2>{info?.plate ? '4' : '3'}. Embalagem original de fábrica</h2>
              <div className="factory-box" style={{ marginTop: 0 }}>
                <img
                  src={info.factory.dataUrl || info.factory.imageUrl!}
                  alt="embalagem de fábrica"
                  className="result-img"
                />
                <p className="desc">
                  <strong>{info.factory.name}</strong>
                </p>
                {info.factory.description && <p className="desc">{info.factory.description}</p>}
                <small>Fonte: {sourceLabel(info.factory.source)}</small>
              </div>
            </section>
          )}
        </div>
      </div>

      {showCamera && (
        <CameraCapture onCapture={(f) => void onCapture(f)} onClose={() => setShowCamera(false)} />
      )}
    </div>
  )
}
