'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface VentaPS {
  id: string
  ps_order_id: string
  comprador_nombre: string
  comprador_direccion: string
  comprador_telefono: string
  zona: string
  created_at: string
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function VentasPSPage() {
  const [ventas, setVentas] = useState<VentaPS[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState<string | null>(null)

  useEffect(() => {
    api.get<VentaPS[]>('/prestashop/ventas-pendientes')
      .then(setVentas)
      .finally(() => setLoading(false))
  }, [])

  async function importar(id: string) {
    setImportando(id)
    try {
      await api.post(`/prestashop/ventas-pendientes/${id}/importar`, {})
      setVentas(prev => prev.filter(v => v.id !== id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al importar')
    } finally {
      setImportando(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🛍️</span>
        <div>
          <h1 className="text-2xl font-black">Ventas PrestaShop</h1>
          <p className="text-sm text-gray-500">Pedidos pagados pendientes de importar a Correo Postino</p>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Cargando...</div>
      ) : ventas.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">
          <p className="text-3xl mb-2">📭</p>
          <p>No hay ventas pendientes de importar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ventas.map(v => (
            <div key={v.id} className="card space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-semibold">{v.comprador_nombre}</p>
                  <p className="text-sm text-gray-500">{v.comprador_direccion}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>Orden #{v.ps_order_id}</span>
                    <span>·</span>
                    <span className="font-medium text-gray-600 dark:text-gray-300">{v.zona}</span>
                    <span>·</span>
                    <span>{formatFecha(v.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => importar(v.id)}
                  disabled={importando === v.id}
                  className="btn-primary text-sm shrink-0 disabled:opacity-50">
                  {importando === v.id ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
