import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { AppConfig, AppConfigSchema } from '../domain/models';

const CONFIG_FILE = 'config.json';

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

export function loadConfig(): AppConfig | null {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const data = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(data);
    return AppConfigSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to load config:', error);
    return null;
  }
}

export function saveConfig(config: AppConfig): void {
  try {
    const configPath = getConfigPath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config:', error);
    throw error;
  }
}
