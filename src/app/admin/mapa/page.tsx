'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import type { ChoferMapa } from '@/components/MapaChoferes'

const MapaChoferes = dynamic(() => import('@/components/MapaChoferes'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-gray-400">Cargando mapa...</div>,
})

export default function AdminMapaPage() {
  const [choferes, setChoferes] = useState<ChoferMapa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(() => {
    api.get<ChoferMapa[]>('/gps/choferes-activos')
      .then(setChoferes)
      .catch(e => setError(e instanceof Error ? e.message : 'Error cargando choferes'))
      .finally(() => setLoading(false))
  }, [])

  // Polling cada 20s para mover los puntos en vivo
  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 20_000)
    return () => clearInterval(id)
  }, [cargar])

  const sinUbicacion = choferes.filter(c => c.lat == null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Mapa en tiempo real</h1>
        <p className="text-sm text-gray-500 mt-1">Choferes con reparto en curso. Se actualiza solo cada 20 segundos.</p>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {loading ? (
        <div className="card text-center text-gray-400 py-10">Cargando...</div>
      ) : choferes.length === 0 ? (
        <div className="card text-center py-12 space-y-2">
          <div className="text-4xl">🗺️</div>
          <p className="font-semibold text-gray-700 dark:text-gray-200">No hay repartos en curso ahora</p>
          <p className="text-sm text-gray-400">Cuando un chofer inicie su reparto, vas a verlo moverse acá.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Mapa */}
          <div className="lg:col-span-2 card p-0 overflow-hidden h-[500px]">
            <MapaChoferes choferes={choferes} />
          </div>

          {/* Panel lateral */}
          <div className="space-y-3">
            {choferes.map(c => {
              const pct = c.total > 0 ? Math.round((c.entregados / c.total) * 100) : 0
              return (
                <div key={c.chofer_id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="font-bold">{c.nombre}</div>
                    {c.lat == null && (
                      <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">Sin señal GPS</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {c.entregados} de {c.total} entregados · {c.pendientes} en camino
                  </div>
                  <div className="mt-2 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {c.actualizado_at && (
                    <div className="mt-2 text-xs text-gray-400">
                      Última señal: {new Date(c.actualizado_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )
            })}
            {sinUbicacion.length > 0 && (
              <p className="text-xs text-gray-400 px-1">
                {sinUbicacion.length} chofer(es) sin señal GPS todavía no aparecen en el mapa.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
