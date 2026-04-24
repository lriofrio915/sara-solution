import { z } from 'zod'
import { ChatMessageSchema } from './chat'

export const SaraPublicSchema = z.object({
  slug: z.string().min(1).max(100),
  messages: z.array(ChatMessageSchema).min(1).max(50),
  choice: z.string().max(500).optional(),
  finalContent: z.string().max(10000).optional(),
}).passthrough()

export type SaraPublicBody = z.infer<typeof SaraPublicSchema>
