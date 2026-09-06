import { IMAGING_CATEGORIES, type ExamCategory } from './exam-categories'

/**
 * El JSON `exams` (en Attention.exams y ExamOrder.exams) mezcla en un mismo objeto
 * las categorías de laboratorio y las de imagen, más claves de metadatos
 * namespaced con el patrón `${categoria}__${campo}` (ej. `hematologia__otros`,
 * `radiologia__inguinal_lado`).
 *
 * Este módulo es la ÚNICA fuente de verdad para separar ambos mundos. Antes cada
 * consumidor improvisaba su propio criterio: la orden de laboratorio no filtraba
 * nada (y por eso imprimía exámenes de imagen en una orden clínica real) y la de
 * imagen usaba la heurística `key.includes('imag')`, que puede colar categorías
 * de laboratorio cuyo nombre contenga esa subcadena.
 */

export type ExamsJson = Record<string, string[] | string>

const IMAGING_KEYS = new Set(IMAGING_CATEGORIES.map(c => c.key))

/** `hematologia__otros` → `hematologia`; `radiologia` → `radiologia`. */
function baseKey(key: string): string {
  const idx = key.indexOf('__')
  return idx === -1 ? key : key.slice(0, idx)
}

function asObject(exams: unknown): ExamsJson {
  // Prisma devuelve JsonValue: puede ser null, array o escalar si el dato quedó corrupto.
  if (!exams || typeof exams !== 'object' || Array.isArray(exams)) return {}
  return exams as ExamsJson
}

/**
 * Parte el JSON en sus dos órdenes clínicas. Las claves desconocidas caen en `lab`
 * a propósito: es preferible que un examen sin clasificar aparezca en la orden de
 * laboratorio (donde el médico lo ve y lo corrige) a que se filtre en una de imagen.
 */
export function splitExamsByType(exams: unknown): { lab: ExamsJson; imaging: ExamsJson } {
  const lab: ExamsJson = {}
  const imaging: ExamsJson = {}
  for (const [key, value] of Object.entries(asObject(exams))) {
    if (IMAGING_KEYS.has(baseKey(key))) imaging[key] = value
    else lab[key] = value
  }
  return { lab, imaging }
}

/** True si hay al menos un examen seleccionado (ignora las claves de metadatos). */
export function hasAnyExam(exams: unknown): boolean {
  return Object.values(asObject(exams)).some(value => Array.isArray(value) && value.length > 0)
}

/** Categorías con al menos un examen seleccionado, en el orden del catálogo. */
export function selectedCategories(exams: unknown, catalog: ExamCategory[]): { category: ExamCategory; items: string[]; otros?: string }[] {
  const obj = asObject(exams)
  return catalog
    .map(category => ({
      category,
      items: Array.isArray(obj[category.key]) ? (obj[category.key] as string[]) : [],
      otros: typeof obj[`${category.key}__otros`] === 'string' ? (obj[`${category.key}__otros`] as string) : undefined,
    }))
    .filter(entry => entry.items.length > 0 || (entry.otros ?? '').trim().length > 0)
}
