'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Grupo {
  id: string
  nombre: string
  promedio: number
  cantidad: number
  alerta?: boolean
}
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
  por_chofer: Grupo[]
  por_zona: Grupo[]
  por_tienda: Grupo[]
}

function colorPromedio(p: number) {
  if (p >= 4) return 'text-green-600'
  if (p >= 3.5) return 'text-yellow-500'
  return 'text-red-500'
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

          {/* Alerta de choferes por debajo del umbral */}
          {data.por_chofer.some(c => c.alerta) && (
            <div className="card border-2 border-red-200 bg-red-50">
              <h2 className="font-bold text-red-700 flex items-center gap-2">⚠️ Choferes que necesitan atención</h2>
              <p className="text-sm text-red-600 mt-1 mb-3">Promedio por debajo de 3.5 estrellas.</p>
              <div className="space-y-1">
                {data.por_chofer.filter(c => c.alerta).map(c => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-800">{c.nombre}</span>
                    <span className="font-bold text-red-600">{c.promedio.toFixed(1)} ⭐ ({c.cantidad})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Desglose por chofer / zona / tienda */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {([
              ['Por chofer', data.por_chofer],
              ['Por zona', data.por_zona],
              ['Por tienda', data.por_tienda],
            ] as [string, Grupo[]][]).map(([titulo, grupos]) => (
              <div key={titulo} className="card">
                <h2 className="font-bold mb-3">{titulo}</h2>
                {grupos.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin datos.</p>
                ) : (
                  <ul className="divide-y">
                    {grupos.map(g => (
                      <li key={g.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-700 truncate flex items-center gap-1">
                          {g.alerta && <span title="Bajo promedio">⚠️</span>}
                          {g.nombre}
                          <span className="text-gray-400">({g.cantidad})</span>
                        </span>
                        <span className={`font-bold ${colorPromedio(g.promedio)}`}>{g.promedio.toFixed(1)} ⭐</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
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
