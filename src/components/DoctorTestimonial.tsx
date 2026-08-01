import Image from 'next/image'
import { isEnabled } from '@/lib/flags'
import { getInitials } from '@/lib/utils'

/**
 * Testimonio real de un médico para /pricing y /upgrade.
 *
 * PENDIENTE DE CONTENIDO REAL: completar los campos de TESTIMONIAL con la
 * cita (1-2 frases), nombre, especialidad, ciudad y foto de un médico real
 * que haya dado su consentimiento. NO inventar testimonios (decisión #32 del
 * plan de producto: un humano real convierte más que stats genéricas).
 *
 * Activación: además del contenido, requiere el feature flag `testimonial`
 * (NEXT_PUBLIC_FEATURE_FLAGS=testimonial en Vercel). Sin flag o sin contenido,
 * el componente no renderiza nada.
 */
const TESTIMONIAL = {
  quote: '',      // ej: 'Publico en Instagram sin tocar el teléfono. Sara me devolvió horas de consulta.'
  name: '',       // ej: 'Dra. Nombre Apellido'
  specialty: '',  // ej: 'Medicina Interna'
  city: '',       // ej: 'Puyo, Ecuador'
  photoUrl: '',   // URL pública de la foto (cuadrada, mín. 128px). Vacío = iniciales.
}

export default function DoctorTestimonial() {
  if (!isEnabled('testimonial')) return null
  if (!TESTIMONIAL.quote || !TESTIMONIAL.name) return null

  const subtitle = [TESTIMONIAL.specialty, TESTIMONIAL.city].filter(Boolean).join(' — ')

  return (
    <figure className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 mb-14 max-w-2xl mx-auto text-center">
      <blockquote className="text-lg text-gray-800 dark:text-gray-100 font-medium leading-relaxed">
        “{TESTIMONIAL.quote}”
      </blockquote>
      <figcaption className="mt-6 flex items-center justify-center gap-3">
        {TESTIMONIAL.photoUrl ? (
          <Image
            src={TESTIMONIAL.photoUrl}
            alt={TESTIMONIAL.name}
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
        ) : (
          <span className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
            {getInitials(TESTIMONIAL.name)}
          </span>
        )}
        <span className="text-left">
          <span className="block font-bold text-gray-900 dark:text-white text-sm">{TESTIMONIAL.name}</span>
          {subtitle && <span className="block text-xs text-gray-500 dark:text-slate-400">{subtitle}</span>}
        </span>
      </figcaption>
    </figure>
  )
}
