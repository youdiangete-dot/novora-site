import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createAuthoritativePreparationDatabaseCandidate } from '../database.ts';
import { createFirstPreviewPreparationSignerCandidate } from '../signer.ts';
import { isUuid, isFence } from '../../../lib/server/ai-sketch/first-preview-initiation-contract.ts';
import { readConfiguration, decodeKey, WORKER } from './config.mjs';
import { createProtectedKeyProvider } from './key-provider.mjs';
import { createDedicatedPool, createCommittedOperations } from './postgres.mjs';

export const ACTION_PATH = '/api/prepare';
function response(status, code, envelope) {
  return Response.json(envelope ? { ok: true, envelope } : { ok: false, code }, {
    status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

async function readClaim(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_048) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const claim = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!claim || Object.getPrototypeOf(claim) !== Object.prototype ||
        Object.keys(claim).sort().join(',') !== 'concept_brief_id,fence,owner' ||
        !isUuid(claim.concept_brief_id) || !isUuid(claim.owner) || !isFence(claim.fence) || claim.fence === '0') return null;
    return Object.freeze(claim);
  } catch { return null; }
  finally { reader.releaseLock(); }
}

// A signature is tied to one service, action, authenticated Worker principal,
// timestamp, nonce and exact claim owner/fence. It is NOT preparation authority.
export function workloadMessage(serviceId, timestamp, nonce, claim) {
  return JSON.stringify(['novora-signer-workload-v1', serviceId, WORKER, 'POST', ACTION_PATH,
    timestamp, nonce, claim.concept_brief_id, claim.owner, claim.fence]);
}

export function createSignerRuntime({ readEnvironment, poolFactory = createDedicatedPool,
  nowSeconds = () => Math.floor(Date.now() / 1_000) }) {
  let pool, poolIdentity;
  const nonces = new Map(); // Warm-instance duplicate rejection; SQL remains authoritative across instances.
  return async function handle(request) {
    try {
      const url = new URL(request.url);
      if (request.method !== 'POST' || url.pathname !== ACTION_PATH || url.search ||
          request.headers.get('content-type') !== 'application/json') return response(400, 'invalid_request');
      const configuration = readConfiguration(readEnvironment());
      if (!configuration) return response(503, 'signer_unavailable');
      const timestamp = request.headers.get('x-novora-issued-at');
      const nonce = request.headers.get('x-novora-nonce');
      const authorization = request.headers.get('authorization');
      const now = nowSeconds();
      if (!Number.isSafeInteger(now) || !/^\d{10}$/.test(timestamp ?? '') ||
          Number(timestamp) > now + 5 || Number(timestamp) < now - 60 ||
          !/^[A-Za-z0-9_-]{24,64}$/.test(nonce ?? '') ||
          !/^NOVORA-SIGNER-V1 [a-f0-9]{64}$/.test(authorization ?? '') ||
          request.headers.get('x-novora-workload') !== WORKER) return response(401, 'unauthorized');
      const claim = await readClaim(request);
      if (!claim) return response(400, 'invalid_request');
      const key = decodeKey(configuration.transportBase64);
      let expected;
      try { expected = createHmac('sha256', key).update(workloadMessage(configuration.serviceId, timestamp, nonce, claim)).digest(); }
      finally { key?.fill(0); }
      const supplied = Buffer.from(authorization.slice('NOVORA-SIGNER-V1 '.length), 'hex');
      let authenticated;
      try { authenticated = timingSafeEqual(expected, supplied); }
      finally { expected.fill(0); supplied.fill(0); }
      if (!authenticated) return response(401, 'unauthorized');
      for (const [seen, expires] of nonces) if (expires < now) nonces.delete(seen);
      if (nonces.has(nonce) || nonces.size >= 1_024) return response(401, 'unauthorized');
      nonces.set(nonce, Number(timestamp) + 65);
      const identity = createHash('sha256').update(JSON.stringify(configuration.database)).digest('hex');
      if (pool && identity !== poolIdentity) return response(503, 'signer_unavailable');
      if (!pool) { pool = poolFactory(configuration); poolIdentity = identity; }
      const signer = createFirstPreviewPreparationSignerCandidate({
        database: createAuthoritativePreparationDatabaseCandidate(createCommittedOperations(pool, claim)),
        secrets: createProtectedKeyProvider(configuration),
      });
      const result = await signer.signAuthoritativePreparation({ concept_brief_id: claim.concept_brief_id });
      return result.ok ? response(200, undefined, result.envelope) : response(403, result.code);
    } catch { return response(503, 'signer_unavailable'); }
  };
}
