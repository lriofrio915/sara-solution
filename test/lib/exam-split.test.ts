/**
 * Unit tests — src/lib/exam-split.ts
 *
 * Regresión del bug clínico: la orden de laboratorio impresa incluía los ítems de
 * imagen de la misma consulta.
 */
import { describe, it, expect } from 'vitest'
import { splitExamsByType, hasAnyExam, selectedCategories } from '@/lib/exam-split'
import { EXAM_CATEGORIES, IMAGING_CATEGORIES } from '@/lib/exam-categories'

const MIXED = {
  hematologia: ['Biometría Hemática', 'Plaquetas'],
  hematologia__otros: 'Ferritina',
  radiologia: ['Tórax AP y lateral'],
  radiologia__inguinal_lado: 'derecho',
  ecografia: ['Abdomen superior'],
}

describe('splitExamsByType', () => {
  it('deja los ítems de imagen fuera de la orden de laboratorio', () => {
    const { lab } = splitExamsByType(MIXED)
    expect(lab).toEqual({
      hematologia: ['Biometría Hemática', 'Plaquetas'],
      hematologia__otros: 'Ferritina',
    })
    expect(lab.radiologia).toBeUndefined()
    expect(lab.ecografia).toBeUndefined()
  })

  it('deja los ítems de laboratorio fuera de la orden de imagen', () => {
    const { imaging } = splitExamsByType(MIXED)
    expect(imaging).toEqual({
      radiologia: ['Tórax AP y lateral'],
      radiologia__inguinal_lado: 'derecho',
      ecografia: ['Abdomen superior'],
    })
    expect(imaging.hematologia).toBeUndefined()
  })

  it('las claves de metadatos viajan con su categoría base', () => {
    const { lab, imaging } = splitExamsByType({ orina__otros: 'x', mamografia__otros: 'y' })
    expect(lab).toEqual({ orina__otros: 'x' })
    expect(imaging).toEqual({ mamografia__otros: 'y' })
  })

  it('manda las claves desconocidas a laboratorio, nunca a imagen', () => {
    const { lab, imaging } = splitExamsByType({ categoriaNueva: ['Algo'] })
    expect(lab).toEqual({ categoriaNueva: ['Algo'] })
    expect(imaging).toEqual({})
  })

  it('tolera null, arrays y escalares sin lanzar', () => {
    for (const input of [null, undefined, [], 'texto', 42]) {
      expect(splitExamsByType(input)).toEqual({ lab: {}, imaging: {} })
    }
  })
})

describe('hasAnyExam', () => {
  it('ignora las categorías vacías y las claves de metadatos', () => {
    expect(hasAnyExam({ hematologia: [], hematologia__otros: 'texto' })).toBe(false)
    expect(hasAnyExam({ hematologia: ['Plaquetas'] })).toBe(true)
    expect(hasAnyExam(null)).toBe(false)
  })
})

describe('selectedCategories', () => {
  it('devuelve solo las categorías del catálogo pedido, con su label y sus otros', () => {
    const lab = selectedCategories(splitExamsByType(MIXED).lab, EXAM_CATEGORIES)
    expect(lab).toHaveLength(1)
    expect(lab[0].category.key).toBe('hematologia')
    expect(lab[0].category.label).toBe('HEMATOLOGÍA')
    expect(lab[0].otros).toBe('Ferritina')

    const imaging = selectedCategories(splitExamsByType(MIXED).imaging, IMAGING_CATEGORIES)
    expect(imaging.map(e => e.category.key)).toEqual(['radiologia', 'ecografia'])
  })

  it('no cuela una categoría de imagen aunque se le pase el JSON completo', () => {
    const labFromMixed = selectedCategories(MIXED, EXAM_CATEGORIES)
    expect(labFromMixed.map(e => e.category.key)).toEqual(['hematologia'])
  })
})
