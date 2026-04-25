import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/app/api/**/*.ts',
        'src/lib/validation/**/*.ts',
        'src/lib/timingSafeEqual.ts',
        'src/lib/apiFetch.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
