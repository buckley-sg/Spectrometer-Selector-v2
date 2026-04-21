/**
 * SlitBar — visual bar chart of available slit widths and their resolutions.
 * Highlights the recommended slit in green, and marks all slits that meet
 * the customer's resolution requirement.
 */
import { BRAND } from "../brand";

interface SlitBarProps {
  slits: [number, number][]; // [slitUm, resolutionNm][] sorted ascending
  maxRes: number;
  recSlit: number;
}

export default function SlitBar({ slits, maxRes, recSlit }: SlitBarProps) {
  const maxResValue = Math.max(...slits.map((s) => s[1]));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 3,
        height: 48,
        padding: "4px 0",
      }}
    >
      {slits.map(([slitUm, res]) => {
        const barHeight = Math.max(8, (res / maxResValue) * 44);
        const isRecommended = slitUm === recSlit;
        const meetsSpec = res <= maxRes;

        return (
          <div
            key={slitUm}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <div
              style={{
                width: 26,
                height: barHeight,
                borderRadius: 3,
                background: isRecommended
                  ? BRAND.green
                  : meetsSpec
                    ? BRAND.teal
                    : "#d1d5db",
                border: isRecommended
                  ? `2px solid ${BRAND.navy}`
                  : "1px solid transparent",
              }}
              title={`${slitUm} µm → ${res} nm`}
            />
            <span style={{ fontSize: 9, color: "#6b7280", lineHeight: 1 }}>
              {slitUm}
            </span>
          </div>
        );
      })}
    </div>
  );
}
