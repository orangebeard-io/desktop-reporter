import OrangebeardAsyncV3Client from '@orangebeard-io/javascript-client/dist/client/OrangebeardAsyncV3Client';
import type { UUID } from 'crypto';

interface OBConfig {
  endpoint: string;
  token: string;
  project: string;
  testset: string;
  organization: string;
}

let client: OrangebeardAsyncV3Client | null = null;

export function initOrangebeardClient(config: OBConfig): void {
  // Append organization to endpoint URL
  // Format: https://app.orangebeard.io/listener/{organization}
  const endpointWithOrg = config.endpoint.endsWith('/')
    ? `${config.endpoint}${config.organization}`
    : `${config.endpoint}/${config.organization}`;

  client = new OrangebeardAsyncV3Client({
    token: config.token,
    endpoint: endpointWithOrg,
    project: config.project,
    testset: config.testset,
  });
}

export function startRun(runName: string, description?: string): UUID {
  if (!client) throw new Error('Client not initialized');
  return client.startTestRun({
    testSetName: runName,
    description,
    startTime: new Date().toISOString(),
    attributes: [
      { key: 'Tool', value: 'Desktop reporter' }
    ],
  });
}

export function startSuite(runId: UUID, suiteNames: string[]): UUID[] {
  if (!client) throw new Error('Client not initialized');
  return client.startSuite({
    testRunUUID: runId,
    suiteNames,
  });
}

export function startTest(runId: UUID, suiteUUID: UUID, testName: string): UUID {
  if (!client) throw new Error('Client not initialized');
  return client.startTest({
    testRunUUID: runId,
    suiteUUID,
    testName,
    testType: 'TEST' as unknown as never,
    startTime: new Date().toISOString(),
  });
}

export function finishTest(runId: UUID, testUUID: UUID, status: string): void {
  if (!client) throw new Error('Client not initialized');
  client.finishTest(testUUID, {
    testRunUUID: runId,
    status: status as unknown as never,
    endTime: new Date().toISOString(),
  });
}

export function logToTest(runId: UUID, testUUID: UUID, message: string, logLevel: 'INFO' | 'ERROR' = 'INFO'): UUID {
  if (!client) throw new Error('Client not initialized');
  return client.log({
    testRunUUID: runId,
    testUUID,
    logTime: new Date().toISOString(),
    message,
    logLevel: logLevel as unknown as never,
    logFormat: 'MARKDOWN' as unknown as never,
  });
}

export function logToStep(runId: UUID, testUUID: UUID, stepUUID: UUID, message: string, logLevel: 'INFO' | 'ERROR' = 'INFO'): UUID {
  if (!client) throw new Error('Client not initialized');
  return client.log({
    testRunUUID: runId,
    testUUID,
    stepUUID,
    logTime: new Date().toISOString(),
    message,
    logLevel: logLevel as unknown as never,
    logFormat: 'MARKDOWN' as unknown as never,
  });
}

export function startStep(runId: UUID, testUUID: UUID, parentStepUUID: UUID | undefined, stepName: string): UUID {
  if (!client) throw new Error('Client not initialized');
  return client.startStep({
    testRunUUID: runId,
    testUUID,
    parentStepUUID,
    stepName,
    startTime: new Date().toISOString(),
  });
}

export function finishStep(runId: UUID, stepUUID: UUID, status: string): void {
  if (!client) throw new Error('Client not initialized');
  client.finishStep(stepUUID, {
    testRunUUID: runId,
    status: status as unknown as never,
    endTime: new Date().toISOString(),
  });
}

export async function finishRun(runId: UUID): Promise<void> {
  if (!client) throw new Error('Client not initialized');
  await client.finishTestRun(runId, {
    endTime: new Date().toISOString(),
  });
}

export function sendAttachment(
  runId: UUID,
  testUUID: UUID,
  logUUID: UUID,
  stepUUID: UUID | undefined,
  fileName: string,
  content: Buffer,
  contentType: string
): UUID {
  if (!client) throw new Error('Client not initialized');
  return client.sendAttachment({
    file: {
      name: fileName,
      content,
      contentType,
    },
    metaData: {
      testRunUUID: runId,
      testUUID,
      logUUID,
      stepUUID,
      attachmentTime: new Date().toISOString(),
    },
  });
}
