// Fallback al email histórico para no romper producción si la env var no está seteada.
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'lriofrio915@gmail.com'

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
}
