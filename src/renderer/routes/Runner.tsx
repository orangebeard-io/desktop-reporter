import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/state/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { openTestSetFile, saveTestSetFile, newTestSet } from '@/lib/files';
import { Tree } from '@/components/Tree';
import { DetailsPane } from '@/components/DetailsPane';
import { RunStatus } from '@/components/RunStatus';
import { getRunCoordinator, resetCoordinator } from '@/lib/useRunCoordinator';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { mdiCogOutline } from '@mdi/js';
import { Icon } from '@/components/Icon';

export function Runner() {
  const navigate = useNavigate();
  const { testSet, filePath, setTestSet, loadConfig, execution, startRun, addSuite, config } = useStore();
  const [hideFinished, setHideFinished] = useState(false);
  const [showAddRootDialog, setShowAddRootDialog] = useState(false);
  const [rootSuiteName, setRootSuiteName] = useState('New Suite');
  const [leftWidth, setLeftWidth] = useState(33);
  const isDragging = useRef(false);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleOpen = async () => {
    try {
      const result = await openTestSetFile();
      if (result) {
        setTestSet(result.testSet, result.filePath);
      }
    } catch (error) {
      alert(`Failed to open test set: ${error}`);
    }
  };

  const handleNew = () => {
    const newSet = newTestSet();
    setTestSet(newSet, null);
  };

  const handleSave = async () => {
    if (!testSet) return;
    try {
      const savedPath = await saveTestSetFile(testSet, filePath || undefined);
      setTestSet(testSet, savedPath);
    } catch (error) {
      alert(`Failed to save test set: ${error}`);
    }
  };

  const handleSaveAs = async () => {
    if (!testSet) return;
    try {
      const savedPath = await saveTestSetFile(testSet);
      setTestSet(testSet, savedPath);
    } catch (error) {
      alert(`Failed to save test set: ${error}`);
    }
  };

  const handleStartRun = async () => {
    if (!testSet) return;
    try {
      // Validate required fields before starting a run
      const missing: string[] = [];
      if (!config?.baseUrl?.trim()) missing.push('Base URL');
      if (!config?.listenerToken?.trim()) missing.push('Listener Token');
      const meta = testSet.metadata;
      if (!meta.organization?.trim()) missing.push('Organization');
      if (!meta.project?.trim()) missing.push('Project');
      if (!meta.testSetName?.trim()) missing.push('Test Set Name');
      if (missing.length > 0) {
        alert(`Cannot start run. Please provide the following:\n- ${missing.join('\n- ')}`);
        return;
      }

      const coordinator = getRunCoordinator(testSet);
      const result = await coordinator.startRunIfNeeded();
      const runName = testSet.metadata.testSetName;
      startRun(result as string, runName);
    } catch (error) {
      alert(`Failed to start run: ${error}`);
    }
  };

  const handleFinishRun = async () => {
    if (!testSet) return;
    try {
      const coordinator = getRunCoordinator(testSet);
      await coordinator.finishRun();
      resetCoordinator();
    } catch (error) {
      alert(`Failed to finish run: ${error}`);
    }
  };

  const handleAddRootSuite = () => {
    setRootSuiteName('New Suite');
    setShowAddRootDialog(true);
  };

  const confirmAddRootSuite = () => {
    if (rootSuiteName.trim()) {
      addSuite([], rootSuiteName);
      setShowAddRootDialog(false);
    }
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const container = document.getElementById('content-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newWidth > 20 && newWidth < 80) {
      setLeftWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      {/* Add Root Suite Dialog */}
      {showAddRootDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-4 w-96">
            <h3 className="text-lg font-semibold mb-3">Add Root Suite</h3>
            <Input
              value={rootSuiteName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRootSuiteName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') confirmAddRootSuite();
                if (e.key === 'Escape') setShowAddRootDialog(false);
              }}
              autoFocus
              placeholder="Enter suite name"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" onClick={() => setShowAddRootDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmAddRootSuite} disabled={!rootSuiteName.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

    <div className="flex flex-col h-full">
      {/* Top toolbar */}
      <div className="bg-card border-b px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <Button size="sm" variant="outline" onClick={handleNew}>
          New
        </Button>
        <Button size="sm" variant="outline" onClick={handleOpen}>
          Open
        </Button>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={!testSet}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={handleSaveAs} disabled={!testSet}>
          Save As
        </Button>
        <Button size="sm" variant="outline" onClick={handleAddRootSuite} disabled={!testSet}>
          + Suite
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={handleStartRun}
          disabled={!testSet || !!execution.runId}
          className="flex items-center gap-2 dark:bg-orangebeard-dark-green dark:hover:bg-orangebeard-dark-green/90"
        >
          {execution.runId && <Loader2 className="h-4 w-4 animate-spin" />}
          Start Run
        </Button>
        <Button size="sm" variant="destructive" onClick={handleFinishRun} disabled={!execution.runId} className="dark:bg-orangebeard-dark-green dark:hover:bg-orangebeard-dark-green/90">
          Finish Run
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/settings')} className="flex items-center gap-1">
          <Icon path={mdiCogOutline} size={16} />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!testSet ? (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-orangebeard-orange">Get Started</h2>
            <p className="text-muted-foreground">Create a new test set or open an existing one</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleNew}>Create New Test Set</Button>
              <Button variant="outline" onClick={handleOpen}>
                Open Test Set
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {/* Test Set Info */}
            <div className="border-b px-4 py-2 bg-muted/30 flex-shrink-0">
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-xs">Organization</span>
                  <input
                    type="text"
                    value={testSet.metadata.organization}
                    onChange={(e) => {
                      const updated = { ...testSet };
                      updated.metadata.organization = e.target.value;
                      setTestSet(updated, filePath);
                    }}
                    className="bg-transparent border border-input rounded px-2 py-1 text-foreground"
                    placeholder="organization"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-xs">Project</span>
                  <input
                    type="text"
                    value={testSet.metadata.project}
                    onChange={(e) => {
                      const updated = { ...testSet };
                      updated.metadata.project = e.target.value;
                      setTestSet(updated, filePath);
                    }}
                    className="bg-transparent border border-input rounded px-2 py-1 text-foreground"
                    placeholder="project"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-xs">Test Set Name</span>
                  <input
                    type="text"
                    value={testSet.metadata.testSetName}
                    onChange={(e) => {
                      const updated = { ...testSet };
                      updated.metadata.testSetName = e.target.value;
                      setTestSet(updated, filePath);
                    }}
                    className="bg-transparent border border-input rounded px-2 py-1 text-foreground"
                    placeholder="test set name"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-xs">Description</span>
                  <input
                    type="text"
                    value={testSet.metadata.description || ''}
                    onChange={(e) => {
                      const updated = { ...testSet };
                      updated.metadata.description = e.target.value;
                      setTestSet(updated, filePath);
                    }}
                    className="bg-transparent border border-input rounded px-2 py-1 text-foreground"
                    placeholder="description (optional)"
                  />
                </div>
              </div>
            </div>
            {/* Content */}
            <div id="content-container" className="flex flex-1 min-h-0">
              {/* Left: Tree */}
              <div style={{ width: `${leftWidth}%` }} className="border-r p-3 overflow-auto flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Test Set</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <Checkbox
                      id="hide-finished"
                      checked={hideFinished}
                      onCheckedChange={(checked: boolean) => setHideFinished(checked === true)}
                    />
                    <label htmlFor="hide-finished" className="cursor-pointer">
                      Hide finished
                    </label>
                  </div>
                </div>
                <Tree hideFinished={hideFinished} />
              </div>
              {/* Resize Handle */}
              <div
                onMouseDown={handleMouseDown}
                className="w-1 cursor-col-resize bg-border hover:bg-primary transition-colors flex-shrink-0"
              />
              {/* Right: Details */}
              <div className="flex-1 overflow-auto min-w-0">
                <DetailsPane />
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Bottom status */}
      <div className="border-t px-4 py-2 bg-card flex-shrink-0">
        <RunStatus />
      </div>
    </div>
    </>
  );
}
