/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      fontSize: {
        // macOS-like scale
        'macos-xs':  ['11px', { lineHeight: '16px', letterSpacing: '0px' }],
        'macos-sm':  ['12px', { lineHeight: '18px', letterSpacing: '-0.01em' }],
        'macos-base':['13px', { lineHeight: '20px', letterSpacing: '-0.01em' }],
        'macos-md':  ['15px', { lineHeight: '22px', letterSpacing: '-0.02em' }],
        'macos-lg':  ['17px', { lineHeight: '24px', letterSpacing: '-0.025em' }],
        'macos-xl':  ['22px', { lineHeight: '28px', letterSpacing: '-0.03em' }],
        'macos-2xl': ['28px', { lineHeight: '34px', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'macos': '10px',
        'macos-lg': '14px',
        'macos-xl': '18px',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // macOS semantic colors
        macos: {
          red:    '#FF5F57',
          yellow: '#FEBC2E',
          green:  '#28C840',
          blue:   '#007AFF',
          gray:   '#8E8E93',
          separator: 'rgba(0,0,0,0.08)',
        },
      },
      boxShadow: {
        'macos-sm': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'macos':    '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        'macos-lg': '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
        'macos-window': '0 22px 70px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.10)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float': 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    'bg-macos-red', 'bg-macos-yellow', 'bg-macos-green',
  ],
}