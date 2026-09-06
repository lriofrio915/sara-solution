import type { MetadataRoute } from 'next'
import { SITE, absoluteUrl } from '@/lib/seo'
import { PRIVATE_PATHS } from '@/lib/seo-routes'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Se bloquea con `/prefijo` y `/prefijo/` para cubrir tanto la página índice
        // como todo lo que cuelga de ella.
        disallow: PRIVATE_PATHS.flatMap(path =>
          path.endsWith('/') ? [path] : [path, `${path}/`],
        ),
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE.url,
  }
}
