import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#2d2d2d',
        card: '#3c3c3c',
        primary: {
          DEFAULT: '#e74c3c',
          dark: '#c0392b',
          light: '#ff6b5b',
        },
      },
    },
  },
  plugins: [],
}

export default config