import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#3B82F6',
        },
        secondary: {
          DEFAULT: '#0D9488',
          dark: '#0F766E',
        },
        accent: {
          DEFAULT: '#25D366',
          dark: '#128C7E',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)',
        'gradient-hero': 'linear-gradient(135deg, #1E40AF 0%, #0D9488 50%, #2563EB 100%)',
        'gradient-cta': 'linear-gradient(135deg, #0D9488 0%, #2563EB 100%)',
      },
      boxShadow: {
        glow: '0 0 40px rgba(37, 99, 235, 0.3)',
      },
    },
  },
  plugins: [],
}
export default config
