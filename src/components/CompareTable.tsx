/**
 * CompareTable — side-by-side comparison of checked results.
 * Displays a table with all slit columns, recommended slit highlighted,
 * and grating codes.
 */
import type { EnrichedResult } from "../logic/selector";
import { blazeInRange, blazeSortComparator, formatPartNumber } from "../logic/selector";
import type { CodeInfo } from "../types/spectrometer";
import { BRAND, PRODUCT_COLORS } from "../brand";

interface CompareTableProps {
  items: EnrichedResult[];
  maxRes: number;
  wlMin: number;
  wlMax: number;
  onClear: () => void;
}

export default function CompareTable({
  items,
  maxRes,
  wlMin,
  wlMax,
  onClear,
}: CompareTableProps) {
  if (items.length === 0) return null;

  // Gather all unique slit sizes across all compared items
  const allSlits = [
    ...new Set(items.flatMap((r) => r.allSlits.map((s) => s[0]))),
  ].sort((a, b) => a - b);

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 16,
        border: `2px solid ${BRAND.green}`,
        boxShadow: "0 2px 8px rgba(58,125,34,.15)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.navy }}>
          Comparison ({items.length})
        </div>
        <button
          onClick={onClear}
          style={{
            background: "none",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 11,
            cursor: "pointer",
            color: "#64748b",
          }}
        >
          Clear
        </button>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <Th align="left">PRODUCT</Th>
              <Th align="left">GRATING</Th>
              <Th align="center">BW</Th>
              <Th align="center">RANGE</Th>
              <Th align="center" highlight>
                REC
              </Th>
              {allSlits.map((s) => (
                <th
                  key={s}
                  style={{
                    textAlign: "center",
                    padding: "6px 4px",
                    color: "#94a3b8",
                    fontWeight: 600,
                    fontSize: 10,
                  }}
                >
                  {s}µm
                </th>
              ))}
              <Th align="left">CODES</Th>
              <Th align="left">PART #</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => {
              const slitMap = Object.fromEntries(r.allSlits) as Record<
                number,
                number
              >;
              const blazeSort = blazeSortComparator(wlMin, wlMax);
              const color = PRODUCT_COLORS[r.evolveNames[0]] ?? "#333";
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td
                    style={{
                      padding: 8,
                      fontWeight: 600,
                      color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.evolveNames[0]}
                    {r.model ? ` (${r.model})` : ""}
                  </td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {r.gratingGrooves}g blz{" "}
                    {[...r.blazeWavelengths]
                      .sort((a, b) => blazeSort(String(a), String(b)))
                      .map(b => blazeInRange(b, wlMin, wlMax) ? String(b) : `${b}*`)
                      .join("/")}
                  </td>
                  <td style={{ padding: 8, textAlign: "center" }}>
                    {r.bandwidthNm}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.selectableRange[0]}–{r.selectableRange[1]}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#065f46",
                      background: "#ecfdf5",
                    }}
                  >
                    {r.recSlit}µm→{r.recRes}nm
                  </td>
                  {allSlits.map((s) => {
                    const v = slitMap[s];
                    const ok = v !== undefined && v <= maxRes;
                    return (
                      <td
                        key={s}
                        style={{
                          padding: 4,
                          textAlign: "center",
                          fontSize: 11,
                          color:
                            v === undefined
                              ? "#d1d5db"
                              : ok
                                ? "#065f46"
                                : "#94a3b8",
                          fontWeight: ok ? 700 : 400,
                          background:
                            s === r.recSlit ? "#ecfdf5" : "transparent",
                        }}
                      >
                        {v !== undefined ? v : "—"}
                      </td>
                    );
                  })}
                  <td style={{ padding: 8, fontSize: 11 }}>
                    {Object.entries(r.codesByBlaze)
                      .sort(([a], [b]) => blazeSort(a, b))
                      .map(([blaze, codes]: [string, CodeInfo[]]) => {
                        const inRange = blazeInRange(Number(blaze), wlMin, wlMax);
                        const label = inRange ? `${blaze}nm` : `${blaze}nm*`;
                        const codeStrs = codes.slice(0, 3).map((ci) => {
                          const range = ci.wlMin != null && ci.wlMax != null
                            ? ` (${ci.wlMin}–${ci.wlMax})`
                            : "";
                          return `${ci.code}${range}`;
                        });
                        return `${label}: ${codeStrs.join(", ")}`;
                      })
                      .join(" | ")}
                  </td>
                  <td style={{
                    padding: 8,
                    fontSize: 10,
                    fontFamily: "'Courier New', Consolas, monospace",
                    whiteSpace: "nowrap",
                  }}>
                    {Object.entries(r.codesByBlaze)
                      .filter(([blaze]) => blazeInRange(Number(blaze), wlMin, wlMax))
                      .flatMap(([, codes]: [string, CodeInfo[]]) =>
                        r.platforms.map((p) => formatPartNumber(p, r.recSlit, codes[0].code))
                      )
                      .slice(0, 3)
                      .join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Small helper for consistent table headers. */
function Th({
  children,
  align,
  highlight,
}: {
  children: React.ReactNode;
  align: "left" | "center";
  highlight?: boolean;
}) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "6px 8px",
        color: "#64748b",
        fontWeight: 600,
        fontSize: 11,
        background: highlight ? "#ecfdf5" : undefined,
      }}
    >
      {children}
    </th>
  );
}
