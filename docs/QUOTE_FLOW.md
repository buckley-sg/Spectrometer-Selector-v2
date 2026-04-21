# Quote Flow

This document describes the v2 quote-request user journey, the state machine
behind it, and the validation/submission contracts.

## User Journey

```
                         ┌───────────────────┐
                         │ User lands on app │
                         └─────────┬─────────┘
                                   │
                                   ▼
                 ┌─────────────────────────────────┐
                 │ Enter wavelength range + target │
                 │ resolution → results render     │
                 └─────────────────┬───────────────┘
                                   │
                      ┌────────────┴────────────┐
                      │                         │
               ≥1 match OR                 Zero matches AND
               ≥1 near miss                zero near misses
                      │                         │
                      ▼                         ▼
         ┌───────────────────────┐       ┌──────────────┐
         │ QuotePrompt banner    │       │ (No prompt)  │
         │ appears under results │       └──────────────┘
         └──────────┬────────────┘
                    │
                    │ user clicks button
                    ▼
         ┌───────────────────────────┐
         │ QuoteForm modal opens     │
         │ - top result pre-selected │
         │ - 3 fields (name/email/   │
         │   application)            │
         │ - SEND disabled until     │
         │   all three validate      │
         └─────────┬─────────────────┘
                   │
         ┌─────────┼──────────┐
         │         │          │
    user Cancel  submit    submit
    / Escape /   succeeds  fails
    backdrop                (network or
         │         │         Web3Forms error)
         │         │          │
         ▼         ▼          ▼
      ┌──────┐  ┌─────────┐  ┌─────────────┐
      │ Back │  │ Success │  │ Inline      │
      │ to   │  │ modal   │  │ error       │
      │ idle │  │         │  │ banner,     │
      └──────┘  │ - Close │  │ form stays  │
                │ - New   │  │ open with   │
                │   search│  │ data        │
                └─────────┘  │ preserved   │
                             └─────────────┘
```

## State Machine

Defined in `src/App.tsx` as a discriminated union:

```ts
type QuoteFlowState =
  | { phase: "idle" }                                              // default
  | { phase: "form" }                                              // modal open
  | { phase: "success"; userName: string; selectedLabel: string }; // confirmation
```

### Transitions

| From      | Event                        | To       | Side effects                 |
|-----------|------------------------------|----------|------------------------------|
| `idle`    | User clicks QuotePrompt btn  | `form`   | —                            |
| `form`    | User clicks Cancel           | `idle`   | —                            |
| `form`    | User presses Escape          | `idle`   | —                            |
| `form`    | User clicks backdrop         | `idle`   | —                            |
| `form`    | Submission succeeds          | `success`| Email fired to sales@        |
| `form`    | Submission fails             | `form`   | Error banner shown, form re-enabled, user data preserved |
| `success` | User clicks Close            | `idle`   | —                            |
| `success` | User clicks "Start new search" | `idle` | **Full reset**: search inputs, compare map, near-miss toggle, all cleared |

### Why "Start new search" does a full reset

After a successful submission, if the user wants to look for a different
spectrometer, it's almost always a genuinely new search with different
parameters — preserving the old state would confuse more than it would help.
"Close" is the escape hatch for users who want to keep looking at the same
results (e.g., to submit a second quote for a different spectrometer).

## Field Validation

All validators live in `src/lib/validators.ts` and return a discriminated
union:

```ts
type ValidationResult = { ok: true } | { ok: false; error: string }
```

### Name
- **Required**: yes
- **Min length**: 2 characters after trim
- **Max length**: none explicit (governed by HTML input maxlength if added)
- **Regex**: `/^[\p{L}\p{M}'\-\s.]+$/u`
  - `\p{L}` — any Unicode letter (so "José", "北京", "François" all pass)
  - `\p{M}` — combining marks (for accented characters built from base + mark)
  - Apostrophes, hyphens, periods, spaces allowed
- **Accepted**: "Alice", "Dr. Smith", "Anne-Marie", "O'Brien", "José María"
- **Rejected**: "", "A", "12345", "<script>", "user@domain"

### Email
- **Required**: yes
- **Max length**: 254 characters (RFC 5321 practical limit)
- **Regex**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Deliberately simpler than full RFC 5322 (which is hundreds of characters
    and catches almost nothing in practice)
- **Accepted**: `steve@evolve-sensing.com`, `user+tag@sub.domain.co.uk`
- **Rejected**: `foo`, `foo@`, `@bar.com`, `foo bar@x.com`

### Application description
- **Required**: yes
- **Min length**: 20 characters after trim
  - Chosen to filter "need quote" / "info please" noise that wastes sales'
    time. 20 characters is roughly "I need a UV-Vis spectrometer" — enough
    for sales to have a starting hook.
- **Max length**: 2000 characters
  - Defensive against accidental paste of entire documents.

### SEND button gating
Disabled when any of the following are true:
- Currently submitting
- Any field fails validation
- No spectrometer selected (shouldn't be possible — defensive check)

## Submission Payload

Sent as a JSON POST to `https://api.web3forms.com/submit`:

| Field | Purpose |
|-------|---------|
| `access_key` | Public Web3Forms access key |
| `subject` | `Quote Request: <selected spectrometer label> — <user name>` |
| `from_name` | `<user name> via Evolve Spectrometer Selector` |
| `email` | User's email (used as Reply-To in the delivered email) |
| `name` | User's name |
| `application` | Application description |
| `selected_spectrometer` | Full label of chosen spectrometer |
| `search_summary` | `<min>–<max> nm, target ≤<res> nm (bandwidth: <bw> nm)` |
| `match_type` | `"exact"` or `"near-miss"` |
| `message` | Pre-formatted multi-section text body (see below) |
| `botcheck` | Always empty from our side (honeypot) |

### Email body layout

```
A new quote request has been submitted via the Evolve Spectrometer Selector.

────────────────────────────────────────
CONTACT
────────────────────────────────────────
Name:  Alice Chen
Email: alice@example.com

────────────────────────────────────────
APPLICATION
────────────────────────────────────────
UV-Vis thin-film thickness monitoring in a semiconductor fab...

────────────────────────────────────────
SEARCH
────────────────────────────────────────
200–550 nm wavelength range, target resolution ≤0.5 nm (required bandwidth: 350 nm)
Match type: Exact match

────────────────────────────────────────
SELECTED SPECTROMETER
────────────────────────────────────────
SmartEngine / EagleEye (SE2570) — 600 g/mm, blaze 500 nm, rec 100 µm slit (0.45 nm res)

────────────────────────────────────────
ALL RESULTS FOUND
────────────────────────────────────────
Exact matches (3) — sorted by throughput:
  ★ 1. SmartEngine / EagleEye (SE2570) — 600 g/mm, ...
       Part numbers: SExxxx-100-V14, EExxxx-100-V14
    2. HummingBird (HB1234) — ...
    3. SideWinder (SW2570) — ...

Near misses (2) — coverage OK, resolution short:
    1. Phenom — ...
    2. Magna — ...

★ = spectrometer the customer selected for quoting

────────────────────────────────────────
Submitted: 2026-04-21T18:30:00.000Z
User agent: Mozilla/5.0 ...
```

## Error Handling

`submitQuoteRequest` returns `{ ok: true } | { ok: false; error: string }`.

| Scenario | Detection | User sees |
|----------|-----------|-----------|
| Missing access key | Empty string check before fetch | "Quote form is not configured — …email sales directly" |
| Network failure | `fetch` throws | "Could not reach the submission service (…). Please check your connection…" |
| HTTP non-2xx | `response.ok === false` | `parsed.message` from Web3Forms, or a generic "HTTP N — please try again" |
| HTTP 200, `success: false` | `parsed.success !== true` | `parsed.message` (typically "Invalid Access Key" or similar) |
| Non-JSON body | `response.json()` throws | Falls through to generic HTTP error |

On any failure, the user's form data is preserved. They can fix the issue
(e.g., reconnect to Wi-Fi) and click SEND again without retyping.

## Accessibility

- All form fields have associated `<label>` elements (visual + screen-reader).
- Required fields are marked with a red asterisk **and** the word "required"
  is implicit in the error message ("Name is required.").
- The modal uses `role="dialog"` and `aria-modal="true"`.
- Submit button state (disabled/enabled) reflects form validity.
- **Not yet implemented (tracked for v2.1)**:
  - Focus trap inside modal (keyboard users can tab out)
  - ARIA live region for submit status
  - Initial focus placement on the first invalid field

## Why Web3Forms over alternatives

| Option       | Pros                              | Cons                                    | Verdict for v2 |
|--------------|-----------------------------------|-----------------------------------------|----------------|
| `mailto:`    | Zero infra                        | 30–50% abandonment; 2KB body limit; no delivery confirmation | Rejected |
| Web3Forms    | One-click submit; free tier 250/mo; no backend | Third-party dependency               | **Chosen**  |
| Serverless   | Full control; custom templates    | Requires Vercel/Netlify + secrets setup | v2.1+ if needed |
| HubSpot Forms| Leads land in CRM directly        | Portal ID + form GUID + CORS setup      | **Planned for v2.1** |

The decision rests on friction: at Evolve's ICP (spectrometer OEM buyers,
thousands to tens of thousands of dollars per unit), each lost lead is
expensive. `mailto:`'s ~30–50% abandonment rate made the tradeoff untenable
despite its zero-infra appeal.
