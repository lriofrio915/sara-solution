/**
 * Shared WhatsApp sender via Evolution API.
 * @param to      - Destination phone (any format, digits extracted automatically)
 * @param text    - Message text
 * @param instance - Evolution instance name. Falls back to EVOLUTION_INSTANCE_NAME env var.
 */
export async function sendWA(to: string, text: string, instance?: string): Promise<boolean> {
  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const instanceName = instance ?? process.env.EVOLUTION_INSTANCE_NAME
  if (!evolutionUrl || !evolutionKey || !instanceName) return false

  const phone = to.replace(/\D/g, '')
  if (phone.length < 7) return false

  try {
    const res = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
      body: JSON.stringify({ number: phone, text }),
    })
    return res.ok
  } catch {
    return false
  }
}
