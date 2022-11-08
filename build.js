const { execSync } = require('child_process');
const { unlinkSync } = require('fs');
const glob = require('glob');

const run = (cmd) => execSync(cmd, { cwd: __dirname, stdio: 'inherit' });

run('rm -rf dist/');

run('yarn tsc');

for (const file of ['package.json', 'README.md']) {
  run(`cp ${file} dist/`);
}

// Remove test files from output
for (const file of glob.sync('dist/**/*.test.*')) {
  unlinkSync(file);
}

console.log('✔️  Successfully built library to dist folder');
