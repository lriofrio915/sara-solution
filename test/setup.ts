// Test environment setup
// Mocks de módulos que dependen de runtime de Next.js / Supabase

import { vi } from 'vitest'

// Mock next/server para que NextRequest/NextResponse funcionen en Node
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  return actual
})
