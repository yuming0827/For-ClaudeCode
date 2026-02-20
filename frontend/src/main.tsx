import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c2128',
            color: '#e6edf3',
            border: '1px solid #30363d',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#3fb950', secondary: '#0d1117' } },
          error: { iconTheme: { primary: '#f85149', secondary: '#0d1117' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
