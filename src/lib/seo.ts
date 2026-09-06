import type { Metadata } from 'next'

/**
 * Helper central de metadata. Existe para no repetir el mismo objeto de Open Graph y
 * Twitter en cada página, y para que la URL canónica salga siempre del mismo sitio.
 *
 * La base es el dominio con www: Vercel responde 307 desde el apex hacia www, y un
 * og:image o un canonical que pase por un redirect es exactamente lo que hace que
 * WhatsApp no muestre la previsualización.
 */

export const SITE = {
  url: 'https://www.consultorio.site',
  name: 'Sara Medical',
  locale: 'es_EC',
  lang: 'es-EC',
  twitter: '@saramedical',
  description:
    'Automatiza tu consultorio médico con inteligencia artificial. Agenda de citas, recetas digitales, marketing automatizado y más. Prueba gratis.',
} as const

export function absoluteUrl(path = '/'): string {
  return new URL(path, SITE.url).toString()
}

type BuildMetadataArgs = {
  title: string
  description: string
  /** Ruta absoluta dentro del sitio, ej. '/pricing'. */
  path: string
  /**
   * Imagen OG. Por defecto la tarjeta de marca del sitio.
   *
   * `null` para las rutas que tienen su propio `opengraph-image.tsx`: ahí manda el
   * archivo y declararla aquí lo sobrescribiría.
   */
  image?: string | null
  imageAlt?: string
  /** Marca la página como no indexable (todo lo que hay detrás de autenticación). */
  noindex?: boolean
  keywords?: string[]
  type?: 'website' | 'article' | 'profile'
}

export function buildMetadata({
  title,
  description,
  path,
  // Un `opengraph-image.tsx` solo cubre su propio segmento de ruta: el de la raíz no se
  // hereda a las páginas de (public), así que la landing, precios, legales y el chat del
  // médico se compartían sin imagen. Se declara explícitamente por defecto.
  image = '/opengraph-image',
  imageAlt,
  noindex = false,
  keywords,
  type = 'website',
}: BuildMetadataArgs): Metadata {
  const url = absoluteUrl(path)
  // width/height explícitos: sin ellos WhatsApp y Slack renderizan la tarjeta rota.
  const images = image
    ? [{ url: absoluteUrl(image), width: 1200, height: 630, alt: imageAlt ?? title }]
    : undefined

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: url,
      languages: { [SITE.lang]: url },
    },
    ...(noindex
      ? { robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } }
      : {}),
    openGraph: {
      type,
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(images ? { images: images.map(i => i.url) } : {}),
    },
  }
}

/** Metadata para las áreas privadas: fuera de buscadores, sin excepción. */
export const NOINDEX: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}
