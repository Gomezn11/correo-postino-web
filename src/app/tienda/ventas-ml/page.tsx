'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import QRScanner from '@/components/QRScanner'

interface VentaPendiente {
  id: string
  ml_shipment_id: string
  comprador_nombre: string
  comprador_direccion: string
  zona: string
  created_at: string
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Extrae el ID de envío del contenido del QR de la etiqueta de Mercado Libre.
// El QR puede venir como JSON ({"id":...}), texto "id=..." o dígitos sueltos:
// probamos varias formas para ser tolerantes al formato real de la etiqueta.
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

// Pitido corto vía Web Audio (sin archivo de sonido). Frecuencia distinta
// para éxito (agudo) y para error/duplicado (grave).
function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = ok ? 880 : 320
    osc.connect(gain); gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
    osc.onended = () => ctx.close()
  } catch { /* sin audio: no pasa nada */ }
}

type FeedbackTipo = 'ok' | 'dup' | 'noencontrado'

export default function VentasMLPage() {
  const [ventas, setVentas] = useState<VentaPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Modo escaneo
  const [escaneando, setEscaneando] = useState(false)
  const [escaneadas, setEscaneadas] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<{ tipo: FeedbackTipo; texto: string } | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  // Evita procesar el mismo QR muchas veces seguidas (zxing dispara en loop)
  const ultimoQR = useRef<{ texto: string; ts: number }>({ texto: '', ts: 0 })

  const cargar = useCallback(() => {
    setLoading(true)
    api.get<VentaPendiente[]>('/integraciones/ml/pendientes')
      .then(setVentas)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function importar(id: string) {
    setProcesando(id)
    setError('')
    try {
      await api.post(`/integraciones/ml/pendientes/${id}/importar`, {})
      setVentas(prev => prev.filter(v => v.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al importar')
    } finally {
      setProcesando(null)
    }
  }

  async function descartar(id: string) {
    if (!confirm('¿Descartar esta venta? No se va a distribuir con la logística.')) return
    setProcesando(id)
    setError('')
    try {
      await api.post(`/integraciones/ml/pendientes/${id}/descartar`, {})
      setVentas(prev => prev.filter(v => v.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al descartar')
    } finally {
      setProcesando(null)
    }
  }

  // ── Escaneo de QR ──────────────────────────────────────────────
  const onScan = useCallback((texto: string) => {
    const ahora = Date.now()
    // Ignorar el mismo texto leído dentro de 1.5s (lecturas repetidas)
    if (texto === ultimoQR.current.texto && ahora - ultimoQR.current.ts < 1500) return
    ultimoQR.current = { texto, ts: ahora }

    const shipmentId = extraerShipmentId(texto)
    if (!shipmentId) {
      beep(false)
      setFeedback({ tipo: 'noencontrado', texto: 'QR no reconocido' })
      return
    }

    const venta = ventas.find(v => v.ml_shipment_id === shipmentId)
    if (!venta) {
      beep(false)
      setFeedback({ tipo: 'noencontrado', texto: `Envío ${shipmentId} no está en la bandeja (¿ya importado o aún no llegó?)` })
      return
    }

    setEscaneadas(prev => {
      if (prev.has(venta.id)) {
        beep(false)
        setFeedback({ tipo: 'dup', texto: `Ya habías escaneado a ${venta.comprador_nombre}` })
        return prev
      }
      beep(true)
      setFeedback({ tipo: 'ok', texto: `✓ ${venta.comprador_nombre}` })
      const next = new Set(prev)
      next.add(venta.id)
      return next
    })
  }, [ventas])

  function quitarEscaneada(id: string) {
    setEscaneadas(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function salirEscaneo() {
    setEscaneando(false)
    setEscaneadas(new Set())
    setFeedback(null)
  }

  async function confirmarDespacho() {
    const ids = [...escaneadas]
    if (ids.length === 0) return
    setConfirmando(true)
    setError('')
    try {
      const r = await api.post<{ importados: number; omitidos: number }>(
        '/integraciones/ml/pendientes/importar-lote', { ids }
      )
      setVentas(prev => prev.filter(v => !escaneadas.has(v.id)))
      salirEscaneo()
      alert(`✓ ${r.importados} paquete(s) confirmado(s) para despacho` +
        (r.omitidos ? `\n(${r.omitidos} omitido(s) por estar ya procesados)` : ''))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al confirmar el despacho')
    } finally {
      setConfirmando(false)
    }
  }

  const ventasEscaneadas = ventas.filter(v => escaneadas.has(v.id))

  // ── Vista de escaneo ───────────────────────────────────────────
  if (escaneando) {
    const fbColor = feedback?.tipo === 'ok'
      ? 'bg-green-50 border-green-200 text-green-700'
      : feedback?.tipo === 'dup'
        ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
        : 'bg-red-50 border-red-200 text-red-600'

    return (
      <div className="space-y-4 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black">Escanear etiquetas</h1>
          <button onClick={salirEscaneo} className="text-sm text-gray-500 hover:underline">Salir</button>
        </div>
        <p className="text-sm text-gray-500">
          Apuntá la cámara al QR de cada etiqueta de Mercado Libre. Vas a escuchar un pip por cada paquete reconocido.
        </p>

        <QRScanner onResult={onScan} active />

        {feedback && (
          <div className={`border rounded-lg p-3 text-sm font-medium text-center ${fbColor}`}>
            {feedback.texto}
          </div>
        )}

        <div className="card text-center py-4">
          <div className="text-4xl font-black text-brand">{escaneadas.size}</div>
          <div className="text-sm text-gray-500">paquete(s) escaneado(s) de {ventas.length} pendientes</div>
        </div>

        {ventasEscaneadas.length > 0 && (
          <div className="space-y-2">
            {ventasEscaneadas.map(v => (
              <div key={v.id} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-900/30 rounded-lg px-3 py-2">
                <span className="text-green-600">✓</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{v.comprador_nombre}</div>
                  <div className="text-xs text-gray-500 truncate">{v.comprador_direccion}</div>
                </div>
                <button onClick={() => quitarEscaneada(v.id)} className="text-xs text-gray-400 hover:text-red-500 shrink-0">Quitar</button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

        <button
          onClick={confirmarDespacho}
          disabled={escaneadas.size === 0 || confirmando}
          className="btn-primary w-full text-base py-3 disabled:opacity-40"
        >
          {confirmando ? 'Confirmando...' : `✓ Confirmar despacho (${escaneadas.size})`}
        </button>
      </div>
    )
  }

  // ── Vista bandeja (lista) ──────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Ventas de Mercado Libre</h1>
          <p className="text-sm text-gray-500 mt-1">
            Elegí qué ventas distribuir con la logística. Solo las que importes se convierten en envíos.
          </p>
        </div>
        {ventas.length > 0 && (
          <button onClick={() => setEscaneando(true)} className="btn-primary text-sm shrink-0">
            📷 Escanear etiquetas
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {loading ? (
        <div className="card text-center text-gray-400 py-10">Cargando...</div>
      ) : ventas.length === 0 ? (
        <div className="card text-center py-12 space-y-2">
          <div className="text-4xl">🛒</div>
          <p className="font-semibold text-gray-700 dark:text-gray-200">No hay ventas pendientes</p>
          <p className="text-sm text-gray-400">
            Cuando vendas algo en Mercado Libre va a aparecer acá para que elijas si lo distribuís con nosotros.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ventas.map(v => (
            <div key={v.id} className="card flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold">{v.comprador_nombre}</div>
                <div className="text-sm text-gray-500 truncate">{v.comprador_direccion}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-brand/10 text-brand text-xs font-bold px-2 py-0.5 rounded-full">{v.zona}</span>
                  <span className="text-xs text-gray-400">{formatFecha(v.created_at)}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => importar(v.id)} disabled={procesando === v.id}
                  className="btn-primary text-sm disabled:opacity-50">
                  {procesando === v.id ? '...' : '✓ Distribuir'}
                </button>
                <button onClick={() => descartar(v.id)} disabled={procesando === v.id}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40 disabled:opacity-50">
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
