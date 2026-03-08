import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, locale = 'es-EC'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string, locale = 'es-EC'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatTime(date: Date | string, locale = 'es-EC'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function calculateAge(birthDate: Date | string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

/** Detects 'Dr.' or 'Dra.' from the doctor's first name using Spanish name heuristics */
export function detectDoctorTitle(firstName: string): string {
  const normalized = firstName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const maleNames = new Set([
    'carlos', 'juan', 'jose', 'luis', 'miguel', 'pedro', 'antonio', 'francisco',
    'manuel', 'rafael', 'david', 'jorge', 'pablo', 'roberto', 'mario', 'gabriel',
    'alejandro', 'andres', 'diego', 'sergio', 'daniel', 'nicolas', 'ivan', 'oscar',
    'hugo', 'hector', 'victor', 'alberto', 'fernando', 'ricardo', 'eduardo', 'alfredo',
    'enrique', 'felipe', 'gonzalo', 'gustavo', 'javier', 'leonardo', 'marcos', 'martin',
    'mauricio', 'patricio', 'ramon', 'rodrigo', 'santiago', 'sebastian', 'cesar',
    'christian', 'cristian', 'alex', 'wilmer', 'omar', 'xavier', 'fabian', 'hernan',
    'raul', 'ruben', 'simon', 'tomas', 'wilson', 'darwin', 'bryan', 'kevin', 'steven',
    'jonathan', 'jefferson', 'nelson', 'wilton', 'freddy', 'geovanny', 'giovanny',
    'jaime', 'jhon', 'john', 'johnny', 'michael', 'richard', 'robert', 'ronaldo',
    'william', 'xavier', 'yandry', 'yordan',
  ])

  if (maleNames.has(normalized)) return 'Dr.'
  if (normalized.endsWith('a')) return 'Dra.'

  // Female names that don't end in 'a'
  const femaleNonA = new Set([
    'isabel', 'rachel', 'ruth', 'esther', 'miriam', 'belen', 'raquel', 'noel',
    'steffanny', 'stefanny', 'stephany', 'stephanie', 'lizeth', 'elizabeth', 'liz',
    'nathaly', 'nathalie', 'emily', 'wendy', 'shirley', 'ashley', 'kimberly',
    'mercy', 'nelly', 'katty', 'betty', 'sandy', 'cindy', 'mary', 'jenny',
    'noemi', 'pilar', 'flor', 'gladys', 'ines', 'irene', 'jacqueline', 'janet',
    'karen', 'katherine', 'katy', 'leidy', 'lisseth', 'lorena', 'lucy', 'luz',
    'maribel', 'maricel', 'michelle', 'mirian', 'nataly', 'nicol', 'pamela', 'rocio',
    'sol', 'vilma', 'vivian', 'yolanda', 'ximena', 'xiomara',
  ])

  if (femaleNonA.has(normalized)) return 'Dra.'
  return 'Dr.'
}
