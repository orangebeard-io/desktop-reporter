import { contextBridge, ipcRenderer } from 'electron';
import type { AppConfig } from '../domain/models';

// Define typed API
export interface ElectronAPI {
  config: {
    load: () => Promise<AppConfig | null>;
    save: (config: AppConfig) => Promise<boolean>;
  };
  dialog: {
    openFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
    saveFile: (options: { title?: string; filters?: { name: string; extensions: string[] }[]; defaultPath?: string }) => Promise<string | null>;
  };
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, data: string) => Promise<boolean>;
  };
  path: {
    userData: () => Promise<string>;
  };
  clipboard: {
    readImage: () => Promise<Uint8Array | null>;
  };
  screenshot: {
    capture: () => Promise<string | null>;
    getSources: () => Promise<{ id: string; name: string; thumbnail: string }[]>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  ob: {
    init: (config: { endpoint: string; token: string; project: string; testset: string; organization: string }) => Promise<void>;
    startRun: (runName: string, description?: string) => Promise<string>;
    startSuite: (runId: string, suiteNames: string[]) => Promise<string[]>;
    startTest: (runId: string, suiteUUID: string, testName: string) => Promise<string>;
    finishTest: (runId: string, testUUID: string, status: string) => Promise<void>;
    logToTest: (runId: string, testUUID: string, message: string, logLevel?: 'INFO' | 'ERROR') => Promise<string>;
    logToStep: (runId: string, testUUID: string, stepUUID: string, message: string, logLevel?: 'INFO' | 'ERROR') => Promise<string>;
    sendAttachment: (runId: string, testUUID: string, logUUID: string, stepUUID: string | undefined, fileName: string, content: ArrayBuffer, contentType: string) => Promise<string>;
    startStep: (runId: string, testUUID: string, parentStepUUID: string | undefined, stepName: string) => Promise<string>;
    finishStep: (runId: string, stepUUID: string, status: string) => Promise<void>;
    finishRun: (runId: string) => Promise<void>;
  };
}

const api: ElectronAPI = {
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config) => ipcRenderer.invoke('config:save', config),
  },
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:open-file', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options),
  },
  fs: {
    readFile: (path) => ipcRenderer.invoke('fs:read', { path }),
    writeFile: (path, data) => ipcRenderer.invoke('fs:write', { path, data }),
  },
  path: {
    userData: () => ipcRenderer.invoke('path:user-data'),
  },
  clipboard: {
    readImage: () => ipcRenderer.invoke('clipboard:read-image'),
  },
  screenshot: {
    capture: () => ipcRenderer.invoke('screenshot:capture'),
    getSources: () => ipcRenderer.invoke('screenshot:get-sources'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  ob: {
    init: (config: { endpoint: string; token: string; project: string; testset: string; organization: string }) =>
      ipcRenderer.invoke('ob:init', config),
    startRun: (runName: string, description?: string) => ipcRenderer.invoke('ob:startRun', runName, description),
    startSuite: (runId: string, suiteNames: string[]) =>
      ipcRenderer.invoke('ob:startSuite', runId, suiteNames),
    startTest: (runId: string, suiteUUID: string, testName: string) =>
      ipcRenderer.invoke('ob:startTest', runId, suiteUUID, testName),
    finishTest: (runId: string, testUUID: string, status: string) =>
      ipcRenderer.invoke('ob:finishTest', runId, testUUID, status),
    logToTest: (runId: string, testUUID: string, message: string, logLevel?: 'INFO' | 'ERROR') =>
      ipcRenderer.invoke('ob:logToTest', runId, testUUID, message, logLevel),
    logToStep: (runId: string, testUUID: string, stepUUID: string, message: string, logLevel?: 'INFO' | 'ERROR') =>
      ipcRenderer.invoke('ob:logToStep', runId, testUUID, stepUUID, message, logLevel),
    sendAttachment: (runId: string, testUUID: string, logUUID: string, stepUUID: string | undefined, fileName: string, content: ArrayBuffer, contentType: string) =>
      ipcRenderer.invoke('ob:sendAttachment', runId, testUUID, logUUID, stepUUID, fileName, content, contentType),
    startStep: (runId: string, testUUID: string, parentStepUUID: string | undefined, stepName: string) =>
      ipcRenderer.invoke('ob:startStep', runId, testUUID, parentStepUUID, stepName),
    finishStep: (runId: string, stepUUID: string, status: string) =>
      ipcRenderer.invoke('ob:finishStep', runId, stepUUID, status),
    finishRun: (runId: string) => ipcRenderer.invoke('ob:finishRun', runId),
  },
};

contextBridge.exposeInMainWorld('api', api);

// Type declaration for renderer
declare global {
  interface Window {
    api: ElectronAPI;
  }
}
