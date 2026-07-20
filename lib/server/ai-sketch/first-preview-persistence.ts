import "server-only";

import {
  createUnavailableFirstPreviewRepository,
  type FirstPreviewRepository,
} from "./first-preview-persistence-contract";

export * from "./first-preview-persistence-contract";

export function createFirstPreviewRepository(): FirstPreviewRepository {
  return createUnavailableFirstPreviewRepository();
}
