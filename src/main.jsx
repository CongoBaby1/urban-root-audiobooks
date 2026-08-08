import React from 'react';
import ReactDOM from 'react-dom/client';
import { StoreProvider } from './context/StoreContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppContent } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
