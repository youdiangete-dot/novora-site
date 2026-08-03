import "server-only";

import { after } from "next/server";

export type FirstPreviewPostResponseScheduler = (
  task: () => void | Promise<void>,
) => void;

export function scheduleFirstPreviewPostResponseTask(
  task: () => Promise<void>,
  schedule: FirstPreviewPostResponseScheduler = after,
): boolean {
  try {
    schedule(async () => {
      try {
        await task();
      } catch {
        // Background failure is recorded by the lifecycle when possible. It
        // must never reject into or alter the confirmed 201 response.
      }
    });
    return true;
  } catch {
    return false;
  }
}
