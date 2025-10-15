import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RunCoordinator } from '../../src/renderer/services/runCoordinator';
import type { OBClientAdapter } from '../../src/renderer/services/orangebeardClient';
import type { OBTestSet } from '../../src/domain/models';
import type { AppStore } from '../../src/renderer/state/store';

describe('RunCoordinator', () => {
  let mockClient: OBClientAdapter;
  let mockStore: Partial<AppStore>;
  let testSet: OBTestSet;

  beforeEach(() => {
    // Mock client
    mockClient = {
      startRun: vi.fn().mockResolvedValue({ runId: 'run-uuid-123' }),
      ensureSuitePath: vi.fn().mockResolvedValue('suite-uuid-456'),
      startTest: vi.fn().mockResolvedValue('test-uuid-789'),
      finishTest: vi.fn().mockResolvedValue(undefined),
      startStep: vi.fn().mockResolvedValue('step-uuid-abc'),
      finishStep: vi.fn().mockResolvedValue(undefined),
      logToTest: vi.fn().mockResolvedValue('log-uuid-xyz'),
      logToStep: vi.fn().mockResolvedValue('log-uuid-xyz'),
      sendAttachment: vi.fn().mockResolvedValue(undefined),
      finishRun: vi.fn().mockResolvedValue(undefined),
    } as unknown as OBClientAdapter;

    // Mock store
    mockStore = {
      startRun: vi.fn(),
      markTestReported: vi.fn(),
      setTestStatus: vi.fn(),
      setStepStatus: vi.fn(),
      markStepReported: vi.fn(),
      finishRun: vi.fn(),
    };

    // Sample test set
    testSet = {
      schemaVersion: '1.0.0',
      metadata: {
        organization: 'test-org',
        project: 'test-project',
        testSetName: 'Sample Test Set',
        description: 'A test set for unit testing',
      },
      structure: {
        suites: [
          {
            id: 'suite-1',
            name: 'Suite 1',
            tests: [
              {
                id: 'test-1',
                name: 'Test 1',
                steps: [
                  { id: 'step-1', name: 'Step 1' },
                  { id: 'step-2', name: 'Step 2' },
                ],
              },
              {
                id: 'test-2',
                name: 'Test 2',
              },
            ],
          },
        ],
      },
    };
  });

  it('should create run on first status', async () => {
    const coordinator = new RunCoordinator(mockClient, mockStore as AppStore, testSet);

    await coordinator.markTestStatus(['suite-1'], 'test-1', 'Test 1', 'PASSED');

    expect(mockClient.startRun).toHaveBeenCalledWith('Sample Test Set', 'A test set for unit testing');
    expect(mockStore.startRun).toHaveBeenCalledWith('run-uuid-123', 'Sample Test Set');
  });

  it('should only create run once', async () => {
    const coordinator = new RunCoordinator(mockClient, mockStore as AppStore, testSet);

    await coordinator.markTestStatus(['suite-1'], 'test-1', 'Test 1', 'PASSED');
    await coordinator.markTestStatus(['suite-1'], 'test-2', 'Test 2', 'FAILED');

    expect(mockClient.startRun).toHaveBeenCalledTimes(1);
  });

  it('should ensure suite path before starting test', async () => {
    const coordinator = new RunCoordinator(mockClient, mockStore as AppStore, testSet);

    await coordinator.markTestStatus(['suite-1'], 'test-1', 'Test 1', 'PASSED');

    expect(mockClient.ensureSuitePath).toHaveBeenCalledWith('run-uuid-123', ['Suite 1']);
    expect(mockClient.startTest).toHaveBeenCalledWith('run-uuid-123', 'suite-uuid-456', 'Test 1');
  });

  it('should start test before marking step', async () => {
    const coordinator = new RunCoordinator(mockClient, mockStore as AppStore, testSet);

    await coordinator.markStepStatus(['suite-1'], 'test-1', 'Test 1', ['step-1'], 'Step 1', 'PASSED');

    expect(mockClient.startTest).toHaveBeenCalledWith('run-uuid-123', 'suite-uuid-456', 'Test 1');
    expect(mockClient.startStep).toHaveBeenCalled();
  });

  it('should handle nested steps', async () => {
    const nestedTestSet: OBTestSet = {
      ...testSet,
      structure: {
        suites: [
          {
            id: 'suite-1',
            name: 'Suite 1',
            tests: [
              {
                id: 'test-1',
                name: 'Test 1',
                steps: [
                  {
                    id: 'step-1',
                    name: 'Step 1',
                    steps: [
                      { id: 'step-1-1', name: 'Nested Step 1.1' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const coordinator = new RunCoordinator(mockClient, mockStore as AppStore, nestedTestSet);

    await coordinator.markStepStatus(['suite-1'], 'test-1', 'Test 1', ['step-1', 'step-1-1'], 'Nested Step 1.1', 'PASSED');

    expect(mockClient.startStep).toHaveBeenCalledTimes(2);
  });

  it('should finish run and skip remaining tests', async () => {
    const coordinator = new RunCoordinator(mockClient, mockStore as AppStore, testSet);

    await coordinator.markTestStatus(['suite-1'], 'test-1', 'Test 1', 'PASSED');
    await coordinator.finishRun();

    // Should finish test-2 as SKIPPED since it wasn't reported
    expect(mockClient.startTest).toHaveBeenCalledWith('run-uuid-123', 'suite-uuid-456', 'Test 2');
    expect(mockClient.finishTest).toHaveBeenCalledWith('run-uuid-123', expect.any(String), 'SKIPPED');
    expect(mockClient.finishRun).toHaveBeenCalledWith('run-uuid-123');
  });

  it('should log notes when marking status', async () => {
    const coordinator = new RunCoordinator(mockClient, mockStore as AppStore, testSet);

    await coordinator.markTestStatus(['suite-1'], 'test-1', 'Test 1', 'FAILED', 'Test failed due to assertion error');

    expect(mockClient.logToTest).toHaveBeenCalledWith(
      'run-uuid-123',
      'test-uuid-789',
      'Test failed due to assertion error',
      'ERROR'
    );
  });

  it('should attach files to test', async () => {
    const coordinator = new RunCoordinator(mockClient, mockStore as AppStore, testSet);

    const fileContent = new ArrayBuffer(100);
    await coordinator.attachToTest(
      ['suite-1'],
      'test-1',
      'Test 1',
      'screenshot.png',
      fileContent,
      'image/png',
      'Screenshot of failure'
    );

    expect(mockClient.logToTest).toHaveBeenCalledWith(
      'run-uuid-123',
      'test-uuid-789',
      'Screenshot of failure',
      'INFO'
    );
    expect(mockClient.sendAttachment).toHaveBeenCalledWith(
      'run-uuid-123',
      'test-uuid-789',
      'log-uuid-xyz',
      undefined,
      'screenshot.png',
      fileContent,
      'image/png'
    );
  });
});
