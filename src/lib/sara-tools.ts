/**
 * Sara Tool Handlers — Fase 3
 *
 * Implementación directa con Prisma de las 9 herramientas de Sara.
 * Importar aquí elimina el patrón de HTTP self-calls de sara.ts.
 */

import { prisma } from '@/lib/prisma'

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// ─── 1. register_patient ─────────────────────────────────────────────────────

async function registerPatient(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    const name = args.name as string
    if (!name) return { success: false, error: 'El nombre del paciente es requerido' }

    // Duplicate detection before creating
    const dupConditions: object[] = []
    if (args.documentId) {
      dupConditions.push({ documentId: String(args.documentId) })
    }
    if (args.phone && name) {
      dupConditions.push({
        phone: String(args.phone),
        name: { equals: name, mode: 'insensitive' as const },
      })
    }
    if (dupConditions.length > 0) {
      const existing = await prisma.patient.findFirst({
        where: { doctorId, OR: dupConditions },
        select: { id: true, name: true, phone: true, email: true, bloodType: true },
      })
      if (existing) {
        return {
          success: true,
          data: {
            message: `El paciente ${existing.name} ya está registrado en el sistema.`,
            patient: existing,
            alreadyExisted: true,
          },
        }
      }
    }

    const insuranceNote = args.insurance ? `Seguro: ${args.insurance as string}` : ''
    const baseNotes = (args.notes as string) || ''
    const combinedNotes = insuranceNote
      ? insuranceNote + (baseNotes ? '. ' + baseNotes : '')
      : baseNotes || null

    const patient = await prisma.patient.create({
      data: {
        doctorId,
        name,
        email: (args.email as string) || null,
        phone: (args.phone as string) || null,
        birthDate: args.birthDate ? new Date(args.birthDate as string) : null,
        bloodType: (args.bloodType as 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG' | 'UNKNOWN') || 'UNKNOWN',
        allergies: (args.allergies as string[]) || [],
        documentId: (args.documentId as string) || null,
        notes: combinedNotes,
      },
    })

    return {
      success: true,
      data: {
        message: `Paciente ${patient.name} registrado exitosamente`,
        patient: {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          bloodType: patient.bloodType,
        },
      },
    }
  } catch (error) {
    console.error('register_patient error:', error)
    return { success: false, error: 'Error al registrar el paciente' }
  }
}

// ─── 2. search_patients ───────────────────────────────────────────────────────

async function searchPatients(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    const query = args.query as string
    const limit = Math.min((args.limit as number) || 5, 20)

    if (!query) return { success: false, error: 'El término de búsqueda es requerido' }

    const patients = await prisma.patient.findMany({
      where: {
        doctorId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { documentId: { contains: query } },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        bloodType: true,
        documentId: true,
      },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      data: {
        total: patients.length,
        patients,
      },
    }
  } catch (error) {
    console.error('search_patients error:', error)
    return { success: false, error: 'Error al buscar pacientes' }
  }
}

// ─── 3. check_available_slots ────────────────────────────────────────────────

// Default schedule used when doctor hasn't configured availability yet
const DEFAULT_AVAILABILITY = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  startTime: '09:00',
  endTime: '18:00',
  isActive: true,
}))

async function checkAvailableSlots(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    const dateParam = args.date as string
    if (!dateParam) return { success: false, error: 'La fecha es requerida (YYYY-MM-DD)' }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { appointmentDuration: true, availabilitySchedules: true },
    })

    if (!doctor) return { success: false, error: 'Médico no encontrado' }

    const [year, month, day] = dateParam.split('-').map(Number)
    const requestedDate = new Date(year, month - 1, day)
    const weekday = requestedDate.getDay()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (requestedDate < today) {
      return { success: false, error: 'No se pueden agendar citas en fechas pasadas' }
    }

    // Use configured schedule or fall back to default (Mon–Fri 9–18)
    const schedules = doctor.availabilitySchedules.length > 0
      ? doctor.availabilitySchedules
      : DEFAULT_AVAILABILITY

    const schedule = schedules.find((s) => s.weekday === weekday && s.isActive)

    if (!schedule) {
      const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
      return {
        success: true,
        data: {
          available: false,
          message: `El médico no tiene atención disponible los ${DAYS[weekday]}s. Por favor elige otro día (lunes a viernes).`,
          slots: [],
        },
      }
    }

    const duration = doctor.appointmentDuration || 30
    const allSlots = generateTimeSlots(schedule.startTime, schedule.endTime, duration)

    const startOfDay = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const booked = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lt: endOfDay },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { date: true },
    })

    const bookedTimes = new Set(
      booked.map((a) => {
        const d = new Date(a.date.getTime() - 5 * 60 * 60 * 1000)
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
      })
    )

    const availableSlots = allSlots.filter((slot) => !bookedTimes.has(slot))

    if (availableSlots.length === 0) {
      return {
        success: true,
        data: {
          available: false,
          message: `No hay horarios disponibles para el ${dateParam}. El médico está completamente ocupado ese día.`,
          slots: [],
        },
      }
    }

    const locationInfo = (schedule as { location?: string | null }).location ?? null

    return {
      success: true,
      data: {
        available: true,
        date: dateParam,
        duration,
        location: locationInfo,
        slots: availableSlots,
        message: `Hay ${availableSlots.length} horarios disponibles el ${dateParam}: ${availableSlots.slice(0, 8).join(', ')}${availableSlots.length > 8 ? '...' : ''}${locationInfo ? ` — Centro de atención: ${locationInfo}` : ''}`,
      },
    }
  } catch (error) {
    console.error('check_available_slots error:', error)
    return { success: false, error: 'Error al consultar disponibilidad' }
  }
}

function generateTimeSlots(startTime: string, endTime: string, duration: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startTotal = sh * 60 + sm
  const endTotal = eh * 60 + em
  const slots: string[] = []
  for (let t = startTotal; t + duration <= endTotal; t += duration) {
    slots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)
  }
  return slots
}

// ─── 4. schedule_appointment ─────────────────────────────────────────────────

async function scheduleAppointment(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    const date = args.date as string
    if (!date) return { success: false, error: 'La fecha de la cita es requerida' }

    let patientId = args.patientId as string | undefined

    // If no patientId, search by name
    if (!patientId && args.patientName) {
      const found = await prisma.patient.findFirst({
        where: {
          doctorId,
          name: { contains: args.patientName as string, mode: 'insensitive' },
        },
        select: { id: true, name: true },
      })
      if (!found) {
        return {
          success: false,
          error: `No se encontró un paciente con el nombre "${args.patientName}". Primero registra al paciente.`,
        }
      }
      patientId = found.id
    }

    if (!patientId) return { success: false, error: 'Se requiere el ID o nombre del paciente' }

    // Parse date as Ecuador local time (UTC-5) → convert to UTC for storage
    // Sara passes times in Ecuador local time (e.g. "2026-03-11T16:30")
    // new Date('YYYY-MM-DDTHH:mm') on a UTC server = UTC, causing -5h shift in display
    // Fix: explicitly add 5 hours to treat input as UTC-5
    let appointmentDate: Date
    try {
      const [datePart, timePart = '00:00'] = date.split('T')
      const [y, mo, d] = datePart.split('-').map(Number)
      const [h, mi] = timePart.split(':').map(Number)
      appointmentDate = new Date(Date.UTC(y, mo - 1, d, h + 5, mi)) // UTC-5 → UTC
    } catch {
      appointmentDate = new Date(date)
    }
    let apptDuration = 30
    try {
      const doc = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { appointmentDuration: true },
      })
      apptDuration = doc?.appointmentDuration ?? 30
    } catch { /* column may not exist yet, use default */ }
    const duration = (args.duration as number) || apptDuration

    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date: appointmentDate,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    })

    if (conflict) {
      const timeStr = appointmentDate.toLocaleTimeString('es-EC', {
        timeZone: 'America/Guayaquil',
        hour: '2-digit',
        minute: '2-digit',
      })
      return {
        success: false,
        error: `El horario de las ${timeStr} ya está ocupado. Usa check_available_slots para ver los horarios libres.`,
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId,
        date: appointmentDate,
        duration,
        type: (args.type as 'IN_PERSON' | 'TELECONSULT' | 'HOME_VISIT' | 'EMERGENCY' | 'FOLLOW_UP') || 'IN_PERSON',
        reason: (args.reason as string) || null,
        notes: (args.notes as string) || null,
        location: (args.location as string) || null,
        status: 'SCHEDULED',
      },
      include: { patient: { select: { name: true } } },
    })

    const dateStr = new Date(date).toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      dateStyle: 'full',
      timeStyle: 'short',
    })

    const locationInfo = (args.location as string) || null

    return {
      success: true,
      data: {
        message: `✅ Cita confirmada para ${appointment.patient.name} el ${dateStr}${locationInfo ? ` — ${locationInfo}` : ''}`,
        appointment: {
          id: appointment.id,
          patientName: appointment.patient.name,
          date: appointment.date,
          duration: appointment.duration,
          type: appointment.type,
          reason: appointment.reason,
          location: appointment.location,
        },
      },
    }
  } catch (error) {
    console.error('schedule_appointment error:', error)
    return { success: false, error: 'Error al agendar la cita' }
  }
}

// ─── 5. get_appointments_today ────────────────────────────────────────────────

async function getAppointmentsToday(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    const now = new Date()
    // Use UTC range for today in Ecuador (UTC-5)
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0))
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lt: endOfDay },
        status: { notIn: ['CANCELLED'] },
      },
      include: { patient: { select: { name: true, phone: true } } },
      orderBy: { date: 'asc' },
    })

    const formatted = appointments.map((a) => ({
      id: a.id,
      patientName: a.patient.name,
      patientPhone: a.patient.phone,
      time: new Date(a.date).toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' }),
      duration: a.duration,
      type: a.type,
      reason: a.reason,
      status: a.status,
    }))

    return {
      success: true,
      data: {
        date: now.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', dateStyle: 'full' }),
        total: formatted.length,
        appointments: formatted,
      },
    }
  } catch (error) {
    console.error('get_appointments_today error:', error)
    return { success: false, error: 'Error al obtener las citas de hoy' }
  }
}

// ─── 5. get_patient_record ────────────────────────────────────────────────────

async function getPatientRecord(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    let patient = null

    if (args.patientId) {
      patient = await prisma.patient.findFirst({
        where: { id: args.patientId as string, doctorId },
        include: {
          appointments: { orderBy: { date: 'desc' }, take: 5 },
          medicalRecords: { orderBy: { createdAt: 'desc' }, take: 5 },
          prescriptions: { orderBy: { createdAt: 'desc' }, take: 3 },
        },
      })
    } else if (args.patientName) {
      patient = await prisma.patient.findFirst({
        where: {
          doctorId,
          name: { contains: args.patientName as string, mode: 'insensitive' },
        },
        include: {
          appointments: { orderBy: { date: 'desc' }, take: 5 },
          medicalRecords: { orderBy: { createdAt: 'desc' }, take: 5 },
          prescriptions: { orderBy: { createdAt: 'desc' }, take: 3 },
        },
      })
    }

    if (!patient) {
      return { success: false, error: 'Paciente no encontrado en el sistema' }
    }

    return { success: true, data: { patient } }
  } catch (error) {
    console.error('get_patient_record error:', error)
    return { success: false, error: 'Error al obtener el historial del paciente' }
  }
}

// ─── 6. update_medical_record ─────────────────────────────────────────────────

async function updateMedicalRecord(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    const diagnosis = args.diagnosis as string
    if (!diagnosis) return { success: false, error: 'El diagnóstico es requerido' }

    let patientId = args.patientId as string | undefined

    if (!patientId && args.patientName) {
      const found = await prisma.patient.findFirst({
        where: { doctorId, name: { contains: args.patientName as string, mode: 'insensitive' } },
        select: { id: true },
      })
      if (!found) return { success: false, error: `Paciente "${args.patientName}" no encontrado` }
      patientId = found.id
    }

    if (!patientId) return { success: false, error: 'Se requiere el ID o nombre del paciente' }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId,
        doctorId,
        diagnosis,
        treatment: (args.treatment as string) || null,
        symptoms: (args.symptoms as string[]) || [],
        notes: (args.notes as string) || null,
        vitalSigns: args.vitalSigns ? (args.vitalSigns as object) : undefined,
      },
      include: { patient: { select: { name: true } } },
    })

    return {
      success: true,
      data: {
        message: `Registro médico creado para ${record.patient.name}`,
        record: {
          id: record.id,
          patientName: record.patient.name,
          diagnosis: record.diagnosis,
          treatment: record.treatment,
          createdAt: record.createdAt,
        },
      },
    }
  } catch (error) {
    console.error('update_medical_record error:', error)
    return { success: false, error: 'Error al crear el registro médico' }
  }
}

// ─── 7. create_prescription ──────────────────────────────────────────────────

async function createPrescription(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    const medications = args.medications as Array<{ name: string; dose: string; frequency: string; duration?: string; notes?: string }>
    if (!medications || medications.length === 0) {
      return { success: false, error: 'Se requiere al menos un medicamento' }
    }

    let patientId = args.patientId as string | undefined

    if (!patientId && args.patientName) {
      const found = await prisma.patient.findFirst({
        where: { doctorId, name: { contains: args.patientName as string, mode: 'insensitive' } },
        select: { id: true },
      })
      if (!found) return { success: false, error: `Paciente "${args.patientName}" no encontrado` }
      patientId = found.id
    }

    if (!patientId) return { success: false, error: 'Se requiere el ID o nombre del paciente' }

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        doctorId,
        medications,
        diagnosis: (args.diagnosis as string) || null,
        instructions: (args.instructions as string) || null,
      },
      include: { patient: { select: { name: true } } },
    })

    return {
      success: true,
      data: {
        message: `Receta creada para ${prescription.patient.name} con ${medications.length} medicamento(s)`,
        prescription: {
          id: prescription.id,
          patientName: prescription.patient.name,
          medications,
          diagnosis: prescription.diagnosis,
          issuedAt: prescription.issuedAt,
        },
      },
    }
  } catch (error) {
    console.error('create_prescription error:', error)
    return { success: false, error: 'Error al crear la receta' }
  }
}

// ─── 8. create_reminder ──────────────────────────────────────────────────────

async function createReminder(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    const title = args.title as string
    const dueDate = args.dueDate as string

    if (!title) return { success: false, error: 'El título del recordatorio es requerido' }
    if (!dueDate) return { success: false, error: 'La fecha del recordatorio es requerida' }

    const reminder = await prisma.reminder.create({
      data: {
        doctorId,
        title,
        description: (args.description as string) || null,
        dueDate: new Date(dueDate),
        priority: (args.priority as string) || 'MEDIUM',
        category: (args.category as string) || null,
      },
    })

    const dateStr = new Date(dueDate).toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    return {
      success: true,
      data: {
        message: `Recordatorio "${reminder.title}" creado para el ${dateStr}`,
        reminder: {
          id: reminder.id,
          title: reminder.title,
          dueDate: reminder.dueDate,
          priority: reminder.priority,
        },
      },
    }
  } catch (error) {
    console.error('create_reminder error:', error)
    return { success: false, error: 'Error al crear el recordatorio' }
  }
}

// ─── 9. search_knowledge ─────────────────────────────────────────────────────

async function searchKnowledge(args: Record<string, unknown>, doctorId: string): Promise<ToolResult> {
  try {
    const query = args.query as string
    const limit = Math.min((args.limit as number) || 5, 10)

    if (!query) return { success: false, error: 'El término de búsqueda es requerido' }

    const docs = await prisma.knowledgeDocument.findMany({
      where: {
        doctorId,
        textContent: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      select: {
        id: true,
        name: true,
        textContent: true,
        createdAt: true,
      },
    })

    // Return relevant excerpts — up to 2000 chars around the best match
    const results = docs.map((doc) => {
      const lowerContent = doc.textContent.toLowerCase()
      const lowerQuery = query.toLowerCase()
      const idx = lowerContent.indexOf(lowerQuery)

      let excerpt: string
      if (idx === -1) {
        // No direct match (full-text search may have matched via icontains) — return beginning
        excerpt = doc.textContent.slice(0, 2000) + (doc.textContent.length > 2000 ? '...' : '')
      } else {
        const start = Math.max(0, idx - 200)
        const end = Math.min(doc.textContent.length, idx + 1800)
        excerpt = (start > 0 ? '...' : '') + doc.textContent.slice(start, end) + (end < doc.textContent.length ? '...' : '')
      }

      return {
        documentName: doc.name,
        excerpt,
        totalChars: doc.textContent.length,
        createdAt: doc.createdAt,
      }
    })

    return {
      success: true,
      data: {
        query,
        total: results.length,
        results,
      },
    }
  } catch (error) {
    console.error('search_knowledge error:', error)
    return { success: false, error: 'Error al buscar en la base de conocimiento' }
  }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

const TOOL_MAP: Record<string, (args: Record<string, unknown>, doctorId: string) => Promise<ToolResult>> = {
  register_patient: registerPatient,
  search_patients: searchPatients,
  check_available_slots: checkAvailableSlots,
  schedule_appointment: scheduleAppointment,
  get_appointments_today: getAppointmentsToday,
  get_patient_record: getPatientRecord,
  update_medical_record: updateMedicalRecord,
  create_prescription: createPrescription,
  create_reminder: createReminder,
  search_knowledge: searchKnowledge,
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  doctorId: string,
): Promise<ToolResult> {
  const handler = TOOL_MAP[toolName]
  if (!handler) {
    return { success: false, error: `Herramienta desconocida: ${toolName}` }
  }
  return handler(args, doctorId)
}
