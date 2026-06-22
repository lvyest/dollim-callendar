import type { Config } from 'tailwindcss';

// Figma 디자인 시스템(파랑/노랑 + soft shadow) 토큰을 Tailwind 로 옮긴 것.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF5FF',
          100: '#DBE8FE',
          200: '#BFD5FD',
          300: '#93B8FB',
          400: '#5E91F6',
          500: '#3B73EF',
          600: '#2A5BDB',
          700: '#2249B4',
          800: '#213F8F',
          900: '#1F3970',
        },
        accent: {
          50: '#FFFBEB',
          100: '#FFF3C4',
          200: '#FFE88A',
          300: '#FFD83D',
          400: '#FBC42E',
          500: '#F0A81B',
          600: '#CC8404',
        },
        appbg: '#FBFBFD',
        success: { DEFAULT: '#16A34A', soft: '#DCFCE7' },
        danger: { DEFAULT: '#EF4444', soft: '#FEE2E2' },
        partial: { DEFAULT: '#F59E0B', soft: '#FFF6D6' },
        senior: '#E0A400',
        surface: {
          blue: '#EAF1FF',
          yellow: '#FFF6DC',
          lavender: '#EEEBFB',
          mint: '#E3F6EE',
          red: '#FDECEC',
        },
      },
      fontFamily: {
        sans: ['SchoolSafetyRoundedSmile', 'system-ui', 'sans-serif'],
        display: ['OkDandan', 'SchoolSafetyRoundedSmile', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(20,40,80,0.06)',
        card: '0 8px 24px -4px rgba(30,50,90,0.08), 0 2px 6px rgba(30,50,90,0.05)',
        float: '0 18px 42px -6px rgba(30,50,90,0.12), 0 4px 10px rgba(30,50,90,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
