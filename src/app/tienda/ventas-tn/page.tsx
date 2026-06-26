'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

interface VentaTNPendiente {
  id: string
  tn_order_id: string
  comprador_nombre: string
  comprador_direccion: string
  zona: string
  descripcion_productos: string | null
  created_at: string
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function VentasTNPage() {
  const [ventas, setVentas] = useState<VentaTNPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [importandoLote, setImportandoLote] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    api.get<VentaTNPendiente[]>('/integraciones/tn/pendientes')
      .then(data => { setVentas(data); setSeleccionadas(new Set()) })
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function importar(id: string) {
    setProcesando(id)
    setError('')
    try {
      await api.post(`/integraciones/tn/pendientes/${id}/importar`, {})
      setVentas(prev => prev.filter(v => v.id !== id))
      setSeleccionadas(prev => { const s = new Set(prev); s.delete(id); return s })
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
      await api.post(`/integraciones/tn/pendientes/${id}/descartar`, {})
      setVentas(prev => prev.filter(v => v.id !== id))
      setSeleccionadas(prev => { const s = new Set(prev); s.delete(id); return s })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al descartar')
    } finally {
      setProcesando(null)
    }
  }

  function toggleSeleccion(id: string) {
    setSeleccionadas(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function seleccionarTodo() {
    if (seleccionadas.size === ventas.length) {
      setSeleccionadas(new Set())
    } else {
      setSeleccionadas(new Set(ventas.map(v => v.id)))
    }
  }

  async function importarSeleccionadas() {
    const ids = [...seleccionadas]
    if (ids.length === 0) return
    setImportandoLote(true)
    setError('')
    try {
      const r = await api.post<{ importados: number; omitidos: number }>(
        '/integraciones/tn/pendientes/importar-lote', { ids }
      )
      setVentas(prev => prev.filter(v => !seleccionadas.has(v.id)))
      setSeleccionadas(new Set())
      alert(`✓ ${r.importados} paquete(s) agregado(s) a la operación` +
        (r.omitidos ? `\n(${r.omitidos} omitido(s) por estar ya procesados)` : ''))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al importar en lote')
    } finally {
      setImportandoLote(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Ventas de Tienda Nube</h1>
          <p className="text-sm text-gray-500 mt-1">
            Elegí qué ventas distribuir con la logística. Solo las que importes se convierten en envíos.
          </p>
        </div>
        {seleccionadas.size > 0 && (
          <button
            onClick={importarSeleccionadas}
            disabled={importandoLote}
            className="btn-primary text-sm shrink-0 disabled:opacity-50"
          >
            {importandoLote ? 'Importando...' : `✓ Distribuir seleccionadas (${seleccionadas.size})`}
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {loading ? (
        <div className="card text-center text-gray-400 py-10">Cargando...</div>
      ) : ventas.length === 0 ? (
        <div className="card text-center py-12 space-y-2">
          <div className="text-4xl">☁️</div>
          <p className="font-semibold text-gray-700 dark:text-gray-200">No hay ventas pendientes</p>
          <p className="text-sm text-gray-400">
            Cuando se pague un pedido en tu Tienda Nube va a aparecer acá para que elijas si lo distribuís con nosotros.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 pb-1">
            <button
              onClick={seleccionarTodo}
              className="text-sm text-brand hover:underline font-medium"
            >
              {seleccionadas.size === ventas.length ? 'Deseleccionar todo' : `Seleccionar todo (${ventas.length})`}
            </button>
            {seleccionadas.size > 0 && (
              <span className="text-sm text-gray-500">{seleccionadas.size} seleccionada(s)</span>
            )}
          </div>

          <div className="space-y-3">
            {ventas.map(v => (
              <div
                key={v.id}
                className={`card flex gap-3 transition-colors ${
                  seleccionadas.has(v.id) ? 'border-brand/50 bg-brand/5' : ''
                }`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={seleccionadas.has(v.id)}
                    onChange={() => toggleSeleccion(v.id)}
                    className="w-4 h-4 accent-brand cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{v.comprador_nombre}</div>
                      <div className="text-sm text-gray-500 truncate">{v.comprador_direccion}</div>
                      {v.descripcion_productos && (
                        <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1 mt-1.5 inline-block">
                          {v.descripcion_productos}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="bg-brand/10 text-brand text-xs font-bold px-2 py-0.5 rounded-full">{v.zona}</span>
                        <span className="text-xs text-gray-400">{formatFecha(v.created_at)}</span>
                        <span className="text-xs text-gray-400">· Orden #{v.tn_order_id}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => importar(v.id)}
                        disabled={procesando === v.id}
                        className="btn-primary text-sm disabled:opacity-50"
                      >
                        {procesando === v.id ? '...' : '✓ Distribuir'}
                      </button>
                      <button
                        onClick={() => descartar(v.id)}
                        disabled={procesando === v.id}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40 disabled:opacity-50"
                      >
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
