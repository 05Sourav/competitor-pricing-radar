// worker/diff.js
// Compares two page text snapshots.
// Strips noise (footers, timestamps, tracking tokens) before diffing.
// Returns structured diff for the detector/AI to consume.

const Diff = require("diff");

// ---- Noise Patterns to Strip ----
// Lines matching these patterns are stripped before comparison.
const NOISE_PATTERNS = [
  // Tracking / analytics tokens
  /utm_source|utm_medium|utm_campaign|ga\(|gtag\(|fbq\(|_gaq|analytics\.js/i,
  // Pure timestamp / date lines (e.g. "Last updated: March 2025")
  /last\s+updated|©\s*\d{4}|copyright\s+\d{4}|\d{4}\s+all\s+rights/i,
  // Cookie/GDPR banners
  /cookie|gdpr|we\s+use\s+cookies|accept\s+all/i,
  // Generic footer phrases
  /privacy\s+policy|terms\s+of\s+service|terms\s+&\s+conditions|contact\s+us|sitemap/i,
  // Social share buttons / follow us
  /follow\s+us|share\s+on|tweet\s+this/i,
];

/**
 * Returns true if a line is noise that should be ignored during diff.
 * @param {string} line
 */
function isNoiseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return true; // blank / trivially short
  return NOISE_PATTERNS.some((re) => re.test(trimmed));
}

/**
 * Pre-process text: remove noise lines before diffing.
 * @param {string} text
 * @returns {string}
 */
function stripNoise(text) {
  return text
    .split("\n")
    .filter((line) => !isNoiseLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // collapse triple+ blank lines
    .trim();
}

/**
 * Compare old and new page text.
 * Returns an object with added/removed line arrays and a hasChanges flag.
 * Noise is stripped before comparison.
 * @param {string} oldText
 * @param {string} newText
 */
function compareSnapshots(oldText, newText) {
  const cleanOld = stripNoise(oldText);
  const cleanNew = stripNoise(newText);

  const changes = Diff.diffLines(cleanOld, cleanNew, {
    ignoreWhitespace: true,
  });

  const added = [];
  const removed = [];

  for (const part of changes) {
    const value = part.value.trim();
    if (!value || value.length < 3) continue;

    if (part.added) {
      added.push(value);
    } else if (part.removed) {
      removed.push(value);
    }
  }

  const hasChanges = added.length > 0 || removed.length > 0;
  return { added, removed, hasChanges };
}

/**
 * Build a compact diff string for Gemini context.
 * Limits total length to control token usage.
 * @param {string} oldText
 * @param {string} newText
 * @param {number} maxChars
 */
function buildDiffContext(oldText, newText, maxChars = 3000) {
  const { added, removed, hasChanges } = compareSnapshots(oldText, newText);
  if (!hasChanges) return null;

  let context = "";
  if (removed.length > 0) {
    context += "REMOVED:\n" + removed.slice(0, 10).join("\n") + "\n\n";
  }
  if (added.length > 0) {
    context += "ADDED:\n" + added.slice(0, 10).join("\n");
  }

  return context.substring(0, maxChars);
}

/**
 * Build a structured diff with pricing hint extraction.
 * Pricing hints are lines that contain "$" or price-like patterns —
 * surfaced first in diffs to give Gemini the most relevant signal.
 *
 * @param {string} oldText
 * @param {string} newText
 * @returns {{ added: string[], removed: string[], pricingHints: string[], hasChanges: boolean }}
 */
function buildStructuredDiff(oldText, newText) {
  const { added, removed, hasChanges } = compareSnapshots(oldText, newText);

  // Extract pricing-hint lines (lines with currency or plan-like text)
  const PRICE_RE =
    /\$\s*\d+|€\s*\d+|£\s*\d+|\d+\s*\/\s*(mo|month|yr|year|user|seat)/i;
  const PLAN_RE =
    /\b(starter|basic|pro|professional|business|enterprise|team|free|plus|premium)\b/i;

  const pricingHints = [...removed, ...added].filter(
    (line) => PRICE_RE.test(line) || PLAN_RE.test(line),
  );

  return { added, removed, pricingHints, hasChanges };
}

/**
 * Build a short, human-readable diff snippet for the alert email.
 * Max 5 removed + 5 added lines, no raw HTML.
 * @param {string} oldText
 * @param {string} newText
 * @returns {string}
 */
function buildEmailDiffSnippet(oldText, newText) {
  const { added, removed } = compareSnapshots(oldText, newText);

  const lines = [];

  removed.slice(0, 5).forEach((l) => {
    lines.push(`- ${l.split("\n")[0].trim().substring(0, 120)}`);
  });
  added.slice(0, 5).forEach((l) => {
    lines.push(`+ ${l.split("\n")[0].trim().substring(0, 120)}`);
  });

  return lines.join("\n") || "(no diff snippet available)";
}

module.exports = {
  compareSnapshots,
  buildDiffContext,
  buildStructuredDiff,
  buildEmailDiffSnippet,
};
