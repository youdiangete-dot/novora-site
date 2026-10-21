import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createSignerRuntime, workloadMessage, ACTION_PATH } from './runtime.mjs';
import { readConfiguration, PROJECT, SIGNER, WORKER } from './config.mjs';
import { createProtectedKeyProvider } from './key-provider.mjs';
import { IDENTITY_SQL, SQL, createCommittedOperations } from './postgres.mjs';
import { createSyntheticInitiationState, FakeFirstPreviewInitiationRepository } from
  '../../../tests/fixtures/ai-sketch/fake-first-preview-initiation-repository.ts';
import { INITIATION_VERSION } from '../../../lib/server/ai-sketch/first-preview-initiation-contract.ts';
import { buildFirstPreviewStructuredGenerationInput } from '../../../lib/server/ai-sketch/first-preview-structured-input.ts';
import { FIRST_PREVIEW_COST_CONTRACT, FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION } from
  '../../../lib/server/ai-sketch/first-preview-cost-contract.ts';

// Public deterministic test-only bytes, never generated/deployed credentials.
const PREPARATION_BYTES = Buffer.alloc(32, 0x37);
const AUTH_BYTES = Buffer.alloc(32, 0x51);
const NOW = 1_800_000_000;
const BRIEF = '123e4567-e89b-42d3-a456-426614174000';
const OWNER = '323e4567-e89b-42d3-a456-426614174000';
const JOB = '223e4567-e89b-42d3-a456-426614174000';
const PREPARATION = '523e4567-e89b-42d3-a456-426614174000';
const REFERENCE = 'NOVORA-CB-20261021-TEST';
const claim = { concept_brief_id: BRIEF, owner: OWNER, fence: '1' };
const environment = () => ({
  NOVORA_SIGNER_ENABLED: 'true', NODE_ENV: 'production', VERCEL_ENV: 'preview',
  VERCEL_PROJECT_ID: 'prj_StandaloneSyntheticSigner', NOVORA_SIGNER_SERVICE_ID: 'prj_StandaloneSyntheticSigner',
  NOVORA_SIGNER_PROJECT_REF: PROJECT,
  NOVORA_SIGNER_DATABASE_URL: `postgresql://${SIGNER}.${PROJECT}:synthetic-password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
  NOVORA_SIGNER_PREPARATION_KEY_ID: 'synthetic-preparation-v1', NOVORA_SIGNER_VERIFIER_KEY_ID: 'synthetic-preparation-v1',
  NOVORA_SIGNER_KEY_STATE: 'active', NOVORA_SIGNER_PREPARATION_KEY_BASE64: PREPARATION_BYTES.toString('base64'),
  NOVORA_SIGNER_WORKLOAD_AUTH_BASE64: AUTH_BYTES.toString('base64'),
});
let networkCalls = 0;
function forbidNetwork() { networkCalls++; throw new Error('Forbidden live transport'); }
net.Socket.prototype.connect = forbidNetwork;
tls.connect = forbidNetwork;
globalThis.fetch = forbidNetwork;

function request(options = {}) {
  const env = environment();
  const body = { ...claim, ...options.claim };
  const timestamp = String(options.timestamp ?? NOW);
  const nonce = options.nonce ?? 'synthetic-request-nonce-000001';
  const mac = createHmac('sha256', options.key ?? AUTH_BYTES)
    .update(workloadMessage(options.serviceId ?? env.NOVORA_SIGNER_SERVICE_ID, timestamp, nonce, body)).digest('hex');
  return new Request(`https://isolated-signer.invalid${options.path ?? ACTION_PATH}`, {
    method: 'POST', headers: { 'content-type': 'application/json',
      authorization: options.unauthenticated ? '' : `NOVORA-SIGNER-V1 ${mac}`,
      'x-novora-issued-at': timestamp, 'x-novora-nonce': nonce,
      'x-novora-workload': options.principal ?? WORKER },
    body: options.rawBody ?? JSON.stringify(body),
  });
}

async function fakePool(options = {}) {
  const shared = createSyntheticInitiationState();
  const repo = new FakeFirstPreviewInitiationRepository(shared, {
    nowMs: () => NOW * 1_000, available: () => true, failIntakeAt: () => null,
  });
  const input = { p_concept_brief_id: BRIEF, p_public_reference: REFERENCE,
    p_brief: { piece_type: 'ring', branch: null, structure: null, sub_structure: null,
      design_objective: 'Synthetic preparation test', ai_sketch_instruction: null,
      brief_payload: { pieceType: 'ring', designIntent: 'A balanced heirloom ring.', designDescription: 'A refined daily silhouette.',
        styleDirection: ['warm heirloom'], materialDirection: ['warm yellow gold'],
        stones: [{ role: 'center', type: 'lab-grown diamond', shape: 'pear', orientation: 'point toward fingertip', setting: 'five prongs' }],
        centerStoneDirection: 'Pear point toward fingertip.', stoneArrangement: 'Two shoulder accents.', dimensions: ['ring size to confirm'],
        composition: 'Low balanced center.', wearabilityRequirements: ['daily wear'], manufacturingConstraints: ['explainable prongs'],
        unknowns: ['exact ring size'], avoid: ['hidden halo'], requestedViews: ['front view'] },
      summary_items: [], api_submission: { public_reference: REFERENCE, submitted_at: new Date(NOW * 1_000).toISOString() } },
    p_contact: { customer_name: 'Synthetic', customer_email: 'synthetic@example.invalid', phone_whatsapp: null, country_region: null, contact_note: null },
    p_admission_context: { version: INITIATION_VERSION, key_version: 'synthetic-rate-v1', rate_policy_version: 'synthetic-policy-v1',
      ip_key: `rl:v1:concept-briefs:ip:${'a'.repeat(48)}`, email_key: `rl:v1:concept-briefs:email:${'b'.repeat(48)}`,
      access_binding: { concept_brief_id: BRIEF, public_reference: REFERENCE, proof_version: 'synthetic-v1', binding_digest: 'c'.repeat(64) } },
  };
  assert.equal((await repo.persist(input)).ok, true);
  const intent = { ...shared.intents.get(BRIEF), state: 'claimed', lease_owner: OWNER, fence: '1',
    publication_fence: '1', lease_until: new Date(NOW * 1_000 + 60_000).toISOString() };
  const source = { ...input.p_brief, concept_brief_id: BRIEF, public_reference: REFERENCE, source: 'api' };
  const structured = buildFirstPreviewStructuredGenerationInput({ payload: source.brief_payload, publicReference: REFERENCE });
  assert.equal(structured.ok, true);
  const selection = { preparation_id: PREPARATION, selection_version: 'novora_fp_selection_v1', intent,
    source_snapshot: source, admission_context: intent.admission_context, reserved_job_id: JOB,
    prepared: null, database_now_ms: NOW * 1_000,
    preparation_policy: { design_spec_version: structured.value.designSpec.spec_version,
      hand_sketch_instruction_version: structured.value.handSketchInstruction.instruction_version,
      estimated_cost_micros: FIRST_PREVIEW_COST_CONTRACT.estimatedCostMicros, cost_currency: 'USD',
      pricing_assumption_version: FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,
      provider_profile: { provider_name: 'openai', model_name: 'gpt-image-2-2026-04-21', provider_endpoint: '/v1/images/generations',
        request_image_count: 1, request_streaming: false, request_partial_images: 0, request_size: '1024x1024',
        request_quality: 'medium', output_format: 'png', moderation_mode: 'auto' } },
  };
  options.changeSelection?.(selection);
  const queries = [], releases = []; let commits = 0, connections = 0, signedEnvelope;
  const pool = { async connect() {
    connections++;
    if (options.connectionMissing) throw new Error('synthetic-password private connection unavailable');
    return { connection: { stream: { encrypted: true, authorized: !options.badTls } },
      async query(text, values) {
        queries.push(text);
        if (text === 'BEGIN' || text === 'ROLLBACK') return { command: text, rows: [] };
        if (text === 'COMMIT') {
          commits++;
          if (options.commitFailsAt === commits) throw new Error('synthetic-password COMMIT outcome unknown');
          return { command: options.commitRollbackAt === commits ? 'ROLLBACK' : 'COMMIT', rows: [] };
        }
        if (text === IDENTITY_SQL) return { rows: [{ session_role: options.role ?? SIGNER,
          current_role: options.currentRole ?? SIGNER, database: options.database ?? 'postgres' }] };
        if (text === SQL.select) return { rows: [{ result: { ok: true, value: structuredClone(selection) } }] };
        if (text === SQL.bind) {
          selection.prepared = JSON.parse(values[1]);
          return { rows: [{ result: { ok: true, value: structuredClone(selection) } }] };
        }
        if (text === SQL.release) {
          signedEnvelope = JSON.parse(values[1]);
          if (options.revoked || signedEnvelope.key_id !== 'synthetic-preparation-v1')
            return { rows: [{ result: { ok: false, authorized: false } }] };
          return { rows: [{ result: { ok: true, authorized: true, preparation_id: PREPARATION,
            selection_version: 'novora_fp_selection_v1', owner: OWNER, fence: '1',
            lease_until: intent.lease_until, database_now_ms: NOW * 1_000 } }] };
        }
        throw new Error('Unallowlisted query');
      }, release(destroy) { releases.push(destroy); } };
  } };
  return { pool, queries, releases, counts: () => ({ commits, connections }), envelope: () => signedEnvelope };
}

async function runtime(options = {}) {
  const fake = await fakePool(options);
  const env = { ...environment(), ...options.environment };
  let factoryCalls = 0;
  const handle = createSignerRuntime({ readEnvironment: () => env, nowSeconds: () => NOW,
    poolFactory(config) {
      factoryCalls++;
      assert.equal(config.database.ssl.rejectUnauthorized, true);
      assert.equal(config.database.max, 1);
      assert.equal(config.database.options, '');
      return fake.pool;
    } });
  return { ...fake, handle, env, factoryCalls: () => factoryCalls };
}

test('authorized isolated workload uses only existing operations and returns proof after three acknowledged commits', async () => {
  const h = await runtime();
  assert.equal(h.factoryCalls(), 0);
  const result = await h.handle(request());
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.envelope.concept_brief_id, BRIEF);
  assert.equal(body.envelope.key_id, 'synthetic-preparation-v1');
  assert.deepEqual(body.envelope, h.envelope());
  assert.equal(h.counts().commits, 3);
  assert.deepEqual(h.releases, [false, false, false]);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.ok(h.queries.every(q => ['BEGIN', 'COMMIT', IDENTITY_SQL, ...Object.values(SQL)].includes(q)));
});

for (const [name, change] of [
  ['disabled', { NOVORA_SIGNER_ENABLED: undefined }],
  ['no connection', { NOVORA_SIGNER_DATABASE_URL: undefined }],
  ['Production', { VERCEL_ENV: 'production' }],
  ['contradictory environment', { VERCEL_TARGET_ENV: 'production' }],
  ['website project', { VERCEL_PROJECT_ID: 'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg', NOVORA_SIGNER_SERVICE_ID: 'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg' }],
  ['wrong database project', { NOVORA_SIGNER_PROJECT_REF: 'pzjypjddmrngdnrjbhsw' }],
  ['Production connection', { NOVORA_SIGNER_DATABASE_URL: `postgresql://${SIGNER}:synthetic@db.pzjypjddmrngdnrjbhsw.supabase.co:5432/postgres` }],
  ['Worker connection', { NOVORA_SIGNER_DATABASE_URL: environment().NOVORA_SIGNER_DATABASE_URL.replace(SIGNER, WORKER) }],
  ['Intake connection', { NOVORA_SIGNER_DATABASE_URL: environment().NOVORA_SIGNER_DATABASE_URL.replace(SIGNER, 'novora_fp_intake_executor') }],
  ['service-role connection', { NOVORA_SIGNER_DATABASE_URL: environment().NOVORA_SIGNER_DATABASE_URL.replace(SIGNER, 'service_role') }],
  ['URL TLS override', { NOVORA_SIGNER_DATABASE_URL: environment().NOVORA_SIGNER_DATABASE_URL + '?sslmode=disable' }],
  ['missing key', { NOVORA_SIGNER_PREPARATION_KEY_BASE64: undefined }],
  ['malformed key', { NOVORA_SIGNER_PREPARATION_KEY_BASE64: 'bad' }],
  ['revoked configuration', { NOVORA_SIGNER_KEY_STATE: 'revoked' }],
  ['uncoordinated ID', { NOVORA_SIGNER_VERIFIER_KEY_ID: 'other-key' }],
  ['reused transport key', { NOVORA_SIGNER_WORKLOAD_AUTH_BASE64: PREPARATION_BYTES.toString('base64') }],
]) test(`inert configuration: ${name}`, async () => {
  const h = await runtime({ environment: change });
  assert.equal((await h.handle(request())).status, 503);
  assert.equal(h.factoryCalls(), 0);
  assert.equal(h.counts().connections, 0);
});

for (const role of [WORKER, 'novora_fp_intake_executor', 'service_role', 'postgres'])
  test(`actual authenticated ${role} identity cannot sign`, async () => {
    const h = await runtime({ role });
    assert.equal((await h.handle(request())).status, 403);
    assert.equal(h.queries.some(q => Object.values(SQL).includes(q)), false);
    assert.deepEqual(h.releases, [true]);
  });

for (const [name, options] of [
  ['current-role impersonation', { currentRole: WORKER }], ['wrong database', { database: 'other' }],
  ['TLS not verified', { badTls: true }], ['connection unavailable', { connectionMissing: true }],
  ['verifier revocation', { revoked: true }],
  ['expired lease', { changeSelection: s => { s.intent.lease_until = new Date(NOW * 1_000 - 1).toISOString(); } }],
  ['wrong source identity', { changeSelection: s => { s.source_snapshot.concept_brief_id = JOB; } }],
  ['wrong claim owner', { changeSelection: s => { s.intent.lease_owner = JOB; } }],
  ['wrong claim fence', { changeSelection: s => { s.intent.fence = '2'; } }],
  ['invalid claim state', { changeSelection: s => { s.intent.state = 'operator_hold'; } }],
  ['unapproved preparation policy', { changeSelection: s => { s.preparation_policy.cost_currency = 'USD-other'; } }],
]) test(`trusted authority fails closed: ${name}`, async () => {
  const h = await runtime(options);
  const response = await h.handle(request());
  assert.notEqual(response.status, 200);
  assert.equal((await response.json()).envelope, undefined);
});

for (const n of [1, 2, 3]) test(`unknown COMMIT ${n} never releases a proof`, async () => {
  const h = await runtime({ commitFailsAt: n });
  const response = await h.handle(request());
  assert.notEqual(response.status, 200);
  const body = await response.text();
  for (const secret of ['synthetic-password', PREPARATION_BYTES.toString('base64'), 'prepared_utf8_hex', 'source_snapshot'])
    assert.equal(body.includes(secret), false);
  assert.equal(h.releases.at(-1), true);
});
test('ROLLBACK returned in response to COMMIT is not success', async () => {
  const h = await runtime({ commitRollbackAt: 3 });
  assert.notEqual((await h.handle(request())).status, 200);
  assert.equal(h.releases.at(-1), true);
});

for (const [name, options] of [
  ['unauthenticated', { unauthenticated: true }], ['wrong credential', { key: PREPARATION_BYTES }],
  ['stale', { timestamp: NOW - 61 }], ['future', { timestamp: NOW + 6 }],
  ['wrong audience', { serviceId: 'prj_OtherSigner' }], ['wrong principal', { principal: SIGNER }],
  ['tampered claim', { rawBody: JSON.stringify({ ...claim, fence: '2' }) }],
]) test(`workload authentication rejects ${name} before connecting`, async () => {
  const h = await runtime();
  assert.equal((await h.handle(request(options))).status, 401);
  assert.equal(h.factoryCalls(), 0);
});
for (const rawBody of ['{', JSON.stringify({ ...claim, bytes: 'arbitrary signing input' }), 'x'.repeat(2_049)])
  test(`malformed or arbitrary input is rejected (${rawBody.length} bytes)`, async () => {
    const h = await runtime();
    assert.equal((await h.handle(request({ rawBody }))).status, 400);
    assert.equal(h.factoryCalls(), 0);
  });
test('warm-instance replay is denied without another database operation', async () => {
  const h = await runtime();
  assert.equal((await h.handle(request())).status, 200);
  const before = h.counts().connections;
  assert.equal((await h.handle(request())).status, 401);
  assert.equal(h.counts().connections, before);
});
test('key provider returns owned disposable copies; erasing one cannot mutate another', async () => {
  const provider = createProtectedKeyProvider(readConfiguration(environment()));
  const first = await provider.loadActivePreparationKey(), second = await provider.loadActivePreparationKey();
  assert.notEqual(first.keyBytes, second.keyBytes);
  first.keyBytes.fill(0);
  assert.deepEqual(second.keyBytes, PREPARATION_BYTES);
  second.keyBytes.fill(0);
});
test('operations expose only the three protected methods, never an arbitrary SQL function', async () => {
  assert.deepEqual(Object.keys(createCommittedOperations({}, claim)).sort(),
    ['authorizePreparationRelease', 'bindPreparation', 'selectPreparationClaim']);
});
test('standalone artifact imports outside the website, stays inert, and routes no static source files', () => {
  const root = path.resolve(process.cwd(), '../../..');
  const artifact = path.join(root, 'out/pr287-signer-runtime');
  const entry = pathToFileURL(path.join(artifact, 'api/prepare.mjs')).href;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import net from 'node:net';
    net.Socket.prototype.connect = () => { throw new Error('Live connection forbidden'); };
    const { default: entry } = await import(${JSON.stringify(entry)});
    const response = await entry.fetch(new Request('https://isolated.invalid/api/prepare', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }));
    if (response.status !== 503) process.exit(1);
    console.info(response.status);
  `], { cwd: artifact, encoding: 'utf8', env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT } });
  assert.equal(child.status, 0, 'Standalone artifact must import without website files or live configuration');
  assert.equal(child.stdout.trim(), '503');
  const routing = JSON.parse(readFileSync(path.join(artifact, 'vercel.json'), 'utf8'));
  assert.deepEqual(routing.routes, [{ src: '^/api/prepare$', dest: '/api/prepare.mjs' }, { src: '/.*', status: 404 }]);
  const manifest = JSON.parse(readFileSync(path.join(artifact, 'source-manifest.json'), 'utf8'));
  assert.ok(manifest.every(p => !/first-preview-(generation-lifecycle|queue|paid-admission)|supabase\.ts/.test(p)));
});
test('Production Queue guard remains byte-for-byte unchanged and no live transport was used', () => {
  const root = path.resolve(process.cwd(), '../../..');
  const queue = readFileSync(path.join(root, 'app/api/queues/first-preview-generation/route.ts'));
  assert.equal(createHash('sha256').update(queue).digest('hex').toUpperCase(),
    '228606B44F8CEAC4C141A310CD4D3927BFF93E4BB35BC354B30ED868D425B489');
  assert.equal(networkCalls, 0);
});
