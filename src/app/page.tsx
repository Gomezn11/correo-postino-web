'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [qr, setQr] = useState('')

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    const codigo = qr.trim().toUpperCase()
    if (codigo) router.push(`/tracking/${codigo}`)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-animated flex flex-col items-center justify-center px-4 py-12">
      {/* Blobs decorativos */}
      <div className="blob bg-blue-400 w-72 h-72 top-[-40px] left-[-40px]" />
      <div className="blob bg-violet-500 w-80 h-80 bottom-[-60px] right-[-40px]" style={{ animationDelay: '3s' }} />
      <div className="blob bg-cyan-400 w-56 h-56 top-1/3 right-1/4" style={{ animationDelay: '6s' }} />

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
        {/* Hero */}
        <div className="text-center text-white mb-8">
          {/* Cubo 3D */}
          <div className="scene-3d flex justify-center mb-6">
            <div className="float-y">
              <div className="cube">
                <div className="face front">📦</div>
                <div className="face back">📦</div>
                <div className="face right">🚚</div>
                <div className="face left">🗺️</div>
                <div className="face top">⚡</div>
                <div className="face bottom">📍</div>
              </div>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight drop-shadow-lg">Correo Postino</h1>
          <p className="text-blue-100 mt-3 text-lg sm:text-xl max-w-xl mx-auto">
            Logística inteligente de punta a punta. Seguí tu envío en tiempo real.
          </p>
        </div>

        {/* Card de tracking (glassmorphism) */}
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 animate-in">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Rastreá tu paquete</h2>
          <p className="text-sm text-gray-500 mb-4">Ingresá el código que figura en tu etiqueta</p>
          <form onSubmit={buscar} className="flex gap-2">
            <input
              value={qr}
              onChange={e => setQr(e.target.value)}
              placeholder="CP-XXXXXXXXXX"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm uppercase
                focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <button type="submit"
              className="bg-brand text-white px-5 py-2.5 rounded-lg font-semibold text-sm
                hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap shadow-lg shadow-brand/30">
              Rastrear
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-8 w-full max-w-md text-center">
          {[
            { emoji: '⚡', t: 'En tiempo real' },
            { emoji: '🗺️', t: 'Ruta inteligente' },
            { emoji: '✍️', t: 'Entrega firmada' },
          ].map(f => (
            <div key={f.t} className="text-white/90">
              <div className="text-2xl">{f.emoji}</div>
              <div className="text-xs sm:text-sm font-medium mt-1">{f.t}</div>
            </div>
          ))}
        </div>

        {/* Accesos a portales */}
        <div className="flex gap-3 mt-10">
          <a href="/login?rol=tienda"
            className="bg-white/15 hover:bg-white/25 backdrop-blur text-white px-5 py-3 rounded-xl font-semibold transition-all active:scale-95 text-sm">
            🏪 Soy una tienda
          </a>
          <a href="/login?rol=admin"
            className="bg-white/15 hover:bg-white/25 backdrop-blur text-white px-5 py-3 rounded-xl font-semibold transition-all active:scale-95 text-sm">
            ⚙️ Panel Admin
          </a>
        </div>
      </div>
    </main>
  )
}
