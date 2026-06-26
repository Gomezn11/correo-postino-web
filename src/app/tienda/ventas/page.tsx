'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import QRScanner from '@/components/QRScanner'

type Plataforma = 'ml' | 'tn'
type Filtro = 'todas' | Plataforma

interface VentaPendiente {
  id: string
  plataforma: Plataforma
  ml_shipment_id: string | null
  tn_order_id: string | null
  comprador_nombre: string
  comprador_direccion: string
  zona: string
  descripcion_productos: string | null
  created_at: string
}

type FeedbackTipo = 'ok' | 'dup' | 'error'

const PL_LABEL: Record<Plataforma, string> = { ml: 'Mercado Libre', tn: 'Tienda Nube' }
const PL_BADGE: Record<Plataforma, string> = {
  ml: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  tn: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
}
const PL_ICON: Record<Plataforma, string> = { ml: '🛒', tn: '☁️' }

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function extraerShipmentId(qr: string): string | null {
  const t = qr.trim()
  try {
    const obj = JSON.parse(t)
    const cand = obj.id ?? obj.shipment_id ?? obj.shipmentId
    if (cand != null) return String(cand)
  } catch { /* no era JSON */ }
  const m = t.match(/(?:"?(?:shipment_?id|id)"?\s*[:=]\s*"?)(\d{6,})/i)
  if (m) return m[1]
  if (/^\d{6,}$/.test(t)) return t
  const d = t.match(/\d{8,}/)
  if (d) return d[0]
  return null
}

function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = ok ? 880 : 320
    osc.connect(gain); gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    osc.start(); osc.stop(ctx.currentTime + 0.12)
    osc.onended = () => ctx.close()
  } catch { /* sin audio */ }
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<VentaPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [importandoLote, setImportandoLote] = useState(false)

  // Modo escaneo QR (solo ML)
  const [escaneando, setEscaneando] = useState(false)
  const [escaneadas, setEscaneadas] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<{ tipo: FeedbackTipo; texto: string } | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const ultimoQR = useRef<{ texto: string; ts: number }>({ texto: '', ts: 0 })

  const cargar = useCallback(() => {
    setLoading(true)
    api.get<VentaPendiente[]>('/integraciones/pendientes')
      .then(data => { setVentas(data); setSeleccionadas(new Set()) })
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const ventasFiltradas = filtro === 'todas' ? ventas : ventas.filter(v => v.plataforma === filtro)
  const countML = ventas.filter(v => v.plataforma === 'ml').length
  const countTN = ventas.filter(v => v.plataforma === 'tn').length
  const hayML = countML > 0

  // ── Acciones individuales ──────────────────────────────────────────────────

  async function importar(venta: VentaPendiente) {
    setProcesando(venta.id)
    setError('')
    try {
      await api.post(`/integraciones/${venta.plataforma}/pendientes/${venta.id}/importar`, {})
      setVentas(prev => prev.filter(v => v.id !== venta.id))
      setSeleccionadas(prev => { const s = new Set(prev); s.delete(venta.id); return s })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al importar')
    } finally {
      setProcesando(null)
    }
  }

  async function descartar(venta: VentaPendiente) {
    if (!confirm(`¿Descartar la venta de ${venta.comprador_nombre}? No se va a distribuir.`)) return
    setProcesando(venta.id)
    setError('')
    try {
      await api.post(`/integraciones/${venta.plataforma}/pendientes/${venta.id}/descartar`, {})
      setVentas(prev => prev.filter(v => v.id !== venta.id))
      setSeleccionadas(prev => { const s = new Set(prev); s.delete(venta.id); return s })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al descartar')
    } finally {
      setProcesando(null)
    }
  }

  // ── Selección múltiple ────────────────────────────────────────────────────

  function toggleSeleccion(id: string) {
    setSeleccionadas(prev => {
      const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
    })
  }

  function seleccionarTodoFiltro() {
    const idsVisibles = ventasFiltradas.map(v => v.id)
    const todosSeleccionados = idsVisibles.every(id => seleccionadas.has(id))
    setSeleccionadas(prev => {
      const s = new Set(prev)
      if (todosSeleccionados) { idsVisibles.forEach(id => s.delete(id)) }
      else { idsVisibles.forEach(id => s.add(id)) }
      return s
    })
  }

  async function importarSeleccionadas() {
    const ids = [...seleccionadas]
    if (ids.length === 0) return
    setImportandoLote(true)
    setError('')
    try {
      const mlIds = ids.filter(id => ventas.find(v => v.id === id)?.plataforma === 'ml')
      const tnIds = ids.filter(id => ventas.find(v => v.id === id)?.plataforma === 'tn')
      const tasks: Promise<{ importados: number; omitidos: number }>[] = []
      if (mlIds.length) tasks.push(api.post('/integraciones/ml/pendientes/importar-lote', { ids: mlIds }))
      if (tnIds.length) tasks.push(api.post('/integraciones/tn/pendientes/importar-lote', { ids: tnIds }))
      const resultados = await Promise.all(tasks)
      const total = resultados.reduce((acc, r) => acc + r.importados, 0)
      const omitidos = resultados.reduce((acc, r) => acc + r.omitidos, 0)
      setVentas(prev => prev.filter(v => !seleccionadas.has(v.id)))
      setSeleccionadas(new Set())
      alert(`✓ ${total} paquete(s) agregado(s) a la operación` + (omitidos ? `\n(${omitidos} omitido(s))` : ''))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al importar')
    } finally {
      setImportandoLote(false)
    }
  }

  // ── Escaneo QR (solo ML) ──────────────────────────────────────────────────

  const onScan = useCallback((texto: string) => {
    const ahora = Date.now()
    if (texto === ultimoQR.current.texto && ahora - ultimoQR.current.ts < 1500) return
    ultimoQR.current = { texto, ts: ahora }
    const shipmentId = extraerShipmentId(texto)
    if (!shipmentId) { beep(false); setFeedback({ tipo: 'error', texto: 'QR no reconocido' }); return }
    const venta = ventas.find(v => v.plataforma === 'ml' && v.ml_shipment_id === shipmentId)
    if (!venta) { beep(false); setFeedback({ tipo: 'error', texto: `Envío ${shipmentId} no está en la bandeja` }); return }
    setEscaneadas(prev => {
      if (prev.has(venta.id)) { beep(false); setFeedback({ tipo: 'dup', texto: `Ya escaneaste a ${venta.comprador_nombre}` }); return prev }
      beep(true); setFeedback({ tipo: 'ok', texto: `✓ ${venta.comprador_nombre}` })
      return new Set([...prev, venta.id])
    })
  }, [ventas])

  function salirEscaneo() { setEscaneando(false); setEscaneadas(new Set()); setFeedback(null) }

  async function confirmarDespachoML() {
    const ids = [...escaneadas]
    if (!ids.length) return
    setConfirmando(true)
    try {
      const r = await api.post<{ importados: number; omitidos: number }>(
        '/integraciones/ml/pendientes/importar-lote', { ids }
      )
      setVentas(prev => prev.filter(v => !escaneadas.has(v.id)))
      salirEscaneo()
      alert(`✓ ${r.importados} paquete(s) confirmado(s)` + (r.omitidos ? ` (${r.omitidos} omitido(s))` : ''))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al confirmar')
    } finally {
      setConfirmando(false)
    }
  }

  // ── Vista: escáner QR ─────────────────────────────────────────────────────

  if (escaneando) {
    const fbColor = feedback?.tipo === 'ok'
      ? 'bg-green-50 border-green-200 text-green-700'
      : feedback?.tipo === 'dup'
        ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
        : 'bg-red-50 border-red-200 text-red-600'
    const ventasEsc = ventas.filter(v => escaneadas.has(v.id))
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black">Escanear etiquetas ML</h1>
          <button onClick={salirEscaneo} className="text-sm text-gray-500 hover:underline">Salir</button>
        </div>
        <p className="text-sm text-gray-500">Apuntá la cámara al QR de cada etiqueta de Mercado Libre.</p>
        <QRScanner onResult={onScan} active />
        {feedback && (
          <div className={`border rounded-lg p-3 text-sm font-medium text-center ${fbColor}`}>{feedback.texto}</div>
        )}
        <div className="card text-center py-4">
          <div className="text-4xl font-black text-brand">{escaneadas.size}</div>
          <div className="text-sm text-gray-500">de {countML} paquete(s) de ML</div>
        </div>
        {ventasEsc.length > 0 && (
          <div className="space-y-2">
            {ventasEsc.map(v => (
              <div key={v.id} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/15 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-green-600">✓</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{v.comprador_nombre}</div>
                  <div className="text-xs text-gray-500 truncate">{v.comprador_direccion}</div>
                </div>
                <button onClick={() => setEscaneadas(prev => { const s = new Set(prev); s.delete(v.id); return s })}
                  className="text-xs text-gray-400 hover:text-red-500 shrink-0">Quitar</button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        <button onClick={confirmarDespachoML} disabled={escaneadas.size === 0 || confirmando}
          className="btn-primary w-full text-base py-3 disabled:opacity-40">
          {confirmando ? 'Confirmando...' : `✓ Confirmar despacho (${escaneadas.size})`}
        </button>
      </div>
    )
  }

  // ── Vista: bandeja ────────────────────────────────────────────────────────

  const todosVisiblesSeleccionados = ventasFiltradas.length > 0 && ventasFiltradas.every(v => seleccionadas.has(v.id))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Ventas pendientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Elegí qué ventas distribuir. Solo las que importes se convierten en envíos.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {hayML && (
            <button onClick={() => setEscaneando(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              📷 Escanear ML
            </button>
          )}
          {seleccionadas.size > 0 && (
            <button onClick={importarSeleccionadas} disabled={importandoLote}
              className="btn-primary text-sm disabled:opacity-50">
              {importandoLote ? 'Importando...' : `✓ Distribuir (${seleccionadas.size})`}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {/* Tabs de plataforma */}
      {!loading && ventas.length > 0 && (
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {([['todas', `Todas (${ventas.length})`], ['ml', `ML (${countML})`], ['tn', `TN (${countTN})`]] as [Filtro, string][]).map(([key, label]) => (
            (key === 'todas' || (key === 'ml' && countML > 0) || (key === 'tn' && countTN > 0)) && (
              <button key={key} onClick={() => setFiltro(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtro === key
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {label}
              </button>
            )
          ))}
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="card text-center text-gray-400 py-10">Cargando...</div>
      ) : ventas.length === 0 ? (
        <div className="card text-center py-14 space-y-3">
          <div className="text-5xl">🎉</div>
          <p className="font-bold text-gray-700 dark:text-gray-200 text-lg">Todo al día</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            No hay ventas pendientes. Cuando llegue una nueva venta de ML o Tienda Nube va a aparecer acá.
          </p>
        </div>
      ) : ventasFiltradas.length === 0 ? (
        <div className="card text-center py-10 space-y-2">
          <div className="text-4xl">{filtro === 'ml' ? '🛒' : '☁️'}</div>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No hay ventas de {PL_LABEL[filtro as Plataforma]} pendientes</p>
        </div>
      ) : (
        <>
          {/* Barra de selección */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={todosVisiblesSeleccionados}
                onChange={seleccionarTodoFiltro} className="w-4 h-4 accent-brand" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {todosVisiblesSeleccionados ? 'Deseleccionar todo' : `Seleccionar todo (${ventasFiltradas.length})`}
              </span>
            </label>
            {seleccionadas.size > 0 && (
              <span className="text-sm text-brand font-medium">{seleccionadas.size} seleccionada(s)</span>
            )}
          </div>

          {/* Lista */}
          <div className="space-y-3">
            {ventasFiltradas.map(v => (
              <div key={v.id}
                className={`card flex gap-3 transition-all ${seleccionadas.has(v.id) ? 'border-brand/40 bg-brand/[0.03] dark:bg-brand/[0.06]' : ''}`}>
                {/* Checkbox */}
                <div className="pt-1 shrink-0">
                  <input type="checkbox" checked={seleccionadas.has(v.id)}
                    onChange={() => toggleSeleccion(v.id)} className="w-4 h-4 accent-brand cursor-pointer" />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Nombre + badge plataforma */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold truncate">{v.comprador_nombre}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${PL_BADGE[v.plataforma]}`}>
                          {PL_ICON[v.plataforma]} {v.plataforma === 'ml' ? 'Mercado Libre' : 'Tienda Nube'}
                        </span>
                      </div>

                      {/* Dirección */}
                      <div className="text-sm text-gray-500 truncate">{v.comprador_direccion}</div>

                      {/* Productos (solo TN — la ventaja sobre idata) */}
                      {v.descripcion_productos && (
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-lg px-2.5 py-1">
                          <span>📦</span>
                          <span>{v.descripcion_productos}</span>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-brand/10 text-brand text-xs font-bold px-2 py-0.5 rounded-full">{v.zona}</span>
                        <span className="text-xs text-gray-400">{formatFecha(v.created_at)}</span>
                        {v.tn_order_id && <span className="text-xs text-gray-400">· #{v.tn_order_id}</span>}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 shrink-0 sm:flex-col sm:items-end">
                      <button onClick={() => importar(v)} disabled={procesando === v.id}
                        className="btn-primary text-sm disabled:opacity-50">
                        {procesando === v.id ? '...' : '✓ Distribuir'}
                      </button>
                      <button onClick={() => descartar(v)} disabled={procesando === v.id}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40 disabled:opacity-50">
                        Descartar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
