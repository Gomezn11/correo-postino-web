'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

interface Entidad { id: string; nombre: string }
interface Celda { zona: string; tipo_paquete: string; precio: number }
interface GrillaResp {
  zonas: string[]
  tipos: string[]
  grilla: Celda[]
}
interface Entidades {
  zonas: string[]
  tipos: string[]
  tiendas: Entidad[]
  choferes: Entidad[]
}

const TIPO_LABEL: Record<string, string> = {
  normal: 'Normal', voluminoso: 'Voluminoso', especial: 'Especial',
}

type Tab = 'tiendas' | 'choferes'

export default function AdminTarifasPage() {
  const [tab, setTab] = useState<Tab>('tiendas')
  const [ent, setEnt] = useState<Entidades | null>(null)
  const [selId, setSelId] = useState('')
  const [zonas, setZonas] = useState<string[]>([])
  const [tipos, setTipos] = useState<string[]>([])
  const [precios, setPrecios] = useState<Record<string, string>>({})
  const [loadingGrilla, setLoadingGrilla] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Cargar entidades una vez
  useEffect(() => {
    api.get<Entidades>('/admin/tarifarios/entidades')
      .then(e => { setEnt(e); setZonas(e.zonas); setTipos(e.tipos) })
      .catch(err => setError(err instanceof Error ? err.message : 'Error cargando datos'))
  }, [])

  const lista = tab === 'tiendas' ? (ent?.tiendas ?? []) : (ent?.choferes ?? [])

  const cargarGrilla = useCallback((id: string) => {
    if (!id) return
    setLoadingGrilla(true)
    setSaved(false)
    setError('')
    api.get<GrillaResp>(`/admin/tarifarios/${tab === 'tiendas' ? 'tienda' : 'chofer'}/${id}`)
      .then(r => {
        setZonas(r.zonas); setTipos(r.tipos)
        const map: Record<string, string> = {}
        r.grilla.forEach(c => { map[`${c.zona}|${c.tipo_paquete}`] = c.precio ? String(c.precio) : '' })
        setPrecios(map)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Error cargando tarifas'))
      .finally(() => setLoadingGrilla(false))
  }, [tab])

  // Al cambiar de tab, resetear selección
  useEffect(() => { setSelId(''); setPrecios({}); setSaved(false) }, [tab])

  function elegir(id: string) {
    setSelId(id)
    cargarGrilla(id)
  }

  function setCelda(zona: string, tipo: string, valor: string) {
    // Solo números y punto decimal
    const limpio = valor.replace(/[^\d.]/g, '')
    setPrecios(prev => ({ ...prev, [`${zona}|${tipo}`]: limpio }))
    setSaved(false)
  }

  async function guardar() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const tarifas: Celda[] = []
      zonas.forEach(z => tipos.forEach(t => {
        const v = parseFloat(precios[`${z}|${t}`] || '0') || 0
        tarifas.push({ zona: z, tipo_paquete: t, precio: v })
      }))
      await api.put(`/admin/tarifarios/${tab === 'tiendas' ? 'tienda' : 'chofer'}/${selId}`, { tarifas })
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const esTienda = tab === 'tiendas'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Tarifas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Precio por zona y tipo de paquete. {esTienda
            ? 'Lo que le cobrás a cada tienda (ingreso).'
            : 'Lo que le pagás a cada chofer (costo).'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('tiendas')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            esTienda ? 'bg-white shadow-sm text-brand' : 'text-gray-500 hover:text-gray-700'}`}>
          Tiendas (ingresos)
        </button>
        <button onClick={() => setTab('choferes')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            !esTienda ? 'bg-white shadow-sm text-brand' : 'text-gray-500 hover:text-gray-700'}`}>
          Choferes (costos)
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}

      {/* Selector de entidad */}
      <div className="card">
        <label className="label">{esTienda ? 'Elegí una tienda' : 'Elegí un chofer'}</label>
        {lista.length === 0 ? (
          <p className="text-sm text-gray-400">
            No hay {esTienda ? 'tiendas' : 'choferes'} registrados todavía.
          </p>
        ) : (
          <select className="input max-w-sm" value={selId} onChange={e => elegir(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {lista.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Grilla de tarifas */}
      {selId && (
        <div className="card p-0 overflow-hidden">
          {loadingGrilla ? (
            <div className="p-8 text-center text-gray-400">Cargando tarifas...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">Zona</th>
                      {tipos.map(t => (
                        <th key={t} className="px-4 py-3 font-medium text-center">{TIPO_LABEL[t] ?? t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {zonas.map(z => (
                      <tr key={z} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{z}</td>
                        {tipos.map(t => (
                          <td key={t} className="px-3 py-2">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input
                                inputMode="decimal"
                                value={precios[`${z}|${t}`] ?? ''}
                                onChange={e => setCelda(z, t, e.target.value)}
                                placeholder="0"
                                className="w-full border border-gray-300 rounded-lg pl-6 pr-2 py-1.5 text-sm text-right
                                  focus:outline-none focus:ring-2 focus:ring-brand/40"
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t">
                <span className={`text-sm transition-opacity ${saved ? 'opacity-100 text-green-600' : 'opacity-0'}`}>
                  ✓ Tarifas guardadas
                </span>
                <button onClick={guardar} disabled={saving} className="btn-primary disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar tarifas'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
