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
        <p className="text-sm text-gray-500 mb-10">Last updated: 11 June 2026</p>

        <div className="space-y-8 text-sm sm:text-base text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">1. About This Policy</h2>
            <p>
              PickleTracker ("we", "us", or "our") is a pickleball sports tracking and community application. It helps
              players log tournaments, practice sessions, gear and travel expenses, and performance data; discover and
              connect with other players; view a shared activity feed with likes and comments; use the in-app calendar
              and reminders; and (for users who use coach-related features) track coaching income and related notes in
              Coach Hub. This Privacy Policy explains what information we collect, how we use it, who we share
              it with, and your rights over your data. By creating an account or using PickleTracker, you agree to the
              practices described in this policy.
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
              <li>Optional indication that you use coaching-related features, where the app asks for it</li>
              <li>Time zone and related preferences used for reminder emails and scheduled push notifications</li>
              <li>Whether you have opted into email reminders (tournament and activity-related messages we send by email)</li>
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

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.5 Social graph &amp; communication</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Friend connections, friend requests sent and received, and request status (pending, accepted, or declined)</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.6 Activity feed, likes, comments &amp; notifications</h3>
            <p className="mb-2">
              The Home feed shows recent tournament activity from the community, subject to visibility rules in the app
              (for example, optional filters such as activity from people in your city). When you interact with the feed we process:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Likes you give or receive on feed items tied to tournaments</li>
              <li>Comments you post or receive on those items (comment text and timestamps)</li>
              <li>In-app notifications about likes, comments, and similar activity, including read/unread state</li>
            </ul>
            <p className="mt-2">
              Tournament summaries shown in the feed are derived from data users have logged; your own entries may appear
              to others according to those visibility rules.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.7 Coaching income &amp; Coach Hub</h3>
            <p>
              If you use Coach Hub or coaching-income features, we store the entries you create — for example session type,
              dates, amounts earned or paid, participant counts, lump-sum or per-head revenue modes, expense lines you attach,
              coach or academy names where you enter them, and notes. This is used only to power those screens and summaries for you.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.8 AI coaching assistant</h3>
            <p>
              When you use the AI Coach, your messages in that chat are sent to our servers and, when the feature is
              configured, to the OpenAI API to generate replies. This is only for operating that feature.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.9 Browser push &amp; email reminders</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                If you enable browser (web push) notifications, your browser shares a push subscription (endpoint and keys)
                with our servers so we can deliver reminders — for example about upcoming tournaments, logging results, or
                activity on your posts. You can withdraw this at any time via your browser or in-app controls.
              </li>
              <li>
                If you keep email reminders on, we send transactional and reminder emails to your registered address (for
                example tournament-related reminders and password reset). Message content reflects data already in your account.
              </li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">2.10 Usage &amp; technical data</h3>
            <p>
              We use PostHog for product analytics (feature usage and page views). When you are signed in, we associate your
              analytics events with your account identifier and may set person properties such as your name and email in
              PostHog to understand how authenticated users use the app. Financial figures from your logs are not sent to
              PostHog as part of routine analytics configuration.
            </p>
            <p className="mt-2">
              We may use Sentry for error monitoring and, where enabled, session replay on the frontend to diagnose crashes;
              this can include URLs, device information, and on-screen context when an error occurs.
            </p>
            <p className="mt-2">
              We store authentication tokens (JWT) in your browser’s local storage to keep you signed in between sessions.
              The app may run as a Progressive Web App (PWA) with a service worker for offline shell caching and push handling.
            </p>
            <p className="mt-2">
              Authentication and core functionality storage is strictly necessary and always on. The non-essential
              analytics and error-monitoring tools above (PostHog, Sentry) are governed by your cookie/tracking choice:
              in the EEA and UK they load only after you accept in our consent banner; elsewhere you can decline them
              at any time from that banner. You can change your choice by clearing site data or using the banner controls.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create and maintain your PickleTracker account</li>
              <li>To display your tournament history, session journal, expense tracker, performance analytics, and Coach Hub when you use it</li>
              <li>To calculate and show financial summaries (total earnings, entry fees, net profit, travel costs, and coaching income entries you record)</li>
              <li>To show your medal tally, skill trends, and progress over time</li>
              <li>To power the activity feed, likes, comments, friend requests, and in-app notifications</li>
              <li>To deliver browser push notifications and email reminders you have opted into, using your time zone where relevant</li>
              <li>To enable the friends feature and player discovery so you can connect with other players</li>
              <li>To send password reset and other transactional emails when requested</li>
              <li>To run the AI Coach when you use it</li>
              <li>To improve the application based on usage analytics and error reports</li>
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
                <span className="font-medium">Sign in with Google (Firebase Authentication)</span> — We verify
                Google-issued sign-in tokens on our servers. We receive your name and email from Google for that account.
                We do not access your Google Drive, Gmail, or other Google services.
              </li>
              <li>
                <span className="font-medium">Google Places API</span> — Location suggestions when you add a
                tournament or session venue. We only save a location if you pick a suggestion.
              </li>
              <li>
                <span className="font-medium">PostHog</span> — Product analytics (page views and events). When you
                are logged in, events may be linked to your account id and profile fields you see in PostHog person
                properties.
              </li>
              <li>
                <span className="font-medium">Sentry</span> — Error reporting and (when enabled) session replay on
                the website to diagnose technical issues.
              </li>
              <li>
                <span className="font-medium">OpenAI</span> — Used when you use AI Coach; your chat messages are
                processed to generate replies.
              </li>
              <li>
                <span className="font-medium">Resend</span> — Delivers transactional email (including password reset
                and, when enabled, reminder emails).
              </li>
              <li>
                <span className="font-medium">Web Push infrastructure</span> — Push notifications are delivered
                through your browser and operating system vendors using the subscription stored on our servers.
              </li>
              <li>
                <span className="font-medium">Render.com</span> — Our backend application is hosted on
                Render&apos;s servers. Your data is processed on their infrastructure under our control.
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
              The friends and player-discovery features allow other PickleTracker users to view the profile
              information we expose in the app (for example name, city, ratings, and highlights you have chosen to show).
              Your detailed financial logs, private notes, and coaching income entries are not shown to other users except
              where you explicitly share content (such as comments or feed visibility rules described in the product).
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">6. Data Retention</h2>
            <p>
              Your data is retained for as long as your account is active. If you request account deletion,
              we permanently delete your account and all associated data — tournaments, sessions, expenses,
              coach hub entries, feed interactions tied to you, friend connections, notifications, push subscription
              records, and profile information — within 30 days. Anonymised, aggregated analytics
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
              <li><span className="font-medium">Portability</span> — Download a machine-readable copy of your data from the in-app export tool, or request one by email</li>
              <li><span className="font-medium">Opt-out</span> — Disable browser push or email reminders from your profile or device settings where applicable</li>
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
              PickleTracker is intended for users who meet the minimum age in their country. In the
              European Economic Area you must be at least 16 (or the lower age your member state sets for
              data-processing consent, not below 13). In the United Kingdom, United States, and elsewhere you
              must be at least 13. We do not knowingly collect personal information from anyone below the
              applicable minimum age. At sign-up we ask you to confirm you meet it; we do not collect a date of
              birth. If you believe someone under the applicable age has provided us with personal information,
              please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">10. Legal Bases for Processing (EEA / UK)</h2>
            <p>If you are in the European Economic Area or the United Kingdom, we process your personal data on these legal bases under the GDPR / UK GDPR:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><span className="font-medium">Contract (Art. 6(1)(b))</span> — to create and operate your account and provide the core tracking, calendar, feed, and Coach Hub features you use.</li>
              <li><span className="font-medium">Consent (Art. 6(1)(a))</span> — for optional features you switch on (browser push, email reminders, the AI Coach) and for non-essential analytics and session replay. You may withdraw consent at any time without affecting prior processing.</li>
              <li><span className="font-medium">Legitimate interests (Art. 6(1)(f))</span> — to keep the Service secure, prevent abuse, diagnose errors, and improve the product, balanced against your rights.</li>
              <li><span className="font-medium">Legal obligation (Art. 6(1)(c))</span> — where we must retain or disclose data to comply with the law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">11. International Data Transfers</h2>
            <p>
              We operate from India and use service providers (including Render.com and MongoDB Atlas) whose
              infrastructure may be located in the United States or other countries. When we transfer personal
              data out of the EEA or UK, we rely on appropriate safeguards such as the European Commission&apos;s
              Standard Contractual Clauses (and the UK Addendum) or an adequacy decision where one applies. By
              using PickleTracker you understand your data may be processed in countries other than your own.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">12. Cookies &amp; Tracking Technologies</h2>
            <p>
              We use a small amount of strictly necessary browser storage (such as your sign-in token) that is
              required for the Service to work and cannot be switched off. We also use optional analytics and
              error-monitoring technologies (PostHog and Sentry, including session replay) that are <span className="font-medium">not</span>{' '}
              loaded until you allow them via our consent banner in the EEA and UK, and which you can decline at any
              time elsewhere. We do not use cookies for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">13. Your California Privacy Rights (CCPA / CPRA)</h2>
            <p>
              If you are a California resident, the California Consumer Privacy Act (as amended by the CPRA) gives
              you the right to know what personal information we collect and how we use it, to request access to or
              deletion of your personal information, to correct inaccurate information, and not to be discriminated
              against for exercising these rights. The categories of personal information we collect and our purposes
              are described in Sections 2 and 3 above.
            </p>
            <p className="mt-2 font-medium">We do not sell or share your personal information.</p>
            <p className="mt-2">
              We do not sell your personal information for money, and we do not &quot;share&quot; it for cross-context
              behavioural advertising as those terms are defined under the CPRA. We therefore do not offer a
              &quot;Do Not Sell or Share My Personal Information&quot; sale opt-out, because there is no such activity to
              opt out of. To exercise your access, deletion, or correction rights, use the in-app data export and
              account-deletion controls or email us at{' '}
              <a href="mailto:pickletracker.app@gmail.com" className="text-green-600 hover:underline">
                pickletracker.app@gmail.com
              </a>
              . You may use an authorised agent to submit a request on your behalf; we will verify your identity
              before acting and respond within the timeframes the law requires.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">14. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              "Last updated" date at the top of this page. For significant changes, we will notify you
              via email or an in-app notice. Continued use of PickleTracker after changes are posted
              constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">15. Contact Us</h2>
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
