'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { CORDONES } from '@/lib/zonas'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'

interface Stats {
  total_paquetes: number
  por_estado: Record<string, number>
  repartos_activos: number
}
interface Tienda { id: string; nombre: string }

const LABELS: Record<string, string> = {
  pendiente_colecta: 'Pendiente de retiro', despachado: 'Despachado',
  en_centro_distribucion: 'En centro', en_camino: 'En camino', entregado: 'Entregado',
  no_entregado_ausente: 'Ausente', no_entregado_domicilio_no_encontrado: 'Dom. no encontrado',
  reprogramado_por_comprador: 'Reprog. comprador', reprogramado_por_logistica: 'Reprog. logística',
  no_cerrado: 'No cerrado',
}

const COLORES: Record<string, string> = {
  pendiente_colecta: '#f59e0b', despachado: '#3b82f6',
  en_centro_distribucion: '#6366f1', en_camino: '#8b5cf6',
  entregado: '#22c55e',
  no_entregado_ausente: '#ef4444', no_entregado_domicilio_no_encontrado: '#ef4444',
  reprogramado_por_comprador: '#f97316', reprogramado_por_logistica: '#f97316',
  no_cerrado: '#9ca3af',
}

type Preset = 'hoy' | 'semana' | 'mes' | 'todo' | 'custom'

function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function rangoPreset(p: Preset): { desde: string; hasta: string } {
  const hoy = new Date()
  if (p === 'hoy') return { desde: fechaLocal(hoy), hasta: fechaLocal(hoy) }
  if (p === 'semana') { const d = new Date(); d.setDate(d.getDate() - 6); return { desde: fechaLocal(d), hasta: fechaLocal(hoy) } }
  if (p === 'mes') return { desde: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`, hasta: fechaLocal(hoy) }
  return { desde: '', hasta: '' } // todo
}
function fmt(d: string): string {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y.slice(2)}`
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tiendas, setTiendas] = useState<Tienda[]>([])

  const [preset, setPreset] = useState<Preset>('mes')
  const inicial = rangoPreset('mes')
  const [desde, setDesde] = useState(inicial.desde)
  const [hasta, setHasta] = useState(inicial.hasta)
  const [tiendaId, setTiendaId] = useState('')
  const [zona, setZona] = useState('')

  useEffect(() => {
    api.get<Tienda[]>('/admin/usuarios?role=tienda').then(setTiendas).catch(() => {})
  }, [])

  const cargar = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (desde) params.set('fecha_desde', `${desde}T00:00:00`)
    if (hasta) params.set('fecha_hasta', `${hasta}T23:59:59`)
    if (tiendaId) params.set('tienda_id', tiendaId)
    if (zona) params.set('zona', zona)
    const qs = params.toString()
    api.get<Stats>(`/admin/stats${qs ? `?${qs}` : ''}`)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [desde, hasta, tiendaId, zona])

  useEffect(() => { cargar() }, [cargar])

  function aplicarPreset(p: Preset) {
    setPreset(p)
    if (p !== 'custom') { const r = rangoPreset(p); setDesde(r.desde); setHasta(r.hasta) }
  }

  const dataPie = stats
    ? Object.entries(stats.por_estado).map(([estado, value]) => ({
        name: LABELS[estado] ?? estado, value, color: COLORES[estado] ?? '#9ca3af',
      }))
    : []

  const PRESETS: [Preset, string][] = [['hoy', 'Hoy'], ['semana', '7 días'], ['mes', 'Este mes'], ['todo', 'Todo']]
  const etiquetaPeriodo = preset === 'todo' ? 'Histórico completo'
    : desde && hasta ? `${fmt(desde)} — ${fmt(hasta)}` : 'Período personalizado'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-black">Panel Admin</h1>
        <span className="text-sm text-gray-500">📅 {etiquetaPeriodo}</span>
      </div>

      {/* Filtros */}
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([p, label]) => (
            <button key={p} onClick={() => aplicarPreset(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                preset === p ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Desde</label>
            <input type="date" value={desde} max={hasta || undefined}
              onChange={e => { setDesde(e.target.value); setPreset('custom') }} className="input w-auto" />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" value={hasta} min={desde || undefined}
              onChange={e => { setHasta(e.target.value); setPreset('custom') }} className="input w-auto" />
          </div>
          <div>
            <label className="label">Tienda</label>
            <select value={tiendaId} onChange={e => setTiendaId(e.target.value)} className="input w-auto">
              <option value="">Todas</option>
              {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Localidad</label>
            <select value={zona} onChange={e => setZona(e.target.value)} className="input w-auto">
              <option value="">Todas</option>
              {Object.entries(CORDONES).map(([cordon, locs]) => (
                <optgroup key={cordon} label={cordon}>
                  {locs.map(l => <option key={l} value={l}>{l}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center animate-in">
              <div className="text-3xl font-black text-brand">{stats?.total_paquetes ?? 0}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total paquetes</div>
            </div>
            <div className="card text-center animate-in">
              <div className="text-3xl font-black text-green-600">{stats?.por_estado['entregado'] ?? 0}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Entregados</div>
            </div>
            <div className="card text-center animate-in">
              <div className="text-3xl font-black text-violet-600">{stats?.por_estado['en_camino'] ?? 0}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">En camino</div>
            </div>
            <div className="card text-center animate-in">
              <div className="text-3xl font-black text-orange-500">{stats?.repartos_activos ?? 0}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Repartos activos</div>
            </div>
          </div>

          {/* Gráfico + barras */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-bold mb-2">Distribución de paquetes</h2>
              {dataPie.length === 0 ? (
                <p className="text-sm text-gray-400 py-12 text-center">Sin paquetes en este período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={dataPie} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {dataPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="font-bold mb-4">Por estado</h2>
              {dataPie.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos en este período.</p>
              ) : (
                <div className="space-y-2.5">
                  {dataPie.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{d.name}</span>
                      <span className="font-bold text-sm">{d.value}</span>
                      <div className="w-28 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${(d.value / (stats?.total_paquetes || 1)) * 100}%`, background: d.color,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Liquidaciones', href: '/admin/liquidaciones', emoji: '💰' },
              { label: 'Mapa en vivo', href: '/admin/mapa', emoji: '🗺️' },
              { label: 'Tarifas', href: '/admin/tarifas', emoji: '🏷️' },
              { label: 'Satisfacción', href: '/admin/feedback', emoji: '⭐' },
            ].map(l => (
              <a key={l.href} href={l.href}
                className="card hover:shadow-md hover:-translate-y-0.5 transition-all text-center">
                <div className="text-3xl mb-2">{l.emoji}</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{l.label}</div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
