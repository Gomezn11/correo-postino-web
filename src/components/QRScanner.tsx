'use client'
import { useEffect, useRef, useState } from 'react'

interface QRScannerProps {
  onResult: (text: string) => void
  active?: boolean
}

export default function QRScanner({ onResult, active = true }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false

    async function startScanner() {
      setError(null)
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 300,
        })
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current!,
          (result) => {
            if (cancelled) return
            if (result) onResult(result.getText())
          }
        )
        controlsRef.current = controls
      } catch {
        if (!cancelled) setError('No se pudo acceder a la cámara.')
      }
    }

    startScanner()
    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [active, onResult, intento])

  return (
    <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 border-4 border-brand rounded-2xl opacity-70" />
      </div>
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white text-center p-5 gap-3">
          <p className="text-sm font-semibold">{error}</p>
          <button
            onClick={() => setIntento(n => n + 1)}
            className="bg-brand text-white font-bold px-6 py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            📷 Permitir cámara
          </button>
          <p className="text-xs text-gray-300 leading-snug max-w-[260px]">
            Si lo bloqueaste antes, tocá el 🔒 candado en la barra del navegador → Permisos → Cámara → Permitir, y volvé a tocar el botón.
          </p>
        </div>
      )}
    </div>
  )
}
