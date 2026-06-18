'use client'
/**
 * Mapa en vivo de un solo punto: la ubicación del repartidor.
 * Usa Leaflet + OpenStreetMap (sin API key). Se recentra cuando llega
 * una posición nueva (el padre hace polling al backend).
 */
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const camionIcon = L.divIcon({
  html: `<div style="
    background:#1a56db;width:36px;height:36px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;font-size:18px;
    border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)">🚚</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

function Recentrar({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], map.getZoom()) }, [lat, lng, map])
  return null
}

interface Props {
  lat: number
  lng: number
  actualizadoAt?: string
}

export default function MapaEnVivo({ lat, lng, actualizadoAt }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={camionIcon}>
        <Popup>
          Tu repartidor está acá
          {actualizadoAt && (
            <><br /><span style={{ fontSize: 11, color: '#666' }}>
              {new Date(actualizadoAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span></>
          )}
        </Popup>
      </Marker>
      <Recentrar lat={lat} lng={lng} />
    </MapContainer>
  )
}
