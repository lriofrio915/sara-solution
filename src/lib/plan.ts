export type EffectivePlan = 'FREE' | 'TRIAL' | 'PRO' | 'ENTERPRISE'

/**
 * Returns the effective plan, downgrading TRIAL to FREE if the trial has expired.
 */
export function getEffectivePlan(doctor: { plan: string; trialEndsAt: Date | null }): EffectivePlan {
  if (doctor.plan === 'TRIAL' && doctor.trialEndsAt && doctor.trialEndsAt < new Date()) {
    return 'FREE'
  }
  return doctor.plan as EffectivePlan
}

/** Days remaining in trial (0 if expired or no trial). */
export function getTrialDaysLeft(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0
  const diff = trialEndsAt.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/** TRUE for plans that have full access. */
export function isPro(plan: EffectivePlan): boolean {
  return plan === 'PRO' || plan === 'ENTERPRISE' || plan === 'TRIAL'
}

export const TRIAL_DAYS = 21

export const HOTMART = {
  monthly: 'https://pay.hotmart.com/X104843203F?checkoutMode=2',
  annual:  'https://pay.hotmart.com/H104994063B?checkoutMode=2',
}
