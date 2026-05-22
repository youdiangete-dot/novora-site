import "server-only";

import { createSupabaseAdminClientOrNull } from "./supabase";

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_API_KEY_ENV = "RESEND_API_KEY";
const ADMIN_NOTIFICATION_EMAIL_ENV = "NOVORA_ADMIN_NOTIFICATION_EMAIL";
const EMAIL_FROM_ENV = "NOVORA_EMAIL_FROM";
const EMAIL_REPLY_TO_ENV = "NOVORA_EMAIL_REPLY_TO";
const ADMIN_CONCEPT_BRIEF_SUBMITTED_NOTIFICATION = "admin_concept_brief_submitted";
const UNIQUE_VIOLATION_CODE = "23505";

type ConceptBriefNotificationBriefRow = {
  id: string;
  public_reference: string;
  piece_type: string | null;
};

type ConceptBriefNotificationContactRow = {
  customer_name: string | null;
  customer_email: string | null;
};

type ConceptBriefNotificationEventRow = {
  id: string;
};

type AdminEmailNotificationInput = {
  conceptBriefId: string;
  publicReference: string;
  adminDetailUrl: string;
};

export type AdminEmailNotificationResult = {
  ok: boolean;
  notified: boolean;
  skipped: boolean;
  message: string;
};

type AdminEmailNotificationConfig = {
  resendApiKey: string;
  adminNotificationEmail: string;
  emailFrom: string;
  emailReplyTo: string | null;
};

const pieceTypeLabels: Record<string, string> = {
  bracelet_bangle: "Bracelet / Bangle",
  earrings: "Earrings",
  other_custom: "Other / custom piece",
  pendant_necklace: "Pendant / Necklace",
  ring: "Ring",
};

function readEnvValue(name: string): string | null {
  const value = process.env[name]?.trim();

  return value || null;
}

function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getAdminEmailNotificationConfig(): AdminEmailNotificationConfig | null {
  const resendApiKey = readEnvValue(RESEND_API_KEY_ENV);
  const adminNotificationEmail = readEnvValue(ADMIN_NOTIFICATION_EMAIL_ENV);
  const emailFrom = readEnvValue(EMAIL_FROM_ENV);

  if (!resendApiKey || !adminNotificationEmail || !emailFrom) {
    return null;
  }

  return {
    resendApiKey,
    adminNotificationEmail,
    emailFrom,
    emailReplyTo: readEnvValue(EMAIL_REPLY_TO_ENV),
  };
}

function displayPieceType(value: string | null): string {
  if (!value?.trim()) {
    return "Not provided";
  }

  return pieceTypeLabels[value] || value.replaceAll("_", " ");
}

function displayText(value: string | null): string {
  return value?.trim() || "Not provided";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readResendMessageId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const id = (value as { id?: unknown }).id;

  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function buildNotificationFailureMessage(reason: string): string {
  return reason.slice(0, 240);
}

async function markNotificationEventSent(input: {
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClientOrNull>>;
  eventId: string;
  resendMessageId: string | null;
  conceptBriefId: string;
}) {
  const sentAt = new Date().toISOString();
  const { error } = await input.supabase
    .from("concept_brief_notification_events")
    .update({
      status: "sent",
      resend_message_id: input.resendMessageId,
      sent_at: sentAt,
      updated_at: sentAt,
    })
    .eq("id", input.eventId);

  if (error) {
    console.error("Admin email notification event sent update failed.", {
      code: error.code,
      conceptBriefId: input.conceptBriefId,
      notificationEventId: input.eventId,
    });
  }
}

async function markNotificationEventFailed(input: {
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClientOrNull>>;
  eventId: string;
  conceptBriefId: string;
  errorMessage: string;
}) {
  const failedAt = new Date().toISOString();
  const { error } = await input.supabase
    .from("concept_brief_notification_events")
    .update({
      status: "failed",
      error_message: buildNotificationFailureMessage(input.errorMessage),
      failed_at: failedAt,
      updated_at: failedAt,
    })
    .eq("id", input.eventId);

  if (error) {
    console.error("Admin email notification event failed update failed.", {
      code: error.code,
      conceptBriefId: input.conceptBriefId,
      notificationEventId: input.eventId,
    });
  }
}

function buildEmailText(input: {
  publicReference: string;
  customerName: string;
  customerEmail: string;
  pieceType: string;
  referenceImageCount: string;
  adminDetailUrl: string;
}): string {
  return [
    "A new NOVORA Concept Brief was submitted for admin review.",
    "",
    `Concept Brief ID / publicReference: ${input.publicReference}`,
    `Customer name: ${input.customerName}`,
    `Customer email: ${input.customerEmail}`,
    `Piece type: ${input.pieceType}`,
    `Reference image count: ${input.referenceImageCount}`,
    `Admin detail link: ${input.adminDetailUrl}`,
    "",
    "Boundary: this is a concept brief notification only. It does not create CAD, pricing, sourcing, production, payment, or customer confirmation email workflow.",
  ].join("\n");
}

function buildEmailHtml(input: {
  publicReference: string;
  customerName: string;
  customerEmail: string;
  pieceType: string;
  referenceImageCount: string;
  adminDetailUrl: string;
}): string {
  const rows = [
    ["Concept Brief ID / publicReference", input.publicReference],
    ["Customer name", input.customerName],
    ["Customer email", input.customerEmail],
    ["Piece type", input.pieceType],
    ["Reference image count", input.referenceImageCount],
  ];

  return `
    <main>
      <h1>New NOVORA Concept Brief</h1>
      <p>A new Concept Brief was submitted for admin review.</p>
      <dl>
        ${rows
          .map(
            ([label, value]) =>
              `<div><dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd></div>`,
          )
          .join("")}
      </dl>
      <p><a href="${escapeHtml(input.adminDetailUrl)}">Open protected admin detail</a></p>
      <p>
        Boundary: this is a concept brief notification only. It does not create CAD, pricing,
        sourcing, production, payment, or customer confirmation email workflow.
      </p>
    </main>
  `;
}

export async function sendAdminConceptBriefNotification(
  input: AdminEmailNotificationInput,
): Promise<AdminEmailNotificationResult> {
  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return {
      ok: true,
      notified: false,
      skipped: true,
      message: "Admin email notification skipped because Supabase admin access is not configured.",
    };
  }

  const { data: brief, error: briefError } = await supabase
    .from("concept_briefs")
    .select("id, public_reference, piece_type")
    .eq("id", input.conceptBriefId)
    .eq("public_reference", input.publicReference)
    .maybeSingle<ConceptBriefNotificationBriefRow>();

  if (briefError || !brief) {
    console.error("Admin email notification skipped during concept brief verification.", {
      code: briefError?.code,
      conceptBriefId: input.conceptBriefId,
    });

    return {
      ok: true,
      notified: false,
      skipped: true,
      message: "Admin email notification skipped because the concept brief could not be verified.",
    };
  }

  const config = getAdminEmailNotificationConfig();

  if (!config) {
    return {
      ok: true,
      notified: false,
      skipped: true,
      message: "Admin email notification skipped because email environment is not configured.",
    };
  }

  const recipientEmail = normalizeRecipientEmail(config.adminNotificationEmail);
  const reservedAt = new Date().toISOString();
  const { data: notificationEvent, error: reservationError } = await supabase
    .from("concept_brief_notification_events")
    .insert({
      concept_brief_id: brief.id,
      notification_type: ADMIN_CONCEPT_BRIEF_SUBMITTED_NOTIFICATION,
      recipient_email: recipientEmail,
      status: "reserved",
      reserved_at: reservedAt,
      updated_at: reservedAt,
    })
    .select("id")
    .single<ConceptBriefNotificationEventRow>();

  if (reservationError || !notificationEvent) {
    if (reservationError?.code === UNIQUE_VIOLATION_CODE) {
      return {
        ok: true,
        notified: false,
        skipped: true,
        message: "Admin email notification skipped because it was already reserved or sent.",
      };
    }

    console.error("Admin email notification reservation failed.", {
      code: reservationError?.code,
      conceptBriefId: brief.id,
      notificationType: ADMIN_CONCEPT_BRIEF_SUBMITTED_NOTIFICATION,
    });

    return {
      ok: true,
      notified: false,
      skipped: true,
      message: "Admin email notification skipped because idempotency reservation failed.",
    };
  }

  const { data: contact, error: contactError } = await supabase
    .from("concept_brief_contacts")
    .select("customer_name, customer_email")
    .eq("concept_brief_id", brief.id)
    .maybeSingle<ConceptBriefNotificationContactRow>();

  if (contactError) {
    await markNotificationEventFailed({
      supabase,
      eventId: notificationEvent.id,
      conceptBriefId: brief.id,
      errorMessage: "Contact lookup failed.",
    });

    console.error("Admin email notification skipped during contact lookup.", {
      code: contactError.code,
      conceptBriefId: brief.id,
    });

    return {
      ok: true,
      notified: false,
      skipped: true,
      message: "Admin email notification skipped because contact details could not be loaded.",
    };
  }

  const { data: referenceAssets, error: referenceAssetsError } = await supabase
    .from("concept_brief_reference_assets")
    .select("id")
    .eq("concept_brief_id", brief.id)
    .eq("asset_role", "reference_image")
    .returns<Array<{ id: string }>>();

  if (referenceAssetsError) {
    console.error("Admin email notification reference asset count unavailable.", {
      code: referenceAssetsError.code,
      conceptBriefId: brief.id,
    });
  }

  const emailInput = {
    publicReference: brief.public_reference,
    customerName: displayText(contact?.customer_name ?? null),
    customerEmail: displayText(contact?.customer_email ?? null),
    pieceType: displayPieceType(brief.piece_type),
    referenceImageCount: referenceAssetsError ? "Unavailable" : String(referenceAssets?.length || 0),
    adminDetailUrl: input.adminDetailUrl,
  };
  const resendPayload: Record<string, unknown> = {
    from: config.emailFrom,
    to: [recipientEmail],
    subject: `New NOVORA Concept Brief: ${brief.public_reference}`,
    text: buildEmailText(emailInput),
    html: buildEmailHtml(emailInput),
  };

  if (config.emailReplyTo) {
    resendPayload.reply_to = config.emailReplyTo;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    if (!response.ok) {
      await markNotificationEventFailed({
        supabase,
        eventId: notificationEvent.id,
        conceptBriefId: brief.id,
        errorMessage: `Resend request failed with status ${response.status}.`,
      });

      console.error("Admin email notification provider request failed.", {
        status: response.status,
        conceptBriefId: brief.id,
      });

      return {
        ok: true,
        notified: false,
        skipped: false,
        message: "Admin email notification could not be sent.",
      };
    }

    const responseBody = (await response.json().catch(() => null)) as unknown;
    await markNotificationEventSent({
      supabase,
      eventId: notificationEvent.id,
      conceptBriefId: brief.id,
      resendMessageId: readResendMessageId(responseBody),
    });
  } catch {
    await markNotificationEventFailed({
      supabase,
      eventId: notificationEvent.id,
      conceptBriefId: brief.id,
      errorMessage: "Resend request threw before completion.",
    });

    console.error("Admin email notification provider request threw.", {
      conceptBriefId: brief.id,
    });

    return {
      ok: true,
      notified: false,
      skipped: false,
      message: "Admin email notification could not be sent.",
    };
  }

  return {
    ok: true,
    notified: true,
    skipped: false,
    message: "Admin email notification sent.",
  };
}
