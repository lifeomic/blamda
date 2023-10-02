This package provides a simple CLI and Node API for bundling AWS Lambda services. Very quickly!

## Usage

First, install the package.

```bash
yarn add -D @lifeomic/blamda
```

Now, bundle lambdas!

```bash
# Target a single file
yarn blamda --entries src/my-service.ts --outdir build-output --node 12

# Or, use a glob pattern
yarn blamda --entries "./src/lambdas/*" --outdir build-output --node 14
```

The output:

```bash
build-output/
  my-service.zip # Upload this to AWS!
  my-service/    # Or, package + upload this directory yourself.
    my-service.js
```

### Node API

If you need deeper bundling customization, use the Node API.

```typescript
import { bundle } from '@lifeomic/blamda';

bundle({
  entries: 'src/lambdas/*',
  outdir: 'build-output',
  node: 14,
  esbuild: {
    // Use this to override internal options passed to esbuild
  },
}).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

### Build for Synthetics Canary

When deploying a lambda as Synthetics Canary, it requires the packaged js file
saved under `nodejs/node_modules` within the packaged zip file. Please use the
option `artifactPrefix` to specify the directory structure within the packaged
zip file:

```bash
yarn blamda --entries src/my-service.ts --outdir build-output \
--artifact-prefix "nodejs/node_modules" --node 14
```

The output:

```
build-output/
  my-service.zip # Upload this to Synthetics Canary!
  my-service/    # Or, package + upload this directory yourself.
    nodejs/
      node_modules/
        my-service.js
```

## Why Use This

As a pattern, bundling Lambda code provides a handful of benefits, especially in an
environment with "many deploys":

- Can provide performance optimizations. Many modern bundlers optimize the bundled
  code in non-trivial ways. These optimizations can result in Lambda handlers that
  execute more quickly.

- Can significantly reduce code artifact size. This pays off in multiple ways:

  - Services stay below the default Lambda artifact file size limit (10GB).
  - Quicker deploys, thanks to smaller uploads.
  - Reduced cost of S3 storage of code artifacts, thanks to smaller file size.

- Provides an opportunity to make easy Lambda environment-specific optimizations.
