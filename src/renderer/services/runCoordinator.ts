import type { OBClientAdapter } from './orangebeardClient';
import type { TestStatus, OBTestSet, OBSuite, OBTest, OBStep } from '../../domain/models';
import type { AppStore } from '../state/store';

// UUID is just a string from the renderer's perspective
type UUID = string;

/**
 * RunCoordinator handles the orchestration of test execution reporting
 * following the lazy run creation pattern and sequencing rules.
 */
export class RunCoordinator {
  private runId: UUID | null = null;
  private reportedTests = new Set<string>();
  private reportedSteps = new Set<string>();
  private testUUIDs = new Map<string, UUID>();
  private suiteUUIDs = new Map<string, UUID>();
  private stepUUIDs = new Map<string, UUID>();

  constructor(
    private client: OBClientAdapter,
    private getStore: () => AppStore,
    private testSet: OBTestSet
  ) {}

  /**
   * Start run if needed when first item receives status
   */
  async startRunIfNeeded(): Promise<UUID> {
    if (this.runId) return this.runId;

    const runName = this.testSet.metadata.testSetName;
    const description = this.testSet.metadata.description;
    const result = await this.client.startRun(runName, description);

    this.runId = result.runId;
    this.getStore().startRun(result.runId as string, runName);

    return result.runId;
  }

  /**
   * Get or create suite UUID for a suite path
   */
  private async ensureSuiteUUID(runId: UUID, suitePath: string[]): Promise<UUID> {
    const suiteKey = suitePath.join('/');
    if (this.suiteUUIDs.has(suiteKey)) {
      return this.suiteUUIDs.get(suiteKey)!;
    }

    const suiteNames = this.resolveSuiteNames(suitePath);
    const suiteUUID = await this.client.ensureSuitePath(runId, suiteNames);
    this.suiteUUIDs.set(suiteKey, suiteUUID);
    return suiteUUID;
  }

  /**
   * Resolve suite IDs to suite names
   */
  private resolveSuiteNames(suiteIds: string[]): string[] {
    const names: string[] = [];
    let suites = this.testSet.structure.suites;

    for (const id of suiteIds) {
      const suite = suites.find((s) => s.id === id);
      if (!suite) break;
      names.push(suite.name);
      suites = suite.suites || [];
    }

    return names;
  }

  /**
   * Mark test status - ensures suite path and test are started
   */
  async markTestStatus(
    suiteIds: string[],
    testId: string,
    testName: string,
    status: TestStatus,
    notes?: string
  ): Promise<void> {
    const runId = await this.startRunIfNeeded();

    // Ensure suite path exists
    const suiteUUID = await this.ensureSuiteUUID(runId, suiteIds);

    // Start test if not already started
    if (!this.reportedTests.has(testId)) {
      const testUUID = await this.client.startTest(runId, suiteUUID, testName);
      this.testUUIDs.set(testId, testUUID);
      this.reportedTests.add(testId);
      this.getStore().markTestReported(testId, testUUID as string);
    }

    const testUUID = this.testUUIDs.get(testId)!;

    // Mark all unmarked steps as skipped
    await this.skipUnmarkedSteps(runId, testUUID, testId, suiteIds);

    // Log notes if provided
    if (notes) {
      const logLevel = status === 'FAILED' ? 'ERROR' : 'INFO';
      await this.client.logToTest(runId, testUUID, notes, logLevel);
    }

    // Log current execution remarks if provided
    const remarks = this.getStore().execution.tests[testId]?.remarks;
    if (remarks && remarks.trim()) {
      const logLevel = status === 'FAILED' ? 'ERROR' : 'INFO';
      await this.client.logToTest(runId, testUUID, remarks, logLevel);
    }

    // Update status
    this.getStore().setTestStatus(testId, status, testUUID as string);

    // Finish test
    await this.client.finishTest(runId, testUUID, status);
  }

  /**
   * Attach file to test - creates log if needed
   */
  async attachToTest(
    suiteIds: string[],
    testId: string,
    testName: string,
    fileName: string,
    content: ArrayBuffer,
    contentType: string
  ): Promise<void> {
    const runId = await this.startRunIfNeeded();

    // Ensure suite path exists
    const suiteUUID = await this.ensureSuiteUUID(runId, suiteIds);

    // Start test if not already started
    if (!this.reportedTests.has(testId)) {
      const testUUID = await this.client.startTest(runId, suiteUUID, testName);
      this.testUUIDs.set(testId, testUUID);
      this.reportedTests.add(testId);
      this.getStore().markTestReported(testId, testUUID as string);
    }

    const testUUID = this.testUUIDs.get(testId)!;

    // Create log for attachment (do not include notes/remarks to avoid duplication)
    const logUUID = await this.client.logToTest(runId, testUUID, fileName, 'INFO');

    // Send attachment
    await this.client.sendAttachment(runId, testUUID, logUUID, undefined, fileName, content, contentType);
  }

  /**
   * Mark step status - ensures test is started first and handles nested steps
   */
  async markStepStatus(
    suiteIds: string[],
    testId: string,
    testName: string,
    stepPath: string[],
    stepName: string,
    status: TestStatus,
    notes?: string
  ): Promise<void> {
    const runId = await this.startRunIfNeeded();

    // Ensure suite path exists
    const suiteUUID = await this.ensureSuiteUUID(runId, suiteIds);

    // Start test if not already started
    if (!this.reportedTests.has(testId)) {
      const testUUID = await this.client.startTest(runId, suiteUUID, testName);
      this.testUUIDs.set(testId, testUUID);
      this.reportedTests.add(testId);
      this.getStore().markTestReported(testId, testUUID as string);
    }

    const testUUID = this.testUUIDs.get(testId)!;
    const stepKey = `${testId}:${stepPath.join('.')}`;

    // Ensure parent steps are started
    let parentStepUUID: UUID | undefined = undefined;
    for (let i = 0; i < stepPath.length; i++) {
      const currentStepPath = stepPath.slice(0, i + 1);
      const currentStepKey = `${testId}:${currentStepPath.join('.')}`;

      if (!this.stepUUIDs.has(currentStepKey)) {
        const currentStepName = i === stepPath.length - 1 ? stepName : `Step ${currentStepPath[i]}`;
        const stepUUID = await this.client.startStep(runId, testUUID, parentStepUUID, currentStepName);
        this.stepUUIDs.set(currentStepKey, stepUUID);
        parentStepUUID = stepUUID;
      } else {
        parentStepUUID = this.stepUUIDs.get(currentStepKey);
      }
    }

    const stepUUID = this.stepUUIDs.get(stepKey)!;

    // Mark all unmarked child steps as skipped
    await this.skipUnmarkedChildSteps(runId, testUUID, testId, suiteIds, stepPath);

    // Log notes if provided
    if (notes) {
      const logLevel = status === 'FAILED' ? 'ERROR' : 'INFO';
      await this.client.logToStep(runId, testUUID, stepUUID, notes, logLevel);
    }

    // Log current execution remarks if provided
    const remarks = this.getStore().execution.steps[`${testId}:${stepPath.join('.')}`]?.remarks;
    if (remarks && remarks.trim()) {
      const logLevel = status === 'FAILED' ? 'ERROR' : 'INFO';
      await this.client.logToStep(runId, testUUID, stepUUID, remarks, logLevel);
    }

    // Finish step
    await this.client.finishStep(runId, stepUUID, status);

    this.reportedSteps.add(stepKey);
    this.getStore().setStepStatus(testId, stepPath, status);
    this.getStore().markStepReported(testId, stepPath);
  }

  /**
   * Attach file to step - creates log if needed
   */
  async attachToStep(
    suiteIds: string[],
    testId: string,
    testName: string,
    stepPath: string[],
    stepName: string,
    fileName: string,
    content: ArrayBuffer,
    contentType: string
  ): Promise<void> {
    const runId = await this.startRunIfNeeded();

    // Ensure suite path exists
    const suiteUUID = await this.ensureSuiteUUID(runId, suiteIds);

    // Start test if not already started
    if (!this.reportedTests.has(testId)) {
      const testUUID = await this.client.startTest(runId, suiteUUID, testName);
      this.testUUIDs.set(testId, testUUID);
      this.reportedTests.add(testId);
      this.getStore().markTestReported(testId, testUUID as string);
    }

    const testUUID = this.testUUIDs.get(testId)!;
    const stepKey = `${testId}:${stepPath.join('.')}`;

    // Ensure parent steps are started
    let parentStepUUID: UUID | undefined = undefined;
    for (let i = 0; i < stepPath.length; i++) {
      const currentStepPath = stepPath.slice(0, i + 1);
      const currentStepKey = `${testId}:${currentStepPath.join('.')}`;

      if (!this.stepUUIDs.has(currentStepKey)) {
        const currentStepName = i === stepPath.length - 1 ? stepName : `Step ${currentStepPath[i]}`;
        const stepUUID = await this.client.startStep(runId, testUUID, parentStepUUID, currentStepName);
        this.stepUUIDs.set(currentStepKey, stepUUID);
        parentStepUUID = stepUUID;
      } else {
        parentStepUUID = this.stepUUIDs.get(currentStepKey);
      }
    }

    const stepUUID = this.stepUUIDs.get(stepKey)!;

    // Create log for attachment (do not include notes/remarks to avoid duplication)
    const logUUID = await this.client.logToStep(runId, testUUID, stepUUID, fileName, 'INFO');

    // Send attachment
    await this.client.sendAttachment(runId, testUUID, logUUID, stepUUID, fileName, content, contentType);
  }

  /**
   * Finish the current run - marks unreported tests as SKIPPED
   */
  async finishRun(): Promise<void> {
    if (!this.runId) return;

    // Mark unreported tests as SKIPPED
    await this.markUnreportedTestsAsSkipped(this.runId, this.testSet.structure.suites);

    await this.client.finishRun(this.runId);
    this.getStore().finishRun();

    // Reset state
    this.runId = null;
    this.reportedTests.clear();
    this.reportedSteps.clear();
    this.testUUIDs.clear();
    this.suiteUUIDs.clear();
    this.stepUUIDs.clear();
  }

  private async markUnreportedTestsAsSkipped(runId: UUID, suites: OBSuite[], suiteIds: string[] = []): Promise<void> {
    for (const suite of suites) {
      const currentSuiteIds = [...suiteIds, suite.id];

      // Skip tests in this suite
      for (const test of suite.tests || []) {
        if (!this.reportedTests.has(test.id)) {
          try {
            await this.markTestStatus(currentSuiteIds, test.id, test.name, 'SKIPPED', 'Auto-skipped at run finish');
          } catch (error) {
            console.error('Failed to skip test:', error);
          }
        }
      }

      // Recurse into nested suites
      if (suite.suites) {
        await this.markUnreportedTestsAsSkipped(runId, suite.suites, currentSuiteIds);
      }
    }
  }

  /**
   * Skip all unmarked steps in a test
   */
  private async skipUnmarkedSteps(runId: UUID, testUUID: UUID, testId: string, suiteIds: string[]): Promise<void> {
    // Find the test in the test set structure
    const suite = this.findSuiteByPath(this.testSet.structure.suites, suiteIds);
    if (!suite) return;

    const test = suite.tests?.find((t: OBTest) => t.id === testId);
    if (!test || !test.steps) return;

    // Recursively skip unmarked steps
    await this.skipUnmarkedStepsRecursive(runId, testUUID, testId, test.steps, []);
  }

  /**
   * Skip all unmarked child steps of a given step
   */
  private async skipUnmarkedChildSteps(runId: UUID, testUUID: UUID, testId: string, suiteIds: string[], parentStepPath: string[]): Promise<void> {
    // Find the parent step in the test set structure
    const suite = this.findSuiteByPath(this.testSet.structure.suites, suiteIds);
    if (!suite) return;

    const test = suite.tests?.find((t: OBTest) => t.id === testId);
    if (!test || !test.steps) return;

    const parentStep = this.findStepByPath(test.steps, parentStepPath);
    if (!parentStep || !parentStep.steps) return;

    // Recursively skip unmarked child steps
    await this.skipUnmarkedStepsRecursive(runId, testUUID, testId, parentStep.steps, parentStepPath);
  }

  /**
   * Recursively skip unmarked steps
   */
  private async skipUnmarkedStepsRecursive(runId: UUID, testUUID: UUID, testId: string, steps: OBStep[], parentPath: string[]): Promise<void> {
    for (const step of steps) {
      const stepPath = [...parentPath, step.id];
      const stepKey = `${testId}:${stepPath.join('.')}`;

      if (!this.reportedSteps.has(stepKey)) {
        try {
          // Start and finish the step as skipped
          const parentStepUUID = parentPath.length > 0 ? this.stepUUIDs.get(`${testId}:${parentPath.join('.')}`) : undefined;
          const stepUUID = await this.client.startStep(runId, testUUID, parentStepUUID, step.name);
          this.stepUUIDs.set(stepKey, stepUUID);
          await this.client.finishStep(runId, stepUUID, 'SKIPPED');
          this.reportedSteps.add(stepKey);
          this.getStore().setStepStatus(testId, stepPath, 'SKIPPED');
          this.getStore().markStepReported(testId, stepPath);
        } catch (error) {
          console.error('Failed to skip step:', error);
        }
      }

      // Recurse into child steps
      if (step.steps && step.steps.length > 0) {
        await this.skipUnmarkedStepsRecursive(runId, testUUID, testId, step.steps, stepPath);
      }
    }
  }

  /**
   * Find suite by path
   */
  private findSuiteByPath(suites: OBSuite[], path: string[]): OBSuite | null {
    let current = suites;
    let suite = null;
    for (const id of path) {
      suite = current.find(s => s.id === id);
      if (!suite) return null;
      current = suite.suites || [];
    }
    return suite;
  }

  /**
   * Find step by path
   */
  private findStepByPath(steps: OBStep[], path: string[]): OBStep | null {
    let current = steps;
    let step = null;
    for (const id of path) {
      step = current.find(s => s.id === id);
      if (!step) return null;
      current = step.steps || [];
    }
    return step;
  }
}

export function createRunCoordinator(
  client: OBClientAdapter,
  getStore: () => AppStore,
  testSet: OBTestSet
): RunCoordinator {
  return new RunCoordinator(client, getStore, testSet);
}
