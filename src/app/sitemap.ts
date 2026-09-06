import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { absoluteUrl } from '@/lib/seo'
import { PUBLIC_ROUTES } from '@/lib/seo-routes'

// Se regenera cada hora: los perfiles públicos cambian con más frecuencia que las
// páginas fijas y no compensa reconstruir el sitemap en cada request.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map(route => ({
    url: absoluteUrl(route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  let doctorRoutes: MetadataRoute.Sitemap = []
  try {
    // Solo perfiles activos: el resto no tiene página pública que indexar.
    // Ninguna ruta de paciente entra aquí; el sitemap solo conoce contenido público.
    const doctors = await prisma.doctor.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    })
    doctorRoutes = doctors.flatMap(doctor => [
      {
        url: absoluteUrl(`/${doctor.slug}`),
        lastModified: doctor.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      },
      {
        url: absoluteUrl(`/${doctor.slug}/chat`),
        lastModified: doctor.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.4,
      },
    ])
  } catch (err) {
    // Un fallo de base de datos no debe tumbar el sitemap entero: mejor servir las
    // rutas estáticas que devolver un 500 a los rastreadores.
    console.error('sitemap: error cargando perfiles públicos', err)
  }

  return [...staticRoutes, ...doctorRoutes]
}
