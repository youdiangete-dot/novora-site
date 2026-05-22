import "server-only";

import { createSupabaseAdminClientOrNull } from "./supabase";

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_API_KEY_ENV = "RESEND_API_KEY";
const ADMIN_NOTIFICATION_EMAIL_ENV = "NOVORA_ADMIN_NOTIFICATION_EMAIL";
const EMAIL_FROM_ENV = "NOVORA_EMAIL_FROM";
const EMAIL_REPLY_TO_ENV = "NOVORA_EMAIL_REPLY_TO";

type ConceptBriefNotificationBriefRow = {
  id: string;
  public_reference: string;
  piece_type: string | null;
};

type ConceptBriefNotificationContactRow = {
  customer_name: string | null;
  customer_email: string | null;
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

  const { data: contact, error: contactError } = await supabase
    .from("concept_brief_contacts")
    .select("customer_name, customer_email")
    .eq("concept_brief_id", brief.id)
    .maybeSingle<ConceptBriefNotificationContactRow>();

  if (contactError) {
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
    to: [config.adminNotificationEmail],
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
  } catch {
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
