import { NOINDEX } from '@/lib/seo'

// Formulario de reserva: contenido escaso y con datos de contacto en tránsito. El valor
// de búsqueda está en el perfil del médico, que sí se indexa.
export const metadata = NOINDEX

export default function ReservarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
