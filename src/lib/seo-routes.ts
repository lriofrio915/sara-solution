/**
 * Superficie pública e inventario de rutas privadas.
 *
 * La app maneja datos clínicos: la lista de bloqueo es deliberadamente más amplia que la
 * de rutas realmente protegidas por el middleware, porque bloquear de más en buscadores
 * no cuesta nada y bloquear de menos expone información de pacientes.
 */

/** Rutas públicas estáticas que sí queremos en el sitemap. */
export const PUBLIC_ROUTES = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/buscar-medico', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/eliminar-datos', changeFrequency: 'yearly', priority: 0.3 },
] as const

/** Prefijos que nunca deben indexarse. */
export const PRIVATE_PATHS = [
  '/api/',
  '/dashboard',
  '/patients',
  '/appointments',
  '/prescriptions',
  '/exam-orders',
  '/certificates',
  '/marketing',
  '/sara',
  '/knowledge',
  '/onboarding',
  '/profile',
  '/billing',
  '/reminders',
  '/admin',
  '/analytics',
  '/leads',
  '/team',
  '/integraciones',
  '/referidos',
  '/upgrade',
  '/reception',
  '/mi-salud',
  '/select-doctor',
  '/account-not-found',
  '/oauth-callback',
  // Vistas de impresión: recetas y órdenes de pacientes reales.
  '/attention-exams',
  '/attention-images',
  // Autenticación: sin valor de búsqueda y con parámetros de sesión.
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  // Portales con token de paciente.
  '/portal',
  '/encuesta',
] as const
