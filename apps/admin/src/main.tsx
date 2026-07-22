// Buffer polyfill for @react-pdf/renderer
import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { applyTenant } from './config/tenant'

// Stamp data-tenant on <html> before first paint so the brand palette in
// index.css applies without a flash of the default (green) theme.
applyTenant()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
