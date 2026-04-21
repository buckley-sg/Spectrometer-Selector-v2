# Changelog

## [2.0.0] — 2026-04-21

### Added
- **Quote request flow**. After a search returns at least one result (exact match
  or near miss), a banner prompts the user to request a quote. Clicking opens a
  modal form where they select which spectrometer they want quoted (top result
  pre-selected), enter their name, email, and application description, then
  submit. The request is emailed to `sales@evolve-sensing.com` via
  [Web3Forms](https://web3forms.com).
- `src/lib/validators.ts` — pure validation functions for name, email, and
  application description. Unicode-aware name regex. Application length gate
  (≥20 chars) filters low-signal submissions.
- `src/lib/web3forms.ts` — Web3Forms POST wrapper with handling for HTTP errors,
  network failures, and `success: false` responses. Includes honeypot field.
- `src/lib/quoteFormatting.ts` — pure formatting helpers that turn
  `EnrichedResult` objects into the human-readable strings included in the
  email body (selected-spectrometer label, search summary, full results dump).
- `src/components/QuotePrompt.tsx` — banner shown beneath results. Button label
  adapts: "Request a quote" when exact matches exist, "Request a consultation"
  when only near misses do.
- `src/components/QuoteForm.tsx` — modal with radio list of candidate
  spectrometers, three input fields, live validation, loading state, inline
  error surface on submission failure.
- `src/components/QuoteSuccess.tsx` — post-submission confirmation with
  "Start new search" (full reset) and "Close" (dismiss modal) actions.
- `docs/QUOTE_FLOW.md` — user journey and state machine documentation.
- `docs/WEB3FORMS_SETUP.md` — access key acquisition, rotation, and testing.
- `.env.example` — documents the required `VITE_WEB3FORMS_KEY` environment
  variable with full rationale.
- `.github/workflows/deploy.yml` now injects `VITE_WEB3FORMS_KEY` from GitHub
  Secrets into the Pages build.

### Changed
- `src/App.tsx` adds a `QuoteFlowState` discriminated union (`idle | form |
  success`) to manage modal visibility. The quote prompt renders inside the
  results block; modals render as fixed-position overlays.
- `package.json` — `name: evolve-selector-v2`, `version: 2.0.0`,
  `build.appId: com.evolvesensing.selector-v2`, `build.productName: Evolve Selector v2`.
  This allows v1 and v2 desktop installers to coexist on a Windows machine.
- `vite.config.ts` — `base` path for GitHub Pages builds now points to
  `/Spectrometer-Selector-v2/`.
- `.gitignore` — adds `.env` patterns (keeping `.env.example` tracked).

### Unchanged from v1
- Core selector algorithm (`src/logic/selector.ts`)
- All data files (`src/data/*.json`) — including the two pending-OtO-verification
  records (HB 500 g/mm; SW2560/SW2860 400 g/mm)
- TypeScript types (`src/types/spectrometer.ts`)
- Brand constants and product colors (`src/brand.ts`)
- Electron desktop build pipeline
- The original Evolve Selector v1 (https://github.com/buckley-sg/Spectrometer-Selector)
  remains live and untouched, since at least one partner site links to its
  GitHub Pages URL.

### Security notes
- The Web3Forms access key is public-safe by design — it only authorises
  delivery to the pre-configured destination (`sales@evolve-sensing.com`) and
  cannot be used to redirect leads elsewhere. It is injected at build time via
  GitHub Actions secrets and appears in the compiled JS bundle.
- No user data is stored client-side. Each submission is a one-shot POST to
  Web3Forms with no localStorage/cookies.

### Known limitations
- No focus trap inside the quote modal (keyboard users can tab past it).
  Escape-to-close and backdrop-to-close are implemented.
- Web3Forms free tier caps at 250 submissions/month. Expected volume is
  well under this (<10/day), but a paid tier or a HubSpot integration is the
  upgrade path if volume grows.
- No submission confirmation email to the customer (requires Web3Forms
  autoresponder feature or a HubSpot workflow).

### Planned for v2.1
- HubSpot Forms API integration so leads land directly in CRM instead of email
- Optional customer autoresponder
- Accessibility improvements: focus trap, ARIA live region for submit status
