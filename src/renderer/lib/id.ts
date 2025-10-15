import { nanoid } from 'nanoid';

export function generateId(): string {
  return nanoid();
}

export function generateTestSetId(): string {
  return `testset-${nanoid()}`;
}

export function generateSuiteId(): string {
  return `suite-${nanoid()}`;
}

export function generateTestId(): string {
  return `test-${nanoid()}`;
}

export function generateStepId(): string {
  return `step-${nanoid()}`;
}
