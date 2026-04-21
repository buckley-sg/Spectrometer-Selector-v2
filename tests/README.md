# Tests

Lightweight smoke-test suite for v2's new quote flow. Not vitest/jest — just
plain TypeScript files that call each function with realistic inputs and
assert the outcome. Keeps the dependency tree minimal.

## Running

```bash
npm test                    # runs all three suites
npm run test:validators     # 39 assertions
npm run test:formatters     # 21 assertions
npm run test:web3forms      # 19 assertions (mocks fetch)
```

Each script exits non-zero if any assertion fails, so you can wire these
into a pre-commit hook or CI step if desired.

## What each suite covers

### validators.smoke.ts
- Name: Unicode letters, CJK, accented chars, hyphens, apostrophes, periods
- Email: simplified RFC-5322, length caps, whitespace trimming
- Application description: 20-char minimum, 2000-char cap
- `allFieldsValid` aggregate

### formatters.smoke.ts
- Runs real searches against the shipped data files
- Verifies spectrometer labels, search summaries, and results blocks
  contain the expected structure and fields
- Covers: exact matches, zero exact matches, out-of-range inputs, narrow windows
- Classifies match_type correctly (exact vs near-miss)
- Confirms email body stays under a sane size cap

### web3forms.smoke.ts
- Mocks `global.fetch` to simulate every response mode:
  - Missing access key (short-circuit)
  - Happy path (HTTP 200 + success:true)
  - HTTP 200 + success:false (e.g. invalid key)
  - HTTP 500 with JSON body
  - Network failure (fetch throws)
  - Non-JSON response body
- Inspects the actual POST payload to confirm correct field mapping,
  honeypot presence, and subject/from_name formatting.

## Adding new tests

Match the existing style — `check(label, condition)` pattern, one `console.log`
section header per logical group. Keep assertions independent: if one fails,
the rest should still run and report.
