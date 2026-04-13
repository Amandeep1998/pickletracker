import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TournamentForm from '../components/TournamentForm';
import Modal from '../components/Modal';
import * as api from '../services/api';

function completeOnboarding() {
  localStorage.removeItem('pt_first_time');
  localStorage.setItem('pt_onboarding_done', '1');
}

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [added, setAdded] = useState(null); // tournament name after success

  // If not a first-time user, send to dashboard (must be after all hooks)
  if (!localStorage.getItem('pt_first_time')) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleAdd = async (data) => {
    setFormLoading(true);
    setFormError('');
    try {
      const res = await api.createTournament(data);
      completeOnboarding();
      setAdded(res.data.data.name);
      setModalOpen(false);
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] ||
        err.response?.data?.message ||
        'Failed to add tournament';
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const skip = () => {
    completeOnboarding();
    navigate('/dashboard', { replace: true });
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  // ── Success screen ──
  if (added) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f9f0] via-white to-[#f0f7f4] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          {/* Trophy */}
          <div className="w-20 h-20 rounded-full bg-[#f4f8e8] border-2 border-[#d6e89a] flex items-center justify-center mx-auto mb-5">
            <svg className="w-9 h-9 text-[#91BE4D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#272702] mb-2">Tournament added!</h1>
          <div className="inline-block bg-[#f4f8e8] border border-[#d6e89a] text-[#4a6e10] text-sm font-semibold px-4 py-2 rounded-xl mb-3">
            {added}
          </div>
          <p className="text-sm text-gray-500 mb-8">
            Your first tournament is being tracked. Here's what you can do next:
          </p>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/calendar')}
              className="w-full flex items-center justify-between bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">View in Calendar</p>
                  <p className="text-xs text-gray-400">See your tournament on the schedule</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-between bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f4f8e8] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#91BE4D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">Go to Dashboard</p>
                  <p className="text-xs text-gray-400">Check your earnings and profit</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Welcome screen ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9f0] via-white to-[#f0f7f4] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#f4f8e8] border border-[#d6e89a] mb-5 mx-auto">
          <svg width="44" height="44" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <circle cx="40" cy="40" r="32" fill="#C8D636" opacity="0.25" />
            {[[28,22],[40,18],[52,22],[20,32],[32,30],[44,30],[56,32],[24,42],[36,40],[44,40],[56,42],[28,52],[40,56],[52,52]].map(([cx,cy],i)=>(
              <circle key={i} cx={cx} cy={cy} r="3" fill="#272702" opacity="0.35"/>
            ))}
          </svg>
        </div>

        <div className="flex items-baseline justify-center gap-0.5 mb-2">
          <span className="text-2xl font-bold text-[#91BE4D]">Pickle</span>
          <span className="text-2xl font-bold text-[#ec9937]">Tracker</span>
        </div>

        <h1 className="text-xl font-bold text-[#272702] mt-3 mb-2">
          Welcome, {firstName}!
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Let's add your first tournament to get started. It only takes a minute.
        </p>

        {/* Steps preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6 text-left space-y-3">
          {[
            { icon: '🏆', text: 'Add tournament name and location' },
            { icon: '📅', text: 'Set the date and category' },
            { icon: '💰', text: 'Enter entry fee and prize won' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-base">{step.icon}</span>
              <p className="text-sm text-gray-600">{step.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full bg-[#ec9937] hover:bg-[#d4831f] text-white font-bold py-3.5 rounded-xl text-sm tracking-wide transition-colors shadow-md shadow-orange-100 mb-3"
        >
          + Add My First Tournament
        </button>

        <button
          onClick={skip}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip for now, take me to the app
        </button>
      </div>

      {/* Tournament form modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setFormError(''); }}
        title="New Tournament"
      >
        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {formError}
          </div>
        )}
        <TournamentForm
          onSubmit={handleAdd}
          onCancel={() => { setModalOpen(false); setFormError(''); }}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}
