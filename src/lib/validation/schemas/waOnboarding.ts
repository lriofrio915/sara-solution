import { z } from 'zod'

export const WaOnboardingSchema = z.object({
  phone: z.string().min(7).max(40),
  message: z.string().min(1).max(2000),
  pushName: z.string().max(120).optional(),
})

export type WaOnboardingBody = z.infer<typeof WaOnboardingSchema>
