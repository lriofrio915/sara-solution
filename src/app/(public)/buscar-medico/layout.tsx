import { buildMetadata } from '@/lib/seo'

// La página es un client component (buscador interactivo), así que su metadata vive
// en este layout: es la única forma de darle canonical y Open Graph propios.
export const metadata = buildMetadata({
  title: 'Buscar médico — Sara Medical',
  description:
    'Encuentra médicos y especialistas en Ecuador y agenda tu cita en línea. Directorio de profesionales de la salud con perfil verificado.',
  path: '/buscar-medico',
})

export default function BuscarMedicoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
