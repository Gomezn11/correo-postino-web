'use client'
/**
 * Mapa con todos los choferes activos (panel admin).
 * Cada chofer es un marcador con su nombre y avance del reparto.
 * Usa Leaflet + OpenStreetMap (sin API key).
 */
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface ChoferMapa {
  chofer_id: string
  nombre: string
  lat: number | null
  lng: number | null
  entregados: number
  pendientes: number
  total: number
  actualizado_at?: string | null
}

function choferIcon(nombre: string) {
  const inicial = (nombre || '?').charAt(0).toUpperCase()
  return L.divIcon({
    html: `<div style="
      background:#1a56db;width:34px;height:34px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)">
      <span style="transform:rotate(45deg);color:white;font-weight:800;font-size:14px">${inicial}</span>
    </div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  })
}

// Centro por defecto: CABA
const CENTRO_DEFAULT: [number, number] = [-34.6037, -58.3816]

function AjustarVista({ puntos }: { puntos: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (puntos.length === 1) {
      map.setView(puntos[0], 14)
    } else if (puntos.length > 1) {
      map.fitBounds(puntos, { padding: [40, 40] })
    }
  }, [puntos, map])
  return null
}

export default function MapaChoferes({ choferes }: { choferes: ChoferMapa[] }) {
  const conUbicacion = choferes.filter(c => c.lat != null && c.lng != null)
  const puntos = conUbicacion.map(c => [c.lat as number, c.lng as number] as [number, number])

  return (
    <MapContainer center={CENTRO_DEFAULT} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {conUbicacion.map(c => (
        <Marker key={c.chofer_id} position={[c.lat as number, c.lng as number]} icon={choferIcon(c.nombre)}>
          <Popup>
            <strong>{c.nombre}</strong><br />
            {c.entregados}/{c.total} entregados · {c.pendientes} en camino
            {c.actualizado_at && (
              <><br /><span style={{ fontSize: 11, color: '#666' }}>
                {new Date(c.actualizado_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span></>
            )}
          </Popup>
        </Marker>
      ))}
      <AjustarVista puntos={puntos} />
    </MapContainer>
  )
}
