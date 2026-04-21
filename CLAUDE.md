# Project: Evolve Selector v2

## Overview
A React + TypeScript tool for Evolve Sensing salespeople — and customers — to
find the right spectrometer configuration and request a quote. Given a
wavelength range and target resolution, returns compatible platforms,
gratings, and optimal slit widths ranked by throughput. Each result includes
full ordering part numbers and grating code wavelength windows.

**v2 addition**: after a search returns at least one result, the user can
request a quote. Contact info plus the full search/results context are
emailed to `sales@evolve-sensing.com` via Web3Forms.

- **GitHub**: buckley-sg/Spectrometer-Selector-v2 (public — required for free GitHub Pages)
- **Branch**: master
- **Live URL**: https://buckley-sg.github.io/Spectrometer-Selector-v2/
- **v1 repo**: buckley-sg/Spectrometer-Selector (remains live — partner site links to it)
- **Related**: The main Lumos spectrometer application lives at `../Coding/`

## Architecture
- **Vite** build tool with React 19 + TypeScript
- Self-contained: all spectrometer data embedded as JSON (no server/API needed)
- Inline styles with Evolve Sensing branding (no external UI libraries)
- Core selector logic in `src/logic/selector.ts` (pure functions, no React dependency)
- Quote-flow logic split across `src/lib/` (validators, submission, formatting)
  and `src/components/Quote*.tsx` (UI)

## Part Number Format

Part numbers follow the pattern `XXxxxx-SSS-GGGG`:
- **XX** — OtO platform code (e.g. `SE` = SmartEngine, `SW` = SideWinder)
- **xxxx** — model placeholder (the customer specifies the actual model number)
- **SSS** — recommended slit width in micrometres, zero-padded to 3 digits
- **GGGG** — grating code (e.g. `DUV5`, `V14`, `NIRC`)

Example: `SExxxx-100-V14` means SmartEngine platform, 100 µm slit, grating code V14.

The placeholder `xxxx` was chosen over `NNNN` — Steve prefers lowercase to signal it's a placeholder the customer fills in.

## Data Sources

Three JSON files power the selector, all in `src/data/`:

| File | Entries | Description | Source |
|------|---------|-------------|--------|
| `resolutionRecords.json` | 68 | Optical bench x grating configs with slit-resolution tables | Parsed from Excel via `data/parse_data_v2.py` |
| `gratingOverrides.json` | ~87 keys | Maps `"PLATFORM\|grooves\|blaze"` to grating code arrays | Manual override table (`data/grating_overrides.json`) |
| `namingRecords.json` | 257 | Maps grating code string to `[wlMin, wlMax]` wavelength window | Extracted from `data/spectrometer_data.json` |

Two records remain pending OtO verification and carry through from v1:
- `HB 500 g/mm` — awaiting OtO confirmation
- `SW2560/SW2860 400 g/mm` — awaiting OtO confirmation

### Why the override table exists
The same grating (grooves/mm + blaze) can map to different codes depending on the platform. The override table resolves this ambiguity with a composite key of platform, groove density, and blaze wavelength.

### Regenerating data
1. Get new OtO Excel files
2. Run `data/parse_data_v2.py` to regenerate `data/spectrometer_data.json`
3. Extract compact arrays into `src/data/resolutionRecords.json` and `src/data/gratingOverrides.json`
4. Extract naming records into `src/data/namingRecords.json`
5. Rebuild

## Key Files
- `src/types/spectrometer.ts` — All TypeScript type definitions
- `src/data/` — JSON data files + loader that normalises compact → full types
- `src/logic/selector.ts` — Search algorithm and shared helpers
- `src/lib/validators.ts` — Name/email/application validation (v2)
- `src/lib/web3forms.ts` — Web3Forms submission wrapper (v2)
- `src/lib/quoteFormatting.ts` — Result → email-body text helpers (v2)
- `src/components/` — React components: SearchForm, ResultCard, CompareTable, SlitBar,
  QuotePrompt (v2), QuoteForm (v2), QuoteSuccess (v2)
- `src/brand.ts` — Evolve branding constants (navy, green, teal, 13 product colours)
- `data/` — Python source scripts and full dataset for data regeneration

## Search Algorithm (`src/logic/selector.ts`)
1. Filter records whose selectable range fully covers the requested wavelength window
2. Filter records whose bandwidth accommodates the requested range
3. For each surviving record, find the **largest slit** that meets the resolution spec (maximises throughput)
4. If no slit meets the spec, classify as a "near miss" using the narrowest slit
5. Sort results: slit width (throughput) > in-range blaze count > resolution

### Shared helpers
- `blazeSortComparator()` — single sort function used by ResultCard and CompareTable to order blazes (in-range first, then ascending)
- `blazeInRange()` — checks if a blaze wavelength falls inside the search window
- `formatPartNumber()` — assembles the `XXxxxx-SSS-GGGG` string

## Quote Flow (v2)

State machine defined in `App.tsx`:

```
idle → form       (user clicks QuotePrompt button)
form → idle       (Cancel / Escape / backdrop click)
form → success    (Web3Forms POST succeeds)
success → idle    (user clicks Close; results remain visible)
success → idle+reset (user clicks "Start new search"; full state reset)
```

### QuoteForm validation
- Name: ≥2 chars, Unicode letters + apostrophes/hyphens/periods/spaces
- Email: simplified RFC-5322 regex (catches 99%+ of real typos)
- Application: 20–2000 chars (20 min filters "need quote" noise)
- SEND button disabled until all three pass

### Web3Forms submission
- Endpoint: `https://api.web3forms.com/submit`
- Access key stored in `VITE_WEB3FORMS_KEY` env var (public-safe by design)
- Delivery destination (`sales@evolve-sensing.com`) configured in Web3Forms dashboard — not in code
- Email body includes search params, selected spectrometer, full results list
- `botcheck: ""` honeypot field included per Web3Forms recommendation
- Handles: HTTP errors, network errors, and `success:false` responses (all surface as form-level errors without discarding user input)

## Domain Knowledge
- See `data/PROJECT_INSTRUCTIONS.md` for full business context and data pipeline documentation
- See `docs/QUOTE_FLOW.md` for the quote-flow user journey
- See `docs/WEB3FORMS_SETUP.md` for access key setup
- Key physics: bandwidth x resolution trade-off. Higher groove density = narrower bandwidth but better resolution
- Selector always recommends the LARGEST slit meeting the spec (maximum throughput)

## Workflows

### Development
```bash
npm install
cp .env.example .env           # then paste your Web3Forms key into .env
npm run dev                    # Vite dev server at http://localhost:5173
```

### Type checking
```bash
npx tsc --noEmit
```

### Building the Desktop App (Electron)

The app can be packaged as a standalone Windows desktop application called
"Evolve Selector v2" using Electron + electron-builder.

```bash
npm run build:electron
```

This runs the full pipeline: TypeScript check → Vite production build → Electron TypeScript compile → electron-builder packaging.

**Output** in `release/`:
- `Evolve Selector v2 Setup 2.0.0.exe` — NSIS installer, installs to user's AppData
- `EvolveSelectorV2-2.0.0-portable.exe` — portable exe, runs without installation

**Distribution**: Share via OneDrive link (email providers block `.exe` attachments). The portable exe is the easiest option — no installation required.

**Note on appId**: v2 uses `com.evolvesensing.selector-v2` (v1 was `com.evolvesensing.selector`). The different appId means v1 and v2 can be installed side by side without uninstalling each other.

**Note**: The exe is unsigned, so Windows SmartScreen will show a warning on first launch. The recipient clicks "More info" → "Run anyway". A code-signing certificate (~$200-400/year) would eliminate this.

**Bumping the version**: Update `"version"` in `package.json` before building. The version appears in the installer filename and the app's About info.

### GitHub Pages (Web Deployment)

The app is deployed as a static site via GitHub Pages:

**Live URL**: https://buckley-sg.github.io/Spectrometer-Selector-v2/

- Deploys automatically on every push to `master` via `.github/workflows/deploy.yml`
- GitHub Pages source must be set to **"GitHub Actions"** in repo Settings → Pages (not "Deploy from a branch")
- `vite.config.ts` uses `GITHUB_PAGES` env var to set `base: "/Spectrometer-Selector-v2/"` for Pages builds, while keeping `base: "./"` for Electron/local builds
- `VITE_WEB3FORMS_KEY` must be added as a repository secret (Settings → Secrets and variables → Actions → New repository secret) — the workflow reads it as `${{ secrets.VITE_WEB3FORMS_KEY }}`
- Repo is **public** (required for free GitHub Pages)

### Electron Architecture
- `electron-src/main.ts` → compiled to `electron/main.cjs` (CommonJS required because `package.json` has `"type": "module"`)
- `electron-src/preload.ts` → compiled to `electron/preload.cjs`
- No menu bar, branded window with Evolve icon
- In dev: `npm run dev:electron` builds and launches Electron locally
- `electron/` output is gitignored; `release/` output is gitignored

## Instructions for Claude
At the end of every task or work session, ask Steve: **"Is there anything from this session you'd like me to add to CLAUDE.md so I remember it next time?"**

## Working style with Steve
These preferences were established over the course of building v2 and should
carry forward to future sessions:

- **Persistent execution.** Once Steve has approved a plan, work through it
  turn by turn without asking for permission between logical build steps.
  Only stop to ask when a genuine decision point appears (a hidden choice,
  an unexpected finding, or a real ambiguity). "Continue" is a one-word
  acknowledgement — don't treat each turn boundary as a chance to re-confirm.
- **GitHub workflow.** Steve does not use git directly and is not comfortable
  with the command line. Default to GitHub web UI instructions (step-by-step,
  click-by-click). GitHub Desktop is a good secondary recommendation for
  larger changes. Command-line git is only for when he explicitly asks.
- **Honest advisor mode.** Steve has asked for an independent voice with
  justified reasoning. When he proposes an approach that has real downsides
  (e.g., `mailto:` vs. form service, a git branch vs. a second repo), push
  back with concrete tradeoffs — don't just build what he first asked for.
  He will adjust based on the analysis.
- **Quality over speed.** Complete, correct, double-checked work matters more
  than fast delivery. Write smoke tests for non-trivial logic. Type-check.
  Run a real build. Catch bugs during construction, not after.

## v1 / v2 dual-repo architecture
**Both repos exist and both must stay working.** Do not propose consolidating
or deprecating v1 without explicit instruction.

- `buckley-sg/Spectrometer-Selector` (v1) — live at
  https://buckley-sg.github.io/Spectrometer-Selector/. At least one partner
  site links to this URL. Frozen — no changes unless Steve explicitly asks.
- `buckley-sg/Spectrometer-Selector-v2` (v2) — live at
  https://buckley-sg.github.io/Spectrometer-Selector-v2/. Adds the quote-
  request flow. This is where ongoing development happens.

The two repos share no runtime dependencies. They are independently deployed
and independently versioned. The Electron `appId` and `productName` also
differ so desktop installs don't collide.

## Web3Forms integration
The quote-request flow submits to Web3Forms
(https://api.web3forms.com/submit) which relays the submission as an email
to `sales@evolve-sensing.com`. The access key is stored as:
- Local dev: `.env` file, variable `VITE_WEB3FORMS_KEY` (gitignored)
- Production: GitHub Actions repository secret named `VITE_WEB3FORMS_KEY`

The key is public-safe by design — it only authorises delivery to the
preconfigured destination. See `docs/WEB3FORMS_SETUP.md` for full detail,
including rotation procedure.

If Steve ever needs the key swapped or rotated, do not offer to read it
back from chat history — ask him for the current value, or direct him to
the Web3Forms dashboard.

---
*Last updated: 2026-04-21 (v2.0.0 release)*
