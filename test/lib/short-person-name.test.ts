/**
 * Unit tests — shortPersonName / getInitials
 *
 * Regresión: "Patricio David Gavilanes Carrasco" se mostraba como "Patricio David",
 * dos nombres de pila sin apellido, tanto en el perfil público como en su tarjeta OG.
 */
import { describe, it, expect } from 'vitest'
import { shortPersonName, getInitials } from '@/lib/utils'

describe('shortPersonName', () => {
  it('con dos nombres y dos apellidos toma el primer nombre y el primer apellido', () => {
    expect(shortPersonName('Patricio David Gavilanes Carrasco')).toBe('Patricio Gavilanes')
    expect(shortPersonName('María José Melchiade Muñoz Vera')).toBe('María Melchiade')
  })

  it('con dos palabras las conserva', () => {
    expect(shortPersonName('Stéfanny Medrano')).toBe('Stéfanny Medrano')
  })

  it('con tres palabras conserva las dos primeras: el caso es ambiguo', () => {
    // "María José Melchiade" puede ser dos nombres + apellido o nombre + dos apellidos.
    expect(shortPersonName('María José Melchiade')).toBe('María José')
  })

  it('con una sola palabra la devuelve tal cual', () => {
    expect(shortPersonName('Sara')).toBe('Sara')
  })

  it('tolera espacios de más y cadenas vacías', () => {
    expect(shortPersonName('  Ana   Lucía   Pérez   Soto ')).toBe('Ana Pérez')
    expect(shortPersonName('   ')).toBe('')
    expect(shortPersonName('')).toBe('')
  })
})

describe('getInitials', () => {
  it('usa el apellido, no el segundo nombre', () => {
    expect(getInitials('Patricio David Gavilanes Carrasco')).toBe('PG')
  })

  it('mantiene el comportamiento con nombres de dos palabras', () => {
    expect(getInitials('Stéfanny Medrano')).toBe('SM')
  })
})
