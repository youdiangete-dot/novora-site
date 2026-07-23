import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClientOrNull } from "../supabase";
import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV,
} from "./first-preview-customer-access-contract";
import {
  createFirstPreviewCustomerAccessAuthorizerBinding,
  createFirstPreviewCustomerAccessDatabaseClient,
  type FirstPreviewCustomerAccessAuthorizer,
} from "./supabase-first-preview-customer-access";

export * from "./first-preview-customer-access-contract";
export {
  createFirstPreviewCustomerAccessAuthorizerBinding,
  createFirstPreviewCustomerAccessDatabaseClient,
  createSupabaseFirstPreviewCustomerAccessAuthorizer,
  createUnavailableFirstPreviewCustomerAccessAuthorizer,
  SupabaseFirstPreviewCustomerAccessAuthorizer,
  type FirstPreviewCustomerAccessAuthorizer,
  type FirstPreviewCustomerAccessDatabaseClient,
} from "./supabase-first-preview-customer-access";

type FactoryOptions = Readonly<{
  signingSecret?: string | null;
  supabaseClient?: SupabaseClient | null;
  clock?: () => number;
}>;

export function createFirstPreviewCustomerAccessAuthorizer(
  options: FactoryOptions = {},
): FirstPreviewCustomerAccessAuthorizer {
  const signingSecret = Object.prototype.hasOwnProperty.call(
    options,
    "signingSecret",
  )
    ? options.signingSecret ?? null
    : process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV]?.trim() ??
      null;
  const supabase = Object.prototype.hasOwnProperty.call(
    options,
    "supabaseClient",
  )
    ? options.supabaseClient ?? null
    : createSupabaseAdminClientOrNull();

  return createFirstPreviewCustomerAccessAuthorizerBinding({
    databaseClient: supabase
      ? createFirstPreviewCustomerAccessDatabaseClient(supabase)
      : null,
    signingSecret,
    clock: options.clock,
  });
}
