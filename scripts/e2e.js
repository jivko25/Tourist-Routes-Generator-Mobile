#!/usr/bin/env node
/**
 * Convenient local e2e runner for Travel Go + Maestro.
 *
 * Usage:
 *   npm run test:e2e              # all flows except optional/subflow
 *   npm run test:e2e -- list
 *   npm run test:e2e -- smoke
 *   npm run test:e2e -- login     # needs .maestro/auth.env
 *   npm run test:e2e -- invalid
 *   npm run test:e2e -- forms
 *   npm run test:e2e -- home
 *   npm run test:e2e -- --include-tags=auth
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const maestroDir = path.join(root, '.maestro');
const authEnvPath = path.join(maestroDir, 'auth.env');

const FLOWS = {
  smoke: 'smoke_tabs.yaml',
  home: 'home_search_ui.yaml',
  forms: 'settings_auth_forms.yaml',
  invalid: 'auth_login_invalid.yaml',
  login: 'auth_login_success.yaml',
  auth: 'auth_login_invalid.yaml',
};

function findMaestroBin() {
  const home = os.homedir();
  const candidates = [
    path.join(home, '.maestro', 'bin', process.platform === 'win32' ? 'maestro.bat' : 'maestro'),
    path.join(home, '.maestro', 'bin', 'maestro'),
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function loadAuthEnv() {
  if (!fs.existsSync(authEnvPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(authEnvPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function printHelp() {
  console.log(`Travel Go e2e (Maestro)

Commands:
  npm run test:e2e                 Run suite (.maestro/, skips optional)
  npm run test:e2e -- list         List known flow shortcuts
  npm run test:e2e -- smoke        Run smoke_tabs.yaml
  npm run test:e2e -- home         Run home_search_ui.yaml
  npm run test:e2e -- forms        Run settings_auth_forms.yaml
  npm run test:e2e -- invalid      Run auth_login_invalid.yaml
  npm run test:e2e -- login        Run auth_login_success.yaml (uses .maestro/auth.env)

Login setup (once):
  copy .maestro\\\\auth.env.example .maestro\\\\auth.env
  # fill E2E_EMAIL / E2E_PASSWORD

Studio (visual): open Maestro Studio → workspace = this folder's .maestro\\
Do NOT recreate/copy YAML files — edit them in the repo.
`);
}

function listFlows() {
  console.log('Shortcuts:');
  for (const [name, file] of Object.entries(FLOWS)) {
    console.log(`  ${name.padEnd(10)} → .maestro/${file}`);
  }
  console.log('\nFiles in .maestro/:');
  for (const name of fs.readdirSync(maestroDir).sort()) {
    if (!name.endsWith('.yaml') || name === 'config.yaml') continue;
    console.log(`  ${name}`);
  }
}

const maestroBin = findMaestroBin();
if (!maestroBin) {
  console.error('Maestro CLI not found. Install: curl -fsSL "https://get.maestro.mobile.dev" | bash');
  process.exit(1);
}

const rawArgs = process.argv.slice(2);
if (rawArgs.includes('-h') || rawArgs.includes('--help')) {
  printHelp();
  process.exit(0);
}

if (rawArgs[0] === 'list') {
  listFlows();
  process.exit(0);
}

const authEnv = loadAuthEnv();
const env = { ...process.env, ...authEnv };

let maestroArgs;

if (rawArgs.length === 0) {
  maestroArgs = ['test', maestroDir];
} else if (FLOWS[rawArgs[0]]) {
  const flowFile = path.join(maestroDir, FLOWS[rawArgs[0]]);
  if (rawArgs[0] === 'login') {
    if (!env.E2E_EMAIL || !env.E2E_PASSWORD) {
      console.error(
        [
          'Missing E2E_EMAIL / E2E_PASSWORD.',
          `Create ${authEnvPath} from auth.env.example and fill credentials.`,
        ].join('\n')
      );
      process.exit(1);
    }
    maestroArgs = [
      'test',
      '--env',
      `E2E_EMAIL=${env.E2E_EMAIL}`,
      '--env',
      `E2E_PASSWORD=${env.E2E_PASSWORD}`,
      flowFile,
    ];
  } else {
    maestroArgs = ['test', flowFile, ...rawArgs.slice(1)];
  }
} else if (rawArgs[0] === 'test' || rawArgs[0].startsWith('-')) {
  // Passthrough: npm run test:e2e -- test ... or maestro flags
  maestroArgs = rawArgs[0] === 'test' ? rawArgs : ['test', ...rawArgs];
} else if (rawArgs[0].endsWith('.yaml') || rawArgs[0].includes('.maestro')) {
  maestroArgs = ['test', rawArgs[0], ...rawArgs.slice(1)];
} else {
  console.error(`Unknown flow shortcut: ${rawArgs[0]}\n`);
  printHelp();
  process.exit(1);
}

console.log(`> maestro ${maestroArgs.join(' ')}`);
const result = spawnSync(maestroBin, maestroArgs, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
