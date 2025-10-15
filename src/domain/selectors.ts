import type { OBTestSet, OBSuite, OBTest, OBStep, ItemPath, TestId, SuiteId } from './models';

export function findSuiteByPath(testSet: OBTestSet | null, suiteIds: SuiteId[]): OBSuite | null {
  if (!testSet || suiteIds.length === 0) return null;

  let current: OBSuite[] = testSet.structure.suites;
  let suite: OBSuite | undefined;

  for (const id of suiteIds) {
    suite = current.find((s) => s.id === id);
    if (!suite) return null;
    current = suite.suites || [];
  }

  return suite || null;
}

export function findTestInSuite(suite: OBSuite | null, testId: TestId): OBTest | null {
  if (!suite || !suite.tests) return null;
  return suite.tests.find((t) => t.id === testId) || null;
}

export function findStepInTest(test: OBTest | null, stepPath: string[]): OBStep | null {
  if (!test || !stepPath.length) return null;

  let steps = test.steps || [];
  let step: OBStep | undefined;

  for (const stepId of stepPath) {
    step = steps.find((s) => s.id === stepId);
    if (!step) return null;
    steps = step.steps || [];
  }

  return step || null;
}

export function getItemByPath(testSet: OBTestSet | null, path: ItemPath): OBTest | OBStep | OBSuite | null {
  const suite = findSuiteByPath(testSet, path.suiteIds);

  if (path.type === 'suite') {
    return suite;
  }

  if (path.type === 'test' && path.testId) {
    return findTestInSuite(suite, path.testId);
  }

  if (path.type === 'step' && path.testId && path.stepPath) {
    const test = findTestInSuite(suite, path.testId);
    return findStepInTest(test, path.stepPath);
  }

  return null;
}

export function getSuitePathNames(testSet: OBTestSet | null, suiteIds: SuiteId[]): string[] {
  if (!testSet) return [];

  const names: string[] = [];
  let current: OBSuite[] = testSet.structure.suites;

  for (const id of suiteIds) {
    const suite = current.find((s) => s.id === id);
    if (!suite) break;
    names.push(suite.name);
    current = suite.suites || [];
  }

  return names;
}

export function getAllTests(testSet: OBTestSet | null): { path: ItemPath; test: OBTest }[] {
  if (!testSet) return [];

  const results: { path: ItemPath; test: OBTest }[] = [];

  function traverseSuites(suites: OBSuite[], suiteIds: SuiteId[]) {
    for (const suite of suites) {
      const currentPath = [...suiteIds, suite.id];

      if (suite.tests) {
        for (const test of suite.tests) {
          results.push({
            path: {
              type: 'test',
              suiteIds: currentPath,
              testId: test.id,
            },
            test,
          });
        }
      }

      if (suite.suites) {
        traverseSuites(suite.suites, currentPath);
      }
    }
  }

  traverseSuites(testSet.structure.suites, []);
  return results;
}

export function makeStepKey(testId: TestId, stepPath: string[]): string {
  return `${testId}:${stepPath.join(':')}`;
}
