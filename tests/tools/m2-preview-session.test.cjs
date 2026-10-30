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
const { createSender, attachPrivateProtocol, canonicalGitDirectory, manifestPaths, manifestContentMatches, cliSelection, buildGitSourceDeployment, verifyGitSourceDeployment, runProcess } = require('../../tools/m2-private-sender.cjs');
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
const gitProject = { id: claims.project_id, link: { type: 'github', org: 'youdiangete-dot', repo: 'novora-site', repoId: 12345 } };
const gitReadback = { id, url: url.slice(8), projectId: claims.project_id, ownerId: claims.owner_id, target: null, readyState: 'READY', gitSource: { type: 'github', repoId: 12345, ref: 'integration/instant-first-preview-agent', sha }, meta: { githubCommitRef: 'integration/instant-first-preview-agent', githubCommitSha: sha } };

test('git source request pins branch and sha with deployment-only fixture overrides', () => {
  const body = buildGitSourceDeployment({ identity: 'm2_synthetic_fixture', credentialSha256: 'a'.repeat(64), sourceSha: sha });
  assert.deepEqual(body.gitSource, { type: 'github', org: 'youdiangete-dot', repo: 'novora-site', ref: 'integration/instant-first-preview-agent', sha });
  assert.equal(Object.hasOwn(body, 'files'), false); assert.equal(Object.hasOwn(body, 'target'), false);
  assert.deepEqual(body.env, body.build.env); assert.equal(JSON.parse(body.env.NOVORA_BETA_INVITATIONS_JSON).length, 1);
  assert.throws(() => buildGitSourceDeployment({ identity: 'bad', credentialSha256: 'a'.repeat(64), sourceSha: sha }), /GIT_REQUEST_INVALID/);
});

test('git source platform readback requires provider repository ref sha project and preview', () => {
  const good = verifyGitSourceDeployment(gitReadback, gitProject, id, sha);
  assert.equal(good.sourceEvidence, 'platform_git_source_v1'); assert.equal(good.manifestVerified, undefined); assert.equal(good.sourceVerified, false);
  const named = { type: 'github', org: 'youdiangete-dot', repo: 'novora-site', ref: 'integration/instant-first-preview-agent', sha };
  for (const source of [named, { ...named, repoId: 12345 }, { ...gitReadback.gitSource, repoId: '12345' }]) {
    const result = verifyGitSourceDeployment({ ...gitReadback, gitSource: source }, gitProject, id, sha);
    assert.equal(result.sourceEvidence, 'platform_git_source_v1'); assert.equal(result.sourceVerified, false);
  }
  assert.equal(verifyGitSourceDeployment({ ...gitReadback, gitSource: named }, { ...gitProject, link: { type: 'github', org: 'youdiangete-dot', repo: 'novora-site' } }, id, sha).sourceEvidence, 'platform_git_source_v1');
  const cases = [
    [{ ...gitReadback, gitSource: undefined }, gitProject, 'GIT_SOURCE_SCHEMA'],
    [{ ...gitReadback, id: 'dpl_wrong' }, gitProject, 'GIT_DEPLOYMENT_ID'],
    [{ ...gitReadback, projectId: 'wrong' }, gitProject, 'GIT_PROJECT'],
    [{ ...gitReadback, ownerId: 'wrong' }, gitProject, 'GIT_PROJECT'],
    [{ ...gitReadback, target: 'production' }, gitProject, 'GIT_TARGET'],
    [{ ...gitReadback, readyState: 'NOT_A_STATE' }, gitProject, 'GIT_STATE'],
    [{ ...gitReadback, gitSource: { ...gitReadback.gitSource, repoId: 999 } }, gitProject, 'GIT_REPOSITORY'],
    [{ ...gitReadback, gitSource: { ...named, repoId: 999 } }, gitProject, 'GIT_REPOSITORY'],
    [{ ...gitReadback, gitSource: { ...named, org: 'wrong', repoId: 12345 } }, gitProject, 'GIT_REPOSITORY'],
    [{ ...gitReadback, gitSource: { ...named, repo: 'wrong' } }, gitProject, 'GIT_REPOSITORY'],
    [{ ...gitReadback, gitSource: { ...named, repo: undefined } }, gitProject, 'GIT_REPOSITORY'],
    [{ ...gitReadback, gitSource: { ...named, repoId: null } }, gitProject, 'GIT_REPOSITORY'],
    [{ ...gitReadback, gitSource: { type: 'github', ref: named.ref, sha } }, gitProject, 'GIT_REPOSITORY'],
    [{ ...gitReadback, gitSource: { type: 'github', owner: 'youdiangete-dot', slug: 'novora-site', ref: named.ref, sha } }, gitProject, 'GIT_REPOSITORY'],
    [gitReadback, { ...gitProject, link: { type: 'github', org: 'youdiangete-dot', repo: 'novora-site' } }, 'GIT_REPOSITORY'],
    [{ ...gitReadback, gitSource: { ...gitReadback.gitSource, type: 'gitlab' } }, gitProject, 'GIT_REPOSITORY'],
    [{ ...gitReadback, gitSource: { ...gitReadback.gitSource, ref: undefined } }, gitProject, 'GIT_REF'],
    [{ ...gitReadback, gitSource: { ...gitReadback.gitSource, ref: 'main' } }, gitProject, 'GIT_REF'],
    [{ ...gitReadback, gitSource: { ...gitReadback.gitSource, sha: '0'.repeat(40) } }, gitProject, 'GIT_SHA'],
    [{ ...gitReadback, gitSource: { ...gitReadback.gitSource, sha: undefined } }, gitProject, 'GIT_SHA'],
    [{ ...gitReadback, meta: { githubCommitSha: '0'.repeat(40) } }, gitProject, 'GIT_METADATA_CONFLICT'],
    [gitReadback, { ...gitProject, link: { ...gitProject.link, repo: 'wrong' } }, 'GIT_REPOSITORY'],
  ];
  for (const [d, p, reason] of cases) assert.throws(() => verifyGitSourceDeployment(d, p, id, sha), new RegExp(reason));
  assert.equal(verifyGitSourceDeployment({ ...gitReadback, readyState: 'BUILDING' }, gitProject, id, sha).readyState, 'BUILDING');
  assert.equal(verifyGitSourceDeployment({ ...gitReadback, readyState: 'QUEUED', gitSource: undefined }, gitProject, id, sha).sourceEvidence, 'pending_unverified');
  assert.equal(verifyGitSourceDeployment({ ...gitReadback, readyState: 'ERROR', gitSource: undefined }, gitProject, id, sha).sourceEvidence, 'terminal_unverified');
});

test('git source sender uses stdin, requires runtime proof, and never resends an unknown deployment', async () => {
  let sent = 0, unknown = false;
  const io = { node: 'fixture-node', environment: {}, canonical: () => true,
    randomBytes: (n) => Buffer.alloc(n, 1), verifyOidc: async () => claims,
    run: async (_command, args, options) => {
      if (args.includes('branch')) return { status: 0, stdout: 'integration/instant-first-preview-agent' };
      if (args.includes('rev-parse')) return { status: 0, stdout: sha };
      if (args.includes('status')) return { status: 0, stdout: '' };
      if (args.includes('get-url')) return { status: 0, stdout: 'https://github.com/youdiangete-dot/novora-site.git' };
      if (args.includes('token')) return { status: 0, stdout: JSON.stringify({ token: fakeOidc }) };
      if (args.includes('/v13/deployments')) {
        sent++; assert.equal(args.includes('--input'), true); assert.equal(args.includes('-'), true);
        const body = JSON.parse(options.input); assert.equal(body.gitSource.sha, sha); assert.equal(Object.hasOwn(body, 'files'), false);
        assert.equal(args.join(' ').includes(body.env.NOVORA_BETA_INVITATIONS_JSON), false);
        return unknown ? { status: null, stdout: '' } : { status: 0, stdout: JSON.stringify(deployment) };
      }
      if (args.includes('/v13/deployments/' + id + '?withGitRepoInfo=true')) return { status: 0, stdout: JSON.stringify({ ...gitReadback, gitSource: { type: 'github', org: 'youdiangete-dot', repo: 'novora-site', ref: 'integration/instant-first-preview-agent', sha } }) };
      if (args.includes('/v9/projects/' + claims.project_id)) return { status: 0, stdout: JSON.stringify(gitProject) };
      throw new Error('UNEXPECTED_PROCESS');
    }, fetch: async () => ({ status: 200, ok: true, json: async () => ({ isolatedBackendVerified: true }) }) };
  const config = { cwd: 'fixture', cli: 'fixture-cli', sourceMode: 'git_source', invitedIdentity: 'm2_synthetic_fixture', expectedSourceSha: sha, deadline: 1060000, now: () => 1000000, trustedAdapters: { revoke: async () => false, cleanup: async () => false } };
  const s = createSender(config, io);
  assert.equal((await s('prepare')).status, 'PREPARED');
  assert.equal((await s('deploy')).status, 'READBACK_REQUIRED');
  assert.equal((await s('attach', id)).status, 'READONLY_RUNTIME_PROOF_PENDING');
  assert.equal((await s('arm')).status, 'DENIED');
  assert.equal((await s('proof')).status, 'BINDING_REJECTED');
  assert.equal((await s('arm')).status, 'DENIED');
  await s('close');
  unknown = true;
  const u = createSender(config, io);
  assert.equal((await u('prepare')).status, 'PREPARED');
  assert.equal((await u('deploy')).status, 'READBACK_REQUIRED');
  assert.equal((await u('deploy')).status, 'DENIED');
  await u('close'); assert.equal(sent, 2);
});

test('git source direct hostname acknowledgement continues through pending, binding, synthetic delivery and cleanup', async () => {
  let ready = false, cleanup = 0, revoke = 0, sent = 0;
  const identity = 'm2_synthetic_fixture';
  const response = (status, body, cookies = []) => ({ status, ok: status === 200, json: async () => body, headers: { getSetCookie: () => cookies, get: () => 'image/png' }, arrayBuffer: async () => Buffer.from('fixture-image') });
  const io = { node: 'fixture-node', environment: {}, canonical: () => true, randomBytes: (n) => Buffer.alloc(n, 1), verifyOidc: async () => claims,
    run: async (_command, args) => {
      if (args.includes('branch')) return { status: 0, stdout: 'integration/instant-first-preview-agent' };
      if (args.includes('rev-parse')) return { status: 0, stdout: sha };
      if (args.includes('status')) return { status: 0, stdout: '' };
      if (args.includes('get-url')) return { status: 0, stdout: 'https://github.com/youdiangete-dot/novora-site.git' };
      if (args.includes('token')) return { status: 0, stdout: JSON.stringify({ token: fakeOidc }) };
      if (args.includes('/v13/deployments')) { sent++; return { status: 0, stdout: JSON.stringify({ id, url: url.slice(8), target: null, readyState: 'QUEUED' }) }; }
      if (args.includes('/v13/deployments/' + id + '?withGitRepoInfo=true')) return { status: 0, stdout: JSON.stringify(ready ? { ...gitReadback, gitSource: { type: 'github', org: 'youdiangete-dot', repo: 'novora-site', ref: 'integration/instant-first-preview-agent', sha } } : { ...gitReadback, readyState: 'BUILDING', gitSource: undefined }) };
      if (args.includes('/v9/projects/' + claims.project_id)) return { status: 0, stdout: JSON.stringify(gitProject) };
      throw new Error('UNEXPECTED_PROCESS');
    },
    fetch: async (address, options) => {
      assert.equal(options.redirect, 'error');
      if (address.endsWith('preview-isolation-proof')) return response(200, { isolatedBackendVerified: true, m2Binding: { deploymentId: id, sourceSha: sha, runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` } });
      if (address.endsWith('/api/concept-briefs')) return response(201, { persisted: true, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000' }, ['__Host-novora_first_preview_access=e30.AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE; Secure']);
      if (address.includes('/api/first-preview-assets/')) return options.headers.Cookie ? response(200, {}) : response(404, {});
      throw new Error('UNEXPECTED_NETWORK');
    } };
  const s = createSender({ cwd: 'fixture', cli: 'fixture-cli', sourceMode: 'git_source', invitedIdentity: identity, expectedSourceSha: sha, deadline: 1060000, now: () => 1000000, trustedAdapters: { revoke: async () => { revoke++; return true; }, cleanup: async () => { cleanup++; return true; } } }, io);
  assert.equal((await s('prepare')).status, 'PREPARED');
  assert.equal((await s('deploy')).deploymentId, id);
  assert.deepEqual(await s('attach', id), { status: 'READBACK_PENDING', state: 'BUILDING', source: 'UNVERIFIED' });
  assert.equal((await s('checkpoint')).status, 'ACTIVE'); assert.equal(cleanup, 0); assert.equal(sent, 1);
  ready = true;
  assert.equal((await s('attach', id)).status, 'READONLY_RUNTIME_PROOF_PENDING');
  assert.equal((await s('arm')).status, 'DENIED');
  assert.equal((await s('proof')).status, 'BINDING_VERIFIED');
  assert.equal((await s('observe_authority', fixtureObservation(identity))).status, 'OPERATOR_OBSERVATION_RECORDED');
  assert.equal((await s('arm')).status, 'ARMED_FROM_OPERATOR_OBSERVATION');
  assert.equal((await s('submit', { fixture: true })).status, 'SUBMITTED');
  assert.equal((await s('asset_authorized')).status, 'DELIVERED');
  assert.equal((await s('asset_unauthorized')).status, 'DENIED_AS_EXPECTED');
  assert.deepEqual(await s('close'), { status: 'CLOSED', revoke: 'CONFIRMED', cleanup: 'CONFIRMED' });
  assert.equal(cleanup, 1); assert.equal(revoke, 1);
});

test('unsafe create URL preserves only safe deployment identity for authenticated recovery', async () => {
  const { s, calls } = harness({ deploy: async () => { calls.deploy++; return { exitCode: 0, stdout: JSON.stringify({ id, url: `https://user:${fakeBearer}@evil.invalid`, target: null }) }; } });
  await s.prepare();
  const result = await s.deploy();
  assert.deepEqual(result, { status: 'READBACK_REQUIRED', reason: 'DEPLOYMENT_URL_ERROR', deploymentId: id, wrapper: 'direct', urlCategory: 'schemeful_rejected' });
  assert.equal(JSON.stringify(result).includes(fakeBearer), false);
  assert.equal((await s.deploy()).status, 'DENIED');
  assert.equal((await s.attach(id)).status, 'ATTACHED');
  await s.close(); assert.equal(calls.deploy, 1);
});

test('pending and terminal Git states are bounded and do not trigger cleanup', async () => {
  for (const state of ['QUEUED', 'INITIALIZING', 'BUILDING', 'ERROR', 'CANCELED', 'BLOCKED']) {
    assert.equal(verifyGitSourceDeployment({ ...gitReadback, readyState: state }, gitProject, id, sha).readyState, state);
  }
  const { s, calls } = harness({ readDeployment: async () => ({ ...deployment, projectId: claims.project_id, teamId: claims.owner_id, branch: 'integration/instant-first-preview-agent', sourceSha: sha, sourceVerified: true, manifestVerified: true, readyState: 'BUILDING' }) });
  await s.prepare(); await s.deploy();
  for (let i = 0; i < 30; i++) assert.equal((await s.attach(id)).status, 'READBACK_PENDING');
  assert.equal((await s.attach(id)).status, 'READBACK_LIMIT');
  assert.equal(s.checkpoint().status, 'ACTIVE'); assert.equal(calls.cleanup, 0);
  assert.equal((await s.close()).cleanup, 'UNVERIFIED_TARGET');
});
test('source provenance rejects a worktree git file and accepts a canonical git directory', () => {
  assert.equal(canonicalGitDirectory('fixture', () => ({ isDirectory: () => false })), false);
  assert.equal(canonicalGitDirectory('fixture', () => ({ isDirectory: () => true })), true);
  assert.equal(canonicalGitDirectory('fixture', () => { throw new Error('missing'); }), false);
  assert.throws(() => createSender({ invitedIdentity: 'm2_synthetic_fixture', cwd: 'fixture' }, { canonical: () => false }), /CANONICAL_CHECKOUT_REQUIRED/);
});

test('official file trees retain genuine src paths and reject ambiguous or missing entries', () => {
  const expected = new Map([['src/app.ts', 'digest'], ['root.txt', 'digest']]);
  const tree = [{ name: 'src', type: 'directory', children: [{ name: 'app.ts', type: 'file', uid: 'opaque-id' }] }, { name: 'root.txt', type: 'file', uid: 'another-id' }];
  assert.deepEqual([...manifestPaths(expected, tree).keys()], ['src/app.ts', 'root.txt']);
  assert.deepEqual([...manifestPaths(expected, [{ name: 'src', type: 'directory', children: tree }]).keys()], ['src/app.ts', 'root.txt']);
  assert.throws(() => manifestPaths(expected, [tree[0]]), /MANIFEST_COUNT/);
  assert.throws(() => manifestPaths(expected, [...tree, tree[1]]), /MANIFEST_PATH/);
  assert.throws(() => manifestPaths(expected, [{ name: '../bad', type: 'file', uid: 'id' }]), /MANIFEST_PATH/);
  assert.throws(() => manifestPaths(expected, [{ name: 'src', type: 'directory', children: null }]), /MANIFEST_SCHEMA/);
});

test('complete source bytes are compared, independent of opaque identifiers', () => {
  const crypto = require('node:crypto'), data = Buffer.from('synthetic');
  const hash = crypto.createHash('sha1').update(data).digest('hex');
  const expected = new Map([['src/app.ts', hash]]);
  assert.equal(manifestContentMatches(expected, new Map([['src/app.ts', data]])), true);
  assert.equal(manifestContentMatches(expected, new Map()), false);
  assert.equal(manifestContentMatches(expected, new Map([['src/app.ts', Buffer.from('changed')]])), false);
  assert.equal(manifestContentMatches(expected, new Map([['src/app.ts', data], ['extra', data]])), false);
});

test('source provenance rejects absent or malformed expected source before a session starts', () => {
  for (const expectedSourceSha of [undefined, '', 'A'.repeat(40), 'a'.repeat(39)]) {
    assert.throws(() => createSession({ adapters: {}, expectedSourceSha, deadline: 1060000 }), /INVALID_SESSION_CONFIGURATION/);
  }
});

test('selected untracked file is rejected before reading its content or creating a token', async () => {
  const path = require('node:path'); let reads = 0, tokens = 0;
  const io = { node: 'fixture', environment: {}, canonical: () => true,
    select: async (cwd) => [path.resolve(cwd, 'ignored-secret-fixture')],
    file: () => { reads++; throw new Error('MUST_NOT_READ'); }, randomBytes: () => { throw new Error('MUST_NOT_GENERATE'); }, verifyOidc: async () => claims,
    run: (_command, args) => {
      if (args.includes('branch')) return { status: 0, stdout: 'integration/instant-first-preview-agent' };
      if (args.includes('rev-parse')) return { status: 0, stdout: sha };
      if (args.includes('status')) return { status: 0, stdout: '' };
      if (args.includes('get-url')) return { status: 0, stdout: 'https://github.com/youdiangete-dot/novora-site.git' };
      if (args.includes('ls-tree')) return { status: 0, stdout: `100644 blob ${'a'.repeat(40)}\tfixture.txt\0` };
      if (args.includes('token')) tokens++;
      throw new Error('UNEXPECTED_FIXTURE_PROCESS');
    } };
  const sender = createSender({ cwd: 'fixture', cli: 'fixture', invitedIdentity: 'm2_synthetic_fixture', expectedSourceSha: sha, deadline: 1060000, now: () => 1000000, trustedAdapters: { revoke: async () => true, cleanup: async () => true } }, io);
  assert.deepEqual(await sender('prepare'), { status: 'PREPARATION_FAILED', reason: 'CLI_SELECTION_UNTRACKED' });
  assert.equal(reads, 0); assert.equal(tokens, 0);
});

test('source provenance rejects wrong source bytes before token or fixture creation', async () => {
  let tokenCalls = 0, randomCalls = 0;
  const io = { node: 'fixture', environment: {}, canonical: () => true, select: async (cwd) => [require('node:path').resolve(cwd, 'fixture.txt')], file: () => Buffer.from('wrong source'), randomBytes: () => { randomCalls++; return Buffer.alloc(32); }, verifyOidc: async () => claims,
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
    newCorrelation: async () => 'a'.repeat(32),
    prepare: async () => ({ bearer: fakeBearer, oidc: fakeOidc, identity: 'synthetic_identity', idempotencyKey: 'synthetic_idempotency' }),
    verifyOidc: async () => claims,
    deploy: async () => { calls.deploy++; return { exitCode: 0, stdout: JSON.stringify({ status: 'success', deployment }) }; },
    readDeployment: async () => ({ ...deployment, projectId: claims.project_id, teamId: claims.owner_id, branch: 'integration/instant-first-preview-agent', sourceSha: sha, sourceVerified: true, manifestVerified: true, readyState: 'READY' }),
    proof: async (request) => { assert.equal(request.redirect, 'error'); return { authorized: true, isolatedBackendVerified: true, m2Binding: { deploymentId: id, sourceSha: sha, runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` } }; },
    submit: async (request) => { calls.submit++; assert.equal(request.redirect, 'error'); return { confirmed: true, httpStatus: 201, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000', cookie: 'synthetic-cookie' }; },
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
  for (const [value, wrapper] of [[deployment, 'direct'], [{ status: 'success', deployment }, 'envelope']]) assert.deepEqual(parseDeployment({ exitCode: 0, stdout: JSON.stringify(value) }), { ok: true, id, origin: url, wrapper, urlCategory: 'schemeful', state: 'not_reported' });
  assert.deepEqual(parseDeployment({ exitCode: 0, stdout: JSON.stringify({ ...deployment, url: url.slice(8) }) }), { ok: true, id, origin: url, wrapper: 'direct', urlCategory: 'hostname', state: 'not_reported' });
  const cases = [
    [{ exitCode: 1, stdout: fakeBearer }, 'CLI_ERROR'],
    [{ exitCode: 0, stdout: fakeBearer }, 'OUTPUT_PARSE_ERROR'],
    [{ exitCode: 0, stdout: '{}' }, 'DEPLOYMENT_ID_ERROR'],
    [{ exitCode: 0, stdout: JSON.stringify({ id: 'dpl_conflicting0123456789', deployment }) }, 'OUTPUT_SHAPE_ERROR'],
    [{ exitCode: 0, stdout: JSON.stringify({ status: 'failure', deployment }) }, 'OUTPUT_SHAPE_ERROR'],
    ...['http://project-dd34e-x-novoradesign.vercel.app', `${url}?token=${fakeBearer}`, `${url}#x`, 'https://user:pass@project-dd34e-x-novoradesign.vercel.app', 'https://evil.example', `${url}/path`, `${url}:444`].map((bad) => [{ exitCode: 0, stdout: JSON.stringify({ ...deployment, url: bad }) }, 'DEPLOYMENT_URL_ERROR']),
    [{ exitCode: 0, stdout: JSON.stringify({ ...deployment, target: 'production' }) }, 'DEPLOYMENT_TARGET_ERROR'],
    [{ exitCode: 0, stdout: JSON.stringify({ ...deployment, readyState: 'UNKNOWN_PRIVATE' }) }, 'DEPLOYMENT_STATE_ERROR'],
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
  for (const mutation of [{ projectId: 'wrong' }, { teamId: 'wrong' }, { branch: 'wrong' }, { sourceSha: '0'.repeat(40) }, { manifestVerified: false }, { manifestVerified: undefined }, { target: 'production' }, { readyState: 'NOT_A_STATE' }, { url: 'https://evil.example' }]) {
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
    node: 'fixture-node', environment: {}, select: async (cwd) => [require('node:path').resolve(cwd, 'fixture.txt')], randomBytes: (n) => Buffer.alloc(n, 1), verifyOidc: async () => claims, canonical: () => true, file: (filename) => { if (filename.endsWith('.gitignore') || filename.endsWith('.pnp.cjs')) throw new Error('IGNORED_FILE_READ'); return sourceBytes; },
    run: (_command, args) => {
      if (args.includes('token')) return { status: 0, stdout: JSON.stringify({ token: fakeOidc }) };
      if (args.includes('deploy')) { deployments++; return { status: 0, stdout: deployOutput }; }
      if (args.includes('api')) {
        if (args.includes('/v6/deployments/' + id + '/files')) return { status: 0, stdout: JSON.stringify([{ name: 'fixture.txt', type: 'file', uid: sourceUid }]) };
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
      if (address.endsWith('/api/concept-briefs')) { submissions++; return response(201, { persisted: true, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000' }, ['__Host-novora_first_preview_access=e30.AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE; Secure']); }
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
  assert.deepEqual(await sender('attach', id), { status: 'READBACK_FAILED', reason: 'MANIFEST_CONTENT_UNAVAILABLE' });
  assert.equal((await sender('arm')).status, 'DENIED');
  assert.deepEqual(await sender('close'), { status: 'CLOSED', revoke: 'NOT_REQUIRED', cleanup: 'UNVERIFIED_TARGET' });
  lines.close(); reader.close(); input.destroy(); output.destroy();
  assert.equal(deployments, 1); assert.equal(submissions, 0); assert.equal(cleanups, 0);
});

test('uncertain submission cannot be retried', async () => {
  let attempts = 0;
  const { s } = harness({ submit: async () => { attempts++; throw new Error(fakeBearer); } });
  await armed(s);
  assert.equal((await s.submit({})).status, 'SUBMISSION_UNCONFIRMED');
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
  const io = { node: 'fixture', environment: {}, randomBytes: (n) => Buffer.alloc(n, 1), verifyOidc: async () => claims, canonical: () => true, file: () => sourceBytes, select: async () => [require('node:path').join('fixture', 'fixture.txt')],
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
  assert.equal((await sender('prepare')).status, 'PREPARED');
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
  submitWait.resolve({ confirmed: true, httpStatus: 201, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000', cookie: 'synthetic-cookie' });
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
  wait.resolve({ confirmed: true, httpStatus: 201, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000', cookie: 'synthetic-cookie' });
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
    newCorrelation: async () => 'a'.repeat(32),
    prepare: async () => { acquisitions++; return { oidc: fakeOidc }; },
    verifyOidc: async () => currentClaims,
    generate: async () => { generations++; return { bearer: fakeBearer, identity: 'synthetic_identity', idempotencyKey: 'synthetic_idempotency' }; },
    deploy: async () => { deployments++; return { exitCode: 0, stdout: JSON.stringify(deployment) }; },
    readDeployment: async () => ({ ...deployment, projectId: claims.project_id, teamId: claims.owner_id, branch: 'integration/instant-first-preview-agent', sourceSha: sha, sourceVerified: true, manifestVerified: true, readyState: 'READY' }),
    proof: async () => ({ authorized: true, isolatedBackendVerified: true, m2Binding: { deploymentId: id, sourceSha: sha, runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` } }),
    submit: async (v) => { submissions++; submitted = v; return { confirmed: true, httpStatus: 201, publicReference: 'NOVORA-CB-20261028-AB12', conceptBriefId: '123e4567-e89b-42d3-a456-426614174000', cookie: 'synthetic-cookie' }; },
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

test('actual sender proof preserves only fixed failure context and never retries', async () => {
  const binding = { deploymentId: id, sourceSha: sha, runtimeBinding: runtime, ledgerKey: `novora:beta-admission:m2-e2e:v1:${runtime}`, authorityId: `m2e2e_${runtime.slice(0, 56)}` };
  const good = { isolatedBackendVerified: true, m2Binding: binding };
  const diagnostics = { deploymentIdValid: true, sourceShaValid: false, authorityValid: true, invitationValid: false, targetValid: true, unknown: fakeBearer, extra: { oidc: fakeOidc } };
  const cases = [
    ['TRANSPORT_FAILURE', null, null, true], ['AUTHORIZATION_DENIED', 401], ['AUTHORIZATION_DENIED', 403],
    ['RATE_LIMITED', 429], ['SERVER_ERROR', 503], ['SERVER_ERROR', 503, { isolatedBackendVerified: false, secret: fakeBearer }], ['HTTP_ERROR', 404], ['HTTP_SCHEMA_FAILURE', undefined],
    ['JSON_FAILURE', 200, 'bad-json'], ['SCHEMA_FAILURE', 200, []], ['SCHEMA_FAILURE', 200, { ...good, authorized: false }],
    ['ISOLATION_DENIED', 200, { isolatedBackendVerified: false }],
    ['MISSING_BINDING', 200, { isolatedBackendVerified: true, m2BindingDiagnostics: diagnostics }],
    ['DEPLOYMENT_ID_MISMATCH', 200, { ...good, m2Binding: { ...binding, deploymentId: 'wrong' } }],
    ['SOURCE_SHA_MISMATCH', 200, { ...good, m2Binding: { ...binding, sourceSha: '0'.repeat(40) } }],
    ['RUNTIME_BINDING_INVALID', 200, { ...good, m2Binding: { ...binding, runtimeBinding: 'bad' } }],
    ['LEDGER_KEY_MISMATCH', 200, { ...good, m2Binding: { ...binding, ledgerKey: 'wrong' } }],
    ['AUTHORITY_MISMATCH', 200, { ...good, m2Binding: { ...binding, authorityId: 'wrong' } }],
    ['HANDOFF_FAILED', 200, good, false, true], [null, 200, good],
  ];
  for (const [reason, status, body, transport, handoffError] of cases) {
    let calls = 0, reads = 0, handed = null;
    const io = { node: 'fixture', environment: {}, canonical: () => true, randomBytes: (n) => Buffer.alloc(n, 1), verifyOidc: async () => claims,
      run: async (_cmd, args) => {
        if (args.includes('branch')) return { status: 0, stdout: 'integration/instant-first-preview-agent' };
        if (args.includes('rev-parse')) return { status: 0, stdout: sha };
        if (args.includes('status')) return { status: 0, stdout: '' };
        if (args.includes('get-url')) return { status: 0, stdout: 'https://github.com/youdiangete-dot/novora-site.git' };
        if (args.includes('token')) return { status: 0, stdout: JSON.stringify({ token: fakeOidc }) };
        if (args.includes('/v13/deployments')) return { status: 0, stdout: JSON.stringify(deployment) };
        if (args.includes('/v13/deployments/' + id + '?withGitRepoInfo=true')) return { status: 0, stdout: JSON.stringify(gitReadback) };
        if (args.includes('/v9/projects/' + claims.project_id)) return { status: 0, stdout: JSON.stringify(gitProject) };
        throw new Error('UNEXPECTED_FIXTURE_PROCESS');
      },
      fetch: async () => { calls++; if (transport) throw new Error(fakeBearer); return { status, ok: status === 200, json: async () => { reads++; if (body === 'bad-json') throw new Error(fakeOidc); return body ?? { secret: fakeBearer }; } }; },
    };
    const sender = createSender({ cwd: 'fixture', cli: 'fixture', sourceMode: 'git_source', invitedIdentity: 'm2_synthetic_fixture', expectedSourceSha: sha, deadline: 1060000, now: () => 1000000, trustedAdapters: { revoke: async () => true, cleanup: async () => true, handoffBinding: async (value) => { handed = value; if (handoffError) throw new Error(fakeBearer); } } }, io);
    const preparation = await sender('prepare');
    assert.equal(preparation.status, 'PREPARED');
    assert.equal(Object.hasOwn(preparation, 'credentialSha256'), false);
    assert.equal((await sender('deploy')).status, 'READBACK_REQUIRED');
    assert.equal((await sender('attach', id)).status, 'READONLY_RUNTIME_PROOF_PENDING');
    const input = new PassThrough(), output = new PassThrough();
    const lines = attachPrivateProtocol(sender, input, output);
    const received = new Promise((resolve) => output.once('data', (chunk) => resolve(chunk.toString())));
    input.write('{"op":"proof"}\n');
    const protocolOutput = await received;
    const result = JSON.parse(protocolOutput);
    lines.close(); input.destroy(); output.destroy();
    assert.equal(result.reason ?? null, reason);
    assert.equal(result.stage, 'RUNTIME_PROOF');
    if (Number.isInteger(status)) assert.equal(result.httpStatus, status);
    if (reason === 'MISSING_BINDING') assert.deepEqual(result.m2BindingDiagnostics, { deploymentIdValid: true, sourceShaValid: false, authorityValid: true, invitationValid: false, targetValid: true });
    if (status !== 200) assert.equal(reads, status === 503 ? 1 : 0);
    if (status === 503 && body?.isolatedBackendVerified === false) assert.equal(result.isolationReport, 'REPORTED_FALSE');
    assert.equal(JSON.stringify(result).includes(fakeBearer), false);
    assert.equal(JSON.stringify(result).includes(fakeOidc), false);
    assert.equal(JSON.stringify(result).includes(runtime), false);
    assert.equal(protocolOutput.includes(binding.ledgerKey), false);
    assert.equal(protocolOutput.includes(binding.authorityId), false);
    assert.equal((await sender('proof')).status, 'DENIED');
    if (reason !== null) {
      assert.equal((await sender('arm')).status, 'DENIED');
      assert.equal((await sender('submit', {})).status, 'DENIED');
      if (!handoffError) assert.equal(handed, null);
    } else {
      assert.deepEqual(handed, { ledgerKey: binding.ledgerKey, authorityId: binding.authorityId, runtimeBinding: binding.runtimeBinding, identity: 'm2_synthetic_fixture' });
      assert.equal(Object.isFrozen(handed), true);
      const observation = { ...fixtureObservation('m2_synthetic_fixture'), ...handed };
      assert.equal((await sender('observe_authority', observation)).status, 'OPERATOR_OBSERVATION_RECORDED');
      assert.equal((await sender('arm')).status, 'ARMED_FROM_OPERATOR_OBSERVATION');
    }
    assert.equal(calls, 1);
    await sender('close');
  }
});

test('a pending trusted binding handoff cannot reactivate a stopped or expired session', async () => {
  for (const ending of ['destroy', 'expiry']) {
    const started = deferred(), wait = deferred();
    const h = harness({ handoffBinding: async () => { started.resolve(); await wait.promise; } });
    await attached(h.s);
    const proof = h.s.verifyBinding();
    await started.promise;
    if (ending === 'destroy') h.s.destroy(); else h.setTime(1060001);
    wait.resolve();
    assert.equal((await proof).status, 'DENIED');
    assert.equal((await h.s.arm()).status, 'DENIED');
    assert.equal((await h.s.submit({})).status, 'DENIED');
    assert.equal(h.calls.submit, 0);
    await h.s.close();
  }
});

test('project CLI process retains fixed outcomes without retaining stderr or stdout', async () => {
  const { EventEmitter } = require('node:events');
  const secret='fixture_never_expose_credential';
  function fakeSpawn({ status=1, signal=null, stdout='', stderr='', neverClose=false }) {
    return () => {
      const child=new EventEmitter(); child.stdout=new EventEmitter(); child.stdout.setEncoding=()=>{};
      child.stderr=new EventEmitter(); child.stderr.setEncoding=()=>{};
      child.kill=()=>{ queueMicrotask(()=>child.emit('close',null,'SIGTERM')); };
      queueMicrotask(()=>{ if(stdout) child.stdout.emit('data',stdout); if(stderr) child.stderr.emit('data',stderr); if(!neverClose) child.emit('close',status,signal); });
      return child;
    };
  }
  const cases=[
    [{status:1,stdout:secret,stderr:JSON.stringify({error:{status:403,message:secret}})}, {kind:'EXIT_NONZERO',exitCode:1,reportedHttpStatus:403}],
    [{status:7,stderr:'unstructured 401 '+secret}, {kind:'EXIT_NONZERO',exitCode:7}],
    [{status:null,signal:'SIGTERM'}, {kind:'SIGNALLED'}],
    [{status:1,stderr:secret.repeat(900)}, {kind:'STDERR_LIMIT',exitCode:1}],
    [{status:1,stdout:'x'.repeat(65)}, {kind:'STDOUT_LIMIT',exitCode:1}],
  ];
  for(const [input,expected] of cases){
    const result=await runProcess('fixture',[],{diagnostic:true,maxBuffer:64,timeout:100},'fixture',fakeSpawn(input));
    assert.deepEqual(result.failure,expected); assert.equal(result.stdout,''); assert.equal(JSON.stringify(result).includes(secret),false);
  }
  const timeout=await runProcess('fixture',[],{diagnostic:true,timeout:5},'fixture',fakeSpawn({neverClose:true}));
  assert.equal(timeout.failure.kind,'TIMEOUT');
  const spawn=await runProcess('fixture',[],{diagnostic:true},'fixture',()=>{throw Error(secret)});
  assert.deepEqual(spawn.failure,{kind:'SPAWN_ERROR'}); assert.equal(JSON.stringify(spawn).includes(secret),false);
});

test('actual sender carries only safe project read diagnostics through attach', async () => {
  const secret='fixture_never_expose_credential'; let projectReads=0;
  const io={node:'fixture',environment:{},canonical:()=>true,randomBytes:n=>Buffer.alloc(n,1),verifyOidc:async()=>claims,
    run:async(_command,args,options)=>{
      if(args.includes('branch'))return {status:0,stdout:'integration/instant-first-preview-agent'};
      if(args.includes('rev-parse'))return {status:0,stdout:sha};
      if(args.includes('status'))return {status:0,stdout:''};
      if(args.includes('get-url'))return {status:0,stdout:'https://github.com/youdiangete-dot/novora-site.git'};
      if(args.includes('token'))return {status:0,stdout:JSON.stringify({token:fakeOidc})};
      if(args.includes('/v13/deployments'))return {status:0,stdout:JSON.stringify(deployment)};
      if(args.includes('/v13/deployments/'+id+'?withGitRepoInfo=true'))return {status:0,stdout:JSON.stringify(gitReadback)};
      if(args.includes('/v9/projects/'+claims.project_id)){projectReads++;assert.equal(options.diagnostic,true);return projectReads === 1 ? {status:0,stdout:JSON.stringify(gitProject)} : {status:1,stdout:secret,failure:{kind:'EXIT_NONZERO',exitCode:1,reportedHttpStatus:403,secret}};}
      throw Error('UNEXPECTED_FIXTURE_PROCESS');
    }, fetch:()=>{throw Error('UNEXPECTED_NETWORK');}};
  const sender=createSender({cwd:'fixture',cli:'fixture',sourceMode:'git_source',invitedIdentity:'m2_synthetic_fixture',expectedSourceSha:sha,deadline:1060000,now:()=>1000000,trustedAdapters:{revoke:async()=>true,cleanup:async()=>true}},io);
  assert.equal((await sender('prepare')).status,'PREPARED'); assert.equal((await sender('deploy')).status,'READBACK_REQUIRED');
  const r=await sender('attach',id);
  assert.deepEqual(r,{status:'READBACK_FAILED',reason:'GIT_PROJECT_TRANSPORT',stage:'GIT_PROJECT_READ',processOutcome:'EXIT_NONZERO',exitCode:1,reportedHttpStatus:403});
  assert.equal(JSON.stringify(r).includes(secret),false); assert.equal(projectReads,2); assert.equal((await sender('proof')).status,'DENIED');
  await sender('close');
});

test('project preflight failure stops before credentials and deployment and preserves redacted reason', async () => {
  let tokens=0, random=0, deployments=0, projectReads=0;
  const io={node:'fixture',environment:{},canonical:()=>true,randomBytes:()=>{random++;throw Error('unexpected')},verifyOidc:async()=>claims,
    run:async(_command,args)=>{
      if(args.includes('branch'))return {status:0,stdout:'integration/instant-first-preview-agent'};
      if(args.includes('rev-parse'))return {status:0,stdout:sha};
      if(args.includes('status'))return {status:0,stdout:''};
      if(args.includes('get-url'))return {status:0,stdout:'https://github.com/youdiangete-dot/novora-site.git'};
      if(args.includes('token')){tokens++;throw Error('unexpected')}
      if(args.includes('/v13/deployments')){deployments++;throw Error('unexpected')}
      if(args.includes('/v9/projects/'+claims.project_id)){projectReads++;return {status:1,failure:{kind:'EXIT_NONZERO',exitCode:1,reportedHttpStatus:403,raw:'fixture-secret'}}}
      throw Error('unexpected');
    }};
  const sender=createSender({cwd:'fixture',cli:'fixture',sourceMode:'git_source',invitedIdentity:'m2_synthetic_fixture',expectedSourceSha:sha,deadline:1060000,now:()=>1000000,trustedAdapters:{revoke:async()=>true,cleanup:async()=>true}},io);
  assert.deepEqual(await sender('prepare'),{status:'PREPARATION_FAILED',reason:'GIT_PROJECT_TRANSPORT',stage:'GIT_PROJECT_READ',processOutcome:'EXIT_NONZERO',exitCode:1,reportedHttpStatus:403});
  assert.equal((await sender('deploy')).status,'DENIED'); assert.deepEqual([projectReads,tokens,random,deployments],[1,0,0,0]);
  assert.deepEqual(await sender('close'),{status:'CLOSED',revoke:'NOT_REQUIRED',cleanup:'NOT_REQUIRED'});
});

test('repeated and concurrent close preserve actual unconfirmed shutdown result', async () => {
  const h = harness();
  await h.s.prepare(); await h.s.deploy();
  const [a,b]=await Promise.all([h.s.close(),h.s.close()]);
  assert.deepEqual(a,{status:'CLOSED',revoke:'NOT_REQUIRED',cleanup:'UNVERIFIED_TARGET'});
  assert.deepEqual(b,a); assert.deepEqual(await h.s.close(),a);
});

test('actual sender preserves only safe submission evidence for failure boundaries without replay', async () => {
  const bait='fixture_secret_never_serialize'; const publicReference='NOVORA-CB-20261028-AB12'; const conceptBriefId='123e4567-e89b-42d3-a456-426614174000';
  const good={persisted:true,publicReference,conceptBriefId,requestId:bait,unknown:bait};
  const cookie='__Host-novora_first_preview_access=e30.AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE; Secure';
  const cases=[
    ['success',{status:201,body:good,cookies:[cookie]},'SUBMITTED','CONFIRMED'],
    ['non-json',{status:502,jsonError:true},'SUBMISSION_UNCONFIRMED','JSON_INVALID'],
    ['http-error',{status:403,body:{...good},cookies:[cookie]},'SUBMISSION_UNCONFIRMED','HTTP_ERROR'],
    ['transport',{throws:true},'SUBMISSION_UNCONFIRMED','TRANSPORT_ERROR'],
    ['bad-receipt',{status:201,body:{...good,persisted:false},cookies:[cookie]},'SUBMISSION_UNCONFIRMED','RESPONSE_INVALID'],
    ['cookie-missing',{status:201,body:good,cookies:[]},'SUBMISSION_UNCONFIRMED','COOKIE_INVALID'],
    ['cookie-malformed',{status:201,body:good,cookies:['__Host-novora_first_preview_access='+bait+'; Secure']},'SUBMISSION_UNCONFIRMED','COOKIE_INVALID'],
    ['cookie-duplicate',{status:201,body:good,cookies:[cookie,cookie]},'SUBMISSION_UNCONFIRMED','COOKIE_INVALID'],
    ['expiry-after-response',{status:201,body:good,cookies:[cookie],expire:true},'SUBMISSION_UNCONFIRMED','SESSION_INACTIVE'],
    ['expiry-after-non-json',{status:201,jsonError:true,expire:true},'SUBMISSION_UNCONFIRMED','SESSION_INACTIVE'],
  ];
  for(const [name,fixture,status,stage] of cases){
    let time=1000000,submissions=0,correlations=0; const identity='m2_synthetic_fixture';
    const response=(code,body,cookies=[])=>({status:code,json:async()=>body,headers:{getSetCookie:()=>cookies}});
    const io={node:'fixture',environment:{},canonical:()=>true,randomBytes:n=>{if(n===16)correlations++;return Buffer.alloc(n,n===16?7:1)},verifyOidc:async()=>claims,
      run:async(_cmd,args)=>{if(args.includes('branch'))return {status:0,stdout:'integration/instant-first-preview-agent'};if(args.includes('rev-parse'))return {status:0,stdout:sha};if(args.includes('status'))return {status:0,stdout:''};if(args.includes('get-url'))return {status:0,stdout:'https://github.com/youdiangete-dot/novora-site.git'};if(args.includes('token'))return {status:0,stdout:JSON.stringify({token:fakeOidc})};if(args.includes('/v13/deployments'))return {status:0,stdout:JSON.stringify(deployment)};if(args.includes('/v13/deployments/'+id+'?withGitRepoInfo=true'))return {status:0,stdout:JSON.stringify(gitReadback)};if(args.includes('/v9/projects/'+claims.project_id))return {status:0,stdout:JSON.stringify(gitProject)};throw Error('unexpected')},
      fetch:async(address)=>{if(address.endsWith('preview-isolation-proof'))return response(200,{isolatedBackendVerified:true,m2Binding:{deploymentId:id,sourceSha:sha,runtimeBinding:runtime,ledgerKey:`novora:beta-admission:m2-e2e:v1:${runtime}`,authorityId:`m2e2e_${runtime.slice(0,56)}`}});if(!address.endsWith('/api/concept-briefs'))throw Error('unexpected');submissions++;if(fixture.throws)throw Error(bait);return {status:fixture.status,json:async()=>{if(fixture.expire)time=1060000;if(fixture.jsonError)throw Error(bait);return fixture.body},headers:{getSetCookie:()=>fixture.cookies??[]}}}};
    const sender=createSender({cwd:'fixture',cli:'fixture',sourceMode:'git_source',invitedIdentity:identity,expectedSourceSha:sha,deadline:1060000,now:()=>time,trustedAdapters:{revoke:async()=>true,cleanup:async()=>true}},io);
    assert.equal((await sender('prepare')).status,'PREPARED',name);await sender('deploy');assert.equal((await sender('attach',id)).status,'READONLY_RUNTIME_PROOF_PENDING');assert.equal((await sender('proof')).status,'BINDING_VERIFIED');assert.equal((await sender('observe_authority',fixtureObservation(identity))).status,'OPERATOR_OBSERVATION_RECORDED');assert.equal((await sender('arm')).status,'ARMED_FROM_OPERATOR_OBSERVATION');
    const result=await sender('submit',{fixture:true});assert.equal(result.status,status,name);assert.equal(result.stage,stage,name);if(name==='expiry-after-non-json')assert.equal(result.responseStage,'JSON_INVALID');assert.equal(result.correlationId,'07'.repeat(16),name);assert.equal(submissions,1);assert.equal(correlations,1);if(fixture.status)assert.equal(result.httpStatus,fixture.status);if(['cookie-missing','cookie-malformed','cookie-duplicate','expiry-after-response'].includes(name)){assert.equal(result.publicReference,publicReference);assert.equal(result.conceptBriefId,conceptBriefId)}assert.equal(JSON.stringify(result).includes(bait),false);assert.equal(JSON.stringify(result).includes('AQEBA'),false);assert.equal((await sender('submit',{})).status,'DENIED');await sender('destroy');const checkpoint=await sender('checkpoint');assert.equal(checkpoint.submissionSummary.correlationId,result.correlationId);assert.equal(checkpoint.submissionSummary.stage,stage);if(name==='expiry-after-non-json')assert.equal(checkpoint.submissionSummary.responseStage,'JSON_INVALID');assert.equal(JSON.stringify(checkpoint).includes(bait),false);await sender('close');
  }
});

test('local correlation is available before I/O and cannot be reused after uncertainty', async () => {
  const pending=deferred(),started=deferred();const h=harness({submit:async()=>{started.resolve();return pending.promise}});await armed(h.s);const work=h.s.submit({});await started.promise;const checkpoint=h.s.checkpoint();assert.equal(checkpoint.submissionSummary.correlationId,'a'.repeat(32));assert.equal(checkpoint.submissionSummary.stage,'TRANSPORT_UNKNOWN');h.s.destroy();pending.resolve({confirmed:false,stage:'HTTP_ERROR',httpStatus:503,publicReference:'NOVORA-CB-20261028-AB12'});const result=await work;assert.equal(result.stage,'SESSION_INACTIVE');assert.equal(result.httpStatus,503);assert.equal(h.s.checkpoint().submissionSummary.correlationId,'a'.repeat(32));assert.equal((await h.s.submit({})).status,'DENIED');await h.s.close();
});

test('invalid local correlation prevents submission and remains nonsecret', async () => {
  let calls=0;const h=harness({newCorrelation:async()=> 'fixture_secret_not_a_correlation',submit:async()=>{calls++;throw Error('unexpected')}});await armed(h.s);const r=await h.s.submit({});assert.deepEqual(r,{status:'SUBMISSION_UNCONFIRMED',stage:'CORRELATION_UNAVAILABLE'});assert.equal(calls,0);assert.equal((await h.s.submit({})).status,'DENIED');h.s.destroy();assert.equal(h.s.checkpoint().submissionSummary.stage,'CORRELATION_UNAVAILABLE');await h.s.close();
});

test('caller does not accept contradictory status as success or serialize untrusted fields', async () => {
  const secret='fixture_secret_never_serialize';const h=harness({submit:async()=>({confirmed:true,httpStatus:503,publicReference:{toString:()=> 'NOVORA-CB-20261028-AB12',secret},conceptBriefId:'123e4567-e89b-42d3-a456-426614174000',cookie:secret,stage:'untrusted '+secret})});await armed(h.s);const r=await h.s.submit({});assert.equal(r.status,'SUBMISSION_UNCONFIRMED');assert.equal(r.stage,'RECEIPT_INVALID');assert.equal(r.httpStatus,503);assert.equal(Object.hasOwn(r,'publicReference'),false);assert.equal(JSON.stringify(r).includes(secret),false);assert.equal((await h.s.submit({})).status,'DENIED');await h.s.close();
});
