#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function envGet(key) {
  const m = fs.readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

const email = envGet('ADMIN_EMAIL');
const password = envGet('ADMIN_INITIAL_PASSWORD');
const jar = '/tmp/grc-cookies-f3.txt';
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

const games = JSON.parse(req(['-b', jar, 'http://127.0.0.1:3000/api/games?q=Wolverine']));
const game = games.items?.[0];
results.push(['find_wolverine', Boolean(game?.id), { title: game?.title }]);

const gameId = game?.id;
const paidBefore = Number(game?.amountPaid ?? 0);

{
  const out = JSON.parse(
    req([
      '-b',
      jar,
      '-H',
      'Content-Type: application/json',
      '-d',
      JSON.stringify({
        amount: 20,
        paymentType: 'PAYMENT',
        paymentDate: '2026-07-30',
        notes: 'Pago parcial test',
      }),
      `http://127.0.0.1:3000/api/games/${gameId}/payments`,
    ]),
  );
  results.push(['create_payment', out.payment?.amount === '20', { amount: out.payment?.amount }]);
}

{
  const detail = JSON.parse(req(['-b', jar, `http://127.0.0.1:3000/api/games/${gameId}`]));
  const expected = paidBefore + 20;
  results.push([
    'amount_recalculated',
    Number(detail.game?.amountPaid) === expected,
    { amountPaid: detail.game?.amountPaid, expected, status: detail.game?.purchaseStatus },
  ]);
}

{
  const out = JSON.parse(
    req([
      '-b',
      jar,
      '-H',
      'Content-Type: application/json',
      '-d',
      JSON.stringify({
        amount: 5,
        paymentType: 'REFUND',
        paymentDate: '2026-07-30',
      }),
      `http://127.0.0.1:3000/api/games/${gameId}/payments`,
    ]),
  );
  results.push(['create_refund', out.payment?.paymentType === 'REFUND', { type: out.payment?.paymentType }]);
}

{
  const detail = JSON.parse(req(['-b', jar, `http://127.0.0.1:3000/api/games/${gameId}`]));
  const expected = paidBefore + 20 - 5;
  results.push([
    'refund_applied',
    Number(detail.game?.amountPaid) === expected,
    { amountPaid: detail.game?.amountPaid, expected },
  ]);
}

let offerId = null;
{
  const out = JSON.parse(
    req([
      '-b',
      jar,
      '-H',
      'Content-Type: application/json',
      '-d',
      JSON.stringify({
        store: 'Amazon',
        price: 69.99,
        shippingCost: 2.99,
        availability: 'PREORDER',
        includesBonus: true,
        bonusDescription: 'Steelbook',
      }),
      `http://127.0.0.1:3000/api/games/${gameId}/offers`,
    ]),
  );
  offerId = out.offer?.id;
  results.push([
    'create_offer',
    out.offer?.finalPrice === '72.98',
    { finalPrice: out.offer?.finalPrice },
  ]);
}

{
  const out = JSON.parse(req(['-b', jar, `http://127.0.0.1:3000/api/games/${gameId}/offers`]));
  results.push([
    'list_offers',
    out.offers?.length >= 1 && out.offers[0].isLowestPrice === true,
    { count: out.offers?.length },
  ]);
}

{
  const out = JSON.parse(
    req(['-b', jar, 'http://127.0.0.1:3000/api/budget?year=2026&grouping=PAYMENT']),
  );
  results.push([
    'budget',
    typeof out.totalPaid === 'string' &&
      Array.isArray(out.spendByMonth) &&
      Array.isArray(out.gamesWithoutPrice),
    {
      totalPaid: out.totalPaid,
      totalPending: out.totalPending,
      months: out.spendByMonth?.length,
      withoutPrice: out.gamesWithoutPrice?.length,
    },
  ]);
}

{
  const r = spawnSync(
    'curl',
    ['-sS', '-o', '/dev/null', '-w', '%{http_code}', '-b', jar, '-X', 'DELETE', `http://127.0.0.1:3000/api/offers/${offerId}`],
    { encoding: 'utf8' },
  );
  results.push(['delete_offer', r.stdout.trim() === '204', { status: r.stdout.trim() }]);
}

let failed = 0;
for (const [name, ok, detail] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
  if (!ok) failed += 1;
}
console.log(failed === 0 ? 'ALL_PASS' : `FAILED_${failed}`);
process.exit(failed === 0 ? 0 : 1);
