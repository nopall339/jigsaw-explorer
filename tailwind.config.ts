import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palet gelap-hangat: nyaman dipakai berdampingan dengan window video call.
        board: {
          950: '#0b0f17',
          900: '#111725',
          800: '#1a2233',
          700: '#243046',
          600: '#334158',
        },
        accent: {
          DEFAULT: '#f0a44a',
          soft: '#f7c98b',
          deep: '#c97a22',
        },
        mint: '#5ad1b0',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        dock: '0 -8px 30px -12px rgba(0,0,0,0.65)',
        piece: '0 6px 18px -6px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'float-up': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.8)' },
          '20%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-70px) scale(1.4)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'float-up': 'float-up 1.8s ease-out forwards',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
