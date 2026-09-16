import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('scratch/tests', { recursive: true });
await build({ entryPoints: ['tests/classification.test.ts'], outfile: 'scratch/tests/classification.cjs', bundle: true, platform: 'node', packages: 'external', external: ['./document-reader'] });
const result = spawnSync(process.execPath, ['--test', 'scratch/tests/classification.cjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
