'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
// Hard fail if a fixture escapes to a process, network or credential generator.
require('node:child_process').spawn = () => { throw new Error('REAL_PROCESS_FORBIDDEN'); };
require('node:child_process').spawnSync = () => { throw new Error('REAL_PROCESS_FORBIDDEN'); };
require('node:crypto').randomBytes = () => { throw new Error('REAL_RANDOM_FORBIDDEN'); };
global.fetch = () => { throw new Error('REAL_NETWORK_FORBIDDEN'); };
const { parseDeployment, createSession } = require('../../tools/m2-preview-session.cjs');
const { createOfflineFixtureOperator } = require('../../tools/m2-preview-operator.cjs');
const { createSender, attachPrivateProtocol, canonicalGitDirectory, manifestMatches } = require('../../tools/m2-private-sender.cjs');
const { PassThrough } = require('node:stream');
const readline = require('node:readline');

const id = 'dpl_J6yAS6x5F9LxLTNFoq2oJNf6XGg4';
const url = 'https://project-dd34e-315yz9i1s-novoradesign.vercel.app';
const sha = 'fce17ea694a125d12d105b1b30eba4bfd3a5f71c';
const fakeBearer = 'synthetic_' + 'a'.repeat(43);
const fakeOidc = 'synthetic-oidc';
const runtime = 'a'.repeat(64);
const deployment = { id, url, target: 'preview' };
const claims = { owner_id: 'team_9VhRPiCaRc62kna4XyNKvPZ7', project_id: 'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg', environment: 'development', sub: 'owner:novoradesign:project:project-dd34e:environment:development', aud: 'https://vercel.com/novoradesign', iss: 'https://oidc.vercel.com', iat: 1000, nbf: 1000, exp: 1100 };
test('source provenance rejects a worktree git file and accepts a canonical git directory', () => {
  assert.equal(canonicalGitDirectory('fixture', () => ({ isDirectory: () => false })), false);
  assert.equal(canonicalGitDirectory('fixture', () => ({ isDirectory: () => true })), true);
  assert.equal(canonicalGitDirectory('fixture', () => { throw new Error('missing'); }), false);
  assert.throws(() => createSender({ invitedIdentity: 'm2_synthetic_fixture', cwd: 'fixture' }, { canonical: () => false }), /CANONICAL_CHECKOUT_REQUIRED/);
});

test('source provenance manifest requires exactly the expected uploaded files and hashes', () => {
  const a = 'a'.repeat(40), b = 'b'.repeat(40);
  const expected = new Map([['app/route.ts', a], ['vercel.json', b]]);
  const tree = [{ name: 'src', type: 'directory', children: [{ name: 'app', type: 'directory', children: [{ name: 'route.ts', type: 'file', uid: a }] }, { name: 'vercel.json', type: 'file', uid: b }] }];
  assert.equal(manifestMatches(expected, tree), true);
  for (const bad of [
    [{ name: 'src', type: 'directory', children: [{ name: 'vercel.json', type: 'file', uid: b }] }],
    [{ name: 'src', type: 'directory', children: [{ name: 'app', type: 'directory', children: [{ name: 'route.ts', type: 'file', uid: b }] }, { name: 'vercel.json', type: 'file', uid: b }] }],
    [{ name: 'src', type: 'directory', children: [...tree[0].children, { name: 'extra', type: 'file', uid: a }] }],
    [{ name: 'src', type: 'directory', children: [...tree[0].children, { name: '../escape', type: 'file', uid: a }] }],
    [{ name: 'src', type: 'directory', children: [...tree[0].children, { name: 'vercel.json', type: 'file', uid: b }] }],
  ]) assert.equal(manifestMatches(expected, bad), false);
});

test('source provenance rejects absent or malformed expected source before a session starts', () => {
  for (const expectedSourceSha of [undefined, '', 'A'.repeat(40), 'a'.repeat(39)]) {
    assert.throws(() => createSession({ adapters: {}, expectedSourceSha, deadline: 1060000 }), /INVALID_SESSION_CONFIGURATION/);
  }
});

test('source provenance rejects wrong source bytes before token or fixture creation', async () => {
  let tokenCalls = 0, randomCalls = 0;
  const io = { node: 'fixture', environment: {}, canonical: () => true, file: () => Buffer.from('wrong source'), randomBytes: () => { randomCalls++; return Buffer.alloc(32); }, verifyOidc: async () => claims,
    run: (_cmd, args) => {
      if (args.includes('branch')) return { status: 0, stdout: 'integration/instant-first-preview-agent' };
      if (args.includes('rev-parse')) return { status: 0, stdout: sha };
      if (args.includes('status')) return { status: 0, stdout: '' };
      if (args.includes('get-url')) return { status: 0, stdout: 'https://github.com/youdiangete-dot/novora-site.git' };
      if (args.includes('ls-tree')) return { status: 0, stdout: `100644 blob ${'a'.repeat(40)}\tfixture.txt\0` };
      if (args.includes('token')) tokenCalls++;
      throw new Error('UNEXPECTED_FIXTURE_PROCESS');
    }, fetch: () => { throw new Error('UNEXPECTED_FIXTURE_NETWORK'); } };
  const sender = createSender({ cwd: 'fixture', cli: 'fixture', invitedIdentity: 'm2_synthetic_fixture', expectedSourceSha: sha, deadline: 1060000, now: () => 1000000, trustedAdapters: { revoke: async () => true, cleanup: async () => true } }, io);
  assert.equal((await sender('prepare')).status, 'PREPARATION_FAILED');
  assert.equal(tokenCalls, 0); assert.equal(randomCalls, 0);
});

test('source provenance rejects missing, malformed and mismatched protected runtime SHA', async () => {
  for (const runtimeSha of [undefined, 'invalid', '0'.repeat(40)]) {
    const { s } = harness({ proof: async () => ({ authorized: true, isolatedBackendVerified: true, m2Binding: { deploymentId: id, sourceSha: runtimeSha, runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` } }) });
    await attached(s);
    assert.equal((await s.verifyBinding()).status, 'BINDING_REJECTED');
    assert.equal((await s.arm()).status, 'DENIED');
    await s.close();
  }
});
// This is a synthetic operator observation, never proof of a real ledger.
function fixtureObservation(identity = 'synthetic_identity') { return { kind: 'operator_console_observation', observedAt: 1000000, authorityId: `m2e2e_${runtime.slice(0, 56)}`, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, runtimeBinding: runtime, identity, ownerApproved: true, durabilityVerified: true, currency: 'USD', pricingVersion: 'openai-gpt-image-2-2026-04-21-standard-1024x1024-medium-2026-08-03-v1', expectedCostMicros: 100000, revocationReady: true, costAuthorityMode: 'owner_expected_cost_single_attempt_v1', ownerCostRiskAccepted: true, costCeilingVerified: false, limitMicros: 1000000, attemptReservationMicros: 1000000, maximumExperiences: 1, maximumImages: 1, maximumPaidAttempts: 1, automaticPaidRetries: false, expiresAt: 1050000 }; }
function harness(overrides = {}) {
  let time = 1000000;
  const calls = { deploy: 0, submit: 0, revoke: 0, cleanup: 0 };
  const adapters = {
    prepare: async () => ({ bearer: fakeBearer, oidc: fakeOidc, identity: 'synthetic_identity', idempotencyKey: 'synthetic_idempotency' }),
    verifyOidc: async () => claims,
    deploy: async () => { calls.deploy++; return { exitCode: 0, stdout: JSON.stringify({ status: 'success', deployment }) }; },
    readDeployment: async () => ({ ...deployment, projectId: claims.project_id, teamId: claims.owner_id, branch: 'integration/instant-first-preview-agent', sourceSha: sha, sourceVerified: true, manifestVerified: true, readyState: 'READY' }),
    proof: async (request) => { assert.equal(request.redirect, 'error'); return { authorized: true, isolatedBackendVerified: true, m2Binding: { deploymentId: id, sourceSha: sha, runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` } }; },
    submit: async (request) => { calls.submit++; assert.equal(request.redirect, 'error'); return { confirmed: true, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000', cookie: 'synthetic-cookie' }; },
    asset: async (request) => request.cookie ? { status: 200, contentType: 'image/png', bytes: Buffer.from('synthetic-image') } : { status: 404 },
    revoke: async () => { calls.revoke++; return true; },
    cleanup: async () => { calls.cleanup++; return true; },
    ...overrides,
  };
  const config = { adapters, expectedSourceSha: sha, deadline: 1060000, now: () => time };
  return { s: createSession(config), operator: createOfflineFixtureOperator(config), calls, setTime: (t) => { time = t; } };
}
async function attached(s) {
  assert.equal((await s.prepare()).status, 'PREPARED');
  assert.equal((await s.deploy()).status, 'READBACK_REQUIRED');
  assert.equal((await s.attach(id)).status, 'ATTACHED');
}
async function armed(s) {
  await attached(s);
  assert.equal((await s.verifyBinding()).status, 'BINDING_VERIFIED');
  assert.equal(s.observeAuthority(fixtureObservation()).status, 'OPERATOR_OBSERVATION_RECORDED');
  assert.equal((await s.arm()).status, 'ARMED_FROM_OPERATOR_OBSERVATION');
}

test('accepts both documented CLI shapes and sanitizes failures', () => {
  for (const value of [deployment, { status: 'success', deployment }]) assert.deepEqual(parseDeployment({ exitCode: 0, stdout: JSON.stringify(value) }), { ok: true, id, origin: url });
  const cases = [
    [{ exitCode: 1, stdout: fakeBearer }, 'CLI_ERROR'],
    [{ exitCode: 0, stdout: fakeBearer }, 'OUTPUT_PARSE_ERROR'],
    [{ exitCode: 0, stdout: '{}' }, 'DEPLOYMENT_ID_ERROR'],
    ...['http://project-dd34e-x-novoradesign.vercel.app', `${url}?token=${fakeBearer}`, `${url}#x`, 'https://user:pass@project-dd34e-x-novoradesign.vercel.app', 'https://evil.example', `${url}/path`, `${url}:444`].map((bad) => [{ exitCode: 0, stdout: JSON.stringify({ ...deployment, url: bad }) }, 'DEPLOYMENT_URL_ERROR']),
    [{ exitCode: 0, stdout: JSON.stringify({ ...deployment, target: 'production' }) }, 'DEPLOYMENT_TARGET_ERROR'],
  ];
  for (const [input, reason] of cases) { const result = parseDeployment(input); assert.equal(result.reason, reason); assert.equal(JSON.stringify(result).includes(fakeBearer), false); }
});

test('READY session survives checkpoints and closes after one synthetic flow', async () => {
  const { s, calls } = harness();
  await attached(s);
  assert.equal(s.checkpoint().status, 'ACTIVE');
  assert.equal((await s.verifyBinding()).status, 'BINDING_VERIFIED');
  assert.equal(s.observeAuthority(fixtureObservation()).status, 'OPERATOR_OBSERVATION_RECORDED');
  assert.equal((await s.arm()).status, 'ARMED_FROM_OPERATOR_OBSERVATION');
  const result = await s.submit({ fixture: true });
  assert.equal(result.status, 'SUBMITTED');
  assert.equal(JSON.stringify(result).includes(fakeBearer), false);
  assert.equal((await s.submit({})).status, 'DENIED');
  assert.equal((await s.asset(true)).status, 'DELIVERED');
  assert.equal((await s.asset(false)).status, 'DENIED_AS_EXPECTED');
  assert.deepEqual(await s.close(), { status: 'CLOSED', revoke: 'CONFIRMED', cleanup: 'CONFIRMED' });
  assert.deepEqual(calls, { deploy: 1, submit: 1, revoke: 1, cleanup: 1 });
});

test('uncertain deployment is never repeated but can attach with verified readback', async () => {
  let attempts = 0;
  const { s } = harness({ deploy: async () => { attempts++; return { exitCode: 0, stdout: 'unparseable' }; } });
  await s.prepare();
  assert.equal((await s.deploy()).reason, 'OUTPUT_PARSE_ERROR');
  assert.equal(s.checkpoint().deployAttempted, true);
  assert.equal((await s.deploy()).status, 'DENIED');
  assert.equal(attempts, 1);
  assert.equal((await s.attach(id)).status, 'ATTACHED');
  await s.close();
});

test('readback fails closed on identity, source, readiness and target mismatches', async () => {
  for (const mutation of [{ projectId: 'wrong' }, { teamId: 'wrong' }, { branch: 'wrong' }, { sourceSha: '0'.repeat(40) }, { manifestVerified: false }, { manifestVerified: undefined }, { target: 'production' }, { readyState: 'BUILDING' }, { url: 'https://evil.example' }]) {
    const { s } = harness({ readDeployment: async () => ({ ...deployment, projectId: claims.project_id, teamId: claims.owner_id, branch: 'integration/instant-first-preview-agent', sourceSha: sha, sourceVerified: true, manifestVerified: true, readyState: 'READY', ...mutation }) });
    await s.prepare(); await s.deploy();
    assert.equal((await s.attach(id)).status, 'READBACK_REJECTED');
    assert.equal((await s.close()).cleanup, 'UNVERIFIED_TARGET');
  }
});

test('private sender rejects absent or malformed approved identity before I/O', () => {
  for (const identity of [undefined, 'wrong', 'm2_synthetic_']) {
    assert.throws(() => createSender({ invitedIdentity: identity }, {}), /APPROVED_IDENTITY_REQUIRED/);
  }
});

test('private sender wiring holds an uncertain deployment for protected source proof and submits once', async () => {
  let deployments = 0, submissions = 0, cleanups = 0, deployOutput = 'uncertain';
  const identity = 'm2_synthetic_' + Buffer.alloc(12, 1).toString('hex');
  const readback = { uid: id, url: url.slice(8), projectId: claims.project_id, teamId: claims.owner_id, meta: { githubCommitRef: 'integration/instant-first-preview-agent' }, target: null, readyState: 'READY' };
  const binding = { deploymentId: id, sourceSha: sha, runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` };
  const response = (status, body, cookies = []) => ({ status, ok: status === 200, json: async () => body, headers: { getSetCookie: () => cookies, get: () => 'image/png' }, arrayBuffer: async () => Buffer.from('fixture-image') });
  const sourceBytes = Buffer.from('fixed fixture source');
  const sourceUid = require('node:crypto').createHash('sha1').update(sourceBytes).digest('hex');
  const sourceBlob = require('node:crypto').createHash('sha1').update(`blob ${sourceBytes.length}\0`).update(sourceBytes).digest('hex');
  const io = {
    node: 'fixture-node', environment: {}, randomBytes: (n) => Buffer.alloc(n, 1), verifyOidc: async () => claims, canonical: () => true, file: (filename) => { if (filename.endsWith('.gitignore') || filename.endsWith('.pnp.cjs')) throw new Error('IGNORED_FILE_READ'); return sourceBytes; },
    run: (_command, args) => {
      if (args.includes('token')) return { status: 0, stdout: JSON.stringify({ token: fakeOidc }) };
      if (args.includes('deploy')) { deployments++; return { status: 0, stdout: deployOutput }; }
      if (args.includes('api')) {
        if (args.includes('/v6/deployments/' + id + '/files')) return { status: 0, stdout: JSON.stringify([{ name: 'src', type: 'directory', children: [{ name: 'fixture.txt', type: 'file', uid: sourceUid }] }]) };
        assert.deepEqual(args.slice(1), ['api', '/v13/deployments/' + id, '--scope', claims.owner_id, '--raw']); return { status: 0, stdout: JSON.stringify(readback) };
      }
      if (args.includes('branch')) return { status: 0, stdout: 'integration/instant-first-preview-agent' };
      if (args.includes('rev-parse')) return { status: 0, stdout: sha };
      if (args.includes('get-url')) return { status: 0, stdout: 'https://github.com/youdiangete-dot/novora-site.git' };
      if (args.includes('ls-tree')) return { status: 0, stdout: `100644 blob ${sourceBlob}\tfixture.txt${'\0'}100644 blob ${'a'.repeat(40)}\t.gitignore\0` + `100644 blob ${'a'.repeat(40)}\t.pnp.cjs\0` };
      if (args.includes('status')) return { status: 0, stdout: '' };
      throw new Error('UNEXPECTED_FIXTURE_PROCESS');
    },
    fetch: async (address, options) => {
      assert.equal(options.redirect, 'error');
      if (address.endsWith('preview-isolation-proof')) return response(200, { isolatedBackendVerified: true, m2Binding: binding });
      if (address.endsWith('/api/concept-briefs')) { submissions++; return response(201, { persisted: true, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000' }, ['__Host-novora_first_preview_access=fixture; Secure']); }
      if (address.includes('/api/first-preview-assets/')) return options.headers.Cookie ? response(200, {}) : response(404, {});
      throw new Error('UNEXPECTED_FIXTURE_NETWORK');
    },
  };
  const trustedAdapters = {
    revoke: async () => true, cleanup: async () => { cleanups++; return true; },
  };
  const input = new PassThrough(), output = new PassThrough(), pending = [];
  const lines = attachPrivateProtocol(createSender({ cwd: 'fixture', cli: 'fixture-cli', invitedIdentity: identity, expectedSourceSha: sha, deadline: 1060000, now: () => 1000000, trustedAdapters }, io), input, output);
  const reader = readline.createInterface({ input: output });
  reader.on('line', (line) => pending.shift()(JSON.parse(line)));
  const sender = (op, value) => new Promise((resolve) => { pending.push(resolve); input.write(JSON.stringify({ op, value }) + '\n'); });
  const prepared = await sender('prepare');
  assert.equal(prepared.status, 'PREPARED');
  assert.equal(prepared.identity, identity);
  assert.equal((await sender('deploy')).reason, 'OUTPUT_PARSE_ERROR');
  assert.equal((await sender('checkpoint')).status, 'ACTIVE');
  assert.equal((await sender('deploy')).status, 'DENIED');
  assert.equal((await sender('attach', id)).status, 'READONLY_RUNTIME_PROOF_PENDING');
  assert.equal((await sender('arm')).status, 'DENIED');
  assert.equal((await sender('proof')).status, 'BINDING_VERIFIED');
  assert.equal((await sender('arm')).status, 'AUTHORITY_NOT_OBSERVED');
  assert.equal((await sender('observe_authority', fixtureObservation(identity))).status, 'OPERATOR_OBSERVATION_RECORDED');
  assert.equal((await sender('arm')).status, 'ARMED_FROM_OPERATOR_OBSERVATION');
  assert.equal((await sender('submit', { fixture: true })).status, 'SUBMITTED');
  assert.equal((await sender('submit', {})).status, 'DENIED');
  assert.equal((await sender('asset_authorized')).status, 'DELIVERED');
  assert.equal((await sender('asset_unauthorized')).status, 'DENIED_AS_EXPECTED');
  assert.deepEqual(await sender('close'), { status: 'CLOSED', revoke: 'CONFIRMED', cleanup: 'CONFIRMED' });
  lines.close(); reader.close(); input.destroy(); output.destroy();
  assert.equal(deployments, 1); assert.equal(submissions, 1); assert.equal(cleanups, 1);
  deployOutput = JSON.stringify({ status: 'success', deployment });
  const wrapped = createSender({ cwd: 'fixture', cli: 'fixture-cli', invitedIdentity: identity, expectedSourceSha: sha, deadline: 1060000, now: () => 1000000, trustedAdapters }, io);
  await wrapped('prepare');
  assert.deepEqual(await wrapped('deploy'), { status: 'READBACK_REQUIRED', deploymentId: id });
  readback.meta.githubCommitSha = '0'.repeat(40);
  assert.equal((await wrapped('attach', id)).status, 'READBACK_REJECTED');
  assert.equal((await wrapped('close')).cleanup, 'UNVERIFIED_TARGET');
});

test('uncertain submission cannot be retried', async () => {
  let attempts = 0;
  const { s } = harness({ submit: async () => { attempts++; throw new Error(fakeBearer); } });
  await armed(s);
  assert.deepEqual(await s.submit({}), { status: 'SUBMISSION_UNCONFIRMED' });
  assert.equal(s.checkpoint().submissionAttempted, true);
  assert.equal((await s.submit({})).status, 'DENIED');
  assert.equal(attempts, 1);
  await s.close();
});

test('missing source metadata requires a matching protected runtime proof', async () => {
  const { s } = harness({
    readDeployment: async () => ({ ...deployment, projectId: claims.project_id, teamId: claims.owner_id, branch: 'integration/instant-first-preview-agent', manifestVerified: true, readyState: 'READY' }),
    proof: async () => ({ authorized: true, isolatedBackendVerified: true, m2Binding: { deploymentId: id, sourceSha: '0'.repeat(40), runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` } }),
  });
  await s.prepare(); await s.deploy();
  assert.equal((await s.attach(id)).status, 'READONLY_RUNTIME_PROOF_PENDING');
  assert.equal((await s.verifyBinding()).status, 'BINDING_REJECTED');
  assert.equal((await s.arm()).status, 'DENIED');
  await s.close();
});

test('expiry and explicit destruction prevent use while preserving cleanup', async () => {
  for (const mode of ['expiry', 'destroy']) {
    const { s, calls, setTime } = harness();
    await armed(s);
    if (mode === 'expiry') setTime(1060000); else s.destroy();
    assert.equal(s.checkpoint().status, mode === 'expiry' ? 'EXPIRED' : 'HALTED');
    assert.equal((await s.submit({})).status, 'DENIED');
    assert.deepEqual(await s.close(), { status: 'CLOSED', revoke: 'CONFIRMED', cleanup: 'CONFIRMED' });
    assert.equal(calls.revoke, 1); assert.equal(calls.cleanup, 1);
  }
});

test('invalid OIDC and unverified authority cannot arm', async () => {
  const a = harness({ verifyOidc: async () => ({ ...claims, project_id: 'wrong' }) }).s;
  assert.equal((await a.prepare()).status, 'PREPARATION_FAILED');
  assert.equal((await a.prepare()).status, 'DENIED');
  const b = harness().s;
  await attached(b); await b.verifyBinding();
  assert.equal(b.observeAuthority(true).status, 'OBSERVATION_REJECTED');
  assert.equal(b.observeAuthority({ ...fixtureObservation(), identity: 'wrong' }).status, 'OBSERVATION_REJECTED');
  assert.equal(b.observeAuthority({ ...fixtureObservation(), observedAt: 1 }).status, 'OBSERVATION_REJECTED');
  assert.equal(b.observeAuthority({ ...fixtureObservation(), expectedCostMicros: 0 }).status, 'OBSERVATION_REJECTED');
  assert.equal(b.observeAuthority({ ...fixtureObservation(), pricingVersion: 'wrong' }).status, 'OBSERVATION_REJECTED');
  assert.equal(b.observeAuthority({ ...fixtureObservation(), expiresAt: 999999 }).status, 'OBSERVATION_REJECTED');
  assert.equal(b.observeAuthority({ ...fixtureObservation(), extra: fakeBearer }).status, 'OBSERVATION_REJECTED');
  assert.equal((await b.arm()).status, 'AUTHORITY_NOT_OBSERVED');
  assert.equal((await b.submit({})).status, 'DENIED');
  await b.close();
});

test('offline operator entry retains its fixture through uncertainty until explicit close', async () => {
  let attempts = 0;
  const { operator, calls } = harness({ deploy: async () => { attempts++; return { exitCode: 0, stdout: 'uncertain' }; } });
  assert.equal((await operator('prepare')).status, 'PREPARED');
  assert.equal((await operator('deploy')).reason, 'OUTPUT_PARSE_ERROR');
  assert.equal((await operator('checkpoint')).status, 'ACTIVE');
  assert.equal((await operator('deploy')).status, 'DENIED');
  assert.equal((await operator('attach', id)).status, 'ATTACHED');
  assert.equal((await operator('proof')).status, 'BINDING_VERIFIED');
  assert.equal((await operator('observe_authority', fixtureObservation())).status, 'OPERATOR_OBSERVATION_RECORDED');
  assert.equal((await operator('arm')).status, 'ARMED_FROM_OPERATOR_OBSERVATION');
  assert.equal((await operator('submit', {})).status, 'SUBMITTED');
  assert.equal((await operator('submit', {})).status, 'DENIED');
  assert.equal((await operator('asset_authorized')).status, 'DELIVERED');
  assert.equal((await operator('asset_unauthorized')).status, 'DENIED_AS_EXPECTED');
  assert.deepEqual(await operator('close'), { status: 'CLOSED', revoke: 'CONFIRMED', cleanup: 'CONFIRMED' });
  assert.equal(attempts, 1); assert.equal(calls.submit, 1);
});

function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }

test('stop interrupts a busy verifier and pending results cannot restore credentials', async () => {
  const wait = deferred(), started = deferred();
  let generated = 0;
  const { operator } = harness({ verifyOidc: () => { started.resolve(); return wait.promise; }, generate: async () => { generated++; return {}; } });
  const prepare = operator('prepare');
  await started.promise;
  assert.equal((await operator('checkpoint')).status, 'BUSY');
  assert.equal((await operator('destroy')).status, 'HALTED');
  wait.resolve(claims);
  assert.equal((await prepare).status, 'PREPARATION_FAILED');
  assert.equal((await operator('checkpoint')).status, 'HALTED');
  assert.equal((await operator('deploy')).status, 'DENIED');
  assert.equal(generated, 0);
});

test('late fixture credential preparation cannot restore a stopped session', async () => {
  const wait = deferred(), started = deferred();
  const { operator } = harness({ generate: () => { started.resolve(); return wait.promise; } });
  const prepare = operator('prepare');
  await started.promise;
  assert.equal((await operator('destroy')).status, 'HALTED');
  wait.resolve({ bearer: fakeBearer, identity: 'synthetic_identity', idempotencyKey: 'synthetic_idempotency' });
  assert.equal((await prepare).status, 'PREPARATION_FAILED');
  assert.equal((await operator('checkpoint')).status, 'HALTED');
  assert.equal((await operator('deploy')).status, 'DENIED');
});

test('stop between source checks prevents the actual deploy call', async () => {
  const wait = deferred(), started = deferred();
  let deployCalls = 0, branchChecks = 0;
  const sourceBytes = Buffer.from('fixture');
  const blob = require('node:crypto').createHash('sha1').update(`blob ${sourceBytes.length}\0`).update(sourceBytes).digest('hex');
  const io = { node: 'fixture', environment: {}, randomBytes: (n) => Buffer.alloc(n, 1), verifyOidc: async () => claims, canonical: () => true, file: () => sourceBytes,
    run: (_cmd, args) => {
      if (args.includes('token')) return { status: 0, stdout: JSON.stringify({ token: fakeOidc }) };
      if (args.includes('branch')) { branchChecks++; if (branchChecks === 1) return { status: 0, stdout: 'integration/instant-first-preview-agent' }; started.resolve(); return wait.promise; }
      if (args.includes('rev-parse')) return { status: 0, stdout: sha };
      if (args.includes('status')) return { status: 0, stdout: '' };
      if (args.includes('get-url')) return { status: 0, stdout: 'https://github.com/youdiangete-dot/novora-site.git' };
      if (args.includes('ls-tree')) return { status: 0, stdout: `100644 blob ${blob}\tfixture.txt\0` };
      if (args.includes('deploy')) deployCalls++;
      throw new Error('UNEXPECTED_FIXTURE_PROCESS');
    }, fetch: () => { throw new Error('UNEXPECTED_FIXTURE_NETWORK'); } };
  const sender = createSender({ cwd: 'fixture', cli: 'fixture', invitedIdentity: 'm2_synthetic_fixture', expectedSourceSha: sha, deadline: 1060000, now: () => 1000000, trustedAdapters: { revoke: async () => true, cleanup: async () => true } }, io);
  await sender('prepare');
  const deploy = sender('deploy');
  await started.promise;
  assert.equal((await sender('destroy')).status, 'HALTED');
  wait.resolve({ status: 0, stdout: 'integration/instant-first-preview-agent' });
  assert.equal((await deploy).reason, 'DEPLOYMENT_OUTCOME_UNKNOWN');
  assert.equal(deployCalls, 0);
  assert.equal((await sender('deploy')).status, 'DENIED');
});

test('late proof and submission cannot restore state after stop', async () => {
  const proofWait = deferred();
  const a = harness({ proof: async () => proofWait.promise }).s;
  await attached(a);
  const proof = a.verifyBinding();
  a.destroy();
  proofWait.resolve({ authorized: true, isolatedBackendVerified: true, m2Binding: { deploymentId: id, sourceSha: sha, runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` } });
  assert.equal((await proof).status, 'DENIED');
  assert.equal(a.checkpoint().bindingVerified, false);
  const submitWait = deferred();
  const b = harness({ submit: async () => submitWait.promise }).s;
  await armed(b);
  const submission = b.submit({});
  b.destroy();
  submitWait.resolve({ confirmed: true, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000', cookie: 'synthetic-cookie' });
  assert.equal((await submission).status, 'SUBMISSION_UNCONFIRMED');
  assert.equal(b.checkpoint().receiptConfirmed, false);
  assert.equal((await b.submit({})).status, 'DENIED');
  await a.close(); await b.close();
});

test('emergency cleanup remains available while a stopped submission is pending', async () => {
  const wait = deferred(), started = deferred();
  const { operator, calls } = harness({ submit: () => { started.resolve(); return wait.promise; } });
  await operator('prepare'); await operator('deploy'); await operator('attach', id); await operator('proof');
  await operator('observe_authority', fixtureObservation()); await operator('arm');
  const submission = operator('submit', {});
  await started.promise;
  assert.equal((await operator('destroy')).status, 'HALTED');
  assert.deepEqual(await operator('close'), { status: 'CLOSED', revoke: 'CONFIRMED', cleanup: 'CONFIRMED' });
  assert.equal(calls.revoke, 1); assert.equal(calls.cleanup, 1);
  wait.resolve({ confirmed: true, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000', cookie: 'synthetic-cookie' });
  assert.equal((await submission).status, 'SUBMISSION_UNCONFIRMED');
  assert.equal((await operator('checkpoint')).status, 'CLOSED');
});

test('deadline callback expires an idle session without a reporting command', async () => {
  let time = 1000000, callback;
  const s = createSession({ adapters: { prepare: async () => ({ bearer: fakeBearer, oidc: fakeOidc, identity: 'synthetic_identity', idempotencyKey: 'synthetic_idempotency' }), verifyOidc: async () => claims }, expectedSourceSha: sha, deadline: 1060000, now: () => time, schedule: (fn) => { callback = fn; return 1; }, cancel: () => {} });
  assert.equal((await s.prepare()).status, 'PREPARED');
  time = 1060000;
  callback();
  assert.equal(s.checkpoint().status, 'EXPIRED');
  assert.equal((await s.deploy()).status, 'DENIED');
});

function refreshFixture(overrides = {}) {
  let time = 1000000, currentClaims = claims, acquisitions = 0, generations = 0, deployments = 0, submissions = 0, cleanup = 0, submitted, assetRequest;
  const adapters = {
    prepare: async () => { acquisitions++; return { oidc: fakeOidc }; },
    verifyOidc: async () => currentClaims,
    generate: async () => { generations++; return { bearer: fakeBearer, identity: 'synthetic_identity', idempotencyKey: 'synthetic_idempotency' }; },
    deploy: async () => { deployments++; return { exitCode: 0, stdout: JSON.stringify(deployment) }; },
    readDeployment: async () => ({ ...deployment, projectId: claims.project_id, teamId: claims.owner_id, branch: 'integration/instant-first-preview-agent', sourceSha: sha, sourceVerified: true, manifestVerified: true, readyState: 'READY' }),
    proof: async () => ({ authorized: true, isolatedBackendVerified: true, m2Binding: { deploymentId: id, sourceSha: sha, runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` } }),
    submit: async (v) => { submissions++; submitted = v; return { confirmed: true, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000', cookie: 'synthetic-cookie' }; },
    asset: async (v) => { assetRequest = v; return { status: 200, contentType: 'image/png', bytes: Buffer.from('fixture-image') }; },
    revoke: async () => true, cleanup: async () => { cleanup++; return true; }, ...overrides,
  };
  const config = { adapters, expectedSourceSha: sha, deadline: 5000000, now: () => time, schedule: () => 1, cancel: () => {} };
  return { s: createSession(config), operator: createOfflineFixtureOperator(config), setTime: (v) => { time = v; }, setClaims: (v) => { currentClaims = v; }, counts: () => ({ acquisitions, generations, deployments, submissions, cleanup }), submitted: () => submitted, assetRequest: () => assetRequest };
}
async function readyRefreshFixture(f) {
  const s = f.s;
  await s.prepare(); await s.deploy(); await s.attach(id); await s.verifyBinding();
  const observation = { ...fixtureObservation(), expiresAt: 2000000 };
  assert.equal(s.observeAuthority(observation).status, 'OPERATOR_OBSERVATION_RECORDED');
  assert.equal((await s.arm()).status, 'ARMED_FROM_OPERATOR_OBSERVATION');
}

test('OIDC refresh retains the single approved fixture and counters', async () => {
  const f = refreshFixture(), s = f.s;
  await readyRefreshFixture(f);
  f.setTime(1090000);
  assert.equal(s.checkpoint().status, 'ACTIVE'); assert.equal(s.checkpoint().oidcReady, false);
  assert.equal((await s.submit({})).status, 'DENIED');
  assert.equal(f.counts().cleanup, 0);
  f.setClaims({ ...claims, iat: 1090, nbf: 1090, exp: 1500 });
  assert.equal((await s.refreshOidc()).status, 'OIDC_REFRESHED');
  assert.equal((await s.deploy()).status, 'DENIED');
  assert.equal((await s.submit({})).status, 'SUBMITTED');
  assert.equal(f.submitted().bearer, fakeBearer);
  assert.equal(f.submitted().idempotencyKey, 'synthetic_idempotency');
  assert.equal((await s.submit({})).status, 'DENIED');
  assert.deepEqual(f.counts(), { acquisitions: 2, generations: 1, deployments: 1, submissions: 1, cleanup: 0 });
  f.setTime(1490000);
  assert.equal((await s.asset(true)).status, 'DENIED');
  f.setClaims({ ...claims, iat: 1490, nbf: 1490, exp: 1900 });
  assert.equal((await s.refreshOidc()).status, 'OIDC_REFRESHED');
  assert.equal((await s.asset(true)).status, 'DELIVERED');
  assert.equal(f.assetRequest().cookie, 'synthetic-cookie');
  f.setTime(2000000);
  assert.equal((await s.refreshOidc()).status, 'DENIED');
  assert.equal(s.checkpoint().status, 'EXPIRED');
  await s.close();
});

test('OIDC refresh is explicit through the operator and does not create a new fixture', async () => {
  const f = refreshFixture();
  assert.equal((await f.operator('prepare')).status, 'PREPARED');
  f.setTime(1090000);
  assert.equal((await f.operator('checkpoint')).oidcReady, false);
  f.setClaims({ ...claims, iat: 1090, nbf: 1090, exp: 1500 });
  assert.equal((await f.operator('refresh_oidc')).status, 'OIDC_REFRESHED');
  assert.equal((await f.operator('checkpoint')).oidcReady, true);
  assert.equal(f.counts().generations, 1);
  await f.operator('close');
});

test('OIDC refresh rejects cross-project and stale claims without extending deadlines', async () => {
  const f = refreshFixture(), s = f.s;
  await s.prepare();
  f.setTime(1090000);
  f.setClaims({ ...claims, project_id: 'wrong', iat: 1090, nbf: 1090, exp: 1500 });
  assert.equal((await s.refreshOidc()).status, 'OIDC_REFRESH_FAILED');
  f.setClaims({ ...claims, iat: 700, nbf: 700, exp: 1500 });
  assert.equal((await s.refreshOidc()).status, 'OIDC_REFRESH_FAILED');
  assert.equal(s.checkpoint().oidcReady, false);
  assert.equal((await s.deploy()).status, 'DENIED');
  f.setTime(4600000);
  assert.equal((await s.refreshOidc()).status, 'DENIED');
  assert.equal(s.checkpoint().status, 'EXPIRED');
  assert.equal(f.counts().generations, 1);
});

test('OIDC refresh cannot extend the 60-minute bearer lifetime', async () => {
  const f = refreshFixture(); await f.s.prepare();
  f.setTime(1090000); f.setClaims({ ...claims, iat: 1090, nbf: 1090, exp: 1500 });
  assert.equal((await f.s.refreshOidc()).status, 'OIDC_REFRESHED');
  f.setTime(4600000);
  assert.equal(f.s.checkpoint().status, 'EXPIRED');
  assert.equal((await f.s.refreshOidc()).status, 'DENIED');
});

test('OIDC refresh cannot resurrect after stop or independent expiry', async () => {
  for (const stop of ['destroy', 'expiry']) {
    const wait = deferred(), started = deferred(); let acquisitions = 0;
    const f = refreshFixture({ prepare: async () => { acquisitions++; if (acquisitions === 1) return { oidc: fakeOidc }; started.resolve(); return wait.promise; } });
    await f.s.prepare();
    const refresh = f.s.refreshOidc(); await started.promise;
    if (stop === 'destroy') f.s.destroy(); else f.setTime(4600000);
    wait.resolve({ oidc: fakeOidc });
    assert.equal((await refresh).status, 'OIDC_REFRESH_FAILED');
    assert.equal(f.s.checkpoint().status, stop === 'destroy' ? 'HALTED' : 'EXPIRED');
    assert.equal((await f.s.deploy()).status, 'DENIED');
    assert.equal(f.counts().generations, 1);
  }
});

test('OIDC refresh cannot resurrect after stop during verification', async () => {
  const wait = deferred(), started = deferred(); let checks = 0;
  const f = refreshFixture({ verifyOidc: async () => { checks++; if (checks === 1) return claims; started.resolve(); return wait.promise; } });
  await f.s.prepare();
  const refresh = f.s.refreshOidc(); await started.promise;
  f.s.destroy(); wait.resolve(claims);
  assert.equal((await refresh).status, 'OIDC_REFRESH_FAILED');
  assert.equal(f.s.checkpoint().status, 'HALTED');
});

test('OIDC refresh cannot retry an uncertain submission', async () => {
  let attempts = 0;
  const f = refreshFixture({ submit: async () => { attempts++; throw new Error('FIXTURE_TIMEOUT'); } });
  await readyRefreshFixture(f);
  assert.equal((await f.s.submit({})).status, 'SUBMISSION_UNCONFIRMED');
  f.setTime(1090000);
  f.setClaims({ ...claims, iat: 1090, nbf: 1090, exp: 1500 });
  assert.equal((await f.s.refreshOidc()).status, 'OIDC_REFRESHED');
  assert.equal((await f.s.submit({})).status, 'DENIED');
  assert.equal(attempts, 1);
  await f.s.close();
});

test('OIDC refresh cannot retry an uncertain deployment', async () => {
  let attempts = 0;
  const f = refreshFixture({ deploy: async () => { attempts++; return { exitCode: 0, stdout: 'unparseable' }; } });
  await f.s.prepare();
  assert.equal((await f.s.deploy()).reason, 'OUTPUT_PARSE_ERROR');
  f.setTime(1090000); f.setClaims({ ...claims, iat: 1090, nbf: 1090, exp: 1500 });
  assert.equal((await f.s.refreshOidc()).status, 'OIDC_REFRESHED');
  assert.equal((await f.s.deploy()).status, 'DENIED');
  assert.equal(attempts, 1);
  await f.s.close();
});

test('OIDC refresh does not authorize new attempts in the final closure hour', async () => {
  const now = Date.parse('2026-10-30T02:00:00Z');
  let calls = 0;
  const s = createSession({ adapters: { prepare: async () => { calls++; return { oidc: fakeOidc }; } }, expectedSourceSha: sha, deadline: Date.parse('2026-10-30T03:00:00Z'), now: () => now, schedule: () => 1, cancel: () => {} });
  assert.equal((await s.prepare()).status, 'DENIED');
  assert.equal(calls, 0);
});

test('OIDC refresh preparation does not create a fixture after final-hour cutoff', async () => {
  const cutoff = Date.parse('2026-10-30T02:00:00Z');
  let time = cutoff - 1000, generated = 0;
  const wait = deferred(), started = deferred();
  const s = createSession({ adapters: { prepare: async () => ({ oidc: fakeOidc }), verifyOidc: () => { started.resolve(); return wait.promise; }, generate: async () => { generated++; return {}; } }, expectedSourceSha: sha, deadline: cutoff + 3600000, now: () => time, schedule: () => 1, cancel: () => {} });
  const pending = s.prepare(); await started.promise; time = cutoff;
  const iat = Math.floor((cutoff - 1000) / 1000);
  wait.resolve({ ...claims, iat, nbf: iat, exp: iat + 600 });
  assert.equal((await pending).status, 'PREPARATION_FAILED');
  assert.equal(generated, 0);
});
