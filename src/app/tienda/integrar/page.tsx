'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Integracion {
  id: string; plataforma: string; external_user_id: string; activo: boolean; created_at: string
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <span>✅</span> Conectado <span className="text-gray-400">(cuenta ML #{mlConectada.external_user_id})</span>
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
