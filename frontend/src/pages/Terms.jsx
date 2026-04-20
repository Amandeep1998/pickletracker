import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

export default function Terms() {
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm sm:text-base text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using PickleTracker ("the Service", "we", "us", or "our"), you agree to be
              bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms,
              please do not create an account or use the Service. These terms apply to all users, including
              those who sign in via Google and those who register with an email and password.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">2. Description of the Service</h2>
            <p>
              PickleTracker is a personal sports management application for pickleball players. The Service
              allows users to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Log and track tournament entries, results, medals, entry fees, and prize money</li>
              <li>Record practice sessions, casual play, and training drills</li>
              <li>Track gear purchases and travel expenses linked to tournaments</li>
              <li>View financial summaries including earnings, expenses, and net profit</li>
              <li>Monitor performance trends and skill development over time</li>
              <li>Connect with other players through a friends feature</li>
              <li>Optionally receive tournament reminders via WhatsApp</li>
            </ul>
            <p className="mt-3">
              PickleTracker is a personal tracking tool. It is not a tournament registration platform,
              financial advisory service, or official record-keeping system.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">3. Account Registration &amp; Security</h2>
            <p>
              You must provide accurate and complete information when creating your account. You are
              responsible for maintaining the confidentiality of your password and for all activity that
              occurs under your account.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>You must be at least 13 years old to use PickleTracker</li>
              <li>You may only create one account per person</li>
              <li>You must notify us immediately if you suspect unauthorised access to your account</li>
              <li>We are not liable for losses resulting from unauthorised use of your account</li>
              <li>
                If you sign in with Google, your continued access depends on your Google account remaining
                active and your permissions with Google
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">4. User Content &amp; Accuracy</h2>
            <p>
              You retain ownership of all data you enter into PickleTracker — tournament records, session
              notes, expense figures, and personal reflections. By entering data, you grant us a limited
              licence to store and process it solely to provide the Service to you.
            </p>
            <p className="mt-2">
              You are solely responsible for the accuracy of the information you enter. PickleTracker does
              not verify tournament results, entry fees, prize amounts, or any other data you record.
              Financial summaries displayed in the app are derived entirely from the figures you input and
              should not be used as official financial records, tax documentation, or evidence of earnings.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
              <li>Attempt to gain unauthorised access to other users' accounts or data</li>
              <li>Upload malicious code, scripts, or content that could harm the Service or other users</li>
              <li>Misrepresent your identity or impersonate another person</li>
              <li>Scrape, crawl, or systematically extract data from the Service without permission</li>
              <li>Use automated tools to access the Service in a way that places unreasonable load on our servers</li>
              <li>Use the friends feature to harass, spam, or send unsolicited communications to other users</li>
            </ul>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate these acceptable use
              requirements, without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">6. WhatsApp Notifications</h2>
            <p>
              WhatsApp notifications are entirely optional. By enabling WhatsApp notifications in your
              profile settings, you consent to receiving messages from PickleTracker via WhatsApp. You can
              opt out at any time by disabling this feature in your profile settings or by sending STOP
              in a message to our WhatsApp number. We will not use your WhatsApp number for any purpose
              other than sending you the notifications you have opted in to receive.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">7. No Financial Advice</h2>
            <p>
              PickleTracker displays financial summaries based on data you enter. This information is
              provided purely for personal tracking and informational purposes. Nothing in the Service
              constitutes financial, tax, legal, or investment advice. You should consult a qualified
              professional for any financial or legal decisions.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">8. Intellectual Property</h2>
            <p>
              All content, design, code, branding, and materials that form PickleTracker (excluding
              user-entered data) are owned by or licensed to us. You may not copy, reproduce, distribute,
              or create derivative works from any part of the Service without our written permission.
              "PickleTracker" and its logo are our proprietary marks.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">9. Disclaimers</h2>
            <p>
              PickleTracker is provided "as is" and "as available" without warranties of any kind, either
              express or implied. We do not warrant that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The Service will be uninterrupted, error-free, or available at all times</li>
              <li>Data stored in the Service will never be lost or corrupted</li>
              <li>The financial figures or analytics displayed will be accurate or fit for any particular purpose</li>
              <li>The Service will meet your specific requirements</li>
            </ul>
            <p className="mt-2">
              We strongly recommend keeping your own backup of important data.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, PickleTracker and its operators shall not
              be liable for any indirect, incidental, special, consequential, or punitive damages, including
              but not limited to loss of data, loss of profits, or loss of goodwill, arising from your use
              of or inability to use the Service. Our total liability to you for any claim arising from
              these Terms or the Service shall not exceed the amount you paid us (if any) in the 12 months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless PickleTracker and its operators from any claims,
              damages, losses, or expenses (including reasonable legal fees) arising from your use of the
              Service, your violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">12. Termination</h2>
            <p>
              You may stop using the Service at any time. You may also request deletion of your account and
              all associated data by contacting us at{' '}
              <a href="mailto:pickletracker.app@gmail.com" className="text-green-600 hover:underline">
                pickletracker.app@gmail.com
              </a>
              . We will process deletion requests within 30 days.
            </p>
            <p className="mt-2">
              We may suspend or terminate your access to the Service at any time, with or without notice,
              if we reasonably believe you have violated these Terms or if we discontinue the Service.
              Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">13. Service Modifications</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
              We will make reasonable efforts to provide advance notice of significant changes. We are not
              liable for any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">14. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of India. Any disputes
              arising under or in connection with these Terms shall be subject to the exclusive jurisdiction
              of the courts located in India. If any provision of these Terms is found to be unenforceable,
              the remaining provisions will continue in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">15. Changes to These Terms</h2>
            <p>
              We may update these Terms of Service from time to time. When we do, we will update the
              "Last updated" date at the top of this page. For material changes, we will notify you via
              email or an in-app notice before the changes take effect. Your continued use of PickleTracker
              after updated Terms are posted constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">16. Contact Us</h2>
            <p>
              For any questions or concerns about these Terms of Service, please contact us at{' '}
              <a href="mailto:pickletracker.app@gmail.com" className="text-green-600 hover:underline">
                pickletracker.app@gmail.com
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
