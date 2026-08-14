
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import { AuthCallback } from './components/AuthCallback';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isAuthCallback = window.location.pathname.includes('/auth/callback');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        {isAuthCallback ? (
          <AuthCallback />
        ) : (
          <HashRouter>
            <App />
          </HashRouter>
        )}
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

