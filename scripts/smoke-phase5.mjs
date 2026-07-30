#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function envGet(key) {
  const m = fs.readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

const email = envGet('ADMIN_EMAIL');
const password = envGet('ADMIN_INITIAL_PASSWORD');
const jar = '/tmp/grc-cookies-f5.txt';
try {
  fs.unlinkSync(jar);
} catch {
  // ignore
}

function req(args) {
  const r = spawnSync('curl', ['-sS', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || 'curl failed');
  return r.stdout;
}

const results = [];

req([
  '-c',
  jar,
  '-b',
  jar,
  '-H',
  'Content-Type: application/json',
  '-d',
  JSON.stringify({ email, password }),
  'http://127.0.0.1:3000/api/auth/login',
]);

const prefs = JSON.parse(req(['-b', jar, 'http://127.0.0.1:3000/api/preferences']));
results.push(['get preferences', Boolean(prefs.preferences?.defaultDiscoveryMonths)]);

const patched = JSON.parse(
  req([
    '-b',
    jar,
    '-H',
    'Content-Type: application/json',
    '-X',
    'PATCH',
    '-d',
    JSON.stringify({
      reduceMotion: true,
      defaultDiscoveryMonths: 9,
      hideDismissedGames: true,
      preferredPlatforms: ['PLAYSTATION_5', 'PC'],
    }),
    'http://127.0.0.1:3000/api/preferences',
  ]),
);
results.push([
  'patch preferences',
  patched.preferences?.reduceMotion === true &&
    patched.preferences?.defaultDiscoveryMonths === 9 &&
    patched.preferences?.preferredPlatforms?.includes('PC'),
]);

const restored = JSON.parse(
  req([
    '-b',
    jar,
    '-H',
    'Content-Type: application/json',
    '-X',
    'PATCH',
    '-d',
    JSON.stringify({
      reduceMotion: false,
      defaultDiscoveryMonths: 12,
      preferredPlatforms: ['PLAYSTATION_5'],
    }),
    'http://127.0.0.1:3000/api/preferences',
  ]),
);
results.push(['restore preferences', restored.preferences?.defaultDiscoveryMonths === 12]);

const healthHeaders = spawnSync(
  'curl',
  ['-sSI', 'http://127.0.0.1:3000/api/health'],
  { encoding: 'utf8' },
);
results.push([
  'api no-store cache',
  /cache-control:\s*no-store/i.test(healthHeaders.stdout),
]);

let failed = 0;
for (const [name, ok] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`Smoke Fase 5: ${failed} fallos`);
  process.exit(1);
}
console.log('Smoke Fase 5: PASS');
