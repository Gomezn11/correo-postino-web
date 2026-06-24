'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import EstadoBadge from '@/components/EstadoBadge'

interface Paquete {
  id: string; qr_interno: string; comprador_nombre: string
  comprador_direccion: string; zona: string; estado_actual: string; created_at: string
}
interface PaquetesRes { items: Paquete[]; total: number }

const ESTADOS_DASHBOARD = [
  { key: 'pendiente_retiro', label: 'Pendiente retiro', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { key: 'en_deposito',      label: 'En depósito',      color: 'text-blue-600',   bg: 'bg-blue-50' },
  { key: 'en_camino',        label: 'En camino',         color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'entregado',        label: 'Entregados',        color: 'text-green-600',  bg: 'bg-green-50' },
]

export default function TiendaDashboard() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<PaquetesRes>('/paquetes?limit=100')
      .then(r => setPaquetes(r.items ?? []))
      .finally(() => setLoading(false))
  }, [])

  const counts = ESTADOS_DASHBOARD.map(e => ({
    ...e,
    count: paquetes.filter(p => p.estado_actual === e.key).length,
  }))
  const recientes = [...paquetes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Dashboard</h1>

      {loading ? (
        <div className="text-gray-400">Cargando...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {counts.map(c => (
              <div key={c.key} className={`card ${c.bg}`}>
                <div className={`text-3xl font-black ${c.color}`}>{c.count}</div>
                <div className="text-sm text-gray-600 mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Recientes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 dark:text-gray-100">Paquetes recientes</h2>
              <a href="/tienda/paquetes" className="text-sm text-brand hover:underline">Ver todos →</a>
            </div>
            {recientes.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay paquetes aún.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2 font-medium px-4 sm:px-0">QR</th>
                      <th className="pb-2 font-medium">Destinatario</th>
                      <th className="pb-2 font-medium hidden sm:table-cell">Zona</th>
                      <th className="pb-2 font-medium pr-4 sm:pr-0">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {recientes.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2 font-mono text-xs text-gray-500 px-4 sm:px-0">{p.qr_interno}</td>
                        <td className="py-2">{p.comprador_nombre}</td>
                        <td className="py-2 text-gray-500 hidden sm:table-cell">{p.zona}</td>
                        <td className="py-2 pr-4 sm:pr-0"><EstadoBadge estado={p.estado_actual} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
