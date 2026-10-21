import { timingSafeEqual } from 'node:crypto';

export const PROJECT = 'kiwoujhhhsnromxfwdxh';
export const SIGNER = 'novora_pr287_signer_isolated';
export const WORKER = 'novora_pr287_worker_isolated';
const WEBSITE_PROJECT = 'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg';

export function decodeKey(value) {
  if (typeof value !== 'string' || value.length > 512 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length < 32 || bytes.length > 256 || bytes.toString('base64') !== value) {
    bytes.fill(0);
    return null;
  }
  return bytes;
}

// Only this service's explicit names are consulted. No .env loader, shared
// application credential fallback, URL query options, or PG* defaults.
export function readConfiguration(env) {
  let preparation, transport;
  try {
    const serviceId = env.NOVORA_SIGNER_SERVICE_ID;
    if (env.NOVORA_SIGNER_ENABLED !== 'true' || env.VERCEL_ENV !== 'preview' ||
        env.NODE_ENV !== 'production' ||
        (env.VERCEL_TARGET_ENV !== undefined && env.VERCEL_TARGET_ENV !== 'preview') ||
        !/^prj_[A-Za-z0-9]+$/.test(serviceId ?? '') || serviceId === WEBSITE_PROJECT ||
        env.VERCEL_PROJECT_ID !== serviceId || env.NOVORA_SIGNER_PROJECT_REF !== PROJECT) return null;
    const url = new URL(env.NOVORA_SIGNER_DATABASE_URL);
    const user = decodeURIComponent(url.username);
    const direct = url.hostname === `db.${PROJECT}.supabase.co` && user === SIGNER && url.port === '5432';
    const pooler = /^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) &&
      user === `${SIGNER}.${PROJECT}` && ['5432', '6543'].includes(url.port);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || (!direct && !pooler) ||
        !url.password || url.pathname !== '/postgres' || url.search || url.hash) return null;
    const keyId = env.NOVORA_SIGNER_PREPARATION_KEY_ID;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(keyId ?? '') ||
        env.NOVORA_SIGNER_VERIFIER_KEY_ID !== keyId || env.NOVORA_SIGNER_KEY_STATE !== 'active') return null;
    preparation = decodeKey(env.NOVORA_SIGNER_PREPARATION_KEY_BASE64);
    transport = decodeKey(env.NOVORA_SIGNER_WORKLOAD_AUTH_BASE64);
    if (!preparation || !transport ||
        (preparation.length === transport.length && timingSafeEqual(preparation, transport))) return null;
    const ca = env.NOVORA_SIGNER_DATABASE_CA_PEM;
    if (ca !== undefined && (typeof ca !== 'string' || ca.length > 32_768 ||
        !ca.startsWith('-----BEGIN CERTIFICATE-----') || !ca.trimEnd().endsWith('-----END CERTIFICATE-----'))) return null;
    return Object.freeze({ serviceId, keyId,
      preparationBase64: env.NOVORA_SIGNER_PREPARATION_KEY_BASE64,
      transportBase64: env.NOVORA_SIGNER_WORKLOAD_AUTH_BASE64,
      database: Object.freeze({ host: url.hostname, port: Number(url.port), user,
        password: decodeURIComponent(url.password), database: 'postgres',
        ssl: { rejectUnauthorized: true, servername: url.hostname, ...(ca ? { ca } : {}) },
        max: 1, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000,
        allowExitOnIdle: true, statement_timeout: 5_000, query_timeout: 6_000,
        options: '', replication: false,
        application_name: 'novora-pr287-isolated-signer' }),
    });
  } catch { return null; }
  finally { preparation?.fill(0); transport?.fill(0); }
}
