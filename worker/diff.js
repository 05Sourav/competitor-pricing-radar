// worker/diff.js
// Compares two text snapshots and returns meaningful changed lines

const Diff = require('diff');

/**
 * Compare old and new page text.
 * Returns an object with added/removed line arrays and a hasChanges flag.
 */
function compareSnapshots(oldText, newText) {
  // Split into lines for comparison
  const changes = Diff.diffLines(oldText, newText, {
    ignoreWhitespace: true,
  });

  const added = [];
  const removed = [];

  for (const part of changes) {
    const value = part.value.trim();
    if (!value || value.length < 3) continue; // skip trivial changes

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
 * Build a compact diff string for AI summarization.
 * Limits total length to control token usage.
 */
function buildDiffContext(oldText, newText, maxChars = 3000) {
  const { added, removed, hasChanges } = compareSnapshots(oldText, newText);

  if (!hasChanges) return null;

  let context = '';

  if (removed.length > 0) {
    context += 'REMOVED:\n' + removed.slice(0, 10).join('\n') + '\n\n';
  }
  if (added.length > 0) {
    context += 'ADDED:\n' + added.slice(0, 10).join('\n');
  }

  // Trim to maxChars to keep AI call cheap
  return context.substring(0, maxChars);
}

module.exports = { compareSnapshots, buildDiffContext };
