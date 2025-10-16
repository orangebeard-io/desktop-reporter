import type { StateCreator } from 'zustand';
import type { OBTestSet, OBSuite, OBTest, OBStep, SelectionPath } from '../../domain/models';
import { generateSuiteId, generateTestId, generateStepId } from '@/lib/id';

export interface TestSetSlice {
  testSet: OBTestSet | null;
  filePath: string | null;
  selection: SelectionPath | null;
  
  setTestSet: (testSet: OBTestSet, filePath: string | null) => void;
  updateTestSet: (testSet: OBTestSet) => void;
  updateMetadata: (updates: Partial<OBTestSet['metadata']>) => void;
  clearTestSet: () => void;
  
  setSelection: (selection: SelectionPath | null) => void;
  
  // Structure editing
  addSuite: (parentSuiteIds: string[], name: string) => void;
  addTest: (suiteIds: string[], name: string) => void;
  addStep: (suiteIds: string[], testId: string, parentStepPath: string[], name: string) => void;
  
  renameItem: (path: SelectionPath, newName: string) => void;
  deleteItem: (path: SelectionPath) => void;
  
  // Move operations for drag and drop
  moveTest: (fromSuiteIds: string[], testId: string, toSuiteIds: string[], position: number) => void;
  moveStep: (suiteIds: string[], testId: string, fromStepPath: string[], toTestId: string, toParentStepPath: string[], position: number) => void;
  reorderTest: (suiteIds: string[], testId: string, newPosition: number) => void;
  reorderStep: (suiteIds: string[], testId: string, stepPath: string[], parentStepPath: string[], newPosition: number) => void;
  
  updateTestNotes: (suiteIds: string[], testId: string, notes: string) => void;
  updateStepNotes: (suiteIds: string[], testId: string, stepPath: string[], notes: string) => void;
}

export const createTestSetSlice: StateCreator<TestSetSlice> = (set, get) => ({
  testSet: null,
  filePath: null,
  selection: null,

  setTestSet: (testSet, filePath) => {
    set({ testSet, filePath });
  },

  updateTestSet: (testSet) => {
    set({ testSet });
  },

  updateMetadata: (updates) => {
    const { testSet } = get();
    if (!testSet) return;
    set({ 
      testSet: { 
        ...testSet, 
        metadata: { ...testSet.metadata, ...updates } 
      } 
    });
  },

  clearTestSet: () => {
    set({ testSet: null, filePath: null, selection: null });
  },

  setSelection: (selection) => {
    set({ selection });
  },

  addSuite: (parentSuiteIds, name) => {
    const { testSet } = get();
    if (!testSet) return;

    const newSuite: OBSuite = {
      id: generateSuiteId(),
      name,
      suites: [],
      tests: [],
    };

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    if (parentSuiteIds.length === 0) {
      updated.structure.suites.push(newSuite);
    } else {
      // Find parent suite and add
      const parent = findSuiteByPath(updated.structure.suites, parentSuiteIds);
      if (parent) {
        parent.suites = [...(parent.suites || []), newSuite];
      }
    }

    set({ testSet: updated });
  },

  addTest: (suiteIds, name) => {
    const { testSet } = get();
    if (!testSet) return;

    const newTest: OBTest = {
      id: generateTestId(),
      name,
      steps: [],
      notes: '',
    };

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    const suite = findSuiteByPath(updated.structure.suites, suiteIds);
    if (suite) {
      suite.tests = [...(suite.tests || []), newTest];
    }

    set({ testSet: updated });
  },

  addStep: (suiteIds, testId, parentStepPath, name) => {
    const { testSet } = get();
    if (!testSet) return;

    const newStep: OBStep = {
      id: generateStepId(),
      name,
      steps: [],
      notes: '',
    };

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    const suite = findSuiteByPath(updated.structure.suites, suiteIds);
    if (suite) {
      const test = suite.tests?.find((t) => t.id === testId);
      if (test) {
        if (parentStepPath.length === 0) {
          test.steps = [...(test.steps || []), newStep];
        } else {
          const parentStep = findStepByPath(test.steps || [], parentStepPath);
          if (parentStep) {
            parentStep.steps = [...(parentStep.steps || []), newStep];
          }
        }
      }
    }

    set({ testSet: updated });
  },

  renameItem: (path, newName) => {
    const { testSet } = get();
    if (!testSet) return;

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    
    if (path.testId) {
      const suite = findSuiteByPath(updated.structure.suites, path.suiteIds);
      if (suite) {
        const test = suite.tests?.find((t) => t.id === path.testId);
        if (test) {
          if (path.stepPath && path.stepPath.length > 0) {
            const step = findStepByPath(test.steps || [], path.stepPath);
            if (step) step.name = newName;
          } else {
            test.name = newName;
          }
        }
      }
    } else {
      const suite = findSuiteByPath(updated.structure.suites, path.suiteIds);
      if (suite) suite.name = newName;
    }

    set({ testSet: updated });
  },

  deleteItem: (path) => {
    const { testSet } = get();
    if (!testSet) return;

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    
    if (path.testId) {
      // Deleting a test or step
      const suite = findSuiteByPath(updated.structure.suites, path.suiteIds);
      if (suite) {
        if (path.stepPath && path.stepPath.length > 0) {
          // Delete step
          const test = suite.tests?.find((t) => t.id === path.testId);
          if (test && test.steps) {
            if (path.stepPath.length === 1) {
              // Delete top-level step
              test.steps = test.steps.filter((s) => s.id !== path.stepPath![0]);
            } else {
              // Delete nested step
              const parentStepPath = path.stepPath.slice(0, -1);
              const parentStep = findStepByPath(test.steps, parentStepPath);
              if (parentStep && parentStep.steps) {
                parentStep.steps = parentStep.steps.filter((s) => s.id !== path.stepPath![path.stepPath!.length - 1]);
              }
            }
          }
        } else {
          // Delete test
          suite.tests = suite.tests?.filter((t) => t.id !== path.testId) || [];
        }
      }
    } else {
      // Deleting a suite
      if (path.suiteIds.length === 1) {
        // Delete top-level suite
        updated.structure.suites = updated.structure.suites.filter((s) => s.id !== path.suiteIds[0]);
      } else {
        // Delete nested suite
        const parentSuiteIds = path.suiteIds.slice(0, -1);
        const parentSuite = findSuiteByPath(updated.structure.suites, parentSuiteIds);
        if (parentSuite && parentSuite.suites) {
          parentSuite.suites = parentSuite.suites.filter((s) => s.id !== path.suiteIds[path.suiteIds.length - 1]);
        }
      }
    }
    
    set({ testSet: updated, selection: null });
  },

  updateTestNotes: (suiteIds, testId, notes) => {
    const { testSet } = get();
    if (!testSet) return;

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    const suite = findSuiteByPath(updated.structure.suites, suiteIds);
    if (suite) {
      const test = suite.tests?.find((t) => t.id === testId);
      if (test) test.notes = notes;
    }

    set({ testSet: updated });
  },

  updateStepNotes: (suiteIds, testId, stepPath, notes) => {
    const { testSet } = get();
    if (!testSet) return;

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    const suite = findSuiteByPath(updated.structure.suites, suiteIds);
    if (suite) {
      const test = suite.tests?.find((t) => t.id === testId);
      if (test) {
        const step = findStepByPath(test.steps || [], stepPath);
        if (step) step.notes = notes;
      }
    }

    set({ testSet: updated });
  },

  moveTest: (fromSuiteIds, testId, toSuiteIds, position) => {
    const { testSet } = get();
    if (!testSet) return;

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    
    // Find and remove test from source suite
    const fromSuite = findSuiteByPath(updated.structure.suites, fromSuiteIds);
    if (!fromSuite || !fromSuite.tests) return;
    
    const testIndex = fromSuite.tests.findIndex((t) => t.id === testId);
    if (testIndex === -1) return;
    
    const [test] = fromSuite.tests.splice(testIndex, 1);
    
    // Add test to target suite at position
    const toSuite = findSuiteByPath(updated.structure.suites, toSuiteIds);
    if (!toSuite) return;
    
    if (!toSuite.tests) toSuite.tests = [];
    toSuite.tests.splice(position, 0, test);
    
    set({ testSet: updated });
  },

  moveStep: (suiteIds, testId, fromStepPath, toTestId, toParentStepPath, position) => {
    const { testSet } = get();
    if (!testSet) return;

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    const suite = findSuiteByPath(updated.structure.suites, suiteIds);
    if (!suite) return;
    
    // Find and remove step from source
    const fromTest = suite.tests?.find((t) => t.id === testId);
    if (!fromTest || !fromTest.steps) return;
    
    let step: OBStep | null = null;
    if (fromStepPath.length === 1) {
      const stepIndex = fromTest.steps.findIndex((s) => s.id === fromStepPath[0]);
      if (stepIndex === -1) return;
      [step] = fromTest.steps.splice(stepIndex, 1);
    } else {
      const parentStepPath = fromStepPath.slice(0, -1);
      const parentStep = findStepByPath(fromTest.steps, parentStepPath);
      if (!parentStep || !parentStep.steps) return;
      const stepIndex = parentStep.steps.findIndex((s) => s.id === fromStepPath[fromStepPath.length - 1]);
      if (stepIndex === -1) return;
      [step] = parentStep.steps.splice(stepIndex, 1);
    }
    
    if (!step) return;
    
    // Add step to target
    const toTest = suite.tests?.find((t) => t.id === toTestId);
    if (!toTest) return;
    
    if (toParentStepPath.length === 0) {
      if (!toTest.steps) toTest.steps = [];
      toTest.steps.splice(position, 0, step);
    } else {
      const toParentStep = findStepByPath(toTest.steps || [], toParentStepPath);
      if (!toParentStep) return;
      if (!toParentStep.steps) toParentStep.steps = [];
      toParentStep.steps.splice(position, 0, step);
    }
    
    set({ testSet: updated });
  },

  reorderTest: (suiteIds, testId, newPosition) => {
    const { testSet } = get();
    if (!testSet) return;

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    const suite = findSuiteByPath(updated.structure.suites, suiteIds);
    if (!suite || !suite.tests) return;
    
    const currentIndex = suite.tests.findIndex((t) => t.id === testId);
    if (currentIndex === -1 || currentIndex === newPosition) return;
    
    const [test] = suite.tests.splice(currentIndex, 1);
    suite.tests.splice(newPosition, 0, test);
    
    set({ testSet: updated });
  },

  reorderStep: (suiteIds, testId, stepPath, parentStepPath, newPosition) => {
    const { testSet } = get();
    if (!testSet) return;

    const updated = JSON.parse(JSON.stringify(testSet)) as OBTestSet;
    const suite = findSuiteByPath(updated.structure.suites, suiteIds);
    if (!suite) return;
    
    const test = suite.tests?.find((t) => t.id === testId);
    if (!test) return;
    
    // Get the parent array that contains this step
    let stepsArray: OBStep[];
    if (parentStepPath.length === 0) {
      if (!test.steps) return;
      stepsArray = test.steps;
    } else {
      const parentStep = findStepByPath(test.steps || [], parentStepPath);
      if (!parentStep || !parentStep.steps) return;
      stepsArray = parentStep.steps;
    }
    
    const stepId = stepPath[stepPath.length - 1];
    const currentIndex = stepsArray.findIndex((s) => s.id === stepId);
    if (currentIndex === -1 || currentIndex === newPosition) return;
    
    const [step] = stepsArray.splice(currentIndex, 1);
    stepsArray.splice(newPosition, 0, step);
    
    set({ testSet: updated });
  },
});

// Helper functions
function findSuiteByPath(suites: OBSuite[], path: string[]): OBSuite | null {
  if (path.length === 0) return null;
  
  let current = suites.find((s) => s.id === path[0]);
  if (!current) return null;
  
  for (let i = 1; i < path.length; i++) {
    current = current.suites?.find((s) => s.id === path[i]);
    if (!current) return null;
  }
  
  return current;
}

function findStepByPath(steps: OBStep[], path: string[]): OBStep | null {
  if (path.length === 0) return null;
  
  let current = steps.find((s) => s.id === path[0]);
  if (!current) return null;
  
  for (let i = 1; i < path.length; i++) {
    current = current.steps?.find((s) => s.id === path[i]);
    if (!current) return null;
  }
  
  return current;
}
