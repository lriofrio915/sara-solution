import { z } from 'zod'

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().max(10000),
}).passthrough()

export const ChatBodySchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
})

export type ChatBody = z.infer<typeof ChatBodySchema>
