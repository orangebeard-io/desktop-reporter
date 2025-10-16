import { ipcMain, dialog, clipboard, desktopCapturer, app, session } from 'electron';
import fs from 'fs/promises';
import { z } from 'zod';
import { AppConfigSchema } from '../domain/models';
import { loadConfig, saveConfig } from './config-store';
import { getMainWindow } from './main';
import * as OBService from './orangebeard-service';

// IPC Channel definitions with Zod schemas
const FileDialogSchema = z.object({
  filters: z.array(z.object({ name: z.string(), extensions: z.array(z.string()) })).optional(),
});

const SaveFileSchema = z.object({
  filters: z.array(z.object({ name: z.string(), extensions: z.array(z.string()) })).optional(),
  defaultPath: z.string().optional(),
});

const ReadFileSchema = z.object({
  path: z.string(),
});

const WriteFileSchema = z.object({
  path: z.string(),
  data: z.string(),
});


export function registerIPCHandlers() {
  // Config handlers
  ipcMain.handle('config:load', async () => {
    return loadConfig();
  });

  ipcMain.handle('config:save', async (_event, config) => {
    const result = AppConfigSchema.safeParse(config);
    if (!result.success) {
      const listenerIssue = result.error.issues.find((i) => i.path?.includes('listenerToken'));
      if (listenerIssue) {
        throw new Error('Invalid Listener Token. Please enter a valid UUID.');
      }
      throw new Error(result.error.message);
    }

    const validated = result.data;
    saveConfig(validated);
    
    // Update always-on-top only if it changed to avoid focus quirks
    const win = getMainWindow();
    if (win) {
      if (win.isAlwaysOnTop() !== !!validated.alwaysOnTop) {
        win.setAlwaysOnTop(!!validated.alwaysOnTop);
      }
    }
    
    // Update proxy
    if (validated.proxy) {
      await session.defaultSession.setProxy({
        proxyRules: `${validated.proxy.host}:${validated.proxy.port}`,
        proxyBypassRules: '<local>',
      });
    } else {
      await session.defaultSession.setProxy({});
    }

    // Ensure window regains focus after settings save
    if (win) {
      win.focus();
    }
    
    return true;
  });

  // File dialog handlers
  ipcMain.handle('dialog:open-file', async (_event, options) => {
    const validated = FileDialogSchema.parse(options);
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: validated.filters,
    });
    return result.filePaths[0] || null;
  });

  ipcMain.handle('dialog:save-file', async (_event, options) => {
    const validated = SaveFileSchema.parse(options);
    const result = await dialog.showSaveDialog({
      filters: validated.filters,
      defaultPath: validated.defaultPath,
    });
    
    return result.filePath || null;
  });

  // File system handlers
  ipcMain.handle('fs:read', async (_event, options) => {
    const validated = ReadFileSchema.parse(options);
    const data = await fs.readFile(validated.path, 'utf-8');
    return data;
  });

  ipcMain.handle('fs:write', async (_event, options) => {
    const validated = WriteFileSchema.parse(options);
    await fs.writeFile(validated.path, validated.data, 'utf-8');
    return true;
  });

  // Path helpers
  ipcMain.handle('path:user-data', () => {
    return app.getPath('userData');
  });

  // Clipboard handlers
  ipcMain.handle('clipboard:read-image', () => {
    const image = clipboard.readImage();
    if (image.isEmpty()) return null;
    const pngBuffer = image.toPNG();
    // Convert Buffer to Uint8Array for IPC transfer
    return new Uint8Array(pngBuffer);
  });

  // Screenshot handler
  ipcMain.handle('screenshot:get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }));
  });

  // Window control handlers
  ipcMain.handle('window:minimize', () => {
    const win = getMainWindow();
    win?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const win = getMainWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    const win = getMainWindow();
    win?.close();
  });

  // Orangebeard API handlers
  ipcMain.handle('ob:init', (_event, config) => {
    OBService.initOrangebeardClient(config);
  });

  ipcMain.handle('ob:startRun', (_event, runName, description) => {
    return OBService.startRun(runName, description);
  });

  ipcMain.handle('ob:startSuite', (_event, runId, suiteNames) => {
    return OBService.startSuite(runId, suiteNames);
  });

  ipcMain.handle('ob:startTest', (_event, runId, suiteUUID, testName) => {
    return OBService.startTest(runId, suiteUUID, testName);
  });

  ipcMain.handle('ob:finishTest', (_event, runId, testUUID, status) => {
    OBService.finishTest(runId, testUUID, status);
  });

  ipcMain.handle('ob:logToTest', (_event, runId, testUUID, message, logLevel) => {
    return OBService.logToTest(runId, testUUID, message, logLevel);
  });

  ipcMain.handle('ob:logToStep', (_event, runId, testUUID, stepUUID, message, logLevel) => {
    return OBService.logToStep(runId, testUUID, stepUUID, message, logLevel);
  });

  ipcMain.handle('ob:sendAttachment', (_event, runId, testUUID, logUUID, stepUUID, fileName, content, contentType) => {
    return OBService.sendAttachment(runId, testUUID, logUUID, stepUUID, fileName, Buffer.from(content), contentType);
  });

  ipcMain.handle('ob:startStep', (_event, runId, testUUID, parentStepUUID, stepName) => {
    return OBService.startStep(runId, testUUID, parentStepUUID, stepName);
  });

  ipcMain.handle('ob:finishStep', (_event, runId, stepUUID, status) => {
    OBService.finishStep(runId, stepUUID, status);
  });

  ipcMain.handle('ob:finishRun', async (_event, runId) => {
    await OBService.finishRun(runId);
  });
}
