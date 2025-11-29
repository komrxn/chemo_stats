import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(220 14% 11%)',
          border: '1px solid hsl(220 15% 18%)',
          color: 'hsl(210 20% 95%)',
        },
      }}
    />
  </StrictMode>
)

