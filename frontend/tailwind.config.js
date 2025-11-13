/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern Booking Platform Colors
        'bright-blue': '#1E90FF',
        'coral-red': '#FF5A5F',
        'lime-green': '#A3D55D',
        'soft-yellow': '#FFD43B',
        'light-gray': '#F5F5F5',
        'medium-gray': '#E0E0E0',
        'charcoal': '#333333',
        'white': '#FFFFFF',
        
        // Primary color aliases
        primary: '#1E90FF', // Bright Blue
        secondary: '#FF5A5F', // Coral Red
        accent: '#A3D55D', // Lime Green
        warning: '#FFD43B', // Soft Yellow
        
        // Background colors
        'background-light': '#F5F5F5', // Light Gray
        'background-dark': '#333333', // Charcoal
        
        // Legacy colors for gradual migration
        'burgundy': '#7B2E2E',
        'cream': '#F5F0E6',
        'gold': '#C9A24A',
        'deep-brown': '#4B2E1E',
      },
      fontFamily: {
        'sans': ['Open Sans', 'ui-sans-serif', 'system-ui'],
        'display': ['Poppins', 'ui-sans-serif', 'system-ui'], // Headings
        'body': ['Open Sans', 'sans-serif'], // Body text
        // Legacy fonts for gradual migration
        'serif': ['Playfair Display', 'serif'],
        'script': ['Great Vibes', 'cursive'],
      },
      borderRadius: {
        DEFAULT: '8px', // Modern 8px border radius
        'lg': '12px',
        'xl': '16px',
      },
      scale: {
        '110': '1.1',
      },
      boxShadow: {
        'form': '0px 2px 8px rgba(0, 0, 0, 0.1)',
        'focus': '0 0 4px rgba(30, 144, 255, 0.4)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
}