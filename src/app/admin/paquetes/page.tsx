'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import EstadoBadge, { TODOS_ESTADOS, LABELS } from '@/components/EstadoBadge'

interface Paquete {
  id: string; qr_interno: string; comprador_nombre: string; comprador_direccion: string
  zona: string; tipo_paquete: string; estado_actual: string; chofer_id: string | null
  etiqueta_impresa: boolean; created_at: string
}
interface Chofer { id: string; nombre: string; email: string }
interface HistItem { estado: string; motivo: string | null; created_at: string; chofer_id: string | null; chofer_nombre: string | null }
interface Auditoria {
  paquete: Paquete & { comprador_telefono?: string }
  historial: HistItem[]
  foto_despacho: { foto_url: string; created_at: string } | null
  chofer_actual: { nombre: string; telefono?: string } | null
}

export default function AdminPaquetesPage() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroChofer, setFiltroChofer] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [cambiando, setCambiando] = useState<string | null>(null)
  const [asignando, setAsignando] = useState<string | null>(null)
  // Trazabilidad
  const [auditAbierto, setAuditAbierto] = useState(false)
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)

  const cargar = useCallback(() => {
    let url = '/paquetes?limit=300'
    if (filtroEstado) url += `&estado=${filtroEstado}`
    if (filtroChofer) url += `&chofer_id=${filtroChofer}`
    if (fechaDesde) url += `&fecha_desde=${fechaDesde}T00:00:00`
    if (fechaHasta) url += `&fecha_hasta=${fechaHasta}T23:59:59`
    return api.get<{ items: Paquete[] }>(url).then(r => setPaquetes(r.items ?? []))
  }, [filtroEstado, filtroChofer, fechaDesde, fechaHasta])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      cargar(),
      api.get<Chofer[]>('/admin/usuarios?role=chofer').then(setChoferes).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [cargar])

  const filtrados = paquetes.filter(p =>
    !busqueda || [p.comprador_nombre, p.qr_interno, p.comprador_direccion, p.zona]
      .some(v => v.toLowerCase().includes(busqueda.toLowerCase()))
  )

  async function cambiarEstado(id: string, estado: string) {
    setCambiando(id)
    try {
      await api.post(`/paquetes/${id}/estado`, { estado })
      await cargar()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setCambiando(null) }
  }

  async function asignarChofer(id: string, chofer_id: string) {
    setAsignando(id)
    try {
      await api.post(`/paquetes/${id}/asignar-chofer`, { chofer_id })
      await cargar()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setAsignando(null) }
  }

  async function eliminar(id: string, qr: string) {
    if (!confirm(`¿Eliminar paquete ${qr}?`)) return
    await api.delete(`/paquetes/${id}`)
    setPaquetes(prev => prev.filter(p => p.id !== id))
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }

  function formatFechaHora(iso: string) {
    return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  async function abrirAuditoria(id: string) {
    setAuditAbierto(true); setAuditLoading(true); setAuditoria(null)
    try {
      setAuditoria(await api.get<Auditoria>(`/paquetes/${id}/auditoria`))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al cargar la trazabilidad')
      setAuditAbierto(false)
    } finally { setAuditLoading(false) }
  }

  function limpiarFiltros() {
    setBusqueda(''); setFiltroEstado(''); setFiltroChofer(''); setFechaDesde(''); setFechaHasta('')
  }
  const hayFiltros = !!(busqueda || filtroEstado || filtroChofer || fechaDesde || fechaHasta)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Paquetes</h1>
        <span className="text-sm text-gray-500">{filtrados.length} resultados</span>
      </div>

      {/* Filtros */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="label">Buscar</label>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Nombre, QR, dirección..." className="input" />
        </div>
        <div>
          <label className="label">Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input w-auto">
            <option value="">Todos</option>
            {TODOS_ESTADOS.map(e => <option key={e} value={e}>{LABELS[e]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Chofer</label>
          <select value={filtroChofer} onChange={e => setFiltroChofer(e.target.value)} className="input w-auto">
            <option value="">Todos</option>
            {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Desde</label>
          <input type="date" value={fechaDesde} max={fechaHasta || undefined}
            onChange={e => setFechaDesde(e.target.value)} className="input w-auto" />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" value={fechaHasta} min={fechaDesde || undefined}
            onChange={e => setFechaHasta(e.target.value)} className="input w-auto" />
        </div>
        {hayFiltros && (
          <button onClick={limpiarFiltros}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40">
            Limpiar
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay paquetes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800">
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-3 font-medium">QR</th>
                  <th className="px-3 py-3 font-medium">Destinatario</th>
                  <th className="px-3 py-3 font-medium hidden lg:table-cell">Zona</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium hidden md:table-cell">Chofer</th>
                  <th className="px-3 py-3 font-medium hidden md:table-cell">Fecha</th>
                  <th className="px-3 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{p.qr_interno}</td>
                    <td className="px-3 py-2 font-medium max-w-[150px] truncate">{p.comprador_nombre}</td>
                    <td className="px-3 py-2 text-gray-500 hidden lg:table-cell">{p.zona}</td>
                    <td className="px-3 py-2">
                      <select value={p.estado_actual}
                        onChange={e => cambiarEstado(p.id, e.target.value)}
                        disabled={cambiando === p.id}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white">
                        {TODOS_ESTADOS.map(e => <option key={e} value={e}>{LABELS[e]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <select value={p.chofer_id ?? ''}
                        onChange={e => asignarChofer(p.id, e.target.value)}
                        disabled={asignando === p.id}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white">
                        <option value="">Sin chofer</option>
                        {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs hidden md:table-cell">{formatFecha(p.created_at)}</td>
                    <td className="px-3 py-2 flex gap-1 items-center">
                      <button onClick={() => abrirAuditoria(p.id)}
                        className="text-xs text-brand hover:underline font-medium">🔎 Trazar</button>
                      <span className="text-gray-300">|</span>
                      <a href={`/tracking/${p.qr_interno}`} target="_blank"
                        className="text-xs text-brand hover:underline">Track</a>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => eliminar(p.id, p.qr_interno)}
                        className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de trazabilidad */}
      {auditAbierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setAuditAbierto(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg my-8"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
              <h2 className="font-black text-lg">Trazabilidad del paquete</h2>
              <button onClick={() => setAuditAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {auditLoading ? (
              <div className="p-10 text-center text-gray-400">Cargando...</div>
            ) : auditoria && (
              <div className="p-5 space-y-5">
                {/* Datos */}
                <div className="space-y-1">
                  <div className="font-bold text-lg">{auditoria.paquete.comprador_nombre}</div>
                  <div className="text-sm text-gray-500">{auditoria.paquete.comprador_direccion}</div>
                  <div className="flex flex-wrap gap-2 text-xs pt-1">
                    <span className="font-mono text-gray-500">{auditoria.paquete.qr_interno}</span>
                    <span className="bg-brand/10 text-brand font-bold px-2 py-0.5 rounded-full">{auditoria.paquete.zona}</span>
                    {auditoria.paquete.comprador_telefono && (
                      <span className="text-gray-500">📞 {auditoria.paquete.comprador_telefono}</span>
                    )}
                  </div>
                  {auditoria.chofer_actual && (
                    <div className="text-sm text-gray-600 dark:text-gray-300 pt-1">
                      Último responsable: <strong>{auditoria.chofer_actual.nombre}</strong>
                      {auditoria.chofer_actual.telefono && <span className="text-gray-400"> · {auditoria.chofer_actual.telefono}</span>}
                    </div>
                  )}
                </div>

                {/* Foto de despacho */}
                {auditoria.foto_despacho ? (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Foto del despacho</div>
                    <a href={auditoria.foto_despacho.foto_url} target="_blank" rel="noreferrer">
                      <img src={auditoria.foto_despacho.foto_url} alt="Foto de despacho"
                        className="rounded-xl max-h-64 w-full object-cover border dark:border-gray-800" />
                    </a>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-lg p-3">
                    Todavía no hay foto de despacho para este paquete.
                  </div>
                )}

                {/* Historial */}
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Historial de movimientos</div>
                  <div className="relative">
                    <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-4">
                      {auditoria.historial.map((h, i) => (
                        <div key={i} className="flex gap-3 relative">
                          <div className={`w-4 h-4 rounded-full flex-shrink-0 z-10 mt-0.5 border-2 border-white dark:border-gray-900 ${
                            i === auditoria.historial.length - 1 ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'}`} />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{LABELS[h.estado] ?? h.estado}</div>
                            <div className="text-xs text-gray-400">{formatFechaHora(h.created_at)}</div>
                            {h.chofer_nombre && (
                              <div className="text-xs text-gray-600 dark:text-gray-300">Chofer: <strong>{h.chofer_nombre}</strong></div>
                            )}
                            {h.motivo && <div className="text-xs text-gray-500 mt-0.5">{h.motivo}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
