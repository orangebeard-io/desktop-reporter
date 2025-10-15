const { VitePlugin } = require('@electron-forge/plugin-vite');
const { MakerZIP } = require('@electron-forge/maker-zip');
const { MakerDeb } = require('@electron-forge/maker-deb');
const { MakerDMG } = require('@electron-forge/maker-dmg');

/** @type {import('@electron-forge/shared-types').ForgeConfig} */
const config = {
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
      name: 'Orangebeard Desktop Reporter',
      icon: './assets/logo.icns',
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

module.exports = config;
