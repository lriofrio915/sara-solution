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

// Grok Imagine only supports 6s/clip. Longer videos = multiple clips generated in parallel.
// Real cost: ~9.6 KIE credits per 6s clip. Sara charges ~2.5x markup.
export type VideoDurationClips = 1 | 3 | 5 | 8

export const VIDEO_DURATION_OPTIONS = [
  { label: '6 seg',   clips: 1 as VideoDurationClips, cost: 25  },
  { label: '~15 seg', clips: 3 as VideoDurationClips, cost: 60  },
  { label: '~30 seg', clips: 5 as VideoDurationClips, cost: 100 },
  { label: '~45 seg', clips: 8 as VideoDurationClips, cost: 150 },
] as const

export const SARA_CREDIT_COSTS = {
  IMAGE: 5,
  VIDEO_BY_CLIPS: { 1: 25, 3: 60, 5: 100, 8: 150 } as Record<VideoDurationClips, number>,
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

export async function createVideoExtendTask(prevTaskId: string, prompt: string): Promise<KieTaskResult> {
  const body = {
    model: 'grok-imagine/extend',
    input: {
      task_id: prevTaskId,
      prompt,
      extend_at: 0,
      extend_times: '6',
    },
  }
  console.log('KIE extend request:', JSON.stringify(body))
  const res = await fetch(`${KIE_BASE_URL}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.code !== 200) {
    console.error('KIE video extend raw response:', JSON.stringify(data))
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
