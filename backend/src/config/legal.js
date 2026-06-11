/**
 * Single source of truth for the currently-published legal document versions.
 * Bump these whenever Terms.jsx / PrivacyPolicy.jsx "Last updated" dates change so
 * the consent we record at signup names the exact version the user agreed to.
 *
 * Keep in sync with frontend/src/config/legal.js.
 */
module.exports = {
  TERMS_VERSION: '2026-04-25',
  PRIVACY_VERSION: '2026-04-25',
  // EU GDPR digital-consent age is 16 (member states may lower to 13–15). We apply 16 for
  // any EU region and 13 elsewhere — the stricter line keeps us safe across markets.
  MIN_AGE_EU: 16,
  MIN_AGE_DEFAULT: 13,
};
