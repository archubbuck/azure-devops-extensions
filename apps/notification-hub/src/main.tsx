import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import * as SDK from 'azure-devops-extension-sdk';
import App from './app/app';

// Initialize the Azure DevOps SDK
SDK.init({
  loaded: false,
  applyTheme: true,
}).then(() => {
  SDK.notifyLoadSucceeded();
  
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement,
  );

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
