import { useEffect, useRef, useState } from 'react'
import { X, Camera as CamIcon } from 'lucide-react'

interface Props {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setReady(true)
        }
      } catch (e) {
        setError('Não foi possível acessar a câmera: ' + (e as Error).message)
      }
    }
    start()
    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(file)
      onClose()
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="camera-modal">
      <div className="camera-box">
        <button className="btn small danger camera-close" onClick={onClose}>
          <X size={16} />
        </button>
        {error ? (
          <div className="placeholder">{error}</div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="camera-video" />
            <button className="btn primary camera-shutter" onClick={capture} disabled={!ready}>
              <CamIcon size={20} /> Capturar
            </button>
          </>
        )}
      </div>
    </div>
  )
}