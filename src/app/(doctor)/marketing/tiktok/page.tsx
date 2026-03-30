'use client'

import { useState, useEffect } from 'react'
import AIImage from '../_ai-image'
import SchedulePostModal from '@/components/marketing/SchedulePostModal'

interface GeneratedScript {
  id: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  suggestedTime?: string
  reelScript?: string
}

const FOCUS_OPTIONS = [
  { value: 'viralizar',         label: 'Viralizar contenido', description: 'Videos con datos impactantes o revelaciones médicas sorprendentes. El objetivo es que se compartan masivamente y lleguen a miles de personas.',    instruction: 'Usa datos impactantes, estadísticas sorprendentes o revelaciones médicas que generen reacciones y se compartan.' },
  { value: 'educar_entretener', label: 'Educar y entretener', description: 'Explica conceptos médicos de forma simple, dinámica y entretenida. Haces que la medicina sea accesible y atractiva para el público general.',       instruction: 'Explica conceptos médicos complejos de forma simple, divertida y accesible para el público general.' },
  { value: 'ganar_seguidores',  label: 'Ganar seguidores',    description: 'Serie de videos consistentes que generan expectativa e invitan a seguirte. Construyes una audiencia fiel interesada en temas de salud.',            instruction: 'Crea contenido en serie y consistente que invite a seguirte para aprender más sobre salud.' },
  { value: 'desmentir_mitos',   label: 'Desmentir mitos',     description: 'Tomas un mito médico popular y lo derrumbas con evidencia. Genera debate, reacciones fuertes y te posiciona como voz autorizada en tu especialidad.', instruction: 'Toma un mito médico popular muy extendido y destrúyelo con evidencia de forma dramática y memorable.' },
]

const ADMIN_FOCUS_OPTIONS = [
  { value: 'viralizar',         label: 'Viralizar',           description: 'Videos con datos impactantes sobre pérdida de tiempo en consultorios. Se comparten solos entre médicos y llegan a miles en segundos.',              instruction: 'Crea un video corto con un dato impactante sobre el tiempo perdido en tareas administrativas en consultorios médicos. Gancho en los primeros 3 segundos.' },
  { value: 'demo_real',         label: 'Demo rápida',         description: 'Muestra en 30 segundos cómo Sara responde a pacientes, agenda citas o genera recetas. El antes y después en tiempo real.',                          instruction: 'Escribe el guión de un TikTok mostrando en tiempo real cómo Sara Medical automatiza una tarea que antes tomaba minutos.' },
  { value: 'historia_exito',    label: 'Historia de éxito',   description: 'Cuenta la transformación de un médico: de caos administrativo a consultorio organizado. Conecta emocionalmente con médicos que viven lo mismo.',     instruction: 'Narra la historia de un médico que transformó su consultorio con Sara Medical. Estructura: problema → solución → resultado concreto.' },
  { value: 'crear_comunidad',   label: 'Crear comunidad',     description: 'Videos que invitan a médicos a comentar sus problemas administrativos. Genera conversación y construye audiencia de médicos emprendedores.',          instruction: 'Haz una pregunta provocadora a médicos sobre su mayor frustración administrativa. Invita a comentar y compartir.' },
]

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  )
}


export default function TikTokPage() {
  const [topic, setTopic] = useState('')
  const [extra, setExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [script, setScript] = useState<GeneratedScript | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [copied, setCopied] = useState(false)
  const [marked, setMarked] = useState(false)
  const [focus, setFocus] = useState('')
  const [specialtyTopics, setSpecialtyTopics] = useState<string[]>([])
  const [specialtyLoading, setSpecialtyLoading] = useState(true)
  const [refreshingSpecialty, setRefreshingSpecialty] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/marketing/specialty-topics?platform=tiktok')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.topics?.length) setSpecialtyTopics(d.topics)
        if (d?.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})
      .finally(() => setSpecialtyLoading(false))
  }, [])

  async function handleRefreshSpecialty() {
    setRefreshingSpecialty(true)
    setSpecialtyTopics([])
    setSpecialtyLoading(true)
    try {
      const res = await fetch(`/api/marketing/specialty-topics?platform=tiktok&_t=${Date.now()}`, { cache: 'no-store' })
      const d = res.ok ? await res.json() : null
      if (d?.topics?.length) setSpecialtyTopics(d.topics)
      if (d?.isAdmin) setIsAdmin(true)
    } catch { /* ignore */ } finally {
      setRefreshingSpecialty(false)
      setSpecialtyLoading(false)
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setGenerating(true)
    setError(null)
    setScript(null)
    try {
      const res = await fetch('/api/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          contentType: 'REEL',
          targetPlatform: 'TIKTOK',
          extraInstructions: [(isAdmin ? ADMIN_FOCUS_OPTIONS : FOCUS_OPTIONS).find(f => f.value === focus)?.instruction, extra].filter(Boolean).join(' ') || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar')
      setScript({ ...data.generated, id: data.post.id })
      setEditContent(data.generated.content)
      setEditHashtags((data.generated.hashtags ?? []).join(' '))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    const tags = editHashtags.split(/\s+/).filter(Boolean).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
    navigator.clipboard.writeText(`${editContent}\n\n${tags}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleCopyScript() {
    if (script?.reelScript) {
      navigator.clipboard.writeText(script.reelScript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  async function handleMarkPublished() {
    if (!script) return
    await fetch(`/api/marketing/posts/${script.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PUBLISHED' }),
    })
    setMarked(true)
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-black">
          <TikTokIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">TikTok</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Genera guiones de video medico con IA</p>
        </div>
      </div>

      {/* Info badge */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/50">
        <svg className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-teal-700 dark:text-teal-300">
          La IA genera un guion completo con gancho inicial, desarrollo y llamada a la accion. Ideal para videos de 30-60 segundos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Crear guion de video</h3>

            {/* Enfoque */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Enfoque del video</label>
              <div className="flex flex-wrap gap-2">
                {(isAdmin ? ADMIN_FOCUS_OPTIONS : FOCUS_OPTIONS).map(f => (
                  <button key={f.value} type="button" onClick={() => setFocus(focus === f.value ? '' : f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${focus === f.value ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-gray-600 hover:border-gray-400'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Tema del video</label>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
                  placeholder="Ej: Un dato de salud que la mayoria no conoce"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>

              {/* Sugerencias por especialidad */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sugerencias para tu especialidad</span>
                  <button type="button" onClick={handleRefreshSpecialty} disabled={refreshingSpecialty || specialtyLoading}
                    title="Nuevas sugerencias"
                    className="p-0.5 rounded text-gray-400 hover:text-teal-500 disabled:opacity-40 transition-colors">
                    <svg className={`w-3 h-3 ${refreshingSpecialty ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {specialtyLoading
                    ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 w-24 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />)
                    : specialtyTopics.map((s, i) => (
                        <button key={i} type="button" onClick={() => setTopic(s)}
                          className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-300 hover:bg-teal-100 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-400 transition-colors">
                          {s.length > 35 ? s.slice(0, 35) + '…' : s}
                        </button>
                      ))
                  }
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Instrucciones adicionales <span className="font-normal text-gray-300">(opcional)</span></label>
                <input value={extra} onChange={e => setExtra(e.target.value)}
                  placeholder="Ej: tono divertido, incluir estadistica, para publico joven..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">{error}</div>
              )}

              <button type="submit" disabled={generating || !topic.trim()}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-black hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando guion...</>
                ) : (
                  'Generar guion con IA'
                )}
              </button>
            </form>
          </div>

          {/* Estructura del guion */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Estructura del guion</h3>
            <div className="space-y-2">
              {[
                { seg: '0-3 seg', label: 'Gancho', desc: 'Captura la atencion al instante', color: 'text-red-500' },
                { seg: '3-45 seg', label: 'Desarrollo', desc: 'Contenido util y educativo', color: 'text-blue-500' },
                { seg: 'Ultimos 5 seg', label: 'Llamada a la accion', desc: 'Invita a agendar cita o seguirte', color: 'text-green-500' },
              ].map(item => (
                <div key={item.seg} className="flex items-start gap-2">
                  <span className={`text-xs font-bold w-20 flex-shrink-0 ${item.color}`}>{item.seg}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TikTok no permite publicación vía API externa para cuentas personales */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                <TikTokIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Publicación en TikTok</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Copia el guion generado y súbelo manualmente desde la app de TikTok</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium flex-shrink-0">Manual</span>
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div>
          {!script && !generating && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <TikTokIcon className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Ingresa un tema y genera tu guion de TikTok</p>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center h-64 border border-gray-200 dark:border-gray-700 rounded-2xl">
              <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500">Generando guion de video...</p>
            </div>
          )}

          {script && (
            <div className="space-y-4">
              {/* Caption */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Caption del video</p>
                  {marked && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Publicado</span>}
                </div>

                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Hashtags</label>
                  <input value={editHashtags} onChange={e => setEditHashtags(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <p className="text-[10px] text-gray-400 mt-1">TikTok funciona mejor con 5-8 hashtags mixtos</p>
                </div>

                {script.suggestedTime && (
                  <p className="text-xs text-gray-400">Mejor hora para publicar: <strong className="text-gray-700 dark:text-gray-300">{script.suggestedTime}</strong></p>
                )}

                {scheduledAt && !marked && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/50">
                    <svg className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">
                      Programado para {new Date(scheduledAt).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleCopy} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-black hover:bg-gray-900 text-white'}`}>
                    {copied ? 'Copiado!' : 'Copiar caption + hashtags'}
                  </button>
                  {!marked && !scheduledAt && (
                    <button onClick={() => setShowSchedule(true)}
                      className="px-3 py-2 rounded-xl text-sm font-medium border border-purple-300 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Programar
                    </button>
                  )}
                  {!marked && (
                    <button onClick={handleMarkPublished} className="px-3 py-2 rounded-xl text-sm font-medium border border-green-300 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                      Marcar publicado
                    </button>
                  )}
                </div>
                {showSchedule && script && (
                  <SchedulePostModal
                    postId={script.id}
                    accentColor="gray"
                    onScheduled={(at) => { setScheduledAt(at); setShowSchedule(false) }}
                    onClose={() => setShowSchedule(false)}
                  />
                )}
              </div>

              {/* Guion completo */}
              {script.reelScript && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Guion del video</p>
                    <button onClick={handleCopyScript} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">Copiar guion</button>
                  </div>
                  <pre className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{script.reelScript}</pre>
                </div>
              )}

              {/* Thumbnail */}
              {script.imagePrompt && (
                <AIImage prompt={script.imagePrompt} aspect="9/16" accentColor="teal" downloadName="tiktok-thumbnail.jpg" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
