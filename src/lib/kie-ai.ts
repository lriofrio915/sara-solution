/**
 * KIE.AI — Client for image and video generation
 * API: https://api.kie.ai
 * Docs: https://docs.kie.ai
 */

const KIE_BASE_URL = 'https://api.kie.ai'
const KIE_UPLOAD_URL = 'https://kieai.redpandaai.co'

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

// Grok Imagine only supports 6s/clip. Extend está deshabilitado hasta confirmar payload con KIE.
export type VideoDurationClips = 1

export const VIDEO_DURATION_OPTIONS = [
  { label: '6 seg', clips: 1 as VideoDurationClips, cost: 20 },
] as const

export const SARA_CREDIT_COSTS = {
  IMAGE: 5,
  VIDEO_BY_CLIPS: { 1: 20 } as Record<VideoDurationClips, number>,
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
  failReason?: string
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
      model: 'grok-imagine/text-to-video',
      input: {
        prompt,
        aspect_ratio: '9:16',
        mode: 'normal',
        duration: '6',
        resolution: '480p',
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
  const failReason: string | undefined =
    data.data.failMsg ?? data.data.errorMsg ?? data.data.failReason ?? data.data.failCode ?? undefined

  let resultUrl: string | undefined
  if (state === 'success' && resultJson) {
    try {
      resultUrl = JSON.parse(resultJson).resultUrls?.[0]
    } catch {
      // resultJson may not be JSON
    }
  }

  return { state, resultUrl, failReason }
}

export async function uploadImageToKie(base64Data: string, fileName: string): Promise<string> {
  const res = await fetch(`${KIE_UPLOAD_URL}/api/file-base64-upload`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ base64Data, uploadPath: 'sara-videos', fileName }),
  })
  const data = await res.json()
  if (!res.ok || !data.data?.downloadUrl) {
    throw new Error(data.msg ?? 'Error subiendo imagen a KIE')
  }
  return data.data.downloadUrl
}

export async function createVideoFromImageTask(imageUrl: string, prompt: string): Promise<KieTaskResult> {
  const res = await fetch(`${KIE_BASE_URL}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: 'grok-imagine/image-to-video',
      input: {
        prompt,
        image_urls: [imageUrl],
        mode: 'normal',
        duration: '6',
        resolution: '480p',
        aspect_ratio: '9:16',
      },
    }),
  })
  const data = await res.json()
  if (!res.ok || data.code !== 200) {
    console.error('KIE image-to-video raw response:', JSON.stringify(data))
    throw new Error(data.msg ?? `KIE error ${res.status}`)
  }
  return { taskId: data.data.taskId }
}

export async function getAdminCredits(): Promise<number> {
  const res = await fetch(`${KIE_BASE_URL}/api/v1/chat/credit`, {
    headers: headers(),
  })
  const data = await res.json()
  return data.data ?? 0
}
