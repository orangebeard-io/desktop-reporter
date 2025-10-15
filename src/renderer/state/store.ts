import { create } from 'zustand';
import { createConfigSlice, type ConfigSlice } from './configSlice';
import { createTestSetSlice, type TestSetSlice } from './testSetSlice';
import { createRunSlice, type RunSlice } from './runSlice';
import { createThemeSlice, type ThemeSlice } from './themeSlice';

export type AppStore = ConfigSlice & TestSetSlice & RunSlice & ThemeSlice;

export const useStore = create<AppStore>()((...args) => ({
  ...createConfigSlice(...args),
  ...createTestSetSlice(...args),
  ...createRunSlice(...args),
  ...createThemeSlice(...args),
}));
