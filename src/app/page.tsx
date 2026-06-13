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
    <main className="min-h-screen bg-gradient-to-br from-brand to-blue-800 flex flex-col items-center justify-center px-4">
      <div className="text-center text-white mb-10">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-4xl font-black tracking-tight">Correo Postino</h1>
        <p className="text-blue-200 mt-2 text-lg">Logística simple y confiable</p>
      </div>

      {/* Tracking público */}
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Rastreá tu paquete</h2>
        <p className="text-sm text-gray-500 mb-4">Ingresá el código QR que figura en tu etiqueta</p>
        <form onSubmit={buscar} className="flex gap-2">
          <input
            value={qr}
            onChange={e => setQr(e.target.value)}
            placeholder="CP-XXXXXXXXXX"
            className="input flex-1 uppercase"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Rastrear
          </button>
        </form>
      </div>

      {/* Links portal */}
      <div className="flex gap-4 mt-8">
        <a href="/login?rol=tienda"
          className="bg-white/15 hover:bg-white/25 text-white px-5 py-3 rounded-xl font-semibold transition-colors text-sm">
          🏪 Soy una tienda
        </a>
        <a href="/login?rol=admin"
          className="bg-white/15 hover:bg-white/25 text-white px-5 py-3 rounded-xl font-semibold transition-colors text-sm">
          ⚙️ Panel Admin
        </a>
      </div>
    </main>
  )
}
