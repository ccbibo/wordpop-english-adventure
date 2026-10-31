import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
// The user requested focused verification, not another exhaustive 80-level replay.
await import('./build.mjs');
const files=(await readdir(new URL('../tests/',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&name!=='all-levels.test.mjs').sort().map(name=>'tests/'+name);
const result=spawnSync(process.execPath,['--test','engine.test.mjs',...files],{stdio:'inherit'});
process.exitCode=result.status??1;
