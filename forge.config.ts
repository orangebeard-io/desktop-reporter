import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerWix } from '@electron-forge/maker-wix';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Orangebeard Reporter',
    executableName: 'orangebeard-desktop-reporter',
    icon: './assets/logo',
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    new MakerZIP({}, ['linux', 'darwin']),
    new MakerWix({
      name: 'Orangebeard Desktop Reporter',
      manufacturer: 'Orangebeard',
      icon: './assets/logo.ico',
      exe: 'orangebeard-desktop-reporter.exe',
      description: 'Desktop reporter application for Orangebeard',
      ui: {
        chooseDirectory: true,
      },
    }),
    new MakerDeb({
      options: {
        name: 'orangebeard-desktop-reporter',
        productName: 'Orangebeard Desktop Reporter',
        icon: './assets/logo.png',
        categories: ['Development'],
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/main/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
