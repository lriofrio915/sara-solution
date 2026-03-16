// ─── Domain Enums ─────────────────────────────────────────────────────────────

export type Plan = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export type AppointmentType =
  | 'IN_PERSON'
  | 'TELECONSULT'
  | 'HOME_VISIT'
  | 'EMERGENCY'
  | 'FOLLOW_UP'

export type BloodType =
  | 'A_POS'
  | 'A_NEG'
  | 'B_POS'
  | 'B_NEG'
  | 'AB_POS'
  | 'AB_NEG'
  | 'O_POS'
  | 'O_NEG'
  | 'UNKNOWN'

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface Doctor {
  id: string
  slug: string
  name: string
  specialty: string
  email: string
  phone?: string | null
  plan: Plan
  active: boolean
  avatarUrl?: string | null
  bio?: string | null
  address?: string | null
  authId?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Patient {
  id: string
  doctorId: string
  name: string
  email?: string | null
  phone?: string | null
  birthDate?: Date | null
  bloodType: BloodType
  allergies: string[]
  notes?: string | null
  avatarUrl?: string | null
  documentId?: string | null
  documentType?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Appointment {
  id: string
  doctorId: string
  patientId: string
  date: Date
  duration: number
  status: AppointmentStatus
  type: AppointmentType
  notes?: string | null
  reason?: string | null
  location?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MedicalRecord {
  id: string
  patientId: string
  doctorId: string
  diagnosis: string
  treatment?: string | null
  notes?: string | null
  symptoms: string[]
  vitalSigns?: VitalSigns | null
  attachments: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Prescription {
  id: string
  patientId: string
  doctorId: string
  date: Date
  medications: Medication[]
  instructions?: string | null
  diagnosis?: string | null
  issuedAt: Date
  expiresAt?: Date | null
  pdfUrl?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SaraConversation {
  id: string
  doctorId: string
  patientId?: string | null
  messages: SaraConversationMessage[]
  context?: string | null
  title?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Reminder {
  id: string
  doctorId: string
  title: string
  description?: string | null
  dueDate: Date
  completed: boolean
  completedAt?: Date | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  category?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SocialPost {
  id: string
  doctorId: string
  content: string
  imageUrl?: string | null
  platforms: string[]
  publishedAt?: Date | null
  scheduledAt?: Date | null
  status: PostStatus
  hashtags: string[]
  externalIds?: Record<string, string> | null
  createdAt: Date
  updatedAt: Date
}

// ─── App-level types ──────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface DashboardStats {
  totalPatients: number
  appointmentsToday: number
  appointmentsThisMonth: number
  pendingReminders: number
}

export interface Medication {
  name: string
  dose: string
  frequency: string
  duration?: string
  notes?: string
}

export interface VitalSigns {
  bp?: string    // Blood pressure e.g. "120/80"
  hr?: number    // Heart rate
  temp?: number  // Temperature °C
  weight?: number
  height?: number
  spo2?: number  // O2 saturation %
}

export interface SaraConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  source: 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE' | 'REFERIDO' | 'OTRO'
  campaign?: string
  status: 'NUEVO' | 'CONTACTADO' | 'INTERESADO' | 'CONVERTIDO' | 'PERDIDO'
  notes?: string
  contactedAt: string
  createdAt: string
}

export interface AdminDoctor {
  id: string
  slug: string
  name: string
  specialty: string
  email: string
  plan: string | null
  avatarUrl: string | null
  createdAt: string
  _count: { patients: number }
}
