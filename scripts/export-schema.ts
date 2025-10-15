import fs from 'fs';
import path from 'path';
import { testSetJsonSchema } from '../src/domain/schemas';

const schemaDir = path.join(__dirname, '../src/schema');
const schemaPath = path.join(schemaDir, 'obtestset.schema.json');

// Ensure schema directory exists
if (!fs.existsSync(schemaDir)) {
  fs.mkdirSync(schemaDir, { recursive: true });
}

// Write schema to file
fs.writeFileSync(schemaPath, JSON.stringify(testSetJsonSchema, null, 2), 'utf-8');

console.log(`✅ JSON Schema exported to: ${schemaPath}`);
