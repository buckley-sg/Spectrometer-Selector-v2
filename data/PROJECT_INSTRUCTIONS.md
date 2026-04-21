# Evolve Sensing Spectrometer Selector — Project Documentation

## Purpose
This tool helps Evolve Sensing salespeople quickly find the right spectrometer configuration for a customer's requirements. Given a wavelength range and resolution specification, it returns all compatible Evolve spectrometer platforms, grating configurations, and optimal slit widths — ranked by optical throughput.

## Business Context

### What Evolve Sensing Does
Evolve Sensing (Redmond, WA) is the North American and European distributor for OtO Photonics (Hsinchu, Taiwan) spectrometer hardware. They rebrand OtO's optical benches under Evolve product names. The key value proposition is helping customers select the right spectrometer configuration from a large combinatorial space of optical bench × grating × slit width options.

### OtO → Evolve Product Name Mapping
| OtO Code | Evolve Name     | Type              |
|----------|-----------------|-------------------|
| SE       | SmartEngine     | UV-Vis            |
| EE       | EagleEye        | UV-Vis (cooled)   |
| HB       | HummingBird     | UV-Vis            |
| SW       | SideWinder      | NIR (900-2500nm)  |
| SB       | SilverBullet    | UV-Vis            |
| RB       | RedBullet       | NIR               |
| PD       | Phenom          | High-resolution   |
| MG       | Magna           | High-resolution   |
| DF       | Dragonfly       | NIR               |
| PH       | PocketHawk      | Compact           |
| DB       | Delta           | High-resolution   |
| GB       | GoldenBullet    | NIR               |
| MR       | Merak           | High-resolution   |

Platforms NOT sold by Evolve: UM, OW, CR, AA, NV, HA, SD, SP, MS, SU, SH, DS, AM, RS, CM

### How Spectrometer Selection Works (Domain Knowledge)
A spectrometer's performance is determined by three key parameters:
1. **Grating** (grooves/mm + blaze wavelength): Determines the bandwidth (wavelength range the spectrometer can see at once) and the theoretical resolution limit. Higher groove density = narrower bandwidth but better resolution.
2. **Slit width** (µm): Controls the trade-off between resolution and throughput. Narrower slits give better resolution but let in less light. You always want the LARGEST slit that still meets the resolution requirement.
3. **Optical bench**: The physical spectrometer platform. Different benches support different gratings and slits.

The fundamental physics constraint: you cannot simultaneously have wide bandwidth AND high resolution. A customer asking for 350nm bandwidth at 0.5nm resolution is asking for something no single spectrometer can deliver — the tool correctly reports this and shows nearest alternatives.

### Grating Code System
Each grating configuration has a code name (e.g., "DUV5", "VNIR", "NIRA") defined in the OtO naming system. These codes specify:
- The wavelength range the spectrometer will be configured for
- The physical grating (grooves/mm and blaze wavelength)
- Which optical bench(es) it's compatible with

When ordering a spectrometer from OtO, you specify the grating code. The naming table maps codes ↔ gratings ↔ platforms.

---

## File Inventory

### Source Data Files (from OtO)
- `OtO-Resolution_Table-202501.xlsx` — Master resolution table. Contains simulated optical resolution (nm) for every combination of optical bench × grating × slit width. The data is organized in human-readable sections, NOT machine-readable tables.
- `20250513__Naming_Rule.xlsx` — Grating naming rules. Maps grating code names to wavelength ranges, compatible platforms, and physical grating specs.

### Generated Data Files
- `spectrometer_data.json` — The fully parsed, normalized, and enriched dataset containing:
  - `resolution_records` (68 records): Every optical bench × grating combination with slit-resolution curves
  - `naming_records` (258 records): All grating codes with wavelength ranges and platform compatibility
  - `manual_overrides` (107 entries): Curated grating code lookups keyed by "platform|grooves|blaze"
  - `evolve_map`: OtO → Evolve name mapping
- `grating_overrides.json` — Standalone export of the manual override table

### Python Code
- `parse_data_v2.py` — The data extraction pipeline. Reads both Excel files and produces `spectrometer_data.json`. Each spectrometer series (SE/EE, HB, SW, SB, RB, MR, PD, DF, PH) has its own parser because the Excel layouts are all different.
- `selector.py` — The Python selector logic. Takes (min_wl, max_wl, max_resolution) and returns ranked matches. Includes test cases. Uses automatic grating code cross-referencing (NOT the manual overrides — the React app uses the overrides instead).

### React App
- `spectrometer_selector.jsx` — Self-contained React component with all data embedded. Features:
  - Three-input search (min wavelength, max wavelength, target resolution)
  - Results ranked by throughput (largest viable slit first)
  - Near-miss display when no exact matches exist
  - Side-by-side comparison table (checkbox any results to compare)
  - Manual override table for grating code lookups
  - Evolve branding (navy #0E2841, green #3A7D22, teal #467886)

---

## Data Pipeline Architecture

```
OtO-Resolution_Table-202501.xlsx ──┐
                                    ├──> parse_data_v2.py ──> spectrometer_data.json
20250513__Naming_Rule.xlsx ────────┘              │
                                                   │
                                                   ├──> selector.py (Python CLI)
                                                   │
                                                   └──> spectrometer_selector.jsx (React app)
                                                         (data embedded inline as JSON constants)
```

### Why the Data is Embedded in the React App
The JSON data (~35KB compressed) is small enough to embed directly. This means the React app is completely self-contained — no server, no API, no external data files. It can run as a static file, in Claude.ai artifacts, or deployed to any static host.

### Data Normalization Challenges Solved
The OtO resolution table is formatted for humans, not machines. Key challenges that the parser handles:

1. **Different layouts per series**: SE/EE has groove density in column 1 and slits in columns 5-10. SW has model name in column 1, grooves in column 2, and slits in columns 6-11. SB puts the wavelength range in column 5 instead of column 4. Each series required its own parsing function.

2. **Split ranges**: HB section has wavelength ranges split across two rows ("180-" on one row, "540" on the next). The parser detects the trailing hyphen and looks ahead.

3. **Multi-row grating entries**: A single grating (e.g., SE/EE 1200 g/mm) may have multiple blaze wavelengths listed on separate sub-rows. The parser aggregates these.

4. **Resolution anomalies**: Some data points in the OtO table are physically impossible (e.g., HB 500g/mm showing 1.5nm resolution at 300µm slit but 2.3nm at 50µm — resolution should always degrade with wider slits). These are detected and corrected using log-log polynomial interpolation from the surrounding good data points.

5. **Parenthetical worst-case values**: SW section uses notation like "2.3(~3.7)" where the first number is nominal and the parenthetical is worst-case. The parser extracts the nominal (first) value.

---

## Selector Logic

### Core Algorithm
```
Given: wl_min, wl_max, max_resolution
Compute: required_bandwidth = wl_max - wl_min

For each resolution record:
  1. FILTER: bandwidth >= required_bandwidth (grating can cover the range)
  2. FILTER: selectable_range covers [wl_min, wl_max] fully (no partial matches)
  3. FIND: largest slit where resolution <= max_resolution (maximize throughput)
  4. LOOKUP: grating codes via manual override table

Sort matches by: largest recommended slit first, then best resolution

If no exact matches:
  Return "near misses" — configs that cover the wavelength range
  but can't achieve the resolution even at smallest slit
  Sort by: closest achievable resolution
```

### Manual Override Table vs Automatic Matching
Two approaches exist for looking up grating codes:

**Automatic matching** (used in `selector.py`): Cross-references resolution records to naming records by matching groove density, blaze wavelength, and platform code. Works but can return too many or slightly wrong codes due to ambiguity.

**Manual override table** (used in React app): Curated lookup keyed by `"platform|grooves|blaze"` string. More accurate but requires manual maintenance when new gratings are added. The override table has 107 entries covering all major configurations.

When extending the system, you should update the override table for any new grating configurations.

---

## How to Extend This Project

### Adding a New Spectrometer Platform
1. Parse its section from the resolution table (add a new parser function in `parse_data_v2.py`)
2. Add the OtO → Evolve name mapping
3. Add manual override entries for its grating codes
4. Rebuild the JSON and update the embedded data in the React app

### Adding New Gratings to an Existing Platform
1. Add the resolution data to the appropriate record in `spectrometer_data.json`
2. Add the grating code to the manual override table
3. Update the React app's embedded data

### Updating from a New OtO Resolution Table
1. Replace the source Excel file
2. Run `parse_data_v2.py` to regenerate `spectrometer_data.json`
3. Review the anomaly detection output for any new data quality issues
4. Update the React app's embedded data constants

### Potential Enhancements
- **Blaze efficiency weighting**: The selector doesn't currently consider whether the requested wavelength range is near the blaze wavelength (where grating efficiency peaks). A more sophisticated version could rank results by how well the blaze wavelength aligns with the customer's center wavelength.
- **Throughput estimation**: Given the slit width and grating efficiency curve, estimate relative optical throughput to give customers a quantitative comparison.
- **Multi-spectrometer solutions**: When no single spectrometer covers the range, suggest a combination (e.g., UV spectrometer + NIR spectrometer).
- **Price/availability integration**: Layer in pricing data to show cost alongside performance.
- **Customer database**: Track which configurations were quoted to which customers for sales pipeline management.

---

## Evolve Branding Standards
- Navy: `#0E2841`
- Green: `#3A7D22`
- Teal: `#467886`
- Tagline: "Defining the Future of Sensing"
- Footer: "Proprietary and Confidential"
- Contact: steve@evolve-sensing.com | +1 425-969-8782

---

## Technical Notes

### Data Format — Resolution Records
```json
{
  "pl": ["SE", "EE"],           // OtO platform codes
  "en": ["SmartEngine", "EagleEye"],  // Evolve names
  "ie": true,                    // is_evolve (sold by Evolve?)
  "gg": 600,                     // grating groove density (g/mm)
  "bw": [250, 300, 400, 500],   // available blaze wavelengths (nm)
  "bn": 670,                     // bandwidth (nm) 
  "sr": [180, 1100],            // selectable range [min, max] (nm)
  "sl": {"10": 1.0, "25": 1.2, "50": 1.9, "100": 3.3},  // slit→resolution
  "md": "SW2570",                // model name (optional, mainly for SW/SB/PD/etc.)
  "af": true                     // anomaly_fixed flag (optional)
}
```

### Data Format — Override Table
Key format: `"platform_code|groove_density|blaze_wavelength"`
Value: array of grating code strings
```json
{
  "SE|600|300": ["V4A", "DUV5"],
  "SW|236.8|1350": ["NIRA", "NIRB", "NIRC", "NIRJ"]
}
```

### Dependencies
- Python: pandas, openpyxl, numpy (for anomaly interpolation), json, re
- React: No external dependencies beyond React itself (uses inline styles, DM Sans via Google Fonts CDN)
