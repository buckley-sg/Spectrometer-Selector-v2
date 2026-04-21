/**
 * web3forms.ts
 *
 * Thin wrapper around the Web3Forms POST API (https://api.web3forms.com/submit).
 *
 * Why Web3Forms?
 * --------------
 * We need to deliver quote-request emails to sales@evolve-sensing.com without
 * running our own backend. Web3Forms is a free-tier email relay (up to 250
 * submissions/month on the free plan) that accepts a JSON POST and forwards
 * it as an email to the address configured in their dashboard.
 *
 * The access key is PUBLIC by design — it only authorises delivery to the
 * address pre-configured at Web3Forms, so an attacker cannot redirect leads.
 * The worst abuse case is inbox spam, which Web3Forms rate-limits on their end.
 *
 * Compared to the alternatives we considered:
 *   - mailto:    zero infra, but ~30–50% user-side abandonment (opens mail
 *                client, user must click Send, body size capped at ~2KB).
 *   - Serverless: full control, but requires deploying a Vercel/Netlify
 *                function + secrets management. Overkill for v2.0.
 *   - HubSpot:   best long-term (leads land in CRM), but requires portal/form
 *                GUID setup + CORS handling. Planned for v2.1.
 *
 * Endpoint contract
 * -----------------
 * POST https://api.web3forms.com/submit
 *   Content-Type: application/json
 *   Body: { access_key, subject, from_name, email, ...arbitrary fields }
 *   Response: { success: boolean, message: string, data?: {...} }
 *   Success is signalled by BOTH HTTP 200 AND success:true in the body.
 *   Web3Forms sometimes returns HTTP 200 with success:false (e.g. bad key).
 */

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

/** The shape of the payload we POST to Web3Forms. */
export interface QuoteSubmission {
  /** End user's name */
  name: string;
  /** End user's email (also used as reply-to so sales can hit Reply) */
  email: string;
  /** End user's application description */
  application: string;
  /** Plain-text label for the chosen spectrometer (e.g. "SmartEngine (SE) — 600 g/mm, 500 nm blaze") */
  selectedSpectrometer: string;
  /** Human-readable search parameters line (e.g. "200–550 nm, target ≤0.5 nm resolution") */
  searchSummary: string;
  /** Full results dump as a multi-line string — included verbatim in the email body */
  resultsBlock: string;
  /** Whether this came from the "exact match" or "near miss" path */
  matchType: "exact" | "near-miss";
}

export type SubmitOutcome =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Submit a quote request to Web3Forms.
 *
 * @param accessKey  The Web3Forms access key (public-safe — can live in client code).
 * @param submission The full quote request payload.
 * @returns          { ok: true } on success, { ok: false, error } on any failure mode.
 */
export async function submitQuoteRequest(
  accessKey: string,
  submission: QuoteSubmission,
): Promise<SubmitOutcome> {
  if (!accessKey) {
    return {
      ok: false,
      error:
        "Quote form is not configured — missing Web3Forms access key. " +
        "Please email sales@evolve-sensing.com directly.",
    };
  }

  // Build the subject so it's maximally scannable in sales@'s inbox.
  const subject =
    `Quote Request: ${submission.selectedSpectrometer} — ${submission.name}`;

  // Compose the email body. Web3Forms concatenates fields by default, but a
  // pre-formatted "message" field gives us full control over formatting.
  const message = [
    `A new quote request has been submitted via the Evolve Spectrometer Selector.`,
    ``,
    `────────────────────────────────────────`,
    `CONTACT`,
    `────────────────────────────────────────`,
    `Name:  ${submission.name}`,
    `Email: ${submission.email}`,
    ``,
    `────────────────────────────────────────`,
    `APPLICATION`,
    `────────────────────────────────────────`,
    submission.application,
    ``,
    `────────────────────────────────────────`,
    `SEARCH`,
    `────────────────────────────────────────`,
    submission.searchSummary,
    `Match type: ${submission.matchType === "exact" ? "Exact match" : "Near miss (resolution short)"}`,
    ``,
    `────────────────────────────────────────`,
    `SELECTED SPECTROMETER`,
    `────────────────────────────────────────`,
    submission.selectedSpectrometer,
    ``,
    `────────────────────────────────────────`,
    `ALL RESULTS FOUND`,
    `────────────────────────────────────────`,
    submission.resultsBlock,
    ``,
    `────────────────────────────────────────`,
    `Submitted: ${new Date().toISOString()}`,
    `User agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "n/a"}`,
  ].join("\n");

  const body = {
    access_key: accessKey,
    subject,
    from_name: `${submission.name} via Evolve Spectrometer Selector`,
    // Web3Forms uses "email" as the reply-to by convention
    email: submission.email,
    // All our structured fields — these appear in the email as a table too
    name: submission.name,
    application: submission.application,
    selected_spectrometer: submission.selectedSpectrometer,
    search_summary: submission.searchSummary,
    match_type: submission.matchType,
    // The main pre-formatted body
    message,
    // Honeypot: Web3Forms recommends sending a `botcheck` field that's always empty
    // from our side. If a bot auto-fills it, Web3Forms drops the submission.
    botcheck: "",
  };

  try {
    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    // Try to parse the JSON body even on non-200 — Web3Forms returns
    // structured errors in the body regardless of status code.
    let parsed: { success?: boolean; message?: string } = {};
    try {
      parsed = await response.json();
    } catch {
      // Non-JSON response — fall through to error below
    }

    if (response.ok && parsed.success === true) {
      return { ok: true };
    }

    return {
      ok: false,
      error:
        parsed.message ||
        `Submission failed (HTTP ${response.status}). Please try again or email sales@evolve-sensing.com directly.`,
    };
  } catch (err) {
    // Network failure, CORS, DNS, etc.
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error:
        `Could not reach the submission service (${msg}). ` +
        `Please check your connection and try again, or email sales@evolve-sensing.com directly.`,
    };
  }
}
