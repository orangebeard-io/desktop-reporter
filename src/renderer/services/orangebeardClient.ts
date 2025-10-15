import type { TestStatus } from '../../domain/models';

// UUID is just a string from the renderer's perspective
type UUID = string;

export interface OBClientAdapter {
  startRun(runName: string, description?: string): Promise<{ runId: UUID }>;
  ensureSuitePath(runId: UUID, suitePathNames: string[]): Promise<UUID>;
  startTest(runId: UUID, suiteUUID: UUID, testName: string): Promise<UUID>;
  finishTest(runId: UUID, testUUID: UUID, status: TestStatus): Promise<void>;
  logToTest(runId: UUID, testUUID: UUID, message: string, logLevel?: 'INFO' | 'ERROR'): Promise<UUID>;
  logToStep(runId: UUID, testUUID: UUID, stepUUID: UUID, message: string, logLevel?: 'INFO' | 'ERROR'): Promise<UUID>;
  sendAttachment(runId: UUID, testUUID: UUID, logUUID: UUID, stepUUID: UUID | undefined, fileName: string, content: ArrayBuffer, contentType: string): Promise<UUID>;
  startStep(runId: UUID, testUUID: UUID, parentStepUUID: UUID | undefined, stepName: string): Promise<UUID>;
  finishStep(runId: UUID, stepUUID: UUID, status: TestStatus): Promise<void>;
  finishRun(runId: UUID): Promise<void>;
}

/**
 * Renderer-side client that communicates with main process via IPC
 */
export class OrangebeardClientAdapter implements OBClientAdapter {
  constructor(endpoint: string, token: string, project: string, testset: string, organization: string) {
    // Initialize the client in the main process
    window.api.ob.init({ endpoint, token, project, testset, organization });
  }

  async startRun(runName: string, description?: string): Promise<{ runId: UUID }> {
    const runId = await window.api.ob.startRun(runName, description);
    return { runId };
  }

  async ensureSuitePath(runId: UUID, suitePathNames: string[]): Promise<UUID> {
    const suiteUUIDs = await window.api.ob.startSuite(runId, suitePathNames);
    return suiteUUIDs[suiteUUIDs.length - 1];
  }

  async startTest(runId: UUID, suiteUUID: UUID, testName: string): Promise<UUID> {
    return await window.api.ob.startTest(runId, suiteUUID, testName);
  }

  async finishTest(runId: UUID, testUUID: UUID, status: TestStatus): Promise<void> {
    await window.api.ob.finishTest(runId, testUUID, this.mapStatus(status));
  }

  async logToTest(runId: UUID, testUUID: UUID, message: string, logLevel: 'INFO' | 'ERROR' = 'INFO'): Promise<UUID> {
    return await window.api.ob.logToTest(runId, testUUID, message, logLevel);
  }

  async logToStep(runId: UUID, testUUID: UUID, stepUUID: UUID, message: string, logLevel: 'INFO' | 'ERROR' = 'INFO'): Promise<UUID> {
    return await window.api.ob.logToStep(runId, testUUID, stepUUID, message, logLevel);
  }

  async sendAttachment(runId: UUID, testUUID: UUID, logUUID: UUID, stepUUID: UUID | undefined, fileName: string, content: ArrayBuffer, contentType: string): Promise<UUID> {
    return await window.api.ob.sendAttachment(runId, testUUID, logUUID, stepUUID, fileName, content, contentType);
  }

  async startStep(runId: UUID, testUUID: UUID, parentStepUUID: UUID | undefined, stepName: string): Promise<UUID> {
    return await window.api.ob.startStep(runId, testUUID, parentStepUUID, stepName);
  }

  async finishStep(runId: UUID, stepUUID: UUID, status: TestStatus): Promise<void> {
    await window.api.ob.finishStep(runId, stepUUID, this.mapStatus(status));
  }

  async finishRun(runId: UUID): Promise<void> {
    await window.api.ob.finishRun(runId);
  }

  private mapStatus(status: TestStatus): string {
    switch (status) {
      case 'PASSED':
        return 'PASSED';
      case 'FAILED':
        return 'FAILED';
      case 'SKIPPED':
        return 'SKIPPED';
      default:
        return 'SKIPPED';
    }
  }
}

export function createOrangebeardClient(
  endpoint: string,
  token: string,
  project: string,
  testset: string,
  organization: string
): OBClientAdapter {
  return new OrangebeardClientAdapter(endpoint, token, project, testset, organization);
}
