/**
 * KIE.AI — Client for image and video generation
 * API: https://api.kie.ai
 * Docs: https://docs.kie.ai
 */

const KIE_BASE_URL = 'https://api.kie.ai'

function getApiKey(): string {
  const key = process.env.KIE_AI_API_KEY
  if (!key) throw new Error('KIE_AI_API_KEY no configurada')
  return key
}

function headers() {
  return {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  }
}

// ─── Credit costs in "Sara credits" (admin adjusts here) ─────

export const SARA_CREDIT_COSTS = {
  IMAGE: 5,   // credits per image (Flux-2 Pro)
  VIDEO: 20,  // credits per video (Kling 5s)
} as const

// ─── Recharge packages available to doctors ──────────────────

export const CREDIT_PACKAGES = [
  { credits: 100, priceUsd: 5  },
  { credits: 250, priceUsd: 10 },
] as const

// ─── API calls ───────────────────────────────────────────────

export interface KieTaskResult {
  taskId: string
}

export interface KieTaskStatus {
  state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail'
  resultUrl?: string
}

export async function createImageTask(
  prompt: string,
  aspectRatio: '1:1' | '4:5' | '16:9' = '1:1'
): Promise<KieTaskResult> {
  const res = await fetch(`${KIE_BASE_URL}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: 'flux-2/pro-text-to-image',
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        resolution: '1K',
        nsfw_checker: false,
      },
    }),
  })

  const data = await res.json()
  if (!res.ok || data.code !== 200) {
    throw new Error(data.msg ?? `KIE error ${res.status}`)
  }

  return { taskId: data.data.taskId }
}

export async function createVideoTask(prompt: string): Promise<KieTaskResult> {
  const res = await fetch(`${KIE_BASE_URL}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: 'kling/v2-1-master-text-to-video',
      input: {
        prompt,
        negative_prompt: '',
        aspect_ratio: '9:16',
        duration: '5',
        cfg_scale: 0.5,
      },
    }),
  })

  const data = await res.json()
  if (!res.ok || data.code !== 200) {
    console.error('KIE video raw response:', JSON.stringify(data))
    throw new Error(data.msg ?? `KIE error ${res.status}`)
  }

  return { taskId: data.data.taskId }
}

export async function getTaskResult(taskId: string): Promise<KieTaskStatus> {
  const res = await fetch(
    `${KIE_BASE_URL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    { headers: headers() }
  )

  const data = await res.json()
  if (!res.ok || data.code !== 200) {
    throw new Error(data.msg ?? `KIE error ${res.status}`)
  }

  const { state, resultJson } = data.data

  let resultUrl: string | undefined
  if (state === 'success' && resultJson) {
    try {
      const parsed = JSON.parse(resultJson)
      resultUrl = parsed.resultUrls?.[0]
    } catch {
      // resultJson may not be JSON
    }
  }

  return { state, resultUrl }
}

export async function getAdminCredits(): Promise<number> {
  const res = await fetch(`${KIE_BASE_URL}/api/v1/chat/credit`, {
    headers: headers(),
  })
  const data = await res.json()
  return data.data ?? 0
}
