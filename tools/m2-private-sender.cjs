'use strict';

// The original sender's CLI and HTTP operations, wired to the corrected
// operator. Importing this module performs no I/O. The trusted host supplies
// revoke/cleanup operations; authority observations arrive as control messages.
const cp = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { createOperator, createOfflineFixtureOperator } = require('./m2-preview-operator.cjs');
const project = 'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg';
const team = 'team_9VhRPiCaRc62kna4XyNKvPZ7';
const branch = 'integration/instant-first-preview-agent';
const gitOrg = 'youdiangete-dot', gitRepo = 'novora-site';

function buildGitSourceDeployment({ identity, credentialSha256, sourceSha }) {
  if (!/^m2_synthetic_[A-Za-z0-9_-]{1,51}$/.test(identity ?? '') || !/^[a-f0-9]{64}$/.test(credentialSha256 ?? '') || !/^[a-f0-9]{40}$/.test(sourceSha ?? '')) throw new Error('GIT_REQUEST_INVALID');
  const env = { NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([{ identity, credentialSha256 }]), NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: 'true', NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: 'true' };
  return { name: 'project-dd34e', project, gitSource: { type: 'github', org: gitOrg, repo: gitRepo, ref: branch, sha: sourceSha }, env, build: { env: { ...env } } };
}

function verifyGitSourceDeployment(d, p, deploymentId, sourceSha) {
  if (!d || typeof d !== 'object' || !p || typeof p !== 'object' || !p.link || typeof p.link !== 'object') throw new Error('GIT_SOURCE_SCHEMA');
  if ((d.id ?? d.uid) !== deploymentId || (d.id && d.uid && d.id !== d.uid)) throw new Error('GIT_DEPLOYMENT_ID');
  if (d.projectId !== project || (d.teamId ?? d.ownerId) !== team || p.id !== project) throw new Error('GIT_PROJECT');
  if (d.target !== null) throw new Error('GIT_TARGET');
  if (!['QUEUED', 'INITIALIZING', 'BUILDING', 'READY', 'ERROR', 'CANCELED', 'BLOCKED'].includes(d.readyState)) throw new Error('GIT_STATE');
  if (!d.gitSource && ['QUEUED', 'INITIALIZING', 'BUILDING'].includes(d.readyState)) return { id: deploymentId, projectId: project, teamId: team, target: 'preview', readyState: d.readyState, url: d.url, sourceEvidence: 'pending_unverified' };
  if (!d.gitSource && ['ERROR', 'CANCELED', 'BLOCKED'].includes(d.readyState)) return { id: deploymentId, projectId: project, teamId: team, target: 'preview', readyState: d.readyState, url: d.url, sourceEvidence: 'terminal_unverified' };
  if (!d.gitSource || typeof d.gitSource !== 'object') throw new Error('GIT_SOURCE_SCHEMA');
  const link = p.link, src = d.gitSource;
  const has = (object, field) => Object.hasOwn(object, field);
  const validId = (value) => (typeof value === 'string' && /^[1-9][0-9]*$/.test(value)) || (Number.isSafeInteger(value) && value > 0);
  const hasOrg = has(src, 'org'), hasRepo = has(src, 'repo'), hasId = has(src, 'repoId');
  if (link.type !== 'github' || link.org !== gitOrg || link.repo !== gitRepo || src.type !== 'github' || has(src, 'owner') || has(src, 'slug')) throw new Error('GIT_REPOSITORY');
  if (hasOrg !== hasRepo || (hasOrg && (src.org !== gitOrg || src.repo !== gitRepo)) || (!hasOrg && !hasId)) throw new Error('GIT_REPOSITORY');
  if ((has(link, 'repoId') && !validId(link.repoId)) || (hasId && (!validId(src.repoId) || !validId(link.repoId) || String(src.repoId) !== String(link.repoId)))) throw new Error('GIT_REPOSITORY');
  if (src.ref !== branch) throw new Error('GIT_REF');
  if (src.sha !== sourceSha) throw new Error('GIT_SHA');
  if ((d.meta?.githubCommitSha != null && d.meta.githubCommitSha !== sourceSha) || (d.meta?.githubCommitRef != null && d.meta.githubCommitRef !== branch) || (d.meta?.githubOrg != null && d.meta.githubOrg !== gitOrg) || (d.meta?.githubRepo != null && d.meta.githubRepo !== gitRepo)) throw new Error('GIT_METADATA_CONFLICT');
  const host = d.url;
  const url = typeof host === 'string' && /^[a-z0-9-]+\.vercel\.app$/.test(host) ? 'https://' + host : host;
  return { id: deploymentId, url, projectId: project, teamId: team, branch, sourceSha, target: 'preview', readyState: d.readyState, sourceEvidence: 'platform_git_source_v1', sourceVerified: false };
}

// The CLI reads <checkout>/.git/config directly. A worktree's .git file is
// not a canonical checkout and does not supply that metadata to this CLI.
function canonicalGitDirectory(cwd, lstat = fs.lstatSync) {
  try { return lstat(path.join(cwd, '.git')).isDirectory(); } catch { return false; }
}

// The API returns a top-level array of file-tree entries. A real `src` folder
// is an ordinary path component, not an assumed transport wrapper.
function manifestPaths(expected, roots) {
  if (!(expected instanceof Map) || expected.size === 0 || !Array.isArray(roots)) throw new Error('MANIFEST_SCHEMA');
  const seen = new Map(), directories = new Set();
  function visit(node, prefix) {
    if (!node || typeof node !== 'object' || typeof node.name !== 'string') throw new Error('MANIFEST_SCHEMA');
    const name = node.name;
    if (!name || name === '.' || name === '..' || /[\\/\0]/.test(name)) throw new Error('MANIFEST_PATH');
    const relative = prefix ? `${prefix}/${name}` : name;
    if (seen.has(relative) || directories.has(relative)) throw new Error('MANIFEST_PATH');
    if (node.type === 'directory') { if (!Array.isArray(node.children)) throw new Error('MANIFEST_SCHEMA'); directories.add(relative); for (const child of node.children) visit(child, relative); return; }
    if (node.type !== 'file' || typeof node.uid !== 'string' || !node.uid || /[\0]/.test(node.uid)) throw new Error('MANIFEST_SCHEMA');
    seen.set(relative, node.uid);
  }
  for (const node of roots) visit(node, '');
  if (seen.size !== expected.size) throw new Error('MANIFEST_COUNT');
  const matches = (map) => [...expected.keys()].every((name) => map.has(name));
  const direct = matches(seen);
  const wrapped = roots.length === 1 && roots[0]?.type === 'directory' && roots[0]?.name === 'src'
    ? new Map([...seen].map(([name, uid]) => [name.startsWith('src/') ? name.slice(4) : '', uid])) : null;
  const wrapperMatches = wrapped !== null && matches(wrapped);
  if (direct === wrapperMatches) throw new Error('MANIFEST_PATH');
  return direct ? seen : wrapped;
}

// A complete set of independently obtained bytes is required; identifiers
// alone are not evidence of content. This does not perform or authorize I/O.
function manifestContentMatches(expected, contents) {
  if (!(expected instanceof Map) || !(contents instanceof Map) || contents.size !== expected.size) return false;
  for (const [name, digest] of expected) {
    const bytes = contents.get(name);
    if (!Buffer.isBuffer(bytes) || crypto.createHash('sha1').update(bytes).digest('hex') !== digest) return false;
  }
  return true;
}

// Retain only bounded, fixed diagnostics. Raw stderr stays inside this call and
// is never returned, logged or attached to an exception.
function runProcess(command, args, options, cwd, spawn = cp.spawn) {
  return new Promise((resolve) => {
    let child;
    try { child = spawn(command, args, { cwd, windowsHide: true, env: options.env, stdio: [options.input === undefined ? 'ignore' : 'pipe', 'pipe', options.diagnostic ? 'pipe' : 'ignore'] }); }
    catch { resolve({ status: null, stdout: '', ...(options.diagnostic ? { failure: { kind: 'SPAWN_ERROR' } } : {}) }); return; }
    if (options.input !== undefined) { child.stdin.on('error', () => {}); child.stdin.end(options.input); }
    let stdout = '', stderr = '', overflow = false, stderrOverflow = false, timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; child.kill(); }, options.timeout ?? 120000);
    child.stdout.setEncoding('utf8');
    const limit = options.maxBuffer ?? 1024 * 1024;
    child.stdout.on('data', chunk => { if (stdout.length + chunk.length > limit) { overflow = true; child.kill(); } else stdout += chunk; });
    if (options.diagnostic && child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', chunk => { if (stderr.length + chunk.length > 8192) { stderrOverflow = true; stderr = ''; } else if (!stderrOverflow) stderr += chunk; });
    }
    child.on('error', () => { clearTimeout(timeout); resolve({ status: null, stdout: '', ...(options.diagnostic ? { failure: { kind: 'SPAWN_ERROR' } } : {}) }); });
    child.on('close', (status, signal) => {
      clearTimeout(timeout);
      if (!options.diagnostic) { resolve({ status: overflow || timedOut ? null : status, stdout: overflow || timedOut ? '' : stdout }); return; }
      if (status === 0 && !timedOut && !overflow) { resolve({ status, stdout }); return; }
      const kind = timedOut ? 'TIMEOUT' : overflow ? 'STDOUT_LIMIT' : stderrOverflow ? 'STDERR_LIMIT' : Number.isInteger(status) ? 'EXIT_NONZERO' : signal ? 'SIGNALLED' : 'UNKNOWN';
      const failure = { kind, ...(Number.isInteger(status) && status >= 1 && status <= 255 ? { exitCode: status } : {}) };
      if (!stderrOverflow && stderr) {
        try { const value = JSON.parse(stderr); const reported = value?.error?.status ?? value?.status; if (Number.isInteger(reported) && reported >= 400 && reported <= 599) failure.reportedHttpStatus = reported; } catch { /* no inferred status from arbitrary text */ }
      }
      resolve({ status: overflow || timedOut ? null : status, stdout: '', failure });
    });
  });
}

function projectTransportFailure(result) {
  const error = new Error('GIT_PROJECT_TRANSPORT');
  const allowed = new Set(['TIMEOUT','STDOUT_LIMIT','STDERR_LIMIT','SPAWN_ERROR','EXIT_NONZERO','SIGNALLED','UNKNOWN']);
  const f = result?.failure;
  error.diagnostic = { stage: 'GIT_PROJECT_READ', processOutcome: allowed.has(f?.kind) ? f.kind : 'UNKNOWN',
    ...(Number.isInteger(f?.exitCode) && f.exitCode >= 1 && f.exitCode <= 255 ? { exitCode: f.exitCode } : {}),
    ...(Number.isInteger(f?.reportedHttpStatus) && f.reportedHttpStatus >= 400 && f.reportedHttpStatus <= 599 ? { reportedHttpStatus: f.reportedHttpStatus } : {}) };
  return error;
}

async function cliSelection(cwd, cli) {
  // This path is part of the pinned, installed CLI 58.5.1 bundle. No CLI
  // command, authentication, file hashing, or network request is run here.
  const root = path.dirname(cli);
  const version = JSON.parse(fs.readFileSync(path.join(root, '..', 'package.json'), 'utf8')).version;
  if (version !== '58.5.1') throw new Error('CLI_VERSION_UNSUPPORTED');
  if (['.vercelignore', '.nowignore', '.vercel/routes.json'].some((name) => fs.existsSync(path.join(cwd, name)))) throw new Error('CLI_SELECTION_UNSUPPORTED');
  const { pathToFileURL } = require('node:url');
  const bundle = await import(pathToFileURL(path.join(root, 'chunks', 'chunk-LXRK7KPA.js')).href);
  const { fileList } = await bundle.require_dist().buildFileTree(cwd, { isDirectory: true }, () => {});
  return fileList;
}

function createSender(config, fixtureIO) {
  if (!/^m2_synthetic_[A-Za-z0-9_-]{1,51}$/.test(config.invitedIdentity ?? '')) throw new Error('APPROVED_IDENTITY_REQUIRED');
  if (config.sourceMode != null && !['cli_upload', 'git_source'].includes(config.sourceMode)) throw new Error('SOURCE_MODE_INVALID');
  const sourceMode = config.sourceMode ?? 'cli_upload';
  const io = fixtureIO || {
    run: (command, args, options) => runProcess(command, args, options, config.cwd),
    randomBytes: (n) => crypto.randomBytes(n),
    fetch: (...args) => fetch(...args),
    environment: process.env,
    node: process.execPath,
    canonical: (cwd) => canonicalGitDirectory(cwd),
    select: (cwd) => cliSelection(cwd, config.cli),
    file: (filename) => { const stat = fs.lstatSync(filename); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('UNSAFE_SOURCE'); return fs.readFileSync(filename); },
  };
  if (typeof io.canonical !== 'function' || !io.canonical(config.cwd)) throw new Error('CANONICAL_CHECKOUT_REQUIRED');
  const trusted = config.trustedAdapters || {};
  if (['revoke', 'cleanup'].some((name) => typeof trusted[name] !== 'function')) throw new Error('TRUSTED_ADAPTERS_REQUIRED');
  if (trusted.handoffBinding != null && typeof trusted.handoffBinding !== 'function') throw new Error('TRUSTED_ADAPTERS_REQUIRED');
  let expectedManifest = null;
  async function verifySource({ sourceSha, isActive }) {
      const currentBranch = await io.run('git', ['branch', '--show-current'], {});
      if (!isActive()) throw new Error('SESSION_INACTIVE');
      const head = await io.run('git', ['rev-parse', 'HEAD'], {});
      if (!isActive()) throw new Error('SESSION_INACTIVE');
      const status = await io.run('git', ['status', '--porcelain'], {});
      if (!isActive()) throw new Error('SESSION_INACTIVE');
      if (currentBranch.status !== 0 || head.status !== 0 || status.status !== 0 || currentBranch.stdout.trim() !== branch || head.stdout.trim() !== sourceSha || status.stdout.trim()) throw new Error('SOURCE_MISMATCH');
      const remote = await io.run('git', ['remote', 'get-url', 'origin'], {});
      if (!isActive()) throw new Error('SESSION_INACTIVE');
      if (remote.status !== 0 || !/^(?:https:\/\/github\.com\/youdiangete-dot\/novora-site(?:\.git)?|git@github\.com:youdiangete-dot\/novora-site(?:\.git)?)$/.test(remote.stdout.trim())) throw new Error('SOURCE_REMOTE_MISMATCH');
      if (sourceMode === 'git_source') return;
      const tracked = await io.run('git', ['ls-tree', '-r', '-z', sourceSha], { maxBuffer: 10485760 });
      if (!isActive() || tracked.status !== 0 || typeof tracked.stdout !== 'string' || !tracked.stdout.endsWith('\0')) throw new Error('SOURCE_MANIFEST_FAILED');
      const entries = tracked.stdout.slice(0, -1).split('\0');
      if (entries.length === 0 || entries.length > 20000) throw new Error('SOURCE_MANIFEST_FAILED');
      const trackedFiles = new Map();
      for (const entry of entries) {
        const parsed = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(entry);
        if (!parsed) throw new Error('SOURCE_MANIFEST_FAILED');
        const [, , gitBlob, name] = parsed;
        if (!name || name.startsWith('/') || name.includes('\\') || name.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('SOURCE_MANIFEST_FAILED');
        if (trackedFiles.has(name)) throw new Error('SOURCE_MANIFEST_FAILED');
        trackedFiles.set(name, gitBlob);
      }
      const selected = await io.select(config.cwd);
      if (!isActive() || !Array.isArray(selected) || !selected.length) throw new Error('CLI_SELECTION_FAILED');
      const manifest = new Map();
      for (const filename of selected) {
        if (typeof filename !== 'string') throw new Error('CLI_SELECTION_FAILED');
        const name = path.relative(config.cwd, filename).split(path.sep).join('/');
        if (!name || path.isAbsolute(name) || name.split('/').some((part) => !part || part === '.' || part === '..') || !trackedFiles.has(name) || manifest.has(name)) throw new Error('CLI_SELECTION_UNTRACKED');
        const base = name.split('/').at(-1).toLowerCase();
        if ((/^\.env(?:\..*)?$/.test(base) && base !== '.env.example') || ['.npmrc', '.pypirc', '.netrc', 'id_rsa', 'id_ed25519'].includes(base) || /\.(?:pem|p12|pfx|key)$/.test(base)) throw new Error('CLI_SELECTION_SENSITIVE');
        const gitBlob = trackedFiles.get(name);
        const bytes = io.file(path.join(config.cwd, ...name.split('/')));
        if (!Buffer.isBuffer(bytes) || manifest.has(name)) throw new Error('SOURCE_MANIFEST_FAILED');
        const actualBlob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
        if (actualBlob !== gitBlob) throw new Error('SOURCE_MANIFEST_FAILED');
        manifest.set(name, crypto.createHash('sha1').update(bytes).digest('hex'));
      }
      if (manifest.size === 0) throw new Error('SOURCE_MANIFEST_FAILED');
      if (!isActive()) throw new Error('SESSION_INACTIVE');
      expectedManifest = manifest;
  }
  async function readProject() {
    const r = await io.run(io.node, [config.cli, 'api', '/v9/projects/' + project, '--scope', team, '--raw'], { timeout: 30000, diagnostic: true });
    if (r.status !== 0) throw projectTransportFailure(r);
    let p; try { p = JSON.parse(r.stdout); } catch { throw new Error('GIT_SOURCE_SCHEMA'); }
    if (!p || typeof p !== 'object' || !p.link || typeof p.link !== 'object') throw new Error('GIT_SOURCE_SCHEMA');
    if (p.id !== project) throw new Error('GIT_PROJECT');
    const link = p.link;
    if (link.type !== 'github' || link.org !== gitOrg || link.repo !== gitRepo || (Object.hasOwn(link, 'repoId') && !((typeof link.repoId === 'string' && /^[1-9][0-9]*$/.test(link.repoId)) || (Number.isSafeInteger(link.repoId) && link.repoId > 0)))) throw new Error('GIT_REPOSITORY');
    return p;
  }
  const adapters = {
    async preflight(options) { await verifySource(options); if (sourceMode === 'git_source') { await readProject(); if (!options.isActive()) throw new Error('SESSION_INACTIVE'); } },
    async prepare() {
      const result = await io.run(io.node, [config.cli, 'project', 'token', project, '--format=json', '--scope', team], { timeout: 30000 });
      if (result.status !== 0) throw new Error('OIDC_UNAVAILABLE');
      const token = JSON.parse(result.stdout).token;
      return { oidc: token };
    },
    async generate() { return { bearer: io.randomBytes(32).toString('base64url'), identity: config.invitedIdentity, idempotencyKey: io.randomBytes(24).toString('base64url') }; },
    async deploy({ identity, credentialSha256, sourceSha, isActive }) {
      await verifySource({ sourceSha, isActive });
      if (!isActive()) throw new Error('SESSION_INACTIVE');
      if (sourceMode === 'git_source') {
        const body = buildGitSourceDeployment({ identity, credentialSha256, sourceSha });
        const result = await io.run(io.node, [config.cli, 'api', '/v13/deployments', '--method', 'POST', '--input', '-', '--scope', team, '--raw'], { input: JSON.stringify(body), timeout: 180000 });
        return { exitCode: result.status, stdout: result.stdout };
      }
      const env = { ...io.environment, NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([{ identity, credentialSha256 }]), NOVORA_INSTANT_PREVIEW_AGENT_ENABLED: 'true', NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED: 'true' };
      const result = await io.run(io.node, [config.cli, 'deploy', '--project', project, '--scope', team, '--yes', '--no-wait', '--json', '--env', 'NOVORA_BETA_INVITATIONS_JSON', '--env', 'NOVORA_INSTANT_PREVIEW_AGENT_ENABLED', '--env', 'NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED', '--meta', 'githubDeployment=1', '--meta', 'githubCommitRef=' + branch], { env, timeout: 180000 });
      return { exitCode: result.status, stdout: result.stdout };
    },
    async readDeployment(id) {
      if (!/^dpl_[A-Za-z0-9]{16,80}$/.test(id)) throw new Error('INVALID_DEPLOYMENT');
      const deploymentPath = '/v13/deployments/' + id + (sourceMode === 'git_source' ? '?withGitRepoInfo=true' : '');
      const result = await io.run(io.node, [config.cli, 'api', deploymentPath, '--scope', team, '--raw'], { timeout: 30000 });
      if (result.status !== 0) throw new Error('DEPLOYMENT_TRANSPORT');
      let d; try { d = JSON.parse(result.stdout); } catch { throw new Error('DEPLOYMENT_SCHEMA'); }
      if (!d || typeof d !== 'object' || (d.id && d.uid && d.id !== d.uid)) throw new Error('DEPLOYMENT_SCHEMA');
      if (sourceMode === 'git_source') {
        const p = await readProject();
        return verifyGitSourceDeployment(d, p, id, config.expectedSourceSha);
      }
      const host = d.url;
      const url = typeof host === 'string' && /^[a-z0-9-]+\.vercel\.app$/.test(host) ? 'https://' + host : host;
      if (!expectedManifest) throw new Error('SOURCE_MANIFEST_FAILED');
      const files = await io.run(io.node, [config.cli, 'api', '/v6/deployments/' + id + '/files', '--scope', team, '--raw'], { timeout: 30000, maxBuffer: 10485760 });
      if (files.status !== 0) throw new Error('MANIFEST_TRANSPORT');
      let uploaded;
      try { uploaded = JSON.parse(files.stdout); } catch { throw new Error('MANIFEST_SCHEMA'); }
      manifestPaths(expectedManifest, uploaded);
      // The documented API treats uid as an opaque identifier, not a digest;
      // its content-response JSON fields and complete-read budget are not yet
      // established. Never treat matching identifiers or a sample as proof.
      throw new Error('MANIFEST_CONTENT_UNAVAILABLE');
    },
    revoke: trusted.revoke,
    cleanup: trusted.cleanup,
    handoffBinding: trusted.handoffBinding,
    async proof({ origin, oidc }) {
      let response;
      try { response = await io.fetch(origin + '/api/admin/preview-isolation-proof', { headers: { 'x-vercel-trusted-oidc-idp-token': oidc, Authorization: 'Bearer ' + oidc }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000) }); }
      catch { return { failure: 'TRANSPORT_FAILURE' }; }
      const status = Number.isInteger(response?.status) && response.status >= 100 && response.status <= 599 ? response.status : null;
      if (status === null) return { failure: 'HTTP_SCHEMA_FAILURE' };
      if (status !== 200) {
        const result = { failure: status === 401 || status === 403 ? 'AUTHORIZATION_DENIED' : status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR', httpStatus: status };
        // The endpoint's 503 contract can report isolation failure. A platform
        // 503 can have another shape, so this is reported evidence, not proof.
        if (status === 503) {
          try { const body = await response.json(); if (body && typeof body === 'object' && !Array.isArray(body) && body.isolatedBackendVerified === false) result.isolationReport = 'REPORTED_FALSE'; } catch { /* retain the HTTP failure */ }
        }
        return result;
      }
      let body;
      try { body = await response.json(); } catch { return { failure: 'JSON_FAILURE', httpStatus: status }; }
      if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.isolatedBackendVerified !== 'boolean' || (Object.hasOwn(body, 'authorized') && body.authorized !== true)) return { failure: 'SCHEMA_FAILURE', httpStatus: status };
      // This endpoint emits 200 only after its inbound OIDC authorization check.
      // Copy only fields needed by the caller, never arbitrary response data.
      const fields = ['deploymentIdValid', 'sourceShaValid', 'authorityValid', 'invitationValid', 'targetValid'];
      const diagnostics = {};
      if (body.m2BindingDiagnostics && typeof body.m2BindingDiagnostics === 'object' && !Array.isArray(body.m2BindingDiagnostics)) {
        for (const field of fields) if (typeof body.m2BindingDiagnostics[field] === 'boolean') diagnostics[field] = body.m2BindingDiagnostics[field];
      }
      const b = body.m2Binding;
      return { authorized: true, httpStatus: status, isolatedBackendVerified: body.isolatedBackendVerified,
        ...(b && typeof b === 'object' && !Array.isArray(b) ? { m2Binding: { deploymentId: b.deploymentId, sourceSha: b.sourceSha, runtimeBinding: b.runtimeBinding, ledgerKey: b.ledgerKey, authorityId: b.authorityId } } : {}),
        ...(Object.keys(diagnostics).length ? { m2BindingDiagnostics: diagnostics } : {}) };
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
  const sessionConfig = { adapters, expectedSourceSha: config.expectedSourceSha, deadline: config.deadline, now: config.now, sourceMode };
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
module.exports = { createSender, attachPrivateProtocol, canonicalGitDirectory, manifestPaths, manifestContentMatches, cliSelection, buildGitSourceDeployment, verifyGitSourceDeployment, runProcess };
