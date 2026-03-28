import { redirect } from 'next/navigation'

// Analytics IA fue fusionado en Resumen IA (/dashboard)
export default function AnalyticsPage() {
  redirect('/dashboard')
}
