import * as SDK from 'azure-devops-extension-sdk';
import { useEffect, useState } from 'react';
import './app.css';

export function App() {
  const [userName, setUserName] = useState('');
  const [hostName, setHostName] = useState('');
  const [extensionVersion, setExtensionVersion] = useState('');

  useEffect(() => {
    // Get user information
    try {
      const user = SDK.getUser();
      setUserName(user.displayName || 'Guest');
    } catch (err) {
      console.error('Failed to get user info', err);
      setUserName('User');
    }

    // Get host information
    try {
      const host = SDK.getHost();
      setHostName(host.name || 'Azure DevOps');
    } catch (err) {
      console.error('Failed to get host info', err);
      setHostName('Azure DevOps');
    }

    // Get extension version
    try {
      const extensionContext = SDK.getExtensionContext();
      setExtensionVersion(extensionContext.version || '1.0.0');
    } catch (err) {
      console.error('Failed to get extension context', err);
      setExtensionVersion('1.0.0');
    }
  }, []);

  return (
    <div className="app-container">
      <div className="content">
        <h1>👋 Hello, {userName}!</h1>
        <p className="subtitle">Welcome to {hostName}</p>
        <div className="info-card">
          <h2>Extension Information</h2>
          <p>
            This is a basic Azure DevOps extension created to demonstrate
            automated deployment.
          </p>
          <p>
            <strong>Version:</strong> {extensionVersion}
          </p>
          <p>
            <strong>Status:</strong> <span className="status-badge">✓ Active</span>
          </p>
        </div>
        <div className="footer">
          <p>Successfully deployed via CI/CD pipeline</p>
        </div>
      </div>
    </div>
  );
}

export default App;
