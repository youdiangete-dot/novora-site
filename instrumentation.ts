export async function register(): Promise<void> {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== "integration/instant-first-preview-agent" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) return;

  const { attestPreviewIsolationOnce } = await import(
    "./lib/server/preview-isolation-attestation"
  );
  await attestPreviewIsolationOnce();
}
