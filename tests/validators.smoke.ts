/**
 * Smoke tests for validators.ts.
 *
 * Run: `npm run test:validators` (or `npx tsx tests/validators.smoke.ts`)
 *
 * This is a lightweight harness (not vitest/jest) so we don't pull new
 * dependencies into v2. Each test prints PASS or FAIL; the process exits
 * non-zero if any assertion fails.
 */
import {
  validateName,
  validateEmail,
  validateApplication,
  allFieldsValid,
} from "../src/lib/validators";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\n== validateName ==");
check("empty string rejected", !validateName("").ok);
check("whitespace-only rejected", !validateName("   ").ok);
check("single char rejected", !validateName("A").ok);
check("two chars accepted", validateName("Al").ok);
check('"Alice" accepted', validateName("Alice").ok);
check('"Dr. Smith" accepted', validateName("Dr. Smith").ok);
check('"Anne-Marie" accepted', validateName("Anne-Marie").ok);
check('"O\'Brien" accepted', validateName("O'Brien").ok);
check('"José María" accepted (Unicode)', validateName("José María").ok);
check('"François" accepted (Unicode)', validateName("François").ok);
check('"北京" accepted (CJK)', validateName("北京").ok);
check("digits rejected", !validateName("Alice123").ok);
check("script tag rejected", !validateName("<script>").ok);
check("@ rejected", !validateName("user@domain").ok);
check("leading whitespace trimmed, still valid", validateName("  Alice  ").ok);

console.log("\n== validateEmail ==");
check("empty rejected", !validateEmail("").ok);
check("no @ rejected", !validateEmail("foo").ok);
check("trailing @ rejected", !validateEmail("foo@").ok);
check("leading @ rejected", !validateEmail("@bar.com").ok);
check("no TLD rejected", !validateEmail("foo@bar").ok);
check("space in local rejected", !validateEmail("foo bar@x.com").ok);
check("space in domain rejected", !validateEmail("foo@x .com").ok);
check("simple accepted", validateEmail("steve@evolve-sensing.com").ok);
check("subdomain accepted", validateEmail("user@sub.domain.co.uk").ok);
check("plus tag accepted", validateEmail("user+tag@example.com").ok);
check("dots in local accepted", validateEmail("first.last@example.com").ok);
check("leading whitespace trimmed", validateEmail("  a@b.co  ").ok);
// 300-char email
const longLocal = "a".repeat(300);
check(
  "over-254-char email rejected",
  !validateEmail(`${longLocal}@example.com`).ok,
);

console.log("\n== validateApplication ==");
check("empty rejected", !validateApplication("").ok);
check("short rejected", !validateApplication("need quote").ok);
check(
  "exactly 19 chars rejected",
  !validateApplication("a".repeat(19)).ok,
);
check("exactly 20 chars accepted", validateApplication("a".repeat(20)).ok);
check(
  "real application accepted",
  validateApplication(
    "UV-Vis thin-film thickness monitoring in a semiconductor fab, 200-800 nm, need 0.5 nm resolution.",
  ).ok,
);
check("over 2000 chars rejected", !validateApplication("a".repeat(2001)).ok);
check("trim still applies", validateApplication(`   ${"a".repeat(20)}   `).ok);

console.log("\n== allFieldsValid ==");
check(
  "all valid → true",
  allFieldsValid(
    "Alice Chen",
    "alice@example.com",
    "Looking for UV-Vis spectrometer for thin-film monitoring.",
  ) === true,
);
check(
  "one field invalid → false (short app)",
  allFieldsValid("Alice Chen", "alice@example.com", "short") === false,
);
check(
  "one field invalid → false (bad email)",
  allFieldsValid(
    "Alice Chen",
    "not-an-email",
    "Looking for UV-Vis spectrometer for thin-film monitoring.",
  ) === false,
);
check(
  "all invalid → false",
  allFieldsValid("", "", "") === false,
);

console.log(`\n--- ${passed} passed, ${failed} failed ---\n`);
process.exit(failed === 0 ? 0 : 1);
