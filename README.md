# Evolve Selector v2

A React + TypeScript tool for Evolve Sensing salespeople — and customers — to
quickly find the right spectrometer configuration and request a quote.

Given a wavelength range and target resolution, the selector returns all
compatible Evolve spectrometer platforms, grating configurations, and optimal
slit widths — ranked by optical throughput. Each result includes full ordering
part numbers and grating code wavelength windows.

**New in v2**: after a search returns at least one result, the user can
request a quote directly from the results page. Contact info plus the
search/results context are emailed to `sales@evolve-sensing.com` via Web3Forms.

See [CHANGELOG.md](./CHANGELOG.md) for the full v1 → v2 diff.

## Quick Start

```bash
npm install
cp .env.example .env
# edit .env and paste your Web3Forms access key
npm run dev
```

Opens at http://localhost:5173.

Without the Web3Forms key, the rest of the selector works normally — only the
quote-submit action will fail (with a clear error message pointing the user
to email sales directly).

## Production Build

```bash
npm run build     # outputs to dist/
npm run preview   # preview the production build
```

## How It Works

1. Enter **min wavelength**, **max wavelength**, and **target resolution** (nm)
2. The selector searches 68 spectrometer configurations across 13 Evolve platforms
3. Results are ranked by throughput (largest viable slit width first), with
   in-range blaze wavelengths prioritised
4. Each result shows:
   - Recommended slit width and achievable resolution
   - Full ordering part numbers (`XXxxxx-SSS-GGGG` format)
   - Grating codes with their configured wavelength windows
   - All available slit options as a visual bar chart
5. If no exact matches exist, "near misses" show the closest alternatives
6. Check any results to compare them side-by-side in a table
7. **v2**: Click **Request a quote** (or **Request a consultation** if only
   near misses exist) to open a form, pick the spectrometer of interest, and
   submit contact info + application description to sales

## Part Number Format

Part numbers follow the pattern `XXxxxx-SSS-GGGG`:
- **XX** — OtO platform code (e.g. `SE`, `SW`)
- **xxxx** — model placeholder (customer specifies actual model)
- **SSS** — recommended slit width in µm, zero-padded to 3 digits
- **GGGG** — grating code (e.g. `DUV5`, `NIRC`)

## Quote Flow

See [docs/QUOTE_FLOW.md](./docs/QUOTE_FLOW.md) for the full user journey and
state machine diagram. In brief:

```
[Search] → [Results shown] → [Click "Request a quote"] → [Fill form]
                                                              │
                                                              ▼
                                          [Submit to Web3Forms] → [Confirmation screen]
                                                              │
                                                              ▼
                                         [Email lands at sales@evolve-sensing.com]
```

The form collects:
- Customer name (≥2 chars, letters/spaces/punctuation)
- Customer email (standard format validation)
- Application description (≥20 chars, ≤2000 chars)
- Which spectrometer to quote (top result pre-selected; user can change)

The email body includes the full search parameters and the complete list of
results found, with a star marking the customer's selection.

## Web3Forms Configuration

See [docs/WEB3FORMS_SETUP.md](./docs/WEB3FORMS_SETUP.md) for:
- How to obtain an access key
- Why the key is public-safe
- How to rotate the key
- How to test delivery end-to-end

## Project Structure

```
src/
├── App.tsx                     # Main application + quote flow state machine
├── brand.ts                    # Evolve branding constants & product colors
├── main.tsx                    # React entry point
├── index.css                   # Minimal global styles
├── types/
│   └── spectrometer.ts         # TypeScript type definitions
├── data/
│   ├── index.ts                # Data loader (compact → full types)
│   ├── resolutionRecords.json  # 68 resolution records (compact format)
│   ├── gratingOverrides.json   # Grating code lookup table (~87 keys)
│   └── namingRecords.json      # Grating code → wavelength window (257 entries)
├── logic/
│   └── selector.ts             # Core search algorithm & helpers
├── lib/                        # v2 new
│   ├── validators.ts           # Name/email/application validation
│   ├── web3forms.ts            # Web3Forms submission wrapper
│   └── quoteFormatting.ts      # Result → email-body text helpers
└── components/
    ├── SearchForm.tsx          # Three-input search form
    ├── ResultCard.tsx          # Individual result display with part numbers
    ├── CompareTable.tsx        # Side-by-side comparison table
    ├── SlitBar.tsx             # Visual slit width bar chart
    ├── QuotePrompt.tsx         # v2 — banner that opens the quote form
    ├── QuoteForm.tsx           # v2 — contact form with radio spectrometer picker
    └── QuoteSuccess.tsx        # v2 — post-submit confirmation modal

data/                           # Source data & Python scripts
├── PROJECT_INSTRUCTIONS.md     # Full project documentation
├── parse_data_v2.py            # Excel → JSON data pipeline
├── selector.py                 # Python CLI selector (reference)
├── spectrometer_data.json      # Full parsed dataset
└── grating_overrides.json      # Manual override table

docs/                           # v2 new
├── QUOTE_FLOW.md               # User journey + state machine
└── WEB3FORMS_SETUP.md          # How to get & rotate the access key

.github/workflows/
└── deploy.yml                  # GitHub Pages deploy on push to master
```

## Tech Stack

- **Vite** — build tool
- **React 19** — UI framework
- **TypeScript** — type safety
- **Web3Forms** — free-tier email relay for quote submissions (v2)
- **No external UI libraries** — inline styles, DM Sans via Google Fonts

## Relationship to v1

v1 of this tool lives at
[`buckley-sg/Spectrometer-Selector`](https://github.com/buckley-sg/Spectrometer-Selector)
and is deployed at
https://buckley-sg.github.io/Spectrometer-Selector/. It remains live and
unchanged because at least one partner site links to it.

v2 is a **separate repository** (`buckley-sg/Spectrometer-Selector-v2`)
deployed at https://buckley-sg.github.io/Spectrometer-Selector-v2/. The two
share no runtime dependencies — they are independent deployments.

## Evolve Sensing

Evolve Sensing (Redmond, WA) is the North American and European distributor
for OtO Photonics spectrometer hardware.

Contact: steve@evolve-sensing.com | +1 425-969-8782

---

*Proprietary and Confidential*
