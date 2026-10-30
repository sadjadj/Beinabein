import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// After a deploy, an open tab may ask for a page file the old build named; reload to get the new one.
window.addEventListener('vite:preloadError', () => window.location.reload())
