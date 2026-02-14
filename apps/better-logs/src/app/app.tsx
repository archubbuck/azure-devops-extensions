import { useEffect, useRef } from 'react';
import LogPanel from '../components/LogPanel';

interface AppProps {
  onReady?: () => void;
}

export function App({ onReady }: AppProps) {
  const hasNotifiedReady = useRef(false);

  useEffect(() => {
    // Notify parent when component is mounted and ready
    if (!hasNotifiedReady.current && onReady) {
      hasNotifiedReady.current = true;
      onReady();
    }
  }, [onReady]);

  return <LogPanel onReady={onReady} />;
}

export default App;
