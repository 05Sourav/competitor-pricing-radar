const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PROMPT = `You detect meaningful SaaS pricing changes between two page snapshots.

REPORT ONLY: price changes, plan added/removed, billing interval changed, free trial added/removed, discounts, feature limit changes.
IGNORE: design changes, marketing copy, whitespace, reordered text.

If unsure → return NO_SIGNIFICANT_PRICING_CHANGE
Prefer false negatives over false positives.

Return EXACTLY one line:
- If meaningful change: one sentence max 25 words
- If no change: NO_SIGNIFICANT_PRICING_CHANGE`;

async function summarizeWithAI(oldText, newText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(
      `${PROMPT}\n\nOLD_VERSION:\n${oldText}\n\nNEW_VERSION:\n${newText}`,
    );

    const text = result.response.text().trim();

    if (!text || text === "NO_SIGNIFICANT_PRICING_CHANGE") return null;
    return text;
  } catch (err) {
    console.error("[summarize] Gemini API error:", err.message);
    return null;
  }
}

module.exports = { summarizeWithAI };
