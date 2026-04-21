/**
 * QuotePrompt — the "Would you like a quote?" banner shown beneath results.
 *
 * Appears when the selector has returned at least one result (exact match
 * OR near miss). The button label adapts:
 *   - exact matches present → "Request a quote"
 *   - only near misses      → "Request a consultation" (softer framing,
 *                              since no result is guaranteed to meet spec)
 *
 * Clicking the button is a pure signal — state management lives in App.tsx.
 */
import { BRAND } from "../brand";

interface QuotePromptProps {
  hasExactMatches: boolean;
  onRequestQuote: () => void;
}

export default function QuotePrompt({
  hasExactMatches,
  onRequestQuote,
}: QuotePromptProps) {
  const buttonLabel = hasExactMatches
    ? "Request a quote"
    : "Request a consultation";

  const headline = hasExactMatches
    ? "Found a good fit?"
    : "Need help narrowing down?";

  const body = hasExactMatches
    ? "Our sales team can put together a quote on the spectrometer that matches your requirements."
    : "The exact specs you entered aren't a perfect match, but our team can help identify the closest production option — or discuss a custom configuration.";

  return (
    <div
      style={{
        marginTop: 20,
        background: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.teal} 100%)`,
        borderRadius: 12,
        padding: "18px 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        color: "white",
        boxShadow: "0 2px 8px rgba(14,40,65,.15)",
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          {headline}
        </div>
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
          {body}
        </div>
      </div>
      <button
        onClick={onRequestQuote}
        style={{
          background: BRAND.green,
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "11px 20px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,.15)",
          transition: "transform .1s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      >
        {buttonLabel} →
      </button>
    </div>
  );
}
