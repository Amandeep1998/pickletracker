import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-100 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-gray-400">
          &copy; {year} PickleTracker. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="/privacy-policy"
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-gray-300 text-xs">·</span>
          <Link
            to="/terms"
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
