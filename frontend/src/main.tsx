import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { isMockServerEnabled } from './mocks/config'

async function bootstrap() {
  if (import.meta.env.DEV && isMockServerEnabled(import.meta.env.VITE_USE_MSW)) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
