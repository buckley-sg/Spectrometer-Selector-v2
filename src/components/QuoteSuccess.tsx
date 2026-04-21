/**
 * QuoteSuccess — confirmation modal shown after a successful quote submission.
 *
 * Displays a thank-you message with the user's name and the selected
 * spectrometer, plus two actions:
 *   - "Start new search" — resets the whole selector
 *   - "Close"            — dismisses the modal, leaving results on screen
 */
import { BRAND } from "../brand";

interface QuoteSuccessProps {
  userName: string;
  selectedLabel: string;
  onStartNew: () => void;
  onClose: () => void;
}

export default function QuoteSuccess({
  userName,
  selectedLabel,
  onStartNew,
  onClose,
}: QuoteSuccessProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-success-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(14,40,65,0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px 16px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 14,
          maxWidth: 500,
          width: "100%",
          padding: "28px 28px 24px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        {/* Checkmark icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#ecfdf5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            border: `2px solid ${BRAND.green}`,
          }}
        >
          <span
            style={{
              fontSize: 28,
              color: BRAND.green,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            ✓
          </span>
        </div>

        <h2
          id="quote-success-title"
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 20,
            fontWeight: 700,
            color: BRAND.navy,
          }}
        >
          Thanks, {userName}!
        </h2>

        <p
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 14,
            color: "#475569",
            lineHeight: 1.5,
          }}
        >
          Your quote request has been sent to our sales team. You can expect a
          reply within <strong>one business day</strong>.
        </p>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "10px 14px",
            margin: "16px 0",
            fontSize: 12,
            color: "#475569",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#94a3b8",
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            REQUESTED
          </div>
          {selectedLabel}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "white",
              color: "#64748b",
              border: "1.5px solid #cbd5e1",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            onClick={onStartNew}
            style={{
              background: BRAND.green,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Start new search
          </button>
        </div>
      </div>
    </div>
  );
}
