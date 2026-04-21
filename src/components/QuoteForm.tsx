/**
 * QuoteForm — modal dialog that collects the customer's contact info and
 * the spectrometer they want quoted, then submits to Web3Forms.
 *
 * Flow:
 *   - Modal opens with the top-ranked exact match (or first near miss)
 *     pre-selected.
 *   - User can change the selection via radio buttons.
 *   - User enters name, email, and application description.
 *   - SEND button stays disabled until all three fields pass validation.
 *   - On submit: POSTs to Web3Forms; shows loading state; on success hands
 *     off to QuoteSuccess via the `onSubmitted` callback; on failure shows
 *     an inline error banner and re-enables the form.
 *
 * Accessibility notes:
 *   - Focus trap is NOT implemented (out of scope for v2.0). Keyboard users
 *     can tab through fields normally but tab can escape the modal.
 *   - Escape key closes the modal (handled via onKeyDown on the overlay).
 *   - Form controls use native <input>/<textarea> with <label> associations.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "../brand";
import type { EnrichedResult } from "../logic/selector";
import { recordId } from "../logic/selector";
import {
  validateName,
  validateEmail,
  validateApplication,
  allFieldsValid,
} from "../lib/validators";
import { submitQuoteRequest } from "../lib/web3forms";
import {
  formatSpectrometerLabel,
  formatSearchSummary,
  formatResultsBlock,
} from "../lib/quoteFormatting";

interface QuoteFormProps {
  /** Web3Forms access key; passed in from App so it's easy to test / swap. */
  web3formsKey: string;
  /** Exact matches from the selector (may be empty). */
  matches: EnrichedResult[];
  /** Near-miss results from the selector (may be empty). */
  nearMisses: EnrichedResult[];
  /** Search parameters used to produce these results. */
  wlMin: number;
  wlMax: number;
  maxRes: number;
  /** Close the modal without submitting. */
  onClose: () => void;
  /** Called with the selected spectrometer label on successful submit. */
  onSubmitted: (selectedLabel: string, userName: string) => void;
}

export default function QuoteForm({
  web3formsKey,
  matches,
  nearMisses,
  wlMin,
  wlMax,
  maxRes,
  onClose,
  onSubmitted,
}: QuoteFormProps) {
  // Candidate list: exact matches first, then near misses. Capped so the radio
  // list doesn't become overwhelming — 8 near misses is plenty.
  const candidates = useMemo<EnrichedResult[]>(
    () => [...matches, ...nearMisses.slice(0, 8)],
    [matches, nearMisses],
  );

  // Pre-select the top-ranked match (or first near miss if no exact matches).
  // Guarded behind a useState initialiser so it only runs once per mount.
  const [selectedId, setSelectedId] = useState<string>(() =>
    candidates.length > 0 ? recordId(candidates[0]) : "",
  );

  // Edge case: if the user changes the search inputs while the modal is open,
  // the candidates list changes and the previously-selected ID may no longer
  // be present. Reconcile by snapping back to the first candidate in that case.
  useEffect(() => {
    if (candidates.length === 0) {
      setSelectedId("");
      return;
    }
    const stillPresent = candidates.some((c) => recordId(c) === selectedId);
    if (!stillPresent) {
      setSelectedId(recordId(candidates[0]));
    }
  }, [candidates, selectedId]);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [application, setApplication] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Blur-tracking so we don't show "required" errors before the user has
  // touched each field. Classic progressive-disclosure UX.
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    application: false,
  });

  // Ref to the overlay so Escape-to-close works without hijacking global events.
  const overlayRef = useRef<HTMLDivElement>(null);

  // Selected result object for the label & payload
  const selected = useMemo(
    () => candidates.find((c) => recordId(c) === selectedId),
    [candidates, selectedId],
  );

  // Live validation — used to gate the SEND button and show inline errors
  const nameValid = validateName(name);
  const emailValid = validateEmail(email);
  const appValid = validateApplication(application);
  const canSubmit =
    !submitting && allFieldsValid(name, email, application) && !!selected;

  async function handleSubmit() {
    if (!canSubmit || !selected) return;
    setSubmitting(true);
    setSubmitError(null);

    const selectedLabel = formatSpectrometerLabel(selected);
    const searchSummary = formatSearchSummary(wlMin, wlMax, maxRes);
    const resultsBlock = formatResultsBlock(
      matches,
      nearMisses,
      wlMin,
      wlMax,
      selectedId,
      recordId,
    );
    const matchType: "exact" | "near-miss" = matches.some(
      (m) => recordId(m) === selectedId,
    )
      ? "exact"
      : "near-miss";

    const outcome = await submitQuoteRequest(web3formsKey, {
      name: name.trim(),
      email: email.trim(),
      application: application.trim(),
      selectedSpectrometer: selectedLabel,
      searchSummary,
      resultsBlock,
      matchType,
    });

    if (outcome.ok) {
      onSubmitted(selectedLabel, name.trim());
    } else {
      setSubmitError(outcome.error);
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-form-title"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !submitting) onClose();
      }}
      onClick={(e) => {
        // Click on the dimmed backdrop closes the modal; clicks inside the
        // panel (which stops propagation) do not.
        if (e.target === overlayRef.current && !submitting) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(14,40,65,0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 16px",
        zIndex: 1000,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 14,
          maxWidth: 640,
          width: "100%",
          padding: "22px 26px 24px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={submitting}
          aria-label="Close quote form"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            fontSize: 22,
            color: "#94a3b8",
            cursor: submitting ? "not-allowed" : "pointer",
            padding: "4px 10px",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Header */}
        <h2
          id="quote-form-title"
          style={{
            margin: 0,
            marginBottom: 4,
            fontSize: 18,
            fontWeight: 700,
            color: BRAND.navy,
          }}
        >
          Request a quote
        </h2>
        <p style={{ margin: 0, marginBottom: 18, fontSize: 13, color: "#64748b" }}>
          We'll send this to our sales team at sales@evolve-sensing.com — expect
          a reply within one business day.
        </p>

        {/* Spectrometer selection */}
        <div style={{ marginBottom: 18 }}>
          <Label text="Which spectrometer would you like a quote on?" />
          <div
            style={{
              border: "1.5px solid #e2e8f0",
              borderRadius: 8,
              maxHeight: 180,
              overflowY: "auto",
              background: "#f8fafc",
            }}
          >
            {candidates.map((c, i) => {
              const id = recordId(c);
              const isChecked = id === selectedId;
              const isNearMiss = i >= matches.length;
              return (
                <label
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    borderBottom:
                      i < candidates.length - 1 ? "1px solid #e2e8f0" : "none",
                    cursor: "pointer",
                    background: isChecked ? "#ecfdf5" : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="selected-spectrometer"
                    checked={isChecked}
                    onChange={() => setSelectedId(id)}
                    disabled={submitting}
                    style={{ accentColor: BRAND.green, marginTop: 3 }}
                  />
                  <span style={{ fontSize: 13, lineHeight: 1.4, flex: 1 }}>
                    {isNearMiss && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: "#f59e0b",
                          color: "white",
                          marginRight: 6,
                          letterSpacing: 0.5,
                          verticalAlign: "middle",
                        }}
                      >
                        NEAR MISS
                      </span>
                    )}
                    {formatSpectrometerLabel(c)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <Label text="Your name" required />
          <Input
            type="text"
            value={name}
            onChange={(v) => setName(v)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="e.g. Dr. Alice Chen"
            disabled={submitting}
            autoComplete="name"
          />
          {touched.name && !nameValid.ok && (
            <FieldError msg={nameValid.error} />
          )}
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <Label text="Your email" required />
          <Input
            type="email"
            value={email}
            onChange={(v) => setEmail(v)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="alice@example.com"
            disabled={submitting}
            autoComplete="email"
          />
          {touched.email && !emailValid.ok && (
            <FieldError msg={emailValid.error} />
          )}
        </div>

        {/* Application */}
        <div style={{ marginBottom: 14 }}>
          <Label
            text="Describe your application"
            required
            hint="What will the spectrometer be measuring? What environment? Any timing or size constraints?"
          />
          <textarea
            value={application}
            onChange={(e) => setApplication(e.target.value)}
            onBlur={(e) => {
              e.target.style.borderColor = "#cbd5e1";
              setTouched((t) => ({ ...t, application: true }));
            }}
            placeholder="e.g. UV-Vis thin-film thickness monitoring in a semiconductor fab, 200–800 nm, need ≤0.5 nm resolution, 24/7 operation."
            disabled={submitting}
            rows={4}
            style={{
              width: "100%",
              padding: "9px 11px",
              border: "1.5px solid #cbd5e1",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "inherit",
              color: BRAND.navy,
              outline: "none",
              boxSizing: "border-box",
              background: "#f8fafc",
              resize: "vertical",
              minHeight: 88,
            }}
            onFocus={(e) => (e.target.style.borderColor = BRAND.green)}
          />
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {application.trim().length}/20 characters minimum
          </div>
          {touched.application && !appValid.ok && (
            <FieldError msg={appValid.error} />
          )}
        </div>

        {/* Submission error banner */}
        {submitError && (
          <div
            role="alert"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#991b1b",
              marginBottom: 14,
            }}
          >
            <strong>Could not send your request.</strong>
            <div style={{ marginTop: 3, fontWeight: 400 }}>{submitError}</div>
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 6,
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "white",
              color: "#64748b",
              border: "1.5px solid #cbd5e1",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              background: canSubmit ? BRAND.green : "#94a3b8",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "9px 22px",
              fontSize: 14,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              minWidth: 110,
            }}
          >
            {submitting ? "Sending..." : "SEND"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small label helper so every field has consistent styling. */
function Label({
  text,
  required,
  hint,
}: {
  text: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 5 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "#475569",
          letterSpacing: 0.3,
        }}
      >
        {text}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      {hint && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
}

/** Consistent text input with focus styling. */
function Input({
  type,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  autoComplete,
}: {
  type: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  disabled: boolean;
  autoComplete: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        e.target.style.borderColor = "#cbd5e1";
        onBlur();
      }}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete={autoComplete}
      style={{
        width: "100%",
        padding: "9px 11px",
        border: "1.5px solid #cbd5e1",
        borderRadius: 8,
        fontSize: 14,
        color: BRAND.navy,
        outline: "none",
        boxSizing: "border-box",
        background: "#f8fafc",
      }}
      onFocus={(e) => (e.target.style.borderColor = BRAND.green)}
    />
  );
}

/** Inline validation error message beneath a field. */
function FieldError({ msg }: { msg: string }) {
  return (
    <div style={{ color: "#dc2626", fontSize: 12, marginTop: 3 }}>{msg}</div>
  );
}
