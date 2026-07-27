#!/usr/bin/env node
/**
 * Resolves Maestro CLI without relying on PATH (Windows + Git Bash).
 * Install: curl -fsSL "https://get.maestro.mobile.dev" | bash
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();
const candidates = [
  path.join(home, '.maestro', 'bin', process.platform === 'win32' ? 'maestro.bat' : 'maestro'),
  path.join(home, '.maestro', 'bin', 'maestro'),
];

const maestroBin = candidates.find((p) => fs.existsSync(p));

if (!maestroBin) {
  console.error(
    [
      'Maestro CLI not found.',
      '',
      'Install (Git Bash):',
      '  curl -fsSL "https://get.maestro.mobile.dev" | bash',
      '',
      'Expected binary at:',
      `  ${candidates[0]}`,
      '',
      'Docs: docs/E2E.md',
    ].join('\n')
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const result = spawnSync(maestroBin, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
