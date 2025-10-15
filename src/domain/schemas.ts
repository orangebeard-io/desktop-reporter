import { zodToJsonSchema } from 'zod-to-json-schema';
import { OBTestSetSchema } from './models';

export const testSetJsonSchema = zodToJsonSchema(OBTestSetSchema, {
  name: 'OBTestSet',
  $refStrategy: 'none',
});

export { OBTestSetSchema, TestStatusSchema, AppConfigSchema } from './models';
