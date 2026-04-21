/**
 * App — main Evolve Selector application (v2).
 *
 * v2 additions over v1:
 *   - QuotePrompt banner appears beneath results when ≥1 result found.
 *   - QuoteForm modal collects contact info + application description.
 *   - Submits to Web3Forms → delivered as email to sales@evolve-sensing.com.
 *   - QuoteSuccess confirmation with "Start new search" reset.
 *
 * Quote-flow state machine:
 *   "idle"        — no modal visible (default)
 *   "form"        — QuoteForm modal open, user filling in fields
 *   "success"     — QuoteSuccess modal open, submission complete
 *
 * Transitions:
 *   idle  → form        (user clicks "Request a quote" / "Request a consultation")
 *   form  → idle        (user clicks Cancel, presses Escape, or clicks backdrop)
 *   form  → success     (Web3Forms submission succeeds)
 *   success → idle      (user clicks "Close")
 *   success → idle + full reset (user clicks "Start new search")
 */
import { useState, useMemo, useCallback } from "react";
import { resolutionRecords, gratingOverrides, codeRanges } from "./data";
import { search, recordId, type EnrichedResult } from "./logic/selector";
import { BRAND } from "./brand";
import SearchForm from "./components/SearchForm";
import ResultCard from "./components/ResultCard";
import CompareTable from "./components/CompareTable";
import QuotePrompt from "./components/QuotePrompt";
import QuoteForm from "./components/QuoteForm";
import QuoteSuccess from "./components/QuoteSuccess";

/**
 * Web3Forms access key — injected at build time from the VITE_WEB3FORMS_KEY
 * environment variable. This key is PUBLIC-SAFE (see src/lib/web3forms.ts docs).
 *
 * If the env var is missing, the form will still render but submission will
 * fail with a clear error message directing the user to email sales directly.
 */
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY ?? "";

type QuoteFlowState =
  | { phase: "idle" }
  | { phase: "form" }
  | { phase: "success"; userName: string; selectedLabel: string };

export default function App() {
  // Search inputs (kept as strings so the user can type freely)
  const [wlMin, setWlMin] = useState("");
  const [wlMax, setWlMax] = useState("");
  const [maxRes, setMaxRes] = useState("");

  // Near-miss panel toggle
  const [showNearMisses, setShowNearMisses] = useState(true);

  // Comparison map: record uid → EnrichedResult
  const [compareMap, setCompareMap] = useState<
    Record<string, EnrichedResult>
  >({});

  // Quote flow state machine
  const [quoteFlow, setQuoteFlow] = useState<QuoteFlowState>({ phase: "idle" });

  const compareIds = useMemo(
    () => new Set(Object.keys(compareMap)),
    [compareMap],
  );
  const compareItems = useMemo(
    () => Object.values(compareMap),
    [compareMap],
  );

  const toggleCompare = useCallback(
    (id: string, result: EnrichedResult) => {
      setCompareMap((prev) => {
        const next = { ...prev };
        if (next[id]) {
          delete next[id];
        } else {
          next[id] = result;
        }
        return next;
      });
    },
    [],
  );

  // Run the search whenever inputs change
  const searchResult = useMemo(() => {
    const mn = Number(wlMin);
    const mx = Number(wlMax);
    const mr = Number(maxRes);
    if (isNaN(mn) || isNaN(mx) || isNaN(mr) || mn >= mx || mr <= 0) {
      return null;
    }
    return search(mn, mx, mr, resolutionRecords, gratingOverrides, codeRanges);
  }, [wlMin, wlMax, maxRes]);

  const bandwidth = Number(wlMax) - Number(wlMin);
  const maxResNum = Number(maxRes);

  // Show the quote prompt only when a search has been run and there is
  // at least one result of any kind to quote against.
  const hasAnyResults =
    searchResult !== null &&
    (searchResult.matches.length > 0 || searchResult.nearMisses.length > 0);
  const hasExactMatches = searchResult !== null && searchResult.matches.length > 0;

  // Reset everything — used by "Start new search" after a successful submission.
  const resetAll = useCallback(() => {
    setWlMin("");
    setWlMax("");
    setMaxRes("");
    setCompareMap({});
    setShowNearMisses(true);
    setQuoteFlow({ phase: "idle" });
  }, []);

  return (
    <div
      style={{
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        maxWidth: 900,
        margin: "0 auto",
        padding: "20px 16px",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: 8,
              height: 32,
              borderRadius: 4,
              background: `linear-gradient(180deg, ${BRAND.green}, ${BRAND.teal})`,
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: BRAND.navy,
              letterSpacing: -0.5,
            }}
          >
            Evolve Selector
          </h1>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "#64748b",
            marginLeft: 18,
          }}
        >
          Evolve Sensing — find the right optical bench, grating, and slit for
          your application
        </p>
      </div>

      {/* Search form */}
      <SearchForm
        wlMin={wlMin}
        wlMax={wlMax}
        maxRes={maxRes}
        onWlMinChange={setWlMin}
        onWlMaxChange={setWlMax}
        onMaxResChange={setMaxRes}
      />

      {/* Comparison table (shown when items are checked) */}
      {compareItems.length > 0 && (
        <CompareTable
          items={compareItems}
          maxRes={maxResNum}
          wlMin={Number(wlMin)}
          wlMax={Number(wlMax)}
          onClear={() => setCompareMap({})}
        />
      )}

      {/* Results */}
      {searchResult && (
        <div>
          {/* Exact matches */}
          {searchResult.matches.length > 0 ? (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: BRAND.navy,
                  marginBottom: 10,
                }}
              >
                {searchResult.matches.length} match
                {searchResult.matches.length !== 1 ? "es" : ""}{" "}
                <span style={{ fontWeight: 400, color: "#64748b" }}>
                  sorted by throughput
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {searchResult.matches.map((r, i) => {
                  const id = recordId(r);
                  return (
                    <ResultCard
                      key={id}
                      result={r}
                      maxRes={maxResNum}
                      wlMin={Number(wlMin)}
                      wlMax={Number(wlMax)}
                      rank={i + 1}
                      isNearMiss={false}
                      isCompared={compareIds.has(id)}
                      onToggleCompare={() => toggleCompare(id, r)}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            /* No exact matches banner */
            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: 10,
                padding: "14px 18px",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#92400e",
                  fontSize: 14,
                  marginBottom: 4,
                }}
              >
                No exact matches
              </div>
              <div style={{ fontSize: 13, color: "#a16207" }}>
                {bandwidth} nm bandwidth + ≤{maxRes} nm resolution exceeds what
                any single grating can achieve.
                {searchResult.nearMisses.length > 0 &&
                  " See nearest options below."}
              </div>
            </div>
          )}

          {/* Near misses */}
          {searchResult.nearMisses.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setShowNearMisses(!showNearMisses)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    transform: showNearMisses
                      ? "rotate(90deg)"
                      : "rotate(0)",
                    transition: ".2s",
                    display: "inline-block",
                  }}
                >
                  ▶
                </span>
                {searchResult.nearMisses.length} near miss
                {searchResult.nearMisses.length !== 1 ? "es" : ""}
                <span style={{ fontWeight: 400 }}>
                  — coverage OK, resolution short
                </span>
              </button>
              {showNearMisses && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {searchResult.nearMisses.slice(0, 8).map((r) => {
                    const id = recordId(r);
                    return (
                      <ResultCard
                        key={id}
                        result={r}
                        maxRes={maxResNum}
                        wlMin={Number(wlMin)}
                        wlMax={Number(wlMax)}
                        rank={null}
                        isNearMiss={true}
                        isCompared={compareIds.has(id)}
                        onToggleCompare={() => toggleCompare(id, r)}
                      />
                    );
                  })}
                  {searchResult.nearMisses.length > 8 && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        textAlign: "center",
                        padding: 8,
                      }}
                    >
                      +{searchResult.nearMisses.length - 8} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quote prompt — shown whenever there's at least one result of any kind */}
          {hasAnyResults && (
            <QuotePrompt
              hasExactMatches={hasExactMatches}
              onRequestQuote={() => setQuoteFlow({ phase: "form" })}
            />
          )}
        </div>
      )}

      {/* Empty state */}
      {!searchResult && wlMin === "" && (
        <div
          style={{
            textAlign: "center",
            padding: "36px 20px",
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔬</div>
          <div style={{ fontSize: 14 }}>
            Enter wavelength range and resolution to search
          </div>
          <div
            style={{
              fontSize: 12,
              marginTop: 8,
              maxWidth: 420,
              margin: "8px auto 0",
            }}
          >
            Finds all Evolve configurations fully covering your wavelength
            range. Recommends the largest slit meeting your resolution spec for
            maximum throughput. Check boxes to compare side-by-side.
          </div>
        </div>
      )}

      {/* Quote form modal */}
      {quoteFlow.phase === "form" && searchResult && (
        <QuoteForm
          web3formsKey={WEB3FORMS_KEY}
          matches={searchResult.matches}
          nearMisses={searchResult.nearMisses}
          wlMin={Number(wlMin)}
          wlMax={Number(wlMax)}
          maxRes={maxResNum}
          onClose={() => setQuoteFlow({ phase: "idle" })}
          onSubmitted={(selectedLabel, userName) =>
            setQuoteFlow({ phase: "success", userName, selectedLabel })
          }
        />
      )}

      {/* Quote success modal */}
      {quoteFlow.phase === "success" && (
        <QuoteSuccess
          userName={quoteFlow.userName}
          selectedLabel={quoteFlow.selectedLabel}
          onClose={() => setQuoteFlow({ phase: "idle" })}
          onStartNew={resetAll}
        />
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 28,
          padding: "10px 0",
          borderTop: "1px solid #e2e8f0",
          fontSize: 10,
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        Evolve Sensing — Proprietary and Confidential — Resolution data:
        simulation values for reference only
      </div>
    </div>
  );
}
