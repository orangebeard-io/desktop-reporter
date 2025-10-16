import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/state/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AppConfig, ThemeMode } from '../../domain/models';
import { useToast } from '@/components/ui/toast';

export function Settings() {
  const navigate = useNavigate();
  const { config, loadConfig, saveConfig, theme, setTheme } = useStore();
  const { show } = useToast();

  const [formData, setFormData] = useState({
    baseUrl: 'https://app.orangebeard.io',
    listenerToken: '',
    organization: '',
    project: '',
    proxyHost: '',
    proxyPort: '',
    alwaysOnTop: false,
    theme: 'system' as ThemeMode,
  });

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Initialize form from loaded config once, do not overwrite user input while editing
  useEffect(() => {
    if (config) {
      setFormData({
        baseUrl: config.baseUrl || 'https://app.orangebeard.io',
        listenerToken: config.listenerToken || '',
        organization: '',
        project: '',
        proxyHost: config.proxy?.host || '',
        proxyPort: config.proxy?.port?.toString() || '',
        alwaysOnTop: config.alwaysOnTop || false,
        theme: (config.theme as ThemeMode) ?? theme,
      });
    }
    // Only react to config changes to avoid clobbering while typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleSave = async () => {
    try {
      const newConfig: AppConfig = {
        baseUrl: formData.baseUrl,
        listenerToken: formData.listenerToken,
        alwaysOnTop: formData.alwaysOnTop,
        theme: formData.theme,
        proxy: formData.proxyHost
          ? {
              host: formData.proxyHost,
              port: parseInt(formData.proxyPort) || 8080,
            }
          : undefined,
      } as AppConfig;

      await saveConfig(newConfig);
      setTheme(formData.theme);
      // Navigate back to home without blocking alert dialogs to avoid focus issues
      navigate('/');
      show({ title: 'Configuration saved!', description: '', variant: 'success' });
    } catch (error) {
      // Show non-blocking toast for validation or save errors
      const msg = String(error instanceof Error ? error.message : error);
      show({ title: 'Failed to save configuration', description: msg, variant: 'error' });
      console.error('Failed to save configuration:', error);
    }
  };

  return (
    <div className="p-6 max-w-2xl -webkit-app-region-no-drag">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your Orangebeard connection</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input
            id="baseUrl"
            value={formData.baseUrl}
            onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            placeholder="https://app.orangebeard.io"
          />
        </div>

        <div>
          <Label htmlFor="listenerToken">Listener Token (UUID)</Label>
          <Input
            id="listenerToken"
            value={formData.listenerToken}
            onChange={(e) => setFormData({ ...formData, listenerToken: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-3">Proxy Configuration (Optional)</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="proxyHost">Proxy Host</Label>
              <Input
                id="proxyHost"
                value={formData.proxyHost}
                onChange={(e) => setFormData({ ...formData, proxyHost: e.target.value })}
                placeholder="proxy.example.com"
              />
            </div>
            <div>
              <Label htmlFor="proxyPort">Proxy Port</Label>
              <Input
                id="proxyPort"
                type="number"
                value={formData.proxyPort}
                onChange={(e) => setFormData({ ...formData, proxyPort: e.target.value })}
                placeholder="8080"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-3">Appearance</h3>
          <div>
            <Label htmlFor="theme">Theme</Label>
            <select
              id="theme"
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value as ThemeMode })}
              className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="alwaysOnTop"
            type="checkbox"
            checked={formData.alwaysOnTop}
            onChange={(e) => setFormData({ ...formData, alwaysOnTop: e.target.checked })}
            className="w-4 h-4"
          />
          <Label htmlFor="alwaysOnTop">Always on top</Label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave}>Save Configuration</Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
