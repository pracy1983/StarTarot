/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-space': {
          DEFAULT: '#0a0a1a',
          lighter: '#12122a',
          card: 'rgba(18, 18, 42, 0.7)',
        },
        'neon-purple': {
          DEFAULT: '#a855f7',
          glow: 'rgba(168, 85, 247, 0.5)',
        },
        'neon-cyan': {
          DEFAULT: '#22d3ee',
          glow: 'rgba(34, 211, 238, 0.4)',
        },
        'neon-gold': {
          DEFAULT: '#fbbf24',
          glow: 'rgba(251, 191, 36, 0.4)',
        },
      },
      backgroundImage: {
        'star-pattern': "url('/background.jpg')",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-neon': 'linear-gradient(to bottom right, #a855f7, #22d3ee)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.7, transform: 'scale(1.02)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
