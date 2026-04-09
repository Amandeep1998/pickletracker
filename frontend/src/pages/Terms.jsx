import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: April 2025</p>

        <div className="space-y-8 text-sm sm:text-base text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Acceptance of Terms</h2>
            <p>
              By using PickleTracker, you agree to use the platform for managing pickleball tournaments
              and related activities. If you do not agree to these terms, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">User Responsibilities</h2>
            <p>
              Users are responsible for the accuracy of the information they provide on PickleTracker,
              including tournament names, dates, categories, and financial data.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Limitation of Liability</h2>
            <p>
              We are not responsible for any losses, damages, or issues arising from the use of this
              platform. PickleTracker is provided as-is, and we make no guarantees regarding uptime,
              data accuracy, or fitness for any particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Service Modifications</h2>
            <p>
              We reserve the right to update, modify, or discontinue the service at any time without
              prior notice. We are not liable to you or any third party for any such changes.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Termination</h2>
            <p>
              Users can stop using the service at any time. You may also request deletion of your
              account and associated data by contacting us directly.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Contact</h2>
            <p>
              For any questions or concerns about these terms, please contact us at{' '}
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
