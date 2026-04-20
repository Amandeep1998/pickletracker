import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/login">
            <BrandLogo size="lg" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm sm:text-base text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">1. About This Policy</h2>
            <p>
              PickleTracker ("we", "us", or "our") is a personal sports tracking application that helps pickleball
              players log tournaments, practice sessions, expenses, and performance data. This Privacy Policy explains
              what information we collect, how we use it, who we share it with, and your rights over your data.
              By creating an account or using PickleTracker, you agree to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">2. Information We Collect</h2>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.1 Account Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Full name and email address (provided directly or via Google Sign-In)</li>
              <li>Password (stored as a one-way hash; we never store your plain-text password)</li>
              <li>Profile photo (optional, stored as an encoded image within your account)</li>
              <li>City and state (optional, for profile display only)</li>
              <li>Playing skill rating (DUPR singles/doubles, optional)</li>
              <li>Year you started playing pickleball (optional)</li>
              <li>Preferred currency for displaying financial data</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.2 Tournament &amp; Sports Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tournament names, dates, and locations (including place name and geographic coordinates when selected via location search)</li>
              <li>Category details: event category, medal won, entry fee paid, and prize amount received</li>
              <li>Doubles/mixed partner names</li>
              <li>Post-tournament reflections: what went well, what needs improvement, and personal notes</li>
              <li>Manual achievements you choose to add to your profile</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.3 Session &amp; Training Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Session type (tournament match, casual play, or practice/drill)</li>
              <li>Session date, duration, location, and court fees paid</li>
              <li>Session rating, skills worked on, coaching status, and personal notes</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.4 Expense Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gear purchases: item name, cost, and date</li>
              <li>Travel expenses: departure and destination cities, transport costs, accommodation, food, equipment transport, visa fees, and travel insurance (for international trips)</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.5 Social &amp; Communication Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>WhatsApp phone number (optional, only if you choose to enable WhatsApp notifications)</li>
              <li>Friend connections you make within the app</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.6 Usage &amp; Technical Data</h3>
            <p>
              We use PostHog, a privacy-focused analytics service, to collect anonymised usage data such as
              which features are used, page views, and general interaction patterns. This helps us understand
              how the product is being used so we can improve it. PostHog does not receive your name, email,
              or financial figures. We also store authentication tokens (JWT) in your browser's local storage
              to keep you signed in between sessions.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create and maintain your PickleTracker account</li>
              <li>To display your tournament history, session journal, expense tracker, and performance analytics</li>
              <li>To calculate and show financial summaries (total earnings, entry fees, net profit, travel costs)</li>
              <li>To show your medal tally, skill trends, and progress over time</li>
              <li>To enable the social/friends feature so you can connect and compare stats with other players</li>
              <li>To send you optional WhatsApp notifications about upcoming tournaments (only if you explicitly opt in)</li>
              <li>To send password reset emails when requested</li>
              <li>To improve the application based on anonymised usage analytics</li>
              <li>To respond to support requests you send us</li>
            </ul>
            <p className="mt-3">
              We do not use your data for advertising, profiling for sale, or any purpose beyond operating
              and improving PickleTracker.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">4. Third-Party Services</h2>
            <p className="mb-3">
              PickleTracker uses the following third-party services to function. Each service processes only
              the minimum data necessary for its purpose:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Google Sign-In (OAuth 2.0)</span> — Used as an alternative to
                email/password login. We receive your name and email address from Google. We do not access
                your Google Drive, Gmail, Google Calendar, or any other Google service.
              </li>
              <li>
                <span className="font-medium">Google Places API</span> — Used to provide location autocomplete
                when you add a tournament or session venue. Location data is only saved if you select a
                suggestion; browsing suggestions are not stored.
              </li>
              <li>
                <span className="font-medium">PostHog</span> — Used for anonymised product analytics
                (feature usage, navigation patterns). No personally identifiable information is sent to PostHog.
              </li>
              <li>
                <span className="font-medium">WhatsApp Business API (via Twilio)</span> — Used only if you
                opt in to WhatsApp notifications. Your phone number is used solely to send you tournament
                reminders and will not be shared or used for marketing.
              </li>
              <li>
                <span className="font-medium">Render.com</span> — Our backend application is hosted on
                Render's servers. Your data is processed on their infrastructure under our control.
              </li>
              <li>
                <span className="font-medium">MongoDB Atlas</span> — Your data is stored in a MongoDB Atlas
                database. Data is encrypted at rest and in transit.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">5. Data Sharing</h2>
            <p>
              We do not sell, rent, or trade your personal data to any third party. We do not share your
              financial data, performance data, or personal details with advertisers or data brokers.
            </p>
            <p className="mt-2">
              Your data may be shared only in these limited circumstances:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>With the third-party service providers listed above, strictly to operate PickleTracker</li>
              <li>When required by law, regulation, or a valid legal order</li>
              <li>To protect the rights, safety, or property of PickleTracker or our users</li>
            </ul>
            <p className="mt-2">
              The social/friends feature allows other PickleTracker users you connect with to view your
              public profile (name, city, rating, medal tally). Detailed financial and session data is
              never shared with other users.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">6. Data Retention</h2>
            <p>
              Your data is retained for as long as your account is active. If you request account deletion,
              we permanently delete your account and all associated data — tournaments, sessions, expenses,
              friend connections, and profile information — within 30 days. Anonymised, aggregated analytics
              data that cannot identify you individually may be retained for longer.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><span className="font-medium">Access</span> — Request a copy of all personal data we hold about you</li>
              <li><span className="font-medium">Correction</span> — Update or correct inaccurate data through your profile settings</li>
              <li><span className="font-medium">Deletion</span> — Request permanent deletion of your account and all associated data</li>
              <li><span className="font-medium">Portability</span> — Request your data in a portable format</li>
              <li><span className="font-medium">Opt-out</span> — Disable WhatsApp notifications at any time from your profile settings</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:pickletracker.app@gmail.com" className="text-green-600 hover:underline">
                pickletracker.app@gmail.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">8. Data Security</h2>
            <p>
              We take reasonable technical and organisational measures to protect your data:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>All data is transmitted over HTTPS (TLS encryption)</li>
              <li>Passwords are hashed using industry-standard algorithms and are never stored in plain text</li>
              <li>Database data is encrypted at rest via MongoDB Atlas</li>
              <li>Authentication uses short-lived JWT tokens</li>
              <li>Password reset tokens expire after a limited time window</li>
            </ul>
            <p className="mt-2">
              No system is perfectly secure. If you suspect unauthorised access to your account,
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">9. Children's Privacy</h2>
            <p>
              PickleTracker is not intended for users under the age of 13. We do not knowingly collect
              personal information from children under 13. If you believe a child under 13 has provided
              us with personal information, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              "Last updated" date at the top of this page. For significant changes, we will notify you
              via email or an in-app notice. Continued use of PickleTracker after changes are posted
              constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">11. Contact Us</h2>
            <p>
              For any questions, concerns, or requests regarding this Privacy Policy or your personal data,
              please contact us at{' '}
              <a href="mailto:pickletracker.app@gmail.com" className="text-green-600 hover:underline">
                pickletracker.app@gmail.com
              </a>
              . We aim to respond to all privacy-related enquiries within 30 days.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
