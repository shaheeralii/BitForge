import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { HistoryProvider } from './context/HistoryContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HistoryProvider>
      <App />
    </HistoryProvider>
  </StrictMode>,
);
