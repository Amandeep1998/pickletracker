import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { needsConsentDecision, setConsent } from '../utils/cookieConsent';
import { requiresCookieOptIn } from '../config/legal';

/**
 * Cookie/tracking consent banner. Shown once until the user decides. Required for
 * EU/UK (opt-in) and gives a clean decline path for CCPA/CPRA elsewhere.
 * On grant it reloads so main.jsx initializes PostHog/Sentry with consent in place.
 */
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(needsConsentDecision());
  }, []);

  if (!visible) return null;

  const decide = (granted) => {
    setConsent(granted);
    setVisible(false);
    // Trackers are wired at bootstrap; reload so a grant takes effect immediately.
    if (granted) window.location.reload();
  };

  const optIn = requiresCookieOptIn();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white shadow-lg p-4 sm:p-5">
        <p className="text-sm text-gray-700 leading-relaxed">
          We use cookies and similar technologies for analytics and to diagnose errors
          (PostHog, Sentry). {optIn
            ? 'We only load these if you accept.'
            : 'You can decline non-essential tracking at any time.'}{' '}
          See our{' '}
          <Link to="/privacy-policy" className="text-green-600 hover:underline">Privacy Policy</Link>.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={() => decide(false)}
            className="order-2 sm:order-1 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={() => decide(true)}
            className="order-1 sm:order-2 px-4 py-2 text-sm font-bold text-white rounded-lg"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
