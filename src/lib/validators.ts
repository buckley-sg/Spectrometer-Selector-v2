/**
 * validators.ts
 *
 * Pure validation functions for the quote request form.
 * Each returns { ok: true } on success or { ok: false, error: string } on failure,
 * which keeps the call sites trivial (`if (!result.ok) return result.error`).
 *
 * Design notes
 * ------------
 * - Name regex accepts Unicode letters/marks so non-English names work
 *   ("José María", "François", "O'Brien", "Anne-Marie", "Dr. Smith" all valid).
 * - Email regex is deliberately simplified RFC-5322 rather than the full spec.
 *   The full spec is hundreds of characters and catches almost nothing in practice;
 *   this shape ("has an @, has a dot after the @, no whitespace") catches 99%+
 *   of real mistakes. Final verification happens when Web3Forms attempts delivery.
 * - Application minimum length of 20 chars exists to filter "need quote" noise.
 *   20 chars is roughly "I need a UV-Vis spectrometer" — enough for sales to have
 *   a starting hook.
 * - All validators trim input first so whitespace-padded values don't pass/fail spuriously.
 */

/** Result of a single-field validation. Discriminated union for ergonomic type narrowing. */
export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validate a person's name.
 * Accepts: Unicode letters, combining marks, apostrophes, hyphens, periods, spaces.
 * Rejects: empty, <2 chars after trim, contains digits or special symbols.
 */
export function validateName(raw: string): ValidationResult {
  const name = raw.trim();
  if (name.length === 0) return { ok: false, error: "Name is required." };
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
  // \p{L} = letters (any script), \p{M} = combining marks (for accented chars)
  if (!/^[\p{L}\p{M}'\-\s.]+$/u.test(name)) {
    return { ok: false, error: "Name contains unexpected characters." };
  }
  return { ok: true };
}

/**
 * Validate an email address using simplified RFC-5322.
 * Requires: non-empty local part, @, non-empty domain with at least one dot,
 * non-empty TLD, no whitespace anywhere.
 */
export function validateEmail(raw: string): ValidationResult {
  const email = raw.trim();
  if (email.length === 0) return { ok: false, error: "Email is required." };
  if (email.length > 254) return { ok: false, error: "Email is too long." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  return { ok: true };
}

/**
 * Validate the application description.
 * Minimum 20 characters (prevents low-signal "need quote" submissions),
 * maximum 2000 characters (defensive against accidental paste of entire documents).
 */
export function validateApplication(raw: string): ValidationResult {
  const app = raw.trim();
  if (app.length === 0) return { ok: false, error: "Application description is required." };
  if (app.length < 20) {
    return {
      ok: false,
      error: `Please describe your application in a bit more detail (${app.length}/20 characters minimum).`,
    };
  }
  if (app.length > 2000) {
    return { ok: false, error: "Description is too long (max 2000 characters)." };
  }
  return { ok: true };
}

/** Convenience: check whether all three fields pass validation. Used to enable/disable the SEND button. */
export function allFieldsValid(name: string, email: string, application: string): boolean {
  return (
    validateName(name).ok &&
    validateEmail(email).ok &&
    validateApplication(application).ok
  );
}
