import type { StateCreator } from 'zustand';
import type { ThemeMode } from '../../domain/models';

export interface ThemeSlice {
  theme: ThemeMode;
  appliedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (mode: ThemeMode): 'light' | 'dark' => {
  const appliedTheme = mode === 'system' ? getSystemTheme() : mode;
  
  if (appliedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  return appliedTheme;
};

export const createThemeSlice: StateCreator<ThemeSlice> = (set, get) => {
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = get().theme;
    if (currentTheme === 'system') {
      const appliedTheme = applyTheme('system');
      set({ appliedTheme });
    }
  });

  return {
    theme: 'system',
    appliedTheme: getSystemTheme(),

    setTheme: (theme: ThemeMode) => {
      const appliedTheme = applyTheme(theme);
      set({ theme, appliedTheme });
    },
  };
};
