import { z } from 'zod'

export const ContactSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email().max(200).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
})

export type ContactInput = z.infer<typeof ContactSchema>
