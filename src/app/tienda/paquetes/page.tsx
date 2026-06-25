'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import EstadoBadge, { TODOS_ESTADOS, LABELS } from '@/components/EstadoBadge'
import { CORDONES, cordonDeLocalidad } from '@/lib/zonas'

interface Paquete {
  id: string; qr_interno: string; comprador_nombre: string; comprador_direccion: string
  zona: string; tipo_paquete: string; estado_actual: string; created_at: string
}

async function descargarEtiqueta(paqueteId: string, qr: string) {
  const token = sessionStorage.getItem('cp_token')
  const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''
  const r = await fetch(`${BASE}/etiquetas/${paqueteId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error('No se pudo generar la etiqueta')
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `etiqueta_${qr}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

const TIPOS = ['normal', 'voluminoso', 'especial']

// Tarjetas de resumen (clickeables → filtran por estado)
const ESTADOS_TARJETA = [
  { key: 'pendiente_colecta', label: 'Pendiente de retiro', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { key: 'despachado',        label: 'Despachados',         color: 'text-sky-600',    bg: 'bg-sky-50' },
  { key: 'en_camino',         label: 'En camino',           color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'entregado',         label: 'Entregados',          color: 'text-green-600',  bg: 'bg-green-50' },
]

// Fecha local YYYY-MM-DD del paquete (created_at viene en UTC)
function fechaLocalISO(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FORM_EMPTY = {
  comprador_nombre: '', direccion_calle: '', piso_depto: '', localidad: '',
  comprador_telefono: '', comprador_dni: '', zona: '',
  tipo_paquete: 'normal', descripcion_especial: '',
  horario_comercial: false, horario_preferido: '',
}

export default function TiendaPaquetesPage() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [loading, setLoading] = useState(true)
  // Estado inicial desde la URL (?estado=...) para los enlaces del dashboard.
  // Si el estado no es válido (URL vieja, estado eliminado), se ignora y muestra todos.
  const [filtroEstado, setFiltroEstado] = useState(() => {
    if (typeof window === 'undefined') return ''
    const e = new URLSearchParams(window.location.search).get('estado') ?? ''
    return TODOS_ESTADOS.includes(e) ? e : ''
  })
  const [busqueda, setBusqueda] = useState('')
  const [filtroZona, setFiltroZona] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_EMPTY)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [descargando, setDescargando] = useState<string | null>(null)

  function cargar() {
    // Traemos todos los paquetes de la tienda; los filtros (incluido estado) se aplican
    // en el cliente, así las tarjetas de resumen siempre cuentan sobre el total.
    return api.get<{ items: Paquete[] }>('/paquetes?limit=200')
      .then(r => setPaquetes(r.items ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const filtrados = paquetes.filter(p => {
    const txt = busqueda.toLowerCase()
    const matchBusqueda = !busqueda ||
      p.comprador_nombre.toLowerCase().includes(txt) ||
      p.qr_interno.toLowerCase().includes(txt) ||
      p.comprador_direccion.toLowerCase().includes(txt)
    const matchEstado = !filtroEstado || p.estado_actual === filtroEstado
    const matchZona = !filtroZona || p.zona === filtroZona
    const matchTipo = !filtroTipo || p.tipo_paquete === filtroTipo
    const fechaP = fechaLocalISO(p.created_at)
    const matchDesde = !fechaDesde || fechaP >= fechaDesde
    const matchHasta = !fechaHasta || fechaP <= fechaHasta
    return matchEstado && matchBusqueda && matchZona && matchTipo && matchDesde && matchHasta
  })

  const hayFiltros = !!(busqueda || filtroEstado || filtroZona || filtroTipo || fechaDesde || fechaHasta)
  function limpiarFiltros() {
    setBusqueda(''); setFiltroEstado(''); setFiltroZona('')
    setFiltroTipo(''); setFechaDesde(''); setFechaHasta('')
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR')
  }

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function crearPaquete(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreando(true)
    try {
      await api.post('/paquetes', {
        comprador_nombre: form.comprador_nombre,
        direccion_calle: form.direccion_calle,
        piso_depto: form.piso_depto || undefined,
        localidad: form.localidad,
        comprador_telefono: form.comprador_telefono,
        comprador_dni: form.comprador_dni || undefined,
        zona: form.localidad || form.zona,
        tipo_paquete: form.tipo_paquete,
        descripcion_especial: form.descripcion_especial || undefined,
        horario_comercial: form.horario_comercial,
        horario_preferido: form.horario_comercial ? form.horario_preferido || undefined : undefined,
      })
      setForm(FORM_EMPTY)
      setMostrarForm(false)
      setLoading(true)
      await cargar()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear paquete')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Mis Paquetes</h1>
        <button
          onClick={() => { setMostrarForm(v => !v); setError('') }}
          className="btn-primary"
        >
          {mostrarForm ? 'Cancelar' : '+ Nuevo paquete'}
        </button>
      </div>

      {/* Tarjetas de resumen (clic = filtrar por estado). Ocultas al crear un paquete */}
      {!mostrarForm && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ESTADOS_TARJETA.map(c => {
            const count = paquetes.filter(p => p.estado_actual === c.key).length
            const activa = filtroEstado === c.key
            return (
              <button key={c.key}
                onClick={() => setFiltroEstado(activa ? '' : c.key)}
                className={`card ${c.bg} text-left transition-all hover:shadow-md ${activa ? 'ring-2 ring-brand' : ''}`}>
                <div className={`text-3xl font-black ${c.color}`}>{count}</div>
                <div className="text-sm text-gray-600 mt-1">{c.label}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Formulario nuevo paquete */}
      {mostrarForm && (
        <div className="card max-w-2xl">
          <h2 className="font-bold mb-4 text-lg">Nuevo envio manual</h2>
          <form onSubmit={crearPaquete} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre del destinatario *</label>
                <input value={form.comprador_nombre} onChange={e => set('comprador_nombre', e.target.value)}
                  className="input" required placeholder="Maria Gonzalez" />
              </div>
              <div>
                <label className="label">Telefono *</label>
                <input value={form.comprador_telefono} onChange={e => set('comprador_telefono', e.target.value)}
                  className="input" required placeholder="1155555555" />
              </div>
              <div>
                <label className="label">Calle y numero *</label>
                <input value={form.direccion_calle} onChange={e => set('direccion_calle', e.target.value)}
                  className="input" required placeholder="Av. Corrientes 1234" />
              </div>
              <div>
                <label className="label">Piso / Depto</label>
                <input value={form.piso_depto} onChange={e => set('piso_depto', e.target.value)}
                  className="input" placeholder="3B" />
              </div>
              <div>
                <label className="label">Localidad *</label>
                <select value={form.localidad} onChange={e => set('localidad', e.target.value)}
                  className="input" required>
                  <option value="">— Elegí la localidad —</option>
                  {Object.entries(CORDONES).map(([cordon, locs]) => (
                    <optgroup key={cordon} label={cordon}>
                      {locs.map(l => <option key={l} value={l}>{l}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">DNI del destinatario</label>
                <input value={form.comprador_dni} onChange={e => set('comprador_dni', e.target.value)}
                  className="input" placeholder="20123456" />
              </div>
              <div>
                <label className="label">Cordón</label>
                <div className="input bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 flex items-center">
                  {form.localidad ? (cordonDeLocalidad(form.localidad) || 'Sin clasificar') : '— se completa con la localidad —'}
                </div>
              </div>
              <div>
                <label className="label">Tipo de paquete *</label>
                <select value={form.tipo_paquete} onChange={e => set('tipo_paquete', e.target.value)} className="input">
                  {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Descripcion especial (opcional)</label>
              <input value={form.descripcion_especial} onChange={e => set('descripcion_especial', e.target.value)}
                className="input" placeholder="Fragil, no apilar..." />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="horario_comercial" checked={form.horario_comercial}
                onChange={e => set('horario_comercial', e.target.checked)}
                className="w-4 h-4 accent-blue-600" />
              <label htmlFor="horario_comercial" className="text-sm text-gray-700 dark:text-gray-200">
                Entrega solo en horario comercial
              </label>
            </div>

            {form.horario_comercial && (
              <div>
                <label className="label">Horario preferido *</label>
                <input value={form.horario_preferido} onChange={e => set('horario_preferido', e.target.value)}
                  className="input" required={form.horario_comercial} placeholder="Lunes a viernes 9-18hs" />
              </div>
            )}

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={creando} className="btn-primary disabled:opacity-50">
                {creando ? 'Creando...' : 'Crear paquete'}
              </button>
              <button type="button" onClick={() => { setMostrarForm(false); setError('') }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!mostrarForm && (
      <>
      {/* Filtros */}
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Buscar</label>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Nombre, QR o dirección..." className="input" />
          </div>
          <div>
            <label className="label">Estado</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input w-auto">
              <option value="">Todos</option>
              {TODOS_ESTADOS.map(e => <option key={e} value={e}>{LABELS[e]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Localidad</label>
            <select value={filtroZona} onChange={e => setFiltroZona(e.target.value)} className="input w-auto">
              <option value="">Todas</option>
              {Object.entries(CORDONES).map(([cordon, locs]) => (
                <optgroup key={cordon} label={cordon}>
                  {locs.map(l => <option key={l} value={l}>{l}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input w-auto">
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input type="date" value={fechaDesde} max={fechaHasta || undefined}
              onChange={e => setFechaDesde(e.target.value)} className="input w-auto" />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" value={fechaHasta} min={fechaDesde || undefined}
              onChange={e => setFechaHasta(e.target.value)} className="input w-auto" />
          </div>
          {hayFiltros && (
            <button onClick={limpiarFiltros}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40">
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="text-xs text-gray-400">
          Mostrando {filtrados.length} de {paquetes.length} paquetes
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {paquetes.length === 0 ? 'Todavia no hay paquetes. Crea el primero con el boton de arriba.' : 'No hay paquetes con ese filtro.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">QR</th>
                  <th className="px-4 py-3 font-medium">Destinatario</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Direccion</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Zona</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.qr_interno}</td>
                    <td className="px-4 py-3 font-medium">{p.comprador_nombre}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs max-w-[180px] truncate">{p.comprador_direccion}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.zona}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={p.estado_actual} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{formatFecha(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <button
                          onClick={async () => {
                            setDescargando(p.id)
                            try { await descargarEtiqueta(p.id, p.qr_interno) }
                            catch { alert('Error al generar la etiqueta') }
                            finally { setDescargando(null) }
                          }}
                          disabled={descargando === p.id}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                        >
                          {descargando === p.id ? 'Generando...' : '🖨 Etiqueta'}
                        </button>
                        <span className="text-gray-300">|</span>
                        <a href={`/tracking/${p.qr_interno}`} target="_blank"
                          className="text-brand hover:underline text-xs inline-flex items-center gap-1">
                          {p.estado_actual === 'en_camino' && (
                            <span className="relative flex h-2 w-2" title="En camino — seguilo en el mapa">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                          )}
                          {p.estado_actual === 'en_camino' ? 'En vivo' : 'Tracking'} &rarr;
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 text-xs text-gray-400 border-t">{filtrados.length} paquetes</div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}
