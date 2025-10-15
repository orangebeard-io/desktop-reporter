import { useStore } from '@/state/store';
import { createOrangebeardClient } from '@/services/orangebeardClient';
import { createRunCoordinator, RunCoordinator } from '@/services/runCoordinator';
import type { OBTestSet } from '../../domain/models';
import type { AppStore } from '@/state/store';

let coordinatorInstance: RunCoordinator | null = null;

export function getRunCoordinator(testSet: OBTestSet): RunCoordinator {
  const store = useStore.getState();
  const { config } = store;

  if (!config) {
    throw new Error('Configuration not loaded. Go to Settings first.');
  }

  // Return existing instance if available
  if (coordinatorInstance) {
    return coordinatorInstance;
  }

  // Create new instance
  const client = createOrangebeardClient(
    config.baseUrl,
    config.listenerToken,
    testSet.metadata.project,
    testSet.metadata.testSetName,
    testSet.metadata.organization
  );

  coordinatorInstance = createRunCoordinator(client, store as AppStore, testSet);

  return coordinatorInstance;
}

export function resetCoordinator(): void {
  coordinatorInstance = null;
}
