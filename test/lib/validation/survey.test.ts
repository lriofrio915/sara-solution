import { describe, it, expect } from 'vitest'
import { SurveyAnswerSchema } from '@/lib/validation/schemas/survey'

describe('SurveyAnswerSchema', () => {
  it('accepts valid score 1-5', () => {
    for (const score of [1, 2, 3, 4, 5]) {
      expect(SurveyAnswerSchema.safeParse({ score }).success).toBe(true)
    }
  })

  it('rejects score < 1', () => {
    expect(SurveyAnswerSchema.safeParse({ score: 0 }).success).toBe(false)
  })

  it('rejects score > 5', () => {
    expect(SurveyAnswerSchema.safeParse({ score: 6 }).success).toBe(false)
  })

  it('rejects non-integer score', () => {
    expect(SurveyAnswerSchema.safeParse({ score: 4.5 }).success).toBe(false)
  })

  it('rejects missing score', () => {
    expect(SurveyAnswerSchema.safeParse({ comment: 'nice' }).success).toBe(false)
  })

  it('accepts optional comment and wouldRecommend', () => {
    expect(SurveyAnswerSchema.safeParse({ score: 5, comment: 'great', wouldRecommend: true }).success).toBe(true)
  })

  it('rejects comment longer than 2000 chars', () => {
    expect(SurveyAnswerSchema.safeParse({ score: 5, comment: 'a'.repeat(2001) }).success).toBe(false)
  })

  it('rejects unknown fields', () => {
    expect(SurveyAnswerSchema.safeParse({ score: 5, injected: 'oops' }).success).toBe(false)
  })
})
