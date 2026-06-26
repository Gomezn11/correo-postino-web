'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Reparto {
  id: string; chofer_id: string; estado: string
  fecha: string | null; iniciado_at: string | null; finalizado_at: string | null
}
interface Chofer { id: string; nombre: string }

const ESTADO_ESTILOS: Record<string, string> = {
  armando:    'bg-yellow-100 text-yellow-800',
  en_curso:   'bg-indigo-100 text-indigo-800',
  finalizado: 'bg-green-100 text-green-800',
}
const ESTADO_LABEL: Record<string, string> = {
  armando: 'Armando', en_curso: 'En curso', finalizado: 'Finalizado',
}

function formatHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminRepartosPage() {
  const [repartos, setRepartos] = useState<Reparto[]>([])
  const [choferes, setChoferes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => {
    api.get<{ choferes: Chofer[] }>('/admin/tarifarios/entidades')
      .then(r => setChoferes(Object.fromEntries((r.choferes ?? []).map(c => [c.id, c.nombre]))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    // El endpoint devuelve un array de repartos (no { items })
    api.get<Reparto[]>(`/repartos${filtroEstado ? `?estado=${filtroEstado}` : ''}`)
      .then(r => setRepartos(Array.isArray(r) ? r : []))
      .finally(() => setLoading(false))
  }, [filtroEstado])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">Repartos</h1>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input w-auto">
          <option value="">Todos</option>
          <option value="armando">Armando</option>
          <option value="en_curso">En curso</option>
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
                <th className="px-4 py-3 font-medium">Chofer</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Inicio</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Fin</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {repartos.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-medium">{choferes[r.chofer_id] ?? 'Chofer'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_ESTILOS[r.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ESTADO_LABEL[r.estado] ?? r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell text-xs">{formatHora(r.iniciado_at)}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">{formatHora(r.finalizado_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 hidden lg:table-cell">{r.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
