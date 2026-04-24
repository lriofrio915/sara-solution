import { z } from 'zod'

export const HotmartWebhookSchema = z.object({
  event: z.string().min(1).max(100).optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough()

export type HotmartWebhook = z.infer<typeof HotmartWebhookSchema>
