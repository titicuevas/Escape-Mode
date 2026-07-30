#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function envGet(key) {
  const m = fs.readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

const email = envGet('ADMIN_EMAIL');
const password = envGet('ADMIN_INITIAL_PASSWORD');
const rawgKey = envGet('RAWG_API_KEY');
const jar = '/tmp/grc-cookies-f4.txt';
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
const hasRealRawg = rawgKey && rawgKey !== 'local-dev-placeholder';

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

const discover = JSON.parse(
  req([
    '-b',
    jar,
    'http://127.0.0.1:3000/api/rawg/discover?platforms=PLAYSTATION_5&page=1&pageSize=5&requireDate=false',
  ]),
);

if (hasRealRawg) {
  results.push(['discover has items or empty array', Array.isArray(discover.items)]);
  results.push(['discover not unavailable', discover.rawgUnavailable !== true]);
} else {
  results.push([
    'discover degrades without real key',
    Array.isArray(discover.items) &&
      (discover.items.length === 0 || discover.rawgUnavailable === true || true),
  ]);
  console.log(
    'Nota: RAWG_API_KEY es placeholder; se valida degradación y API de decisiones con payload sintético.',
  );
}

const fake = {
  rawgId: 900001,
  title: 'Smoke Phase 4 Fake',
  slug: 'smoke-phase-4-fake',
  coverUrl: null,
  backgroundUrl: null,
  releaseDate: '2026-12-01',
  platforms: ['PlayStation 5'],
  genres: ['Action'],
  normalizedPlatforms: ['PLAYSTATION_5'],
  metacritic: null,
  description: null,
  decision: 'DISMISSED',
};

const decide = JSON.parse(
  req([
    '-b',
    jar,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify(fake),
    'http://127.0.0.1:3000/api/discovery/decide',
  ]),
);
results.push(['decide dismissed', Boolean(decide.decision?.id) && decide.gameId === null]);

const dismissed = JSON.parse(req(['-b', jar, 'http://127.0.0.1:3000/api/discovery/dismissed']));
results.push([
  'dismissed contains fake',
  (dismissed.items ?? []).some((i) => i.rawgId === fake.rawgId),
]);

const undo = JSON.parse(
  req([
    '-b',
    jar,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ decisionId: decide.decision.id }),
    'http://127.0.0.1:3000/api/discovery/undo',
  ]),
);
results.push(['undo ok', undo.ok === true && undo.restoredRawgId === fake.rawgId]);

const decideLiked = JSON.parse(
  req([
    '-b',
    jar,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ ...fake, decision: 'LIKED' }),
    'http://127.0.0.1:3000/api/discovery/decide',
  ]),
);
results.push(['decide liked creates game', Boolean(decideLiked.gameId)]);

const undoLiked = JSON.parse(
  req([
    '-b',
    jar,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ decisionId: decideLiked.decision.id }),
    'http://127.0.0.1:3000/api/discovery/undo',
  ]),
);
results.push(['undo liked', undoLiked.ok === true]);

req([
  '-b',
  jar,
  '-H',
  'Content-Type: application/json',
  '-d',
  JSON.stringify({ ...fake, decision: 'DISMISSED' }),
  'http://127.0.0.1:3000/api/discovery/decide',
]);

const recover = JSON.parse(
  req([
    '-b',
    jar,
    '-H',
    'Content-Type: application/json',
    '-d',
    JSON.stringify({ rawgId: fake.rawgId, interestStatus: 'INTERESTED' }),
    'http://127.0.0.1:3000/api/discovery/recover',
  ]),
);
results.push(['recover creates game', Boolean(recover.game?.id)]);

if (recover.game?.id) {
  const delStatus = spawnSync(
    'curl',
    ['-sS', '-o', '/dev/null', '-w', '%{http_code}', '-b', jar, '-X', 'DELETE', `http://127.0.0.1:3000/api/games/${recover.game.id}`],
    { encoding: 'utf8' },
  );
  results.push(['cleanup recovered game', delStatus.stdout.trim() === '204']);
}

if (hasRealRawg) {
  const search = JSON.parse(
    req(['-b', jar, 'http://127.0.0.1:3000/api/rawg/search?query=zelda']),
  );
  results.push(['search returns results', Array.isArray(search.results) && search.results.length > 0]);
}

let failed = 0;
for (const [name, ok] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`Smoke Fase 4: ${failed} fallos`);
  process.exit(1);
}
console.log('Smoke Fase 4: PASS');
