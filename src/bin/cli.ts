#!/usr/bin/env node
import * as path from 'path';
import * as yargs from 'yargs';
import { bundle } from '../bundle';

const main = async () => {
  const { entries, outdir, node, includeAwsSdk, artifactPrefix } = await yargs(
    process.argv.slice(2),
  )
    .option('entries', {
      type: 'string',
      description: 'The lambda entrypoints to bundle. Can be a glob pattern.',
      demandOption: true,
    })
    .option('outdir', {
      type: 'string',
      description: 'The output directory for lambda artifacts',
      demandOption: true,
    })
    .option('node', {
      type: 'number',
      description: 'The Node version to target.',
      demandOption: true,
    })
    .option('include-aws-sdk', {
      type: 'boolean',
      description: 'Allow opting out from excluding the aws sdk',
      default: false,
    })
    .option('artifact-prefix', {
      type: 'string',
      description: 'The artifact prefix within the built zip file',
      default: '',
    })
    .strict()
    .parse();

  await bundle({
    entries,
    outdir: path.resolve(process.cwd(), outdir),
    node,
    cwd: process.cwd(),
    includeAwsSdk,
    artifactPrefix,
  });
};

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
