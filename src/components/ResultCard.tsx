/**
 * ResultCard — displays one search result (exact match or near miss).
 * Shows product name, grating info, bandwidth, range, recommended slit,
 * slit bar chart, and grating codes. Includes a "Compare" checkbox.
 */
/**
 * ResultCard — displays one search result (exact match or near miss).
 *
 * Layout:
 *   - Header: rank badge, product name, recommended slit/resolution, compare checkbox
 *   - Info grid: grating (g/mm + blazes), bandwidth, selectable range
 *   - Part numbers: XXxxxx-SSS-GGGG badges, in-range prominent, out-of-range faded
 *   - Footer: slit bar chart + grating codes grouped by blaze with wavelength ranges
 */
import type { EnrichedResult } from "../logic/selector";
import { blazeInRange, blazeSortComparator, formatPartNumber } from "../logic/selector";
import type { CodeInfo } from "../types/spectrometer";
import { BRAND, PRODUCT_COLORS } from "../brand";
import SlitBar from "./SlitBar";

interface ResultCardProps {
  result: EnrichedResult;
  maxRes: number;
  wlMin: number;
  wlMax: number;
  rank: number | null;
  isNearMiss: boolean;
  isCompared: boolean;
  onToggleCompare: () => void;
}

export default function ResultCard({
  result: r,
  maxRes,
  wlMin,
  wlMax,
  rank,
  isNearMiss,
  isCompared,
  onToggleCompare,
}: ResultCardProps) {
  const name = r.evolveNames.join(" / ");
  const model = r.model ? ` (${r.model})` : "";
  const color = PRODUCT_COLORS[r.evolveNames[0]] ?? BRAND.teal;

  const blazeSort = blazeSortComparator(wlMin, wlMax);
  const sortedBlazes = [...r.blazeWavelengths].sort((a, b) => blazeSort(String(a), String(b)));

  return (
    <div
      style={{
        background: "white",
        borderRadius: 10,
        padding: "14px 18px",
        border: isNearMiss ? "1px dashed #d1d5db" : "1px solid #e5e7eb",
        boxShadow: isNearMiss ? "none" : "0 1px 3px rgba(0,0,0,.06)",
        opacity: isNearMiss ? 0.85 : 1,
      }}
    >
      {/* Header row: rank/badge + product name + recommendation + compare */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 200,
          }}
        >
          {!isNearMiss && (
            <span
              style={{
                background: BRAND.navy,
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {rank}
            </span>
          )}
          {isNearMiss && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
                background: "#f59e0b",
                color: "white",
                letterSpacing: 0.5,
              }}
            >
              NEAR MISS
            </span>
          )}
          <span style={{ fontWeight: 700, fontSize: 15, color }}>
            {name}
          </span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{model}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              textAlign: "right",
              background: isNearMiss ? "#fef3c7" : "#ecfdf5",
              padding: "4px 10px",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1 }}>
              {isNearMiss ? "Best achievable" : "Recommended"}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: isNearMiss ? "#92400e" : "#065f46",
              }}
            >
              {r.recSlit} µm → {r.recRes} nm
            </div>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              fontSize: 11,
              color: "#64748b",
              flexShrink: 0,
            }}
          >
            <input
              type="checkbox"
              checked={isCompared}
              onChange={onToggleCompare}
              style={{ accentColor: BRAND.green }}
            />
            Compare
          </label>
        </div>
      </div>

      {/* Info grid: grating, bandwidth, range */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        <div style={{ background: "#f8fafc", borderRadius: 6, padding: "6px 10px" }}>
          <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 2 }}>
            GRATING
          </div>
          <div style={{ fontWeight: 600 }}>{r.gratingGrooves} g/mm</div>
          <div style={{ color: "#64748b", fontSize: 11 }}>
            Blaze:{" "}
            {sortedBlazes.map((b, i) => {
              const inRange = blazeInRange(b, wlMin, wlMax);
              return (
                <span key={b}>
                  {i > 0 && ", "}
                  <span style={{
                    color: inRange ? "#065f46" : "#9ca3af",
                    fontWeight: inRange ? 600 : 400,
                    fontStyle: inRange ? "normal" : "italic",
                  }}>
                    {b}{!inRange && "*"}
                  </span>
                </span>
              );
            })}{" "}nm
          </div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 6, padding: "6px 10px" }}>
          <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 2 }}>
            BANDWIDTH
          </div>
          <div style={{ fontWeight: 600 }}>{r.bandwidthNm} nm</div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 6, padding: "6px 10px" }}>
          <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 2 }}>
            RANGE
          </div>
          <div style={{ fontWeight: 600 }}>
            {r.selectableRange[0]}–{r.selectableRange[1]} nm
          </div>
        </div>
      </div>

      {/* Part numbers — prominent display */}
      {Object.keys(r.codesByBlaze).length > 0 && (
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 6,
          padding: "8px 12px",
          marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, color: "#065f46", fontWeight: 600, marginBottom: 4 }}>
            PART NUMBERS (at {r.recSlit} µm slit)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {Object.entries(r.codesByBlaze)
              .sort(([a], [b]) => blazeSort(a, b))
              .flatMap(([blaze, codes]: [string, CodeInfo[]]) => {
                const inRange = blazeInRange(Number(blaze), wlMin, wlMax);
                return r.platforms.flatMap((platform) =>
                  codes.map((ci) => ({ platform, ci, blaze, inRange }))
                );
              })
              .map(({ platform, ci, blaze, inRange }, i) => (
                <span
                  key={`${platform}-${ci.code}-${blaze}-${i}`}
                  style={{
                    fontFamily: "'Courier New', Consolas, monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: inRange ? BRAND.navy : "#e5e7eb",
                    color: inRange ? "white" : "#9ca3af",
                    opacity: inRange ? 1 : 0.6,
                  }}
                  title={inRange ? undefined : "Blaze outside search range"}
                >
                  {formatPartNumber(platform, r.recSlit, ci.code)}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Footer: slit bar + grating codes with wavelength ranges */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>
            SLIT OPTIONS (µm)
          </div>
          <SlitBar slits={r.allSlits} maxRes={maxRes} recSlit={r.recSlit} />
        </div>
        {Object.keys(r.codesByBlaze).length > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>
              GRATING CODES
            </div>
            {Object.entries(r.codesByBlaze)
              .sort(([a], [b]) => blazeSort(a, b))
              .map(([blaze, codes]: [string, CodeInfo[]]) => {
                const inRange = blazeInRange(Number(blaze), wlMin, wlMax);
                return (
                  <div
                    key={blaze}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 3,
                      justifyContent: "flex-end",
                      alignItems: "center",
                      marginBottom: 2,
                      opacity: inRange ? 1 : 0.55,
                    }}
                  >
                    <span style={{
                      fontSize: 10,
                      color: inRange ? "#065f46" : "#9ca3af",
                      fontWeight: inRange ? 600 : 400,
                      marginRight: 2,
                    }}>
                      {blaze} nm{!inRange && " (outside range)"}:
                    </span>
                    {codes.slice(0, 5).map((ci, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: inRange ? "#eef2ff" : "#f3f4f6",
                          color: inRange ? "#4338ca" : "#9ca3af",
                        }}
                      >
                        {ci.code}
                        {ci.wlMin != null && ci.wlMax != null && (
                          <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 2 }}>
                            ({ci.wlMin}–{ci.wlMax})
                          </span>
                        )}
                      </span>
                    ))}
                    {codes.length > 5 && (
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>
                        +{codes.length - 5}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
