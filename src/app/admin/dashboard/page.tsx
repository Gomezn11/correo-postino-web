'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { LABELS } from '@/components/EstadoBadge'

interface Stats {
  total_paquetes: number
  por_estado: Record<string, number>
  repartos_activos: number
}

interface Reparto {
  id: string; chofer_id: string; estado: string; created_at: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [repartos, setRepartos] = useState<Reparto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<Stats>('/admin/stats'),
      api.get<{ items: Reparto[] }>('/repartos?limit=5'),
    ]).then(([s, r]) => {
      setStats(s)
      setRepartos(r.items ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const COLORES: Record<string, string> = {
    pendiente_retiro: 'bg-yellow-400', en_deposito: 'bg-blue-400',
    en_camino: 'bg-indigo-400', entregado: 'bg-green-400',
    no_entregado_ausente: 'bg-red-400', no_entregado_domicilio_no_encontrado: 'bg-red-400',
    no_cerrado: 'bg-gray-400',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Panel Admin</h1>
      {loading ? <div className="text-gray-400">Cargando...</div> : (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-3xl font-black text-brand">{stats?.total_paquetes}</div>
              <div className="text-sm text-gray-500 mt-1">Total paquetes</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-black text-green-600">{stats?.por_estado['entregado'] ?? 0}</div>
              <div className="text-sm text-gray-500 mt-1">Entregados</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-black text-indigo-600">{stats?.por_estado['en_camino'] ?? 0}</div>
              <div className="text-sm text-gray-500 mt-1">En camino</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-black text-orange-600">{stats?.repartos_activos ?? 0}</div>
              <div className="text-sm text-gray-500 mt-1">Repartos activos</div>
            </div>
          </div>

          {/* Distribución por estado */}
          {stats && (
            <div className="card">
              <h2 className="font-bold mb-4">Distribución por estado</h2>
              <div className="space-y-2">
                {Object.entries(stats.por_estado).map(([estado, count]) => (
                  <div key={estado} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${COLORES[estado] ?? 'bg-gray-400'}`} />
                    <div className="text-sm text-gray-700 flex-1">{LABELS[estado] ?? estado}</div>
                    <div className="font-bold text-sm">{count}</div>
                    <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${COLORES[estado] ?? 'bg-gray-400'}`}
                        style={{ width: `${(count / (stats.total_paquetes || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Gestionar paquetes', href: '/admin/paquetes', emoji: '📦' },
              { label: 'Ver choferes',       href: '/admin/choferes', emoji: '🚚' },
              { label: 'Ver repartos',       href: '/admin/repartos', emoji: '🗺️' },
              { label: 'Tracking público',   href: '/', emoji: '🔍' },
            ].map(l => (
              <a key={l.href} href={l.href} className="card hover:shadow-md transition-shadow text-center">
                <div className="text-3xl mb-2">{l.emoji}</div>
                <div className="text-sm font-semibold text-gray-700">{l.label}</div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
