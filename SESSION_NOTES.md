# Session Notes

## Sesión 2026-09-06 (noche) — Previsualización de enlaces (Open Graph)

Reporte: al compartir el perfil de una médica por WhatsApp salía solo texto, sin foto ni
tarjeta. Se pedía que se viera profesional.

### Bug 1 — la imagen del perfil devolvía HTTP 500, commit `fff2aa6`
`src/app/(public)/[slug]/opengraph-image.tsx` tipaba `params` como objeto plano, pero en
esta versión de Next es una **Promise**: `params.slug` quedaba en `undefined`, Prisma
lanzaba y la ruta respondía 500. Los meta tags (`og:title`, `og:image`, `twitter:card`)
estaban todos correctos y apuntaban a una imagen que nunca llegaba a generarse.

TypeScript no lo detectó porque el tipo escrito era una aserción, no una comprobación
contra la firma real de Next. Solo se ve pidiendo la URL de la imagen y mirando el código.

Además la tarjeta se rehízo para que sea una presentación real: foto del médico (círculo),
título Dr./Dra. resuelto con `detectDoctorTitle` de `src/lib/utils.ts` —el mismo helper que
usa la página—, especialidad 🩺, ciudad 📍, establecimiento 🏥 y CTA "Agenda tu cita".

Tres decisiones de implementación:
- **La foto se descarga en el handler y se incrusta como data URI**, con timeout de 3s y
  tope de 1.5MB. Si se deja que Satori resuelva la `<img>` y esa petición falla, revienta
  la generación entera y se vuelve al enlace sin preview; así degrada a las iniciales.
- **`emoji: 'twemoji'`** en las opciones de `ImageResponse`: las fuentes por defecto de
  Satori no traen emojis y salían como cuadros vacíos.
- Cantón y provincia se deduplican (quedaba "Pastaza, Pastaza") y el nombre del
  establecimiento se trunca a 42 caracteres para que no desborde a dos líneas.
- Sin médico resuelto (slug inexistente) la tarjeta cae a la marca genérica y **oculta el
  CTA de cita**, que no tendría a quién referirse. Devuelve 200, no 500.

### Bug 2 — el resto de páginas públicas tampoco tenía imagen, commit `e290d28`
Al verificar el fix anterior se descubrió que **solo `/[slug]` tenía `og:image`**. Landing,
precios, legales, buscar-medico y `/[slug]/chat` salían con título y descripción pero sin
imagen.

Causa: **un `opengraph-image.tsx` solo cubre su propio segmento de ruta.** El de
`src/app/` no se hereda a las páginas dentro de `(public)`. El perfil funcionaba porque su
archivo está en el mismo segmento que su `page.tsx`.

Fix: `buildMetadata` (`src/lib/seo.ts`) declara `image = '/opengraph-image'` por defecto, y
`/[slug]` pasa **`image: null`** para que siga mandando su archivo propio con la foto —
declarar una imagen en la metadata sobrescribiría la del archivo.

Esto venía del overhaul de SEO de la sesión anterior: se dio por bueno sin comprobar el
HTML resuelto de cada ruta. **Verificar los meta tags de la página servida, no solo que el
código compile.**

### Verificado en producción (8/8)
| Ruta | HTTP | Tamaño | Imagen |
|---|---|---|---|
| `/`, `/pricing`, `/privacy`, `/terms`, `/eliminar-datos`, `/buscar-medico`, `/[slug]/chat` | 200 | 79 KB | marca |
| `/stefanny-medrano` | 200 | 149 KB | tarjeta con foto |

Las cuatro condiciones de WhatsApp se cumplen en todas: 200, **sin redirects**, 1200x630
declarado y <300 KB. `twitter:image` presente en las ocho.

### Pendiente
- Los enlaces ya compartidos tienen cacheado el 500 antiguo. Refrescar pasándolos por el
  Sharing Debugger de Facebook (Scrape Again); WhatsApp comparte esa caché.
- No se probó un médico **sin** `avatarUrl`: el fallback a iniciales está implementado y se
  validó con un slug inexistente, pero no con un perfil real sin foto.

## Sesión 2026-09-06 (tarde) — Latencia de navegación en el panel del médico

### Causa raíz principal: el rate limiter de Upstash cuesta 4.24s por request

`@upstash/redis@1.37.0` trae por defecto `attempts: 5` y `backoff: n => Math.exp(n)*50`.
La suma de los backoff de los reintentos 1-4 es **exactamente 4240 ms**. La instancia de
Redis no responde, el SDK reintenta las 5 veces y el `catch {}` del middleware falla en
abierto. Resultado: cero protección real y 4.2s de coste por request.

Medición contra producción antes del fix:

| Ruta | ¿Rate-limited? | Código | TTFB |
|---|---|---|---|
| `/api/patients` | sí | 401 | 4.45 s |
| `/api/prescriptions` | sí | 401 | 4.47 s |
| `/api/arco` | sí | 404 | 4.47 s |
| `/api/auth/callback` | sí | 404 | 4.42 s |
| `/api/contact` | sí | 405 | 4.47 s |
| `/api/fhir` | sí | 404 | 4.41 s |
| `/api/certificates` | no | 401 | 0.12 s |
| `/api/appointments` | no | 401 | 0.14 s |
| `/api/exam-orders` | no | 401 | 0.12 s |
| `/api/atenciones` | no | 401 | 0.11 s |

Las que devuelven 404 también tardan 4.4s: el tiempo se va en el middleware **antes de
enrutar**. Explica por qué la trivia de carga se puso justo en pacientes y recetas.

### La instancia vieja de Upstash quedó inalcanzable
`major-wolf-96255.upstash.io` dejó de responder. No se pudo diagnosticar desde el entorno
de desarrollo porque tiene bloqueado el dominio `upstash.io` a nivel DNS. Se resolvió
reaprovisionando desde el Marketplace de Vercel (ver más abajo) en vez de recuperarla.

### Completado — Fase 1, commit `737ac57`
- `src/lib/rate-limit.ts` (extraído del middleware para poder testearlo): `retry: { retries: 1 }`
  y techo duro de 300ms con `Promise.race`. 6 tests nuevos, incluido el de regresión que
  falla si un Redis colgado vuelve a tardar más de 500ms.
- `getDoctorFromUser` y `getAssistantDoctors` envueltos en `cache()` de React. Ojo al
  detalle: `cache()` memoiza por identidad de argumento, así que la clave son primitivos
  (`authId`, `email`, `activeDoctorId`) y no el objeto `user`, que nunca habría acertado.
- `titlePrefix` y `avatarUrl` movidos a `DOCTOR_SELECT`: elimina la segunda consulta del
  layout raíz a la fila recién leída, y una tercera en la rama de asistente cuyo resultado
  se descartaba.
- Los 13 layouts anidados pasan de `getUser()` (round-trip de red, 200-800ms) a
  `getSession()` vía el nuevo helper `requireDoctorLayout()`. Cada layout baja de 18 a 8
  líneas. **`admin/layout.tsx` mantiene `getUser()` a propósito**: es frontera de privilegio
  de superadmin y `getSession()` no valida la firma del JWT en servidor.
- **Bug de seguridad latente cerrado**: el lookup usaba `{ email: user.email! }`; con email
  `undefined`, Prisma descarta la condición y ese elemento del `OR` queda como `{}`, que
  hace match con CUALQUIER médico y devolvía uno arbitrario. Ahora la cláusula solo se
  añade si hay email.
- `loading.tsx` en las secciones principales reutilizando `MedicalLoadingScreen`. Ahora sí
  cubre el hueco correcto (antes vivía dentro del componente cliente, o sea que solo
  aparecía **después** de que el servidor respondiera) y hace que el prefetch de `<Link>`
  sirva de algo en rutas dinámicas.
- `next.config.js`: `staleTimes: { dynamic: 30, static: 180 }` y `optimizePackageImports`
  para `lucide-react`. `vercel.json`: `regions: ["pdx1"]` para colocar las funciones junto
  a la BD, que está en `us-west-2` (corrían en `iad1`, confirmado por `x-vercel-id`).

### Completado — Fase 2, commit `023667c`
`patients`, `prescriptions`, `exam-orders` y `atenciones` pasan de componente cliente con
`useEffect` a server component + componente cliente hermano que recibe la primera tanda por
props. Ahorra por sección una hidratación, un `fetch`, un `getUser()` de red y un lookup de
médico. La consulta de pacientes se comparte entre página y API en
`src/lib/patients-query.ts`; las rutas API se mantienen todas.

### Decisiones tomadas
- `getSession()` en los layouts del panel, `getUser()` en las rutas API y en admin. Los
  layouts solo deciden qué renderizar; la validación fuerte vive donde se tocan los datos.
- Solo se extrajo módulo compartido de consulta para pacientes: es la única de las cuatro
  secciones con lógica de filtrado real. En las otras tres habría sido indirección sin valor.
- Se conserva `MedicalLoadingScreen` en pacientes y atenciones, pero solo para búsquedas.

### Completado — Upstash reaprovisionado desde el Marketplace de Vercel
- Recurso `sara-ratelimit` (producto `upstash/upstash-kv`) creado y conectado a
  production, preview y development. Estado: Available.
- Se eligió `upstash/upstash-kv` y no el producto `redis` de Redis Inc.: este último
  entrega una URL TCP y el middleware corre en Edge, donde solo sirve el REST de Upstash.
- **La integración inyecta `KV_REST_API_URL` / `KV_REST_API_TOKEN`, no `UPSTASH_REDIS_REST_*`.**
  El commit `49ed5c0` había añadido soporte para ambas nomenclaturas justo antes; sin él la
  base habría quedado provisionada y el rate limiting igualmente desactivado en silencio.
- Las 4 variables viejas `UPSTASH_REDIS_REST_URL`/`TOKEN` (production y development,
  apuntando a la instancia muerta `major-wolf-96255`) fueron eliminadas: tenían prioridad
  en el `||` y habrían ensombrecido a las nuevas.
- `vercel integration add` ejecuta un `env pull` que apendea `.env*` al `.gitignore`, lo que
  taparía `.env.example`. Acotado en `86c7288`.

### ⚠️ Incidente: tres deploys de producción en Error por vercel.json
El commit `737ac57` añadió a `vercel.json` una clave `"//"` como comentario junto a
`regions`. Vercel valida el esquema y rechaza propiedades desconocidas:
`schema validation failed: should NOT have additional property "//"`.
Resultado: los deploys quedaron en Error y **las mejoras de rendimiento no estuvieron en
producción durante ~40 minutos**, aunque el build local pasaba. Corregido en `128820b`,
validado antes con un deploy de preview. `vercel.json` no admite comentarios de ningún tipo.

### Verificado en producción
- `x-vercel-id: iad1::pdx1::` — las funciones ya corren junto a la base de datos.
- **Rate limiting funcionando de verdad**: 70 peticiones seguidas a `/api/patients`
  (límite 60/min por IP) devolvieron 55 → 401 y 15 → **429**. No es una inferencia por
  latencia: es el limiter contando y bloqueando, cosa que llevaba meses sin hacer.
- Latencia de `/api/patients`: de 4.45s a ~0.29-0.41s. El usuario confirma que el panel
  "ya carga rápido".

### Pendiente
- Fuera de alcance, detectado: las 42 páginas cliente restantes; `SaraFAB` importa
  estáticamente `SaraChatPanel` (502 líneas) aunque casi nunca se abra; y hay 63 lookups
  `OR: [{ id: user.id }, { email }]` que usan `id` donde `doctor-auth.ts` usa `authId` —
  son campos distintos y esa inconsistencia merece su propia sesión.

## Sesión 2026-09-06 — Bugs del módulo de consulta + overhaul de SEO

### Completado — Parte A (3 bugs reportados por una médica), commit `5bc2d94`

**A2 (crítico) — la orden de laboratorio incluía los ítems de imágenes.**
Causa raíz: `src/app/(print)/attention-exams/[attentionId]/page.tsx` recorría todas las
claves del JSON `attention.exams` (que guarda laboratorio e imagen mezclados) y solo
excluía las claves `__otros`. El print de imágenes sí filtraba, y `exam-orders/[id]/imprimir`
también, con criterios distintos cada uno.
Fix: nuevo `src/lib/exam-split.ts` como única fuente de verdad (`splitExamsByType`,
`hasAnyExam`, `selectedCategories`), aplicado en los tres puntos de impresión. También se
eliminó la heurística `key.includes('imag')` del print de imágenes, que podía colar
categorías de laboratorio.

**A3 — la sección "Órdenes" salía vacía.**
Causa raíz: el PATCH de atención (`src/app/api/patients/[id]/atenciones/[aid]/route.ts`)
sincronizaba la receta pero no las órdenes; solo el POST creaba `ExamOrder`. En el flujo
real la atención se guarda primero y los exámenes se añaden después, así que la orden nunca
se creaba. Agravantes: `GET /api/exam-orders` ignoraba el `attentionId` que el formulario sí
enviaba, y el listado etiquetaba con el catálogo de laboratorio, así que una orden de
imágenes habría salido como "—".
Fix: campo `ExamOrder.type` (enum `LAB`/`IMAGING`), `src/lib/exam-order-sync.ts` llamado
desde POST y PATCH, filtros `attentionId`/`type` en la API con validación 400, badges de
tipo en ambos listados y título/catálogo por tipo en el print. De paso se arregló el
`countExams` de `/patients/[id]/ordenes`, que crasheaba con las claves de metadatos string.

**A1 — la presentación escrita a mano no llegaba a la receta impresa.**
Causa raíz: en `AttentionForm.tsx`, al elegir "Otros…" el `<select>` se cambiaba por un
input libre cuyo valor solo se guardaba en `item.presentation` si se pulsaba Enter o el
botón ✓. Si la médica escribía y guardaba o imprimía directo, el texto quedaba en un state
local y se perdía. Segundo efecto: las presentaciones custom viven en `localStorage`, así
que en otro navegador el valor guardado no existía como `<option>` y el campo se veía vacío.
Fix: input con `datalist` que persiste en cada tecla; las sugerencias incluyen las
presentaciones ya usadas en la receta actual, no solo las de localStorage.

**¿A1 y A3 comparten causa?** No. A1 es un bug de commit en la UI. A2 y A3 sí comparten
raíz: el JSON `exams` mezclaba ambos mundos y `ExamOrder` no tenía discriminador.

**Tests**: `test/lib/exam-split.test.ts` (8) y `test/lib/exam-order-sync.test.ts` (7).
Suite: 152/152 verdes. Typecheck, lint y build limpios.

### PENDIENTE ANTES DE DESPLEGAR Parte A — la BD todavía no tiene la columna
El código ya consulta `ExamOrder.type`. Desplegar antes de aplicar el SQL rompe producción.
Orden obligatorio:
1. `npm run db:backup`
2. Aplicar `prisma/migrations/add_exam_order_type.sql` (aditivo: crea el enum, la columna
   con default `LAB` y un índice; no borra ni reescribe nada).
3. `npx tsx scripts/backfill-exam-order-type.ts` → revisar el dry-run → repetir con `--apply`.
   Reclasifica las órdenes existentes y parte en dos las que traen laboratorio e imagen.
4. Recién entonces `git push origin main`.

### Completado — Parte B (SEO y previsualización), commit `318d20d`
- Estado previo: no existían `sitemap.ts`, `robots.ts`, `manifest.ts` ni carpeta `public/`.
- `src/lib/seo.ts`: helper tipado `buildMetadata` + constantes `SITE` + `NOINDEX`.
  Base canónica `https://www.consultorio.site` (el apex responde 307 y una OG detrás de un
  redirect no la renderiza WhatsApp).
- `robots.ts` (lista de prefijos privados en `src/lib/seo-routes.ts`), `sitemap.ts` dinámico
  (páginas fijas + perfiles de médico activos con `lastModified` real), `manifest.ts`.
- `noindex` en los layouts `(doctor)`, `(patient)`, `(print)` y `(auth)`, además del guard.
- OG 1200x630 generada con `next/og` para el sitio y para cada perfil público, más
  `icon.tsx` y `apple-icon.tsx`. Ninguna OG toca datos de paciente.
- JSON-LD: `Organization` + `SoftwareApplication` (`MedicalApplication`) + `FAQPage` en la
  landing, `Product`/`Offer` USD + `BreadcrumbList` en precios, `Physician` +
  `BreadcrumbList` en los perfiles. Inyectado desde componente de servidor con escapado.
- **Eliminado el `aggregateRating` 4.9/200** de la landing: no corresponde a reseñas
  públicas verificables y exponía el dominio a penalización por datos estructurados
  engañosos.
- `<img>` → `next/image` en landing, perfil y reserva. Metadata propia (vía layout) para
  las páginas cliente: `/buscar-medico` indexable, `/portal`, `/encuesta/[token]` y
  `/[slug]/reservar` en noindex.

### Decisiones tomadas
- Órdenes: se optó por dos registros con `type` (migración) en vez de una orden mixta.
  Es el fix estructural que también blinda A2 contra futuras regresiones.
- No existe blog en el proyecto; lo previsto para el blog se aplicó a los perfiles
  públicos `/[slug]`, que son el contenido dinámico con valor SEO real.
- Assets OG y favicons generados por código (`next/og`), no como binarios: el repo no tiene
  carpeta `public/`.

### Pendiente
- Aplicar la migración y el backfill (ver arriba) y luego hacer push.
- Verificación manual de Parte A en dev con un paciente de prueba (lab + imagen en la misma
  consulta, presentación escrita a mano sin pulsar Enter).
- Checklist de Parte B: Facebook Sharing Debugger, Twitter Card Validator, Rich Results Test,
  compartir un link real por WhatsApp, y `curl` de `/robots.txt` y `/sitemap.xml` verificando
  que no aparece ninguna URL privada.
- El `middleware.ts` no protege `/analytics`, `/leads`, `/team`, `/integraciones`,
  `/referidos`, `/upgrade`, `/reception` ni `/attention-*`; dependen solo del guard del
  layout. El bloqueo SEO ya los cubre, pero conviene revisar el matcher aparte.
- Fuera de alcance, detectado durante la investigación: `POST /api/prescriptions` y
  `PATCH /api/prescriptions/[id]` guardan `medications` sin normalizar; hay tres catálogos
  de presentación divergentes (`BASE_PRESENTATIONS`, `PHARMA_FORMS`,
  `CatalogoMedicamento.formaFarmaceutica`) y `/api/medications` no tiene ningún consumidor;
  `exam-orders/new` no permite pedir imágenes.

## Sesión 2026-08-01 — Revisión de estado + deps + fix firma visual en receta

### Completado
- Revisión completa de estado: typecheck/lint/tests/build verdes sobre `d5e4d3f`; crons y backups diarios OK en GitHub Actions (informe entregado como artifact al usuario).
- **Deps**: next 16.2.4 → 16.2.12 (+ eslint-config-next). Las advisories de next NO desaparecen — el fix vive en la línea 16.3 (aún preview); re-evaluar cuando salga estable. `npm audit fix` para transitivas (fast-uri, form-data, protobufjs, undici, js-yaml, brace-expansion, etc.). Eliminado `mercadopago` (0 imports en todo el repo — dependencia huérfana). npm audit: 30 → **7** (4 = cadena @signpdf aceptada; 3 = next/postcss/sharp sin fix estable).
- **Fix firma rota en PDF de receta** (reporte del usuario con captura): el endpoint de download generaba una signed URL al **.p12** (certificado PKCS#12, no imagen) y la pasaba como `signatureUrl` → `<img src=p12>` → icono de imagen rota. Nunca existió una imagen de firma en storage; `signaturePath` siempre fue el certificado. Fix en `download/route.ts`: el P12 se descarga/valida ANTES de renderizar, se extrae el CN del certificado y se pasa `?signedBy=<CN>`; la página de impresión dibuja el sello textual estándar FirmaEC ("Firmado electrónicamente por: NOMBRE"). Bonus: el P12 ya no se descarga dos veces; si el certificado es ilegible, el PDF sale como draft con advertencia.
- **Logo blanco en header de receta** (pedido del usuario): `filter: brightness(0) invert(1)` sobre el clinicLogo en los dos headers azules (#1B3A6B). Solo aplica a clinicLogo, no a la foto del médico; la marca de agua conserva el color original.
- README.md reescrito con datos reales: Next 16, dominio consultorio.site, planes FREE/TRIAL/PRO_MENSUAL($29)/PRO_ANUAL($249)/ENTERPRISE($129), Hotmart+Stripe, OpenRouter/DeepSeek, crons, seguridad.
- **Testimonio (decisión #32)**: componente `DoctorTestimonial` maquetado en /pricing y /upgrade, tras flag `testimonial` + contenido no vacío (doble guard: sin ambos no renderiza). Usuario eligió "maquetar sin datos" — falta la cita/nombre/foto del médico real.
- **Funnel de onboarding de médicos por WhatsApp** (PR #7, rama `claude/wa-onboarding-funnel` desde main): máquina de estados pura en `src/lib/wa-onboarding.ts` (nombre → especialidad → email → link de /register pre-llenado con trial). Endpoint `POST /api/onboarding/whatsapp` (x-api-secret timing-safe + zod). Estado en Lead.notes (campaign wa-onboarding), lead → INTERESADO al completar, alertas al admin vía Nexus WA. /register acepta prefill por query params. 8 tests nuevos (145 total). Falta post-merge: enrutar la instancia Nexus en n8n al endpoint (documentado en n8n-flows/README.md).

### PRs abiertos
- **#6** (esta rama): deps + fix firma + logo blanco + README + testimonio.
- **#7** (`claude/wa-onboarding-funnel`): funnel WhatsApp. Independiente de #6.

### Pendiente
- Verificar en producción la receta descargada: sello "Firmado electrónicamente por" + logo blanco (el sandbox no alcanza consultorio.site).
- Contenido real del testimonio (cita + nombre + foto) → completar `DoctorTestimonial.tsx` y activar flag `testimonial` en Vercel.
- Post-merge #7: configurar routing n8n de la instancia Nexus y (opcional) `NEXUS_ADMIN_PHONE` en Vercel.
- Migración db push → migraciones versionadas (deferred desde abril).

### Decisiones tomadas
- El sello visual de firma es TEXTO (convención FirmaEC), no imagen: no existe imagen de firma manuscrita en el sistema y el .p12 no contiene una.
- next se sube a 16.2.12 aunque no limpia las advisories (8 patches de fixes); el salto a 16.3 se hará cuando sea estable.
- mercadopago eliminado en vez de actualizado: cero uso en el código.
- Funnel WA determinista (sin LLM): respuestas predecibles, costo cero por mensaje, testeable. En rama separada a pedido del usuario.
- Sin testimonios inventados: el componente queda inerte hasta tener contenido de un médico real con consentimiento.

## Sesión 2026-07-06 — Cierre del hardening de seguridad

### Completado
- Verificado y commiteado todo el sweep de seguridad de la sesión 2026-07-05 (quedó sin commit):
  - `27c43f4` feat(security): OTP en portal de pacientes (flujo 2 pasos, challenge HMAC stateless, anti-enumeración, timing-safe) + rate limiting en middleware.
  - `d1ed99e` fix(security): 7 crons con `timingSafeStringEqual` para CRON_SECRET; superadmin centralizado en `src/lib/superadmin.ts` (18 migraciones); marketing credits sin fallback `'default_secret'`; `/api/debug` eliminado.
  - `1302303` chore(deps): overrides npm `pdfkit@0.10.0` + `crypto-js@3.3.0` (lockfile ya resolvía esas versiones, sin cambio).
- Typecheck limpio tras `rm -rf .next` (el fallo anterior era cache obsoleto que referenciaba la ruta debug borrada).
- `npm run build` OK. Vitest: 137/137 verdes.

### Completado (continuación, misma sesión)
- Push a main hecho (`464f264`, luego `bcbf067`).
- Env vars verificadas en Vercel Production: `CRON_SECRET` y `CREDITS_SECRET` existen.
- **Root cause de deploys rotos desde Jun 3**: `vercel.json` pedía `memory: 3009` para la ruta de descarga de PDF (commit `af0eed0`); el plan Hobby limita a 2048 MB, todos los deploys fallaban. Fix: `bcbf067` baja a 2048.
- Deploy manual a producción OK (`vercel --prod`), estado Ready.
- Smoke tests en producción: `/api/debug` → 404; portal OTP paso 1 devuelve `sent:true` + challenge (señuelo para email inexistente); cron sin secret → 401.

### Completado (verificación final)
- Auto-deploy confirmado funcionando de nuevo tras el fix de memoria.
- Descarga de PDF firmado en producción: primero falló con 500 ("@sparticuz/chromium/bin does not exist") — el file tracing de Next no incluía los binarios brotli de Chromium. Fix `d9c767a`: `outputFileTracingIncludes` en next.config.js para `/api/documents/**`. Nota: esto nunca funcionó en producción (Puppeteer se configuró el 3-jun y los deploys estaban rotos desde entonces).
- Test E2E post-fix (cuenta tefybel@gmail.com, sesión via magic link admin, autorizado por el usuario): HTTP 200 en 12.4s, X-Signed: true, PDF 160KB con /ByteRange y firma pkcs7 embebida. 2048 MB suficientes.

### Completado (update de remotion)
- remotion 4.0.457 → 4.0.484 (core, bundler, player, renderer — misma versión exacta). Commit `fb4703e`.
- Elimina las 2 advisories de `ws` (GHSA-58qx-3vcg-4xpx memory disclosure, GHSA-96hv-2xvq-fx4p DoS) que entraban vía @remotion/renderer → studio → bundler. `ws` ahora 8.21.0.
- npm audit: 33 → 29 vulns. Las 29 restantes son la cadena @signpdf/pdfkit/crypto-js aceptada y documentada en CLAUDE.md (sin fix; plan a largo plazo: migrar firma a SaaS).
- Verificado: typecheck, build y 137/137 tests OK. Deploy automático Ready en producción, sitio responde 200.

### Completado (fix descarga PDF = página de login)
- Reporte del usuario: al descargar el PDF de una receta, el archivo contenía la página de login en vez del documento.
- **Root cause real** (verificado con test E2E, distinto a la hipótesis inicial de rotación de tokens): `NEXT_PUBLIC_APP_URL` es el apex `https://consultorio.site`, pero Vercel responde 307 a nivel de edge hacia `https://www.consultorio.site`. Puppeteer seteaba las cookies de sesión host-only para el apex → tras el redirect a `www` no se enviaban → middleware redirigía a `/login` → el PDF capturaba la página de login. (El E2E de la 1:53 llamaba a la API por `www` pero Puppeteer internamente iba al apex; el redirect apex→www es lo que rompe.)
- Fixes (commits `95f30d4` y `253c9db`):
  - `pdf-generator.ts`: cookie con dominio `.consultorio.site` (punto inicial, `www.` recortado) → sobrevive el 307 en ambas direcciones. También `secure` en https.
  - `pdf-generator.ts`: guard post-`goto` — si la URL final es `/login`, lanza error descriptivo (500 con detail) en vez de devolver silenciosamente un PDF de login.
  - `pdf-generator.ts`: `INTERNAL_URL` ahora usa `NEXT_PUBLIC_APP_URL` también fuera de Vercel (antes caía a `localhost:3001`).
  - `route.ts` (download): el header Cookie para Puppeteer se construye desde `cookies()` de Next (valores post-refresh de `getUser()`) en vez del header crudo del request — elimina la fragilidad de access token expirado + refresh token rotado en sesiones >1h.
- Verificación E2E en producción (script `test-pdf-fix.mjs`, cuenta tefybel@gmail.com): sesión fresca Y sesión con `expires_at` vencido (fuerza refresh+rotación) → ambas HTTP 200, X-Signed: true, PDF 344KB con /ByteRange + pkcs7, contenido verificado con pdftotext (receta real, no login). PDFs de prueba borrados del scratchpad (PHI).

### Completado (INTERNAL_APP_URL)
- `INTERNAL_APP_URL=https://www.consultorio.site` agregada en Vercel Production (`vercel env add`) + `vercel redeploy` → Ready. Puppeteer ya no pasa por el 307 apex→www. E2E re-verificado: ambos tests PASS (200, X-Signed: true).

### Pendiente
- Nada urgente. Vulns restantes (29) son las aceptadas de @signpdf/pdfkit/crypto-js.

### Decisiones tomadas
- Commits divididos en 3 temáticos (portal OTP / hardening secrets / deps) en vez de uno solo.
- Deps de @remotion actualizadas después del sweep, a pedido del usuario (ver bloque "update de remotion").
