import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n' // Initialize i18n
import mixpanel, { testMixpanel } from './utils/mixpanel' // Initialize Mixpanel
import App from './App.tsx'

// Wait for DOM to be ready before initializing
if (document.getElementById('root')) {
  // Test Mixpanel after a short delay
  setTimeout(() => {
    console.log('🔍 Checking Mixpanel status...');
    testMixpanel();
  }, 2000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
