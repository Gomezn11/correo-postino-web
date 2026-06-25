'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// El dashboard de tienda se unificó con Paquetes (las tarjetas de resumen viven ahí).
// Esta ruta queda como redirect para no romper enlaces/bookmarks viejos.
export default function TiendaDashboardRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/tienda/paquetes') }, [router])
  return null
}
