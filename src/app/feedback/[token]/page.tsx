'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

type Estado = 'cargando' | 'formulario' | 'respondido' | 'expirado' | 'error'

const LABELS: Record<number, string> = {
  1: 'Muy mala',
  2: 'Mala',
  3: 'Regular',
  4: 'Buena',
  5: 'Excelente',
}

export default function FeedbackPage() {
  const { token } = useParams<{ token: string }>()
  const [estado, setEstado] = useState<Estado>('cargando')
  const [calificacion, setCalificacion] = useState(0)
  const [hover, setHover] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    fetch(`${BASE}/feedback/${token}`)
      .then(r => {
        if (r.status === 410) { setEstado('expirado'); return null }
        if (!r.ok) { setEstado('error'); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        if (data.ya_respondido) {
          if (data.calificacion) setCalificacion(data.calificacion)
          setEstado('respondido')
        } else {
          setEstado('formulario')
        }
      })
      .catch(() => setEstado('error'))
  }, [token])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (calificacion === 0) return
    setEnviando(true)
    try {
      const r = await fetch(`${BASE}/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calificacion, comentario: comentario || null }),
      })
      if (r.ok) setEstado('respondido')
    } finally {
      setEnviando(false)
    }
  }

  // --- Estados de pantalla completa ---
  if (estado === 'cargando') return (
    <Screen><p className="text-gray-400 text-sm">Cargando...</p></Screen>
  )

  if (estado === 'expirado') return (
    <Screen>
      <Card>
        <BigIcon>⏳</BigIcon>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Link expirado</h1>
        <p className="text-gray-500 text-sm">Este link de calificación ya no está disponible.</p>
      </Card>
    </Screen>
  )

  if (estado === 'error') return (
    <Screen>
      <Card>
        <BigIcon>❌</BigIcon>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h1>
        <p className="text-gray-500 text-sm">No encontramos este link de calificación.</p>
      </Card>
    </Screen>
  )

  if (estado === 'respondido') return (
    <Screen>
      <Card>
        <BigIcon>🎉</BigIcon>
        <h1 className="text-2xl font-black text-gray-800 mb-2">¡Gracias!</h1>
        {calificacion > 0 && (
          <p className="text-yellow-500 text-2xl mb-2">{'⭐'.repeat(calificacion)}</p>
        )}
        <p className="text-gray-500 text-sm">Tu opinión nos ayuda a mejorar el servicio.</p>
      </Card>
    </Screen>
  )

  // formulario
  return (
    <Screen>
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <p className="text-4xl mb-3">📦</p>
          <h1 className="text-xl font-black text-gray-800">¿Cómo fue tu entrega?</h1>
          <p className="text-gray-500 text-sm mt-1">Tu opinión nos ayuda a mejorar</p>
        </div>

        <form onSubmit={enviar} className="space-y-5">
          {/* Estrellas */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n} type="button"
                onClick={() => setCalificacion(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="text-4xl leading-none transition-transform active:scale-90 hover:scale-110"
                aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
              >
                {n <= (hover || calificacion) ? '⭐' : '☆'}
              </button>
            ))}
          </div>
          {calificacion > 0 && (
            <p className="text-center text-sm font-medium text-gray-500">
              {LABELS[calificacion]}
            </p>
          )}

          {/* Comentario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comentario <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="¿Algo que quieras decirnos?"
            />
          </div>

          <button
            type="submit"
            disabled={calificacion === 0 || enviando}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {enviando ? 'Enviando...' : 'Enviar calificación'}
          </button>
        </form>
      </div>
    </Screen>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
      {children}
    </div>
  )
}

function BigIcon({ children }: { children: React.ReactNode }) {
  return <p className="text-5xl mb-4">{children}</p>
}
