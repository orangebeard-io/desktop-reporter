import type { StateCreator } from 'zustand';
import type { ExecutionState, TestStatus, AttachmentInfo } from '../../domain/models';

export interface RunSlice {
  execution: ExecutionState;
  
  startRun: (runId: string, runName: string) => void;
  finishRun: () => void;
  clearExecution: () => void;
  
  setTestStatus: (testId: string, status: TestStatus, testKey?: string) => void;
  setStepStatus: (testId: string, stepPath: string[], status: TestStatus) => void;
  
  addTestLog: (testId: string, log: string) => void;
  addStepLog: (testId: string, stepPath: string[], log: string) => void;
  
  addTestAttachment: (testId: string, attachment: AttachmentInfo) => void;
  addStepAttachment: (testId: string, stepPath: string[], attachment: AttachmentInfo) => void;
  
  markTestReported: (testId: string, testKey: string) => void;
  markStepReported: (testId: string, stepPath: string[]) => void;
  
  hasFailedSteps: (testId: string) => boolean;
}

const createEmptyExecution = (): ExecutionState => ({
  tests: {},
  steps: {},
});

const makeStepKey = (testId: string, stepPath: string[]): string => {
  return `${testId}:${stepPath.join('.')}`;
};

export const createRunSlice: StateCreator<RunSlice> = (set, get) => ({
  execution: createEmptyExecution(),

  startRun: (runId, runName) => {
    set({
      execution: {
        ...createEmptyExecution(),
        runId,
        runName,
        startedAt: Date.now(),
      },
    });
  },

  finishRun: () => {
    set((state) => ({
      execution: {
        ...state.execution,
        runId: undefined,
        runName: undefined,
      },
    }));
  },

  clearExecution: () => {
    set({ execution: createEmptyExecution() });
  },

  setTestStatus: (testId, status, testKey) => {
    set((state) => ({
      execution: {
        ...state.execution,
        tests: {
          ...state.execution.tests,
          [testId]: {
            ...(state.execution.tests[testId] || { logs: [], attachments: [], reported: false }),
            status,
            testKey: testKey || state.execution.tests[testId]?.testKey,
          },
        },
      },
    }));
  },

  setStepStatus: (testId, stepPath, status) => {
    const key = makeStepKey(testId, stepPath);
    set((state) => ({
      execution: {
        ...state.execution,
        steps: {
          ...state.execution.steps,
          [key]: {
            ...(state.execution.steps[key] || { logs: [], attachments: [], reported: false }),
            status,
          },
        },
      },
    }));
  },

  addTestLog: (testId, log) => {
    set((state) => {
      const test = state.execution.tests[testId] || { logs: [], attachments: [], reported: false };
      return {
        execution: {
          ...state.execution,
          tests: {
            ...state.execution.tests,
            [testId]: {
              ...test,
              logs: [...test.logs, log],
            },
          },
        },
      };
    });
  },

  addStepLog: (testId, stepPath, log) => {
    const key = makeStepKey(testId, stepPath);
    set((state) => {
      const step = state.execution.steps[key] || { logs: [], attachments: [], reported: false };
      return {
        execution: {
          ...state.execution,
          steps: {
            ...state.execution.steps,
            [key]: {
              ...step,
              logs: [...step.logs, log],
            },
          },
        },
      };
    });
  },

  addTestAttachment: (testId, attachment) => {
    set((state) => {
      const test = state.execution.tests[testId] || { logs: [], attachments: [], reported: false };
      return {
        execution: {
          ...state.execution,
          tests: {
            ...state.execution.tests,
            [testId]: {
              ...test,
              attachments: [...test.attachments, attachment],
            },
          },
        },
      };
    });
  },

  addStepAttachment: (testId, stepPath, attachment) => {
    const key = makeStepKey(testId, stepPath);
    set((state) => {
      const step = state.execution.steps[key] || { logs: [], attachments: [], reported: false };
      return {
        execution: {
          ...state.execution,
          steps: {
            ...state.execution.steps,
            [key]: {
              ...step,
              attachments: [...step.attachments, attachment],
            },
          },
        },
      };
    });
  },

  markTestReported: (testId, testKey) => {
    set((state) => ({
      execution: {
        ...state.execution,
        tests: {
          ...state.execution.tests,
          [testId]: {
            ...(state.execution.tests[testId] || { logs: [], attachments: [], reported: false }),
            reported: true,
            testKey,
          },
        },
      },
    }));
  },

  markStepReported: (testId, stepPath) => {
    const key = makeStepKey(testId, stepPath);
    set((state) => ({
      execution: {
        ...state.execution,
        steps: {
          ...state.execution.steps,
          [key]: {
            ...(state.execution.steps[key] || { logs: [], attachments: [], reported: false }),
            reported: true,
          },
        },
      },
    }));
  },
  
  hasFailedSteps: (testId) => {
    const steps = get().execution.steps;
    for (const [key, stepState] of Object.entries(steps)) {
      if (key.startsWith(`${testId}:`) && stepState.status === 'FAILED') {
        return true;
      }
    }
    return false;
  },
});
