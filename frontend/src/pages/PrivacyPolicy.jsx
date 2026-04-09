import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/login" className="flex items-center gap-2">
            <img src="/logo.svg" alt="PickleTracker" className="h-8 w-8 object-contain" />
            <span className="font-bold text-green-600">Pickle</span>
            <span className="font-bold text-orange-500 -ml-1.5">Tracker</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: April 2025</p>

        <div className="space-y-8 text-sm sm:text-base text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Information We Collect</h2>
            <p>
              We collect basic user information such as your name and email address when you sign in using Google.
              This information is used solely to create and manage your PickleTracker account.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">How We Use Your Information</h2>
            <p>
              We use Google Calendar access to create and manage calendar events based on tournaments created by you.
              Your data is used only to provide the core functionality of PickleTracker — tracking your pickleball
              tournament schedule and finances.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Data Sharing</h2>
            <p>
              We do not sell, trade, or share your personal data with any third parties. Your information stays
              within PickleTracker and the Google services you explicitly connect.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Revoking Access</h2>
            <p>
              You can revoke PickleTracker's access to your Google account at any time by visiting your{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                Google account permissions
              </a>
              . Disconnecting will stop any future calendar sync but will not affect tournament data already saved
              in PickleTracker.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Contact</h2>
            <p>
              For any questions or concerns about this privacy policy, please contact us at{' '}
              <a
                href="mailto:amandeepsaini336@gmail.com"
                className="text-green-600 hover:underline"
              >
                amandeepsaini336@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
