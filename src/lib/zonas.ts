/**
 * Zonas de tarifa = PARTIDOS (localidades) de CABA + AMBA.
 * Cada partido tiene su propia tarifa. El cordón es solo un agrupador visual.
 * Espejo de backend/core/zonas.py — mantener ambos sincronizados.
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

/** Todos los partidos en orden (CABA, luego cordón 1, 2, 3). Unidad de tarifa. */
export const ZONAS: string[] = Object.values(CORDONES).flat()

/** Mapa partido -> cordón (solo para agrupar/ordenar visualmente). */
export const CORDON_POR_LOCALIDAD: Record<string, string> = Object.fromEntries(
  Object.entries(CORDONES).flatMap(([cordon, locs]) => locs.map(l => [l, cordon]))
)

/** Cordón (grupo visual) al que pertenece un partido (o '' si no se reconoce). */
export function cordonDeLocalidad(localidad: string): string {
  return CORDON_POR_LOCALIDAD[localidad.trim()] ?? ''
}
