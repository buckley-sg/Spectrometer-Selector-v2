/**
 * Data loader — imports the raw JSON data files and normalises compact
 * keys into the full ResolutionRecord shape used by the rest of the app.
 *
 * Three data files are loaded:
 *   - resolutionRecords.json  — 68 optical bench × grating configurations
 *   - gratingOverrides.json   — "platform|grooves|blaze" → grating code lookup
 *   - namingRecords.json      — grating code → [wlMin, wlMax] wavelength window
 */
import type {
  CompactResolutionRecord,
  ResolutionRecord,
  SlitResolutions,
  GratingOverrides,
  CodeRangeLookup,
} from "../types/spectrometer";

import compactRecords from "./resolutionRecords.json";
import overrides from "./gratingOverrides.json";
import namingLookup from "./namingRecords.json";

/** Convert a compact record to the full typed shape. */
function expand(c: CompactResolutionRecord): ResolutionRecord {
  const slitResolutions: SlitResolutions = {};
  for (const [k, v] of Object.entries(c.sl)) {
    slitResolutions[Number(k)] = v;
  }

  return {
    platforms: c.pl,
    evolveNames: c.en,
    isEvolve: c.ie,
    gratingGrooves: c.gg,
    blazeWavelengths: c.bw,
    bandwidthNm: c.bn,
    selectableRange: c.sr,
    slitResolutions,
    model: c.md,
    anomalyFixed: c.af,
  };
}

/** All 68 resolution records, fully typed. */
export const resolutionRecords: ResolutionRecord[] =
  (compactRecords as unknown as CompactResolutionRecord[]).map(expand);

/** Grating override lookup: "PLATFORM|grooves|blaze" → grating codes. */
export const gratingOverrides: GratingOverrides = overrides as GratingOverrides;

/** Grating code → [wlMin, wlMax] wavelength window (257 entries). */
export const codeRanges: CodeRangeLookup = namingLookup as unknown as CodeRangeLookup;
