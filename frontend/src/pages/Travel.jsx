import React, { useEffect, useState, useMemo } from 'react';
import * as api from '../services/api';
import Modal from '../components/Modal';
import TravelExpenseForm from '../components/TravelExpenseForm';
import { formatCurrency } from '../utils/format';
import useCurrency from '../hooks/useCurrency';

const TRAVEL_BUCKETS = [
  { key: 'transport',       label: 'Transport' },
  { key: 'localCommute',    label: 'Local Commute' },
  { key: 'accommodation',   label: 'Accommodation' },
  { key: 'food',            label: 'Food' },
  { key: 'equipment',       label: 'Equipment & Baggage' },
  { key: 'others',          label: 'Others' },
  { key: 'visaDocs',        label: 'Visa & Docs' },
  { key: 'travelInsurance', label: 'Insurance' },
];

export default function Travel() {
  const currency = useCurrency();
  const [trips, setTrips] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchTrips = async () => {
    try {
      const res = await api.getExpenses();
      setTrips(res.data.data.filter((e) => e.type === 'travel'));
    } catch {
      setApiError('Failed to load trips');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    Promise.all([api.getExpenses(), api.getTournaments()])
      .then(([eRes, tRes]) => {
        setTrips(eRes.data.data.filter((e) => e.type === 'travel'));
        setTournaments(tRes.data.data);
      })
      .catch(() => setApiError('Failed to load data'))
      .finally(() => setLoadingList(false));
  }, []);

  const total = useMemo(() => trips.reduce((s, e) => s + e.amount, 0), [trips]);

  const tournamentMap = useMemo(() => {
    const map = {};
    tournaments.forEach((t) => { map[t._id] = t.name; });
    return map;
  }, [tournaments]);

  // Lookup by exact tournament name -> _id, used to self-heal trips that were
  // logged from the tournament form before `tournamentId` was being saved.
  // Those trips are titled "<Tournament Name> – Travel" by the Calendar /
  // Tournaments page; we infer the link so the user sees the badge AND so the
  // Edit modal preselects the tournament in the dropdown (saving the trip
  // then writes the id back into the DB and the link becomes permanent).
  const tournamentNameMap = useMemo(() => {
    const map = {};
    tournaments.forEach((t) => { if (t.name) map[t.name] = t._id; });
    return map;
  }, [tournaments]);

  const inferTournamentId = (trip) => {
    if (!trip) return '';
    if (trip.tournamentId) return String(trip.tournamentId);
    const title = trip.title || '';
    // Title pattern produced by Calendar / Tournaments save: "<Name> – Travel"
    // (the dash is an em-dash U+2013). Match only that exact suffix to avoid
    // accidentally linking unrelated trips.
    const match = title.match(/^(.+?)\s+–\s+Travel$/);
    if (!match) return '';
    return tournamentNameMap[match[1].trim()] || '';
  };

  const openAdd  = () => { setMode('add');  setSelectedTrip(null); setApiError(''); setModalOpen(true); };
  const openEdit = (e) => {
    // Pre-fill the dropdown with the inferred tournament if the trip is
    // missing `tournamentId`. The user just has to hit Save to persist the
    // link into the DB, no manual hunting through the dropdown.
    const inferredId = inferTournamentId(e);
    const tripWithLink = e.tournamentId ? e : { ...e, tournamentId: inferredId };
    setMode('edit'); setSelectedTrip(tripWithLink); setApiError(''); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setSelectedTrip(null); setApiError(''); };

  const handleAdd = async (data) => {
    setFormLoading(true);
    setApiError('');
    try {
      await api.createExpense(data);
      closeModal();
      fetchTrips();
    } catch (err) {
      setApiError(err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to log trip');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setFormLoading(true);
    setApiError('');
    try {
      await api.updateExpense(selectedTrip._id, data);
      closeModal();
      fetchTrips();
    } catch (err) {
      setApiError(err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to update trip');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await api.deleteExpense(id);
      setDeleteId(null);
      fetchTrips();
    } catch {
      setApiError('Failed to delete trip');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

      {/* Hero Banner */}
      <div
        className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 flex items-center justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0f2f2f 0%, #0d5e5e 50%, #0a7c7c 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #14b8a6 0%, transparent 60%)' }} />
        <div className="relative">
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-1">PickleTracker</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">Travel Expenses</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Track what tournaments truly cost you</p>
        </div>
        <button
          onClick={openAdd}
          className="relative flex-shrink-0 hover:opacity-90 text-white font-bold px-4 py-2.5 rounded-xl text-sm tracking-wide transition-opacity shadow-lg"
          style={{ background: 'linear-gradient(to right, #0d9488, #14b8a6)' }}
        >
          + Log Trip
        </button>
      </div>

      {apiError && !modalOpen && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{apiError}</div>
      )}

      {/* Total travel spend card */}
      {trips.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total travel spend</p>
              <p className="text-xl font-black text-teal-600">{formatCurrency(total, currency)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{trips.length} trip{trips.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Trips list */}
      {loadingList ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">✈️</div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">No trips logged yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-6">
            Log your travel costs to see what tournaments truly cost — transport, hotel, food, and more.
          </p>
          <button
            onClick={openAdd}
            className="hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl text-sm tracking-wide transition-opacity shadow-md"
            style={{ background: 'linear-gradient(to right, #0d9488, #14b8a6)' }}
          >
            Log your first trip
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {trips.map((e) => {
            const isExpanded = expandedId === e._id;
            const bucketBreakdown = TRAVEL_BUCKETS.filter((b) => (e[b.key] || 0) > 0);
            // Show the tournament name even if `e.tournamentId` is missing on
            // the doc — old trips logged before the tournament form started
            // saving the link still match by title here.
            const inferredId = inferTournamentId(e);
            const linkedTournament = inferredId ? tournamentMap[inferredId] : null;
            // Distinguishes "we know the link from the DB" vs "we figured it
            // out from the title and will persist it on next Edit + Save".
            const linkIsInferred = !e.tournamentId && !!inferredId;

            return (
              <div
                key={e._id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-teal-400 overflow-hidden"
              >
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">{e.title}</p>
                      {e.isInternational && (
                        <span className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded-full border border-teal-200 font-medium flex-shrink-0">Intl</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-400">
                        {new Date(e.date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {e.fromCity && e.toCity && (
                        <p className="text-xs text-gray-500 font-medium">{e.fromCity} → {e.toCity}</p>
                      )}
                      {linkedTournament && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 max-w-[200px] ${
                            linkIsInferred
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}
                          title={linkIsInferred
                            ? 'Auto-linked from trip title — open Edit and tap Save to persist the link'
                            : `Linked to tournament: ${linkedTournament}`}
                        >
                          🏆
                          <span className="truncate">{linkedTournament}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <p className="text-sm font-bold text-teal-600 mr-1">{formatCurrency(e.amount, currency)}</p>
                    {bucketBreakdown.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : e._id)}
                        className="text-xs text-gray-400 hover:text-gray-600 min-h-[36px] px-2 rounded hover:bg-gray-50 transition"
                        title={isExpanded ? 'Hide breakdown' : 'Show breakdown'}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    )}
                    <button onClick={() => openEdit(e)} className="text-xs text-blue-600 hover:text-blue-800 font-medium min-h-[36px] px-2 rounded hover:bg-blue-50 transition">Edit</button>
                    {deleteId === e._id ? (
                      <>
                        <button onClick={() => handleDelete(e._id)} disabled={deleteLoading} className="text-xs text-red-600 hover:text-red-800 font-medium min-h-[36px] px-2 rounded hover:bg-red-50 transition disabled:opacity-60">
                          {deleteLoading ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button onClick={() => setDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600 min-h-[36px] px-2 rounded transition">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setDeleteId(e._id)} className="text-xs text-red-500 hover:text-red-700 font-medium min-h-[36px] px-2 rounded hover:bg-red-50 transition">Delete</button>
                    )}
                  </div>
                </div>

                {/* Expandable cost breakdown */}
                {isExpanded && bucketBreakdown.length > 0 && (
                  <div className="border-t border-gray-50 px-4 pb-3 pt-2 bg-teal-50/30">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                      {bucketBreakdown.map((b) => (
                        <div key={b.key} className="flex justify-between text-xs">
                          <span className="text-gray-500">{b.label}</span>
                          <span className="font-semibold text-teal-700">{formatCurrency(e[b.key], currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={mode === 'add' ? 'Log Trip' : 'Edit Trip'}>
        {apiError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{apiError}</div>
        )}
        <TravelExpenseForm
          initial={mode === 'edit' ? selectedTrip : undefined}
          onSubmit={mode === 'add' ? handleAdd : handleEdit}
          onCancel={closeModal}
          loading={formLoading}
          tournaments={tournaments}
        />
      </Modal>
    </div>
  );
}
