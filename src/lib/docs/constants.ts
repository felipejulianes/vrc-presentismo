export type DocType = 'dni' | 'apto_medico' | 'ficha'

export const DOC_LABELS: Record<DocType, string> = {
  dni: 'DNI',
  apto_medico: 'Apto médico',
  ficha: 'Ficha de jugador',
}

export const ALL_DOC_TYPES: DocType[] = ['dni', 'apto_medico', 'ficha']
