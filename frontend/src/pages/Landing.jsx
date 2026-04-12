import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex flex-col">

      {/* Navbar */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="PickleTracker" className="h-9 w-9 object-contain" />
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-green-600">Pickle</span>
              <span className="text-lg font-bold text-orange-500">Tracker</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            🏓 Built for pickleball players in India
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-5">
            Track your pickleball{' '}
            <span className="text-green-600">tournament finances</span>{' '}
            in one place
          </h1>

          <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            PickleTracker helps you log every tournament you play — entry fees, prize winnings,
            medals — and gives you a clear financial picture of your pickleball journey.
            Optionally sync your tournament schedule to Google Calendar so you never miss an event.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Start tracking for free
            </Link>
            <Link
              to="/login"
              className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Sign in to your account
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white border-y border-gray-100 py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-10">
              Everything you need to manage your tournament life
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: '🏆',
                  title: 'Tournament Tracker',
                  desc: 'Log every tournament with categories, entry fees, prize winnings, and medals. See your net profit per event at a glance.',
                },
                {
                  icon: '📊',
                  title: 'Financial Dashboard',
                  desc: 'Monthly earnings vs expenses charts, per-category profit trends, and year-end summaries to understand where your money goes.',
                },
                {
                  icon: '🗓️',
                  title: 'Google Calendar Sync',
                  desc: 'Optionally connect your Google Calendar to automatically add tournament dates. Your schedule stays in sync — no manual entry.',
                },
                {
                  icon: '📅',
                  title: 'Visual Calendar',
                  desc: 'A monthly calendar view showing all your upcoming and past tournaments. Add new events directly from a date cell.',
                },
                {
                  icon: '💸',
                  title: 'Expense Tracking',
                  desc: 'Track court booking fees and gear expenses separately from tournament entry fees for a complete financial picture.',
                },
                {
                  icon: '📍',
                  title: 'Location & Maps',
                  desc: 'Save tournament venues with Google Maps integration. One tap to get directions to any court.',
                },
              ].map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-xl flex items-center justify-center flex-shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Google Calendar explanation — important for OAuth verification */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-8 sm:px-10">
            <div className="flex items-start gap-4">
              <div className="text-2xl flex-shrink-0">🗓️</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  How we use Google Calendar
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  PickleTracker lets you optionally connect your Google Calendar account.
                  When connected, we create calendar events for your upcoming tournaments
                  so your schedule is always visible in Google Calendar alongside your other
                  commitments.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  We only request access to create, update, and delete events that
                  PickleTracker itself creates. We do not read your existing calendar
                  events, contacts, or any other Google data.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  You can disconnect Google Calendar at any time from the Calendar page.
                  Disconnecting removes access immediately and does not affect your
                  tournament data stored in PickleTracker.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-green-600 py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Ready to take control of your pickleball finances?
            </h2>
            <p className="text-green-100 text-sm mb-6">
              Free to use. No credit card required.
            </p>
            <Link
              to="/signup"
              className="inline-block bg-white text-green-700 font-bold px-8 py-3 rounded-xl text-sm hover:bg-green-50 transition-colors"
            >
              Create your free account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} PickleTracker. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-300 text-xs">·</span>
            <Link to="/terms" className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors">
              Terms of Service
            </Link>
            <span className="text-gray-300 text-xs">·</span>
            <a href="mailto:amandeepsaini336@gmail.com" className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
