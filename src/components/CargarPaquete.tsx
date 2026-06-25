'use client'
/**
 * Carga manual de un paquete "huérfano" en el depósito (panel admin).
 * El admin escanea el QR de la etiqueta física (Mercado Libre, tienda, etc.),
 * el sistema verifica que no exista, y se carga eligiendo la tienda. El QR
 * escaneado queda adoptado (qr_externo) para que el chofer lo escanee igual.
 */
import { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { CORDONES } from '@/lib/zonas'

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

interface Tienda { id: string; nombre: string }
interface PaqueteExistente {
  qr_interno: string; comprador_nombre: string; estado_actual: string; tienda_nombre: string | null
}
interface ExisteRes { existe: boolean; paquete?: PaqueteExistente }
interface Props { tiendas: Tienda[]; onClose: () => void; onCreado: () => void }

export default function CargarPaquete({ tiendas, onClose, onCreado }: Props) {
  const [fase, setFase] = useState<'escaneo' | 'form'>('escaneo')
  const [qrExterno, setQrExterno] = useState('')
  const [existente, setExistente] = useState<PaqueteExistente | null>(null)
  const [verificando, setVerificando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const lockRef = useRef(false)

  // Formulario
  const [tiendaId, setTiendaId] = useState('')
  const [nombre, setNombre] = useState('')
  const [calle, setCalle] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [telefono, setTelefono] = useState('')
  const [tipo, setTipo] = useState('normal')

  const onScan = useCallback(async (qr: string) => {
    if (lockRef.current) return
    lockRef.current = true
    const code = qr.trim()
    setQrExterno(code)
    setVerificando(true)
    setError('')
    setExistente(null)
    try {
      const r = await api.get<ExisteRes>(`/paquetes/existe-qr?qr=${encodeURIComponent(code)}`)
      if (r.existe && r.paquete) {
        setExistente(r.paquete)        // ya cargado → no duplicar
      } else {
        setFase('form')                // libre → cargar
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al verificar el QR')
    } finally {
      setVerificando(false)
    }
  }, [])

  function reintentarEscaneo() {
    lockRef.current = false
    setExistente(null)
    setQrExterno('')
    setError('')
    setFase('escaneo')
  }

  function cargarManual() {
    lockRef.current = true
    setQrExterno('')
    setError('')
    setFase('form')
  }

  async function crear() {
    if (!tiendaId) { setError('Elegí una tienda'); return }
    if (!nombre || !calle || !localidad) { setError('Completá nombre, dirección y localidad'); return }
    setGuardando(true)
    setError('')
    try {
      await api.post('/paquetes', {
        tienda_id: tiendaId,
        comprador_nombre: nombre,
        direccion_calle: calle,
        localidad,
        zona: localidad,
        comprador_telefono: telefono,
        tipo_paquete: tipo,
        qr_externo: qrExterno || null,
      })
      onCreado()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar el paquete')
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md my-8"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
          <h2 className="font-black text-lg">Cargar paquete</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {fase === 'escaneo' && (
            <>
              <p className="text-sm text-gray-500">
                Escaneá el QR de la etiqueta del paquete (Mercado Libre, tienda, etc.).
              </p>
              <QRScanner onResult={onScan} active={!existente && !verificando} />
              {verificando && <p className="text-center text-sm text-gray-400">Verificando...</p>}

              {existente && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm space-y-2">
                  <div className="font-semibold text-yellow-800">Este paquete ya está cargado</div>
                  <div className="text-yellow-700">
                    {existente.comprador_nombre} · {existente.qr_interno}<br />
                    {existente.tienda_nombre && <>Tienda: {existente.tienda_nombre} · </>}
                    Estado: {existente.estado_actual}
                  </div>
                  <button onClick={reintentarEscaneo} className="text-brand text-sm hover:underline">
                    Escanear otro
                  </button>
                </div>
              )}

              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button onClick={cargarManual} className="text-sm text-gray-500 hover:underline">
                Cargar sin escanear (ingresar a mano)
              </button>
            </>
          )}

          {fase === 'form' && (
            <>
              {qrExterno ? (
                <div className="text-xs bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2 font-mono break-all">
                  QR adoptado: {qrExterno}
                </div>
              ) : (
                <div className="text-xs text-gray-400">Carga manual (sin QR escaneado)</div>
              )}

              <div>
                <label className="label">Tienda *</label>
                <select value={tiendaId} onChange={e => setTiendaId(e.target.value)} className="input">
                  <option value="">Elegí una tienda...</option>
                  {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Nombre del comprador *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Dirección (calle y número) *</label>
                <input value={calle} onChange={e => setCalle(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Localidad *</label>
                <select value={localidad} onChange={e => setLocalidad(e.target.value)} className="input">
                  <option value="">Elegí la localidad...</option>
                  {Object.entries(CORDONES).map(([cordon, locs]) => (
                    <optgroup key={cordon} label={cordon}>
                      {locs.map(l => <option key={l} value={l}>{l}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} className="input">
                  <option value="normal">Normal</option>
                  <option value="voluminoso">Voluminoso</option>
                  <option value="especial">Especial</option>
                </select>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button onClick={crear} disabled={guardando} className="btn-primary w-full disabled:opacity-50">
                {guardando ? 'Cargando...' : '✓ Cargar paquete'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
