'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Dashboard {
  total: number
  promedio: number | null
  distribucion: Record<string, number>
  recientes: {
    calificacion: number
    comentario: string | null
    zona: string | null
    respondido_at: string
  }[]
}

export default function AdminFeedbackPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Dashboard>('/admin/feedback/dashboard')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  function estrellasRender(n: number) {
    return (
      <span>
        {'⭐'.repeat(n)}
        <span className="opacity-20">{'☆'.repeat(5 - n)}</span>
      </span>
    )
  }

  function fecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Feedback post-entrega</h1>

      {loading && (
        <div className="card p-8 text-center text-gray-400">Cargando...</div>
      )}

      {!loading && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-black text-blue-600">{data.total}</p>
              <p className="text-xs text-gray-500 mt-1">Calificaciones recibidas</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-black text-yellow-500">
                {data.promedio !== null ? data.promedio.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Promedio de estrellas</p>
            </div>
            <div className="card text-center col-span-2 md:col-span-1">
              <p className="text-3xl font-black text-green-600">
                {data.total > 0
                  ? Math.round(
                      (((data.distribucion['4'] ?? 0) + (data.distribucion['5'] ?? 0)) /
                        data.total) *
                        100
                    )
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-500 mt-1">Satisfacción (4-5 estrellas)</p>
            </div>
          </div>

          {/* Distribución */}
          <div className="card">
            <h2 className="font-bold mb-4">Distribución de calificaciones</h2>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(n => {
                const count = data.distribucion[String(n)] ?? 0
                const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0
                return (
                  <div key={n} className="flex items-center gap-3 text-sm">
                    <span className="w-4 text-right text-gray-500 font-medium">{n}</span>
                    <span className="text-base leading-none">⭐</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-gray-500">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Comentarios recientes */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-bold">Comentarios recientes</h2>
            </div>
            {data.recientes.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Sin calificaciones todavía.
              </div>
            ) : (
              <div className="divide-y">
                {data.recientes.map((r, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base leading-none">{estrellasRender(r.calificacion)}</span>
                      <span className="text-xs text-gray-400">{fecha(r.respondido_at)}</span>
                    </div>
                    {r.comentario && (
                      <p className="text-sm text-gray-700 mt-1">{r.comentario}</p>
                    )}
                    {r.zona && (
                      <p className="text-xs text-gray-400 mt-0.5">Zona: {r.zona}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
