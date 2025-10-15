import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  // Launch Electron app with NODE_ENV=test to prevent DevTools from opening
  electronApp = await electron.launch({
    args: ['.'],
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
  await electronApp.close();
});

test.describe('Drag and Drop - Reordering', () => {
  test.beforeEach(async () => {
    // Create a new test set (or click New if one exists)
    const createButton = window.locator('button:has-text("Create New Test Set")');
    const newButton = window.locator('button:has-text("New")');
    
    const createVisible = await createButton.isVisible().catch(() => false);
    const newVisible = await newButton.isVisible().catch(() => false);
    
    if (createVisible) {
      await createButton.click();
    } else if (newVisible) {
      await newButton.click();
    }
    
    // Fill in metadata
    await window.fill('input[placeholder="organization"]', 'test-org');
    await window.fill('input[placeholder="project"]', 'test-project');
    await window.fill('input[placeholder="test set name"]', 'Drag Drop Test');
    
    // Add a root suite
    await window.click('button:has-text("+ Suite")');
    await window.fill('input[placeholder="Enter suite name"]', 'Test Suite');
    await window.click('button:has-text("Add"):not([disabled])');
    
    // Wait for suite to appear
    const suite = window.locator('text=/📁.*Test Suite/');
    await expect(suite).toBeVisible();
    
    // Click on the suite to select it
    await suite.click();
  });

  test('should reorder tests within a suite', async () => {
    // Add three tests to the suite
    for (let i = 1; i <= 3; i++) {
      await window.click('button:has-text("Add Test")');
      await window.fill('input[placeholder="Enter test name"]', `Test ${i}`);
      await window.click('button:has-text("Add"):not([disabled])');
      await window.waitForTimeout(100); // Small delay between adds
    }

    // Wait for all tests to be visible
    await expect(window.locator('text=/🧪.*Test 1/')).toBeVisible();
    await expect(window.locator('text=/🧪.*Test 2/')).toBeVisible();
    await expect(window.locator('text=/🧪.*Test 3/')).toBeVisible();

    // Get the test elements
    const test1 = window.locator('text=/🧪.*Test 1/').first();
    const test3 = window.locator('text=/🧪.*Test 3/').first();

    // Drag Test 1 and drop it after Test 3
    const test1Box = await test1.boundingBox();
    const test3Box = await test3.boundingBox();
    
    if (test1Box && test3Box) {
      // Start drag from Test 1
      await window.mouse.move(test1Box.x + test1Box.width / 2, test1Box.y + test1Box.height / 2);
      await window.mouse.down();
      
      // Move to bottom half of Test 3 (to drop after it)
      await window.mouse.move(test3Box.x + test3Box.width / 2, test3Box.y + test3Box.height - 5, { steps: 10 });
      await window.waitForTimeout(200); // Wait for drop indicator
      
      // Drop
      await window.mouse.up();
      await window.waitForTimeout(300); // Wait for state update
    }

    // Verify new order by checking positions
    // After dragging Test 1 after Test 3, order should be: Test 2, Test 3, Test 1
    const allTests = await window.locator('text=/🧪.*Test [123]/').all();
    const texts = await Promise.all(allTests.map(async (el) => {
      const text = await el.textContent();
      return text?.match(/Test \d/)?.[0] || '';
    }));
    
    // The order should now be Test 2, Test 3, Test 1
    expect(texts).toContain('Test 2');
    expect(texts).toContain('Test 3');
    expect(texts).toContain('Test 1');
    
    // Verify Test 1 is now after Test 3
    const test2Index = texts.indexOf('Test 2');
    const test3Index = texts.indexOf('Test 3');
    const test1Index = texts.indexOf('Test 1');
    
    expect(test2Index).toBeLessThan(test3Index);
    expect(test3Index).toBeLessThan(test1Index);
  });

  test('should reorder steps within a test', async () => {
    // Add a test
    await window.click('button:has-text("Add Test")');
    await window.fill('input[placeholder="Enter test name"]', 'My Test');
    await window.click('button:has-text("Add"):not([disabled])');
    
    // Wait for test to appear and click it
    const testNode = window.locator('text=/🧪.*My Test/');
    await expect(testNode).toBeVisible();
    await testNode.click();
    
    // Add three steps
    for (let i = 1; i <= 3; i++) {
      await window.click('button:has-text("Add Step")');
      await window.fill('input[placeholder="Enter step name"]', `Step ${i}`);
      await window.click('button:has-text("Add"):not([disabled])');
      await window.waitForTimeout(100);
    }

    // Wait for all steps to be visible
    await expect(window.locator('text=/▸.*Step 1/')).toBeVisible();
    await expect(window.locator('text=/▸.*Step 2/')).toBeVisible();
    await expect(window.locator('text=/▸.*Step 3/')).toBeVisible();

    // Get the step elements
    const step1 = window.locator('text=/▸.*Step 1/').first();
    const step3 = window.locator('text=/▸.*Step 3/').first();

    // Drag Step 1 and drop it after Step 3
    const step1Box = await step1.boundingBox();
    const step3Box = await step3.boundingBox();
    
    if (step1Box && step3Box) {
      // Start drag from Step 1
      await window.mouse.move(step1Box.x + step1Box.width / 2, step1Box.y + step1Box.height / 2);
      await window.mouse.down();
      
      // Move to bottom half of Step 3 (to drop after it)
      await window.mouse.move(step3Box.x + step3Box.width / 2, step3Box.y + step3Box.height - 5, { steps: 10 });
      await window.waitForTimeout(200);
      
      // Drop
      await window.mouse.up();
      await window.waitForTimeout(300);
    }

    // Verify new order
    const allSteps = await window.locator('text=/▸.*Step [123]/').all();
    const texts = await Promise.all(allSteps.map(async (el) => {
      const text = await el.textContent();
      return text?.match(/Step \d/)?.[0] || '';
    }));
    
    // The order should now be Step 2, Step 3, Step 1
    const step2Index = texts.indexOf('Step 2');
    const step3Index = texts.indexOf('Step 3');
    const step1Index = texts.indexOf('Step 1');
    
    expect(step2Index).toBeLessThan(step3Index);
    expect(step3Index).toBeLessThan(step1Index);
  });
});
