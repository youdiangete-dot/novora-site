import { expect, test } from '@playwright/test';

const malformedSupabaseUrlTestEnabled =
  process.env.NOVORA_EXPECT_MALFORMED_SUPABASE_URL_TEST === '1';

test.describe('/api/concept-briefs persistence hardening', () => {
  test('returns the safe fallback response when the Supabase admin URL is malformed', async ({
    request,
  }) => {
    test.skip(
      !malformedSupabaseUrlTestEnabled,
      'Set NOVORA_EXPECT_MALFORMED_SUPABASE_URL_TEST=1 with dummy Supabase env to test malformed URL fallback.',
    );

    const response = await request.post('/api/concept-briefs', {
      data: {
        customerName: 'Local Persistence Test',
        customerEmail: 'local-persistence-test@example.com',
        conceptBrief: {
          pieceType: 'ring',
          structure: 'ring_center_stone',
        },
        summaryItems: [{ label: 'Piece type', value: 'Ring' }],
      },
    });

    expect(response.status()).toBe(202);

    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toMatchObject({
      ok: true,
      mode: 'supabase',
      persisted: false,
      message: 'Concept Brief persistence is temporarily unavailable due to server configuration.',
    });
    expect(body).not.toHaveProperty('publicReference');
    expect(body).not.toHaveProperty('conceptBriefId');
  });
});
