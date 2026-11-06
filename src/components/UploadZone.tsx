import { useRef, useState } from 'react'
import { Upload, Camera, X, RefreshCw } from 'lucide-react'
import CameraCapture from './CameraCapture'

interface Props {
  onFile: (file: File) => void
  onClear?: () => void
  preview?: string | null
}

export default function UploadZone({ onFile, onClear, preview }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [showCamera, setShowCamera] = useState(false)

  const handle = (f: File | undefined) => {
    if (f && f.type.startsWith('image/')) onFile(f)
  }

  return (
    <>
      <div
        className="upload-zone"
        onClick={() => !preview && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handle(e.dataTransfer.files?.[0])
        }}
      >
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handle(e.target.files?.[0])} />

        {preview ? (
          <>
            <img src={preview} alt="preview" className="preview-img" />
            <div className="upload-actions">
              <button className="btn small" onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}>
                <RefreshCw size={14} /> Trocar
              </button>
              <button className="btn small" onClick={(e) => { e.stopPropagation(); setShowCamera(true) }}>
                <Camera size={14} /> Câmera
              </button>
              {onClear && (
                <button className="btn small danger" onClick={(e) => { e.stopPropagation(); onClear() }}>
                  <X size={14} /> Remover
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="upload-placeholder">
            <Upload size={40} />
            <p>Clique, arraste ou use a câmera</p>
            <small>PNG, JPG, WEBP</small>
            <div className="upload-actions" style={{ marginTop: 12 }}>
              <button className="btn small" onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}>
                <Upload size={14} /> Arquivo
              </button>
              <button className="btn small" onClick={(e) => { e.stopPropagation(); setShowCamera(true) }}>
                <Camera size={14} /> Câmera
              </button>
            </div>
          </div>
        )}
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={(f) => { handle(f); setShowCamera(false) }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  )
}