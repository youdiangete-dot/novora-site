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

function readExactFirstPreviewCustomerAccessCookie(
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

export async function readFirstPreviewCustomerViewBinding(
  request: FirstPreviewCustomerViewBindingRequest,
): Promise<FirstPreviewCustomerView> {
  try {
    if (!isInstantFirstPreviewAgentEnabled()) return unavailable();

    const signingSecret =
      process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ?? null;
    if (!hasUsableSigningSecret(signingSecret)) return unavailable();

    const accessProof = await readProductionFirstPreviewCustomerAccessProof();
    if (typeof accessProof !== "string" || accessProof.length === 0) {
      return denied();
    }

    const lazyStateSource: FirstPreviewCustomerPreviewStateSource = {
      async readExactCustomerPreviewState(lookup) {
        const supabase = createSupabaseAdminClientOrNull();
        const stateSource = supabase
          ? createSupabaseFirstPreviewCustomerViewStateSource(
              createFirstPreviewCustomerViewDatabaseClient(supabase),
            )
          : createUnavailableFirstPreviewCustomerViewStateSource();
        return stateSource.readExactCustomerPreviewState(lookup);
      },
    };

    return await readFirstPreviewCustomerView(
      {
        publicReference: request.publicReference,
        accessProof,
      },
      {
        clock: () => Math.floor(Date.now() / 1_000),
        signingSecret,
        stateSource: lazyStateSource,
      },
    );
  } catch {
    return unavailable();
  }
}
