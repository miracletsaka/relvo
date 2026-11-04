// frontend/lib/outbound-api.ts
// Client for the outbound calling endpoints. All requests go through lib/http.ts.

import { apiRequest } from "@/lib/http";

export type Lead = { org_id?: string; name: string; phone: string; address?: string; website?: string };

export type OutboundIntent = {
  intent: "none" | "call_number" | "find_and_call" | "clarify";
  business_type?: string;
  city?: string;
  count?: number;
  notes?: string;
  phones?: string[];
  ask?: string;
  ready: boolean;
  test_mode: boolean;
};

export type CallResult = { name: string; phone: string; ok: boolean; status?: string; error?: string };

// Cheap gate so normal chat messages never hit the intent endpoint.
// "call to action" is marketing language, not a request to phone someone.
export const looksOutbound = (t: string) =>
  /\b(call|phone|dial|ring|cold[- ]?call|outreach|outbound|prospect|reach out)\b/i.test(
    t.replace(/call[- ]to[- ]action/gi, ""),
  );

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Reads and searches are safe to repeat, so they retry when the server is waking up.
export const detectIntent = (message: string) =>
  apiRequest<OutboundIntent>("/outbound/intent", { body: { message }, retry: true });

export const searchBusinesses = (b: { business_type: string; city: string; count: number }) =>
  apiRequest<{ leads: Lead[]; matched: boolean; ready: boolean; test_mode: boolean }>(
    "/outbound/search",
    { body: b, retry: true, timeoutMs: 45_000 },
  );

// Placing calls is NOT repeatable: no automatic retry, ever.
// The Idempotency-Key lets the backend ignore a duplicate if the same click is sent twice.
export const startCalls = (leads: Lead[], notes: string) =>
  apiRequest<{ results: CallResult[]; test_mode: boolean }>("/outbound/call", {
    body: { leads, notes },
    timeoutMs: 90_000,
    headers: { "Idempotency-Key": newKey() },
  });