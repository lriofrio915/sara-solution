/**
 * Inyecta datos estructurados desde un componente de servidor.
 *
 * El `<` se escapa a `<` porque es el único carácter con el que un valor de texto
 * podría cerrar la etiqueta <script> antes de tiempo. Los datos que se pasan aquí deben
 * ser siempre públicos: nunca información de pacientes.
 */
type JsonLdProps = { data: Record<string, unknown> | Record<string, unknown>[] }

export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
