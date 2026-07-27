// Buffer polyfill for @react-pdf/renderer
import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { i18nReady } from './i18n'
import { applyTenant } from './config/tenant'

// Stamp data-tenant on <html> before first paint so the brand palette in
// index.css applies without a flash of the default (green) theme.
applyTenant()

// Same idea for language: wait for any lazily-loaded locale so the first paint is
// already in the right language. Resolves immediately (one microtask) for tenants
// that only use the built-in nl/en, and never rejects — see i18nReady.
void i18nReady.then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
