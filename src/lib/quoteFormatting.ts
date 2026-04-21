/**
 * quoteFormatting.ts
 *
 * Helpers that transform EnrichedResult objects (from the selector logic)
 * into the human-readable strings that appear in the quote-request email body.
 *
 * Kept separate from web3forms.ts so the pure formatting logic can be
 * unit-tested (and reasoned about) independently of the submission transport.
 */
import type { EnrichedResult } from "../logic/selector";
import { blazeInRange, formatPartNumber } from "../logic/selector";

/**
 * Build a compact one-line label for a single spectrometer result.
 * Used in the quote form radio list and as the "selectedSpectrometer" field
 * in the email.
 *
 * Example output:
 *   "SmartEngine / EagleEye (SE2570) — 600 g/mm, blaze 500 nm, rec 100 µm slit (0.45 nm res)"
 */
export function formatSpectrometerLabel(r: EnrichedResult): string {
  const names = r.evolveNames.join(" / ");
  const model = r.model ? ` (${r.model})` : "";
  const blazes = r.blazeWavelengths.join("/");
  return `${names}${model} — ${r.gratingGrooves} g/mm, blaze ${blazes} nm, rec ${r.recSlit} µm slit (${r.recRes} nm res)`;
}

/**
 * Build the "SEARCH" summary line included in the email.
 * Example: "200–550 nm wavelength range, target resolution ≤0.5 nm (required bandwidth: 350 nm)"
 */
export function formatSearchSummary(
  wlMin: number,
  wlMax: number,
  maxRes: number,
): string {
  const bandwidth = wlMax - wlMin;
  return `${wlMin}–${wlMax} nm wavelength range, target resolution ≤${maxRes} nm (required bandwidth: ${bandwidth} nm)`;
}

/**
 * Build the multi-line "ALL RESULTS FOUND" block included in the email body.
 * Includes every exact match and every near miss the selector returned, with
 * part numbers for the recommended slit where gratings are available.
 *
 * This is deliberately verbose — the sales team reads this before calling the
 * lead, so more context is better.
 */
export function formatResultsBlock(
  matches: EnrichedResult[],
  nearMisses: EnrichedResult[],
  wlMin: number,
  wlMax: number,
  selectedId: string,
  recordIdFn: (r: EnrichedResult) => string,
): string {
  const lines: string[] = [];

  if (matches.length > 0) {
    lines.push(`Exact matches (${matches.length}) — sorted by throughput:`);
    matches.forEach((r, i) => {
      const marker = recordIdFn(r) === selectedId ? "★" : " ";
      lines.push(`  ${marker} ${i + 1}. ${formatSpectrometerLabel(r)}`);
      const parts = partNumbersForResult(r, wlMin, wlMax);
      if (parts.length > 0) {
        lines.push(`       Part numbers: ${parts.join(", ")}`);
      }
    });
  } else {
    lines.push(`Exact matches: none`);
  }

  if (nearMisses.length > 0) {
    lines.push(``);
    lines.push(`Near misses (${nearMisses.length}) — coverage OK, resolution short:`);
    nearMisses.slice(0, 8).forEach((r, i) => {
      const marker = recordIdFn(r) === selectedId ? "★" : " ";
      lines.push(`  ${marker} ${i + 1}. ${formatSpectrometerLabel(r)}`);
    });
    if (nearMisses.length > 8) {
      lines.push(`       ...and ${nearMisses.length - 8} more near misses not shown.`);
    }
  }

  lines.push(``);
  lines.push(`★ = spectrometer the customer selected for quoting`);
  return lines.join("\n");
}

/**
 * Collect in-range part numbers for a result at its recommended slit.
 * Mirrors the logic in ResultCard: iterates platforms × in-range blazes × codes.
 */
function partNumbersForResult(
  r: EnrichedResult,
  wlMin: number,
  wlMax: number,
): string[] {
  const parts: string[] = [];
  for (const [blazeStr, codes] of Object.entries(r.codesByBlaze)) {
    if (!blazeInRange(Number(blazeStr), wlMin, wlMax)) continue;
    for (const platform of r.platforms) {
      for (const ci of codes) {
        parts.push(formatPartNumber(platform, r.recSlit, ci.code));
      }
    }
  }
  // De-duplicate while preserving order
  return [...new Set(parts)];
}
