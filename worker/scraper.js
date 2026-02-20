// worker/scraper.js
// Fetches a pricing page URL and returns clean text (no HTML, scripts, styles)

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch a URL and extract readable pricing-related text.
 * Returns null if fetch fails.
 */
async function scrapePage(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        // Mimic a real browser to avoid bot blocks
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(response.data);

    // Remove noise: scripts, styles, nav, footer, cookie banners, etc.
    $(
      'script, style, noscript, nav, footer, header, iframe, [aria-hidden="true"], .cookie-banner, #cookie-banner, .nav, .navbar, .footer, .header'
    ).remove();

    // Focus on pricing-relevant containers if they exist
    const pricingSelectors = [
      '[class*="pricing"]',
      '[id*="pricing"]',
      '[class*="plan"]',
      '[id*="plan"]',
      '[class*="price"]',
      '[id*="price"]',
      'main',
      'article',
      'body',
    ];

    let text = '';
    for (const selector of pricingSelectors) {
      const el = $(selector).first();
      if (el.length) {
        text = el.text();
        break;
      }
    }

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Limit size to keep AI costs low (~8000 chars ≈ 2000 tokens)
    if (text.length > 8000) {
      text = text.substring(0, 8000) + '... [truncated]';
    }

    return text;
  } catch (err) {
    console.error(`[scraper] Failed to fetch ${url}:`, err.message);
    return null;
  }
}

module.exports = { scrapePage };
