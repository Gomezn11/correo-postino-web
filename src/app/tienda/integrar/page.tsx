'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Integracion {
  id: string; plataforma: string; external_user_id: string; external_user_nickname: string
  activo: boolean; modo_importacion: string; created_at: string
}

interface EstadoTN {
  conectado: boolean; store_id?: string; conectado_at?: string; integracion_id?: string; modo_importacion?: string
}

export default function TiendaIntegrarPage() {
  const [integraciones, setIntegraciones] = useState<Integracion[]>([])
  const [estadoTN, setEstadoTN] = useState<EstadoTN | null>(null)
  const [loading, setLoading] = useState(true)
  const [conectandoML, setConectandoML] = useState(false)
  const [conectandoTN, setConectandoTN] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Integracion[]>('/integraciones'),
      api.get<EstadoTN>('/tiendanube/estado'),
    ]).then(([ints, tn]) => {
      setIntegraciones(ints)
      setEstadoTN(tn)
    }).finally(() => setLoading(false))
  }, [])

  async function conectarML() {
    setConectandoML(true)
    try {
      const r = await api.get<{ auth_url: string }>('/integraciones/mercadolibre/conectar')
      window.location.href = r.auth_url
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
      setConectandoML(false)
    }
  }

  async function conectarTN() {
    setConectandoTN(true)
    try {
      const r = await api.get<{ auth_url: string }>('/tiendanube/conectar')
      window.location.href = r.auth_url
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al iniciar la conexión con Tienda Nube')
      setConectandoTN(false)
    }
  }

  async function desconectarML(id: string) {
    if (!confirm('¿Desconectar Mercado Libre?')) return
    await api.delete(`/integraciones/${id}`)
    setIntegraciones(prev => prev.filter(i => i.id !== id))
  }

  async function desconectarTN() {
    if (!estadoTN?.integracion_id) return
    if (!confirm('¿Desconectar Tienda Nube? Los pedidos dejarán de importarse automáticamente.')) return
    await api.delete(`/integraciones/${estadoTN.integracion_id}`)
    setEstadoTN({ conectado: false })
  }

  async function cambiarModoTN(modo: string) {
    if (!estadoTN?.integracion_id) return
    setEstadoTN(prev => prev ? { ...prev, modo_importacion: modo } : prev)
    try {
      await api.put(`/integraciones/${estadoTN.integracion_id}/modo`, { modo })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al cambiar el modo')
      api.get<EstadoTN>('/tiendanube/estado').then(setEstadoTN)
    }
  }

  async function cambiarModo(id: string, modo: string) {
    setIntegraciones(prev => prev.map(i => i.id === id ? { ...i, modo_importacion: modo } : i))
    try {
      await api.put(`/integraciones/${id}/modo`, { modo })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al cambiar el modo')
      api.get<Integracion[]>('/integraciones').then(setIntegraciones)
    }
  }

  const mlConectada = integraciones.find(i => i.plataforma === 'mercadolibre' && i.activo)

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-black">Integrar plataformas</h1>
      <p className="text-gray-500 text-sm">Conectá tu tienda para importar automáticamente los pedidos.</p>

      {/* Mercado Libre */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛒</span>
          <div>
            <h2 className="font-bold">Mercado Libre</h2>
            <p className="text-sm text-gray-500">Importación automática de órdenes con envío propio</p>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">Verificando...</div>
        ) : mlConectada ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <span>✅</span> Conectado como <strong>{mlConectada.external_user_nickname || `#${mlConectada.external_user_id}`}</strong>
            </div>

            {/* Modo de importación */}
            <div className="border-t dark:border-gray-800 pt-3 space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">¿Qué hacemos con tus ventas de Mercado Libre?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => cambiarModo(mlConectada.id, 'auto')}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    mlConectada.modo_importacion !== 'manual'
                      ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="font-bold text-sm">⚡ Automático</div>
                  <div className="text-xs text-gray-500 mt-0.5">Se importan todas las ventas</div>
                </button>
                <button onClick={() => cambiarModo(mlConectada.id, 'manual')}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    mlConectada.modo_importacion === 'manual'
                      ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="font-bold text-sm">✋ Manual</div>
                  <div className="text-xs text-gray-500 mt-0.5">Vos elegís cuáles distribuir</div>
                </button>
              </div>
              {mlConectada.modo_importacion === 'manual' && (
                <a href="/tienda/ventas-ml" className="inline-block text-sm text-brand hover:underline pt-1">
                  → Ver ventas pendientes de importar
                </a>
              )}
            </div>

            <button onClick={() => desconectarML(mlConectada.id)} className="btn-danger text-sm">
              Desconectar
            </button>
          </div>
        ) : (
          <button onClick={conectarML} disabled={conectandoML} className="btn-primary disabled:opacity-50">
            {conectandoML ? 'Redirigiendo...' : 'Conectar con Mercado Libre'}
          </button>
        )}
      </div>

      {/* Tienda Nube */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">☁️</span>
          <div>
            <h2 className="font-bold">Tienda Nube</h2>
            <p className="text-sm text-gray-500">
              Importación automática de pedidos pagados · Actualización de estado en tiempo real
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">Verificando...</div>
        ) : estadoTN?.conectado ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <span>✅</span> Conectado · Store ID <strong>#{estadoTN.store_id}</strong>
            </div>

            {/* Modo de importación */}
            <div className="border-t dark:border-gray-800 pt-3 space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">¿Qué hacemos con tus ventas de Tienda Nube?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => cambiarModoTN('auto')}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    estadoTN.modo_importacion !== 'manual'
                      ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="font-bold text-sm">⚡ Automático</div>
                  <div className="text-xs text-gray-500 mt-0.5">Se importan todas las ventas</div>
                </button>
                <button onClick={() => cambiarModoTN('manual')}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    estadoTN.modo_importacion === 'manual'
                      ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="font-bold text-sm">✋ Manual</div>
                  <div className="text-xs text-gray-500 mt-0.5">Vos elegís cuáles distribuir</div>
                </button>
              </div>
              {estadoTN.modo_importacion === 'manual' && (
                <a href="/tienda/ventas-tn" className="inline-block text-sm text-brand hover:underline pt-1">
                  → Ver ventas pendientes de importar
                </a>
              )}
            </div>

            <button onClick={desconectarTN} className="btn-danger text-sm">
              Desconectar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300">Al conectar vas a obtener:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Importación automática de cada venta pagada</li>
                <li>Nombre, dirección y detalle completo de los productos</li>
                <li>Estado del envío actualizado en Tienda Nube en tiempo real</li>
              </ul>
            </div>
            <button onClick={conectarTN} disabled={conectandoTN} className="btn-primary disabled:opacity-50">
              {conectandoTN ? 'Redirigiendo a Tienda Nube...' : 'Conectar con Tienda Nube'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
