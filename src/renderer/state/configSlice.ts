import type { StateCreator } from 'zustand';
import type { AppConfig } from '../../domain/models';

export interface ConfigSlice {
  config: AppConfig | null;
  loadConfig: () => Promise<void>;
  saveConfig: (config: AppConfig) => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => void;
}

export const createConfigSlice: StateCreator<ConfigSlice> = (set, get) => ({
  config: null,

  loadConfig: async () => {
    try {
      const config = await window.api.config.load();
      set({ config });
    } catch (error) {
      console.error('Failed to load config:', error);
      throw error;
    }
  },

  saveConfig: async (config: AppConfig) => {
    try {
      await window.api.config.save(config);
      set({ config });
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  },

  updateConfig: (updates: Partial<AppConfig>) => {
    const currentConfig = get().config;
    if (currentConfig) {
      set({ config: { ...currentConfig, ...updates } });
    }
  },
});
