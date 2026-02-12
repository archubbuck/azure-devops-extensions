import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import * as SDK from 'azure-devops-extension-sdk';
import App from './app/app';

// Add logging helper
const log = (message: string, data?: unknown) => {
  console.log(`[Notification Hub] ${message}`, data || '');
};

const error = (message: string, err?: unknown) => {
  console.error(`[Notification Hub ERROR] ${message}`, err || '');
};

log('Starting initialization...');

// Initialize the Azure DevOps SDK
SDK.init({
  loaded: true, // Set to true to indicate extension has loaded successfully
  applyTheme: true,
})
  .then(() => {
    log('SDK initialized successfully');

    // Verify root element exists
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      error('Root element not found in DOM');
      SDK.notifyLoadFailed('Root element not found');
      return;
    }

    log('Root element found, rendering React app...');

    try {
      const root = ReactDOM.createRoot(rootElement);

      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );

      log('React app rendered successfully');
      
      // Notify SDK that load succeeded after render
      SDK.notifyLoadSucceeded();
      log('Notified SDK of successful load');
    } catch (err) {
      error('Failed to render React app', err);
      SDK.notifyLoadFailed('Failed to render app');
    }
  })
  .catch((err) => {
    error('SDK initialization failed', err);
    
    // Try to render a basic error message even if SDK fails
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
          <h2>Notification Hub Failed to Load</h2>
          <p>The Azure DevOps SDK failed to initialize.</p>
          <p>Error: ${err instanceof Error ? err.message : String(err)}</p>
          <p>Please refresh the page or contact support if the problem persists.</p>
        </div>
      `;
    }
    
    // Notify SDK of failure
    try {
      SDK.notifyLoadFailed('SDK initialization failed');
    } catch (notifyError) {
      error('Failed to notify SDK of load failure', notifyError);
    }
  });
