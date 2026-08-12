import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const candidatePath = resolve(
  process.cwd(),
  "docs/novora-m4-4-commercial-order-candidate.sql",
);
const candidate = readFileSync(candidatePath, "utf8");

test("keeps the M4-4 candidate transaction wrapped, bounded, and unexecuted", () => {
  expect(candidate.match(/\bBEGIN\s*;/gi)).toHaveLength(1);
  expect(candidate.match(/\bCOMMIT\s*;/gi)).toHaveLength(1);
  expect(candidate.indexOf("BEGIN;")).toBeLessThan(candidate.indexOf("CREATE TABLE"));
  expect(candidate.indexOf("COMMIT;")).toBeGreaterThan(candidate.indexOf("CREATE TRIGGER"));
  expect(candidate.match(/SET LOCAL lock_timeout = '2s';/g)).toHaveLength(1);
  expect(candidate.match(/SET LOCAL statement_timeout = '30s';/g)).toHaveLength(1);
  expect(candidate).toMatch(/CANDIDATE ONLY/i);
  expect(candidate).toMatch(/NOT EXECUTED/i);
  expect(candidate).toMatch(/separate Owner-approved live SQL Gate/i);
  expect(candidate).toMatch(/M4-3 public\.commercial_payments foundation/i);
});

test("creates exactly the minimum durable commercial order table", () => {
  expect(candidate.match(/CREATE TABLE\s+public\./gi)).toHaveLength(1);
  expect(candidate.match(/CREATE TABLE\s+public\.commercial_orders\s*\(/gi)).toHaveLength(1);

  const table = candidate.match(
    /CREATE TABLE\s+public\.commercial_orders\s*\(([\s\S]*?)\n\);/i,
  )?.[1];
  expect(table).toBeTruthy();
  expect(table).toMatch(/\bid\s+uuid\s+PRIMARY KEY\s+DEFAULT\s+gen_random_uuid\(\)/i);
  expect(table).toMatch(/\border_reference\s+text\s+NOT NULL\s+UNIQUE\s+DEFAULT/i);
  expect(table).toMatch(/\border_version\s+text\s+NOT NULL\s+DEFAULT\s+'commercial_order_v1'/i);
  expect(table).toMatch(/\bcommercial_payment_reference\s+text\s+NOT NULL\s+UNIQUE/i);
  expect(table).toMatch(/\bcommercial_quotation_reference\s+text\s+NOT NULL\s+UNIQUE/i);
  expect(table).toMatch(/\bamount_minor\s+bigint\s+NOT NULL/i);
  expect(table).toMatch(/\bcurrency\s+text\s+NOT NULL/i);
  expect(table).toMatch(/\bcreated_at\s+timestamptz\s+NOT NULL\s+DEFAULT\s+timezone\('utc', now\(\)\)/i);

  const columnNames = [...(table?.matchAll(/^\s{2}([a-z_]+)\s+(?:uuid|text|bigint|timestamptz)\b/gm) ?? [])]
    .map((match) => match[1]);
  expect(columnNames).toEqual([
    "id",
    "order_reference",
    "order_version",
    "commercial_payment_reference",
    "commercial_quotation_reference",
    "amount_minor",
    "currency",
    "created_at",
  ]);

  expect(candidate).toContain("^NOVORA-O-[A-F0-9]{24}$");
  expect(candidate).toMatch(/CHECK\s*\(order_version = 'commercial_order_v1'\)/i);
  expect(candidate).toMatch(
    /commercial_payment_reference[\s\S]*?REFERENCES\s+public\.commercial_payments\s*\(payment_reference\)/i,
  );
  expect(candidate).toMatch(
    /commercial_quotation_reference[\s\S]*?REFERENCES\s+public\.commercial_quotations\s*\(quote_reference\)/i,
  );
  expect(candidate).toMatch(/CHECK\s*\(amount_minor >= 0 AND amount_minor <= 9007199254740991\)/i);
  expect(candidate).toContain("CHECK (currency ~ '^[A-Z]{3}$')");
});

test("generates order identity in the database and exposes read-only service access", () => {
  expect(candidate).toMatch(
    /order_reference[\s\S]*?DEFAULT\s*\([\s\S]*?'NOVORA-O-'[\s\S]*?gen_random_uuid\(\)/i,
  );
  expect(candidate).toMatch(/ALTER TABLE public\.commercial_orders ENABLE ROW LEVEL SECURITY;/i);
  expect(candidate).toMatch(
    /REVOKE ALL PRIVILEGES ON TABLE public\.commercial_orders\s+FROM public, anon, authenticated, service_role;/i,
  );
  expect(candidate).toMatch(/GRANT SELECT ON TABLE public\.commercial_orders TO service_role;/i);
  expect(candidate).not.toMatch(/GRANT\s+(?:[A-Z, ]*\b(?:INSERT|UPDATE|DELETE)\b)[A-Z, ]*\s+ON TABLE public\.commercial_orders\s+TO service_role/i);
});

test("creates orders atomically only on entry into durable paid state", () => {
  expect(candidate.match(/CREATE OR REPLACE FUNCTION\s+public\.create_commercial_order_after_paid_payment\(\)/gi)).toHaveLength(1);
  expect(candidate).toMatch(/LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = public, pg_temp/i);
  expect(candidate).toMatch(/IF NEW\.status <> 'paid' THEN\s+RETURN NEW;/i);
  expect(candidate).toMatch(/IF TG_OP = 'UPDATE' THEN[\s\S]*?IF OLD\.status = 'paid' THEN\s+RETURN NEW;/i);
  expect(candidate.match(/INSERT INTO public\.commercial_orders\s*\(/gi)).toHaveLength(1);
  expect(candidate).toMatch(
    /INSERT INTO public\.commercial_orders\s*\(\s*commercial_payment_reference,\s*commercial_quotation_reference,\s*amount_minor,\s*currency\s*\)\s*VALUES\s*\(\s*NEW\.payment_reference,\s*NEW\.commercial_quotation_reference,\s*NEW\.amount_minor,\s*NEW\.currency\s*\)/i,
  );
  expect(candidate).toMatch(
    /CREATE TRIGGER commercial_payments_create_order_after_paid\s+AFTER INSERT OR UPDATE OF status ON public\.commercial_payments\s+FOR EACH ROW\s+EXECUTE FUNCTION public\.create_commercial_order_after_paid_payment\(\);/i,
  );
  expect(candidate).toMatch(
    /REVOKE ALL ON FUNCTION public\.create_commercial_order_after_paid_payment\(\)\s+FROM public, anon, authenticated, service_role;/i,
  );
});

test("preserves later paid transitions when the quotation already owns an order", () => {
  expect(candidate).toMatch(/commercial_payment_reference\s+text\s+NOT NULL\s+UNIQUE/i);
  expect(candidate).toMatch(/commercial_quotation_reference\s+text\s+NOT NULL\s+UNIQUE/i);
  expect(candidate.match(/\bON CONFLICT\b/gi)).toHaveLength(1);
  expect(candidate).toMatch(
    /INSERT INTO public\.commercial_orders[\s\S]*?ON CONFLICT\s*\(\s*commercial_quotation_reference\s*\)\s*DO NOTHING;/i,
  );
  expect(candidate).not.toMatch(/ON CONFLICT[\s\S]*?DO UPDATE/i);
  expect(candidate).not.toMatch(/\bUPDATE\s+public\.commercial_orders\b/i);
  expect(candidate).not.toMatch(/\bDELETE\s+FROM\s+public\.commercial_orders\b/i);
  expect(candidate.match(/\bCREATE TRIGGER\b/gi)).toHaveLength(1);
  expect(candidate).not.toMatch(/\b(?:UPDATE|DELETE)\s+public\.commercial_payments\b/i);
  expect(candidate).not.toMatch(/\bUPDATE\s+public\.commercial_payments\b/i);
  expect(candidate).not.toMatch(/\bINSERT INTO\s+public\.commercial_payments\b/i);
  expect(candidate).not.toMatch(/\b(?:BACKFILL|COPY|TRUNCATE)\b/i);
  expect(candidate).not.toMatch(/\bINSERT INTO\s+public\.commercial_orders[\s\S]*?\bSELECT\b/i);
  expect(candidate).not.toMatch(/CREATE TABLE\s+public\.(?:order_status|order_history|cad|production|shipment)/i);
  expect(candidate).not.toMatch(/\b(?:stripe|adyen|paypal|braintree|checkout\.com|payment_intent|client_secret)\b/i);
  expect(candidate).not.toMatch(/\b(?:process\.env|SUPABASE_|PAYMENT_PROVIDER|API_KEY|SECRET_KEY)\b/i);
});
