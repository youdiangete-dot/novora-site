import "server-only";

type EnvExposure = "browser-visible" | "server-only";

type EnvReadinessItem = {
  name: string;
  present: boolean;
  exposure: EnvExposure;
  requiredFor: string;
};

type NovoraServerEnvStatus = {
  readyForSupabasePublicClient: boolean;
  readyForSupabaseAdminOperations: boolean;
  readyForSupabaseDatabase: boolean;
  readyForReferenceStorage: boolean;
  readyForAiSketchStorage: boolean;
  readyForOptionalFutureStorage: boolean;
  readyForOpenAiImageGeneration: boolean;
  readyForAdminEmailNotifications: boolean;
  variables: EnvReadinessItem[];
};

const ENV_DEFINITIONS: Array<Omit<EnvReadinessItem, "present">> = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    exposure: "browser-visible",
    requiredFor: "Future browser-safe Supabase project URL usage.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    exposure: "browser-visible",
    requiredFor: "Future browser-safe Supabase anon key usage with reviewed RLS.",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    exposure: "server-only",
    requiredFor: "Future privileged Supabase operations from server code only.",
  },
  {
    name: "SUPABASE_DATABASE_URL",
    exposure: "server-only",
    requiredFor: "Future server-side database connection or migration tooling.",
  },
  {
    name: "SUPABASE_STORAGE_BUCKET_REFERENCES",
    exposure: "server-only",
    requiredFor: "Future private customer reference asset storage.",
  },
  {
    name: "SUPABASE_STORAGE_BUCKET_AI_SKETCHES",
    exposure: "server-only",
    requiredFor: "Future private AI sketch output storage.",
  },
  {
    name: "SUPABASE_STORAGE_BUCKET_CAD_PREVIEWS",
    exposure: "server-only",
    requiredFor: "Optional future CAD preview storage.",
  },
  {
    name: "SUPABASE_STORAGE_BUCKET_ORDER_ATTACHMENTS",
    exposure: "server-only",
    requiredFor: "Optional future quote or order attachment storage.",
  },
  {
    name: "OPENAI_API_KEY",
    exposure: "server-only",
    requiredFor: "Future server-side AI sketch generation.",
  },
  {
    name: "RESEND_API_KEY",
    exposure: "server-only",
    requiredFor: "Admin-only Concept Brief email notifications through Resend.",
  },
  {
    name: "NOVORA_ADMIN_NOTIFICATION_EMAIL",
    exposure: "server-only",
    requiredFor: "Destination inbox for admin-only Concept Brief notifications.",
  },
  {
    name: "NOVORA_EMAIL_FROM",
    exposure: "server-only",
    requiredFor: "Verified sender address for admin-only Concept Brief notifications.",
  },
  {
    name: "NOVORA_EMAIL_REPLY_TO",
    exposure: "server-only",
    requiredFor: "Optional reply-to address for admin-only Concept Brief notifications.",
  },
];

function hasEnvValue(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

// Server-only readiness skeleton. Service role keys, database URLs, and the
// OpenAI API key must stay server-side. NEXT_PUBLIC values are browser-visible.
// This helper does not connect to Supabase or OpenAI, does not log secrets,
// and intentionally returns presence/readiness metadata instead of raw values.
export function getNovoraServerEnvStatus(): NovoraServerEnvStatus {
  const variables = ENV_DEFINITIONS.map((definition) => ({
    ...definition,
    present: hasEnvValue(definition.name),
  }));

  const present = (name: string) =>
    variables.find((variable) => variable.name === name)?.present ?? false;

  return {
    readyForSupabasePublicClient:
      present("NEXT_PUBLIC_SUPABASE_URL") &&
      present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    readyForSupabaseAdminOperations:
      present("NEXT_PUBLIC_SUPABASE_URL") &&
      present("SUPABASE_SERVICE_ROLE_KEY"),
    readyForSupabaseDatabase: present("SUPABASE_DATABASE_URL"),
    readyForReferenceStorage: present("SUPABASE_STORAGE_BUCKET_REFERENCES"),
    readyForAiSketchStorage: present("SUPABASE_STORAGE_BUCKET_AI_SKETCHES"),
    readyForOptionalFutureStorage:
      present("SUPABASE_STORAGE_BUCKET_CAD_PREVIEWS") &&
      present("SUPABASE_STORAGE_BUCKET_ORDER_ATTACHMENTS"),
    readyForOpenAiImageGeneration: present("OPENAI_API_KEY"),
    readyForAdminEmailNotifications:
      present("RESEND_API_KEY") &&
      present("NOVORA_ADMIN_NOTIFICATION_EMAIL") &&
      present("NOVORA_EMAIL_FROM"),
    variables,
  };
}
