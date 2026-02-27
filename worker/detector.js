// worker/detector.js
// Structured change detection using Gemini.
// Returns a typed ChangeResult object (or null for no meaningful change).
// Replaces the old summarize.js one-liner approach.

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @typedef {Object} ChangeResult
 * @property {"price_change"|"tier_change"|"feature_change"|"copy_change"} type
 * @property {string} summary     - One sentence, max 30 words
 * @property {string} old_value   - What it was before (e.g. "$29/mo" or "5 seats")
 * @property {string} new_value   - What it is now
 * @property {string} plan        - Plan name if identifiable, else "Unknown"
 * @property {number} confidence_score - 0.0–1.0
 */

const SYSTEM_PROMPT = `You are a SaaS pricing change detector. Compare two pricing page snapshots.

DETECT ONLY:
- price_change: A numeric price value changed (e.g. $29 → $39)
- tier_change: A plan/tier was added or removed
- feature_change: A bullet-point feature was added, removed, or changed in a plan
- copy_change: Non-structural marketing text changed

IGNORE COMPLETELY:
- Whitespace or formatting differences
- Footer text or copyright years
- Navigation menu text
- Tracking pixel / analytics script references
- Timestamps, "last updated" dates
- Cookie banner text
- Any change with low certainty

If no meaningful pricing change, respond with exactly: NO_SIGNIFICANT_CHANGE

If there IS a meaningful change, respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "type": "price_change" | "tier_change" | "feature_change" | "copy_change",
  "summary": "one sentence max 30 words",
  "old_value": "what it was (be specific)",
  "new_value": "what it is now (be specific)",
  "plan": "plan name or Unknown",
  "confidence_score": 0.0 to 1.0
}

Rules:
- Prefer false negatives over false positives. When in doubt → NO_SIGNIFICANT_CHANGE
- confidence_score must reflect your certainty. Score < 0.6 means → treat as NO_SIGNIFICANT_CHANGE
- Never invent values. Only report what you can clearly see in the text.`;

/**
 * Detect structured pricing changes between two page text snapshots.
 * @param {string} oldText
 * @param {string} newText
 * @returns {Promise<ChangeResult|null>} null means no meaningful change
 */
async function detectChanges(oldText, newText) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1, // Low temp = more deterministic, less hallucination
      },
    });

    const prompt = `${SYSTEM_PROMPT}

OLD_VERSION:
${oldText}

NEW_VERSION:
${newText}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    if (!raw || raw === "NO_SIGNIFICANT_CHANGE") {
      return null;
    }

    // Parse structured JSON response
    let parsed;
    try {
      // Strip any accidental markdown code fences Gemini sometimes adds
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn(
        "[detector] Gemini returned non-JSON, treating as no change:",
        raw.slice(0, 100),
      );
      return null;
    }

    // Validate required fields
    const validTypes = [
      "price_change",
      "tier_change",
      "feature_change",
      "copy_change",
    ];
    if (!parsed.type || !validTypes.includes(parsed.type)) {
      console.warn("[detector] Invalid change type:", parsed.type);
      return null;
    }

    // Confidence gate: below 0.6 → treat as noise
    const confidence = parseFloat(parsed.confidence_score ?? 0);
    if (confidence < 0.6) {
      console.log(
        `[detector] Low confidence (${confidence}) — treating as no meaningful change`,
      );
      return null;
    }

    return {
      type: parsed.type,
      summary: parsed.summary || "Pricing change detected",
      old_value: parsed.old_value || "",
      new_value: parsed.new_value || "",
      plan: parsed.plan || "Unknown",
      confidence_score: confidence,
    };
  } catch (err) {
    console.error("[detector] Gemini API error:", err.message);
    return null;
  }
}

module.exports = { detectChanges };
