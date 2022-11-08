jest.mock('esbuild', () => ({ build: jest.fn() }));

import { rmSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import AdmZip = require('adm-zip');
import { bundle } from './bundle';
import { build } from 'esbuild';

const TEST_INPUT_DIR = `${__dirname}/../test-input`;
const TEST_OUTPUT_DIR = `${__dirname}/../test-output`;

beforeEach(() => {
  rmSync(TEST_INPUT_DIR, { recursive: true, force: true });
  rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });

  jest.spyOn(console, 'log').mockReturnValue(void 0);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  jest.mocked(build).mockImplementation(jest.requireActual('esbuild').build);
});

const writeTestInputFile = (name: string, content: string) => {
  mkdirSync(TEST_INPUT_DIR, { recursive: true });
  writeFileSync(`${TEST_INPUT_DIR}/${name}`, content, { encoding: 'utf8' });
};

test('bundle passes the correct arguments to build(...)', async () => {
  writeTestInputFile('first-file.js', `export const TMP = 'TMP';`);
  await bundle({
    entries: `${TEST_INPUT_DIR}/first-file.js`,
    outdir: TEST_OUTPUT_DIR,
    node: 15,
  });

  expect(build).toHaveBeenCalledTimes(1);
  expect(build).toHaveBeenCalledWith(
    expect.objectContaining({
      bundle: true,
      sourcemap: false,
      platform: 'node',
      target: 'node15',
      external: ['aws-sdk'],
      resolveExtensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
    }),
  );
});

test('bundle handles the cwd parameter', async () => {
  writeTestInputFile('first-file.js', `export const TMP = 'TMP';`);
  await bundle({
    entries: `test-inputfirst-file.js`,
    outdir: TEST_OUTPUT_DIR,
    node: 14,
    cwd: `${__dirname}/..`,
  });
});

test('bundle works with a single JavaScript entry', async () => {
  writeTestInputFile(
    'first-file.js',
    `export const handler = () => {
      return 'first';
    };
    `,
  );

  await bundle({
    entries: `${TEST_INPUT_DIR}/first-file.js`,
    outdir: TEST_OUTPUT_DIR,
    node: 12,
  });

  const outputFiles = readdirSync(TEST_OUTPUT_DIR);
  expect(outputFiles).toEqual(['first-file', 'first-file.zip']);

  expect(readdirSync(`${TEST_OUTPUT_DIR}/first-file`)).toEqual([
    'first-file.js',
  ]);

  const zipEntries = new AdmZip(
    `${TEST_OUTPUT_DIR}/first-file.zip`,
  ).getEntries();
  expect(zipEntries).toEqual([
    expect.objectContaining({
      entryName: 'first-file.js',
    }),
  ]);
});

test('bundle works with a single TypeScript entry', async () => {
  writeTestInputFile(
    'first-file.ts',
    `
    type DummyType = {
      property: string
    }
    export const handler = (): DummyType => {
      return { property: 'something' };
    };
    `,
  );

  await bundle({
    entries: `${TEST_INPUT_DIR}/first-file.ts`,
    outdir: TEST_OUTPUT_DIR,
    node: 12,
  });

  const outputFiles = readdirSync(TEST_OUTPUT_DIR);
  expect(outputFiles).toEqual(['first-file', 'first-file.zip']);

  expect(readdirSync(`${TEST_OUTPUT_DIR}/first-file`)).toEqual([
    'first-file.js',
  ]);

  const zipEntries = new AdmZip(
    `${TEST_OUTPUT_DIR}/first-file.zip`,
  ).getEntries();
  expect(zipEntries).toEqual([
    expect.objectContaining({
      entryName: 'first-file.js',
    }),
  ]);
});

test('bundle works with glob patterns', async () => {
  writeTestInputFile(
    'first-file.js',
    `export const handler = () => {
      return 'first';
    };
    `,
  );

  writeTestInputFile(
    'second-file.ts',
    `
    type DummyType = {
      property: string
    }
    export const handler = (): DummyType => {
      return { property: 'something' };
    };
    `,
  );
  await bundle({
    entries: `${TEST_INPUT_DIR}/*`,
    outdir: TEST_OUTPUT_DIR,
    node: 12,
  });

  const outputFiles = readdirSync(TEST_OUTPUT_DIR);
  expect(outputFiles).toEqual([
    'first-file',
    'first-file.zip',
    'second-file',
    'second-file.zip',
  ]);

  expect(readdirSync(`${TEST_OUTPUT_DIR}/first-file`)).toEqual([
    'first-file.js',
  ]);

  expect(readdirSync(`${TEST_OUTPUT_DIR}/second-file`)).toEqual([
    'second-file.js',
  ]);

  const firstZipEntries = new AdmZip(
    `${TEST_OUTPUT_DIR}/first-file.zip`,
  ).getEntries();
  expect(firstZipEntries).toEqual([
    expect.objectContaining({
      entryName: 'first-file.js',
    }),
  ]);

  const secondZipEntries = new AdmZip(
    `${TEST_OUTPUT_DIR}/second-file.zip`,
  ).getEntries();
  expect(secondZipEntries).toEqual([
    expect.objectContaining({
      entryName: 'second-file.js',
    }),
  ]);
});

test('bundle works with an array of entries', async () => {
  writeTestInputFile(
    'first-file.js',
    `export const handler = () => {
      return 'first';
    };
    `,
  );

  writeTestInputFile(
    'second-file.ts',
    `
    type DummyType = {
      property: string
    }
    export const handler = (): DummyType => {
      return { property: 'something' };
    };
    `,
  );
  await bundle({
    entries: [
      `${TEST_INPUT_DIR}/first-file.js`,
      `${TEST_INPUT_DIR}/second-file.ts`,
    ],
    outdir: TEST_OUTPUT_DIR,
    node: 12,
  });

  const outputFiles = readdirSync(TEST_OUTPUT_DIR);
  expect(outputFiles).toEqual([
    'first-file',
    'first-file.zip',
    'second-file',
    'second-file.zip',
  ]);

  expect(readdirSync(`${TEST_OUTPUT_DIR}/first-file`)).toEqual([
    'first-file.js',
  ]);

  expect(readdirSync(`${TEST_OUTPUT_DIR}/second-file`)).toEqual([
    'second-file.js',
  ]);

  const firstZipEntries = new AdmZip(
    `${TEST_OUTPUT_DIR}/first-file.zip`,
  ).getEntries();
  expect(firstZipEntries).toEqual([
    expect.objectContaining({
      entryName: 'first-file.js',
    }),
  ]);

  const secondZipEntries = new AdmZip(
    `${TEST_OUTPUT_DIR}/second-file.zip`,
  ).getEntries();
  expect(secondZipEntries).toEqual([
    expect.objectContaining({
      entryName: 'second-file.js',
    }),
  ]);
});
