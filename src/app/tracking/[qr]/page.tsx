'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const MapaEnVivo = dynamic(() => import('@/components/MapaEnVivo'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-gray-400 text-sm">Cargando mapa...</div>,
})

interface HistorialItem { estado: string; label: string; fecha: string; nota: string }
interface TrackingData {
  qr_interno: string; estado_actual: string; estado_label: string
  comprador_nombre: string; zona: string; tipo_paquete: string
  fecha_ingreso: string; historial: HistorialItem[]
  tiene_mapa: boolean; puede_reprogramar: boolean
}
interface Ubicacion { disponible: boolean; lat?: number; lng?: number; actualizado_at?: string }

const ICONO: Record<string, string> = {
  pendiente_colecta: '🕐', pendiente_retiro: '🕐', en_centro_distribucion: '🏭', en_deposito: '🏭',
  despachado: '📦', en_camino: '🚚',
  entregado: '✅', no_entregado_ausente: '🚪', no_entregado_domicilio_no_encontrado: '❓',
  no_cerrado: '🔒', reprogramado_por_comprador: '📅', reprogramado_por_logistica: '📅',
}

const API = process.env.NEXT_PUBLIC_API_URL

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function manana(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function TrackingPage() {
  const { qr } = useParams<{ qr: string }>()
  const router = useRouter()
  const [data, setData] = useState<TrackingData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // C2 — ubicación en vivo
  const [ubic, setUbic] = useState<Ubicacion | null>(null)

  // C7 — reprogramación
  const [mostrarForm, setMostrarForm] = useState(false)
  const [fecha, setFecha] = useState(manana())
  const [franja, setFranja] = useState('todo_el_dia')
  const [motivoRep, setMotivoRep] = useState('')
  const [enviandoRep, setEnviandoRep] = useState(false)
  const [reprogramado, setReprogramado] = useState(false)
  const [errorRep, setErrorRep] = useState('')

  const cargar = useCallback(() => {
    fetch(`${API}/tracking/${qr}`)
      .then(r => { if (!r.ok) throw new Error('Paquete no encontrado'); return r.json() })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [qr])

  useEffect(() => { cargar() }, [cargar])

  // Polling de ubicación cada 20s mientras esté en camino
  useEffect(() => {
    if (!data?.tiene_mapa) return
    let activo = true
    const fetchUbic = () => {
      fetch(`${API}/tracking/${qr}/ubicacion`)
        .then(r => r.json())
        .then(u => { if (activo) setUbic(u) })
        .catch(() => {})
    }
    fetchUbic()
    const id = setInterval(fetchUbic, 20_000)
    return () => { activo = false; clearInterval(id) }
  }, [data?.tiene_mapa, qr])

  async function enviarReprogramacion() {
    setEnviandoRep(true)
    setErrorRep('')
    try {
      const r = await fetch(`${API}/tracking/${qr}/reprogramar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha_solicitada: fecha,
          franja_horaria: franja,
          motivo_comprador: motivoRep || null,
        }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({ detail: 'Error al reprogramar' }))
        throw new Error(e.detail || 'Error al reprogramar')
      }
      setReprogramado(true)
      setMostrarForm(false)
      cargar()
    } catch (e) {
      setErrorRep(e instanceof Error ? e.message : 'Error al reprogramar')
    } finally {
      setEnviandoRep(false)
    }
  }

  const esTerminal = data && ['entregado', 'no_entregado_ausente', 'no_entregado_domicilio_no_encontrado', 'no_cerrado'].includes(data.estado_actual)
  const esEntregado = data?.estado_actual === 'entregado'

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white py-4 px-4 text-center">
        <a href="/" className="font-black text-lg">📦 Correo Postino</a>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {loading && <div className="text-center text-gray-500 py-16">Buscando tu paquete...</div>}

        {error && (
          <div className="card text-center space-y-4">
            <div className="text-4xl">❓</div>
            <p className="font-semibold text-gray-800">No encontramos el paquete <strong>{qr}</strong></p>
            <p className="text-sm text-gray-500">Verificá que el código esté bien escrito.</p>
            <button onClick={() => router.push('/')} className="btn-primary">Volver</button>
          </div>
        )}

        {data && (
          <>
            {/* Estado principal */}
            <div className={`card text-center space-y-2 border-2 ${esEntregado ? 'border-green-300 bg-green-50' : esTerminal ? 'border-red-200 bg-red-50' : 'border-brand/20'}`}>
              <div className="text-5xl">{ICONO[data.estado_actual] ?? '📦'}</div>
              <div className="text-2xl font-black text-gray-800">{data.estado_label}</div>
              <div className="text-sm text-gray-500">Hola, <strong>{data.comprador_nombre}</strong> — tu paquete está en {data.zona}</div>
              <div className="text-xs text-gray-400 font-mono">{data.qr_interno}</div>
            </div>

            {/* C2 — Mapa en vivo: SOLO cuando el GPS está fresco (chofer realmente en movimiento).
                Si apagó la app, el backend deja de exponer la posición y mostramos un estado neutral
                en vez de un mapa congelado que diga falsamente "viene en camino". */}
            {data.tiene_mapa && (
              ubic?.disponible && ubic.lat != null && ubic.lng != null ? (
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-brand/5 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="font-bold text-sm text-gray-800">Tu repartidor está en camino</span>
                  </div>
                  <div className="h-64">
                    <MapaEnVivo lat={ubic.lat} lng={ubic.lng} actualizadoAt={ubic.actualizado_at} />
                  </div>
                </div>
              ) : (
                <div className="card flex items-center gap-3">
                  <div className="text-2xl">🚚</div>
                  <div>
                    <div className="font-bold text-sm text-gray-800">Tu paquete está en reparto</div>
                    <div className="text-xs text-gray-500">Cuando el repartidor esté en movimiento vas a poder seguirlo en vivo en el mapa.</div>
                  </div>
                </div>
              )
            )}

            {/* C7 — Reprogramación */}
            {reprogramado && (
              <div className="card bg-green-50 border-2 border-green-200 text-center space-y-1">
                <div className="text-2xl">📅</div>
                <p className="font-semibold text-green-800">¡Listo! Anotamos tu pedido de reprogramación.</p>
                <p className="text-sm text-green-600">Nos vamos a comunicar si hay algún cambio.</p>
              </div>
            )}

            {data.puede_reprogramar && !reprogramado && !mostrarForm && (
              <button onClick={() => setMostrarForm(true)} className="btn-ghost w-full">
                📅 ¿No vas a estar? Reprogramá tu entrega
              </button>
            )}

            {mostrarForm && !reprogramado && (
              <div className="card space-y-4">
                <h3 className="font-bold text-gray-800">Reprogramá tu entrega</h3>
                <div>
                  <label className="label">Fecha</label>
                  <input type="date" value={fecha} min={manana()}
                    onChange={e => setFecha(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Franja horaria</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[['manana', '🌅 Mañana'], ['tarde', '🌇 Tarde'], ['todo_el_dia', '🕐 Cualquiera']].map(([v, l]) => (
                      <button key={v} onClick={() => setFranja(v)}
                        className={`text-xs font-semibold py-2 rounded-lg border-2 transition-colors ${
                          franja === v ? 'border-brand bg-brand/10 text-brand' : 'border-gray-200 text-gray-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Motivo (opcional)</label>
                  <input type="text" value={motivoRep} onChange={e => setMotivoRep(e.target.value)}
                    placeholder="Ej: trabajo hasta las 18hs" className="input" />
                </div>
                {errorRep && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2">{errorRep}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setMostrarForm(false)} className="btn-ghost flex-1">Cancelar</button>
                  <button onClick={enviarReprogramacion} disabled={enviandoRep} className="btn-primary flex-1 disabled:opacity-50">
                    {enviandoRep ? 'Enviando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}

            {/* Historial */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">Historial de seguimiento</h3>
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-4">
                  {data.historial.map((h, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 z-10 ${
                        i === data.historial.length - 1 ? 'bg-brand text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {ICONO[h.estado] ?? '·'}
                      </div>
                      <div className="pb-2">
                        <div className="font-medium text-sm text-gray-800">{h.label}</div>
                        <div className="text-xs text-gray-400">{formatFecha(h.fecha)}</div>
                        {h.nota && <div className="text-xs text-gray-500 mt-0.5">{h.nota}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
