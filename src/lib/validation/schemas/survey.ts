import { z } from 'zod'

export const SurveyAnswerSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  wouldRecommend: z.boolean().optional().nullable(),
}).strict()

export type SurveyAnswer = z.infer<typeof SurveyAnswerSchema>
