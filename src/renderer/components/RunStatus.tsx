import { useMemo } from 'react';
import { useStore } from '@/state/store';
import type { OBSuite } from '../../domain/models';

export function RunStatus() {
  const { testSet, execution } = useStore();

  const { totalTests, done, passed, failed, skipped } = useMemo(() => {
    const total = countTests(testSet?.structure.suites ?? []);
    const tests = execution.tests;
    let done = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    for (const t of Object.values(tests)) {
      if (t.status) {
        done += 1;
        if (t.status === 'PASSED') passed += 1;
        else if (t.status === 'FAILED') failed += 1;
        else if (t.status === 'SKIPPED') skipped += 1;
      }
    }
    return { totalTests: total, done, passed, failed, skipped };
  }, [testSet, execution.tests]);

  return (
    <div className="text-xs text-muted-foreground flex gap-4">
      <span>Total: {totalTests}</span>
      <span>Done: {done}</span>
      <span className="text-green-600">Passed: {passed}</span>
      <span className="text-red-600">Failed: {failed}</span>
      <span className="text-yellow-600">Skipped: {skipped}</span>
    </div>
  );
}

function countTests(suites: OBSuite[]): number {
  let count = 0;
  for (const s of suites) {
    count += s.tests?.length ?? 0;
    count += countTests(s.suites ?? []);
  }
  return count;
}