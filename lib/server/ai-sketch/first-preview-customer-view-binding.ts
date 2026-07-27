import "server-only";

import { cookies } from "next/headers";

import { createSupabaseAdminClientOrNull } from "../supabase";
import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
  FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV,
} from "./first-preview-customer-access-contract";
import {
  isInstantFirstPreviewAgentEnabled,
} from "./instant-first-preview-feature-flag";
import {
  readFirstPreviewCustomerView,
  type FirstPreviewCustomerPreviewStateSource,
  type FirstPreviewCustomerView,
} from "./first-preview-customer-view";
import {
  createFirstPreviewCustomerViewDatabaseClient,
  createSupabaseFirstPreviewCustomerViewStateSource,
  createUnavailableFirstPreviewCustomerViewStateSource,
} from "./supabase-first-preview-customer-view";

export type FirstPreviewCustomerViewBindingRequest = Readonly<{
  publicReference: string;
}>;

export type FirstPreviewCustomerViewBinding = (
  request: FirstPreviewCustomerViewBindingRequest,
) => Promise<FirstPreviewCustomerView>;

export type FirstPreviewCustomerAccessProofReader = () =>
  | unknown
  | Promise<unknown>;

export type FirstPreviewCustomerViewBindingDependencies = Readonly<{
  enabled: boolean;
  signingSecret: string | null;
  clock: () => number;
  readAccessProof: FirstPreviewCustomerAccessProofReader;
  createStateSource: () => FirstPreviewCustomerPreviewStateSource;
}>;

type FirstPreviewCookieStore = Readonly<{
  get(name: string): Readonly<{ value: string }> | undefined;
}>;

function unavailable(): FirstPreviewCustomerView {
  return { state: "unavailable" };
}

function denied(): FirstPreviewCustomerView {
  return { state: "denied" };
}

function hasUsableSigningSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 4_096 &&
    value.length === value.trim().length &&
    Buffer.byteLength(value, "utf8") >= 32
  );
}

export function readExactFirstPreviewCustomerAccessCookie(
  cookieStore: FirstPreviewCookieStore,
): string | null {
  try {
    const cookie = cookieStore.get(FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME);
    return cookie && typeof cookie.value === "string" ? cookie.value : null;
  } catch {
    return null;
  }
}

async function readProductionFirstPreviewCustomerAccessProof(): Promise<
  string | null
> {
  return readExactFirstPreviewCustomerAccessCookie(await cookies());
}

export function createFirstPreviewCustomerViewBinding(
  dependencies: FirstPreviewCustomerViewBindingDependencies,
): FirstPreviewCustomerViewBinding {
  return async (request) => {
    if (
      dependencies.enabled !== true ||
      !hasUsableSigningSecret(dependencies.signingSecret)
    ) {
      return unavailable();
    }
    try {
      const accessProof = await dependencies.readAccessProof();
      if (typeof accessProof !== "string" || accessProof.length === 0) {
        return denied();
      }

      const lazyStateSource: FirstPreviewCustomerPreviewStateSource = {
        async readExactCustomerPreviewState(lookup) {
          const stateSource = dependencies.createStateSource();
          return stateSource.readExactCustomerPreviewState(lookup);
        },
      };
      return await readFirstPreviewCustomerView({
        publicReference: request.publicReference,
        accessProof,
      }, {
        clock: dependencies.clock,
        signingSecret: dependencies.signingSecret,
        stateSource: lazyStateSource,
      });
    } catch {
      return unavailable();
    }
  };
}

export async function readFirstPreviewCustomerViewBinding(
  request: FirstPreviewCustomerViewBindingRequest,
): Promise<FirstPreviewCustomerView> {
  try {
    if (!isInstantFirstPreviewAgentEnabled()) return unavailable();

    const signingSecret =
      process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ?? null;
    if (!hasUsableSigningSecret(signingSecret)) return unavailable();

    return createFirstPreviewCustomerViewBinding({
      enabled: true,
      signingSecret,
      clock: () => Math.floor(Date.now() / 1_000),
      readAccessProof: readProductionFirstPreviewCustomerAccessProof,
      createStateSource() {
        const supabase = createSupabaseAdminClientOrNull();
        return supabase
          ? createSupabaseFirstPreviewCustomerViewStateSource(
              createFirstPreviewCustomerViewDatabaseClient(supabase),
            )
          : createUnavailableFirstPreviewCustomerViewStateSource();
      },
    })(request);
  } catch {
    return unavailable();
  }
}
