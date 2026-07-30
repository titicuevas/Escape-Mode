#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function envGet(key) {
  const m = fs.readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

const email = envGet('ADMIN_EMAIL');
const password = envGet('ADMIN_INITIAL_PASSWORD');
const jar = '/tmp/grc-cookies.txt';
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

{
  const out = JSON.parse(req(['http://127.0.0.1:3000/api/health']));
  results.push(['health', out.status === 'ok' && out.database === 'connected', out]);
}

{
  const out = JSON.parse(
    req([
      '-H',
      'Content-Type: application/json',
      '-d',
      JSON.stringify({ email, password: 'wrong-password-xyz' }),
      'http://127.0.0.1:3000/api/auth/login',
    ]),
  );
  results.push(['login_fail', Boolean(out.error) && !('user' in out), { hasError: Boolean(out.error) }]);
}

{
  const out = JSON.parse(
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
    ]),
  );
  results.push(['login_ok', Boolean(out.user?.email === email), { email: out.user?.email }]);
}

{
  const out = JSON.parse(req(['-b', jar, 'http://127.0.0.1:3000/api/auth/me']));
  results.push(['me', Boolean(out.user?.email === email), { email: out.user?.email }]);
}

{
  const out = JSON.parse(req(['-b', jar, 'http://127.0.0.1:3000/api/games?sort=date&order=asc']));
  const titles = (out.items || []).map((g) => g.title);
  const seed = [
    'Marvel Tōkon: Fighting Souls',
    "Marvel's Wolverine",
    'EA Sports FC 27',
    'Grand Theft Auto VI',
  ];
  const hasSeeds = seed.every((t) => titles.includes(t));
  const expectedOrderOk =
    titles.indexOf('Marvel Tōkon: Fighting Souls') < titles.indexOf('EA Sports FC 27');
  results.push([
    'games_list_seed',
    hasSeeds && expectedOrderOk && out.total >= 4,
    { total: out.total, titles },
  ]);
}

{
  const out = JSON.parse(req(['-b', jar, 'http://127.0.0.1:3000/api/dashboard']));
  const upcomingCount =
    (Array.isArray(out.nextFiveReleases) ? out.nextFiveReleases.length : 0) +
    (Array.isArray(out.upcomingCommittedReleases) ? out.upcomingCommittedReleases.length : 0);
  results.push([
    'dashboard',
    Boolean(out.nextRelease?.game?.title) &&
      Array.isArray(out.nextFiveReleases) &&
      Array.isArray(out.upcomingCommittedReleases) &&
      upcomingCount >= 1 &&
      typeof out.paidGamesCount === 'number',
    {
      next: out.nextRelease?.game?.title,
      days: out.nextRelease?.daysRemaining,
      nextFive: out.nextFiveReleases?.length,
      committed: out.upcomingCommittedReleases?.length,
      paid: out.paidGamesCount,
      reservations: out.activeReservations?.length,
    },
  ]);
}

let createdId = null;
{
  const out = JSON.parse(
    req([
      '-b',
      jar,
      '-H',
      'Content-Type: application/json',
      '-d',
      JSON.stringify({
        title: 'Prueba Fase 2',
        releaseDate: '2026-12-01',
        interestStatus: 'INTERESTED',
        purchaseStatus: 'UNRESERVED',
        dateSource: 'MANUAL',
        selectedPlatform: 'PlayStation 5',
        totalPrice: 69.99,
      }),
      'http://127.0.0.1:3000/api/games',
    ]),
  );
  createdId = out.game?.id ?? null;
  results.push([
    'create_game',
    Boolean(createdId) && out.game.remainingAmount === '69.99',
    { id: createdId, remaining: out.game?.remainingAmount, mainDate: out.game?.mainDate },
  ]);
}

{
  const out = JSON.parse(
    req([
      '-b',
      jar,
      '-X',
      'PATCH',
      '-H',
      'Content-Type: application/json',
      '-d',
      JSON.stringify({ interestStatus: 'MUST_BUY', amountPaid: 10 }),
      `http://127.0.0.1:3000/api/games/${createdId}`,
    ]),
  );
  results.push([
    'patch_game',
    out.game?.interestStatus === 'MUST_BUY' && out.game?.remainingAmount === '59.99',
    { interest: out.game?.interestStatus, remaining: out.game?.remainingAmount },
  ]);
}

{
  const out = JSON.parse(req(['-b', jar, `http://127.0.0.1:3000/api/games/${createdId}`]));
  results.push(['get_game', out.game?.title === 'Prueba Fase 2', { title: out.game?.title }]);
}

{
  const r = spawnSync(
    'curl',
    [
      '-sS',
      '-o',
      '/dev/null',
      '-w',
      '%{http_code}',
      '-b',
      jar,
      '-X',
      'DELETE',
      `http://127.0.0.1:3000/api/games/${createdId}`,
    ],
    { encoding: 'utf8' },
  );
  results.push(['delete_game', r.stdout.trim() === '204', { status: r.stdout.trim() }]);
}

{
  const r = spawnSync(
    'curl',
    ['-sS', '-o', '/dev/null', '-w', '%{http_code}', 'http://127.0.0.1:3000/api/games'],
    { encoding: 'utf8' },
  );
  results.push(['games_requires_auth', r.stdout.trim() === '401', { status: r.stdout.trim() }]);
}

let failed = 0;
for (const [name, ok, detail] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
  if (!ok) failed += 1;
}
console.log(failed === 0 ? 'ALL_PASS' : `FAILED_${failed}`);
process.exit(failed === 0 ? 0 : 1);
