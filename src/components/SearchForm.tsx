/**
 * SearchForm — three-input form for wavelength range and target resolution.
 * Shows the computed required bandwidth below the inputs.
 */
import { BRAND } from "../brand";

interface SearchFormProps {
  wlMin: string;
  wlMax: string;
  maxRes: string;
  onWlMinChange: (v: string) => void;
  onWlMaxChange: (v: string) => void;
  onMaxResChange: (v: string) => void;
}

const FIELDS = [
  { label: "Min Wavelength (nm)", placeholder: "e.g. 200", key: "wlMin" },
  { label: "Max Wavelength (nm)", placeholder: "e.g. 550", key: "wlMax" },
  { label: "Target Resolution (nm)", placeholder: "e.g. 0.5", key: "maxRes" },
] as const;

export default function SearchForm({
  wlMin,
  wlMax,
  maxRes,
  onWlMinChange,
  onWlMaxChange,
  onMaxResChange,
}: SearchFormProps) {
  const values: Record<string, string> = { wlMin, wlMax, maxRes };
  const setters: Record<string, (v: string) => void> = {
    wlMin: onWlMinChange,
    wlMax: onWlMaxChange,
    maxRes: onMaxResChange,
  };

  const bandwidth = Number(wlMax) - Number(wlMin);
  const showBandwidth = !isNaN(bandwidth) && bandwidth > 0;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: "18px 22px",
        marginBottom: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,.04)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
        }}
      >
        {FIELDS.map(({ label, placeholder, key }) => (
          <div key={key}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: "#475569",
                marginBottom: 5,
                letterSpacing: 0.3,
              }}
            >
              {label}
            </label>
            <input
              type="number"
              step="any"
              value={values[key]}
              onChange={(e) => setters[key](e.target.value)}
              placeholder={placeholder}
              style={{
                width: "100%",
                padding: "9px 11px",
                border: "1.5px solid #cbd5e1",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                color: BRAND.navy,
                outline: "none",
                boxSizing: "border-box",
                background: "#f8fafc",
              }}
              onFocus={(e) => (e.target.style.borderColor = BRAND.green)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>
        ))}
      </div>

      {showBandwidth && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          Required bandwidth:{" "}
          <strong style={{ color: BRAND.navy }}>{bandwidth} nm</strong>
        </div>
      )}
    </div>
  );
}
