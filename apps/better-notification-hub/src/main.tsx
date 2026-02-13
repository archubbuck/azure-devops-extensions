import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import * as SDK from 'azure-devops-extension-sdk';
import App from './app/app';

// Enhanced logging helper with timestamps
const log = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Notification Hub Panel] ${message}`, data || '');
};

const error = (message: string, err?: unknown) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [Notification Hub Panel ERROR] ${message}`, err || '');
};

log('=== Notification Hub Panel Starting ===');
log(`Document readyState: ${document.readyState}`);
log(`Window location: ${window.location.href}`);
log(`User Agent: ${navigator.userAgent}`);

// Initialize the Azure DevOps SDK
log('Initializing Azure DevOps SDK...');
const initStartTime = Date.now();

SDK.init({
  loaded: true, // Set to true to indicate extension has loaded successfully
  applyTheme: true,
})
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
    
    // Log contribution ID
    try {
      const contributionId = SDK.getContributionId();
      log(`Current Contribution ID: ${contributionId}`);
    } catch (err) {
      error('Failed to get contribution ID', err);
    }
    
    // Log host information
    try {
      const host = SDK.getHost();
      log('Azure DevOps Host:', {
        id: host.id,
        name: host.name,
        serviceVersion: host.serviceVersion,
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
        descriptor: user.descriptor,
      });
    } catch (err) {
      error('Failed to get user information', err);
    }
    
    // Log configuration
    try {
      const configuration = SDK.getConfiguration();
      log('Panel Configuration:', configuration);
    } catch (err) {
      error('Failed to get configuration', err);
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

      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );

      log('✓ React app rendered successfully');
      
      // Notify SDK that load succeeded after render
      SDK.notifyLoadSucceeded();
      log('✓ Notified SDK of successful load');
      log('=== Notification Hub Panel Ready ===');
    } catch (err) {
      error('Failed to render React app', err);
      SDK.notifyLoadFailed('Failed to render app');
    }
  })
  .catch((err) => {
    error('SDK initialization failed', err);
    error('Error details:', {
      name: err instanceof Error ? err.name : 'Unknown',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    
    // Try to render a basic error message even if SDK fails
    const rootElement = document.getElementById('root');
    if (rootElement) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error && err.stack ? err.stack : 'No stack trace available';
      rootElement.innerHTML = `
        <div style="padding: 20px; color: red; font-family: Arial, sans-serif; max-width: 600px;">
          <h2>❌ Notification Hub Failed to Load</h2>
          <p>The Azure DevOps SDK failed to initialize.</p>
          <details>
            <summary style="cursor: pointer; margin: 10px 0; font-weight: bold;">Error Details</summary>
            <div style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; overflow-x: auto;">
              <strong>Message:</strong><br/>
              <code>${errorMessage}</code>
              <br/><br/>
              <strong>Stack Trace:</strong><br/>
              <pre style="font-size: 12px; white-space: pre-wrap; word-wrap: break-word;">${errorStack}</pre>
            </div>
          </details>
          <p style="margin-top: 20px;">
            <strong>Troubleshooting:</strong><br/>
            • Check the browser console for more details<br/>
            • Verify the extension is properly installed<br/>
            • Try refreshing the page<br/>
            • Contact support if the problem persists
          </p>
        </div>
      `;
      log('Error UI rendered to root element');
    } else {
      error('Root element not found, cannot render error UI');
    }
    
    // Notify SDK of failure
    try {
      SDK.notifyLoadFailed('SDK initialization failed');
      log('Notified SDK of load failure');
    } catch (notifyError) {
      error('Failed to notify SDK of load failure', notifyError);
    }
  });
