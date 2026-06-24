/**
 * Zonas de reparto = CABA + cordones del AMBA.
 * Espejo de backend/core/zonas.py — mantener ambos sincronizados.
 * El precio se define por cordón; cada localidad pertenece a un cordón.
 */
export const CORDONES: Record<string, string[]> = {
  'CABA': ['CABA'],
  'Cordón 1': [
    'Avellaneda', 'Lanús', 'Vicente López', 'San Isidro', 'San Fernando',
    'General San Martín', 'Tres de Febrero', 'Morón', 'La Matanza Norte',
  ],
  'Cordón 2': [
    'Tigre', 'San Miguel', 'Malvinas Argentinas', 'José C. Paz', 'Moreno',
    'Ituzaingó', 'Hurlingham', 'Merlo', 'La Matanza Sur', 'Ezeiza',
    'Esteban Echeverría', 'Lomas de Zamora', 'Almirante Brown', 'Quilmes',
    'Berazategui', 'Florencio Varela', 'Presidente Perón',
  ],
  'Cordón 3': [
    'Escobar', 'Pilar', 'Zárate', 'Campana', 'Luján', 'General Rodríguez',
    'Marcos Paz', 'Cañuelas', 'San Vicente', 'Coronel Brandsen',
    'La Plata', 'Ensenada', 'Berisso',
  ],
}

/** Cordones en orden (para grillas y selectores). */
export const ZONAS: string[] = Object.keys(CORDONES)

/** Mapa localidad -> cordón. */
export const ZONA_POR_LOCALIDAD: Record<string, string> = Object.fromEntries(
  Object.entries(CORDONES).flatMap(([cordon, locs]) => locs.map(l => [l, cordon]))
)

/** Cordón al que pertenece una localidad (o '' si no se reconoce). */
export function cordonDeLocalidad(localidad: string): string {
  return ZONA_POR_LOCALIDAD[localidad.trim()] ?? ''
}
