import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseServerReadiness = {
  readyForPublicServerClient: boolean;
  readyForAdminClient: boolean;
  missingPublicServerClientVariables: string[];
  missingAdminClientVariables: string[];
};

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

function getEnvValue(name: string): string | null {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

function getSupabaseUrlValue(): string | null {
  const value = getEnvValue(SUPABASE_URL_ENV);

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

function getMissingEnvValues(names: string[]): string[] {
  return names.filter((name) => !getEnvValue(name));
}

function readSupabaseJwtRole(key: string): string | null {
  const [, payload] = key.split(".");

  if (!payload) {
    return null;
  }

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(json) as { role?: unknown };

    return typeof claims.role === "string" ? claims.role : null;
  } catch {
    return null;
  }
}

function isSupabaseServiceRoleKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) {
    return true;
  }

  return readSupabaseJwtRole(key) === "service_role";
}

export function getSupabaseServerReadiness(): SupabaseServerReadiness {
  const missingPublicServerClientVariables = getMissingEnvValues([
    SUPABASE_URL_ENV,
    SUPABASE_ANON_KEY_ENV,
  ]);
  const missingAdminClientVariables = getMissingEnvValues([
    SUPABASE_URL_ENV,
    SUPABASE_SERVICE_ROLE_KEY_ENV,
  ]);
  const supabaseUrl = getSupabaseUrlValue();
  const supabaseAnonKey = getEnvValue(SUPABASE_ANON_KEY_ENV);
  const supabaseServiceRoleKey = getEnvValue(SUPABASE_SERVICE_ROLE_KEY_ENV);

  return {
    readyForPublicServerClient: Boolean(supabaseUrl && supabaseAnonKey),
    readyForAdminClient: Boolean(
      supabaseUrl &&
        supabaseServiceRoleKey &&
        isSupabaseServiceRoleKey(supabaseServiceRoleKey),
    ),
    missingPublicServerClientVariables,
    missingAdminClientVariables,
  };
}

// Server-only skeleton. This file creates clients only when future server code
// deliberately calls these helpers. It performs no database queries and no
// storage operations. Missing env values return null and should not break build.

// The anon key is browser-visible by design, but using it safely still requires
// reviewed RLS, access validation, and storage policies before real data exists.
export function createSupabasePublicServerClientOrNull(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrlValue();
  const supabaseAnonKey = getEnvValue(SUPABASE_ANON_KEY_ENV);

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// The service role key is highly privileged and must stay server-only. Future
// routes must validate caller access before using this helper for any operation.
export function createSupabaseAdminClientOrNull(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrlValue();
  const supabaseServiceRoleKey = getEnvValue(SUPABASE_SERVICE_ROLE_KEY_ENV);

  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey ||
    !isSupabaseServiceRoleKey(supabaseServiceRoleKey)
  ) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
      },
    },
  });
}
