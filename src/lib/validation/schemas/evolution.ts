import { z } from 'zod'

export const EvolutionWebhookSchema = z.object({
  event: z.string().min(1).max(100).optional(),
  instance: z.string().max(200).optional(),
  data: z.unknown().optional(),
}).passthrough()

export type EvolutionWebhook = z.infer<typeof EvolutionWebhookSchema>
