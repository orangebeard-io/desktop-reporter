import { useMemo, useState } from 'react';
import { useStore } from '@/state/store';
import type { OBSuite, OBTest, OBStep, SelectionPath, ExecutionState } from '../../domain/models';
import { Loader2 } from 'lucide-react';

interface TreeProps {
  hideFinished?: boolean;
}

export function Tree({ hideFinished = false }: TreeProps) {
  const { testSet, selection, setSelection, execution } = useStore();

  const suites = useMemo(() => testSet?.structure.suites ?? [], [testSet]);

  if (!testSet) return null;

  return (
    <div className="text-sm">
      {suites.map((suite) => (
        <SuiteNode
          key={suite.id}
          suite={suite}
          path={[suite.id]}
          selection={selection}
          onSelect={setSelection}
          execution={execution}
          hideFinished={hideFinished}
        />
      ))}
    </div>
  );
}

function SuiteNode({
  suite,
  path,
  selection,
  onSelect,
  execution,
  hideFinished,
}: {
  suite: OBSuite;
  path: string[];
  selection: SelectionPath | null;
  onSelect: (sel: SelectionPath | null) => void;
  execution: ExecutionState;
  hideFinished: boolean;
}) {
  const { moveTest } = useStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const isSelected = selection && !selection.testId && eqArrays(selection.suiteIds, path);

  const visibleTests = (suite.tests ?? []).filter((t) => {
    if (!hideFinished) return true;
    const testState = execution.tests[t.id];
    return !testState?.status; // Hide if test has a status (finished)
  });

  const visibleSuites = suite.suites ?? [];

  // Don't render suite if all children are hidden
  if (hideFinished && visibleTests.length === 0 && visibleSuites.length === 0) {
    return null;
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.types.includes('application/json');
    if (data) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (dragData.type === 'test') {
        // Move test to end of this suite's test list
        const position = suite.tests?.length || 0;
        moveTest(dragData.suiteIds, dragData.testId, path, position);
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  return (
    <div className="pl-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`px-2 py-1 rounded cursor-pointer hover:bg-accent ${isSelected ? 'bg-accent' : ''} ${isDragOver ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
        onClick={() => onSelect({ suiteIds: path })}
      >
        📁 {suite.name}
      </div>
      <div className="pl-4">
        {visibleTests.map((t, idx) => (
          <TestNode key={t.id} test={t} testIndex={idx} path={path} selection={selection} onSelect={onSelect} execution={execution} />)
        )}
        {visibleSuites.map((s) => (
          <SuiteNode
            key={s.id}
            suite={s}
            path={[...path, s.id]}
            selection={selection}
            onSelect={onSelect}
            execution={execution}
            hideFinished={hideFinished}
          />
        ))}
      </div>
    </div>
  );
}

function TestNode({
  test,
  path,
  testIndex,
  selection,
  onSelect,
  execution,
}: {
  test: OBTest;
  path: string[];
  testIndex: number;
  selection: SelectionPath | null;
  onSelect: (sel: SelectionPath | null) => void;
  execution: ExecutionState;
}) {
  const { reorderTest } = useStore();
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'none'>('none');
  const isSelected = selection && selection.testId === test.id && (!selection.stepPath || selection.stepPath.length === 0);
  const testState = execution.tests[test.id];
  const isInProgress = testState?.reported && !testState?.status;
  const status = testState?.status;

  let icon = '🧪';
  let iconClass = '';
  if (status === 'PASSED') {
    icon = '✅';
  } else if (status === 'FAILED') {
    icon = '❌';
  } else if (status === 'SKIPPED') {
    icon = '🧪';
    iconClass = 'opacity-50';
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'test',
      testId: test.id,
      suiteIds: path,
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.types.includes('application/json');
    if (data) {
      e.dataTransfer.dropEffect = 'move';
      
      // Determine if drop is in top or bottom half
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = e.clientY < midpoint ? 'before' : 'after';
      
      setDropPosition(position);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropPosition('none');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDropPosition = dropPosition;
    setDropPosition('none');

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (dragData.type === 'test') {
        // Check if it's a reorder (same suite) or move (different suite)
        const sameSuite = JSON.stringify(dragData.suiteIds) === JSON.stringify(path);
        
        if (sameSuite && dragData.testId !== test.id) {
          // Reorder within same suite
          const newPosition = currentDropPosition === 'before' ? testIndex : testIndex + 1;
          reorderTest(path, dragData.testId, newPosition);
        } else if (!sameSuite) {
          // Move to different suite
          const { moveTest } = useStore.getState();
          const newPosition = currentDropPosition === 'before' ? testIndex : testIndex + 1;
          moveTest(dragData.suiteIds, dragData.testId, path, newPosition);
        }
      } else if (dragData.type === 'step') {
        // Move step to be a top-level step of this test (at the end)
        const { moveStep } = useStore.getState();
        const position = test.steps?.length || 0;
        moveStep(dragData.suiteIds, dragData.testId, dragData.stepPath, test.id, [], position);
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  return (
    <div className="pl-2 relative">
      {dropPosition === 'before' && (
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 z-10" />
      )}
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`px-2 py-1 rounded cursor-grab active:cursor-grabbing hover:bg-accent ${isSelected ? 'bg-accent' : ''} ${iconClass} flex items-center gap-2`}
        onClick={() => onSelect({ suiteIds: path, testId: test.id })}
      >
        {icon} {test.name}
        {isInProgress && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
      </div>
      {dropPosition === 'after' && (
        <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500 z-10" />
      )}
      <div className="pl-4">
        {(test.steps ?? []).map((s, idx) => (
          <StepNode 
            key={s.id} 
            step={s} 
            path={path} 
            testId={test.id} 
            stepIndex={idx}
            selection={selection} 
            onSelect={onSelect} 
            execution={execution} 
          />
        ))}
      </div>
    </div>
  );
}

function StepNode({
  step,
  path,
  testId,
  stepIndex,
  selection,
  onSelect,
  execution,
  parentStepPath = [],
}: {
  step: OBStep;
  path: string[];
  testId: string;
  stepIndex: number;
  selection: SelectionPath | null;
  onSelect: (sel: SelectionPath | null) => void;
  execution: ExecutionState;
  parentStepPath?: string[];
}) {
  const { moveStep, reorderStep } = useStore();
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'none'>('none');
  const stepPath = [...parentStepPath, step.id];
  const isSelected =
    selection && selection.testId === testId && selection.stepPath && eqArrays(selection.stepPath, stepPath);

  const stepKey = `${testId}:${stepPath.join('.')}`;
  const stepState = execution.steps[stepKey];
  const status = stepState?.status;

  let icon = '▸';
  let iconClass = '';
  if (status === 'PASSED') {
    icon = '✅';
  } else if (status === 'FAILED') {
    icon = '❌';
  } else if (status === 'SKIPPED') {
    icon = '▸';
    iconClass = 'opacity-50';
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'step',
      testId,
      stepPath,
      suiteIds: path,
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Check if we have valid drag data
      const dataTypes = Array.from(e.dataTransfer.types);
      if (!dataTypes.includes('application/json')) return;
      
      e.dataTransfer.dropEffect = 'move';
      
      // Determine if drop is in top or bottom half
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = e.clientY < midpoint ? 'before' : 'after';
      
      setDropPosition(position);
    } catch (error) {
      // Ignore errors during drag over
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropPosition('none');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDropPosition = dropPosition;
    setDropPosition('none');

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (dragData.type === 'step') {
        // Prevent dropping on itself
        if (dragData.testId === testId && 
            dragData.stepPath.length > 0 &&
            JSON.stringify(dragData.stepPath) === JSON.stringify(stepPath)) {
          return; // Can't drop on itself
        }
        
        // Check if it's a reorder (same parent) or move (different parent)
        const sameParent = dragData.testId === testId && 
                          JSON.stringify(dragData.stepPath.slice(0, -1)) === JSON.stringify(parentStepPath);
        
        if (sameParent) {
          // Reorder within same parent
          const newPosition = currentDropPosition === 'before' ? stepIndex : stepIndex + 1;
          reorderStep(path, testId, dragData.stepPath, parentStepPath, newPosition);
        } else {
          // Move to different parent or nest as child
          // Default behavior: make it a child of this step
          const position = step.steps?.length || 0;
          moveStep(dragData.suiteIds, dragData.testId, dragData.stepPath, testId, stepPath, position);
        }
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  return (
    <div className="pl-2 relative">
      {dropPosition === 'before' && (
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 z-10" />
      )}
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`px-2 py-1 rounded cursor-grab active:cursor-grabbing hover:bg-accent ${isSelected ? 'bg-accent' : ''} ${iconClass}`}
        onClick={() => onSelect({ suiteIds: path, testId, stepPath })}
      >
        {icon} {step.name}
      </div>
      {dropPosition === 'after' && (
        <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500 z-10" />
      )}
      <div className="pl-4">
        {(step.steps ?? []).map((s, idx) => (
          <StepNode
            key={s.id}
            step={s}
            path={path}
            testId={testId}
            stepIndex={idx}
            selection={selection}
            onSelect={onSelect}
            execution={execution}
            parentStepPath={stepPath}
          />
        ))}
      </div>
    </div>
  );
}

function eqArrays(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}