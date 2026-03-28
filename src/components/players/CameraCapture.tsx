'use client'

import { useRef, useState } from 'react'

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void
  preview?: string | null
}

export function CameraCapture({ onCapture, preview }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [streaming, setStreaming] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  const startCamera = async () => {
    setCameraError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // On mobile (iOS/Android PWA), autoPlay alone is not enough — must call play() explicitly
        try {
          await videoRef.current.play()
        } catch {
          // play() rejection is non-fatal, video may still render
        }
        setStreaming(true)
      } else {
        // videoRef not ready yet — stop tracks to avoid leak
        stream.getTracks().forEach(t => t.stop())
        setCameraError(true)
      }
    } catch {
      setCameraError(true)
    }
  }

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setStreaming(false)
  }

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const size = Math.min(video.videoWidth, video.videoHeight)
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const offsetX = (video.videoWidth - size) / 2
    const offsetY = (video.videoHeight - size) / 2
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size)

    canvas.toBlob(blob => {
      if (blob) onCapture(blob)
      stopCamera()
    }, 'image/jpeg', 0.85)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onCapture(file)
  }

  return (
    <div className="space-y-2">
      {/* Preview de la foto */}
      {preview && !streaming && (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Foto del jugador"
            className="w-24 h-24 rounded-full object-cover border-2 border-green-500"
          />
        </div>
      )}

      {/* Visor de cámara */}
      {streaming && (
        <div className="space-y-2">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl aspect-square object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capture}
              className="flex-1 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold"
            >
              Sacar foto
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Botones de acción (cuando no está la cámara activa) */}
      {!streaming && (
        <div className="flex gap-2">
          {!cameraError && (
            <button
              type="button"
              onClick={startCamera}
              className="flex-1 py-2 border-2 border-dashed border-gray-300 hover:border-green-500 rounded-xl text-sm text-gray-500 hover:text-green-700 transition-colors"
            >
              {preview ? '📷 Cambiar foto' : '📷 Tomar foto'}
            </button>
          )}
          <label className={`${cameraError ? 'flex-1' : ''} cursor-pointer`}>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            <span className="block py-2 px-3 border-2 border-dashed border-gray-300 hover:border-green-500 rounded-xl text-sm text-gray-500 hover:text-green-700 transition-colors text-center">
              {cameraError ? '📁 Elegir imagen' : '📁'}
            </span>
          </label>
        </div>
      )}

      {cameraError && (
        <p className="text-xs text-orange-500">Cámara no disponible, usá el botón de archivo.</p>
      )}
    </div>
  )
}
