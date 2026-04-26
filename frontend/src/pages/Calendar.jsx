import React, { useEffect, useState, useMemo, useCallback } from 'react';
import posthog from 'posthog-js';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TournamentForm from '../components/TournamentForm';
import SessionForm from '../components/SessionForm';
import TournamentShareModal from '../components/TournamentShareModal';
import PushPermissionPrompt from '../components/PushPermissionPrompt';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { formatCurrency, getCurrencySymbol } from '../utils/format';
import useCurrency from '../hooks/useCurrency';
import { getMapUrl } from '../utils/mapUrl';
import PaddleLoader from '../components/PaddleLoader';
import OnboardingWizard from '../components/OnboardingWizard';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Chip colors per session type
const SESSION_DOT = {
  casual: 'bg-blue-400',
  practice: 'bg-purple-400',
  tournament: 'bg-orange-400',
};
const SESSION_CHIP = {
  casual: 'bg-blue-100 text-blue-700',
  practice: 'bg-purple-100 text-purple-700',
  tournament: 'bg-orange-100 text-orange-700',
};
const SESSION_ICON = { casual: '🎾', practice: '🎯', tournament: '🏆' };
const SESSION_LABEL = { casual: 'Casual', practice: 'Drill', tournament: 'Tournament' };

export default function Calendar() {
  const { user } = useAuth();
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [tournaments, setTournaments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Day popup
  const [dayPopup, setDayPopup] = useState({ open: false, date: null });

  // Tournament detail / edit
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Add tournament modal
  const [addModal, setAddModal] = useState({ open: false, date: null });
  const [addError, setAddError] = useState('');

  // Add session modal
  const [addSessionModal, setAddSessionModal] = useState({ open: false, date: null, sessionType: null });
  const [sessionFormLoading, setSessionFormLoading] = useState(false);
  const [sessionFormError, setSessionFormError] = useState('');

  // Edit session modal — opened by tapping a session card in the day popup
  const [editSessionModal, setEditSessionModal] = useState({ open: false, session: null });

  // Floating action button (speed-dial) state
  const [fabOpen, setFabOpen] = useState(false);

  // Onboarding wizard — shown once for new users
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Share modal
  const [shareModalOpen, setShareModalOpen] = useState(false);

  /** Money summary accordion — starts closed so the grid stays high on the page */
  const [moneySummaryOpen, setMoneySummaryOpen] = useState(false);

  // Push notifications
  const { permission: pushPermission, subscribed: pushSubscribed, isSupported: pushSupported, requestAndSubscribe, silentSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
  const [pushPrompt, setPushPrompt] = useState({ open: false, name: '' });
  const [pushLoading, setPushLoading] = useState(false);
  const isReminderOn = pushSubscribed;

  // Pending tournament notification toast + highlight
  const [pendingToast, setPendingToast] = useState('');
  const [highlightDate, setHighlightDate] = useState('');

  const fetchTournaments = async () => {
    const res = await api.getTournaments();
    setTournaments(res.data.data);
  };

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const tournamentsPromise = api.getTournaments();
      const sessionsPromise = api.getSessions();
      const expensesPromise = api.getExpenses();

      const tRes = await tournamentsPromise;
      setTournaments(tRes.data.data || []);
      setLoading(false);

      const [sRes, eRes] = await Promise.allSettled([sessionsPromise, expensesPromise]);
      if (sRes.status === 'fulfilled') setSessions(sRes.value.data.data || []);
      else setSessions([]);
      if (eRes.status === 'fulfilled') setExpenses(eRes.value.data.data || []);
      else setExpenses([]);
    } catch {
      setError('Failed to load calendar data');
      setLoading(false);
    }
  }, []);

  // On mount: if there's a pending tournament from the landing page form,
  // create it first then fetch all data once — avoids a race condition where
  // fetchData() could overwrite the newly created tournament with stale results.
  useEffect(() => {
    const raw = localStorage.getItem('pt_pending_tournament');

    if (!raw) {
      fetchData();
      return;
    }

    localStorage.removeItem('pt_pending_tournament');
    let data;
    try { data = JSON.parse(raw); } catch { fetchData(); return; }

    api.createTournament(data)
      .then(() => fetchData())
      .then(() => {
        // After data is fresh, navigate to the tournament's month and flash
        // the cell (shared helper — same behaviour as add/edit on Calendar).
        focusAndHighlightDate(data.categories?.[0]?.date);
        setPendingToast(`"${data.name}" saved! You'll get a reminder the day before you play, and a late-evening push that day to log results (your profile time zone). 🏆`);
        setTimeout(() => setPendingToast(''), 6000);
      })
      .catch(() => {
        // Tournament save failed — still load the calendar normally
        fetchData();
      });
  }, [fetchData]);

  // Re-register push subscription silently on devices where permission was already granted
  useEffect(() => {
    if (pushPermission === 'granted') silentSubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show onboarding wizard for new users who haven't completed it
  useEffect(() => {
    if (loading) return;
    if (!user || user.onboardingDone) return;
    if (tournaments.length > 0) return;
    setShowOnboarding(true);
  }, [loading, user?.onboardingDone, tournaments.length]);

  const calendarDerived = useMemo(() => {
    const eventsByDate = {};
    const sessionsByDate = {};
    const groupedTournamentsByDate = {};
    const monthSessionStats = {};
    const monthTournamentSets = {};
    const monthTournamentFinancials = {};

    const insertByDateLimit = (list, item, limit) => {
      let idx = list.findIndex((x) => x.date > item.date);
      if (idx === -1) idx = list.length;
      list.splice(idx, 0, item);
      if (list.length > limit) list.length = limit;
    };

    const upcomingEvents = [];
    const upcomingTournaments = [];

    sessions.forEach((s) => {
      if (!s?.date) return;
      if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
      sessionsByDate[s.date].push(s);

      const monthKey = s.date.slice(0, 7);
      if (!monthSessionStats[monthKey]) monthSessionStats[monthKey] = { sessions: 0, courtFees: 0, travelExpenses: 0 };
      monthSessionStats[monthKey].sessions += 1;
      monthSessionStats[monthKey].courtFees += (s.courtFee || 0);
      monthSessionStats[monthKey].travelExpenses += (s.travelExpense?.total || 0);

      if (s.date >= todayStr) {
        insertByDateLimit(upcomingEvents, { kind: 'session', date: s.date, data: s }, 5);
      }
    });

    tournaments.forEach((t) => {
      const seenEventDatesForTournament = new Set();
      let earliestDate = null;
      const upcomingCats = [];

      (t.categories || []).forEach((cat) => {
        const d = cat?.date ? cat.date.split('T')[0] : null;
        if (!d) return;

        if (!eventsByDate[d]) eventsByDate[d] = [];
        const eventKey = `${d}|${String(t._id)}`;
        if (!seenEventDatesForTournament.has(eventKey)) {
          seenEventDatesForTournament.add(eventKey);
          eventsByDate[d].push({ tournament: t, category: cat });
        }

        if (!groupedTournamentsByDate[d]) groupedTournamentsByDate[d] = {};
        if (!groupedTournamentsByDate[d][t._id]) {
          groupedTournamentsByDate[d][t._id] = { tournament: t, categories: [] };
        }
        groupedTournamentsByDate[d][t._id].categories.push(cat);

        const monthKey = d.slice(0, 7);
        if (!monthTournamentSets[monthKey]) monthTournamentSets[monthKey] = new Set();
        monthTournamentSets[monthKey].add(String(t._id));
        if (!monthTournamentFinancials[monthKey]) monthTournamentFinancials[monthKey] = { entryFees: 0, prizeWon: 0 };
        monthTournamentFinancials[monthKey].entryFees += (cat.entryFee || 0);
        monthTournamentFinancials[monthKey].prizeWon += (cat.prizeAmount || 0);

        if (d >= todayStr) {
          upcomingCats.push({ ...cat, date: d });
          if (!earliestDate || d < earliestDate) earliestDate = d;
          insertByDateLimit(upcomingEvents, { kind: 'tournament', date: d, data: { tournament: t, category: cat } }, 5);
        }
      });

      if (upcomingCats.length) {
        insertByDateLimit(upcomingTournaments, { tournament: t, categories: upcomingCats, earliestDate }, 6);
      }
    });

    const popupByDate = {};
    Object.keys(groupedTournamentsByDate).forEach((dateStr) => {
      popupByDate[dateStr] = Object.values(groupedTournamentsByDate[dateStr]);
    });

    return {
      eventsByDate,
      sessionsByDate,
      popupByDate,
      monthSessionStats,
      monthTournamentSets,
      monthTournamentFinancials,
      upcomingTournaments,
      upcomingEvents,
    };
  }, [sessions, tournaments, todayStr]);

  const { eventsByDate, sessionsByDate, popupByDate, monthSessionStats, monthTournamentSets, monthTournamentFinancials, upcomingTournaments, upcomingEvents } = calendarDerived;

  const popupByTournament = useMemo(
    () => (dayPopup.date ? (popupByDate[dayPopup.date] || []) : []),
    [dayPopup.date, popupByDate]
  );

  // Month summary stats for the viewed month
  const monthStats = useMemo(() => {
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const sessionStats = monthSessionStats[monthStr] || { sessions: 0, courtFees: 0, travelExpenses: 0 };
    const tournamentFin = monthTournamentFinancials[monthStr] || { entryFees: 0, prizeWon: 0 };
    const tournamentsInMonth = monthTournamentSets[monthStr]?.size || 0;
    const upcomingCount = upcomingTournaments.length;

    const monthExpenses = (expenses || []).filter((e) => e?.date && String(e.date).slice(0, 7) === monthStr);
    const tournamentTravel = monthExpenses
      .filter((e) => e.type === 'travel')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const gearTotal = monthExpenses
      .filter((e) => e.type === 'gear')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const sessionCosts = (sessionStats.courtFees || 0) + (sessionStats.travelExpenses || 0);
    const totalOut = tournamentFin.entryFees + tournamentTravel + sessionCosts + gearTotal;
    const totalIn = tournamentFin.prizeWon;
    const net = totalIn - totalOut;

    return {
      sessions: sessionStats.sessions,
      tournaments: tournamentsInMonth,
      upcomingCount,
      tournamentEntryFees: tournamentFin.entryFees,
      tournamentTravel,
      gearTotal,
      prizeWon: tournamentFin.prizeWon,
      sessionCosts,
      totalOut,
      totalIn,
      net,
    };
  }, [monthSessionStats, monthTournamentSets, monthTournamentFinancials, upcomingTournaments, expenses, viewYear, viewMonth]);

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };
  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };
  const formatShortDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  };
  const formatUpcomingDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const d = new Date(year, month - 1, day);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diff = Math.round((d - now) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff <= 6) return d.toLocaleDateString(undefined, { weekday: 'short' });
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  // ── Tournament CRUD ──

  // Switch the calendar to the given date's month, scroll the specific day
  // cell into view, and flash it for ~8 s so the user clearly sees where the
  // new/edited tournament landed. Works on mobile (the highlight uses
  // responsive classes; scrollIntoView with `block: 'center'` handles any
  // viewport) and desktop.
  const focusAndHighlightDate = (dateStr) => {
    if (!dateStr) return;
    const [y, m] = dateStr.split('-').map(Number);
    if (!y || !m) return;
    setViewYear(y);
    setViewMonth(m - 1);
    setHighlightDate(dateStr);
    // Defer the scroll until after React has rendered the (possibly new) month
    // grid and tagged the cell with `data-date`. Two rAFs so we run after the
    // commit's next paint — reliable across Safari/Chrome/Firefox.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const cell = document.querySelector(`[data-calendar-date="${dateStr}"]`);
        if (cell && typeof cell.scrollIntoView === 'function') {
          cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
    setTimeout(() => setHighlightDate(''), 8000);
  };

  // Travel expense logged on the tournament form is a separate Expense record
  // (type: 'travel') — the Tournament schema has no travel fields, so without
  // this call the travel data submitted from the Calendar would silently
  // vanish and never appear on the Travel page. Mirrors Tournaments.jsx.
  // existingExpense = the travel expense already saved for this tournament (or null for new tournaments).
  // Handles all 3 cases: create (new), update (edited), delete (removed).
  const saveTravelExpense = async (tournament, data, existingExpense = null) => {
    const linkedId = tournament?._id ? String(tournament._id) : '';
    if (!linkedId) {
      console.error('[saveTravelExpense] Missing tournament._id', tournament);
      return;
    }
    try {
      const te = data.travelExpense;
      if (te) {
        const firstDate = tournament?.categories?.[0]?.date || new Date().toISOString().slice(0, 10);
        const payload = {
          type: 'travel',
          title: `${tournament.name} – Travel`,
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
    } catch (err) {
      console.error('[saveTravelExpense] Failed', err);
    }
  };

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (isReminderOn) {
        await pushUnsubscribe();
      } else {
        await requestAndSubscribe();
      }
    } catch { /* handled in hook */ }
    finally { setPushLoading(false); }
  };

  const maybeTriggerPushPrompt = (tournamentName, categories) => {
    if (!pushSupported) return;
    const today = new Date().toISOString().slice(0, 10);
    const hasFuture = categories?.some((c) => c.date >= today);
    if (!hasFuture) return;
    if (pushPermission === 'granted') {
      silentSubscribe();
    } else if (pushPermission === 'default') {
      setPushPrompt({ open: true, name: tournamentName, blocked: false });
    } else if (pushPermission === 'denied') {
      setPushPrompt({ open: true, name: tournamentName, blocked: true });
    }
  };

  const handleAddTournament = async (data) => {
    setFormLoading(true);
    setAddError('');
    try {
      const res = await api.createTournament(data);
      const created = res?.data?.data;
      await saveTravelExpense(created, data);
      posthog.capture('tournament_created', {
        category_count: data.categories?.length ?? 1,
        has_feedback: !!(data.rating || data.wentWell?.length || data.wentWrong?.length || data.notes),
        has_rating: !!data.rating,
        went_well_count: data.wentWell?.length ?? 0,
        went_wrong_count: data.wentWrong?.length ?? 0,
        has_notes: !!(data.notes?.trim()),
        has_travel_expense: !!data.travelExpense,
      });
      setAddModal({ open: false, date: null });
      await fetchTournaments();
      focusAndHighlightDate(created?.categories?.[0]?.date || data?.categories?.[0]?.date);
      maybeTriggerPushPrompt(data.name, data.categories);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to add tournament';
      setAddError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditTournament = async (data) => {
    setFormLoading(true);
    setFormError('');
    try {
      const res = await api.updateTournament(selectedTournament._id, data);
      const updated = res?.data?.data;
      await saveTravelExpense(updated, data, selectedTournament.travelExpense);
      posthog.capture('tournament_edited', {
        has_feedback: !!(data.rating || data.wentWell?.length || data.wentWrong?.length || data.notes),
        has_rating: !!data.rating,
        went_well_count: data.wentWell?.length ?? 0,
        went_wrong_count: data.wentWrong?.length ?? 0,
        has_notes: !!(data.notes?.trim()),
        has_travel_expense: !!data.travelExpense,
      });
      setIsEditing(false);
      setSelectedTournament(null);
      await fetchTournaments();
      focusAndHighlightDate(updated?.categories?.[0]?.date || data?.categories?.[0]?.date);
      maybeTriggerPushPrompt(data.name, data.categories);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update tournament');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Session CRUD ──
  const handleAddSession = async (data) => {
    setSessionFormLoading(true);
    setSessionFormError('');
    try {
      await api.createSession(data);
      posthog.capture('session_logged', {
        type: data.type,
        has_rating: !!data.rating,
        rating: data.rating ?? null,
        went_well_count: data.wentWell?.length ?? 0,
        went_wrong_count: data.wentWrong?.length ?? 0,
        has_notes: !!(data.notes?.trim()),
      });
      setAddSessionModal({ open: false, date: null, sessionType: null });
      await fetchData();
    } catch (err) {
      setSessionFormError(err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to add session');
    } finally {
      setSessionFormLoading(false);
    }
  };

  const handleEditSession = async (data) => {
    if (!editSessionModal.session?._id) return;
    setSessionFormLoading(true);
    setSessionFormError('');
    try {
      await api.updateSession(editSessionModal.session._id, data);
      setEditSessionModal({ open: false, session: null });
      await fetchData();
    } catch (err) {
      setSessionFormError(err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to update session');
    } finally {
      setSessionFormLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    const id = editSessionModal.session?._id;
    if (!id) return;
    const ok = typeof window !== 'undefined' ? window.confirm('Delete this session? This cannot be undone.') : true;
    if (!ok) return;
    setSessionFormLoading(true);
    setSessionFormError('');
    try {
      await api.deleteSession(id);
      setEditSessionModal({ open: false, session: null });
      await fetchData();
    } catch (err) {
      setSessionFormError(err.response?.data?.message || 'Failed to delete session');
    } finally {
      setSessionFormLoading(false);
    }
  };

  const addInitial = useMemo(() => {
    if (!addModal.date) return undefined;
    return { name: '', location: null, categories: [{ categoryName: '', date: addModal.date, medal: 'None', prizeAmount: '', entryFee: '' }] };
  }, [addModal.date]);

  const sessionAddInitial = useMemo(() => {
    if (!addSessionModal.date) return undefined;
    const base = { date: addSessionModal.date };
    if (addSessionModal.sessionType === 'casual' || addSessionModal.sessionType === 'practice') {
      return { ...base, type: addSessionModal.sessionType };
    }
    return base;
  }, [addSessionModal.date, addSessionModal.sessionType]);

  const openDayPopup = (dateStr) => setDayPopup({ open: true, date: dateStr });
  const closeDayPopup = () => setDayPopup({ open: false, date: null });

  if (loading) return <div className="py-24"><PaddleLoader label="Loading calendar..." /></div>;
  if (error) return <div className="text-center py-24 text-red-500">{error}</div>;

  const monthName = new Date(viewYear, viewMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">

      {/* Onboarding wizard — new users only */}
      {showOnboarding && (
        <OnboardingWizard
          onDismiss={() => setShowOnboarding(false)}
          onConfirm={() => {
            setShowOnboarding(false);
            setAddModal({ open: true, date: todayStr });
            setAddError('');
          }}
        />
      )}

      {/* Push permission prompt — shown after saving a future tournament */}
      {pushPrompt.open && (
        <PushPermissionPrompt
          tournamentName={pushPrompt.name}
          blocked={pushPrompt.blocked}
          onAccept={async () => {
            setPushPrompt({ open: false, name: '', blocked: false });
            await requestAndSubscribe();
          }}
          onDismiss={() => setPushPrompt({ open: false, name: '', blocked: false })}
        />
      )}

      {/* Pending tournament saved toast */}
      {pendingToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1c350a] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl animate-fade-in max-w-sm w-full mx-4">
          <span className="text-base">🏆</span>
          <span>{pendingToast}</span>
          <button onClick={() => setPendingToast('')} className="ml-auto text-white/60 hover:text-white text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Hero — layered gradient, glass accents, month chip */}
      <div className="relative mb-4 rounded-3xl overflow-hidden shadow-xl shadow-[#0f2006]/25 ring-1 ring-white/15">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(145deg, #0a1404 0%, #1c350a 38%, #2d6e05 62%, #6b3d0a 100%)',
          }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2280%22%20height=%2280%22%3E%3Cfilter%20id=%22n%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.9%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%2280%22%20height=%2280%22%20filter=%22url(%23n)%22%20opacity=%220.04%22/%3E%3C/svg%3E')]" />
        <div className="absolute -right-24 -top-20 w-72 h-72 rounded-full bg-[#91BE4D]/25 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-[#ec9937]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#c8e875]">PickleTracker</span>
                <span className="text-white/25 hidden sm:inline">·</span>
                <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-white/90 backdrop-blur-sm">
                  {monthName}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-[1.1]">
                Calendar
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="hidden sm:flex h-24 w-24 rounded-2xl bg-white/[0.07] border border-white/15 items-center justify-center backdrop-blur-md shadow-inner">
                <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true" className="opacity-90">
                  <rect x="4" y="10" width="56" height="50" rx="8" stroke="white" strokeOpacity="0.35" strokeWidth="1.5"/>
                  <path d="M4 24h56" stroke="white" strokeOpacity="0.3" strokeWidth="1.5"/>
                  <path d="M22 4v12M42 4v12" stroke="#c8e875" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="14" y="30" width="10" height="10" rx="2" fill="#91BE4D" fillOpacity="0.85"/>
                  <rect x="27" y="30" width="10" height="10" rx="2" fill="#ec9937" fillOpacity="0.75"/>
                  <rect x="40" y="30" width="10" height="10" rx="2" fill="#60a5fa" fillOpacity="0.7"/>
                  <rect x="14" y="44" width="10" height="10" rx="2" fill="#a78bfa" fillOpacity="0.65"/>
                </svg>
              </div>

              {pushSupported && pushPermission !== 'denied' && (
                <button
                  type="button"
                  aria-pressed={isReminderOn}
                  aria-label={
                    pushLoading
                      ? 'Updating reminders'
                      : isReminderOn
                        ? 'Turn off tournament reminders'
                        : 'Turn on tournament reminders'
                  }
                  onClick={handleTogglePush}
                  disabled={pushLoading}
                  className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 transition-all active:scale-[0.98] disabled:opacity-60 border w-full sm:w-auto justify-between sm:justify-start ${
                    isReminderOn
                      ? 'bg-white/10 border-white/20 hover:bg-white/15'
                      : 'bg-amber-500/15 border-amber-300/35 hover:bg-amber-500/25'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isReminderOn ? 'bg-[#91BE4D]/35' : 'bg-amber-400/30'}`}>
                      <span className="text-lg leading-none">{isReminderOn ? '🔔' : '🔕'}</span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className={`text-xs font-extrabold leading-tight ${isReminderOn ? 'text-[#d4f5a8]' : 'text-amber-100'}`}>
                        {pushLoading
                          ? (isReminderOn ? 'Turning off…' : 'Enabling…')
                          : isReminderOn
                            ? 'Reminders on'
                            : 'Tournament reminders'}
                      </p>
                      <p className="text-[10px] text-white/45 leading-snug mt-0.5">
                        {isReminderOn ? 'Tap or use switch to turn off' : 'Day-before alerts for upcoming events'}
                      </p>
                    </div>
                  </div>
                  {/* Visible on/off switch */}
                  <span
                    className={`relative ml-1 h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors duration-200 ease-out pointer-events-none ${
                      isReminderOn ? 'bg-[#91BE4D] ring-1 ring-white/30' : 'bg-white/20 ring-1 ring-white/25'
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                        isReminderOn ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly money summary — accordion (collapsed by default) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm mb-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setMoneySummaryOpen((o) => !o)}
          aria-expanded={moneySummaryOpen}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 text-left hover:bg-gray-50/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#91BE4D]/50 focus-visible:ring-inset"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Money summary</p>
            <p className="text-sm sm:text-base font-extrabold text-gray-900 truncate">{monthName}</p>
            {!moneySummaryOpen && (
              <p className="text-xs text-gray-500 mt-0.5">
                {monthStats.totalOut === 0 && monthStats.totalIn === 0
                  ? 'No money logged this month — tap to expand'
                  : (
                    <>
                      Net this month:{' '}
                      <span className={`font-bold tabular-nums ${monthStats.net >= 0 ? 'text-[#4a6e10]' : 'text-red-600'}`}>
                        {monthStats.net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(monthStats.net), currency)}
                      </span>
                      <span className="text-gray-400 font-normal"> · tap for breakdown</span>
                    </>
                  )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              {moneySummaryOpen ? 'Hide' : 'Show'}
            </span>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition-transform duration-200 ${moneySummaryOpen ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </button>

        {moneySummaryOpen && (
          <div className="px-4 pb-4 sm:px-5 border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                <span className="text-xs text-gray-600">Tournament entry fees</span>
              </div>
              <span className="text-xs font-semibold text-gray-700 tabular-nums">
                {monthStats.tournamentEntryFees > 0 ? `- ${formatCurrency(monthStats.tournamentEntryFees, currency)}` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                <span className="text-xs text-gray-600">Tournament travel</span>
              </div>
              <span className="text-xs font-semibold text-gray-700 tabular-nums">
                {monthStats.tournamentTravel > 0 ? `- ${formatCurrency(monthStats.tournamentTravel, currency)}` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-xs text-gray-600">Sessions (court + travel)</span>
              </div>
              <span className="text-xs font-semibold text-gray-700 tabular-nums">
                {monthStats.sessionCosts > 0 ? `- ${formatCurrency(monthStats.sessionCosts, currency)}` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                <span className="text-xs text-gray-600">Gear</span>
              </div>
              <span className="text-xs font-semibold text-gray-700 tabular-nums">
                {monthStats.gearTotal > 0 ? `- ${formatCurrency(monthStats.gearTotal, currency)}` : '—'}
              </span>
            </div>

            {monthStats.prizeWon > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600">Prize money won</span>
                </div>
                <span className="text-xs font-semibold text-[#4a6e10] tabular-nums">
                  + {formatCurrency(monthStats.prizeWon, currency)}
                </span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-2.5 mt-1 flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-800">Net this month</span>
              <span className={`text-sm font-extrabold tabular-nums ${monthStats.net >= 0 ? 'text-[#4a6e10]' : 'text-red-500'}`}>
                {monthStats.net >= 0 ? '+' : '-'} {formatCurrency(Math.abs(monthStats.net), currency)}
              </span>
            </div>

            {monthStats.totalOut === 0 && monthStats.totalIn === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">No activity logged in {monthName} yet.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Calendar Card ──
          No overflow-hidden: it clipped the legend row on narrow screens (horizontal
          scroll and wrapped chips must not be cut off by the card radius). */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">

        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-sm sm:text-base font-bold text-gray-900">{monthName}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={goToToday}
              className="text-xs font-medium text-[#4a6e10] hover:bg-green-50 px-2 py-1 rounded-md transition mr-1"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Helper hint — bold, eye-catching bar that guides users to tap a date.
            `pointer-events-none` is critical: without it, the decorative blobs /
            animated hand inside can swallow taps meant for the first row of the
            grid below on iOS/Android. The bar is purely informational anyway. */}
        <div
          aria-hidden="true"
          className="relative overflow-hidden px-4 py-3 border-b border-[#91BE4D]/30 bg-gradient-to-r from-[#f4f8e8] via-[#eef5e6] to-[#fdf2e4] pointer-events-none select-none"
        >
          {/* Soft decorative blob */}
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#91BE4D]/15 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-10 w-24 h-24 rounded-full bg-[#ec9937]/15 blur-2xl pointer-events-none" />

          <div className="relative flex items-center gap-3">
            {/* Pointing-down hand: the icon itself is the directional cue toward the grid below */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-[0_2px_6px_rgba(28,53,10,0.12)] border border-[#91BE4D]/40 flex items-center justify-center">
              <span className="text-xl animate-bounce" style={{ animationDuration: '1.8s' }}>👇</span>
            </div>

            {/* Two-line copy: bold primary + muted helper */}
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-[15px] font-extrabold text-[#2d5507] leading-tight tracking-tight">
                Tap any date below
              </p>
              <p className="text-[11px] sm:text-xs text-[#4a6e10]/90 font-semibold mt-0.5 leading-snug">
                to log a tournament, casual play, or a drill session.
              </p>
            </div>
          </div>
        </div>

        {/* Legend — wrap on mobile; card parent avoids overflow-hidden so row isn’t clipped */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-2 sm:gap-x-4 px-3 sm:px-4 py-2.5 border-b border-gray-50">
          {[
            { dot: 'bg-blue-400', label: 'Casual' },
            { dot: 'bg-purple-400', label: 'Drill' },
            { dot: 'bg-[#91BE4D]', label: 'Tournament' },
          ].map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${l.dot}`} />
              <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{l.label}</span>
            </span>
          ))}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={i} className="text-center py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span className="sm:hidden">{d}</span>
              <span className="hidden sm:inline">{WEEKDAYS[i]}</span>
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7" style={{ touchAction: 'manipulation' }}>
          {monthGrid.map((day, idx) => {
            if (!day) {
              return <div key={`blank-${idx}`} className="border-b border-r border-gray-50 min-h-[72px] sm:min-h-[90px] bg-gray-50/40" />;
            }

            const dateStr = toDateStr(viewYear, viewMonth, day);
            const events = eventsByDate[dateStr] || [];
            const daySessions = sessionsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const hasActivity = events.length > 0 || daySessions.length > 0;
            const isHighlighted = dateStr === highlightDate;

            return (
              <button
                key={dateStr}
                type="button"
                data-calendar-date={dateStr}
                onClick={() => openDayPopup(dateStr)}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                className={`relative flex flex-col items-stretch text-left border-b border-r border-gray-100 min-h-[72px] sm:min-h-[90px] p-1 sm:p-1.5 select-none cursor-pointer outline-none bg-transparent appearance-none
                  transition-[transform,background-color,box-shadow] duration-150 ease-out
                  hover:shadow-sm hover:z-[1]
                  active:scale-[0.97] active:shadow-inner active:bg-gray-100/80 active:z-[1]
                  focus-visible:ring-2 focus-visible:ring-[#91BE4D]/60 focus-visible:z-[1]
                  motion-reduce:transition-none motion-reduce:transform-none
                  ${hasActivity ? 'hover:bg-green-50/50' : isFuture ? 'hover:bg-gray-50' : 'hover:bg-gray-50/60'}
                  ${idx % 7 === 0 ? 'border-l-0' : ''}
                  ${isHighlighted ? 'ring-2 ring-inset ring-[#91BE4D] bg-[#f4f8e8] z-[2] rounded-md animate-cell-breathe motion-reduce:animate-none' : ''}
                `}
              >
                {/* Date number */}
                <div className="flex justify-center mb-1 relative">
                  {isHighlighted && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#91BE4D]/30 animate-ping" />
                    </span>
                  )}
                  <span className={`relative w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold
                    ${isHighlighted ? 'bg-[#91BE4D] text-white' : isToday ? 'bg-[#91BE4D] text-white' : isFuture ? 'text-gray-500' : 'text-gray-700'}
                  `}>
                    {day}
                  </span>
                </div>

                {hasActivity && (
                  <div className="space-y-0.5 pointer-events-none sm:pointer-events-auto">
                    {daySessions.slice(0, 1).map((s, i) => (
                      <div
                        key={i}
                        className={`text-[8px] sm:text-[11px] rounded px-1 py-0.5 truncate font-semibold leading-tight ${SESSION_CHIP[s.type] || 'bg-blue-100 text-blue-700'}`}
                      >
                        <span className="hidden sm:inline">{SESSION_ICON[s.type]} </span>
                        {SESSION_LABEL[s.type]}
                        {daySessions.length > 1 && ` ×${daySessions.length}`}
                      </div>
                    ))}
                    {events.slice(0, 2).map((ev, i) => (
                      <div
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setSelectedTournament(ev.tournament); }}
                        className="text-[8px] sm:text-[11px] bg-[#91BE4D]/15 text-[#4a6e10] rounded px-1 py-0.5 truncate font-semibold sm:hover:bg-green-200 transition sm:cursor-pointer leading-tight"
                        title={`${ev.tournament.name} – ${ev.category.categoryName}`}
                      >
                        <span className="hidden sm:inline">🏆 </span>
                        {ev.tournament.name}
                      </div>
                    ))}
                    {(() => {
                      const shownSessions = Math.min(daySessions.length, 1);
                      const shownEvents = Math.min(events.length, 2);
                      const remaining = (daySessions.length - shownSessions) + (events.length - shownEvents);
                      return remaining > 0 ? (
                        <div className="text-[8px] sm:text-[10px] text-gray-400 px-1 font-medium">
                          +{remaining} more
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* ── Upcoming Events ── */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Upcoming</p>
            {upcomingTournaments.length > 0 && (
              <button
                onClick={() => setShareModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#91BE4D]/40 text-[#4a6e10] bg-[#91BE4D]/5 hover:bg-[#91BE4D]/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            )}
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((ev, i) => {
              if (ev.kind === 'session') {
                const s = ev.data;
                const RATING_EMOJI = { 1: '😫', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' };
                return (
                  <div key={`s-${i}`} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${SESSION_DOT[s.type] || 'bg-blue-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{SESSION_LABEL[s.type]}</p>
                        {s.location?.name && <p className="text-xs text-gray-400 truncate">📍 {s.location.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.rating && <span className="text-base">{RATING_EMOJI[s.rating]}</span>}
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{formatUpcomingDate(ev.date)}</span>
                    </div>
                  </div>
                );
              }
              const { tournament, category } = ev.data;
              return (
                <button
                  key={`t-${i}`}
                  onClick={() => setSelectedTournament(tournament)}
                  className="w-full flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 rounded-lg px-1 -mx-1 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#91BE4D] mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tournament.name}</p>
                      <p className="text-xs text-gray-400">{category.categoryName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">{formatUpcomingDate(ev.date)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day Popup ── */}
      {dayPopup.open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={closeDayPopup}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl z-10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <p className="text-base font-bold text-gray-900">{formatShortDate(dayPopup.date)}</p>
              <button
                onClick={closeDayPopup}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content — sessions then tournaments */}
            <div className="px-3 py-3 space-y-2 max-h-64 overflow-y-auto">
              {(sessionsByDate[dayPopup.date] || []).length === 0 && popupByTournament.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3">Nothing logged on this day yet.</p>
              )}
              {(sessionsByDate[dayPopup.date] || []).map((s) => {
                const RATING_EMOJI = { 1: '😫', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' };
                const TYPE_BG = {
                  casual: 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
                  practice: 'bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300',
                  tournament: 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300',
                };
                const PILL_TONE = {
                  casual: 'bg-blue-100 text-blue-700 group-hover:bg-blue-200',
                  practice: 'bg-purple-100 text-purple-700 group-hover:bg-purple-200',
                  tournament: 'bg-orange-100 text-orange-700 group-hover:bg-orange-200',
                };
                const DIVIDER_TONE = {
                  casual: 'border-blue-200/70',
                  practice: 'border-purple-200/70',
                  tournament: 'border-orange-200/70',
                };
                const bg = TYPE_BG[s.type] || 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300';
                const pill = PILL_TONE[s.type] || 'bg-gray-100 text-gray-700 group-hover:bg-gray-200';
                const divider = DIVIDER_TONE[s.type] || 'border-gray-200';
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => { setEditSessionModal({ open: true, session: s }); setSessionFormError(''); closeDayPopup(); }}
                    aria-label={`Open ${SESSION_LABEL[s.type] || 'session'} details`}
                    className={`group w-full text-left rounded-xl px-3 py-2.5 border shadow-sm hover:shadow-md active:scale-[0.99] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#91BE4D]/60 ${bg}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{SESSION_ICON[s.type]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{SESSION_LABEL[s.type]}</p>
                          {s.location?.name && <p className="text-xs text-gray-400 truncate">📍 {s.location.name}</p>}
                          {s.wentWell?.length > 0 && (
                            <p className="text-xs text-green-700 mt-0.5 truncate">✓ {s.wentWell.slice(0, 2).join(', ')}</p>
                          )}
                          {s.wentWrong?.length > 0 && (
                            <p className="text-xs text-orange-600 truncate">✗ {s.wentWrong.slice(0, 2).join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-xl">{RATING_EMOJI[s.rating] || '—'}</span>
                        {((s.courtFee || 0) + (s.travelExpense?.total || 0)) > 0 && (
                          <p className="text-xs text-orange-500 font-semibold mt-0.5">
                            −{symbol}{(s.courtFee || 0) + (s.travelExpense?.total || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`mt-2 pt-2 border-t border-dashed ${divider} flex items-center justify-between gap-2`}>
                      <span className="text-[11px] font-semibold text-gray-600 tracking-wide uppercase">Tap to view details</span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 transition-colors ${pill}`}
                        aria-hidden="true"
                      >
                        Open
                        <svg className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </button>
                );
              })}
              {popupByTournament.map(({ tournament, categories }) => (
                <button
                  key={tournament._id}
                  type="button"
                  onClick={() => { setSelectedTournament(tournament); closeDayPopup(); }}
                  aria-label={`Open ${tournament.name} details`}
                  className="group w-full text-left bg-white hover:bg-green-50 active:bg-green-100 rounded-xl px-3 py-3 transition-colors border border-gray-200 hover:border-[#91BE4D] shadow-sm hover:shadow-md active:scale-[0.99] outline-none focus-visible:ring-2 focus-visible:ring-[#91BE4D]/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{tournament.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {categories.map((cat, i) => (
                          <span key={i} className="text-xs bg-[#91BE4D]/15 text-[#4a6e10] px-1.5 py-0.5 rounded-full font-medium">
                            {cat.categoryName}
                          </span>
                        ))}
                      </div>
                      {tournament.location?.name && (
                        <p className="text-xs text-gray-400 mt-1 truncate">📍 {tournament.location.name}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-sm font-bold ${(tournament.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(tournament.totalProfit || 0, currency)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">profit</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#4a6e10] tracking-wide uppercase">Tap to view details</span>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4a6e10] bg-[#91BE4D]/15 group-hover:bg-[#91BE4D]/25 rounded-full px-2 py-0.5 transition-colors"
                      aria-hidden="true"
                    >
                      Open
                      <svg className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Add actions — Casual / Drill + Tournament */}
            <div className="px-3 pb-4 pt-2 border-t border-gray-100 grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  closeDayPopup();
                  setAddSessionModal({ open: true, date: dayPopup.date, sessionType: 'casual' });
                  setSessionFormError('');
                }}
                className="flex items-center justify-center gap-1 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-xs py-2.5 rounded-xl transition-colors"
              >
                {SESSION_ICON.casual} Casual
              </button>
              <button
                onClick={() => {
                  closeDayPopup();
                  setAddSessionModal({ open: true, date: dayPopup.date, sessionType: 'practice' });
                  setSessionFormError('');
                }}
                className="flex items-center justify-center gap-1 border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-xs py-2.5 rounded-xl transition-colors"
              >
                {SESSION_ICON.practice} Drill
              </button>
              <button
                onClick={() => { closeDayPopup(); setAddModal({ open: true, date: dayPopup.date }); setAddError(''); }}
                className="flex items-center justify-center gap-1 hover:opacity-90 text-white font-semibold text-xs py-2.5 rounded-xl transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
              >
                🏆 Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Casual Play / Drill modal ── */}
      {addSessionModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-xl max-h-[92vh] flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
            {/* Pinned header — never scrolls behind the URL bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-shrink-0 gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {addSessionModal.sessionType === 'practice'
                    ? 'Drill'
                    : addSessionModal.sessionType === 'casual'
                      ? 'Casual Play'
                      : 'Casual Play / Drill'}
                </h2>
                {addSessionModal.date && (
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(addSessionModal.date)}</p>
                )}
              </div>
              <button
                onClick={() => { setAddSessionModal({ open: false, date: null, sessionType: null }); setSessionFormError(''); }}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
              {sessionFormError && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{sessionFormError}</div>
              )}
              <SessionForm
                initial={sessionAddInitial}
                onSubmit={handleAddSession}
                onCancel={() => { setAddSessionModal({ open: false, date: null, sessionType: null }); setSessionFormError(''); }}
                loading={sessionFormLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Session Modal ── */}
      {editSessionModal.open && editSessionModal.session && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-xl max-h-[92vh] flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-shrink-0 gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Session</h2>
                {editSessionModal.session?.date && (
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(editSessionModal.session.date)}</p>
                )}
              </div>
              <button
                onClick={() => { setEditSessionModal({ open: false, session: null }); setSessionFormError(''); }}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
              {sessionFormError && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{sessionFormError}</div>
              )}
              {/* Net expense summary — shown when session has any expense recorded */}
              {(() => {
                const s = editSessionModal.session;
                const courtFee = s?.courtFee || 0;
                const te = s?.travelExpense;
                const travelTotal = te?.total || 0;
                if (courtFee + travelTotal === 0) return null;
                const travelRows = [
                  { label: 'Transport',           value: te?.transport },
                  { label: 'Local Commute',        value: te?.localCommute },
                  { label: 'Accommodation',        value: te?.accommodation },
                  { label: 'Food',                 value: te?.food },
                  { label: 'Equipment & Baggage',  value: te?.equipment },
                  { label: 'Others',               value: te?.others },
                  { label: 'Visa & Docs',          value: te?.visaDocs },
                  { label: 'Travel Insurance',     value: te?.travelInsurance },
                ].filter((r) => r.value > 0);
                return (
                  <div className="mb-4 space-y-2">
                    {courtFee > 0 && (
                      <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5">
                        <span className="text-xs font-semibold text-orange-700">Court Fee</span>
                        <span className="text-sm font-bold text-orange-700">{formatCurrency(courtFee, currency)}</span>
                      </div>
                    )}
                    {travelTotal > 0 && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Travel Expenses</span>
                          {(te?.fromCity || te?.toCity) && (
                            <span className="text-[10px] text-blue-500 ml-auto">{[te.fromCity, te.toCity].filter(Boolean).join(' → ')}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {travelRows.map((r) => (
                            <div key={r.label} className="flex justify-between text-xs text-blue-800">
                              <span className="text-blue-600">{r.label}</span>
                              <span className="font-medium">{formatCurrency(r.value, currency)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-blue-900 border-t border-blue-200 pt-1.5 mt-1.5">
                          <span>Travel Total</span>
                          <span>{formatCurrency(travelTotal, currency)}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                      <span className="text-xs font-bold text-orange-800">Net Session Expense</span>
                      <span className="text-sm font-black text-orange-800">{formatCurrency(courtFee + travelTotal, currency)}</span>
                    </div>
                  </div>
                );
              })()}
              <SessionForm
                initial={editSessionModal.session}
                onSubmit={handleEditSession}
                onCancel={() => { setEditSessionModal({ open: false, session: null }); setSessionFormError(''); }}
                loading={sessionFormLoading}
              />
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeleteSession}
                  disabled={sessionFormLoading}
                  className="w-full text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-xl py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Tournament Modal ── */}
      {addModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
            {/* Pinned header — never scrolls behind the URL bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-shrink-0 gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">New Tournament</h2>
                {addModal.date && <p className="text-xs text-gray-500 mt-0.5">{formatDate(addModal.date)}</p>}
              </div>
              <button
                onClick={() => { setAddModal({ open: false, date: null }); setAddError(''); }}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
              {addError && (
                <div className="mb-4 mt-1 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{addError}</div>
              )}
              <TournamentForm
                initial={addInitial}
                onSubmit={handleAddTournament}
                onCancel={() => { setAddModal({ open: false, date: null }); setAddError(''); }}
                loading={formLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Tournament Detail Modal ── */}
      {selectedTournament && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
            {/* Pinned header */}
            <div className="flex items-start justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0 gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 break-words">{selectedTournament.name}</h2>
                {selectedTournament.location?.name && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 font-medium">{selectedTournament.location.name}</p>
                      {getMapUrl(selectedTournament.location) && (
                        <a href={getMapUrl(selectedTournament.location)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                          View on Map →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">

            <div className="space-y-2 mb-4">
              {selectedTournament.categories.map((cat, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-900">{cat.categoryName}</p>
                  <p className="text-xs text-gray-500 mb-2">{cat.date ? formatDate(cat.date.split('T')[0]) : ''}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-gray-400">Medal</p><p className="font-medium text-gray-800">{cat.medal}</p></div>
                    <div><p className="text-gray-400">Entry Fee</p><p className="font-medium text-red-600">{formatCurrency(cat.entryFee, currency)}</p></div>
                    <div><p className="text-gray-400">Won</p><p className="font-medium text-green-600">{formatCurrency(cat.prizeAmount, currency)}</p></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Travel expense breakdown */}
            {selectedTournament.travelExpense && (() => {
              const te = selectedTournament.travelExpense;
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
              const earnings = selectedTournament.totalEarnings || 0;
              const entryFees = selectedTournament.totalExpenses || 0;
              const travelTotal = selectedTournament.travelExpense?.amount || 0;
              const netProfit = earnings - entryFees - travelTotal;
              return (
                <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm">
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
                  <div className="flex justify-between border-t border-blue-100 pt-2 mt-2">
                    <span className="font-semibold text-gray-900">Net Profit</span>
                    <span className={`text-base font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(netProfit, currency)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Performance Feedback */}
            {(selectedTournament.rating || selectedTournament.wentWell?.length > 0 || selectedTournament.wentWrong?.length > 0 || selectedTournament.notes) && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Performance Feedback</p>

                {selectedTournament.rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {['😞','😐','🙂','😊','🤩'][selectedTournament.rating - 1]}
                    </span>
                    <span className="text-sm text-gray-700">
                      {['Tough day','Average','Decent','Good','Outstanding!'][selectedTournament.rating - 1]}
                    </span>
                  </div>
                )}

                {selectedTournament.wentWell?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">What went well</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTournament.wentWell.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTournament.wentWrong?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Needs work</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTournament.wentWrong.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTournament.notes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTournament.notes}</p>
                  </div>
                )}
              </div>
            )}

            {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 min-h-[44px] rounded-xl transition"
              >
                Edit
              </button>
              <button
                onClick={() => setSelectedTournament(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold py-2.5 min-h-[44px] rounded-xl transition"
              >
                Close
              </button>
            </div>
            </div> {/* end scrollable body */}
          </div>
        </div>
      )}

      {/* ── Edit Tournament Modal ── */}
      {selectedTournament && isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
            {/* Pinned header */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-shrink-0 gap-3">
              <h2 className="text-lg font-bold text-gray-900">Edit Tournament</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
              <TournamentForm
                initial={selectedTournament}
                onSubmit={handleEditTournament}
                onCancel={() => setIsEditing(false)}
                loading={formLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Action Button (speed-dial) ──
          Hidden whenever a modal/popup is open so it doesn't overlap forms. */}
      {!showOnboarding && !dayPopup.open && !addModal.open && !addSessionModal.open && !editSessionModal.open && !selectedTournament && (
      <>
      {fabOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity"
          onClick={() => setFabOpen(false)}
        />
      )}

      <div
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 flex flex-col items-end gap-2.5 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Speed-dial options */}
        <div
          className={`flex flex-col items-end gap-2.5 transition-all duration-200 ${
            fabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={() => {
              setFabOpen(false);
              setAddSessionModal({ open: true, date: todayStr, sessionType: null });
              setSessionFormError('');
            }}
            className="flex items-center gap-2.5 bg-white shadow-lg border border-gray-100 rounded-full pl-4 pr-5 py-2.5 hover:shadow-xl active:scale-95 transition-all"
          >
            <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-base">🎯</span>
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">Casual Play / Drill</span>
          </button>
          <button
            onClick={() => {
              setFabOpen(false);
              setAddModal({ open: true, date: todayStr });
              setAddError('');
            }}
            className="flex items-center gap-2.5 bg-white shadow-lg border border-gray-100 rounded-full pl-4 pr-5 py-2.5 hover:shadow-xl active:scale-95 transition-all"
          >
            <span className="w-7 h-7 rounded-full bg-[#91BE4D]/20 flex items-center justify-center text-base">🏆</span>
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">Log Tournament</span>
          </button>
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setFabOpen((v) => !v)}
          aria-label={fabOpen ? 'Close add menu' : 'Open add menu'}
          className="w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center transition-all"
          style={{ background: 'linear-gradient(135deg, #2d7005 0%, #91BE4D 55%, #ec9937 100%)' }}
        >
          <svg
            className={`w-7 h-7 transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      </>
      )}

      {/* ── Share Modal ── */}
      {shareModalOpen && (
        <TournamentShareModal
          items={upcomingTournaments}
          onClose={() => setShareModalOpen(false)}
        />
      )}

    </div>
  );
}
