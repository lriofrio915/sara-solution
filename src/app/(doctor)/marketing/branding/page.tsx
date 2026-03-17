'use client'

import { useState, useEffect, useRef } from 'react'

interface BrandProfile {
  id: string
  clinicName: string | null
  specialties: string[]
  slogan: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  tones: string[]
  targetAudience: string | null
  excludedTopics: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  logoUrl: string | null
  images: BrandImage[]
}

interface BrandImage {
  id: string
  url: string
  category: string
  description: string | null
}

const TONE_OPTIONS = [
  'Profesional', 'Cercano', 'Educativo', 'Empático',
  'Motivacional', 'Serio', 'Amigable', 'Informativo',
]

const IMAGE_CATEGORIES = [
  { value: 'clinic', label: 'Clínica / Consultorio' },
  { value: 'team', label: 'Equipo médico' },
  { value: 'equipment', label: 'Equipamiento' },
  { value: 'before_after', label: 'Antes / Después' },
  { value: 'patient', label: 'Pacientes (con permiso)' },
  { value: 'general', label: 'General' },
]

export default function BrandingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [clinicName, setClinicName] = useState('')
  const [specialtiesText, setSpecialtiesText] = useState('')
  const [slogan, setSlogan] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#2563EB')
  const [secondaryColor, setSecondaryColor] = useState('#0D9488')
  const [accentColor, setAccentColor] = useState('#F59E0B')
  const [tones, setTones] = useState<string[]>([])
  const [targetAudience, setTargetAudience] = useState('')
  const [excludedTopics, setExcludedTopics] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [images, setImages] = useState<BrandImage[]>([])
  const [imageCategory, setImageCategory] = useState('general')
  const [imageDescription, setImageDescription] = useState('')
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/marketing/brand')
      .then(r => r.json())
      .then(d => {
        const b: BrandProfile | null = d.brand
        if (b) {
          setClinicName(b.clinicName ?? '')
          setSpecialtiesText((b.specialties ?? []).join(', '))
          setSlogan(b.slogan ?? '')
          setPrimaryColor(b.primaryColor ?? '#2563EB')
          setSecondaryColor(b.secondaryColor ?? '#0D9488')
          setAccentColor(b.accentColor ?? '#F59E0B')
          setTones(b.tones ?? [])
          setTargetAudience(b.targetAudience ?? '')
          setExcludedTopics(b.excludedTopics ?? '')
          setInstagramUrl(b.instagramUrl ?? '')
          setFacebookUrl(b.facebookUrl ?? '')
          setImages(b.images ?? [])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function toggleTone(t: string) {
    setTones(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/marketing/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicName: clinicName || null,
          specialties: specialtiesText.split(',').map(s => s.trim()).filter(Boolean),
          slogan: slogan || null,
          primaryColor, secondaryColor, accentColor,
          tones,
          targetAudience: targetAudience || null,
          excludedTopics: excludedTopics || null,
          instagramUrl: instagramUrl || null,
          facebookUrl: facebookUrl || null,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', imageCategory)
      fd.append('description', imageDescription)
      const res = await fetch('/api/marketing/brand/images', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Error al subir imagen')
      const data = await res.json()
      setImages(prev => [data.image, ...prev])
      setImageDescription('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleDeleteImage(id: string) {
    if (!window.confirm('¿Eliminar esta imagen? Esta acción no se puede deshacer.')) return
    setDeletingImageId(id)
    try {
      await fetch('/api/marketing/brand/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setImages(prev => prev.filter(img => img.id !== id))
    } finally {
      setDeletingImageId(null)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">{error}</div>
      )}
      {saved && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm">Cambios guardados correctamente.</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identidad */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Identidad de Marca</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre de la clínica / consultorio</label>
              <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)}
                placeholder="Ej: Clínica San Pedro" className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Especialidades (separadas por coma)</label>
              <input type="text" value={specialtiesText} onChange={e => setSpecialtiesText(e.target.value)}
                placeholder="Ej: Medicina general, Pediatría" className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Slogan <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="text" value={slogan} onChange={e => setSlogan(e.target.value)}
              placeholder="Ej: Tu salud, nuestra prioridad" className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
        </div>

        {/* Colores */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Paleta de Colores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Color primario', value: primaryColor, set: setPrimaryColor },
              { label: 'Color secundario', value: secondaryColor, set: setSecondaryColor },
              { label: 'Color acento', value: accentColor, set: setAccentColor },
            ].map(c => (
              <div key={c.label}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{c.label}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={c.value} onChange={e => c.set(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-600 p-0.5" />
                  <input type="text" value={c.value} onChange={e => c.set(e.target.value)}
                    className="input flex-1 font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tono de comunicación */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Tono de Comunicación</h2>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map(t => (
              <button key={t} type="button" onClick={() => toggleTone(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  tones.includes(t)
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Audiencia y restricciones */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Audiencia y Contenido</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Audiencia objetivo</label>
            <textarea value={targetAudience} onChange={e => setTargetAudience(e.target.value)} rows={2}
              placeholder="Ej: Pacientes adultos de 30-60 años, familias con niños pequeños, personas con enfermedades crónicas..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Temas a evitar <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea value={excludedTopics} onChange={e => setExcludedTopics(e.target.value)} rows={2}
              placeholder="Ej: política, religión, comparaciones con otros médicos..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
          </div>
        </div>

        {/* Redes sociales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Redes Sociales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Instagram URL</label>
              <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/tu_perfil" className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Facebook URL</label>
              <input type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/tu_pagina" className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Banco de imágenes */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Banco de Imágenes de Marca</h2>
        <p className="text-xs text-gray-500 dark:text-slate-300">Sube imágenes de tu consultorio, equipo o materiales. La IA las usará para crear contenido más personalizado.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Categoría</label>
            <select value={imageCategory} onChange={e => setImageCategory(e.target.value)}
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              {IMAGE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="text" value={imageDescription} onChange={e => setImageDescription(e.target.value)}
              placeholder="Ej: Sala de espera" className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Imagen (JPG/PNG, máx 10 MB)</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleImageUpload} disabled={uploadingImage}
              className="block w-full text-sm text-gray-500 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50" />
          </div>
        </div>
        {uploadingImage && <p className="text-xs text-primary animate-pulse">Subiendo imagen...</p>}

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {images.map(img => (
              <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.description ?? img.category}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                  <div className="w-full p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white text-xs font-medium truncate">{img.description ?? img.category}</p>
                    <button onClick={() => handleDeleteImage(img.id)} disabled={deletingImageId === img.id}
                      className="text-xs text-red-300 hover:text-red-100 disabled:opacity-50">
                      {deletingImageId === img.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-slate-400 text-center py-4">No hay imágenes cargadas aún.</p>
        )}
      </div>
    </div>
  )
}
