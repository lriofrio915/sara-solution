import { NOINDEX } from '@/lib/seo'

// Portal de acceso del paciente: no aporta nada en búsqueda y es la puerta a datos
// clínicos. Fuera del índice.
export const metadata = NOINDEX

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
