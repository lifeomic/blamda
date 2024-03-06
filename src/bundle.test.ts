jest.mock('esbuild', () => ({ build: jest.fn() }));

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import AdmZip = require('adm-zip');
import { build } from 'esbuild';

import { bundle } from './bundle';

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

test('bundle with artifactPrefix option', async () => {
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

  const artifactPrefix = 'nodejs/node_modules';

  await bundle({
    entries: `${TEST_INPUT_DIR}/first-file.ts`,
    outdir: TEST_OUTPUT_DIR,
    artifactPrefix,
    node: 12,
  });

  const outputFiles = readdirSync(TEST_OUTPUT_DIR);
  expect(outputFiles).toEqual(['first-file', 'first-file.zip']);

  expect(
    readdirSync(`${TEST_OUTPUT_DIR}/first-file/${artifactPrefix}`),
  ).toEqual(['first-file.js']);

  const zipEntries = new AdmZip(
    `${TEST_OUTPUT_DIR}/first-file.zip`,
  ).getEntries();
  console.log('zipEntries', zipEntries);
  expect(zipEntries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        entryName: `${artifactPrefix}/first-file.js`,
      }),
    ]),
  );
});

describe('AWS SDK bundling behavior', () => {
  test('allows for ignoring AWS SDK exclusion behavior', async () => {
    writeTestInputFile('first-file.js', `export const TMP = 'TMP';`);
    await bundle({
      entries: `${TEST_INPUT_DIR}/first-file.js`,
      outdir: TEST_OUTPUT_DIR,
      node: 16,
      includeAwsSdk: true,
    });

    expect(build).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        bundle: true,
        sourcemap: false,
        platform: 'node',
        target: 'node16',
        external: [],
        resolveExtensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
      }),
    );
  });

  /** Bundles the code, returning the output. */
  const bundleCode = async (params: {
    node: number;
    code: string;
  }): Promise<string> => {
    writeTestInputFile('test-file.js', params.code);
    await bundle({
      node: params.node,
      entries: [`${TEST_INPUT_DIR}/test-file.js`],
      outdir: TEST_OUTPUT_DIR,
    });

    const outputFile = readFileSync(
      `${TEST_OUTPUT_DIR}/test-file/test-file.js`,
      { encoding: 'utf8' },
    );

    return outputFile;
  };

  /**
   * There's not a perfect way to confirm whether the SDK was included in the bundle.
   * So, in the tests below, we use some indirect approaches to make a solid guess.
   *
   * In particular, we assume:
   * - The SDKs are relatively large (thousands of lines). If the bundle includes the SDK,
   * it's likely to increase the bundle size by thousands of lines.
   *
   * - The bundler output will include many string references to the files within
   * a bundled package. So, e.g. "aws-sdk" will appear in the output code many, many times
   * if that package was bundled.
   *
   * We'll use these assumptions to make assertions below.
   */
  // Node 12, 14, 16 behavior
  describe.each([12, 14, 16])('Node %#', (node) => {
    test(`does not bundle aws-sdk in node version ${node}`, async () => {
      const output = await bundleCode({
        node,
        code: `
          import { Lambda } from 'aws-sdk';

          export const handler = () => {
            new Lambda();
            return {};
          };
        `,
      });

      // Expect small # of lines -- the SDK should not be bundled.
      const lines = output.split('\n').length;
      expect(lines).toBeLessThan(100);

      // Expect the "aws-sdk" string to only appear once -- the SDK should not be bundled.
      const occurrences = output.match(/aws-sdk/g)?.length;
      expect(occurrences).toStrictEqual(1);
    });

    test(`does bundle @aws-sdk in node version ${node}`, async () => {
      const output = await bundleCode({
        node,
        code: `
          import { Lambda } from '@aws-sdk/client-lambda';

          export const handler = () => {
            new Lambda();
            return {};
          };
        `,
      });

      // Expect large # of lines -- the SDK should be bundled.
      const lines = output.split('\n').length;
      expect(lines).toBeGreaterThan(5000);

      // Expect the "@aws-sdk/client-lambda" string to appear many times -- the SDK should be bundled.
      const occurrences = output.match(/@aws-sdk\/client-lambda/g)?.length;
      expect(occurrences).toBeGreaterThan(50);
    });
  });

  // Node 18 behavior.
  test('does not bundle @aws-sdk in node version 18', async () => {
    const output = await bundleCode({
      node: 18,
      code: `
        import { Lambda } from '@aws-sdk/client-lambda';

        export const handler = () => {
          new Lambda();
          return {};
        };
      `,
    });

    // Expect small # of lines -- the SDK should not be bundled.
    const lines = output.split('\n').length;
    expect(lines).toBeLessThan(100);

    // Expect the "@aws-sdk/client-lambda" string to only appear once -- the SDK should not be bundled.
    const occurrences = output.match(/@aws-sdk\/client-lambda/g)?.length;
    expect(occurrences).toStrictEqual(1);
  });

  test('does bundle aws-sdk in node version 18', async () => {
    const output = await bundleCode({
      node: 18,
      code: `
        import { Lambda } from 'aws-sdk';

        export const handler = () => {
          new Lambda();
          return {};
        };
      `,
    });

    // Expect large # of lines -- the SDK should be bundled.
    const lines = output.split('\n').length;
    expect(lines).toBeGreaterThan(5000);

    // Expect the "aws-sdk" string to appear many times -- the SDK should be bundled.
    const occurrences = output.match(/aws-sdk/g)?.length;
    expect(occurrences).toBeGreaterThan(50);
  });
});
