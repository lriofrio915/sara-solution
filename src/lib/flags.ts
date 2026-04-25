/**
 * Feature flag utility — infrastructure only.
 *
 * No modules are gated by default. Wire up call sites individually as you
 * decide which features to expose conditionally (likely after PostHog data
 * accumulates and you can defend each gating with evidence).
 *
 * Resolution order (first match wins):
 *   1. URL override:    ?flags=marketing,notas        — request-scoped, dev/QA only
 *   2. Cookie override: sara_flags=marketing,notas    — sticky per browser, ops/admin
 *   3. Env var:         NEXT_PUBLIC_FEATURE_FLAGS=... — global default per deploy
 *   4. Hardcoded:       DEFAULT_FLAGS below           — fallback if nothing else set
 *
 * URL override is INTENTIONAL only-in-dev — production sites should not let an
 * arbitrary visitor override flags via query string. Server callers must opt
 * into URL parsing explicitly.
 */

/**
 * Known flag names. Add new ones here so TypeScript catches typos.
 * Do NOT remove a name without auditing every call site that references it.
 */
export type FeatureFlag =
  | 'marketing-suite'
  | 'sara-notes'
  | 'analytics-dashboard'
  | 'beta-modules-banner'

/** Flags enabled by default for every user. Empty = nothing on by default. */
const DEFAULT_FLAGS: ReadonlySet<FeatureFlag> = new Set<FeatureFlag>([])

/** Parse a comma-separated flag string. Tolerates whitespace and empty entries. */
export function parseFlagString(input: string | null | undefined): Set<FeatureFlag> {
  const out = new Set<FeatureFlag>()
  if (!input) return out
  for (const raw of input.split(',')) {
    const name = raw.trim()
    if (name) out.add(name as FeatureFlag)
  }
  return out
}

interface ResolveContext {
  /** ?flags=... query param value, when allowed. Pass null in production. */
  urlFlags?: string | null
  /** Cookie value of `sara_flags`. */
  cookieFlags?: string | null
  /** Override env. Defaults to process.env when omitted. */
  env?: { NEXT_PUBLIC_FEATURE_FLAGS?: string }
}

/**
 * Resolve the set of enabled flags for the current request.
 * Pure function — no side effects. Caller wires the inputs.
 */
export function resolveFlags(ctx: ResolveContext = {}): Set<FeatureFlag> {
  const env = ctx.env ?? process.env
  const fromUrl = parseFlagString(ctx.urlFlags)
  if (fromUrl.size > 0) return fromUrl
  const fromCookie = parseFlagString(ctx.cookieFlags)
  if (fromCookie.size > 0) return fromCookie
  const fromEnv = parseFlagString(env.NEXT_PUBLIC_FEATURE_FLAGS)
  if (fromEnv.size > 0) return fromEnv
  return new Set(DEFAULT_FLAGS)
}

export function isEnabled(flag: FeatureFlag, ctx: ResolveContext = {}): boolean {
  return resolveFlags(ctx).has(flag)
}
