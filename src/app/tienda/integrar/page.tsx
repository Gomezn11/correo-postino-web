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

interface EstadoPS {
  conectado: boolean; store_url?: string; conectado_at?: string; integracion_id?: string
  modo_importacion?: string; polling_interval_minutes?: number; last_poll_at?: string
}

export default function TiendaIntegrarPage() {
  const [integraciones, setIntegraciones] = useState<Integracion[]>([])
  const [estadoTN, setEstadoTN] = useState<EstadoTN | null>(null)
  const [estadoPS, setEstadoPS] = useState<EstadoPS | null>(null)
  const [loading, setLoading] = useState(true)
  const [conectandoML, setConectandoML] = useState(false)
  const [conectandoTN, setConectandoTN] = useState(false)
  const [psForm, setPsForm] = useState({ store_url: '', api_key: '' })
  const [conectandoPS, setConectandoPS] = useState(false)
  const [psIntervalo, setPsIntervalo] = useState(10)
  const [guardandoIntervalo, setGuardandoIntervalo] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Integracion[]>('/integraciones'),
      api.get<EstadoTN>('/tiendanube/estado'),
      api.get<EstadoPS>('/prestashop/estado'),
    ]).then(([ints, tn, ps]) => {
      setIntegraciones(ints)
      setEstadoTN(tn)
      setEstadoPS(ps)
      if (ps.conectado) setPsIntervalo(ps.polling_interval_minutes ?? 10)
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

  async function conectarPS() {
    if (!psForm.store_url || !psForm.api_key) return alert('Completá la URL y la API key')
    setConectandoPS(true)
    try {
      await api.post('/prestashop/conectar', psForm)
      const ps = await api.get<EstadoPS>('/prestashop/estado')
      setEstadoPS(ps)
      if (ps.conectado) setPsIntervalo(ps.polling_interval_minutes ?? 10)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo conectar con PrestaShop. Verificá la URL y la API key.')
    } finally {
      setConectandoPS(false)
    }
  }

  async function desconectarPS() {
    if (!estadoPS?.integracion_id) return
    if (!confirm('¿Desconectar PrestaShop? Los pedidos dejarán de importarse.')) return
    await api.delete(`/integraciones/${estadoPS.integracion_id}`)
    setEstadoPS({ conectado: false })
  }

  async function cambiarModoPS(modo: string) {
    if (!estadoPS?.integracion_id) return
    setEstadoPS(prev => prev ? { ...prev, modo_importacion: modo } : prev)
    try {
      await api.put(`/prestashop/${estadoPS.integracion_id}/modo`, { modo })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al cambiar el modo')
      api.get<EstadoPS>('/prestashop/estado').then(setEstadoPS)
    }
  }

  async function guardarIntervalo() {
    if (!estadoPS?.integracion_id) return
    setGuardandoIntervalo(true)
    try {
      await api.put(`/prestashop/${estadoPS.integracion_id}/intervalo`, { intervalo_minutos: psIntervalo })
      setEstadoPS(prev => prev ? { ...prev, polling_interval_minutes: psIntervalo } : prev)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar el intervalo')
    } finally {
      setGuardandoIntervalo(false)
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
      {/* PrestaShop */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛍️</span>
          <div>
            <h2 className="font-bold">PrestaShop</h2>
            <p className="text-sm text-gray-500">Importación automática por polling · Configurá el intervalo</p>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">Verificando...</div>
        ) : estadoPS?.conectado ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <span>✅</span> Conectado · <strong>{estadoPS.store_url}</strong>
            </div>

            {/* Modo de importación */}
            <div className="border-t dark:border-gray-800 pt-3 space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">¿Qué hacemos con tus ventas de PrestaShop?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => cambiarModoPS('auto')}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    estadoPS.modo_importacion !== 'manual'
                      ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="font-bold text-sm">⚡ Automático</div>
                  <div className="text-xs text-gray-500 mt-0.5">Se importan todas las ventas</div>
                </button>
                <button onClick={() => cambiarModoPS('manual')}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    estadoPS.modo_importacion === 'manual'
                      ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="font-bold text-sm">✋ Manual</div>
                  <div className="text-xs text-gray-500 mt-0.5">Vos elegís cuáles distribuir</div>
                </button>
              </div>
              {estadoPS.modo_importacion === 'manual' && (
                <a href="/tienda/ventas-ps" className="inline-block text-sm text-brand hover:underline pt-1">
                  → Ver ventas pendientes de importar
                </a>
              )}
            </div>

            {/* Intervalo de polling */}
            <div className="border-t dark:border-gray-800 pt-3 space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Intervalo de sincronización</p>
              <div className="flex items-center gap-3">
                <input
                  type="number" min={1} max={60} value={psIntervalo}
                  onChange={e => setPsIntervalo(Number(e.target.value))}
                  className="input w-24 text-center"
                />
                <span className="text-sm text-gray-500">minutos</span>
                <button
                  onClick={guardarIntervalo}
                  disabled={guardandoIntervalo}
                  className="btn-primary text-sm disabled:opacity-50">
                  {guardandoIntervalo ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              {estadoPS.last_poll_at && (
                <p className="text-xs text-gray-400">
                  Última sincronización: {new Date(estadoPS.last_poll_at).toLocaleString('es-AR')}
                </p>
              )}
            </div>

            <button onClick={desconectarPS} className="btn-danger text-sm">
              Desconectar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300">Cómo conectar tu tienda PrestaShop:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Entrá a tu panel → Parámetros avanzados → Web Service</li>
                <li>Activá el Web Service y creá una nueva clave API</li>
                <li>Asigná permisos de lectura (GET) en: orders, addresses, customers</li>
                <li>Pegá la URL de tu tienda y la clave acá abajo</li>
              </ol>
            </div>
            <div className="space-y-2">
              <input
                type="url" placeholder="https://mi-tienda.com"
                value={psForm.store_url}
                onChange={e => setPsForm(f => ({ ...f, store_url: e.target.value }))}
                className="input w-full"
              />
              <input
                type="text" placeholder="API key (32 caracteres)"
                value={psForm.api_key}
                onChange={e => setPsForm(f => ({ ...f, api_key: e.target.value }))}
                className="input w-full font-mono text-sm"
              />
            </div>
            <button onClick={conectarPS} disabled={conectandoPS} className="btn-primary disabled:opacity-50">
              {conectandoPS ? 'Verificando conexión...' : 'Conectar PrestaShop'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
