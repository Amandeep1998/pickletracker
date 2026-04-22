import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import TournamentForm from '../components/TournamentForm';
import Modal from '../components/Modal';
import { formatCurrency, MEDAL_COLORS } from '../utils/format';
import useCurrency from '../hooks/useCurrency';
import { getMapUrl } from '../utils/mapUrl';
import { syncTournamentToCalendar, deleteTournamentFromCalendar, isCalendarConnected } from '../services/googleCalendar';
import { NavLink } from 'react-router-dom';
import PushPermissionPrompt from '../components/PushPermissionPrompt';
import { usePushNotifications } from '../hooks/usePushNotifications';
import PaddleLoader from '../components/PaddleLoader';

export default function Tournaments() {
  const currency = useCurrency();
  const [tournaments, setTournaments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add'); // 'add' | 'edit'
  const [selectedTournament, setSelectedTournament] = useState(null);

  const { permission: pushPermission, isSupported: pushSupported, requestAndSubscribe, silentSubscribe } = usePushNotifications();
  const [pushPrompt, setPushPrompt] = useState({ open: false, name: '' });

  const maybeTriggerPushPrompt = (tournamentName, categories) => {
    if (!pushSupported) return;
    const today = new Date().toISOString().slice(0, 10);
    const hasFuture = categories?.some((c) => c.date >= today);
    if (!hasFuture) return;
    if (pushPermission === 'granted') {
      silentSubscribe();
    } else if (pushPermission === 'default') {
      setPushPrompt({ open: true, name: tournamentName });
    }
  };

  const fetchTournaments = async () => {
    try {
      const res = await api.getTournaments();
      setTournaments(res.data.data);
    } catch {
      setApiError('Failed to load tournaments');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const openAddModal = () => {
    setMode('add');
    setSelectedTournament(null);
    setApiError('');
    setModalOpen(true);
  };

  const openEditModal = (tournament) => {
    setMode('edit');
    setSelectedTournament(tournament);
    setApiError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedTournament(null);
    setApiError('');
  };

  const handleAdd = async (data) => {
    setFormLoading(true);
    setApiError('');
    try {
      const res = await api.createTournament(data);
      const created = res.data.data;

      if (isCalendarConnected()) {
        try {
          const eventResults = await syncTournamentToCalendar(created);
          if (eventResults?.length) {
            const updatedCategories = created.categories.map((cat, i) => {
              const match = eventResults.find((r) => r.idx === i);
              return match ? { ...cat, calendarEventId: match.calendarEventId } : cat;
            });
            await api.updateTournament(created._id, { ...created, categories: updatedCategories });
          }
        } catch {
          // Calendar sync failure is silent
        }
      }

      if (data.travelExpense) {
        const linkedId = created?._id ? String(created._id) : '';
        if (!linkedId) {
          // Same defensive guard as Calendar.saveTravelExpense — never create
          // a travel expense that's missing the link back to its tournament.
          console.error('[handleAdd] Missing created._id — refusing to create unlinked travel expense', created);
        } else {
          try {
            const te = data.travelExpense;
            const firstDate = created.categories[0]?.date || new Date().toISOString().slice(0, 10);
            await api.createExpense({
              type: 'travel',
              title: `${created.name} – Travel`,
              amount: te.total,
              date: firstDate,
              tournamentId: linkedId,
              fromCity: te.fromCity,
              toCity: te.toCity,
              isInternational: te.isInternational,
              transport: te.transport,
              localCommute: te.localCommute,
              accommodation: te.accommodation,
              food: te.food,
              equipment: te.equipment,
              others: te.others,
              visaDocs: te.visaDocs,
              travelInsurance: te.travelInsurance,
            });
          } catch (err) {
            console.error('[handleAdd] Failed to create linked travel expense', err);
          }
        }
      }

      closeModal();
      fetchTournaments();
      maybeTriggerPushPrompt(data.name, data.categories);
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to add tournament';
      setApiError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setFormLoading(true);
    setApiError('');
    try {
      const dataWithCalendarIds = {
        ...data,
        categories: data.categories.map((cat, i) => ({
          ...cat,
          calendarEventId: selectedTournament.categories[i]?.calendarEventId || null,
        })),
      };

      const res = await api.updateTournament(selectedTournament._id, dataWithCalendarIds);
      const updated = res.data.data;

      if (isCalendarConnected()) {
        try {
          const eventResults = await syncTournamentToCalendar(updated);
          if (eventResults?.length) {
            const updatedCategories = updated.categories.map((cat, i) => {
              const match = eventResults.find((r) => r.idx === i);
              return match ? { ...cat, calendarEventId: match.calendarEventId } : cat;
            });
            await api.updateTournament(updated._id, { ...updated, categories: updatedCategories });
          }
        } catch {
          // Calendar sync failure is silent
        }
      }

      try {
        const linkedId = updated?._id ? String(updated._id) : '';
        const existingExpense = selectedTournament.travelExpense;
        const te = data.travelExpense;
        if (linkedId) {
          if (te) {
            const firstDate = updated.categories[0]?.date || new Date().toISOString().slice(0, 10);
            const payload = {
              type: 'travel',
              title: `${updated.name} – Travel`,
              amount: te.total,
              date: firstDate,
              tournamentId: linkedId,
              fromCity: te.fromCity,
              toCity: te.toCity,
              isInternational: te.isInternational,
              transport: te.transport,
              localCommute: te.localCommute,
              accommodation: te.accommodation,
              food: te.food,
              equipment: te.equipment,
              others: te.others,
              visaDocs: te.visaDocs,
              travelInsurance: te.travelInsurance,
            };
            if (existingExpense?._id) {
              await api.updateExpense(existingExpense._id, payload);
            } else {
              await api.createExpense(payload);
            }
          } else if (existingExpense?._id) {
            await api.deleteExpense(existingExpense._id);
          }
        }
      } catch (err) {
        console.error('[handleEdit] Failed to sync travel expense', err);
      }

      closeModal();
      fetchTournaments();
      maybeTriggerPushPrompt(data.name, data.categories);
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to update';
      setApiError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    try {
      for (const t of tournaments) {
        if (isCalendarConnected()) {
          await deleteTournamentFromCalendar(t).catch(() => {});
        }
        await api.deleteTournament(t._id);
      }
      setShowDeleteAllConfirm(false);
      fetchTournaments();
    } catch {
      setApiError('Failed to delete all tournaments');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      if (isCalendarConnected()) {
        const tournament = tournaments.find((t) => t._id === id);
        if (tournament) {
          await deleteTournamentFromCalendar(tournament).catch(() => {});
        }
      }
      await api.deleteTournament(id);
      setDeleteId(null);
      fetchTournaments();
    } catch {
      setApiError('Failed to delete tournament');
    } finally {
      setDeleteLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const fmtDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const [y, m, d] = dateStr.split('T')[0].split('-');
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  };
  const getLatestDate = (t) => {
    const dates = (t.categories || []).map((c) => c.date).filter(Boolean).sort();
    return dates.at(-1) || '';
  };
  const getEarliestDate = (t) => {
    const dates = (t.categories || []).map((c) => c.date).filter(Boolean).sort();
    return dates[0] || '';
  };
  const isUpcoming = (t) => getLatestDate(t) >= today;

  const upcomingTournaments = tournaments
    .filter((t) => isUpcoming(t))
    .sort((a, b) => getEarliestDate(a).localeCompare(getEarliestDate(b)));
  const pastTournaments = tournaments
    .filter((t) => !isUpcoming(t))
    .sort((a, b) => getLatestDate(b).localeCompare(getLatestDate(a)));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

      {/* Push permission prompt — shown after saving a future tournament */}
      {pushPrompt.open && (
        <PushPermissionPrompt
          tournamentName={pushPrompt.name}
          onAccept={async () => {
            setPushPrompt({ open: false, name: '' });
            await requestAndSubscribe();
          }}
          onDismiss={() => setPushPrompt({ open: false, name: '' })}
        />
      )}

      {/* Hero Banner */}
      <div className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 flex items-center justify-between overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative">
          <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-1">PickleTracker</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">Tournaments</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Manage and track all your events</p>
        </div>
        <div className="relative hidden sm:block select-none opacity-80 mr-2">
          <svg width="56" height="56" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <circle cx="40" cy="40" r="36" fill="#C8D636" />
            <circle cx="40" cy="40" r="36" fill="white" opacity="0.12" />
            {[[28,22],[40,18],[52,22],[20,32],[32,30],[44,30],[56,32],[24,42],[36,40],[44,40],[56,42],[28,52],[40,56],[52,52],[40,40]].map(([cx,cy],i)=>(
              <circle key={i} cx={cx} cy={cy} r="2.8" fill="#272702" opacity="0.3"/>
            ))}
          </svg>
        </div>
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {tournaments.length > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs sm:text-sm font-semibold px-4 py-2 min-h-[40px] rounded-lg transition-colors border border-red-500/30"
            >
              Delete All
            </button>
          )}
          <button
            onClick={openAddModal}
            className="hover:opacity-90 text-white text-xs sm:text-sm font-bold px-4 py-2 min-h-[40px] rounded tracking-wide transition-opacity shadow-lg shadow-black/30"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            + Add Tournament
          </button>
        </div>
      </div>

      {/* Calendar tip */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-sm text-blue-700">
        <svg className="w-4 h-4 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>
          You can also add tournaments directly from the{' '}
          <NavLink to="/calendar" className="font-semibold underline underline-offset-2 hover:text-blue-900 transition-colors">
            Calendar
          </NavLink>
          {' '}— tap the <span className="font-semibold">+</span> on any date.
        </p>
      </div>

      {apiError && !modalOpen && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {apiError}
        </div>
      )}

      {/* Tournament list */}
      {loadingList ? (
        <div className="py-12 sm:py-16"><PaddleLoader label="Loading tournaments..." /></div>
      ) : tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 sm:py-20 px-4">
          {/* Pickleball icon */}
          <div className="w-20 h-20 rounded-full bg-[#f4f8e8] border-2 border-[#d6e89a] flex items-center justify-center mb-5">
            <svg width="44" height="44" viewBox="0 0 80 80" fill="none" aria-hidden="true">
              <circle cx="40" cy="40" r="32" fill="#C8D636" opacity="0.25" />
              {[[28,22],[40,18],[52,22],[20,32],[32,30],[44,30],[56,32],[24,42],[36,40],[44,40],[56,42],[28,52],[40,56],[52,52]].map(([cx,cy],i)=>(
                <circle key={i} cx={cx} cy={cy} r="3" fill="#272702" opacity="0.35"/>
              ))}
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">No tournaments yet</h3>
          <p className="text-sm text-gray-400 text-center max-w-xs mb-6">
            Add your first tournament to start tracking your matches, entry fees, and prize money.
          </p>
          <button
            onClick={openAddModal}
            className="hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl text-sm tracking-wide transition-opacity shadow-md"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            + Add Your First Tournament
          </button>
          <p className="text-xs text-gray-400 mt-4">
            You can also add from the{' '}
            <NavLink to="/calendar" className="text-blue-500 font-medium hover:underline">Calendar tab</NavLink>
            {' '}— tap any date.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { label: 'Upcoming', list: upcomingTournaments, upcoming: true },
            { label: 'Past', list: pastTournaments, upcoming: false },
          ].map(({ label, list, upcoming }) =>
            list.length === 0 ? null : (
              <div key={label} className="space-y-3 sm:space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase tracking-widest ${upcoming ? 'text-green-700' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  <div className={`flex-1 h-px ${upcoming ? 'bg-green-100' : 'bg-gray-200'}`} />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${upcoming ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {list.length}
                  </span>
                </div>

                {list.map((t) => (
                  <div
                    key={t._id}
                    className={`bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5 border-l-4 ${upcoming ? 'border-l-green-500' : 'border-l-[#91BE4D]'}`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t.name}</h3>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${upcoming ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {upcoming ? 'Upcoming' : 'Past'}
                          </span>
                        </div>
                        {t.location?.name && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs text-gray-500 truncate">{t.location.name}</span>
                            {getMapUrl(t.location) && (
                              <a
                                href={getMapUrl(t.location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex-shrink-0"
                              >
                                Map
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {upcoming ? (
                          <p className="text-xs text-gray-400">Entry Fees</p>
                        ) : (
                          <p className="text-xs text-gray-400">Total Profit</p>
                        )}
                        {upcoming ? (
                          <p className="text-base sm:text-lg font-bold text-gray-700">
                            {formatCurrency(t.categories.reduce((s, c) => s + (c.entryFee || 0), 0), currency)}
                          </p>
                        ) : (
                          <p className={`text-base sm:text-lg font-bold ${t.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(t.totalProfit, currency)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-2 mb-3">
                      {t.categories.map((cat, idx) => {
                        const catIsUpcoming = cat.date && cat.date.slice(0, 10) >= today;
                        const catIsPast = !catIsUpcoming;
                        return (
                          <div key={idx} className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                            {/* Category header row */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <span className="font-medium text-gray-700 text-sm">{cat.categoryName}</span>
                              <span className="text-xs text-gray-400">{fmtDate(cat.date)}</span>
                              {catIsUpcoming && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Upcoming</span>
                              )}
                              {catIsPast && cat.medal && cat.medal !== 'None' && (
                                <span className={`w-fit text-[10px] font-semibold px-1.5 py-0.5 rounded ${MEDAL_COLORS[cat.medal]}`}>
                                  {cat.medal}
                                </span>
                              )}
                            </div>
                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-2 text-right">
                              <div>
                                <p className="text-xs text-gray-400">Entry Fee</p>
                                <p className="text-xs sm:text-sm font-medium text-red-600">{formatCurrency(cat.entryFee, currency)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Amount Won</p>
                                <p className="text-xs sm:text-sm font-medium text-green-600">
                                  {catIsPast ? formatCurrency(cat.prizeAmount, currency) : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Profit</p>
                                {catIsPast ? (
                                  <p className={`text-xs sm:text-sm font-semibold ${(cat.prizeAmount - cat.entryFee) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(cat.prizeAmount - cat.entryFee, currency)}
                                  </p>
                                ) : (
                                  <p className="text-xs sm:text-sm font-medium text-gray-400">—</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Travel expense breakdown */}
                    {t.travelExpense && (() => {
                      const te = t.travelExpense;
                      const rows = [
                        { label: 'Transport', value: te.transport },
                        { label: 'Local Commute', value: te.localCommute },
                        { label: 'Accommodation', value: te.accommodation },
                        { label: 'Food', value: te.food },
                        { label: 'Equipment & Baggage', value: te.equipment },
                        { label: 'Others', value: te.others },
                        { label: 'Visa & Docs', value: te.visaDocs },
                        { label: 'Travel Insurance', value: te.travelInsurance },
                      ].filter((r) => r.value > 0);
                      return (
                        <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 mb-3 text-sm">
                          <div className="flex items-center gap-1.5 mb-2">
                            <svg className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Travel Expenses</span>
                            {(te.fromCity || te.toCity) && (
                              <span className="text-xs text-sky-500 ml-auto">{[te.fromCity, te.toCity].filter(Boolean).join(' → ')}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {rows.map((r) => (
                              <div key={r.label} className="flex justify-between text-xs text-sky-800">
                                <span className="text-sky-600">{r.label}</span>
                                <span className="font-medium">{formatCurrency(r.value, currency)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-xs font-semibold text-sky-900 border-t border-sky-200 pt-1.5 mt-1.5">
                            <span>Travel Total</span>
                            <span>{formatCurrency(te.amount || te.total || 0, currency)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Financial summary */}
                    {(() => {
                      const earnings = t.totalEarnings || 0;
                      const entryFees = t.totalExpenses || 0;
                      const travelTotal = t.travelExpense?.amount || 0;
                      const netProfit = earnings - entryFees - travelTotal;
                      if (earnings === 0 && entryFees === 0 && travelTotal === 0) return null;
                      return (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3 text-xs">
                          <div className="flex justify-between text-gray-600 mb-1">
                            <span>Total Earnings</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(earnings, currency)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600 mb-1">
                            <span>Total Entry Fees</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(entryFees, currency)}</span>
                          </div>
                          {travelTotal > 0 && (
                            <div className="flex justify-between text-gray-600 mb-1">
                              <span>Travel Expenses</span>
                              <span className="font-semibold text-gray-900">{formatCurrency(travelTotal, currency)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-blue-200 pt-1.5 mt-1.5">
                            <span className="font-semibold text-gray-900">Net Profit</span>
                            <span className={`font-bold text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(netProfit, currency)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => openEditModal(t)}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium min-h-[40px] px-2 sm:px-3 py-1 rounded hover:bg-blue-50 transition"
                      >
                        Edit
                      </button>
                      {deleteId === t._id ? (
                        <span className="flex gap-2 items-center">
                          <button
                            onClick={() => handleDelete(t._id)}
                            disabled={deleteLoading}
                            className="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium min-h-[40px] px-2 sm:px-3 py-1 rounded hover:bg-red-50 transition disabled:opacity-60"
                          >
                            {deleteLoading ? 'Deleting…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            disabled={deleteLoading}
                            className="text-xs sm:text-sm text-gray-400 hover:text-gray-600 min-h-[40px] px-2 sm:px-3 py-1 rounded transition disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeleteId(t._id)}
                          className="text-xs sm:text-sm text-red-500 hover:text-red-700 font-medium min-h-[40px] px-2 sm:px-3 py-1 rounded hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      <Modal
        isOpen={showDeleteAllConfirm}
        onClose={() => !deleteAllLoading && setShowDeleteAllConfirm(false)}
        title="Delete All Tournaments"
      >
        <div className="py-2">
          <p className="text-sm text-gray-700 mb-1">
            This will permanently delete{' '}
            <span className="font-semibold text-red-600">all {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}</span>.
          </p>
          <p className="text-sm text-gray-500 mb-6">This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteAllConfirm(false)}
              disabled={deleteAllLoading}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={deleteAllLoading}
              className="text-sm bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
            >
              {deleteAllLoading ? 'Deleting...' : 'Delete All'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={mode === 'add' ? 'New Tournament' : 'Edit Tournament'}
      >
        {apiError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {apiError}
          </div>
        )}
        <TournamentForm
          initial={mode === 'edit' ? selectedTournament : undefined}
          onSubmit={mode === 'add' ? handleAdd : handleEdit}
          onCancel={closeModal}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}
