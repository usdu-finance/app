/** @type {import('tailwindcss').Config} */

module.exports = {
	content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				// sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
				avenir: ['Avenir', 'system-ui', 'sans-serif'],
			},
			colors: {
				// USDU theme colors based on usdu.finance
				'usdu-bg': '#f2f0ec',
				'usdu-card': '#ffffff',
				'usdu-surface': '#e8e6e4',
				'usdu-orange': '#f16325',
				'usdu-black': '#0c0c0c',
				'usdu-gray': '#6b7280',
				'text-primary': '#0c0c0c',
				'text-secondary': '#374151',
				'text-muted': '#6b7280',

				// Shared UI kit tokens (ported from wrytes-app, aliased onto the USDU palette)
				// Note: deliberately no 'base' color token here — it collides with Tailwind's core
				// `text-base` font-size utility (1rem), silently overriding it app-wide. Use 'usdu-bg' instead.
				brand: '#f16325',
				surface: '#e8e6e4',
				card: '#ffffff',

				'input-border': '#d1d5db',
				'input-label': '#6b7280',
				'input-empty': '#9ca3af',
				disabled: '#e5e7eb',

				error: '#ef4444',
				'error-bg': '#fef2f2',
				'error-border': '#fecaca',

				success: '#4ade80',
				'success-bg': '#f0fdf4',
				'success-border': '#bbf7d0',

				info: '#60a5fa',
				warning: '#f59e0b',

				'table-header': '#f9fafb',
				'table-alt': '#e5e7eb',

				// Tag palette — user-assignable colors (e.g. tracked-address badges)
				'tag-blue': '#3b82f6',
				'tag-purple': '#a855f7',
				'tag-pink': '#ec4899',
				'tag-teal': '#14b8a6',
				'tag-amber': '#d97706',
				'tag-green': '#22c55e',
				'tag-red': '#f43f5e',
				'tag-indigo': '#6366f1',

				// Legacy dark theme (for dashboard)
				'dark-bg': '#1a1a1a',
				'dark-card': '#2a2a2a',
				'dark-surface': '#1f1f1f',
				'accent-orange': '#f16325',

				// Gradient colors
				gradient: {
					'light-start': '#f2f0ec',
					'light-end': '#e8e6e4',
					'card-start': '#ffffff',
					'card-end': '#f9fafb',
				},
			},
			backgroundImage: {
				'gradient-dark': 'linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 100%)',
				'gradient-card': 'linear-gradient(135deg, #2a2a2a 0%, #3a2a2a 100%)',
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-in-out',
				'slide-up': 'slideUp 0.6s ease-out',
				float: 'float 3s ease-in-out infinite',
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' },
				},
			},
			boxShadow: {
				card: '0 4px 20px rgba(0, 0, 0, 0.3)',
				'card-hover': '0 8px 30px rgba(0, 0, 0, 0.4)',
				glow: '0 0 20px rgba(255, 107, 53, 0.3)',
				'glow-gold': '0 0 20px rgba(255, 215, 0, 0.3)',
			},
			borderRadius: {
				xl: '1rem',
				'2xl': '1.5rem',
				'3xl': '2rem',
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'128': '32rem',
			},
			screens: {
				xs: '475px',
			},
		},
	},
	plugins: [],
};
