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
          DEFAULT: '#EFF3F1',
          subtle: '#E5EBE7'
        },
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#F8FAF9'
        },
        mint: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#A7F3D0',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B'
        },
        borderCard: '#E2E8E4',
        institutional: {
          DEFAULT: '#00470E',
          dark: '#003B0C',
          darker: '#00380A',
          gold: '#FFE42E'
        },
        guide: {
          emerald: '#087A21',
          mintBg: '#EFFFE9',
          mintBorder: '#C6F5BB',
          canvas: '#F8FAF8'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '20px',
        xl: '26px',
        card: '20px',
        pill: '9999px'
      },
      boxShadow: {
        card: '0 4px 24px -2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.02)',
        hover: '0 12px 30px -4px rgba(16, 185, 129, 0.16), 0 4px 10px rgba(0, 0, 0, 0.03)',
        modal: '0 25px 60px -12px rgba(15, 23, 42, 0.22)'
      }
    }
  },
  plugins: []
};

export default config;
