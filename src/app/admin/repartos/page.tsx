'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Reparto {
  id: string; chofer_id: string; estado: string
  fecha_inicio: string | null; fecha_fin: string | null; created_at: string
}
interface RepartosRes { items: Reparto[]; total: number }

const ESTADO_ESTILOS: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-800',
  iniciado:   'bg-indigo-100 text-indigo-800',
  finalizado: 'bg-green-100 text-green-800',
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminRepartosPage() {
  const [repartos, setRepartos] = useState<Reparto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => {
    api.get<RepartosRes>(`/repartos?limit=100${filtroEstado ? `&estado=${filtroEstado}` : ''}`)
      .then(r => setRepartos(r.items ?? []))
      .finally(() => setLoading(false))
  }, [filtroEstado])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">Repartos</h1>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input w-auto">
          <option value="">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="iniciado">En curso</option>
          <option value="finalizado">Finalizados</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : repartos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay repartos.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Inicio</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Fin</th>
                <th className="px-4 py-3 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {repartos.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_ESTILOS[r.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">{formatFecha(r.fecha_inicio)}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">{formatFecha(r.fecha_fin)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatFecha(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
