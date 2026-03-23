import Link from 'next/link'

interface Props {
  feature: string
  limit: number
  current: number
}

export default function FreeLimitGate({ feature, limit, current }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
      {/* Warning icon */}
      <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center mb-5">
        <svg className="w-9 h-9 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full mb-3 border border-amber-200 dark:border-amber-800/50">
        {current} / {limit} {feature}
      </span>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Límite del Plan Free alcanzado
      </h2>

      <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed text-sm">
        En el Plan Free puedes gestionar hasta <strong className="text-gray-700 dark:text-slate-200">{limit} {feature.toLowerCase()}</strong>. Actualiza al Plan Pro para registros ilimitados y todas las funcionalidades de Sara.
      </p>

      <Link
        href="/upgrade"
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all hover:-translate-y-0.5 shadow-lg text-sm"
      >
        Desbloquear ilimitados →
      </Link>

      <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">
        Tus {current} {feature.toLowerCase()} actuales se conservan al hacer upgrade
      </p>
    </div>
  )
}
