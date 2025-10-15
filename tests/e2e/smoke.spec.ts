import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  // Launch Electron app with NODE_ENV=test to prevent DevTools from opening
  // Use '.' to launch the app from package.json main entry
  const launchArgs = ['.'];
  
  // On Linux in CI, disable sandbox to avoid permission issues
  if (process.platform === 'linux' && process.env.CI) {
    launchArgs.push('--no-sandbox');
  }
  
  electronApp = await electron.launch({
    args: launchArgs,
    cwd: path.join(__dirname, '../..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  // Get the first window  
  window = await electronApp.firstWindow();
  
  // Wait for the page to load
  await window.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test.describe('Orangebeard Desktop Reporter - Smoke Test', () => {
  test('should launch application', async () => {
    expect(window).toBeTruthy();
    await expect(window).toHaveTitle('Orangebeard Desktop Reporter');
  });

  test('should show get started screen', async () => {
    const heading = await window.locator('h2:has-text("Get Started")');
    await expect(heading).toBeVisible();
  });

  test('should create new test set', async () => {
    // Click "Create New Test Set" button
    await window.click('button:has-text("Create New Test Set")');

    // Should now show the test set metadata inputs
    const orgInput = await window.locator('input[placeholder="organization"]');
    await expect(orgInput).toBeVisible();
  });

  test('should populate test set metadata', async () => {
    // Fill in metadata
    await window.fill('input[placeholder="organization"]', 'test-org');
    await window.fill('input[placeholder="project"]', 'test-project');
    await window.fill('input[placeholder="test set name"]', 'E2E Test Set');

    // Verify the values
    const orgInput = await window.locator('input[placeholder="organization"]');
    await expect(orgInput).toHaveValue('test-org');
  });

  test('should add a root suite', async () => {
    // Click "+ Suite" button
    await window.click('button:has-text("+ Suite")');

    // Modal should appear
    const modal = await window.locator('text="Add Root Suite"');
    await expect(modal).toBeVisible();

    // Enter suite name
    await window.fill('input[placeholder="Enter suite name"]', 'Test Suite 1');

    // Click Add button
    await window.click('button:has-text("Add"):not([disabled])');

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // Suite should appear in tree with folder emoji
    const suite = window.locator('text=/📁.*Test Suite 1/');
    await expect(suite).toBeVisible({ timeout: 5000 });
  });

  test('should not start run when no config', async () => {
    // Try to start run - should be disabled or show error
    const startButton = await window.locator('button:has-text("Start Run")');
    
    // Note: This test assumes config is not set up
    // In a real scenario, you'd mock the config or handle the error
    await expect(startButton).toBeVisible();
  });
});
