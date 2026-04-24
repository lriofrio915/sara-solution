import { z } from 'zod'

const trimmedString = (min: number, max: number) =>
  z.string().trim().min(min).max(max)

const optionalTrimmed = (max: number) =>
  z.string().trim().max(max).optional().nullable()

const sourceField = z.string().trim().max(50).optional()
const statusField = z.string().trim().max(50).optional()

// --- Lead (marketing SaaS leads — prisma.lead) ---

export const LeadCreateSchema = z.object({
  name: trimmedString(2, 120),
  email: z.string().trim().email().max(200).optional().nullable(),
  phone: optionalTrimmed(30),
  source: sourceField,
  campaign: optionalTrimmed(120),
  specialty: optionalTrimmed(80),
  city: optionalTrimmed(80),
  utmSource: optionalTrimmed(120),
  utmMedium: optionalTrimmed(120),
  utmCampaign: optionalTrimmed(120),
  status: statusField,
  notes: optionalTrimmed(2000),
}).strict()

export const LeadUpdateSchema = LeadCreateSchema.partial().strict()

export const LeadWebhookSchema = z.object({
  name: trimmedString(2, 120),
  email: z.string().trim().email().max(200).optional().nullable(),
  phone: optionalTrimmed(30),
  specialty: optionalTrimmed(80),
  city: optionalTrimmed(80),
  source: sourceField,
  campaign: optionalTrimmed(120),
  utmSource: optionalTrimmed(120),
  utmMedium: optionalTrimmed(120),
  utmCampaign: optionalTrimmed(120),
}).strict()

// --- PatientLead (per-doctor patient capture — prisma.patientLead) ---

export const PatientLeadCreateSchema = z.object({
  name: trimmedString(2, 120),
  phone: optionalTrimmed(30),
  email: z.string().trim().email().max(200).optional().nullable(),
  message: optionalTrimmed(2000),
  source: sourceField,
  campaign: optionalTrimmed(120),
  status: statusField,
  notes: optionalTrimmed(2000),
}).strict()

export const PatientLeadUpdateSchema = PatientLeadCreateSchema.partial().strict()

export type LeadCreate = z.infer<typeof LeadCreateSchema>
export type LeadUpdate = z.infer<typeof LeadUpdateSchema>
export type LeadWebhook = z.infer<typeof LeadWebhookSchema>
export type PatientLeadCreate = z.infer<typeof PatientLeadCreateSchema>
export type PatientLeadUpdate = z.infer<typeof PatientLeadUpdateSchema>
