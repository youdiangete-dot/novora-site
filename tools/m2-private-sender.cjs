'use strict';

// The original sender's CLI and HTTP operations, wired to the corrected
// operator. Importing this module performs no I/O. The trusted host supplies
// revoke/cleanup operations; authority observations arrive as control messages.
const cp = require('node:child_process');
const crypto = require('node:crypto');
const readline = require('node:readline');
const { createOperator, createOfflineFixtureOperator } = require('./m2-preview-operator.cjs');
const project = 'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg';
const team = 'team_9VhRPiCaRc62kna4XyNKvPZ7';
const branch = 'integration/instant-first-preview-agent';

function createSender(config, fixtureIO) {
  if (!/^m2_synthetic_[A-Za-z0-9_-]{1,51}$/.test(config.invitedIdentity ?? '')) throw new Error('APPROVED_IDENTITY_REQUIRED');
  const io = fixtureIO || {
    run: (command, args, options) => new Promise((resolve) => {
      const child = cp.spawn(command, args, { cwd: config.cwd, windowsHide: true, env: options.env, stdio: ['ignore', 'pipe', 'ignore'] });
      let stdout = '', overflow = false;
      const timeout = setTimeout(() => { child.kill(); }, options.timeout ?? 120000);
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { if (stdout.length + chunk.length > 1024 * 1024) { overflow = true; child.kill(); } else stdout += chunk; });
      child.on('error', () => { clearTimeout(timeout); resolve({ status: null, stdout: '' }); });
      child.on('close', (status) => { clearTimeout(timeout); resolve({ status: overflow ? null : status, stdout: overflow ? '' : stdout }); });
    }),
    randomBytes: (n) => crypto.randomBytes(n),
    fetch: (...args) => fetch(...args),
    environment: process.env,
    node: process.execPath,
  };
  const trusted = config.trustedAdapters || {};
  if (['revoke', 'cleanup'].some((name) => typeof trusted[name] !== 'function')) throw new Error('TRUSTED_ADAPTERS_REQUIRED');
  const adapters = {
    async prepare() {
      const result = await io.run(io.node, [config.cli, 'project', 'token', project, '--format=json', '--scope', team], { timeout: 30000 });
      if (result.status !== 0) throw new Error('OIDC_UNAVAILABLE');
      const token = JSON.parse(result.stdout).token;
      return { oidc: token };
    },
    async generate() { return { bearer: io.randomBytes(32).toString('base64url'), identity: config.invitedIdentity, idempotencyKey: io.randomBytes(24).toString('base64url') }; },
    async deploy({ identity, credentialSha256, sourceSha, isActive }) {
      const currentBranch = await io.run('git', ['branch', '--show-current'], {});
      if (!isActive()) throw new Error('SESSION_INACTIVE');
      const head = await io.run('git', ['rev-parse', 'HEAD'], {});
      if (!isActive()) throw new Error('SESSION_INACTIVE');
      const status = await io.run('git', ['status', '--porcelain'], {});
      if (!isActive()) throw new Error('SESSION_INACTIVE');
      if (currentBranch.status !== 0 || head.status !== 0 || status.status !== 0 || currentBranch.stdout.trim() !== branch || head.stdout.trim() !== sourceSha || status.stdout.trim()) throw new Error('SOURCE_MISMATCH');
      const env = { ...io.environment, NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([{ identity, credentialSha256 }]), NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: 'true', NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: 'true' };
      const result = await io.run(io.node, [config.cli, 'deploy', '--project', project, '--scope', team, '--yes', '--no-wait', '--json', '--env', 'NOVORA_BETA_INVITATIONS_JSON', '--env', 'NOVORA_INSTANT_PREVIEW_AGENT_ENABLED', '--env', 'NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED', '--meta', 'githubDeployment=1', '--meta', 'githubCommitRef=' + branch], { env, timeout: 180000 });
      return { exitCode: result.status, stdout: result.stdout };
    },
    async readDeployment(id) {
      if (!/^dpl_[A-Za-z0-9]{16,80}$/.test(id)) throw new Error('INVALID_DEPLOYMENT');
      const result = await io.run(io.node, [config.cli, 'api', '/v13/deployments/' + id, '--scope', team, '--raw'], { timeout: 30000 });
      if (result.status !== 0) throw new Error('READBACK_FAILED');
      const d = JSON.parse(result.stdout);
      if (!d || typeof d !== 'object' || (d.id && d.uid && d.id !== d.uid)) throw new Error('READBACK_FAILED');
      const host = d.url;
      const url = typeof host === 'string' && /^[a-z0-9-]+\.vercel\.app$/.test(host) ? 'https://' + host : host;
      return { id: d.id ?? d.uid, url, projectId: d.projectId, teamId: d.teamId ?? d.ownerId, target: d.target === null ? 'preview' : d.target, readyState: d.readyState, branch: d.meta?.githubCommitRef, sourceSha: d.meta?.githubCommitSha, sourceVerified: false };
    },
    revoke: trusted.revoke,
    cleanup: trusted.cleanup,
    async proof({ origin, oidc }) {
      const response = await io.fetch(origin + '/api/admin/preview-isolation-proof', { headers: { 'x-vercel-trusted-oidc-idp-token': oidc, Authorization: 'Bearer ' + oidc }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000) });
      if (!response.ok) return {};
      return { ...(await response.json()), authorized: true };
    },
    async submit({ origin, path, bearer, oidc, idempotencyKey, payload }) {
      const response = await io.fetch(origin + path, { method: 'POST', headers: { 'x-vercel-trusted-oidc-idp-token': oidc, Authorization: 'Bearer ' + bearer, 'Idempotency-Key': idempotencyKey, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000) });
      const body = await response.json();
      const found = (response.headers.getSetCookie?.() ?? []).find((v) => v.startsWith('__Host-novora_first_preview_access='));
      return { confirmed: response.status === 201 && body.persisted === true && Boolean(found), publicReference: body.publicReference, conceptBriefId: body.conceptBriefId, cookie: found?.split(';', 1)[0] };
    },
    async asset({ origin, publicReference, cookie, oidc }) {
      const response = await io.fetch(origin + '/api/first-preview-assets/' + encodeURIComponent(publicReference) + '/current', { headers: { 'x-vercel-trusted-oidc-idp-token': oidc, ...(cookie ? { Cookie: cookie } : {}) }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000) });
      return { status: response.status, contentType: response.headers.get('content-type'), ...(response.status === 200 ? { bytes: Buffer.from(await response.arrayBuffer()) } : {}) };
    },
  };
  const sessionConfig = { adapters, expectedSourceSha: config.expectedSourceSha, deadline: config.deadline, now: config.now };
  if (fixtureIO) {
    adapters.verifyOidc = fixtureIO.verifyOidc;
    return createOfflineFixtureOperator(sessionConfig);
  }
  return createOperator(sessionConfig);
}
// Same line-oriented private control protocol as the preserved sender. The
// caller owns the private streams and lifecycle; lines are never echoed.
function attachPrivateProtocol(sender, input, output) {
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  lines.on('line', async (line) => {
    let result;
    try {
      const message = JSON.parse(line);
      result = message && typeof message.op === 'string' ? await sender(message.op, message.value) : { status: 'FAILED_SANITIZED' };
    } catch { result = { status: 'FAILED_SANITIZED' }; }
    output.write(JSON.stringify(result) + '\n');
  });
  return lines;
}
module.exports = { createSender, attachPrivateProtocol };
