export type ConceptBriefPersistenceMessageClass =
  | "supabase_url_invalid"
  | "supabase_admin_client_unavailable"
  | "postgrest_schema_or_column_mismatch"
  | "postgrest_not_null_or_check_violation"
  | "postgrest_permission_or_rls"
  | "postgrest_unique_or_conflict"
  | "postgrest_invalid_json_or_type"
  | "network_or_fetch_failure"
  | "unknown_insert_failure";

export type SafeConceptBriefPersistenceDiagnostics = {
  errorName: string;
  errorCode?: string;
  messageClass: ConceptBriefPersistenceMessageClass;
  safeHint: string;
  safeColumnHint?: string;
  hasPostgrestShape: boolean;
};

type SupabaseErrorLike = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
  name?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readErrorField(error: unknown, field: keyof SupabaseErrorLike): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const value = error[field];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getSafeConceptBriefPersistenceErrorName(error: unknown): string {
  return readErrorField(error, "name") || (error instanceof Error ? error.name : "UnknownError");
}

export function getSafeConceptBriefPersistenceErrorCode(error: unknown): string | undefined {
  return readErrorField(error, "code");
}

function getSafeErrorText(error: unknown): string {
  const fields = [
    readErrorField(error, "message"),
    readErrorField(error, "details"),
    readErrorField(error, "hint"),
    error instanceof Error ? error.message : undefined,
  ];

  return fields.filter(Boolean).join(" ").toLowerCase();
}

function hasPostgrestErrorShape(error: unknown): boolean {
  if (!isRecord(error) || error instanceof Error) {
    return false;
  }

  return ["code", "details", "hint", "message"].some((field) => field in error);
}

function getSafeColumnHint(errorText: string): string | undefined {
  const patterns = [
    /\bcolumn\s+"([a-zA-Z_][a-zA-Z0-9_]*)"/,
    /'([a-zA-Z_][a-zA-Z0-9_]*)'\s+column\b/,
    /\bcolumn\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/,
  ];

  for (const pattern of patterns) {
    const match = errorText.match(pattern);
    const column = match?.[1];

    if (column && !["for", "in", "of", "the"].includes(column)) {
      return column;
    }
  }

  return undefined;
}

function getMessageClass(error: unknown): ConceptBriefPersistenceMessageClass {
  const code = getSafeConceptBriefPersistenceErrorCode(error);
  const name = getSafeConceptBriefPersistenceErrorName(error);
  const text = getSafeErrorText(error);

  if (
    name === "TypeError" &&
    (text.includes("invalid url") || text.includes("failed to parse url") || text.includes("url"))
  ) {
    return "supabase_url_invalid";
  }

  if (
    name === "TypeError" ||
    text.includes("failed to fetch") ||
    text.includes("fetch failed") ||
    text.includes("network") ||
    text.includes("econnreset") ||
    text.includes("etimedout")
  ) {
    return "network_or_fetch_failure";
  }

  if (code === "23502" || code === "23514" || text.includes("null value") || text.includes("check constraint")) {
    return "postgrest_not_null_or_check_violation";
  }

  if (
    code === "42501" ||
    text.includes("permission denied") ||
    text.includes("row-level security") ||
    text.includes("rls")
  ) {
    return "postgrest_permission_or_rls";
  }

  if (
    code === "23505" ||
    text.includes("duplicate key") ||
    text.includes("already exists") ||
    text.includes("conflict")
  ) {
    return "postgrest_unique_or_conflict";
  }

  if (
    code === "22P02" ||
    code === "22023" ||
    text.includes("invalid input syntax") ||
    text.includes("invalid json") ||
    text.includes("json") ||
    text.includes("type")
  ) {
    return "postgrest_invalid_json_or_type";
  }

  if (
    code === "PGRST204" ||
    text.includes("schema cache") ||
    text.includes("could not find") ||
    text.includes("column") ||
    text.includes("relationship")
  ) {
    return "postgrest_schema_or_column_mismatch";
  }

  return "unknown_insert_failure";
}

function getSafeHint(messageClass: ConceptBriefPersistenceMessageClass): string {
  switch (messageClass) {
    case "supabase_url_invalid":
      return "Check server Supabase URL configuration without printing the value.";
    case "supabase_admin_client_unavailable":
      return "Check server-only Supabase admin readiness without printing secrets.";
    case "postgrest_schema_or_column_mismatch":
      return "Compare concept_briefs insert/select columns with the live schema.";
    case "postgrest_not_null_or_check_violation":
      return "Compare required fields, defaults, status values, and check constraints.";
    case "postgrest_permission_or_rls":
      return "Verify service-role access, grants, and RLS policy posture.";
    case "postgrest_unique_or_conflict":
      return "Check unique constraints and public reference collision handling.";
    case "postgrest_invalid_json_or_type":
      return "Check JSON/jsonb payload shape and scalar column value types.";
    case "network_or_fetch_failure":
      return "Check Supabase API reachability from the runtime.";
    case "unknown_insert_failure":
      return "Inspect provider logs for sanitized PostgREST code, class, and column hints.";
  }
}

export function classifyConceptBriefPersistenceError(
  error: unknown,
): SafeConceptBriefPersistenceDiagnostics {
  const messageClass = getMessageClass(error);
  const errorText = getSafeErrorText(error);
  const safeColumnHint =
    messageClass === "postgrest_schema_or_column_mismatch" ||
    messageClass === "postgrest_not_null_or_check_violation" ||
    messageClass === "postgrest_invalid_json_or_type"
      ? getSafeColumnHint(errorText)
      : undefined;

  return {
    errorName: getSafeConceptBriefPersistenceErrorName(error),
    errorCode: getSafeConceptBriefPersistenceErrorCode(error),
    messageClass,
    safeHint: getSafeHint(messageClass),
    safeColumnHint,
    hasPostgrestShape: hasPostgrestErrorShape(error),
  };
}
