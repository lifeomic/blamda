import { build, BuildOptions as ESBuildOptions } from 'esbuild';
import * as glob from 'glob';
import AdmZip = require('adm-zip');
import { promises as fs } from 'fs';

import { withTiming } from './util';

export type BundleOptions = {
  /**
   * The entrypoint/s to bundle. This can be a glob pattern matching
   * multiple source files (or a list of glob patterns).
   */
  entries: string | string[];

  /**
   * The output destination. This should be a directory.
   */
  outdir: string;

  /**
   * The NodeJS version to Target.
   */
  node: number;

  cwd?: string;

  /**
   * Allows for opting out from excluding the aws sdk
   */
  includeAwsSdk?: boolean;

  /**
   * the output directories of build artifact.
   */
  artifactPrefix?: string;

  /**
   * Override options to pass to esbuild. These override any options generated
   * by other internal settings.
   *
   * **IMPORTANT**: These options may change in a breaking way without warning
   * between versions of this package.
   */
  esbuild?: ESBuildOptions;
};

const addIfMissing = (arr: string[], str: string) => {
  if (!arr.includes(str)) {
    arr.push(str);
  }
};

export const bundle = async ({
  entries,
  outdir,
  node: nodeVersion,
  cwd,
  includeAwsSdk = false,
  artifactPrefix = '',
  esbuild: { external = [], ...esbuild } = {},
}: BundleOptions) => {
  const entryPoints = (typeof entries === 'string' ? [entries] : entries)
    .map((pattern) => glob.sync(pattern, cwd ? { cwd } : undefined))
    .flat();

  if (!includeAwsSdk) {
    /**
     * Don't bundle the AWS SDK, since it is natively available
     * in the Lambda environment.
     *
     * Node runtimes < 18 include the v2 sdk, while runtimes >= 18 include
     * the v3 SDK.
     *
     * https://aws.amazon.com/blogs/compute/node-js-18-x-runtime-now-available-in-aws-lambda/
     */
    addIfMissing(external, nodeVersion >= 18 ? '@aws-sdk/*' : 'aws-sdk');
  }

  const buildResult = await withTiming(() =>
    build({
      bundle: true,
      sourcemap: false,
      platform: 'node',
      target: `node${nodeVersion}`,
      outdir,
      entryPoints,
      external,
      /**
       * As of v0.14.44, esbuild by default prefers .ts over .js files.
       *
       * This can cause unexpected behavior when downstream packages ship
       * .ts and .js files side-by-side (which they should not do in the
       * first place, but we can't protect against).
       *
       * So, we invert the order -- prefer .js, if it's there.
       */
      resolveExtensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
      ...esbuild,
    }),
  );

  console.log(
    `✔️  Bundled ${entryPoints.length} lambdas in ${buildResult.seconds} seconds.`,
  );

  const outFilenames = entryPoints
    .map((p) => p.split('/'))
    .map((parts) => parts[parts.length - 1])
    .map((filename) => filename.replace('.ts', ''))
    .map((filename) => filename.replace('.js', ''));

  await Promise.all(
    outFilenames.map(async (filename) => {
      const dest = `${outdir}/${filename}/${artifactPrefix}`;
      // Make a single directory for the artifacts
      await fs.mkdir(dest, { recursive: true });
      // Move the bundle into the directory
      await fs.rename(`${outdir}/${filename}.js`, `${dest}/${filename}.js`);
    }),
  );

  const zipResult = await withTiming(() =>
    Promise.all(
      outFilenames.map(async (filename) => {
        const zip = new AdmZip();
        const destName = `${outdir}/${filename}`;
        zip.addLocalFolder(destName);
        await zip.writeZipPromise(`${destName}.zip`);
      }),
    ),
  );

  console.log(
    `✔️  Zipped ${entryPoints.length} lambda artifacts in ${zipResult.seconds} seconds.`,
  );
};
