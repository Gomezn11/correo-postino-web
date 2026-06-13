'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import EstadoBadge, { TODOS_ESTADOS, LABELS } from '@/components/EstadoBadge'

interface Paquete {
  id: string; qr_interno: string; comprador_nombre: string; comprador_direccion: string
  zona: string; tipo_paquete: string; estado_actual: string; created_at: string
}

export default function TiendaPaquetesPage() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    let url = '/paquetes?limit=200'
    if (filtroEstado) url += `&estado=${filtroEstado}`
    api.get<{ items: Paquete[] }>(url)
      .then(r => setPaquetes(r.items ?? []))
      .finally(() => setLoading(false))
  }, [filtroEstado])

  const filtrados = paquetes.filter(p =>
    !busqueda || p.comprador_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.qr_interno.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.comprador_direccion.toLowerCase().includes(busqueda.toLowerCase())
  )

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR')
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">Mis Paquetes</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, QR o dirección..." className="input max-w-xs" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input w-auto">
          <option value="">Todos los estados</option>
          {TODOS_ESTADOS.map(e => <option key={e} value={e}>{LABELS[e]}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay paquetes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">QR</th>
                  <th className="px-4 py-3 font-medium">Destinatario</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Dirección</th>
                  <th className="px-4 py-3 font-medium">Zona</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.qr_interno}</td>
                    <td className="px-4 py-3 font-medium">{p.comprador_nombre}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs max-w-[180px] truncate">{p.comprador_direccion}</td>
                    <td className="px-4 py-3 text-gray-500">{p.zona}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={p.estado_actual} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{formatFecha(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <a href={`/tracking/${p.qr_interno}`} target="_blank"
                        className="text-brand hover:underline text-xs">Ver →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 text-xs text-gray-400 border-t">{filtrados.length} paquetes</div>
          </div>
        )}
      </div>
    </div>
  )
}
