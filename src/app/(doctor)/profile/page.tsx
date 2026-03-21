'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import PhoneInput from '@/components/PhoneInput'

interface DoctorProfile {
  id: string
  slug: string
  name: string
  titlePrefix: string | null
  specialty: string
  email: string
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  address: string | null
  whatsapp: string | null
  schedules: string | null
  branches: string | null
  cedulaId: string | null
  mspCode: string | null
  specialtyRegCode: string | null
  establishmentName: string | null
  establishmentCode: string | null
  establishmentRuc: string | null
  province: string | null
  canton: string | null
  parish: string | null
  consultationModes: string | null
  paymentData: string | null
  services: string | null
  insurances: string | null
  saraPersonality: string | null
  saraPatientInstructions: string | null
}

interface InsuranceEntry {
  name: string
  active: boolean
  requirements: string
}

const INSURANCES_CATALOG = [
  { name: 'IESS',                       group: 'Público',  icon: '🏛️' },
  { name: 'ISSFA',                      group: 'Público',  icon: '🏛️' },
  { name: 'ISSPOL',                     group: 'Público',  icon: '🏛️' },
  { name: 'MSP (Gratuidad)',            group: 'Público',  icon: '🏛️' },
  { name: 'Ecuasanitas',                group: 'Privado',  icon: '🏥' },
  { name: 'BMI',                        group: 'Privado',  icon: '🏥' },
  { name: 'Seguros Sucre',              group: 'Privado',  icon: '🏥' },
  { name: 'Latina Seguros',            group: 'Privado',  icon: '🏥' },
  { name: 'Chubb Seguros',             group: 'Privado',  icon: '🏥' },
  { name: 'AIG / Metropolitana',        group: 'Privado',  icon: '🏥' },
  { name: 'Mapfre',                     group: 'Privado',  icon: '🏥' },
  { name: 'Seguros del Pichincha',      group: 'Privado',  icon: '🏥' },
]

interface Branch {
  name: string
  address: string
}

interface DaySchedule {
  weekday: number
  startTime: string
  endTime: string
  isActive: boolean
  location?: string
}

interface TimeSlot {
  startTime: string
  endTime: string
  location: string
}

interface Service {
  name: string
  description: string
  price: string
  emoji: string
}

interface PaymentDataObj {
  methods: string[]
  bankName: string
  accountNumber: string
  accountHolder: string
  accountType: string
  accountCedula: string
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
// Display order: Lunes → Sábado → Domingo
const DISPLAY_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DURATION_OPTIONS = [15, 20, 30, 45, 60]

const DEFAULT_SLOT: TimeSlot = { startTime: '09:00', endTime: '17:00', location: '' }
const DEFAULT_ACTIVE_DAYS = new Set([1, 2, 3, 4, 5])
const DEFAULT_DAY_SLOTS: Record<number, TimeSlot[]> = {
  1: [{ ...DEFAULT_SLOT }],
  2: [{ ...DEFAULT_SLOT }],
  3: [{ ...DEFAULT_SLOT }],
  4: [{ ...DEFAULT_SLOT }],
  5: [{ ...DEFAULT_SLOT }],
}

const MEDICAL_EMOJIS = [
  '🩺', '🏥', '💊', '🔬', '🩻', '💉', '🩹', '🫀', '🫁', '🧬',
  '🩸', '🏃', '🧘', '🧪', '🔭', '👁️', '🦷', '🦴', '🧠', '💆',
  '🤸', '🩼', '🧑‍⚕️', '👶', '🤰', '🫶', '❤️', '🌡️', '😷', '🚑',
  '📋', '📊', '🔍', '🌿', '💪', '🏋️', '🤲', '✨', '⭐', '🎯',
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [form, setForm] = useState({
    name: '',
    titlePrefix: '',
    specialty: '',
    phone: '',
    bio: '',
    address: '',
    whatsapp: '',
    webhookUrl: '',
    slug: '',
  })
  const [branches, setBranches] = useState<Branch[]>([])
  const [copied, setCopied] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [bannerUploading, setBannerUploading] = useState(false)
  const bannerRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingAvail, setSavingAvail] = useState(false)
  const [success, setSuccess] = useState(false)
  const [availSuccess, setAvailSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'perfil'|'consultorio'|'servicios'|'legal'|'sara'|'cuenta'>('perfil')
  const [showDeleteZone, setShowDeleteZone] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Availability state
  const [appointmentDuration, setAppointmentDuration] = useState(30)
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set(DEFAULT_ACTIVE_DAYS))
  const [daySlots, setDaySlots] = useState<Record<number, TimeSlot[]>>(DEFAULT_DAY_SLOTS)

  // Legal / professional fields
  const [cedulaId, setCedulaId] = useState('')
  const [mspCode, setMspCode] = useState('')
  const [specialtyRegCode, setSpecialtyRegCode] = useState('')

  // Establishment fields
  const [establishmentName, setEstablishmentName] = useState('')
  const [establishmentCode, setEstablishmentCode] = useState('')
  const [establishmentRuc, setEstablishmentRuc] = useState('')
  const [province, setProvince] = useState('')
  const [canton, setCanton] = useState('')
  const [parish, setParish] = useState('')

  // Consultation modes
  const [consultationModes, setConsultationModes] = useState<string[]>([])

  // Services
  const [services, setServices] = useState<Service[]>([])
  const [openEmojiPickerIndex, setOpenEmojiPickerIndex] = useState<number | null>(null)

  // Sara IA — instrucciones personalizadas
  const [saraPersonality, setSaraPersonality] = useState('')
  const [saraPatientInstructions, setSaraPatientInstructions] = useState('')

  // Sara IA — memorias conversacionales
  interface SaraMemoryEntry { id: string; category: string; content: string; createdAt: string }
  const [saraMemories, setSaraMemories] = useState<SaraMemoryEntry[]>([])
  const [loadingMemories, setLoadingMemories] = useState(false)
  const [memoriesLoaded, setMemoriesLoaded] = useState(false)

  // Insurance / convenios
  const [insurances, setInsurances] = useState<InsuranceEntry[]>(
    INSURANCES_CATALOG.map(c => ({ name: c.name, active: false, requirements: '' }))
  )

  // Payment data
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [accountType, setAccountType] = useState('SAVINGS')
  const [accountCedula, setAccountCedula] = useState('')

  // Vitrina profesional — credenciales
  interface Credential {
    id: string
    type: string
    title: string
    institution: string | null
    year: number | null
    fileUrl: string
    mimeType: string
    fileSize: number
    createdAt: string
  }
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [showCredModal, setShowCredModal] = useState(false)
  const [credForm, setCredForm] = useState({ type: 'SENESCYT', title: '', institution: '', year: '' })
  const [credFile, setCredFile] = useState<File | null>(null)
  const [credUploading, setCredUploading] = useState(false)
  const [credError, setCredError] = useState<string | null>(null)
  const credFileRef = useRef<HTMLInputElement>(null)
  const [confirmDeleteCredId, setConfirmDeleteCredId] = useState<string | null>(null)
  const [credDeleting, setCredDeleting] = useState(false)

  // Firma electrónica
  const [sigConfigured, setSigConfigured] = useState(false)
  const [sigSubject, setSigSubject] = useState<string | null>(null)
  const [sigNotAfter, setSigNotAfter] = useState<string | null>(null)
  const [sigFile, setSigFile] = useState<File | null>(null)
  const [sigPassword, setSigPassword] = useState('')
  const [sigUploading, setSigUploading] = useState(false)
  const [sigDeleting, setSigDeleting] = useState(false)
  const [sigError, setSigError] = useState<string | null>(null)
  const [sigSuccess, setSigSuccess] = useState<string | null>(null)
  const sigFileRef = useRef<HTMLInputElement>(null)

  // Load credentials
  useEffect(() => {
    fetch('/api/profile/credentials')
      .then(r => r.json())
      .then(d => setCredentials(d.credentials ?? []))
      .catch(() => {})
  }, [])

  // Load signature status
  useEffect(() => {
    fetch('/api/profile/signature')
      .then(r => r.json())
      .then(d => {
        setSigConfigured(d.configured ?? false)
        if (d.subject) setSigSubject(d.subject)
        if (d.notAfter) setSigNotAfter(new Date(d.notAfter).toLocaleDateString('es-EC'))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data: DoctorProfile) => {
        setProfile(data)
        setAvatarUrl(data.avatarUrl)
        setBannerUrl(data.bannerUrl)
        setForm({
          name: data.name ?? '',
          titlePrefix: data.titlePrefix ?? '',
          specialty: data.specialty ?? '',
          phone: data.phone ?? '',
          bio: data.bio ?? '',
          address: data.address ?? '',
          whatsapp: data.whatsapp ?? '',
          webhookUrl: (data as any).webhookUrl ?? '',
          slug: data.slug ?? '',
        })
        try {
          setBranches(data.branches ? JSON.parse(data.branches) : [])
        } catch {
          setBranches([])
        }
        // Legal fields
        setCedulaId(data.cedulaId ?? '')
        setMspCode(data.mspCode ?? '')
        setSpecialtyRegCode(data.specialtyRegCode ?? '')
        // Establishment fields
        setEstablishmentName(data.establishmentName ?? '')
        setEstablishmentCode(data.establishmentCode ?? '')
        setEstablishmentRuc(data.establishmentRuc ?? '')
        setProvince(data.province ?? '')
        setCanton(data.canton ?? '')
        setParish(data.parish ?? '')
        // Consultation modes
        try {
          setConsultationModes(data.consultationModes ? JSON.parse(data.consultationModes) : [])
        } catch {
          setConsultationModes([])
        }
        // Services
        try {
          setServices(data.services ? JSON.parse(data.services) : [])
        } catch {
          setServices([])
        }
        // Payment data
        try {
          if (data.paymentData) {
            const pd: PaymentDataObj = JSON.parse(data.paymentData)
            setPaymentMethods(pd.methods ?? [])
            setBankName(pd.bankName ?? '')
            setAccountNumber(pd.accountNumber ?? '')
            setAccountHolder(pd.accountHolder ?? '')
            setAccountType(pd.accountType ?? 'SAVINGS')
            setAccountCedula(pd.accountCedula ?? '')
          }
        } catch {
          setPaymentMethods([])
        }
        // Sara IA
        setSaraPersonality(data.saraPersonality ?? '')
        setSaraPatientInstructions(data.saraPatientInstructions ?? '')
        // Insurances
        try {
          if (data.insurances) {
            const saved: InsuranceEntry[] = JSON.parse(data.insurances)
            setInsurances(INSURANCES_CATALOG.map(c => {
              const found = saved.find(s => s.name === c.name)
              return found ?? { name: c.name, active: false, requirements: '' }
            }))
          }
        } catch {
          /* keep defaults */
        }
      })
      .catch(() => setError('Error cargando perfil'))

    fetch('/api/availability')
      .then((r) => r.json())
      .then((data: { appointmentDuration: number; schedules: DaySchedule[] }) => {
        if (data.appointmentDuration) setAppointmentDuration(data.appointmentDuration)
        if (data.schedules && data.schedules.length > 0) {
          const days = new Set<number>()
          const slots: Record<number, TimeSlot[]> = {}
          for (const s of data.schedules) {
            if (s.isActive) {
              days.add(s.weekday)
              if (!slots[s.weekday]) slots[s.weekday] = []
              slots[s.weekday].push({
                startTime: s.startTime,
                endTime: s.endTime,
                location: s.location ?? '',
              })
            }
          }
          if (days.size > 0) {
            setActiveDays(days)
            setDaySlots(slots)
          }
        }
      })
      .catch(() => {/* availability not critical */})
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    const sanitized = name === 'slug'
      ? value.toLowerCase().replace(/[^a-z0-9-]/g, '')
      : value
    setForm((prev) => ({ ...prev, [name]: sanitized }))
  }

  function handleDayToggle(weekday: number) {
    setActiveDays((prev) => {
      const next = new Set(prev)
      if (next.has(weekday)) {
        next.delete(weekday)
      } else {
        next.add(weekday)
        setDaySlots((s) => ({ ...s, [weekday]: s[weekday]?.length ? s[weekday] : [{ ...DEFAULT_SLOT }] }))
      }
      return next
    })
  }

  function handleSlotChange(weekday: number, index: number, field: keyof TimeSlot, value: string) {
    setDaySlots((prev) => {
      const slots = [...(prev[weekday] ?? [])]
      slots[index] = { ...slots[index], [field]: value }
      return { ...prev, [weekday]: slots }
    })
  }

  function addSlot(weekday: number) {
    setDaySlots((prev) => ({
      ...prev,
      [weekday]: [...(prev[weekday] ?? []), { ...DEFAULT_SLOT }],
    }))
  }

  function removeSlot(weekday: number, index: number) {
    setDaySlots((prev) => {
      const slots = (prev[weekday] ?? []).filter((_, i) => i !== index)
      return { ...prev, [weekday]: slots.length ? slots : [{ ...DEFAULT_SLOT }] }
    })
  }

  async function handleSignatureUpload() {
    if (!sigFile || !sigPassword) { setSigError('Selecciona el archivo .p12 e ingresa la contraseña'); return }
    setSigUploading(true)
    setSigError(null)
    setSigSuccess(null)
    try {
      const fd = new FormData()
      fd.append('file', sigFile)
      fd.append('password', sigPassword)
      const res = await fetch('/api/profile/signature', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al subir firma')
      setSigConfigured(true)
      setSigSubject(data.subject ?? null)
      setSigNotAfter(data.notAfter ? new Date(data.notAfter).toLocaleDateString('es-EC') : null)
      setSigSuccess('Firma electrónica configurada correctamente')
      setSigFile(null)
      setSigPassword('')
      if (sigFileRef.current) sigFileRef.current.value = ''
    } catch (err) {
      setSigError(err instanceof Error ? err.message : 'Error al subir firma')
    } finally {
      setSigUploading(false)
    }
  }

  async function handleSignatureDelete() {
    if (!confirm('¿Eliminar la firma electrónica configurada? Deberás volver a subirla para firmar documentos.')) return
    setSigDeleting(true)
    setSigError(null)
    try {
      const res = await fetch('/api/profile/signature', { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar firma')
      setSigConfigured(false)
      setSigSubject(null)
      setSigNotAfter(null)
      setSigSuccess('Firma electrónica eliminada')
    } catch (err) {
      setSigError(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setSigDeleting(false)
    }
  }

  async function handleCredentialUpload() {
    if (!credFile) { setCredError('Selecciona un archivo'); return }
    if (!credForm.title.trim()) { setCredError('Ingresa el título de la credencial'); return }
    setCredUploading(true)
    setCredError(null)
    try {
      const fd = new FormData()
      fd.append('file', credFile)
      fd.append('type', credForm.type)
      fd.append('title', credForm.title)
      fd.append('institution', credForm.institution)
      fd.append('year', credForm.year)
      const res = await fetch('/api/profile/credentials', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al subir credencial')
      setCredentials(prev => [data.credential, ...prev])
      setShowCredModal(false)
      setCredForm({ type: 'SENESCYT', title: '', institution: '', year: '' })
      setCredFile(null)
      if (credFileRef.current) credFileRef.current.value = ''
    } catch (err) {
      setCredError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setCredUploading(false)
    }
  }

  async function confirmCredentialDelete() {
    if (!confirmDeleteCredId) return
    setCredDeleting(true)
    await fetch(`/api/profile/credentials?id=${confirmDeleteCredId}`, { method: 'DELETE' })
    setCredentials(prev => prev.filter(c => c.id !== confirmDeleteCredId))
    setConfirmDeleteCredId(null)
    setCredDeleting(false)
  }

  function addBranch() {
    setBranches((prev) => [...prev, { name: '', address: '' }])
  }

  function removeBranch(index: number) {
    setBranches((prev) => prev.filter((_, i) => i !== index))
  }

  function updateBranch(index: number, field: 'name' | 'address', value: string) {
    setBranches((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)))
  }

  function toggleConsultationMode(mode: string) {
    setConsultationModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    )
  }

  function togglePaymentMethod(method: string) {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    )
  }

  function addService() {
    setServices((prev) => [...prev, { name: '', description: '', price: '', emoji: '🩺' }])
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index))
  }

  function updateService(index: number, field: keyof Service, value: string) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  async function copyLink() {
    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${profile.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(url)

      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setError(`Error al subir la imagen: ${msg}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setBannerUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `banner-${profile.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setBannerUrl(url)
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerUrl: url }),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setError(`Error al subir la imagen: ${msg}`)
    } finally {
      setBannerUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const paymentDataObj: PaymentDataObj = {
      methods: paymentMethods,
      bankName,
      accountNumber,
      accountHolder,
      accountType,
      accountCedula,
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          avatarUrl,
          bannerUrl,
          slug: form.slug,
          branches: branches.length > 0 ? JSON.stringify(branches.filter((b) => b.address.trim())) : null,
          services: services.length > 0 ? JSON.stringify(services) : null,
          cedulaId: cedulaId || null,
          mspCode: mspCode || null,
          specialtyRegCode: specialtyRegCode || null,
          establishmentName: establishmentName || null,
          establishmentCode: establishmentCode || null,
          establishmentRuc: establishmentRuc || null,
          province: province || null,
          canton: canton || null,
          parish: parish || null,
          consultationModes: consultationModes.length > 0 ? JSON.stringify(consultationModes) : null,
          paymentData: paymentMethods.length > 0 ? JSON.stringify(paymentDataObj) : null,
          insurances: insurances.some(i => i.active) ? JSON.stringify(insurances) : null,
          saraPersonality: saraPersonality.trim() || null,
          saraPatientInstructions: saraPatientInstructions.trim() || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }

      const updated: DoctorProfile = await res.json()
      setProfile(updated)
      setForm((prev) => ({ ...prev, slug: updated.slug }))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAvailability() {
    setSavingAvail(true)
    setError(null)
    setAvailSuccess(false)

    try {
      const schedules: DaySchedule[] = []
      for (const weekday of DISPLAY_WEEKDAY_ORDER) {
        if (activeDays.has(weekday)) {
          const slots = daySlots[weekday] ?? [{ ...DEFAULT_SLOT }]
          for (const slot of slots) {
            schedules.push({ weekday, startTime: slot.startTime, endTime: slot.endTime, isActive: true, location: slot.location })
          }
        } else {
          schedules.push({ weekday, startTime: '09:00', endTime: '17:00', isActive: false })
        }
      }
      const res = await fetch('/api/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentDuration, schedules }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar horarios')
      }

      setAvailSuccess(true)
      setTimeout(() => setAvailSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar horarios')
    } finally {
      setSavingAvail(false)
    }
  }

  if (!profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const initials = getInitials(form.name || profile.name)

  const locationOptions = [
    ...(form.address ? [{ label: form.address, value: form.address }] : []),
    ...branches
      .filter((b) => b.address.trim())
      .map((b) => ({ label: b.name ? `${b.name} — ${b.address}` : b.address, value: b.address })),
  ]

  const TABS = [
    { id: 'perfil',      icon: '👤', label: 'Perfil' },
    { id: 'consultorio', icon: '🏥', label: 'Consultorio' },
    { id: 'servicios',   icon: '💼', label: 'Servicios' },
    { id: 'legal',       icon: '📋', label: 'Legal & Docs' },
    { id: 'sara',        icon: '🤖', label: 'Sara IA' },
    { id: 'cuenta',      icon: '⚙️',  label: 'Cuenta' },
  ] as const

  return (
    <div className="p-6 md:p-8 md:pt-10 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
        <p className="text-gray-500 dark:text-slate-300 mt-1">Actualiza tu información profesional</p>
      </div>

      {/* ── Tab navigation ──────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            <span className="hidden sm:inline">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm flex items-center gap-2">
          <span>✓</span> Perfil actualizado correctamente
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ══════════════ TAB: PERFIL ══════════════════════ */}
        {activeTab === 'perfil' && (<>
        {/* Avatar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Foto de perfil</h2>
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl shadow-md">
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {uploading ? 'Subiendo...' : 'Cambiar foto'}
              </button>
              <p className="text-gray-400 text-xs mt-1.5">JPG, PNG o WebP. Máx 5 MB.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>
        </div>

        {/* Foto de portada */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Foto de portada</h2>
            <p className="text-gray-400 text-xs mt-0.5">Aparece al final de tu página pública junto a la llamada a la acción. Idealmente una foto profesional de medio cuerpo o cuerpo completo.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Preview */}
            <div className="relative w-full sm:w-48 h-36 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-secondary flex-shrink-0 border border-gray-100 dark:border-gray-700">
              {bannerUrl ? (
                <img src={bannerUrl} alt="Portada" className="w-full h-full object-cover object-top" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Portada" className="w-full h-full object-cover object-top opacity-60" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white/40 text-4xl font-bold">{initials}</span>
                </div>
              )}
              {bannerUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                </div>
              )}
              {!bannerUrl && avatarUrl && (
                <div className="absolute bottom-1 left-0 right-0 text-center text-white/60 text-[10px]">usando foto de perfil</div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <button
                type="button"
                onClick={() => bannerRef.current?.click()}
                disabled={bannerUploading}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {bannerUploading ? 'Subiendo...' : bannerUrl ? 'Cambiar foto de portada' : 'Subir foto de portada'}
              </button>
              {bannerUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    setBannerUrl(null)
                    await fetch('/api/profile', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ bannerUrl: null }),
                    })
                  }}
                  className="block text-xs text-red-500 hover:underline"
                >
                  × Eliminar (usará foto de perfil)
                </button>
              )}
              <p className="text-gray-400 text-xs">JPG, PNG o WebP. Recomendado: formato vertical o cuadrado.</p>
              <input
                ref={bannerRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleBannerChange}
              />
            </div>
          </div>
        </div>

        {/* Info básica */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Información profesional</h2>

          <div className="grid grid-cols-[140px_1fr] gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Prefijo / Título
              </label>
              <select
                name="titlePrefix"
                value={form.titlePrefix}
                onChange={handleChange}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Sin prefijo</option>
                <option value="Dr.">Dr.</option>
                <option value="Dra.">Dra.</option>
                <option value="MD">MD</option>
                <option value="Lcdo.">Lcdo.</option>
                <option value="Lcda.">Lcda.</option>
                <option value="Esp.">Esp.</option>
                <option value="Mg.">Mg.</option>
                <option value="PhD">PhD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Especialidad
            </label>
            <input
              type="text"
              name="specialty"
              value={form.specialty}
              onChange={handleChange}
              required
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Bio / Descripción
            </label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={3}
              placeholder="Breve descripción profesional que verán tus pacientes..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
            />
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Contacto</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="input opacity-60 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-slate-400"
            />
            <p className="text-gray-400 text-xs mt-1">El email no se puede cambiar aquí</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              WhatsApp Personal
            </label>
            <PhoneInput
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+593 99 123 4567"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
            />
            <p className="text-gray-400 text-xs mt-1">Tu número personal — no se muestra públicamente</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              WhatsApp Business — Agente Sara IA
            </label>
            <p className="text-gray-400 text-xs mb-1.5">Número donde vive el agente Sara IA que atiende y agenda a tus pacientes</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#25D366] text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </span>
              <PhoneInput
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                placeholder="+593 99 817 6580"
                className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Consultorio principal
            </label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Av. Principal 123, Consultorio 4B, Ciudad"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Sucursales adicionales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sucursales adicionales <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <p className="text-gray-400 text-xs mt-0.5">Si atiendes en varios centros, clínicas u hospitales</p>
              </div>
              <button
                type="button"
                onClick={addBranch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Añadir sucursal
              </button>
            </div>

            {branches.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2">Sin sucursales — los pacientes serán agendados en el consultorio principal.</p>
            )}

            <div className="space-y-3">
              {branches.map((branch, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-semibold w-5">#{i + 1}</span>
                    <input
                      type="text"
                      value={branch.name}
                      onChange={(e) => updateBranch(i, 'name', e.target.value)}
                      placeholder="Nombre del lugar (ej. Hospital del Sur)"
                      className="flex-1 input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeBranch(i)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5" />
                    <input
                      type="text"
                      value={branch.address}
                      onChange={(e) => updateBranch(i, 'address', e.target.value)}
                      placeholder="Dirección completa"
                      className="flex-1 input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Página pública */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Tu página pública</h2>
            <p className="text-gray-400 text-xs mt-0.5">Comparte este link con tus pacientes para que puedan agendar citas.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre de tu página
            </label>
            <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition">
              <span className="px-3 py-3 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-slate-400 text-sm border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">
                consultorio.site/
              </span>
              <input
                type="text"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="dra-medrano"
                className="flex-1 px-3 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none placeholder-gray-400"
              />
            </div>
            <p className="text-gray-400 text-xs mt-1">Solo letras minúsculas, números y guiones. Mín. 3 caracteres.</p>
          </div>

          {form.slug && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs text-blue-500 font-semibold mb-2 uppercase tracking-wide">Tu link público</p>
              <div className="flex items-center gap-2">
                <a
                  href={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-blue-700 dark:text-blue-400 text-sm font-mono truncate hover:underline"
                >
                  {`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`}
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex-shrink-0 px-3 py-1.5 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-400 mb-2">Compartir en:</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2] hover:bg-[#1664d8] text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A66C2] hover:bg-[#0958a8] text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] hover:opacity-90 text-white rounded-lg text-xs font-semibold transition-opacity"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    Instagram
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-2">* Instagram copia el link al portapapeles.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
        </> )}

        {/* ══════════════ TAB: LEGAL & DOCS ════════════════ */}
        {activeTab === 'legal' && (<>

        {/* ── SECCIÓN A: Datos Legales y Profesionales ───────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Datos Legales y Profesionales</h2>
            <p className="text-gray-400 text-xs mt-0.5">Información requerida para recetas, certificados y documentos oficiales.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Cédula de Identidad
            </label>
            <input
              type="text"
              value={cedulaId}
              onChange={(e) => setCedulaId(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              placeholder="1234567890"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
            />
            <p className="text-gray-400 text-xs mt-1">Exactamente 10 dígitos — será la clave de integración con sistemas nacionales de salud</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Código MSP / Registro ACESS Tercer Nivel
            </label>
            <input
              type="text"
              value={mspCode}
              onChange={(e) => setMspCode(e.target.value)}
              placeholder="Número de registro MSP"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
            />
            <p className="text-gray-400 text-xs mt-1">Número de registro de título de tercer nivel ante la ACESS</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Registro SENESCYT Especialidad
            </label>
            <input
              type="text"
              value={specialtyRegCode}
              onChange={(e) => setSpecialtyRegCode(e.target.value)}
              placeholder="Número de registro de especialidad"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
            />
            <p className="text-gray-400 text-xs mt-1">Número de registro de especialidad cuarto nivel (solo si es especialista)</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-xl p-4">
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              💡 El número de cédula debe tener exactamente 10 dígitos y será usado para identificación legal en recetas y certificados.
            </p>
          </div>
        </div>

        {/* ── SECCIÓN B: Establecimiento Médico ───────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Establecimiento Médico</h2>
            <p className="text-gray-400 text-xs mt-0.5">Datos del consultorio o clínica donde ejerces.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre del Establecimiento
            </label>
            <input
              type="text"
              value={establishmentName}
              onChange={(e) => setEstablishmentName(e.target.value)}
              placeholder="Ej: Consultorio Médico San José"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Unicódigo MSP
              </label>
              <input
                type="text"
                value={establishmentCode}
                onChange={(e) => setEstablishmentCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                maxLength={8}
                placeholder="5 a 8 dígitos asignados por el MSP"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                RUC del Establecimiento
              </label>
              <input
                type="text"
                value={establishmentRuc}
                onChange={(e) => setEstablishmentRuc(e.target.value.replace(/\D/g, '').slice(0, 13))}
                maxLength={13}
                placeholder="RUC de 13 dígitos"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Provincia
              </label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Ej: Pichincha"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Cantón
              </label>
              <input
                type="text"
                value={canton}
                onChange={(e) => setCanton(e.target.value)}
                placeholder="Ej: Quito"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Parroquia
              </label>
              <input
                type="text"
                value={parish}
                onChange={(e) => setParish(e.target.value)}
                placeholder="Ej: La Mariscal"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-4">
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              🏥 Esta información aparecerá en recetas y órdenes de exámenes como lo exige la ley ecuatoriana.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
        </> )}

        {/* ══════════════ TAB: CONSULTORIO ═════════════════ */}
        {activeTab === 'consultorio' && (<>

        {/* ── SECCIÓN C: Modalidades de Consulta ──────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Modalidades de Consulta</h2>
            <p className="text-gray-400 text-xs mt-0.5">Selecciona cómo puedes atender a tus pacientes.</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">¿Qué modalidades de atención ofreces?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'IN_PERSON', label: 'Presencial', icon: '🏥', desc: 'Atención en consultorio' },
                { value: 'TELECONSULT', label: 'Teleconsulta', icon: '💻', desc: 'Video consulta online' },
                { value: 'HOME_VISIT', label: 'Visita Domiciliaria', icon: '🏠', desc: 'Atención en domicilio del paciente' },
              ].map((mode) => {
                const isSelected = consultationModes.includes(mode.value)
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => toggleConsultationMode(mode.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary/40 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-2xl">{mode.icon}</span>
                    <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                      {mode.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-400 text-center leading-tight">{mode.desc}</span>
                    {isSelected && (
                      <span className="mt-0.5 px-2 py-0.5 bg-primary text-white text-xs rounded-full font-semibold">Activo</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-slate-300 leading-relaxed">
              Esta información es usada por Sara IA para informar correctamente a los pacientes sobre cómo pueden ser atendidos.
            </p>
          </div>
        </div>

        {/* ── SEGUROS Y CONVENIOS ───────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Seguros y Convenios</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Indica con qué aseguradoras trabajas y los requisitos que debe traer el paciente. Sara IA usará esta información como fuente de verdad.
            </p>
          </div>

          {['Público', 'Privado'].map(group => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-3">
                {group === 'Público' ? '🏛️ Seguros Públicos' : '🏥 Seguros Privados'}
              </p>
              <div className="space-y-3">
                {INSURANCES_CATALOG.filter(c => c.group === group).map(catalog => {
                  const idx = insurances.findIndex(i => i.name === catalog.name)
                  const entry = insurances[idx]
                  if (!entry) return null
                  return (
                    <div key={catalog.name} className={`rounded-xl border-2 transition-all overflow-hidden ${
                      entry.active
                        ? 'border-primary/40 bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...insurances]
                          updated[idx] = { ...entry, active: !entry.active }
                          setInsurances(updated)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          entry.active ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {entry.active && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm font-semibold ${entry.active ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                          {catalog.name}
                        </span>
                        {entry.active && (
                          <span className="ml-auto text-xs bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 rounded-full font-medium">Activo</span>
                        )}
                      </button>
                      {entry.active && (
                        <div className="px-4 pb-4">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            Requisitos para el paciente
                          </label>
                          <textarea
                            value={entry.requirements}
                            onChange={e => {
                              const updated = [...insurances]
                              updated[idx] = { ...entry, requirements: e.target.value }
                              setInsurances(updated)
                            }}
                            placeholder={`Ej: Carnet del ${catalog.name} vigente, autorización médica, cédula de identidad...`}
                            rows={2}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex gap-2">
            <span className="text-lg">🤖</span>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Sara IA consultará esta información como fuente de verdad. Si un paciente pregunta por seguros, Sara responderá exactamente lo que configures aquí — sin inventar datos.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
        </> )}

        {/* ══════════════ TAB: SERVICIOS ═══════════════════ */}
        {activeTab === 'servicios' && (<>

        {/* ── SECCIÓN D: Servicios y Precios ──────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Servicios y Precios</h2>
              <p className="text-gray-400 text-xs mt-0.5">Los servicios que ofreces y sus tarifas.</p>
            </div>
            <button
              type="button"
              onClick={addService}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Añadir servicio
            </button>
          </div>

          {services.length === 0 && (
            <p className="text-xs text-gray-400 italic py-2">Sin servicios — añade los tipos de consulta y procedimientos que ofreces.</p>
          )}

          <div className="space-y-4">
            {services.map((service, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {/* Emoji picker */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenEmojiPickerIndex(openEmojiPickerIndex === i ? null : i)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xl hover:border-primary hover:bg-primary/5 transition-colors"
                      title="Elegir emoji"
                    >
                      {service.emoji || '🩺'}
                    </button>
                    {openEmojiPickerIndex === i && (
                      <div className="absolute left-0 top-12 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-2 w-52">
                        <div className="grid grid-cols-8 gap-0.5">
                          {MEDICAL_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                updateService(i, 'emoji', emoji)
                                setOpenEmojiPickerIndex(null)
                              }}
                              className={`w-6 h-6 flex items-center justify-center rounded text-base hover:bg-primary/10 transition-colors ${
                                service.emoji === emoji ? 'bg-primary/20' : ''
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => updateService(i, 'name', e.target.value)}
                    placeholder="Nombre del servicio (ej. Consulta General)"
                    className="flex-1 input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
                  />
                  <input
                    type="text"
                    value={service.price}
                    onChange={(e) => updateService(i, 'price', e.target.value)}
                    placeholder="$50"
                    className="w-20 input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <input
                  type="text"
                  value={service.description}
                  onChange={(e) => updateService(i, 'description', e.target.value)}
                  placeholder="Descripción breve del servicio..."
                  className="w-full input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
                />
                {/* Preview */}
                {(service.name || service.price) && (
                  <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-600">
                    <span className="text-lg">{service.emoji || '🩺'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{service.name || 'Nombre del servicio'}</p>
                      {service.description && (
                        <p className="text-xs text-gray-400 truncate">{service.description}</p>
                      )}
                    </div>
                    {service.price && (
                      <span className="text-sm font-semibold text-primary flex-shrink-0">{service.price}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── SECCIÓN E: Métodos de Pago ───────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Métodos de Pago</h2>
            <p className="text-gray-400 text-xs mt-0.5">Configura cómo tus pacientes pueden pagarte.</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Formas de pago aceptadas</p>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'CASH', label: 'Efectivo', icon: '💵' },
                { value: 'CARD', label: 'Tarjeta Crédito/Débito', icon: '💳' },
                { value: 'TRANSFER', label: 'Transferencia Bancaria', icon: '🏦' },
              ].map((method) => {
                const isSelected = paymentMethods.includes(method.value)
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => togglePaymentMethod(method.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-semibold ${
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-slate-300 hover:border-primary/40 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-base">{method.icon}</span>
                    {method.label}
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Datos bancarios — solo si TRANSFER está seleccionado */}
          {paymentMethods.includes('TRANSFER') && (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Datos para transferencia bancaria</p>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Banco</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ej: Banco Pichincha"
                  className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Número de Cuenta</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Número de cuenta"
                    className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Tipo de Cuenta</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="SAVINGS">Ahorros</option>
                    <option value="CHECKING">Corriente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Titular de la Cuenta</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Nombre completo del titular"
                  className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Cédula del Titular</label>
                <input
                  type="text"
                  value={accountCedula}
                  onChange={(e) => setAccountCedula(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  placeholder="1234567890"
                  className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
                />
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-slate-300 leading-relaxed">
              Sara IA usará esta información para informar a los pacientes sobre formas de pago. No se publicará información financiera sensible sin tu autorización.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
        </> )}
      </form>

      {/* ── HORARIO DE ATENCIÓN (tab Consultorio) ───────────── */}
      {activeTab === 'consultorio' && (
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Horario de atención</h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Sara usará este horario para verificar disponibilidad real y agendar citas automáticamente.
          </p>
        </div>

        {availSuccess && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm flex items-center gap-2">
            <span>✓</span> Horarios guardados correctamente
          </div>
        )}

        {/* Duración de cita */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Duración por cita
          </label>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setAppointmentDuration(min)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  appointmentDuration === min
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>

        {/* Días de la semana */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Días y horarios</p>
          {DISPLAY_WEEKDAY_ORDER.map((weekday) => {
            const isActive = activeDays.has(weekday)
            const slots = daySlots[weekday] ?? []
            return (
              <div key={weekday} className={`p-3 rounded-xl border transition-colors ${
                isActive
                  ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'
              }`}>
                {/* Day header row */}
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => handleDayToggle(weekday)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                      isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      isActive ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>

                  {/* Day name */}
                  <span className={`w-24 flex-shrink-0 text-sm font-medium ${
                    isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-400'
                  }`}>
                    {DAYS[weekday]}
                  </span>

                  {/* Closed label or add-slot button */}
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => addSlot(weekday)}
                      className="ml-auto flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Turno
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-slate-400">Cerrado</span>
                  )}
                </div>

                {/* Slots */}
                {isActive && (
                  <div className="mt-2 space-y-2 pl-12">
                    {slots.map((slot, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleSlotChange(weekday, i, 'startTime', e.target.value)}
                          className="w-[94px] px-1.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <span className="text-gray-400 text-sm flex-shrink-0">–</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleSlotChange(weekday, i, 'endTime', e.target.value)}
                          className="w-[94px] px-1.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {locationOptions.length > 0 && (
                          <select
                            value={slot.location}
                            onChange={(e) => handleSlotChange(weekday, i, 'location', e.target.value)}
                            className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="">📍 Centro (opcional)</option>
                            {locationOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                        {slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSlot(weekday, i)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Eliminar turno"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleSaveAvailability}
          disabled={savingAvail}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {savingAvail ? 'Guardando...' : 'Guardar horarios'}
        </button>
      </div>
      )}

      {/* ── FIRMA ELECTRÓNICA + VITRINA (tab Legal & Docs) ── */}
      {activeTab === 'legal' && (<>
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Firma Electrónica (FirmaEC / BCE)</h2>
          <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
            Sube tu certificado digital (.p12) emitido por el Banco Central del Ecuador para firmar recetas y documentos médicos digitalmente.
          </p>
        </div>

        {sigError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">{sigError}</div>
        )}
        {sigSuccess && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 rounded-xl text-sm">{sigSuccess}</div>
        )}

        {sigConfigured ? (
          <div className="space-y-4">
            {/* Status card */}
            <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
              <div className="text-2xl mt-0.5">✅</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Firma electrónica configurada</p>
                {sigSubject && <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">Titular: {sigSubject}</p>}
                {sigNotAfter && <p className="text-xs text-green-700 dark:text-green-400">Válida hasta: {sigNotAfter}</p>}
                <p className="text-xs text-green-600/70 dark:text-green-500 mt-1">El certificado está almacenado de forma segura y cifrada.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignatureDelete}
              disabled={sigDeleting}
              className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
            >
              {sigDeleting ? 'Eliminando...' : '× Eliminar firma electrónica'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info box */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-semibold">¿Cómo obtener tu firma electrónica?</p>
              <p>1. Solicítala en el Banco Central del Ecuador (BCE) o un prestador autorizado (ANFAC, Security Data, etc.)</p>
              <p>2. Recibirás un archivo <strong>.p12</strong> o <strong>.pfx</strong> y una contraseña</p>
              <p>3. Sube el archivo aquí — la contraseña se almacena cifrada con AES-256-GCM</p>
            </div>

            {/* File picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Certificado digital (.p12 / .pfx) <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => sigFileRef.current?.click()}
                className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <span className="text-2xl">🔐</span>
                <div className="flex-1 min-w-0">
                  {sigFile ? (
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{sigFile.name}</p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-slate-400">Haz clic para seleccionar el archivo .p12 o .pfx</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Máx. 2 MB</p>
                </div>
                {sigFile && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSigFile(null); if (sigFileRef.current) sigFileRef.current.value = '' }}
                    className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                )}
              </div>
              <input
                ref={sigFileRef}
                type="file"
                accept=".p12,.pfx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setSigFile(f) }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Contraseña del certificado <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={sigPassword}
                onChange={(e) => setSigPassword(e.target.value)}
                placeholder="Contraseña de tu .p12"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">La contraseña se cifra con AES-256-GCM antes de almacenarse. Nadie puede verla en texto plano.</p>
            </div>

            <button
              type="button"
              onClick={handleSignatureUpload}
              disabled={sigUploading || !sigFile || !sigPassword}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {sigUploading ? 'Subiendo y validando...' : '🔐 Configurar firma electrónica'}
            </button>
          </div>
        )}
      </div>

      {/* ── VITRINA PROFESIONAL ─────────────────────────── */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-lg shadow-sm">
                🏆
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Vitrina Profesional</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Tus títulos, registros y certificaciones que avalan tu experiencia</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setShowCredModal(true); setCredError(null) }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <span className="text-base leading-none">+</span> Agregar
            </button>
          </div>
        </div>

        {/* Credential list */}
        <div className="p-6">
          {credentials.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🎓</div>
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Aún no has subido ninguna credencial</p>
              <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">Sube tus títulos, registros SENESCYT, cursos y más para mostrar tu trayectoria profesional</p>
              <button
                type="button"
                onClick={() => { setShowCredModal(true); setCredError(null) }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-primary/40 hover:border-primary text-primary text-sm font-medium rounded-xl transition-colors"
              >
                + Agregar primera credencial
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {credentials.map((cred) => {
                const meta: Record<string, { icon: string; label: string; color: string; bg: string }> = {
                  SENESCYT:      { icon: '🏛️', label: 'Registro SENESCYT',        color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800' },
                  TITULO_TERCER: { icon: '🎓', label: 'Título Tercer Nivel',       color: 'text-teal-700 dark:text-teal-300',   bg: 'bg-teal-50 dark:bg-teal-900/30 border-teal-100 dark:border-teal-800' },
                  TITULO_CUARTO: { icon: '🏅', label: 'Título Cuarto Nivel',       color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800' },
                  CERTIFICADO:   { icon: '📜', label: 'Certificado / Diploma',     color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800' },
                  CURSO:         { icon: '📚', label: 'Curso de Capacitación',     color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800' },
                  SEMINARIO:     { icon: '🎤', label: 'Seminario / Congreso',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800' },
                }
                const m = meta[cred.type] ?? meta.CERTIFICADO
                const isPdf = cred.mimeType === 'application/pdf'
                const sizeKb = Math.round(cred.fileSize / 1024)
                return (
                  <div key={cred.id} className={`flex items-center gap-4 p-4 rounded-xl border ${m.bg} transition-all`}>
                    {/* Type badge */}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white dark:bg-gray-800 border border-white/60 dark:border-gray-600 flex items-center justify-center text-xl shadow-sm">
                      {m.icon}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.color} bg-white/70 dark:bg-white/10`}>{m.label}</span>
                        {cred.year && <span className="text-xs text-gray-400 dark:text-slate-500">{cred.year}</span>}
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5 truncate">{cred.title}</p>
                      {cred.institution && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{cred.institution}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{isPdf ? '📄 PDF' : '🖼️ Imagen'} · {sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb/1024).toFixed(1)} MB`}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={cred.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/80 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors border border-white/60 dark:border-gray-600"
                        title="Ver documento"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </a>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCredId(cred.id)}
                        className="p-2 rounded-lg bg-white/80 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 dark:text-gray-400 hover:text-red-500 transition-colors border border-white/60 dark:border-gray-600"
                        title="Eliminar"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      </> )}

      {/* ── MODAL CONFIRMAR ELIMINACIÓN CREDENCIAL ─────────── */}
      {confirmDeleteCredId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !credDeleting && setConfirmDeleteCredId(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-2xl">
                  🗑️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">¿Eliminar credencial?</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Esta acción es permanente y no se puede deshacer. El archivo también será eliminado del almacenamiento.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCredId(null)}
                  disabled={credDeleting}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmCredentialDelete}
                  disabled={credDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {credDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR CREDENCIAL (siempre montado) ────── */}
      {showCredModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCredModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Agregar credencial</h3>
              <button type="button" onClick={() => setShowCredModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {credError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl">
                {credError}
              </div>
            )}

            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de credencial</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'SENESCYT',      icon: '🏛️', label: 'Registro SENESCYT' },
                    { value: 'TITULO_TERCER', icon: '🎓', label: 'Título Tercer Nivel' },
                    { value: 'TITULO_CUARTO', icon: '🏅', label: 'Título Cuarto Nivel' },
                    { value: 'CERTIFICADO',   icon: '📜', label: 'Certificado / Diploma' },
                    { value: 'CURSO',         icon: '📚', label: 'Curso' },
                    { value: 'SEMINARIO',     icon: '🎤', label: 'Seminario / Congreso' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCredForm(f => ({ ...f, type: opt.value }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        credForm.type === opt.value
                          ? 'border-primary bg-primary/10 text-primary dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary/50'
                      }`}
                    >
                      <span>{opt.icon}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Título / Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={credForm.title}
                  onChange={e => setCredForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Médico Cirujano, Especialidad en Cardiología..."
                  className="input"
                />
              </div>

              {/* Institution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Institución</label>
                <input
                  type="text"
                  value={credForm.institution}
                  onChange={e => setCredForm(f => ({ ...f, institution: e.target.value }))}
                  placeholder="Ej: Universidad Central del Ecuador"
                  className="input"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Año de obtención</label>
                <input
                  type="number"
                  value={credForm.year}
                  onChange={e => setCredForm(f => ({ ...f, year: e.target.value }))}
                  placeholder="Ej: 2018"
                  min="1950"
                  max={new Date().getFullYear()}
                  className="input"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Documento <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-gray-400 ml-1">PDF, JPG, PNG o WebP · Máx 15 MB</span>
                </label>
                {credFile ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <span className="text-green-600 dark:text-green-400 text-lg">
                      {credFile.type === 'application/pdf' ? '📄' : '🖼️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">{credFile.name}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">{Math.round(credFile.size / 1024)} KB</p>
                    </div>
                    <button type="button" onClick={() => { setCredFile(null); if (credFileRef.current) credFileRef.current.value = '' }} className="text-green-500 hover:text-green-700 dark:hover:text-green-300 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => credFileRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary rounded-xl transition-colors text-gray-400 dark:text-slate-500 hover:text-primary"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-sm font-medium">Haz clic para seleccionar archivo</span>
                    <span className="text-xs">PDF, JPG, PNG, WebP</span>
                  </button>
                )}
                <input ref={credFileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={e => setCredFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowCredModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCredentialUpload}
                disabled={credUploading || !credFile || !credForm.title.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {credUploading ? 'Subiendo...' : 'Guardar credencial'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: SARA IA ════════════════════════ */}
      {activeTab === 'sara' && (<>
        {/* Instrucciones para la relación médico-Sara */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-xl flex-shrink-0">🤖</div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Cómo quiero que me trate Sara</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Instrucciones sobre el comportamiento, tono y preferencias de Sara cuando habla contigo en el chat interno.</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
              <p className="font-medium text-gray-500 dark:text-slate-400 mb-1">Ejemplos de instrucciones:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Llámame siempre por mi nombre: Andrés</li>
                <li>Usa términos médicos en inglés para los diagnósticos</li>
                <li>Cuando busques pacientes, ordena por última visita</li>
                <li>Soy pediatra con enfoque en neonatología, adapta tus sugerencias</li>
                <li>Responde siempre de forma muy concisa, sin explicaciones largas</li>
              </ul>
            </div>
            <textarea
              value={saraPersonality}
              onChange={e => setSaraPersonality(e.target.value)}
              rows={6}
              placeholder="Escribe aquí cómo quieres que Sara se comporte contigo..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>
        </div>

        {/* Instrucciones para pacientes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-xl flex-shrink-0">💬</div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Cómo quiero que Sara trate a mis pacientes</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Instrucciones sobre qué decir, qué evitar y cómo comportarse Sara en el chat público y WhatsApp con pacientes.</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
              <p className="font-medium text-gray-500 dark:text-slate-400 mb-1">Ejemplos de instrucciones:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Siempre menciona que hacemos descuento del 20% para adultos mayores</li>
                <li>No agendes citas los días viernes ni en feriados</li>
                <li>Si preguntan el precio de la consulta, di que es $45 y que incluye revisión</li>
                <li>Usa un tono muy cálido y familiar, como si fuera una amiga</li>
                <li>Siempre pregunta si el paciente viene referido por algún colega</li>
              </ul>
            </div>
            <textarea
              value={saraPatientInstructions}
              onChange={e => setSaraPatientInstructions(e.target.value)}
              rows={6}
              placeholder="Escribe aquí instrucciones especiales para que Sara aplique con tus pacientes..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>
        </div>

        {/* Tip informativo */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div className="text-sm text-indigo-700 dark:text-indigo-300">
              <p className="font-semibold mb-1">Cuanto más específico seas, mejor funcionará Sara</p>
              <p>Sara lee estas instrucciones al inicio de cada conversación. Puedes actualizarlas cuando quieras y los cambios aplican desde la próxima conversación.</p>
            </div>
          </div>
        </div>

        {/* Memorias conversacionales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-xl flex-shrink-0">🧠</div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Memoria de Sara</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Instrucciones que Sara ha guardado de tus conversaciones.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                setLoadingMemories(true)
                try {
                  const r = await fetch('/api/sara/memories')
                  const d = await r.json()
                  setSaraMemories(d.memories ?? [])
                  setMemoriesLoaded(true)
                } catch { /* ignore */ }
                finally { setLoadingMemories(false) }
              }}
              className="text-sm text-primary font-medium hover:underline flex-shrink-0"
            >
              {loadingMemories ? 'Cargando...' : memoriesLoaded ? 'Actualizar' : 'Ver memorias'}
            </button>
          </div>

          {!memoriesLoaded && (
            <p className="text-sm text-gray-400 dark:text-slate-500 italic">
              Haz clic en &ldquo;Ver memorias&rdquo; para cargar las instrucciones que Sara ha guardado.
              Puedes añadir memorias desde el chat diciéndole a Sara: <span className="font-medium not-italic text-gray-500 dark:text-slate-400">&ldquo;Recuerda que...&rdquo;</span>
            </p>
          )}

          {memoriesLoaded && saraMemories.length === 0 && (
            <div className="text-center py-6 text-gray-400 dark:text-slate-500">
              <p className="text-3xl mb-2">🤍</p>
              <p className="text-sm">Sara aún no tiene memorias guardadas.</p>
              <p className="text-xs mt-1">Dile en el chat: <span className="italic">&ldquo;Recuerda que prefiero respuestas cortas&rdquo;</span></p>
            </div>
          )}

          {memoriesLoaded && saraMemories.length > 0 && (
            <div className="space-y-2">
              {saraMemories.map(m => (
                <div key={m.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl group">
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${
                      m.category === 'preference'    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                      m.category === 'protocol'      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                      m.category === 'schedule_rule' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                      m.category === 'billing'       ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                      m.category === 'patient_info'  ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' :
                      'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                    }`}>
                      {m.category === 'preference' ? 'Preferencia' :
                       m.category === 'protocol' ? 'Protocolo' :
                       m.category === 'schedule_rule' ? 'Agenda' :
                       m.category === 'billing' ? 'Facturación' :
                       m.category === 'patient_info' ? 'Paciente' : 'General'}
                    </span>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{m.content}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{new Date(m.createdAt).toLocaleDateString('es-EC', { dateStyle: 'medium' })}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/sara/memories?id=${m.id}`, { method: 'DELETE' })
                      setSaraMemories(prev => prev.filter(x => x.id !== m.id))
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                    title="Eliminar memoria"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar instrucciones'}
          </button>
        </div>
      </>)}

      {/* ── ZONA DE PELIGRO (tab Cuenta) ─────────────────── */}
      {activeTab === 'cuenta' && (
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/40 p-6">
        <button
          type="button"
          onClick={() => setShowDeleteZone((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h2 className="font-semibold text-red-600 dark:text-red-400">Zona de peligro</h2>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Acciones irreversibles sobre tu cuenta</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round"
            className={`text-gray-400 transition-transform ${showDeleteZone ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showDeleteZone && (
          <div className="mt-5 space-y-4 pt-4 border-t border-red-100 dark:border-red-900/30">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Eliminar cuenta y todos mis datos</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
                Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán tu cuenta, todos tus pacientes, citas, recetas, historiales clínicos y cualquier dato asociado.
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                Escribe tu correo electrónico para confirmar: <strong>{profile.email}</strong>
              </label>
              <input
                type="email"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={profile.email}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
            </div>
            <button
              type="button"
              disabled={deleteConfirm !== profile.email || deleting}
              onClick={async () => {
                setDeleting(true)
                const res = await fetch('/api/profile', { method: 'DELETE' })
                if (res.ok) {
                  window.location.href = '/'
                } else {
                  const data = await res.json()
                  setError(data.error ?? 'Error al eliminar cuenta')
                  setDeleting(false)
                }
              }}
              className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? 'Eliminando...' : 'Eliminar mi cuenta permanentemente'}
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
