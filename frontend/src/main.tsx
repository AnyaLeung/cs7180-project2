import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { enableMockApi } from './utils/mockApi'

// Always enable mock for auth & files (no real backend yet).
// scan-line & generate pass through to real API via Vite proxy.
enableMockApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
