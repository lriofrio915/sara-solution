/**
 * POST /api/webhooks/nexus
 * Webhook for the Nexus admin WhatsApp instance (Evolution API).
 * This number is used only for outbound admin notifications — no Sara IA logic runs here.
 */
export const dynamic = 'force-dynamic'

export async function POST() {
  return Response.json({ ok: true })
}
