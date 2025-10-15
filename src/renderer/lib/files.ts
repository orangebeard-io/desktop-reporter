import { OBTestSet, OBTestSetSchema } from '../../domain/models';
import { generateSuiteId } from './id';

export async function openTestSetFile(): Promise<{ testSet: OBTestSet; filePath: string } | null> {
  try {
    const result = await window.api.dialog.openFile({
      title: 'Open Test Set',
      filters: [{ name: 'Orangebeard Test Set', extensions: ['obset.json'] }],
    });

    if (!result) return null;

    const content = await window.api.fs.readFile(result);
    const parsed = JSON.parse(content);
    const testSet = OBTestSetSchema.parse(parsed);

    return { testSet, filePath: result };
  } catch (error) {
    console.error('Failed to open test set:', error);
    throw new Error(`Failed to open test set: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function saveTestSetFile(testSet: OBTestSet, filePath?: string): Promise<string> {
  try {
    let targetPath = filePath;

    if (!targetPath) {
      const result = await window.api.dialog.saveFile({
        title: 'Save Test Set',
        defaultPath: `${testSet.metadata.testSetName}.obset.json`,
        filters: [{ name: 'Orangebeard Test Set', extensions: ['obset.json'] }],
      });

      if (!result) throw new Error('Save cancelled');
      targetPath = result;
    }

    const content = JSON.stringify(testSet, null, 2);
    await window.api.fs.writeFile(targetPath, content);

    return targetPath;
  } catch (error) {
    console.error('Failed to save test set:', error);
    throw new Error(`Failed to save test set: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function newTestSet(): OBTestSet {
  return {
    schemaVersion: '1.0.0',
    metadata: {
      organization: '',
      project: '',
      testSetName: 'New Test Set',
      description: '',
    },
    structure: {
      suites: [
        {
          id: generateSuiteId(),
          name: 'Sample Suite',
          suites: [],
          tests: [],
        },
      ],
    },
  };
}
