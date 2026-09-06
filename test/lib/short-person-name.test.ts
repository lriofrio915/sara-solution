/**
 * Unit tests — shortPersonName / getInitials
 *
 * Regresión: "Patricio David Gavilanes Carrasco" se mostraba como "Patricio David",
 * dos nombres de pila sin apellido, tanto en el perfil público como en su tarjeta OG.
 */
import { describe, it, expect } from 'vitest'
import { shortPersonName, getInitials, formatDoctorDisplayName } from '@/lib/utils'

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

describe('formatDoctorDisplayName', () => {
  it('respeta titlePrefix por encima de cualquier heurística', () => {
    expect(formatDoctorDisplayName('Nicola Rossi Bianchi Verdi', 'Dr.')).toBe('Dr. Nicola Bianchi')
    expect(formatDoctorDisplayName('Marcela Castillo', 'Dr.')).toBe('Dr. Marcela Castillo')
  })

  it('usa Dra. para nombres femeninos sin titlePrefix', () => {
    // Regresión: la página del perfil las mostraba como "Dr." mientras la tarjeta OG
    // decía "Dra.", porque cada una resolvía el tratamiento por su cuenta.
    expect(formatDoctorDisplayName('Marcela Patricia Castillo Martínez')).toBe('Dra. Marcela Castillo')
    expect(formatDoctorDisplayName('Stéfanny Medrano')).toBe('Dra. Stéfanny Medrano')
  })

  it('usa Dr. para nombres masculinos', () => {
    expect(formatDoctorDisplayName('Patricio David Gavilanes Carrasco')).toBe('Dr. Patricio Gavilanes')
  })

  it('una palabra femenina explícita en el nombre gana a la heurística', () => {
    expect(formatDoctorDisplayName('Dra. Andrea Solís')).toBe('Dra. Andrea Solís')
    expect(formatDoctorDisplayName('Médica Rosa Núñez')).toBe('Dra. Rosa Núñez')
  })

  it('descarta los tratamientos del nombre en lugar de repetirlos', () => {
    expect(formatDoctorDisplayName('Dr. Carlos Mendoza')).toBe('Dr. Carlos Mendoza')
  })
})
