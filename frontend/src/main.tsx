import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { enableMockApi } from './utils/mockApi';

// Enable mock API only when explicitly requested via env.
if (import.meta.env.VITE_USE_MOCK_API === 'true') {
  enableMockApi();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
