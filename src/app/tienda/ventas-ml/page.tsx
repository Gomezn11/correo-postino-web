'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

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

export default function VentasMLPage() {
  const [ventas, setVentas] = useState<VentaPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError] = useState('')

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Ventas de Mercado Libre</h1>
        <p className="text-sm text-gray-500 mt-1">
          Elegí qué ventas distribuir con la logística. Solo las que importes se convierten en envíos.
        </p>
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
