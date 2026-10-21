import { Pool } from 'pg';
import { SIGNER } from './config.mjs';

export const IDENTITY_SQL = 'SELECT session_user::text AS session_role, current_user::text AS current_role, current_database() AS database';
export const SQL = Object.freeze({
  select: 'SELECT novora_fp_authority.select_preparation_claim($1::uuid) AS result',
  bind: 'SELECT novora_fp_authority.bind_preparation($1::uuid, $2::jsonb) AS result',
  release: 'SELECT novora_fp_authority.authorize_preparation_release($1::uuid, $2::jsonb) AS result',
});

export function createDedicatedPool(configuration) {
  const pool = new Pool(configuration.database);
  // Do not allow an idle network error to escape through an unhandled error
  // event containing connection details. Active operation failures deny below.
  pool.on('error', () => {});
  return pool;
}

export function createCommittedOperations(pool, claim) {
  let preparationId = null;
  async function execute(operation, values) {
    let client, committed = false;
    try {
      client = await pool.connect();
      const stream = client.connection?.stream;
      if (stream?.encrypted !== true || stream?.authorized !== true) throw new Error();
      await client.query('BEGIN');
      const identity = await client.query(IDENTITY_SQL);
      const row = identity.rows?.[0];
      if (identity.rows?.length !== 1 || row?.session_role !== SIGNER ||
          row?.current_role !== SIGNER || row?.database !== 'postgres') throw new Error();
      // No named prepared statements: compatible with shared transaction pooling.
      // Only a private fixed operation can select SQL; values are always bound.
      const result = await client.query(SQL[operation], values);
      if (result.rows?.length !== 1) throw new Error();
      const value = result.rows[0].result;
      if (value?.ok === true) {
        const intent = value.value?.intent;
        if (operation !== 'release') {
          if (intent?.concept_brief_id !== claim.concept_brief_id ||
              intent?.lease_owner !== claim.owner || intent?.fence !== claim.fence) throw new Error();
          if (operation === 'select') preparationId = value.value.preparation_id;
          if (operation === 'bind' && value.value.preparation_id !== preparationId) throw new Error();
        } else if (value.owner !== claim.owner || value.fence !== claim.fence ||
            value.preparation_id !== preparationId) throw new Error();
      }
      const commit = await client.query('COMMIT');
      if (commit.command !== 'COMMIT') throw new Error();
      committed = true;
      return value; // Never release data before positive COMMIT acknowledgement.
    } catch {
      if (client) { try { await client.query('ROLLBACK'); } catch { /* Unknown outcome stays denied. */ } }
      throw new Error('signer_database_unavailable'); // No cause, SQL or connection details.
    } finally { client?.release(!committed); }
  }
  return Object.freeze({
    selectPreparationClaim: ({ p_brief }) => execute('select', [p_brief]),
    bindPreparation: ({ p_preparation, p_prepared }) => {
      if (!preparationId || p_preparation !== preparationId) throw new Error('claim_rejected');
      return execute('bind', [p_preparation, JSON.stringify(p_prepared)]);
    },
    authorizePreparationRelease: ({ p_preparation, p_envelope }) => {
      if (!preparationId || p_preparation !== preparationId) throw new Error('claim_rejected');
      return execute('release', [p_preparation, JSON.stringify(p_envelope)]);
    },
  });
}
