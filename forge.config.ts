import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerDMG } from '@electron-forge/maker-dmg';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Orangebeard Desktop Reporter',
    executableName: 'orangebeard-desktop-reporter',
    icon: './assets/logo',
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    new MakerZIP({}, ['win32', 'linux']),
    new MakerDMG({
      name: 'Orangebeard Reporter',
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
