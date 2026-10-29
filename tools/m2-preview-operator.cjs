'use strict';

// The operator owns one in-memory session. Network, deployment, authoritative
// readback and authority adapters are supplied by a trusted private host; none
// are implemented here and this module is not a standalone live runner.
const { createSession } = require('./m2-preview-session.cjs');

async function verifyVercel(token) {
  const { verifyVercelOidcToken } = require('@vercel/oidc');
  const verified = await verifyVercelOidcToken(token, {
    issuer: ['https://oidc.vercel.com', 'https://oidc.vercel.com/novoradesign'], algorithms: ['RS256'], typ: 'JWT', clockTolerance: 0,
    audience: 'https://vercel.com/novoradesign', subject: 'owner:novoradesign:project:project-dd34e:environment:development',
    projectId: 'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg', ownerId: 'team_9VhRPiCaRc62kna4XyNKvPZ7', environment: 'development',
    requiredClaims: ['exp', 'iat', 'nbf', 'iss', 'aud', 'sub', 'owner_id', 'project_id', 'environment'], maxTokenAge: 300,
  });
  return verified.payload;
}

function entry(config, verifier) {
  const session = createSession({ ...config, adapters: { ...config.adapters, verifyOidc: verifier } });
  let busy = false, stopped = false;
  return async function command(op, value) {
    // Stop must remain available while an I/O operation is pending.
    if (op === 'destroy') { stopped = true; return session.destroy(); }
    if (op === 'close' && stopped) return await session.close();
    if (busy) return { status: 'BUSY' };
    busy = true;
    try {
      switch (op) {
        case 'prepare': return await session.prepare();
        case 'deploy': return await session.deploy();
        case 'attach': return await session.attach(value);
        case 'proof': return await session.verifyBinding();
        case 'observe_authority': return session.observeAuthority(value);
        case 'arm': return await session.arm();
        case 'submit': return await session.submit(value);
        case 'asset_authorized': return await session.asset(true);
        case 'asset_unauthorized': return await session.asset(false);
        case 'checkpoint': return session.checkpoint();
        case 'destroy': return session.destroy();
        case 'close': return await session.close();
        default: return { status: 'UNKNOWN_COMMAND' };
      }
    } catch { return { status: 'FAILED_SANITIZED' }; }
    finally { busy = false; }
  };
}

// Production always uses the real verifier, ignoring any adapter's verifier.
function createOperator(config) { return entry(config, verifyVercel); }
// Offline fixtures only. Never use this entry with real credentials or services.
function createOfflineFixtureOperator(config) { return entry(config, config.adapters.verifyOidc); }
module.exports = { createOperator, createOfflineFixtureOperator };
