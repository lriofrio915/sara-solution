/**
 * Ecuador cédula/RUC utilities
 * Algoritmo oficial del dígito verificador del Registro Civil del Ecuador
 */

export const PROVINCIAS_EC: Record<string, string> = {
  '01': 'Azuay', '02': 'Bolívar', '03': 'Cañar', '04': 'Carchi',
  '05': 'Cotopaxi', '06': 'Chimborazo', '07': 'El Oro', '08': 'Esmeraldas',
  '09': 'Guayas', '10': 'Imbabura', '11': 'Loja', '12': 'Los Ríos',
  '13': 'Manabí', '14': 'Morona Santiago', '15': 'Napo', '16': 'Pastaza',
  '17': 'Pichincha', '18': 'Tungurahua', '19': 'Zamora Chinchipe',
  '20': 'Galápagos', '21': 'Sucumbíos', '22': 'Orellana', '23': 'Santo Domingo',
  '24': 'Santa Elena', '30': 'Entidades públicas',
}

export type CedulaResult =
  | { valid: true; type: 'natural' | 'publico' | 'juridico'; provincia: string; provinciaCodigo: string }
  | { valid: false; error: string }

export function validateCedula(cedula: string): CedulaResult {
  const c = cedula.replace(/\s/g, '')
  if (!/^\d{10}$/.test(c)) return { valid: false, error: 'La cédula debe tener exactamente 10 dígitos' }

  const prov = c.slice(0, 2)
  const provNum = parseInt(prov, 10)
  if (provNum < 1 || (provNum > 24 && provNum !== 30)) {
    return { valid: false, error: `Código de provincia inválido: ${prov}` }
  }

  const thirdDigit = parseInt(c[2], 10)

  // Persona natural (tercer dígito 0-5)
  if (thirdDigit < 6) {
    const coefs = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    let sum = 0
    for (let i = 0; i < 9; i++) {
      let val = parseInt(c[i], 10) * coefs[i]
      if (val > 9) val -= 9
      sum += val
    }
    const checkDigit = sum % 10 === 0 ? 0 : 10 - (sum % 10)
    if (checkDigit !== parseInt(c[9], 10)) {
      return { valid: false, error: 'Cédula inválida (dígito verificador incorrecto)' }
    }
    return { valid: true, type: 'natural', provincia: PROVINCIAS_EC[prov] ?? prov, provinciaCodigo: prov }
  }

  // Entidad pública (tercer dígito = 6)
  if (thirdDigit === 6) {
    const coefs = [3, 2, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < 8; i++) sum += parseInt(c[i], 10) * coefs[i]
    const checkDigit = sum % 11 === 0 ? 0 : 11 - (sum % 11)
    if (checkDigit !== parseInt(c[8], 10)) {
      return { valid: false, error: 'RUC de entidad pública inválido' }
    }
    return { valid: true, type: 'publico', provincia: PROVINCIAS_EC[prov] ?? prov, provinciaCodigo: prov }
  }

  // Persona jurídica (tercer dígito = 9)
  if (thirdDigit === 9) {
    const coefs = [4, 3, 2, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(c[i], 10) * coefs[i]
    const checkDigit = sum % 11 === 0 ? 0 : 11 - (sum % 11)
    if (checkDigit !== parseInt(c[9], 10)) {
      return { valid: false, error: 'RUC de persona jurídica inválido' }
    }
    return { valid: true, type: 'juridico', provincia: PROVINCIAS_EC[prov] ?? prov, provinciaCodigo: prov }
  }

  return { valid: false, error: 'Tipo de identificación no reconocido' }
}
