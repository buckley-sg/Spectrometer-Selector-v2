/**
 * Smoke test for web3forms.ts — exercises all error paths without
 * actually contacting Web3Forms. We mock global.fetch with different
 * response shapes and verify the outcome is classified correctly.
 */
import { submitQuoteRequest } from "../src/lib/web3forms";
import type { QuoteSubmission } from "../src/lib/web3forms";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const basePayload: QuoteSubmission = {
  name: "Test User",
  email: "test@example.com",
  application: "Testing the Web3Forms submission wrapper end-to-end.",
  selectedSpectrometer: "SmartEngine (SE2570) — 600 g/mm, blaze 500 nm, rec 100 µm slit (0.45 nm res)",
  searchSummary: "200–550 nm wavelength range, target resolution ≤0.5 nm (required bandwidth: 350 nm)",
  resultsBlock: "Exact matches (1) — sorted by throughput:\n  ★ 1. SmartEngine (SE2570) — ...",
  matchType: "exact",
};

// Save the original fetch so we can restore it between tests
const originalFetch = global.fetch;

// Helper that installs a mock fetch for the duration of one assertion
function withMockFetch(
  impl: (url: string, init: RequestInit) => Promise<Response>,
  fn: () => Promise<void>,
): Promise<void> {
  // @ts-expect-error — we're deliberately substituting global.fetch
  global.fetch = impl;
  return fn().finally(() => {
    global.fetch = originalFetch;
  });
}

// ═══════════════════════════════════════════════════════════════════
// Case A: Missing access key should short-circuit before fetch
// ═══════════════════════════════════════════════════════════════════
console.log("\n== A: Missing access key ==");
{
  const result = await submitQuoteRequest("", basePayload);
  check(
    "Returns ok:false without calling fetch",
    result.ok === false && result.error.includes("not configured"),
  );
}

// ═══════════════════════════════════════════════════════════════════
// Case B: Happy path (HTTP 200, success:true)
// ═══════════════════════════════════════════════════════════════════
console.log("\n== B: Happy path ==");
await withMockFetch(
  async () =>
    new Response(JSON.stringify({ success: true, message: "Email sent!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  async () => {
    const result = await submitQuoteRequest("test-key", basePayload);
    check("Returns ok:true on 200+success", result.ok === true);
  },
);

// ═══════════════════════════════════════════════════════════════════
// Case C: HTTP 200 but success:false (e.g. bad access key)
// ═══════════════════════════════════════════════════════════════════
console.log("\n== C: HTTP 200 with success:false ==");
await withMockFetch(
  async () =>
    new Response(
      JSON.stringify({ success: false, message: "Invalid Access Key" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ),
  async () => {
    const result = await submitQuoteRequest("bad-key", basePayload);
    check(
      "Returns ok:false with server message surfaced",
      result.ok === false && result.error.includes("Invalid Access Key"),
    );
  },
);

// ═══════════════════════════════════════════════════════════════════
// Case D: HTTP 500 (server error)
// ═══════════════════════════════════════════════════════════════════
console.log("\n== D: HTTP 500 ==");
await withMockFetch(
  async () =>
    new Response(JSON.stringify({ success: false, message: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }),
  async () => {
    const result = await submitQuoteRequest("test-key", basePayload);
    check(
      "Returns ok:false on HTTP 500",
      result.ok === false,
    );
    if (result.ok === false) {
      check(
        "Error mentions internal error or falls back to HTTP code",
        result.error.includes("Internal error") || result.error.includes("500"),
      );
    }
  },
);

// ═══════════════════════════════════════════════════════════════════
// Case E: Network failure (fetch throws)
// ═══════════════════════════════════════════════════════════════════
console.log("\n== E: Network failure ==");
await withMockFetch(
  async () => {
    throw new Error("network offline");
  },
  async () => {
    const result = await submitQuoteRequest("test-key", basePayload);
    check(
      "Returns ok:false with connection guidance",
      result.ok === false &&
        result.error.includes("Could not reach") &&
        result.error.includes("sales@evolve-sensing.com"),
    );
  },
);

// ═══════════════════════════════════════════════════════════════════
// Case F: Non-JSON response body
// ═══════════════════════════════════════════════════════════════════
console.log("\n== F: Non-JSON response ==");
await withMockFetch(
  async () =>
    new Response("<!DOCTYPE html><html>500 error page</html>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    }),
  async () => {
    const result = await submitQuoteRequest("test-key", basePayload);
    check(
      "Returns ok:false with fallback message",
      result.ok === false && result.error.includes("500"),
    );
  },
);

// ═══════════════════════════════════════════════════════════════════
// Case G: Payload contents — verify we actually send what we think we send
// ═══════════════════════════════════════════════════════════════════
console.log("\n== G: Payload shape sanity check ==");
let capturedBody: string | null = null;
await withMockFetch(
  async (_url: string, init: RequestInit) => {
    capturedBody = init.body as string;
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
  async () => {
    await submitQuoteRequest("my-key-123", basePayload);
  },
);

if (capturedBody) {
  const parsed = JSON.parse(capturedBody);
  check("Payload includes access_key", parsed.access_key === "my-key-123");
  check("Payload includes name", parsed.name === basePayload.name);
  check("Payload includes email (reply-to)", parsed.email === basePayload.email);
  check("Payload includes application", parsed.application === basePayload.application);
  check(
    "Payload includes selected_spectrometer",
    parsed.selected_spectrometer === basePayload.selectedSpectrometer,
  );
  check("Payload includes search_summary", !!parsed.search_summary);
  check("Payload includes match_type", parsed.match_type === "exact");
  check("Payload has botcheck honeypot field (empty)", parsed.botcheck === "");
  check(
    "Subject includes user name",
    parsed.subject.includes(basePayload.name),
  );
  check(
    "Subject includes selected spectrometer hint",
    parsed.subject.includes("SmartEngine"),
  );
  check(
    "from_name attributes to selector",
    parsed.from_name.includes("via Evolve Spectrometer Selector"),
  );
  check(
    "message body has formatted sections",
    parsed.message.includes("CONTACT") &&
      parsed.message.includes("APPLICATION") &&
      parsed.message.includes("SEARCH") &&
      parsed.message.includes("SELECTED SPECTROMETER"),
  );
} else {
  failed++;
  console.log("  FAIL  Captured body was null");
}

console.log(`\n--- ${passed} passed, ${failed} failed ---\n`);
process.exit(failed === 0 ? 0 : 1);
