/**
 * Core spectrometer selector logic.
 *
 * Given a wavelength range and target resolution, finds all Evolve
 * spectrometer configurations that fully cover the range, recommending
 * the largest slit width that still meets the resolution spec
 * (maximising optical throughput).
 *
 * If no exact matches exist, returns "near misses" — configs that cover
 * the wavelength range but cannot achieve the resolution even at the
 * narrowest slit.
 */
import type {
  ResolutionRecord,
  GratingOverrides,
  CodeInfo,
  CodeRangeLookup,
} from "../types/spectrometer";

/** Grating codes grouped by blaze wavelength (nm). */
export type BlazeCodeMap = Record<number, CodeInfo[]>;

/** Enriched result record carried through Card / Compare. */
export interface EnrichedResult {
  /** Original resolution record fields */
  platforms: string[];
  evolveNames: string[];
  isEvolve: boolean;
  gratingGrooves: number;
  blazeWavelengths: number[];
  bandwidthNm: number;
  selectableRange: [number, number];
  model?: string;

  /** Computed fields */
  recSlit: number;
  recRes: number;
  codesByBlaze: BlazeCodeMap;
  allSlits: [number, number][]; // sorted ascending by slit width
}

export interface SelectorSearchResult {
  matches: EnrichedResult[];
  nearMisses: EnrichedResult[];
}

/**
 * Look up grating codes grouped by blaze wavelength, enriched with
 * each code's configured wavelength window from the naming table.
 * Includes ALL blaze wavelengths so the UI can annotate out-of-range ones.
 */
export function lookupGratingCodesByBlaze(
  record: ResolutionRecord,
  overrides: GratingOverrides,
  codeRangeLookup: CodeRangeLookup,
): BlazeCodeMap {
  const result: BlazeCodeMap = {};
  for (const blaze of record.blazeWavelengths) {
    const codeStrs: string[] = [];
    for (const platform of record.platforms) {
      const key = `${platform}|${record.gratingGrooves}|${blaze}`;
      const found = overrides[key];
      if (found) codeStrs.push(...found);
    }
    const unique = [...new Set(codeStrs)];
    if (unique.length > 0) {
      result[blaze] = unique.map((code) => {
        const range = codeRangeLookup[code];
        return {
          code,
          wlMin: range ? range[0] : null,
          wlMax: range ? range[1] : null,
        };
      });
    }
  }
  return result;
}

/**
 * Format a part number: XXxxxx-SSS-GGGG
 *   XX   = OtO platform code (e.g. "SE", "SW")
 *   xxxx = model placeholder (customer specifies actual model)
 *   SSS  = slit width in µm, zero-padded to 3 digits
 *   GGGG = grating code (e.g. "DUV5", "NIRC")
 */
export function formatPartNumber(platform: string, slitUm: number, gratingCode: string): string {
  return `${platform}xxxx-${String(slitUm).padStart(3, "0")}-${gratingCode}`;
}

/** Returns true if a blaze wavelength falls inside the user's search window. */
export function blazeInRange(blaze: number, wlMin: number, wlMax: number): boolean {
  return blaze >= wlMin && blaze <= wlMax;
}

/**
 * Sort comparator that orders blaze wavelengths (as numeric strings) with
 * in-range blazes first, then ascending by wavelength. Used by ResultCard
 * and CompareTable to present grating codes in a consistent order.
 */
export function blazeSortComparator(wlMin: number, wlMax: number) {
  return (a: string, b: string): number => {
    const aIn = blazeInRange(Number(a), wlMin, wlMax);
    const bIn = blazeInRange(Number(b), wlMin, wlMax);
    if (aIn !== bIn) return aIn ? -1 : 1;
    return Number(a) - Number(b);
  };
}

/** Count blaze wavelengths in this result that fall within the search range. */
function countInRangeBlazes(r: { codesByBlaze: BlazeCodeMap }, wlMin: number, wlMax: number): number {
  return Object.keys(r.codesByBlaze)
    .map(Number)
    .filter(b => blazeInRange(b, wlMin, wlMax)).length;
}

/**
 * Generate a stable unique ID for a record (used for checkbox state).
 */
export function recordId(r: EnrichedResult): string {
  return `${r.platforms.join("")}-${r.gratingGrooves}-${r.blazeWavelengths.join("")}-${r.model ?? ""}`;
}

/**
 * Main search function. Finds all spectrometer configurations that fully
 * cover the requested wavelength range, recommends the largest slit width
 * meeting the resolution spec, and returns results sorted by throughput
 * with in-range blaze wavelengths prioritised.
 *
 * @param wlMin           - minimum wavelength required (nm)
 * @param wlMax           - maximum wavelength required (nm)
 * @param maxRes          - maximum acceptable resolution (nm, smaller = better)
 * @param records         - resolution records to search
 * @param overrides       - grating code override table
 * @param codeRangeLookup - grating code → wavelength window lookup
 */
export function search(
  wlMin: number,
  wlMax: number,
  maxRes: number,
  records: ResolutionRecord[],
  overrides: GratingOverrides,
  codeRangeLookup: CodeRangeLookup = {},
): SelectorSearchResult {
  const requiredBandwidth = wlMax - wlMin;
  const matches: EnrichedResult[] = [];
  const nearMisses: EnrichedResult[] = [];

  for (const r of records) {
    // Filter: must have selectable range and bandwidth
    if (!r.selectableRange || r.bandwidthNm === null) continue;

    // Filter: bandwidth must accommodate the requested range
    if (r.bandwidthNm < requiredBandwidth) continue;

    // Filter: selectable range must fully cover both endpoints
    if (r.selectableRange[0] > wlMin || r.selectableRange[1] < wlMax) continue;

    // Build sorted slit array: [[slitUm, resolutionNm], ...]
    const slitEntries: [number, number][] = Object.entries(r.slitResolutions)
      .map(([k, v]) => [Number(k), v] as [number, number])
      .sort((a, b) => a[0] - b[0]); // ascending by slit width

    if (slitEntries.length === 0) continue;

    // Look up grating codes grouped by blaze wavelength (all blazes)
    const codesByBlaze = lookupGratingCodesByBlaze(r, overrides, codeRangeLookup);

    // Build the enriched base record
    const base = {
      platforms: r.platforms,
      evolveNames: r.evolveNames,
      isEvolve: r.isEvolve,
      gratingGrooves: r.gratingGrooves,
      blazeWavelengths: r.blazeWavelengths,
      bandwidthNm: r.bandwidthNm,
      selectableRange: r.selectableRange,
      model: r.model,
      codesByBlaze,
      allSlits: slitEntries,
    };

    // Find the largest slit that achieves the required resolution
    // (search from largest to smallest)
    let bestSlit: [number, number] | null = null;
    const descSlits = [...slitEntries].sort((a, b) => b[0] - a[0]);
    for (const [slitUm, res] of descSlits) {
      if (res <= maxRes) {
        bestSlit = [slitUm, res];
        break;
      }
    }

    if (bestSlit) {
      matches.push({ ...base, recSlit: bestSlit[0], recRes: bestSlit[1] });
    } else {
      // Near miss: use the narrowest slit (best resolution achievable)
      const narrowest = slitEntries[0]; // smallest slit = best resolution
      nearMisses.push({ ...base, recSlit: narrowest[0], recRes: narrowest[1] });
    }
  }

  // Sort matches: largest slit (throughput) first, then in-range blaze count, then resolution.
  // Throughput is the primary concern — a 60µm slit with 0.9nm resolution is always
  // preferable to a 10µm slit with 1.0nm resolution, regardless of blaze alignment.
  matches.sort((a, b) => {
    // Primary: largest recommended slit (best throughput)
    if (a.recSlit !== b.recSlit) return b.recSlit - a.recSlit;
    // Secondary: more in-range blazes is better
    const aIn = countInRangeBlazes(a, wlMin, wlMax);
    const bIn = countInRangeBlazes(b, wlMin, wlMax);
    if (aIn !== bIn) return bIn - aIn;
    // Tertiary: better resolution as tiebreaker
    return a.recRes - b.recRes;
  });

  // Sort near misses: in-range blaze first, then closest achievable resolution
  nearMisses.sort((a, b) => {
    const aIn = countInRangeBlazes(a, wlMin, wlMax);
    const bIn = countInRangeBlazes(b, wlMin, wlMax);
    if ((aIn > 0) !== (bIn > 0)) return bIn > 0 ? 1 : -1;
    return a.recRes - b.recRes;
  });

  return { matches, nearMisses };
}
