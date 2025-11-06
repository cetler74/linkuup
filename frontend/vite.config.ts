import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@heroicons/react', 'lucide-react'],
          'map-vendor': ['leaflet', 'react-leaflet', 'mapbox-gl'],
        }
      },
      onwarn(warning, warn) {
        // Suppress TypeScript warnings during build
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      }
    }
  },
  server: {
    host: '0.0.0.0', // Allow access from all IP addresses
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5001', // Use environment variable or default
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: process.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5001', // Proxy uploads to backend
        changeOrigin: true,
        secure: false
      }
    }
  }
})
