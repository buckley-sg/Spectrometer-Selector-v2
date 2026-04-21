/**
 * Smoke tests for quoteFormatting.ts and the overall quote flow wiring.
 * Verifies formatters produce sensible output against realistic selector results.
 */
import { resolutionRecords, gratingOverrides, codeRanges } from "../src/data";
import { search, recordId } from "../src/logic/selector";
import {
  formatSpectrometerLabel,
  formatSearchSummary,
  formatResultsBlock,
} from "../src/lib/quoteFormatting";

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

// ═══════════════════════════════════════════════════════════════════
// Test case 1: A search that should produce exact matches
// Note: 200-550 nm at 0.5 nm is actually ALL near-misses (the bandwidth
// is wide enough that no single grating hits 0.5 nm resolution). Use a
// narrower window that actually produces exact matches.
// ═══════════════════════════════════════════════════════════════════
console.log("\n== Test Case 1: 500-510 nm, 0.5 nm resolution (narrow window, should match) ==");
const r1 = search(500, 510, 0.5, resolutionRecords, gratingOverrides, codeRanges);
console.log(
  `  (${r1.matches.length} exact matches, ${r1.nearMisses.length} near misses)`,
);

check("At least one exact match found", r1.matches.length >= 1);

if (r1.matches.length > 0) {
  const top = r1.matches[0];
  const label = formatSpectrometerLabel(top);
  console.log(`  Top result label: ${label}`);
  check("Label is non-empty", label.length > 0);
  check("Label contains product name", /[A-Z]/.test(label));
  check("Label contains grooves", label.includes("g/mm"));
  check("Label contains blaze nm", label.includes("blaze"));
  check("Label contains slit", label.includes("µm"));
  check("Label contains resolution", label.includes("res"));
}

const summary1 = formatSearchSummary(500, 510, 0.5);
console.log(`  Search summary: ${summary1}`);
check("Summary contains min wavelength", summary1.includes("500"));
check("Summary contains max wavelength", summary1.includes("510"));
check("Summary contains resolution", summary1.includes("0.5"));
check("Summary contains bandwidth", summary1.includes("10"));

if (r1.matches.length > 0) {
  const selectedId = recordId(r1.matches[0]);
  const block = formatResultsBlock(
    r1.matches,
    r1.nearMisses,
    500,
    510,
    selectedId,
    recordId,
  );
  console.log(`  Results block (first 5 lines):`);
  block.split("\n").slice(0, 5).forEach((l) => console.log(`    ${l}`));

  check("Results block has exact matches header", block.includes("Exact matches"));
  check("Results block marks selected with ★", block.includes("★"));
  check(
    "Results block legend present",
    block.includes("★ = spectrometer the customer selected"),
  );
}

// ═══════════════════════════════════════════════════════════════════
// Test case 2: A search that should produce zero exact matches
// (impossibly narrow resolution for a wide range)
// ═══════════════════════════════════════════════════════════════════
console.log(
  "\n== Test Case 2: 200-1100 nm, 0.01 nm resolution (impossible for single grating) ==",
);
const r2 = search(200, 1100, 0.01, resolutionRecords, gratingOverrides, codeRanges);
console.log(
  `  (${r2.matches.length} exact matches, ${r2.nearMisses.length} near misses)`,
);
check("Zero exact matches (as expected)", r2.matches.length === 0);

// ═══════════════════════════════════════════════════════════════════
// Test case 3: A search that should produce absolutely nothing
// (wavelength outside any selectable range)
// ═══════════════════════════════════════════════════════════════════
console.log("\n== Test Case 3: 50-60 nm, 0.5 nm (outside all ranges) ==");
const r3 = search(50, 60, 0.5, resolutionRecords, gratingOverrides, codeRanges);
console.log(
  `  (${r3.matches.length} exact matches, ${r3.nearMisses.length} near misses)`,
);
check(
  "Zero exact matches (wavelength out of range)",
  r3.matches.length === 0,
);
check(
  "Zero near misses (wavelength out of range)",
  r3.nearMisses.length === 0,
);

// ═══════════════════════════════════════════════════════════════════
// Test case 4: Edge case — very narrow range (single-peak measurement)
// ═══════════════════════════════════════════════════════════════════
console.log("\n== Test Case 4: 500-510 nm, 0.2 nm (narrow window) ==");
const r4 = search(500, 510, 0.2, resolutionRecords, gratingOverrides, codeRanges);
console.log(
  `  (${r4.matches.length} exact matches, ${r4.nearMisses.length} near misses)`,
);
check("At least some results for narrow window", r4.matches.length + r4.nearMisses.length >= 1);

// ═══════════════════════════════════════════════════════════════════
// Test: match_type classification logic (mirrors what App.tsx does)
// ═══════════════════════════════════════════════════════════════════
console.log("\n== match_type classification ==");
if (r1.matches.length > 0) {
  const exactSelId = recordId(r1.matches[0]);
  const isExact = r1.matches.some((m) => recordId(m) === exactSelId);
  check('Top-match ID classified as "exact"', isExact);
}
if (r2.nearMisses.length > 0) {
  const nearSelId = recordId(r2.nearMisses[0]);
  const isExactFromNearMiss = r2.matches.some((m) => recordId(m) === nearSelId);
  check(
    'Near-miss ID NOT classified as "exact"',
    isExactFromNearMiss === false,
  );
}

// ═══════════════════════════════════════════════════════════════════
// Test: email body stays under reasonable size even with many results
// ═══════════════════════════════════════════════════════════════════
console.log("\n== Email body size ==");
if (r1.matches.length > 0) {
  const selectedId = recordId(r1.matches[0]);
  const block = formatResultsBlock(
    r1.matches,
    r1.nearMisses,
    500,
    510,
    selectedId,
    recordId,
  );
  console.log(`  Results block length: ${block.length} chars`);
  check("Block under 20KB (reasonable for any email)", block.length < 20000);
}

console.log(`\n--- ${passed} passed, ${failed} failed ---\n`);
process.exit(failed === 0 ? 0 : 1);
