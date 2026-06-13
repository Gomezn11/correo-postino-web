'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface HistorialItem { estado: string; label: string; fecha: string; nota: string }
interface TrackingData {
  qr_interno: string; estado_actual: string; estado_label: string
  comprador_nombre: string; zona: string; tipo_paquete: string
  fecha_ingreso: string; historial: HistorialItem[]
}

const ICONO: Record<string, string> = {
  pendiente_retiro: '🕐', en_deposito: '🏭', en_camino: '🚚',
  entregado: '✅', no_entregado_ausente: '🚪', no_entregado_domicilio_no_encontrado: '❓', no_cerrado: '🔒',
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function TrackingPage() {
  const { qr } = useParams<{ qr: string }>()
  const router = useRouter()
  const [data, setData] = useState<TrackingData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tracking/${qr}`)
      .then(r => { if (!r.ok) throw new Error('Paquete no encontrado'); return r.json() })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [qr])

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
