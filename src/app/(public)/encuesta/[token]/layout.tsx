import { NOINDEX } from '@/lib/seo'

// Cada URL lleva un token de un paciente concreto: nunca debe indexarse.
export const metadata = NOINDEX

export default function EncuestaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
