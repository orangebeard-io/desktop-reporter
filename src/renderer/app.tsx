import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Titlebar } from '@/components/Titlebar';
import { Toaster } from '@/components/ui/toast';
import { Runner } from '@/routes/Runner';
import { Settings } from '@/routes/Settings';
import { useStore } from '@/state/store';

export default function App() {
  const { config, loadConfig, setTheme } = useStore();

  useEffect(() => {
    // Load config on startup
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Apply theme when config loads
    if (config) {
      const themeMode = config.theme || 'system';
      setTheme(themeMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  return (
    <HashRouter>
      <Toaster>
        <div className="h-screen flex flex-col bg-background">
          <Titlebar />
          <div className="flex-1 overflow-auto -webkit-app-region-no-drag">
            <Routes>
              <Route path="/" element={<Runner />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </Toaster>
    </HashRouter>
  );
}
