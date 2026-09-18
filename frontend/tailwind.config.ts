import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F8F5EE',
          subtle: '#F3EFE6',
          cream: '#EDE7DB'
        },
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#F8F5EE',
          muted: '#F3EFE6'
        },
        brand: {
          deepBlack: '#111111',
          softBlack: '#1A1A1A',
          charcoal: '#292725',
          warmTaupe: '#B8AA97',
          beige: '#D8CCBA',
          cream: '#EDE7DB',
          ivory: '#F3EFE6',
          warmWhite: '#F8F5EE',
          mutedBrown: '#75695A'
        },
        mint: {
          50: '#F8F5EE',
          100: '#F3EFE6',
          200: '#EDE7DB',
          300: '#D8CCBA',
          400: '#B8AA97',
          500: '#111111',
          600: '#1A1A1A',
          700: '#292725',
          800: '#111111',
          900: '#111111'
        },
        borderCard: '#D8CCBA',
        institutional: {
          DEFAULT: '#111111',
          dark: '#1A1A1A',
          darker: '#000000',
          gold: '#B8AA97'
        },
        guide: {
          emerald: '#111111',
          mintBg: '#F8F5EE',
          mintBorder: '#D8CCBA',
          canvas: '#F3EFE6'
        },
        // Muted sophisticated status colors
        emerald: {
          50: '#F4F7F4',
          100: '#E8EFE8',
          200: '#D2DFD1',
          300: '#B8CCB6',
          400: '#6B8065',
          500: '#4A5844',
          600: '#3D4938',
          700: '#313B2D',
          800: '#252D22',
          900: '#1B2119'
        },
        amber: {
          50: '#FAF7F0',
          100: '#F4EEE1',
          200: '#E7DDC5',
          300: '#D4C39F',
          400: '#A68444',
          500: '#8A6A32',
          600: '#755A2B',
          700: '#604A23',
          800: '#4C3B1C',
          900: '#382B14'
        },
        rose: {
          50: '#FBF5F5',
          100: '#F6EAEB',
          200: '#ECCED0',
          300: '#DEA5A8',
          400: '#A44E4E',
          500: '#8A3B3B',
          600: '#753232',
          700: '#612A2A',
          800: '#4C2020',
          900: '#381717'
        },
        teal: {
          50: '#F4F7F7',
          100: '#E6EFEF',
          200: '#CDDFE0',
          500: '#3D5459',
          600: '#324549',
          700: '#263438',
          800: '#1B2528',
          900: '#111719'
        }
      },
      fontFamily: {
        serif: ['"Erode"', 'serif'],
        sans: ['"Recia"', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['"Recia"', 'serif'],
        heading: ['"Erode"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        card: '16px',
        pill: '9999px'
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(17, 17, 17, 0.04)',
        card: '0 8px 30px rgba(17, 17, 17, 0.04), 0 2px 8px rgba(17, 17, 17, 0.02)',
        hover: '0 12px 32px rgba(17, 17, 17, 0.08), 0 4px 12px rgba(17, 17, 17, 0.03)',
        modal: '0 25px 60px -12px rgba(17, 17, 17, 0.16)'
      }
    }
  },
  plugins: []
};

export default config;
