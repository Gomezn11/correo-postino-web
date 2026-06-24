'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Integracion {
  id: string; plataforma: string; external_user_id: string; external_user_nickname: string
  activo: boolean; modo_importacion: string; created_at: string
}

export default function TiendaIntegrarPage() {
  const [integraciones, setIntegraciones] = useState<Integracion[]>([])
  const [mlUrl, setMlUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [conectando, setConectando] = useState(false)

  useEffect(() => {
    api.get<Integracion[]>('/integraciones')
      .then(setIntegraciones)
      .finally(() => setLoading(false))
  }, [])

  async function conectarML() {
    setConectando(true)
    try {
      const r = await api.get<{ auth_url: string }>('/integraciones/mercadolibre/conectar')
      window.location.href = r.auth_url
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
      setConectando(false)
    }
  }

  async function desconectar(id: string) {
    if (!confirm('¿Desconectar esta integración?')) return
    await api.delete(`/integraciones/${id}`)
    setIntegraciones(prev => prev.filter(i => i.id !== id))
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

            <button onClick={() => desconectar(mlConectada.id)} className="btn-danger text-sm">
              Desconectar
            </button>
          </div>
        ) : (
          <button onClick={conectarML} disabled={conectando} className="btn-primary disabled:opacity-50">
            {conectando ? 'Redirigiendo...' : 'Conectar con Mercado Libre'}
          </button>
        )}
      </div>

      {/* Tienda Nube — próximamente */}
      <div className="card space-y-3 opacity-60">
        <div className="flex items-center gap-3">
          <span className="text-3xl">☁️</span>
          <div>
            <h2 className="font-bold">Tienda Nube</h2>
            <p className="text-sm text-gray-500">Próximamente disponible</p>
          </div>
        </div>
        <button disabled className="btn-ghost text-sm opacity-50">Próximamente</button>
      </div>
    </div>
  )
}
