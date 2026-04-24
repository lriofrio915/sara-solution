import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time string comparison for webhook secrets and tokens.
 * Prevents timing-attack-based token extraction.
 *
 * Returns false for undefined/empty inputs or length mismatch before any
 * constant-time work, which is fine: the attacker only learns length-mismatch,
 * not byte positions of the real secret.
 */
export function timingSafeStringEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
