const ESTILOS: Record<string, string> = {
  pendiente_retiro:                      'bg-yellow-100 text-yellow-800 border-yellow-200',
  en_deposito:                           'bg-blue-100 text-blue-800 border-blue-200',
  en_camino:                             'bg-indigo-100 text-indigo-800 border-indigo-200',
  entregado:                             'bg-green-100 text-green-800 border-green-200',
  no_entregado_ausente:                  'bg-red-100 text-red-800 border-red-200',
  no_entregado_domicilio_no_encontrado:  'bg-red-100 text-red-800 border-red-200',
  no_cerrado:                            'bg-gray-100 text-gray-700 border-gray-200',
}

export const LABELS: Record<string, string> = {
  pendiente_retiro:                      'Pendiente retiro',
  en_deposito:                           'En depósito',
  en_camino:                             'En camino',
  entregado:                             'Entregado ✓',
  no_entregado_ausente:                  'Ausente',
  no_entregado_domicilio_no_encontrado:  'Dom. no encontrado',
  no_cerrado:                            'Negocio cerrado',
}

export const TODOS_ESTADOS = Object.keys(LABELS)

export default function EstadoBadge({ estado }: { estado: string }) {
  const cls = ESTILOS[estado] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {LABELS[estado] ?? estado}
    </span>
  )
}
