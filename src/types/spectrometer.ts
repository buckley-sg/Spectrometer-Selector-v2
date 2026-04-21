/**
 * Type definitions for the Evolve Selector.
 *
 * Two shapes exist for resolution records:
 *   - CompactResolutionRecord  – minified keys stored in the JSON data files
 *   - ResolutionRecord         – human-readable keys used everywhere else
 *
 * The data layer normalises compact → full at import time so the rest of
 * the app only deals with ResolutionRecord.
 */

// ── Compact (minified) shape from the JSON data files ───────────────────

export interface CompactResolutionRecord {
  pl: string[];                   // platform codes, e.g. ["SE","EE"]
  en: string[];                   // evolve names,   e.g. ["SmartEngine","EagleEye"]
  ie: boolean;                    // is_evolve — sold by Evolve Sensing?
  gg: number;                     // grating groove density (g/mm)
  bw: number[];                   // blaze wavelengths (nm)
  bn: number;                     // bandwidth (nm)
  sr: [number, number];           // selectable range [min, max] (nm)
  sl: Record<string, number>;     // slit width (µm string) → optical resolution (nm)
  md?: string;                    // model name (optional, e.g. "SW2570")
  af?: boolean;                   // anomaly_fixed flag (optional)
}

// ── Full (readable) shape used throughout the app ───────────────────────

/** Slit width (µm) → optical resolution (nm). */
export interface SlitResolutions {
  [slitMicrons: number]: number;
}

/** One optical bench × grating configuration with all available slit options. */
export interface ResolutionRecord {
  platforms: string[];             // OtO platform codes, e.g. ["SE","EE"]
  evolveNames: string[];           // Evolve product names
  isEvolve: boolean;               // sold by Evolve Sensing?
  gratingGrooves: number;          // groove density (g/mm)
  blazeWavelengths: number[];      // available blaze wavelengths (nm)
  bandwidthNm: number;             // spectral bandwidth (nm)
  selectableRange: [number, number]; // configurable wavelength range [min, max] (nm)
  slitResolutions: SlitResolutions;
  model?: string;                  // optical bench model (e.g. "SW2570")
  anomalyFixed?: boolean;          // data-quality flag from parser
}

// ── Grating override table ──────────────────────────────────────────────

/** Key format: "PLATFORM|grooves|blaze" → array of grating code strings. */
export type GratingOverrides = Record<string, string[]>;

// ── Grating code with wavelength range ──────────────────────────────────

/** A single grating code enriched with its configured wavelength window. */
export interface CodeInfo {
  code: string;                    // grating code (e.g. "V14", "DUV5")
  wlMin: number | null;            // configured window start (nm), null if unknown
  wlMax: number | null;            // configured window end (nm), null if unknown
}

/** Grating code string → [wlMin, wlMax] wavelength window. */
export type CodeRangeLookup = Record<string, [number, number]>;

// ── Evolve product name map ─────────────────────────────────────────────

/** OtO platform code → Evolve product name (e.g. "SE" → "SmartEngine"). */
export type EvolveMap = Record<string, string>;
