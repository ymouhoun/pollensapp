/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
      fontWeight: {
        // figma:pollens-app (taKREQ1i) — start
        "figma-normal": "400",
        // figma:pollens-app (taKREQ1i) — end
      },
      lineHeight: {
        // figma:pollens-app (taKREQ1i) — start
        "figma-13": "13px",
        "figma-17": "17px",
        "figma-18": "18px",
        "figma-26": "26px",
        // figma:pollens-app (taKREQ1i) — end
      },
      fontSize: {
        // figma:pollens-app (taKREQ1i) — start
        "figma-12": "12px",
        "figma-14": "14px",
        "figma-20": "20px",
        // figma:pollens-app (taKREQ1i) — end
      },
  		fontFamily: {
        // figma:pollens-app (taKREQ1i) — start
        "heading": ['"Gerstner Programm"', 'sans-serif'],
        "paragraph": ['"Banana Grotesk"', 'sans-serif'],
        "figma-inter": ['"Inter"', 'sans-serif'],
        // figma:pollens-app (taKREQ1i) — end
      
  			sans: ['var(--font-sans)'],
  			display: ['var(--font-display)'],
  			gerstner: ['var(--font-gerstner)'],
  			banana: ['var(--font-banana)'],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
        // figma:pollens-app (taKREQ1i) — start
        "figma-primary": "hsl(var(--figma-primary))",
        "figma-secondary": "hsl(var(--figma-secondary))",
        "figma-accent": "hsl(var(--figma-accent))",
        "figma-text-1": "hsl(var(--figma-text-1))",
        "figma-text-2": "hsl(var(--figma-text-2))",
        "figma-text-3": "hsl(var(--figma-text-3))",
        // figma:pollens-app (taKREQ1i) — end
      
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
  				'50%': { transform: 'translateY(-10px) rotate(1deg)' }
  			},
  			'float-slow': {
  				'0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
  				'50%': { transform: 'translateY(-15px) rotate(-1deg)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'float': 'float 6s ease-in-out infinite',
  			'float-slow': 'float-slow 8s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}