/**
 * ICD-11 OAuth2 service — WHO ICD API
 * Docs: https://icd.who.int/icdapi
 */

const TOKEN_ENDPOINT = 'https://icdaccessmanagement.who.int/connect/token'
const SEARCH_ENDPOINT = 'https://id.who.int/icd/release/11/2024-01/mms/search'

// ── Public types ──────────────────────────────────────────────────────────────

export interface Icd11Result {
  code: string
  title: string
}

// ── Internal types ────────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string
  expires_in: number
}

interface RawSearchEntity {
  theCode: string
  title: { '@value': string }
}

interface SearchResponse {
  destinationEntities?: RawSearchEntity[]
}

// ── Token cache (module-level) ────────────────────────────────────────────────

interface CachedToken {
  value: string
  expiresAt: number // ms epoch
}

let cachedToken: CachedToken | null = null

async function getAccessToken(): Promise<string> {
  const clientId = process.env.ICD_CLIENT_ID
  const clientSecret = process.env.ICD_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('ICD_CLIENT_ID or ICD_CLIENT_SECRET env vars are not set')
  }

  const now = Date.now()
  if (cachedToken && now < cachedToken.expiresAt) {
    return cachedToken.value
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'icdapi_access',
  })

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`ICD token request failed: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as TokenResponse

  // Cache with a 60-second safety margin
  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  }

  return cachedToken.value
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchIcd11(query: string): Promise<Icd11Result[]> {
  if (!query.trim()) return []

  try {
    const token = await getAccessToken()

    const url = new URL(SEARCH_ENDPOINT)
    url.searchParams.set('q', query)
    url.searchParams.set('flatResults', 'true')
    url.searchParams.set('highlightingEnabled', 'false')
    url.searchParams.set('useFlexisearch', 'true')

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Accept-Language': 'en',
        'API-Version': 'v2',
      },
    })

    if (!res.ok) {
      console.error(`ICD-11 search failed: ${res.status} ${res.statusText}`)
      return []
    }

    const data = (await res.json()) as SearchResponse
    const entities = data.destinationEntities ?? []

    return entities.map((entity) => ({
      code: entity.theCode,
      title: entity.title['@value'],
    }))
  } catch (err) {
    console.error('searchIcd11 error:', err)
    return []
  }
}
