import { expect, test } from '@playwright/test';

import { classifyConceptBriefPersistenceError } from '../../lib/server/concept-brief-persistence-diagnostics';

test.describe('concept brief persistence diagnostics', () => {
  test('classifies PostgREST schema cache column errors without leaking raw payload data', () => {
    const diagnostics = classifyConceptBriefPersistenceError({
      code: 'PGRST204',
      message:
        "Could not find the 'brief_payload' column of 'concept_briefs' in the schema cache",
      details: 'Payload included customer name Mina Chen and email mina@example.com.',
      hint: 'Check the column name.',
    });

    expect(diagnostics).toEqual({
      errorName: 'UnknownError',
      errorCode: 'PGRST204',
      messageClass: 'postgrest_schema_or_column_mismatch',
      safeHint: 'Compare concept_briefs insert/select columns with the live schema.',
      safeColumnHint: 'brief_payload',
      hasPostgrestShape: true,
    });
    expect(JSON.stringify(diagnostics)).not.toContain('Mina Chen');
    expect(JSON.stringify(diagnostics)).not.toContain('mina@example.com');
  });

  test('classifies not-null, check, unique, type, permission, and network failures safely', () => {
    expect(
      classifyConceptBriefPersistenceError({
        code: '23502',
        message: 'null value in column "public_reference" violates not-null constraint',
      }),
    ).toMatchObject({
      messageClass: 'postgrest_not_null_or_check_violation',
      safeColumnHint: 'public_reference',
      hasPostgrestShape: true,
    });

    expect(
      classifyConceptBriefPersistenceError({
        code: '23514',
        message: 'new row violates check constraint "concept_briefs_status_check"',
      }),
    ).toMatchObject({
      messageClass: 'postgrest_not_null_or_check_violation',
      hasPostgrestShape: true,
    });

    expect(
      classifyConceptBriefPersistenceError({
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      }),
    ).toMatchObject({
      messageClass: 'postgrest_unique_or_conflict',
      hasPostgrestShape: true,
    });

    expect(
      classifyConceptBriefPersistenceError({
        code: '22P02',
        message: 'invalid input syntax for type json',
      }),
    ).toMatchObject({
      messageClass: 'postgrest_invalid_json_or_type',
      hasPostgrestShape: true,
    });

    expect(
      classifyConceptBriefPersistenceError({
        code: '42501',
        message: 'permission denied for table concept_briefs',
      }),
    ).toMatchObject({
      messageClass: 'postgrest_permission_or_rls',
      hasPostgrestShape: true,
    });

    expect(classifyConceptBriefPersistenceError(new TypeError('fetch failed'))).toMatchObject({
      errorName: 'TypeError',
      messageClass: 'network_or_fetch_failure',
      hasPostgrestShape: false,
    });
  });
});
