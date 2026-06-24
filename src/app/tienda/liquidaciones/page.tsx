'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

interface Item { paquete_id: string; receptor: string; direccion: string; zona: string; tipo: string; monto: number }
interface Dia { fecha: string; items: Item[]; total_dia: number }
interface Resumen {
  tienda: { id: string; nombre: string }
  periodo: string
  cantidad: number
  total: number
  dias: Dia[]
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const TIPO_LABEL: Record<string, string> = { normal: 'Normal', voluminoso: 'Voluminoso', especial: 'Especial' }

function money(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
}

export default function TiendaLiquidacionPage() {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [data, setData] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(() => {
    setLoading(true); setError('')
    api.get<Resumen>(`/tienda/liquidaciones/mi-resumen?anio=${anio}&mes=${mes}`)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar la liquidación'))
      .finally(() => setLoading(false))
  }, [anio, mes])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Mi liquidación</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lo que vas pagando por los paquetes que la logística ya retiró. Se actualiza a medida que se despachan.
          </p>
        </div>
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

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {loading ? (
        <div className="card text-center text-gray-400 py-10">Cargando...</div>
      ) : data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card text-center">
              <div className="text-sm text-gray-500">Paquetes despachados</div>
              <div className="text-3xl font-black text-brand mt-1">{data.cantidad}</div>
            </div>
            <div className="card text-center bg-brand text-white border-brand">
              <div className="text-sm opacity-90">Total a pagar</div>
              <div className="text-3xl font-black mt-1">{money(data.total)}</div>
            </div>
          </div>

          {/* Detalle por día */}
          {data.dias.length === 0 ? (
            <div className="card text-center py-12 space-y-2">
              <div className="text-4xl">🧾</div>
              <p className="font-semibold text-gray-700 dark:text-gray-200">Todavía no hay paquetes despachados este mes</p>
              <p className="text-sm text-gray-400">Cuando la logística retire tus paquetes, vas a ver acá cuánto pagás por cada uno.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.dias.map(dia => (
                <div key={dia.fecha} className="card p-0 overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800">
                    <span className="font-bold text-sm capitalize">
                      {new Date(dia.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })}
                    </span>
                    <span className="font-black text-brand">{money(dia.total_dia)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-500 border-b dark:border-gray-800">
                        <tr>
                          <th className="px-4 py-2 font-medium">Receptor</th>
                          <th className="px-4 py-2 font-medium hidden sm:table-cell">Zona</th>
                          <th className="px-4 py-2 font-medium">Tipo</th>
                          <th className="px-4 py-2 font-medium text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-800">
                        {dia.items.map(it => (
                          <tr key={it.paquete_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="px-4 py-2 font-medium">{it.receptor}</td>
                            <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">{it.zona}</td>
                            <td className="px-4 py-2 text-gray-500">{TIPO_LABEL[it.tipo] ?? it.tipo}</td>
                            <td className="px-4 py-2 text-right font-semibold">{money(it.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
