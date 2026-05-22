import "server-only";

import type { AdminNotificationEventRecord } from "../../app/admin/briefs/briefReviewData";
import { createSupabaseAdminClientOrNull } from "./supabase";

const ADMIN_CONCEPT_BRIEF_SUBMITTED_NOTIFICATION_TYPE = "admin_concept_brief_submitted";

type AdminNotificationEventRow = {
  id: string;
  concept_brief_id: string;
  notification_type: string | null;
  status: string | null;
  recipient_email: string | null;
  reserved_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  resend_message_id: string | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminNotificationEventLoadResult =
  | {
      ok: true;
      event: AdminNotificationEventRecord | null;
      message?: string;
    }
  | {
      ok: false;
      event: null;
      message: string;
    };

function readString(value: string | null): string {
  return value?.trim() || "";
}

function mapNotificationEventRow(row: AdminNotificationEventRow): AdminNotificationEventRecord {
  return {
    id: row.id,
    conceptBriefId: row.concept_brief_id,
    notificationType: readString(row.notification_type),
    status: readString(row.status),
    recipientEmail: readString(row.recipient_email),
    reservedAt: readString(row.reserved_at),
    sentAt: readString(row.sent_at),
    failedAt: readString(row.failed_at),
    resendMessageId: readString(row.resend_message_id),
    errorMessage: readString(row.error_message),
    createdAt: readString(row.created_at),
    updatedAt: readString(row.updated_at),
  };
}

export async function loadLatestAdminNotificationEventByConceptBriefId(
  conceptBriefId: string,
): Promise<AdminNotificationEventLoadResult> {
  const normalizedConceptBriefId = conceptBriefId.trim();

  if (!normalizedConceptBriefId) {
    return {
      ok: true,
      event: null,
    };
  }

  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return {
      ok: false,
      event: null,
      message: "Server Supabase admin access is not configured. Notification status is unavailable.",
    };
  }

  const { data: event, error } = await supabase
    .from("concept_brief_notification_events")
    .select(
      "id, concept_brief_id, notification_type, status, recipient_email, reserved_at, sent_at, failed_at, resend_message_id, error_message, created_at, updated_at",
    )
    .eq("concept_brief_id", normalizedConceptBriefId)
    .eq("notification_type", ADMIN_CONCEPT_BRIEF_SUBMITTED_NOTIFICATION_TYPE)
    .order("created_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<AdminNotificationEventRow>();

  if (error) {
    return {
      ok: false,
      event: null,
      message: "Admin notification status is temporarily unavailable.",
    };
  }

  return {
    ok: true,
    event: event ? mapNotificationEventRow(event) : null,
  };
}
