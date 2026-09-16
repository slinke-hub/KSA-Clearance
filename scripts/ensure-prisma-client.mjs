import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schema = resolve(root, 'prisma/schema.prisma');
const generatedSchema = resolve(root, 'node_modules/.prisma/client/schema.prisma');
const generatedTypes = resolve(root, 'node_modules/.prisma/client/index.d.ts');
const normalize = path => readFileSync(path, 'utf8').replace(/\s+/g, '');

// Avoid rewriting a current engine DLL while the Windows dev server has it open.
if (existsSync(generatedSchema) && existsSync(generatedTypes) && normalize(schema) === normalize(generatedSchema)) {
  console.log('Prisma client matches the schema.');
} else {
  const result = spawnSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), 'generate'], {
    cwd: root, stdio: 'inherit',
  });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}
