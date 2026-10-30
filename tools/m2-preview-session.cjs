'use strict';

// Private orchestration core. It performs no I/O without injected, trusted
// adapters. Adapters must keep credentials in memory and never log them.
const { createHash } = require('node:crypto');

const PROJECT = 'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg';
const TEAM = 'team_9VhRPiCaRc62kna4XyNKvPZ7';
const BRANCH = 'integration/instant-first-preview-agent';
const ID = /^dpl_[A-Za-z0-9]{16,80}$/;
const SHA = /^[a-f0-9]{64}$/;

function origin(value) {
  if (typeof value !== 'string') return null;
  try {
    const hostOnly = /^project-dd34e-[a-z0-9-]+-novoradesign\.vercel\.app$/.test(value);
    const url = new URL(hostOnly ? `https://${value}` : value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.port && url.pathname === '/' && !url.search && !url.hash &&
      /^project-dd34e-[a-z0-9-]+-novoradesign\.vercel\.app$/.test(url.hostname)
      ? url.origin : null;
  } catch { return null; }
}

// Vercel CLI 58.5.1 emits either a deployment object or, in non-interactive
// mode, an envelope with a deployment property. Return no raw CLI output.
function parseDeployment(result) {
  if (!result || result.exitCode !== 0) return { ok: false, reason: 'CLI_ERROR', exitCode: Number.isInteger(result?.exitCode) ? result.exitCode : null };
  let value;
  try { value = JSON.parse(result.stdout); } catch { return { ok: false, reason: 'OUTPUT_PARSE_ERROR' }; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, reason: 'OUTPUT_SHAPE_ERROR' };
  const wrapper = Object.hasOwn(value, 'deployment') ? 'envelope' : 'direct';
  if (wrapper === 'envelope' && (Object.hasOwn(value, 'id') || (value.status != null && value.status !== 'success'))) return { ok: false, reason: 'OUTPUT_SHAPE_ERROR' };
  const entry = wrapper === 'envelope' ? value.deployment : value;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { ok: false, reason: 'OUTPUT_SHAPE_ERROR' };
  if (!ID.test(entry.id ?? '')) return { ok: false, reason: 'DEPLOYMENT_ID_ERROR', idPresent: typeof entry.id === 'string' };
  const targetOrigin = origin(entry.url);
  if (!targetOrigin) return { ok: false, reason: 'DEPLOYMENT_URL_ERROR', deploymentId: entry.id, wrapper, urlCategory: entry.url == null ? 'missing' : typeof entry.url !== 'string' ? 'non_string' : entry.url.includes('://') ? 'schemeful_rejected' : 'hostname_rejected' };
  if (entry.target !== null && entry.target !== undefined && entry.target !== 'preview') return { ok: false, reason: 'DEPLOYMENT_TARGET_ERROR' };
  const allowedStates = ['QUEUED', 'INITIALIZING', 'BUILDING', 'READY', 'ERROR', 'CANCELED', 'BLOCKED'];
  if (entry.readyState != null && !allowedStates.includes(entry.readyState)) return { ok: false, reason: 'DEPLOYMENT_STATE_ERROR', deploymentId: entry.id, wrapper, urlCategory: 'valid' };
  return { ok: true, id: entry.id, origin: targetOrigin, wrapper, urlCategory: /^https:\/\//i.test(entry.url) ? 'schemeful' : 'hostname', state: entry.readyState ?? 'not_reported' };
}

function createSession({ adapters, expectedSourceSha, deadline, now = () => Date.now(), schedule = setTimeout, cancel = clearTimeout, sourceMode = 'cli_upload' }) {
  if (!adapters || !/^[a-f0-9]{40}$/.test(expectedSourceSha ?? '') || !Number.isFinite(deadline)) throw new Error('INVALID_SESSION_CONFIGURATION');
  if (!['cli_upload', 'git_source'].includes(sourceMode)) throw new Error('INVALID_SESSION_CONFIGURATION');
  const ownerDeadline = Math.min(deadline, Date.parse('2026-10-30T03:00:00Z'));
  const lastNewAttempt = Math.min(ownerDeadline, Date.parse('2026-10-30T02:00:00Z'));
  let secret = null, identity = null, digest = null, idem = null, oidc = null, oidcExpires = null, credentialExpires = null, authorityExpires = null;
  let prepared = false, deployAttempted = false, proposed = null, attached = null, binding = null;
  let readbackAttempts = 0, proofAttempted = false;
  let armed = false, submissionAttempted = false, receipt = null, closed = false, halted = false, expired = false, observation = null;
  let timer = null, closeResult = null;
  function cancelTimer() { if (timer !== null) { cancel(timer); timer = null; } }
  function clearSecrets() { secret = null; oidc = null; idem = null; oidcExpires = null; receipt = null; }
  function destroy() { halted = true; cancelTimer(); clearSecrets(); return { status: 'HALTED' }; }
  function active() { if (closed || halted || expired) return false; if (now() >= ownerDeadline || (credentialExpires !== null && now() >= credentialExpires) || (authorityExpires !== null && now() >= authorityExpires)) { expired = true; cancelTimer(); clearSecrets(); return false; } return true; }
  function freshOidc() {
    if (!active()) return false;
    if (oidcExpires !== null && now() >= oidcExpires) { oidc = null; oidcExpires = null; scheduleExpiry(); }
    return oidc !== null;
  }
  function scheduleExpiry() {
    cancelTimer();
    if (!active()) return;
    const expiry = Math.min(ownerDeadline, credentialExpires ?? Infinity, oidcExpires ?? Infinity, authorityExpires ?? Infinity);
    timer = schedule(() => { timer = null; if (active()) { if (oidcExpires !== null && now() >= oidcExpires) { oidc = null; oidcExpires = null; } scheduleExpiry(); } }, Math.max(1, Math.min(2147483647, expiry - now())));
    timer?.unref?.();
  }
  scheduleExpiry();
  function checkpoint() {
    const usable = active();
    return { status: usable ? 'ACTIVE' : closed ? 'CLOSED' : halted ? 'HALTED' : 'EXPIRED', oidcReady: usable && freshOidc(), prepared, deployAttempted, attached: Boolean(attached), bindingVerified: Boolean(binding), armed, submissionAttempted, receiptConfirmed: Boolean(receipt) };
  }
  function validClaims(claims) {
    const seconds = now() / 1000;
    return Boolean(claims && claims.owner_id === TEAM && claims.project_id === PROJECT && claims.environment === 'development' && claims.sub === 'owner:novoradesign:project:project-dd34e:environment:development' && claims.aud === 'https://vercel.com/novoradesign' && ['https://oidc.vercel.com', 'https://oidc.vercel.com/novoradesign'].includes(claims.iss) && Number.isSafeInteger(claims.iat) && Number.isSafeInteger(claims.exp) && Number.isSafeInteger(claims.nbf) && claims.iat <= seconds && claims.nbf <= seconds && claims.exp > seconds && seconds - claims.iat <= 300 && claims.exp - claims.iat <= 43200 && seconds < Math.min(claims.exp, claims.iat + 300) - 10);
  }
  async function prepare() {
    if (!active() || prepared || now() >= lastNewAttempt) return { status: 'DENIED' };
    prepared = true; // one creation attempt, including an uncertain provider result
    try {
      if (adapters.preflight) await adapters.preflight({ sourceSha: expectedSourceSha, isActive: () => active() && now() < lastNewAttempt });
      if (!active() || now() >= lastNewAttempt) return { status: 'PREPARATION_FAILED' };
      const v = await adapters.prepare();
      if (!active()) return { status: 'PREPARATION_FAILED' };
      if (!v || typeof v.oidc !== 'string' || !v.oidc) return { status: 'PREPARATION_FAILED' };
      // The adapter must cryptographically verify with the existing Vercel
      // verifier; these claims are checked again, never accepted from input.
      const claims = await adapters.verifyOidc(v.oidc);
      if (!active() || now() >= lastNewAttempt || !validClaims(claims)) return { status: 'PREPARATION_FAILED' };
      const credentialStartedAt = now();
      const credentials = adapters.generate ? await adapters.generate() : v;
      if (!active() || now() >= lastNewAttempt || !validClaims(claims) || !credentials || typeof credentials.bearer !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(credentials.bearer) || !/^[A-Za-z0-9_-]{1,64}$/.test(credentials.identity ?? '') || !/^[A-Za-z0-9_-]{16,128}$/.test(credentials.idempotencyKey ?? '')) return { status: 'PREPARATION_FAILED' };
      secret = credentials.bearer; oidc = v.oidc; oidcExpires = (Math.min(claims.exp, claims.iat + 300) - 10) * 1000; credentialExpires = credentialStartedAt + 3600000; identity = credentials.identity; idem = credentials.idempotencyKey;
      if (!active()) return { status: 'PREPARATION_FAILED' };
      scheduleExpiry();
      digest = createHash('sha256').update(secret).digest('hex');
      return { status: 'PREPARED', identity };
    } catch (error) {
      const reasons = new Set(['CLI_VERSION_UNSUPPORTED', 'CLI_SELECTION_UNSUPPORTED', 'CLI_SELECTION_FAILED', 'CLI_SELECTION_UNTRACKED', 'CLI_SELECTION_SENSITIVE', 'SOURCE_MISMATCH', 'SOURCE_REMOTE_MISMATCH', 'SOURCE_MANIFEST_FAILED']);
      if (error?.message === 'GIT_PROJECT_TRANSPORT') {
        const d = error.diagnostic, allowed = new Set(['TIMEOUT','STDOUT_LIMIT','STDERR_LIMIT','SPAWN_ERROR','EXIT_NONZERO','SIGNALLED','UNKNOWN']);
        return { status: 'PREPARATION_FAILED', reason: 'GIT_PROJECT_TRANSPORT', stage: 'GIT_PROJECT_READ', processOutcome: allowed.has(d?.processOutcome) ? d.processOutcome : 'UNKNOWN',
          ...(Number.isInteger(d?.exitCode) && d.exitCode >= 1 && d.exitCode <= 255 ? { exitCode: d.exitCode } : {}),
          ...(Number.isInteger(d?.reportedHttpStatus) && d.reportedHttpStatus >= 400 && d.reportedHttpStatus <= 599 ? { reportedHttpStatus: d.reportedHttpStatus } : {}) };
      }
      if (['GIT_SOURCE_SCHEMA', 'GIT_PROJECT', 'GIT_REPOSITORY'].includes(error?.message)) return { status: 'PREPARATION_FAILED', reason: error.message };
      return reasons.has(error?.message) ? { status: 'PREPARATION_FAILED', reason: error.message } : { status: 'PREPARATION_FAILED' };
    }
  }
  async function refreshOidc() {
    if (!active() || !prepared || !secret) return { status: 'DENIED' };
    try {
      const v = await adapters.prepare();
      if (!active() || !v || typeof v.oidc !== 'string' || !v.oidc) return { status: 'OIDC_REFRESH_FAILED' };
      const claims = await adapters.verifyOidc(v.oidc);
      if (!active() || !validClaims(claims)) return { status: 'OIDC_REFRESH_FAILED' };
      oidc = v.oidc; oidcExpires = (Math.min(claims.exp, claims.iat + 300) - 10) * 1000;
      scheduleExpiry();
      return { status: 'OIDC_REFRESHED' };
    } catch { return { status: 'OIDC_REFRESH_FAILED' }; }
  }
  async function deploy() {
    if (!freshOidc() || !secret || deployAttempted || now() >= lastNewAttempt) return { status: 'DENIED' };
    deployAttempted = true; // never resend if the result is unknown
    try {
      const result = parseDeployment(await adapters.deploy({ identity, credentialSha256: digest, project: PROJECT, team: TEAM, branch: BRANCH, sourceSha: expectedSourceSha, isActive: () => freshOidc() && now() < lastNewAttempt }));
      if (!active()) return { status: 'READBACK_REQUIRED', reason: 'SESSION_INACTIVE' };
      if (!result.ok) {
        if (result.deploymentId) proposed = { id: result.deploymentId, origin: null };
        return { status: 'READBACK_REQUIRED', reason: result.reason, ...(Object.hasOwn(result, 'exitCode') ? { exitCode: result.exitCode } : {}), ...(result.deploymentId ? { deploymentId: result.deploymentId, wrapper: result.wrapper, urlCategory: result.urlCategory } : {}) };
      }
      proposed = { id: result.id, origin: result.origin };
      return { status: 'READBACK_REQUIRED', deploymentId: result.id, wrapper: result.wrapper, urlCategory: result.urlCategory, state: result.state };
    } catch { return { status: 'READBACK_REQUIRED', reason: 'DEPLOYMENT_OUTCOME_UNKNOWN' }; }
  }
  async function attach(deploymentId) {
    if (!freshOidc() || !secret || !deployAttempted || attached || !ID.test(deploymentId ?? '') || (proposed && deploymentId !== proposed.id)) return { status: 'DENIED' };
    if (readbackAttempts >= 30) return { status: 'READBACK_LIMIT' };
    readbackAttempts++;
    try {
      // This adapter must obtain authenticated platform evidence. An absent
      // source SHA requires the protected runtime proof before arming.
      // Caller-supplied metadata is not source evidence.
      const d = await adapters.readDeployment(deploymentId);
      if (!active()) return { status: 'DENIED' };
      const targetOrigin = origin(d?.url);
      const pending = ['QUEUED', 'INITIALIZING', 'BUILDING'].includes(d?.readyState);
      const terminal = ['ERROR', 'CANCELED', 'BLOCKED'].includes(d?.readyState);
      if (!d || d.id !== deploymentId || d.projectId !== PROJECT || d.teamId !== TEAM || d.target !== 'preview' || (!targetOrigin && (!(pending || terminal) || d.url != null)) || (proposed?.origin && targetOrigin && targetOrigin !== proposed.origin)) return { status: 'READBACK_REJECTED', reason: 'DEPLOYMENT_IDENTITY' };
      if (sourceMode === 'git_source' && pending && d.sourceEvidence === 'pending_unverified') return { status: 'READBACK_PENDING', state: d.readyState, source: 'UNVERIFIED' };
      if (sourceMode === 'git_source' && terminal && d.sourceEvidence === 'terminal_unverified') return { status: 'DEPLOYMENT_TERMINAL', state: d.readyState, source: 'UNVERIFIED' };
      if (d.branch !== BRANCH || (d.sourceSha != null && d.sourceSha !== expectedSourceSha)) return { status: 'READBACK_REJECTED', reason: 'DEPLOYMENT_IDENTITY' };
      if (sourceMode === 'git_source' ? d.sourceEvidence !== 'platform_git_source_v1' : d.manifestVerified !== true) return { status: 'READBACK_REJECTED', reason: sourceMode === 'git_source' ? 'GIT_SOURCE_EVIDENCE' : 'MANIFEST_CONTENT' };
      if (['QUEUED', 'INITIALIZING', 'BUILDING'].includes(d.readyState)) return { status: 'READBACK_PENDING', state: d.readyState };
      if (['ERROR', 'CANCELED', 'BLOCKED'].includes(d.readyState)) return { status: 'DEPLOYMENT_TERMINAL', state: d.readyState };
      if (d.readyState !== 'READY') return { status: 'READBACK_REJECTED', reason: 'DEPLOYMENT_STATE' };
      attached = { id: deploymentId, origin: targetOrigin };
      return { status: d.sourceVerified === true && d.sourceSha === expectedSourceSha ? 'ATTACHED' : 'READONLY_RUNTIME_PROOF_PENDING', deploymentId };
    } catch (error) {
      const reasons = new Set(['DEPLOYMENT_TRANSPORT', 'DEPLOYMENT_SCHEMA', 'MANIFEST_TRANSPORT', 'MANIFEST_SCHEMA', 'MANIFEST_PATH', 'MANIFEST_COUNT', 'MANIFEST_CONTENT_UNAVAILABLE', 'GIT_PROJECT_TRANSPORT', 'GIT_SOURCE_SCHEMA', 'GIT_DEPLOYMENT_ID', 'GIT_PROJECT', 'GIT_TARGET', 'GIT_STATE', 'GIT_REPOSITORY', 'GIT_REF', 'GIT_SHA', 'GIT_METADATA_CONFLICT']);
      const reason = reasons.has(error?.message) ? error.message : 'READBACK_TRANSPORT_OR_SCHEMA';
      if (reason !== 'GIT_PROJECT_TRANSPORT') return { status: 'READBACK_FAILED', reason };
      const d = error?.diagnostic, allowed = new Set(['TIMEOUT','STDOUT_LIMIT','STDERR_LIMIT','SPAWN_ERROR','EXIT_NONZERO','SIGNALLED','UNKNOWN']);
      return { status: 'READBACK_FAILED', reason, stage: 'GIT_PROJECT_READ', processOutcome: allowed.has(d?.processOutcome) ? d.processOutcome : 'UNKNOWN',
        ...(Number.isInteger(d?.exitCode) && d.exitCode >= 1 && d.exitCode <= 255 ? { exitCode: d.exitCode } : {}),
        ...(Number.isInteger(d?.reportedHttpStatus) && d.reportedHttpStatus >= 400 && d.reportedHttpStatus <= 599 ? { reportedHttpStatus: d.reportedHttpStatus } : {}) };
    }
  }
  async function verifyBinding() {
    if (!freshOidc() || !attached || binding || proofAttempted) return { status: 'DENIED' };
    proofAttempted = true;
    try {
      const p = await adapters.proof({ origin: attached.origin, oidc, redirect: 'error' });
      if (!freshOidc()) return { status: 'DENIED' };
      const failures = new Set(['TRANSPORT_FAILURE', 'HTTP_SCHEMA_FAILURE', 'AUTHORIZATION_DENIED', 'RATE_LIMITED', 'SERVER_ERROR', 'HTTP_ERROR', 'JSON_FAILURE', 'SCHEMA_FAILURE']);
      const httpStatus = Number.isInteger(p?.httpStatus) && p.httpStatus >= 100 && p.httpStatus <= 599 ? p.httpStatus : null;
      const context = { stage: 'RUNTIME_PROOF', ...(httpStatus !== null ? { httpStatus } : {}) };
      if (failures.has(p?.failure)) return { status: 'BINDING_FAILED', ...context, reason: p.failure, ...(p.failure === 'SERVER_ERROR' && httpStatus === 503 && p.isolationReport === 'REPORTED_FALSE' ? { isolationReport: 'REPORTED_FALSE' } : {}) };
      const diagnosticFields = ['deploymentIdValid', 'sourceShaValid', 'authorityValid', 'invitationValid', 'targetValid'];
      const diagnostics = {};
      if (p?.m2BindingDiagnostics && typeof p.m2BindingDiagnostics === 'object' && !Array.isArray(p.m2BindingDiagnostics)) {
        for (const field of diagnosticFields) if (typeof p.m2BindingDiagnostics[field] === 'boolean') diagnostics[field] = p.m2BindingDiagnostics[field];
      }
      if (Object.keys(diagnostics).length) context.m2BindingDiagnostics = diagnostics;
      const m = p?.m2Binding;
      let reason = null;
      if (p?.authorized !== true) reason = 'AUTHORIZATION_DENIED';
      else if (p.isolatedBackendVerified !== true) reason = 'ISOLATION_DENIED';
      else if (!m || typeof m !== 'object' || Array.isArray(m)) reason = 'MISSING_BINDING';
      else if (m.deploymentId !== attached.id) reason = 'DEPLOYMENT_ID_MISMATCH';
      else if (m.sourceSha !== expectedSourceSha) reason = 'SOURCE_SHA_MISMATCH';
      else if (typeof m.runtimeBinding !== 'string' || !SHA.test(m.runtimeBinding)) reason = 'RUNTIME_BINDING_INVALID';
      else if (m.ledgerKey !== `novora:beta-admission:m2-e2e:v1:${m.runtimeBinding}`) reason = 'LEDGER_KEY_MISMATCH';
      else if (m.authorityId !== `m2e2e_${m.runtimeBinding.slice(0, 56)}`) reason = 'AUTHORITY_MISMATCH';
      if (reason) return { status: 'BINDING_REJECTED', ...context, reason };
      const verifiedBinding = { ledgerKey: m.ledgerKey, authorityId: m.authorityId, runtimeBinding: m.runtimeBinding, identity };
      // This callback is supplied by the trusted private host, never protocol
      // input. It receives verified data in memory and grants no authority.
      if (adapters.handoffBinding) {
        try { await adapters.handoffBinding(Object.freeze({ ...verifiedBinding })); }
        catch { return { status: 'BINDING_FAILED', ...context, reason: 'HANDOFF_FAILED' }; }
        if (!freshOidc()) return { status: 'DENIED' };
      }
      binding = verifiedBinding;
      return { status: 'BINDING_VERIFIED', ...context };
    } catch { return { status: 'BINDING_FAILED', stage: 'RUNTIME_PROOF', reason: 'PROOF_INTERNAL_FAILURE' }; }
  }
  function observationValid(a) {
    return Boolean(binding && a && a.kind === 'operator_console_observation' && Number.isFinite(a.observedAt) && a.observedAt <= now() && a.observedAt >= now() - 60000 && a.authorityId === binding.authorityId && a.ledgerKey === binding.ledgerKey && a.runtimeBinding === binding.runtimeBinding && a.identity === identity && a.ownerApproved === true && a.durabilityVerified === true && a.currency === 'USD' && a.pricingVersion === 'openai-gpt-image-2-2026-04-21-standard-1024x1024-medium-2026-08-03-v1' && Number.isSafeInteger(a.expectedCostMicros) && a.expectedCostMicros > 0 && a.expectedCostMicros < 1000000 && a.revocationReady === true && a.costAuthorityMode === 'owner_expected_cost_single_attempt_v1' && a.ownerCostRiskAccepted === true && a.costCeilingVerified === false && a.limitMicros === 1000000 && a.attemptReservationMicros === 1000000 && a.maximumExperiences === 1 && a.maximumImages === 1 && a.maximumPaidAttempts === 1 && a.automaticPaidRetries === false && Number.isFinite(a.expiresAt) && a.expiresAt > now() && a.expiresAt <= ownerDeadline && a.expiresAt <= now() + 3600000);
  }
  function observeAuthority(value) {
    const fields = ['kind', 'observedAt', 'authorityId', 'ledgerKey', 'runtimeBinding', 'identity', 'ownerApproved', 'durabilityVerified', 'currency', 'pricingVersion', 'expectedCostMicros', 'revocationReady', 'costAuthorityMode', 'ownerCostRiskAccepted', 'costCeilingVerified', 'limitMicros', 'attemptReservationMicros', 'maximumExperiences', 'maximumImages', 'maximumPaidAttempts', 'automaticPaidRetries', 'expiresAt'];
    if (!active() || armed || submissionAttempted || !value || typeof value !== 'object' || Object.keys(value).some((key) => !fields.includes(key)) || !observationValid(value)) { observation = null; return { status: 'OBSERVATION_REJECTED' }; }
    observation = { ...value };
    return { status: 'OPERATOR_OBSERVATION_RECORDED' };
  }
  async function arm() {
    if (!freshOidc() || !binding || armed || submissionAttempted || now() >= lastNewAttempt) return { status: 'DENIED' };
    // This is a trusted operator observation, not a server receipt or grant.
    // The application's existing admission gate remains the enforcement point.
    if (!observationValid(observation)) return { status: 'AUTHORITY_NOT_OBSERVED' };
    authorityExpires = observation.expiresAt; armed = true; scheduleExpiry(); return { status: 'ARMED_FROM_OPERATOR_OBSERVATION' };
  }
  async function submit(payload) {
    if (!freshOidc() || !armed || submissionAttempted || now() >= lastNewAttempt) return { status: 'DENIED' };
    submissionAttempted = true; // no replacement even on timeout or exception
    try {
      const r = await adapters.submit({ origin: attached.origin, path: '/api/concept-briefs', bearer: secret, oidc, idempotencyKey: idem, payload, redirect: 'error' });
      if (!freshOidc()) return { status: 'SUBMISSION_UNCONFIRMED' };
      if (r?.confirmed !== true || !/^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/.test(r.publicReference ?? '') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r.conceptBriefId ?? '') || typeof r.cookie !== 'string' || !r.cookie) return { status: 'SUBMISSION_UNCONFIRMED' };
      receipt = { publicReference: r.publicReference, conceptBriefId: r.conceptBriefId, cookie: r.cookie };
      return { status: 'SUBMITTED', publicReference: receipt.publicReference, conceptBriefId: receipt.conceptBriefId };
    } catch { return { status: 'SUBMISSION_UNCONFIRMED' }; }
  }
  async function asset(authorized) {
    if (!freshOidc() || !receipt) return { status: 'DENIED' };
    try {
      const r = await adapters.asset({ origin: attached.origin, publicReference: receipt.publicReference, cookie: authorized ? receipt.cookie : null, oidc, redirect: 'error' });
      if (!freshOidc()) return { status: 'DENIED' };
      if (!authorized) return { status: r?.status === 404 ? 'DENIED_AS_EXPECTED' : 'UNEXPECTED_RESPONSE' };
      if (r?.status !== 200 || r.contentType !== 'image/png' || !Buffer.isBuffer(r.bytes)) return { status: 'NOT_READY' };
      return { status: 'DELIVERED', sha256: createHash('sha256').update(r.bytes).digest('hex'), bytes: r.bytes.length };
    } catch { return { status: 'ASSET_FAILED' }; }
  }
  function close() {
    if (closeResult) return closeResult;
    closed = true; cancelTimer(); clearSecrets();
    closeResult = (async () => {
      let revoke = 'NOT_REQUIRED', cleanup = 'NOT_REQUIRED';
      try { if (binding) revoke = await adapters.revoke({ ...binding }) === true ? 'CONFIRMED' : 'UNCONFIRMED'; } catch { revoke = 'UNCONFIRMED'; }
      try { if (attached) cleanup = await adapters.cleanup(attached.id) === true ? 'CONFIRMED' : 'UNCONFIRMED'; } catch { cleanup = 'UNCONFIRMED'; }
      if (deployAttempted && !attached) cleanup = 'UNVERIFIED_TARGET';
      return { status: 'CLOSED', revoke, cleanup };
    })();
    return closeResult;
  }

  return Object.freeze({ prepare, refreshOidc, deploy, attach, verifyBinding, observeAuthority, arm, submit, asset, checkpoint, close, destroy });
}

module.exports = { parseDeployment, createSession };
