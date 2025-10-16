import { useMemo, useState, useEffect, useRef } from 'react';
import { useStore } from '@/state/store';
import type { OBSuite, OBStep, SelectionPath } from '../../domain/models';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { TestStatus } from '../../domain/models';
import { getRunCoordinator } from '@/lib/useRunCoordinator';
import { mdiContentPaste, mdiFileImageOutline, mdiFileCheckOutline } from '@mdi/js';
import { Icon } from './Icon';

export function DetailsPane() {
  const { testSet, selection, renameItem, updateTestNotes, updateStepNotes, execution, addSuite, addTest, addStep, deleteItem, setTestRemarks, setStepRemarks } = useStore();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogType, setAddDialogType] = useState<'suite' | 'test' | 'step'>('suite');
  const [addDialogValue, setAddDialogValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<{ name: string; type: 'image' | 'file'; data?: ArrayBuffer }[]>([]);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const item = useMemo(() => {
    if (!testSet || !selection) return null;
    return resolveSelected(testSet.structure.suites, selection);
  }, [testSet, selection]);

  useEffect(() => {
    if (!item) {
      setName('');
      setNotes('');
      return;
    }
    setName(item.name ?? '');
    setNotes(item.notes ?? '');
  }, [item]);

  // Auto-save notes with debouncing
  useEffect(() => {
    if (!selection || !item) return;
    
    const timeoutId = setTimeout(() => {
      if (selection.testId && selection.stepPath && selection.stepPath.length > 0) {
        updateStepNotes(selection.suiteIds, selection.testId, selection.stepPath, notes);
      } else if (selection.testId) {
        updateTestNotes(selection.suiteIds, selection.testId, notes);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [notes, selection, item, updateStepNotes, updateTestNotes]);

  if (!testSet || !selection || !item) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Select a suite, test, or step to view details.</div>
    );
  }

  const handleSaveName = () => {
    if (!selection) return;
    renameItem(selection, name);
  };

  const handleDelete = () => {
    if (!selection) return;
    const itemType = item?.type || 'item';
    const confirmMsg = `Are you sure you want to delete this ${itemType}? All sub-items will also be deleted.`;
    if (confirm(confirmMsg)) {
      deleteItem(selection);
    }
  };

  const handleAttachFile = async () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 32 * 1024 * 1024) {
      alert('File size must be less than 32MB');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      await sendAttachment(file.name, arrayBuffer, file.type);
    } catch (error) {
      alert(`Failed to attach file: ${error}`);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasteImage = async () => {
    try {
      const imageData = await window.api.clipboard.readImage();
      if (!imageData) {
        alert('No image found in clipboard');
        return;
      }

      // imageData is a Uint8Array from IPC, convert to ArrayBuffer
      const arrayBuffer = imageData.buffer.slice(imageData.byteOffset, imageData.byteOffset + imageData.byteLength) as ArrayBuffer;

      await sendAttachment('pasted-image.png', arrayBuffer, 'image/png');
    } catch (error) {
      alert(`Failed to paste image: ${error}`);
    }
  };

  const sendAttachment = async (fileName: string, content: ArrayBuffer, contentType: string) => {
    if (!testSet || !selection || !selection.testId) return;

    const coordinator = getRunCoordinator(testSet);

    if (selection.stepPath && selection.stepPath.length > 0) {
      // Attach to step
      const test = resolveTest(testSet.structure.suites, selection);
      if (!test) return;
      const step = resolveStep(test.steps || [], selection.stepPath);
      if (!step) return;

      await coordinator.attachToStep(
        selection.suiteIds,
        selection.testId,
        test.name,
        selection.stepPath,
        step.name,
        fileName,
        content,
        contentType
      );
    } else {
      // Attach to test
      const test = resolveTest(testSet.structure.suites, selection);
      if (!test) return;

      await coordinator.attachToTest(
        selection.suiteIds,
        selection.testId,
        test.name,
        fileName,
        content,
        contentType
      );
    }

    // Track attachment
    const isImage = contentType.startsWith('image/');
    setAttachments(prev => [...prev, { name: fileName, type: isImage ? 'image' : 'file', data: content }]);
  };

  const handleViewAttachment = (attachment: { name: string; type: 'image' | 'file'; data?: ArrayBuffer }) => {
    if (attachment.type === 'image' && attachment.data) {
      // Convert ArrayBuffer to data URL for preview
      const bytes = new Uint8Array(attachment.data);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:image/png;base64,${base64}`;
      setPreviewImage(dataUrl);
      setShowImagePreview(true);
    }
    // For files, we could implement download or open functionality
  };

  const handleAddSuite = () => {
    if (!selection) return;
    setAddDialogType('suite');
    setAddDialogValue('New Suite');
    setShowAddDialog(true);
  };

  const handleAddTest = () => {
    if (!selection || !selection.suiteIds.length) return;
    setAddDialogType('test');
    setAddDialogValue('New Test');
    setShowAddDialog(true);
  };

  const handleAddStep = () => {
    if (!selection || !selection.testId) return;
    setAddDialogType('step');
    setAddDialogValue('New Step');
    setShowAddDialog(true);
  };

  const handleAddConfirm = () => {
    if (!selection || !addDialogValue.trim()) return;
    
    if (addDialogType === 'suite') {
      addSuite(selection.suiteIds, addDialogValue);
    } else if (addDialogType === 'test') {
      addTest(selection.suiteIds, addDialogValue);
    } else if (addDialogType === 'step') {
      const parentStepPath = selection.stepPath || [];
      addStep(selection.suiteIds, selection.testId!, parentStepPath, addDialogValue);
    }
    
    setShowAddDialog(false);
    setAddDialogValue('');
  };


  return (
    <>
      {/* Image Preview Modal */}
      {showImagePreview && previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowImagePreview(false)}>
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <img src={previewImage} alt="Preview" className="w-full h-auto" />
          </div>
        </div>
      )}

      {/* Add Item Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-4 w-96">
            <h3 className="text-lg font-semibold mb-3">Add {addDialogType}</h3>
            <Input
              value={addDialogValue}
              onChange={(e) => setAddDialogValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddConfirm();
                if (e.key === 'Escape') setShowAddDialog(false);
              }}
              autoFocus
              placeholder={`Enter ${addDialogType} name`}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddConfirm} disabled={!addDialogValue.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

    <div className="p-4 space-y-4">
      <div>
        <div className="text-xs text-muted-foreground mb-1">Name</div>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={handleSaveName} className="dark:bg-orangebeard-dark-green dark:hover:bg-orangebeard-dark-green/90">Save</Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={!!execution.runId}
            title={execution.runId ? 'Cannot delete while run is active' : 'Delete item and all sub-items'}
            className="dark:bg-orangebeard-dark-green dark:hover:bg-orangebeard-dark-green/90"
          >
            Delete
          </Button>
        </div>
      </div>

      {(selection.testId || (selection.stepPath && selection.stepPath.length > 0)) && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Notes (auto-saved)</div>
          <textarea
            className="w-full h-40 border rounded-md p-2 text-sm bg-background"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes here (markdown format)"
          />
        </div>
      )}

      {(selection.testId || (selection.stepPath && selection.stepPath.length > 0)) && execution.runId && (
        <>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Current Execution remarks</div>
            <textarea
              className="w-full h-24 border rounded-md p-2 text-sm bg-background"
              value={(selection.stepPath && selection.stepPath.length > 0)
                ? (execution.steps[`${selection.testId}:${selection.stepPath.join('.')}`]?.remarks || '')
                : (execution.tests[selection.testId!]?.remarks || '')}
              onChange={(e) => {
                if (selection.stepPath && selection.stepPath.length > 0) {
                  setStepRemarks(selection.testId!, selection.stepPath, e.target.value);
                } else if (selection.testId) {
                  setTestRemarks(selection.testId, e.target.value);
                }
              }}
              placeholder="Add run-specific remarks here (markdown supported). Not saved to file."
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Mark Status (requires active run)</div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleMarkStatus('PASSED')} className="bg-green-600 hover:bg-green-700">
                Pass
              </Button>
              <Button size="sm" onClick={() => handleMarkStatus('FAILED')} variant="destructive">
                Fail
              </Button>
              <Button size="sm" onClick={() => handleMarkStatus('SKIPPED')} className="bg-yellow-600 hover:bg-yellow-700">
                Skip
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Attachments</div>
            <div className="flex gap-2 items-center">
              <Button size="sm" variant="outline" onClick={handleAttachFile}>
                Attach File
              </Button>
              <Button size="sm" variant="outline" onClick={handlePasteImage} className="flex items-center gap-1">
                <Icon path={mdiContentPaste} size={16} />
              </Button>
              {attachments.map((att, idx) => (
                <Icon
                  key={idx}
                  path={att.type === 'image' ? mdiFileImageOutline : mdiFileCheckOutline}
                  size={20}
                  className="text-blue-500 hover:text-blue-700"
                  onClick={() => handleViewAttachment(att)}
                />
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </>
      )}

      {!execution.runId && selection.testId && (
        <div className="text-sm text-muted-foreground">
          Start a run first to mark test/step status.
        </div>
      )}

      <div className="border-t pt-4 mt-4">
        <div className="text-xs text-muted-foreground mb-2">Add Items</div>
        <div className="flex flex-col gap-2">
          {item.type === 'suite' && (
            <>
              <Button size="sm" variant="outline" onClick={handleAddSuite}>
                Add Child Suite
              </Button>
              <Button size="sm" variant="outline" onClick={handleAddTest}>
                Add Test
              </Button>
            </>
          )}
          {item.type === 'test' && (
            <Button size="sm" variant="outline" onClick={handleAddStep}>
              Add Step
            </Button>
          )}
          {item.type === 'step' && (
            <Button size="sm" variant="outline" onClick={handleAddStep}>
              Add Child Step
            </Button>
          )}
        </div>
      </div>
    </div>
    </>
  );

  async function handleMarkStatus(status: TestStatus) {
    if (!testSet || !selection || !selection.testId) return;

    // Require either notes or remarks for failures
    if (status === 'FAILED') {
      const remarks = selection.stepPath && selection.stepPath.length > 0
        ? (execution.steps[`${selection.testId}:${selection.stepPath.join('.')}`]?.remarks || '')
        : (selection.testId ? (execution.tests[selection.testId]?.remarks || '') : '');
      if (!notes.trim() && !remarks.trim()) {
        alert('Please add Notes or Current Execution remarks when marking as FAILED');
        return;
      }
    }

    try {
      const coordinator = getRunCoordinator(testSet);

      if (selection.stepPath && selection.stepPath.length > 0) {
        // Mark step
        const test = resolveTest(testSet.structure.suites, selection);
        if (!test) return;
        const step = resolveStep(test.steps || [], selection.stepPath);
        if (!step) return;

        await coordinator.markStepStatus(
          selection.suiteIds,
          selection.testId,
          test.name,
          selection.stepPath,
          step.name,
          status,
          notes || undefined
        );
      } else {
        // Mark test
        const test = resolveTest(testSet.structure.suites, selection);
        if (!test) return;

        // Check if test has any failed steps when trying to pass or skip
        if ((status === 'PASSED' || status === 'SKIPPED') && execution.tests[selection.testId]?.reported) {
          const hasFailedSteps = useStore.getState().hasFailedSteps(selection.testId);
          if (hasFailedSteps) {
            alert('Cannot mark test as PASSED or SKIPPED when it has failed steps');
            return;
          }
        }

        await coordinator.markTestStatus(
          selection.suiteIds,
          selection.testId,
          test.name,
          status,
          notes || undefined
        );
      }

    } catch (error) {
      alert(`Failed to mark status: ${error}`);
    }
  }
}

function resolveTest(suites: OBSuite[], sel: SelectionPath) {
  let suite: OBSuite | undefined;
  for (const id of sel.suiteIds) {
    suite = (suite ? suite.suites ?? [] : suites).find((s) => s.id === id);
    if (!suite) return null;
  }
  return suite?.tests?.find((t) => t.id === sel.testId);
}

function resolveStep(steps: OBStep[], stepPath: string[]): OBStep | null {
  let step: OBStep | undefined;
  for (const id of stepPath) {
    step = (step ? step.steps ?? [] : steps).find((s) => s.id === id);
    if (!step) return null;
  }
  return step || null;
}

function resolveSelected(suites: OBSuite[], sel: SelectionPath): { type: 'suite' | 'test' | 'step'; name?: string; notes?: string } | null {
  if (sel.testId) {
    let suite: OBSuite | undefined;
    for (const id of sel.suiteIds) {
      suite = (suite ? suite.suites ?? [] : suites).find((s) => s.id === id);
      if (!suite) return null;
    }
    const test = suite?.tests?.find((t) => t.id === sel.testId);
    if (!test) return null;
    if (sel.stepPath && sel.stepPath.length > 0) {
      let step: OBStep | undefined;
      for (const id of sel.stepPath) {
        step = (step ? step.steps ?? [] : test.steps ?? []).find((s) => s.id === id);
        if (!step) return null;
      }
      if (!step) return null;
      const s = step;
      return { type: 'step', name: s.name, notes: s.notes };
    }
    return { type: 'test', name: test.name, notes: test.notes };
  } else {
    let suite: OBSuite | undefined;
    for (const id of sel.suiteIds) {
      suite = (suite ? suite.suites ?? [] : suites).find((s) => s.id === id);
      if (!suite) return null;
    }
    return { type: 'suite', name: suite?.name };
  }
}