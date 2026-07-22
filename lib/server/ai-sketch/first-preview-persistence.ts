import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createUnavailableFirstPreviewRepository,
  type FirstPreviewRepository,
} from "./first-preview-persistence-contract";
import { createSupabaseAdminClientOrNull } from "../supabase";
import {
  createFirstPreviewDatabaseClient,
  createSupabaseFirstPreviewRepository,
} from "./supabase-first-preview-repository";

export * from "./first-preview-persistence-contract";
export {
  createFirstPreviewDatabaseClient,
  createSupabaseFirstPreviewRepository,
  SupabaseFirstPreviewRepository,
  type FirstPreviewDatabaseClient,
} from "./supabase-first-preview-repository";

type FirstPreviewRepositoryFactoryOptions = Readonly<{
  supabaseClient?: SupabaseClient | null;
}>;

export function createFirstPreviewRepository(
  options: FirstPreviewRepositoryFactoryOptions = {},
): FirstPreviewRepository {
  const supabase = Object.prototype.hasOwnProperty.call(options, "supabaseClient")
    ? options.supabaseClient ?? null
    : createSupabaseAdminClientOrNull();

  if (!supabase) {
    return createUnavailableFirstPreviewRepository();
  }

  return createSupabaseFirstPreviewRepository(
    createFirstPreviewDatabaseClient(supabase),
  );
}
