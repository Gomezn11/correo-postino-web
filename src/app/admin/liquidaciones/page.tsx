'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

type Tab = 'margen' | 'tiendas' | 'choferes'

interface FilaTienda { tienda_id: string; nombre: string; cantidad: number; total: number }
interface FilaChofer { chofer_id: string; nombre: string; cantidad: number; total: number }
interface Margen {
  periodo: string; ingresos: number; costos: number; margen: number; margen_pct: number
  desglose_tiendas: FilaTienda[]; desglose_choferes: FilaChofer[]
}
interface ResumenTiendas { periodo: string; total_general: number; tiendas: FilaTienda[] }
interface ResumenChoferes { periodo: string; total_general: number; choferes: FilaChofer[] }

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function money(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
}

export default function AdminLiquidacionesPage() {
  const hoy = new Date()
  const [tab, setTab] = useState<Tab>('margen')
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)

  const [margen, setMargen] = useState<Margen | null>(null)
  const [tiendas, setTiendas] = useState<ResumenTiendas | null>(null)
  const [choferes, setChoferes] = useState<ResumenChoferes | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bajando, setBajando] = useState('')

  const qs = `anio=${anio}&mes=${mes}`

  const cargar = useCallback(() => {
    setLoading(true); setError('')
    const req =
      tab === 'margen' ? api.get<Margen>(`/admin/liquidaciones/margen?${qs}`).then(setMargen)
      : tab === 'tiendas' ? api.get<ResumenTiendas>(`/admin/liquidaciones/tiendas?${qs}`).then(setTiendas)
      : api.get<ResumenChoferes>(`/admin/liquidaciones/choferes?${qs}`).then(setChoferes)
    req.catch(e => setError(e instanceof Error ? e.message : 'Error cargando datos'))
       .finally(() => setLoading(false))
  }, [tab, qs])

  useEffect(() => { cargar() }, [cargar])

  async function descargar(path: string, name: string, key: string) {
    setBajando(key)
    try { await api.download(path, name) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al descargar') }
    finally { setBajando('') }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Liquidaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresos de tiendas, costos de choferes y margen del período.</p>
        </div>
        {/* Selector de período */}
        <div className="flex gap-2">
          <select className="input w-auto" value={mes} onChange={e => setMes(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-auto" value={anio} onChange={e => setAnio(Number(e.target.value))}>
            {[hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2].map(a =>
              <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {([['margen', 'Margen'], ['tiendas', 'Tiendas'], ['choferes', 'Choferes']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-brand' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {loading ? (
        <div className="card text-center text-gray-400 py-10">Cargando...</div>
      ) : (
        <>
          {/* ---------- MARGEN ---------- */}
          {tab === 'margen' && margen && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card text-center">
                  <div className="text-sm text-gray-500">Ingresos (tiendas)</div>
                  <div className="text-3xl font-black text-green-600 mt-1">{money(margen.ingresos)}</div>
                </div>
                <div className="card text-center">
                  <div className="text-sm text-gray-500">Costos (choferes)</div>
                  <div className="text-3xl font-black text-orange-600 mt-1">{money(margen.costos)}</div>
                </div>
                <div className="card text-center bg-brand text-white border-brand">
                  <div className="text-sm opacity-90">Margen</div>
                  <div className="text-3xl font-black mt-1">{money(margen.margen)}</div>
                  <div className="text-xs opacity-90 mt-1">{margen.margen_pct}% sobre ingresos</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h2 className="font-bold mb-3">Ingresos por tienda</h2>
                  {margen.desglose_tiendas.filter(t => t.total > 0).length === 0
                    ? <p className="text-sm text-gray-400">Sin movimientos este mes.</p>
                    : <ul className="divide-y text-sm">
                        {margen.desglose_tiendas.filter(t => t.total > 0).map(t => (
                          <li key={t.tienda_id} className="flex justify-between py-2">
                            <span className="text-gray-700 dark:text-gray-200">{t.nombre} <span className="text-gray-400">({t.cantidad})</span></span>
                            <span className="font-semibold">{money(t.total)}</span>
                          </li>
                        ))}
                      </ul>}
                </div>
                <div className="card">
                  <h2 className="font-bold mb-3">Costos por chofer</h2>
                  {margen.desglose_choferes.filter(c => c.total > 0).length === 0
                    ? <p className="text-sm text-gray-400">Sin movimientos este mes.</p>
                    : <ul className="divide-y text-sm">
                        {margen.desglose_choferes.filter(c => c.total > 0).map(c => (
                          <li key={c.chofer_id} className="flex justify-between py-2">
                            <span className="text-gray-700 dark:text-gray-200">{c.nombre} <span className="text-gray-400">({c.cantidad})</span></span>
                            <span className="font-semibold">{money(c.total)}</span>
                          </li>
                        ))}
                      </ul>}
                </div>
              </div>
            </div>
          )}

          {/* ---------- TIENDAS ---------- */}
          {tab === 'tiendas' && tiendas && (
            <div className="card p-0 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800">
                <span className="font-bold">Total a facturar</span>
                <span className="font-black text-lg text-brand">{money(tiendas.total_general)}</span>
              </div>
              {tiendas.tiendas.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No hay tiendas.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tienda</th>
                      <th className="px-4 py-3 font-medium text-center">Envíos</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium text-right">Excel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {tiendas.tiendas.map(t => (
                      <tr key={t.tienda_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3 font-medium">{t.nombre}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{t.cantidad}</td>
                        <td className="px-4 py-3 text-right font-semibold">{money(t.total)}</td>
                        <td className="px-4 py-3 text-right">
                          <button disabled={t.cantidad === 0 || bajando === t.tienda_id}
                            onClick={() => descargar(`/admin/liquidaciones/tienda/${t.tienda_id}/excel?${qs}`, `liquidacion_${t.nombre}.xlsx`, t.tienda_id)}
                            className="text-xs text-brand hover:underline disabled:text-gray-300 disabled:no-underline">
                            {bajando === t.tienda_id ? '...' : '↓ Excel'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ---------- CHOFERES ---------- */}
          {tab === 'choferes' && choferes && (
            <div className="card p-0 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800">
                <span className="font-bold">Total a pagar</span>
                <span className="font-black text-lg text-brand">{money(choferes.total_general)}</span>
              </div>
              {choferes.choferes.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No hay choferes.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Chofer</th>
                      <th className="px-4 py-3 font-medium text-center">Entregas</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {choferes.choferes.map(c => (
                      <tr key={c.chofer_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3 font-medium">{c.nombre}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{c.cantidad}</td>
                        <td className="px-4 py-3 text-right font-semibold">{money(c.total)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col sm:flex-row sm:justify-end gap-1">
                            <button disabled={c.cantidad === 0 || bajando === c.chofer_id + 'pdf'}
                              onClick={() => descargar(`/admin/liquidaciones/chofer/${c.chofer_id}/pdf?${qs}`, `liquidacion_${c.nombre}.pdf`, c.chofer_id + 'pdf')}
                              className="text-xs text-brand hover:underline disabled:text-gray-300 disabled:no-underline">
                              {bajando === c.chofer_id + 'pdf' ? '...' : '↓ PDF'}
                            </button>
                            <button disabled={c.cantidad === 0 || bajando === c.chofer_id + 'xls'}
                              onClick={() => descargar(`/admin/liquidaciones/chofer/${c.chofer_id}/excel?${qs}`, `liquidacion_${c.nombre}.xlsx`, c.chofer_id + 'xls')}
                              className="text-xs text-brand hover:underline disabled:text-gray-300 disabled:no-underline">
                              {bajando === c.chofer_id + 'xls' ? '...' : '↓ Excel'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
