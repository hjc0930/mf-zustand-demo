#!/usr/bin/env node
/**
 * 校验「mf-config 里 CORE_DEPENDENCIES 声明的版本」与「实际安装的版本」是否一致。
 *
 * 为什么需要这一步：
 * - mf-config 用的是精确版本 + strictVersion，一旦实际装到别的版本，
 *   Module Federation 会在运行时直接报错；
 * - 但那个报错发生在页面里，排查成本高。这里把它前移到命令执行阶段：
 *   版本漂移 → 命令直接失败，不会走到起服务。
 *
 * 用法：pnpm check:deps
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const MF_CONFIG_FILE = path.join(ROOT, 'packages/shared-state/src/config/mf-config.ts');

if (!existsSync(MF_CONFIG_FILE)) {
  console.error(`✗ 找不到 ${path.relative(ROOT, MF_CONFIG_FILE)}`);
  process.exit(1);
}

// Node 24 支持直接 import .ts（类型擦除）
const { CORE_DEPENDENCIES } = await import(pathToFileURL(MF_CONFIG_FILE).href);

const requireFromApp = createRequire(path.join(ROOT, 'apps/host/package.json'));

function findPackageDir(entryFile) {
  let dir = path.dirname(entryFile);
  for (;;) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`无法定位 package.json：${entryFile}`);
    dir = parent;
  }
}

function installedVersion(name) {
  const pkgDir = name.startsWith('@demo/')
    ? path.join(ROOT, 'packages/shared-state')
    : findPackageDir(requireFromApp.resolve(name));
  return JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).version;
}

const rows = [];
let failed = 0;

for (const [name, declared] of Object.entries(CORE_DEPENDENCIES)) {
  let actual;
  try {
    actual = installedVersion(name);
  } catch (err) {
    rows.push({ name, declared, actual: `解析失败: ${err.message}`, ok: false });
    failed += 1;
    continue;
  }
  const ok = actual === declared;
  if (!ok) failed += 1;
  rows.push({ name, declared, actual, ok });
}

const pad = (s, n) => String(s).padEnd(n);
console.log('\n核心依赖版本校验\n' + '─'.repeat(62));
for (const r of rows) {
  console.log(
    `${r.ok ? '✓' : '✗'} ${pad(r.name, 22)} 声明 ${pad(r.declared, 10)} 实际 ${r.actual}`,
  );
}
console.log('─'.repeat(62));
console.log(failed === 0 ? `全部一致（${rows.length} 项）\n` : `${failed} 项不一致\n`);

if (failed > 0) {
  console.error(
    '版本漂移了。请二选一：\n' +
      '  1) 升级 mf-config 里 CORE_DEPENDENCIES 的版本号，并同步 package.json + lockfile；\n' +
      '  2) 把依赖装回声明版本（pnpm install --frozen-lockfile）。\n',
  );
  process.exit(1);
}
