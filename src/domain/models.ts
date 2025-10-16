import { z } from 'zod';

// Test Status enum
export const TestStatus = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const;

export type TestStatus = (typeof TestStatus)[keyof typeof TestStatus];

// ID types for type safety
export type StepId = string;
export type TestId = string;
export type SuiteId = string;

// Zod schemas
export const TestStatusSchema = z.enum(['PASSED', 'FAILED', 'SKIPPED']);

export const OBStepSchema: z.ZodType<OBStep> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    steps: z.array(OBStepSchema).optional(),
    notes: z.string().optional(),
  })
);

export const OBTestSchema = z.object({
  id: z.string(),
  name: z.string(),
  steps: z.array(OBStepSchema).optional(),
  notes: z.string().optional(),
});

export const OBSuiteSchema: z.ZodType<OBSuite> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    suites: z.array(OBSuiteSchema).optional(),
    tests: z.array(OBTestSchema).optional(),
  })
);

export const OBTestSetSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  metadata: z.object({
    organization: z.string(),
    project: z.string(),
    testSetName: z.string(),
    description: z.string().optional(),
  }),
  structure: z.object({
    suites: z.array(OBSuiteSchema),
  }),
});

// TypeScript types derived from schemas
export interface OBStep {
  id: StepId;
  name: string;
  steps?: OBStep[];
  notes?: string;
}

export interface OBTest {
  id: TestId;
  name: string;
  steps?: OBStep[];
  notes?: string;
}

export interface OBSuite {
  id: SuiteId;
  name: string;
  suites?: OBSuite[];
  tests?: OBTest[];
}

export interface OBTestSet {
  schemaVersion: '1.0.0';
  metadata: {
    organization: string;
    project: string;
    testSetName: string;
    description?: string;
  };
  structure: {
    suites: OBSuite[];
  };
}

// App Config types
export const ThemeMode = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type ThemeMode = (typeof ThemeMode)[keyof typeof ThemeMode];

export const AppConfigSchema = z.object({
  baseUrl: z.string().default('https://app.orangebeard.io'),
  proxy: z
    .object({
      host: z.string(),
      port: z.number(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .nullable()
    .optional(),
  alwaysOnTop: z.boolean().default(false),
  // Allow saving incomplete config: token may be empty string until a run starts
  listenerToken: z.union([z.string().uuid(), z.literal('')]).default(''),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// Execution state types (not persisted in test set file)
export interface AttachmentInfo {
  id: string;
  filename: string;
  size: number;
  timestamp: number;
}

export interface ItemExecutionState {
  status?: TestStatus;
  logs: string[];
  attachments: AttachmentInfo[];
  reported: boolean;
  testKey?: string; // Orangebeard-assigned key
}

export interface ExecutionState {
  runId?: string;
  runName?: string;
  startedAt?: number;
  tests: Record<TestId, ItemExecutionState>;
  steps: Record<string, ItemExecutionState>; // key: testId:stepPath
}

// Selection path types
export interface SelectionPath {
  suiteIds: SuiteId[];
  testId?: TestId;
  stepPath?: StepId[];
}

export interface ItemPath {
  type: 'suite' | 'test' | 'step';
  suiteIds: SuiteId[];
  testId?: TestId;
  stepPath?: StepId[];
}
