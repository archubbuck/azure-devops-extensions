import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import * as SDK from 'azure-devops-extension-sdk';
import App from './app/app';

// Enhanced logging helper with timestamps
const log = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Hello Azure DevOps] ${message}`, data || '');
};

const error = (message: string, err?: unknown) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [Hello Azure DevOps ERROR] ${message}`, err || '');
};

log('=== Hello Azure DevOps Starting ===');
log(`Document readyState: ${document.readyState}`);

// Initialize the Azure DevOps SDK
log('Initializing Azure DevOps SDK...');
const initStartTime = Date.now();

SDK.init({
  applyTheme: true,
})
  .then(() => SDK.ready())
  .then(() => {
    const initDuration = Date.now() - initStartTime;
    log(`SDK initialized successfully in ${initDuration}ms`);
    
    // Log extension context information
    try {
      const extensionContext = SDK.getExtensionContext();
      log('Extension Context:', {
        id: extensionContext.id,
        publisherId: extensionContext.publisherId,
        extensionId: extensionContext.extensionId,
        version: extensionContext.version,
      });
    } catch (err) {
      error('Failed to get extension context', err);
    }
    
    // Log host information
    try {
      const host = SDK.getHost();
      log('Azure DevOps Host:', {
        id: host.id,
        name: host.name,
      });
    } catch (err) {
      error('Failed to get host information', err);
    }
    
    // Log user information
    try {
      const user = SDK.getUser();
      log('Current User:', {
        displayName: user.displayName,
        id: user.id,
      });
    } catch (err) {
      error('Failed to get user information', err);
    }

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

      // Create a callback to notify SDK when app is ready
      const onAppReady = () => {
        log('✓ App initial load complete, notifying SDK...');
        SDK.notifyLoadSucceeded();
        log('✓ Notified SDK of successful load');
        log('=== Hello Azure DevOps Ready ===');
      };

      root.render(
        <StrictMode>
          <App onReady={onAppReady} />
        </StrictMode>
      );

      log('✓ React app rendered successfully');
    } catch (err) {
      error('Failed to render React app', err);
      SDK.notifyLoadFailed('Failed to render app');
    }
  })
  .catch((err) => {
    error('SDK initialization failed', err);
    
    // Notify SDK of failure
    try {
      SDK.notifyLoadFailed('SDK initialization failed');
      log('Notified SDK of load failure');
    } catch (notifyError) {
      error('Failed to notify SDK of load failure', notifyError);
    }
  });
