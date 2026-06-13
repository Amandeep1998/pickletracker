import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import { APP_NAME } from '../utils/featureFlags';
import { useAuth } from '../context/AuthContext';
import ChatStream from '../components/companion/ChatStream';
import GuidedChips from '../components/companion/GuidedChips';
import CommandDeck from '../components/companion/CommandDeck';
import Composer from '../components/companion/Composer';
import { BallMark, Wordmark, Icon } from '../components/companion/erne/Icon';
import WelcomeHero from '../components/companion/WelcomeHero';
import Calendar from './Calendar';
import Dashboard from './Dashboard';
import CoachHub from './CoachHub';
import {
  TournamentPreviewCard,
  GearPreviewCard,
  ReminderPrompt,
  SavedCard,
  FeedbackCard,
  MedalDot,
} from '../components/companion/Cards';
import { usePushNotifications } from '../hooks/usePushNotifications';
import PlayerCard from '../components/companion/PlayerCard';
import TournamentManager from '../components/companion/TournamentManager';
import UpcomingCard from '../components/companion/UpcomingCard';
import ProfilePopup from '../components/companion/ProfilePopup';
import SupportPopup from '../components/companion/SupportPopup';
import SettingsPopup from '../components/companion/SettingsPopup';
import AuthSheet from '../components/companion/AuthSheet';
import ExpenseCard from '../components/companion/ExpenseCard';
import FeedPopup from '../components/companion/FeedPopup';
import { useCompanionInstall, InstallTopBanner, InstallStepsModal } from '../components/companion/InstallPrompt';
import { formatMoney } from '../utils/format';
import NotificationBell from '../components/NotificationBell';
import {
  companionParse,
  companionParseGear,
  companionAssist,
  getCategoryOptions,
  getCategoryList,
  createTournament,
  updateTournament,
  saveTournamentFeedback,
  deleteTournament,
  createExpense,
  getCompanionCard,
  getCompanionTournaments,
  getCompanionUpcoming,
  getCompanionSpend,
  getFeed,
  getPlayer,
  getGamificationProgress,
} from '../services/api';

/**
 * Companion (beta) — authed in-app chat surface at /companion (flag-gated;
 * nav entry shown only when CHAT_COMPANION is on). Dogfooded to full parity
 * with manual data-entry before any promotion to the public landing.
 *
 * Free text → LLM parse → confirm card → write through the existing
 * /api/tournaments endpoint (byte-identical to form logs, stamped
 * sport:'pickleball'). Player card, upcoming, and community feed (read-only)
 * pull live data. Flag OFF redirects back to the existing landing.
 */

let _id = 0;
const nextId = () => `m${++_id}`;

// Companion analytics — all events namespaced `companion_*` so the chat funnel
// is filterable in PostHog. No-op when PostHog isn't configured (posthog-js
// safely ignores capture calls before init).
const track = (event, props) => {
  try {
    posthog.capture(`companion_${event}`, props || {});
  } catch {
    /* analytics must never break the chat */
  }
};

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const ROOT_CHIPS = [
  { id: 'root-log',      action: 'log',         iconName: 'trophy',   group: 'hero',       short: 'Log tournament',  label: 'Log tournament',  hint: 'Name, category, result' },
  { id: 'root-medal',    action: 'log',         iconName: 'medal',    group: 'Log & add',  short: 'Add past medal',  label: 'Add past medal',  hint: 'Completed tournament' },
  { id: 'root-gear',     action: 'gear',        iconName: 'bag',      group: 'Log & add',  short: 'Add gear',        label: 'Add gear',        hint: 'Paddle, shoes, etc.' },
  { id: 'root-card',     action: 'card',        iconName: 'idcard',   group: 'Your game',  short: 'My card',         label: 'My card',         hint: 'Medals + history' },
  { id: 'root-upcoming', action: 'upcoming',    iconName: 'calendar', group: 'Your game',  short: 'My upcoming',     label: 'My upcoming',     hint: 'Registered tournaments' },
  { id: 'root-spend',    action: 'spend',       iconName: 'wallet',   group: 'Your game',  short: 'My spending',     label: 'My spending',     hint: 'Entry fees + travel' },
  { id: 'root-feed',     action: 'feed',        iconName: 'feed',     group: 'Your game',  short: 'Community feed',  label: 'Community feed',  hint: 'See what others are playing' },
  { id: 'root-mine',     action: 'tournaments', iconName: 'history',  group: 'Your game',  short: 'My tournaments',  label: 'My tournaments',  hint: 'Full history + edit' },
  { id: 'root-calendar', action: 'calendar',    iconName: 'calendar', group: 'Explore',    short: 'Calendar',        label: 'Calendar',        hint: 'Schedule view' },
  { id: 'root-dashboard',action: 'dashboard',   iconName: 'chart',    group: 'Explore',    short: 'Dashboard',       label: 'Dashboard',       hint: 'Stats + trends' },
  { id: 'root-coach',    action: 'coach',       iconName: 'whistle',  group: 'Explore',    short: 'Coach Hub',       label: 'Coach Hub',       hint: 'Book + track sessions' },
];

// Persistent quick-access chips shown above the composer (full action list
// still lives in the + Command Deck). GuidedChips reads `icon`, so map iconName.
const QUICK_CHIPS = ['root-log', 'root-card', 'root-spend', 'root-feed', 'root-upcoming']
  .map((id) => ROOT_CHIPS.find((c) => c.id === id))
  .filter(Boolean)
  .map((c) => ({ id: `quick-${c.id}`, action: c.action, icon: c.iconName, label: c.short }));

const ANON_QUICK = [
  { id: 'quick-log', action: 'log', icon: 'trophy', label: 'Log a tournament' },
  { id: 'quick-login', action: 'login', icon: 'user', label: 'Sign in' },
];

const periodPhrase = (p) => (p === 'year' ? 'this year' : p === 'all' ? 'all time' : 'this month');

const LOGIN_CHIPS = [{ id: 'login', action: 'login', iconName: 'user', label: 'Sign in to save' }];

// Anonymous visitors can try logging (try-before-auth); they just can't read
// back authed surfaces (card / upcoming / spend / feed) until they sign in.
const ANON_CHIPS = [{ id: 'anon-log', action: 'log', iconName: 'trophy', label: 'Log a tournament' }];

// Stash an in-progress log across the sign-in redirect so it commits on return.
const PENDING_LOG_KEY = 'pendingCompanionLog';

const GREETING =
  `Hey! I'm ${APP_NAME} — your pickleball buddy. Tell me about a tournament (name, category, when, and how it went) and I'll log it. What's up?`;

const LOG_PROMPT =
  `Go ahead — tell me the tournament name, your category, the date, and your result if it's done. e.g. “Won gold in mixed doubles at Mumbai Open on May 24, entry 500”.`;

export default function Companion() {
  return <CompanionChat />;
}

function CompanionChat() {
  const { user, refreshUser, handleLogout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ADMIN_EMAILS.includes(user?.email?.toLowerCase());
  const hasToken = Boolean(localStorage.getItem('token'));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
  const [supportOpen, setSupportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Full-screen overlays reusing the existing pages.
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  // Inline auth popup: null (closed) | 'login' | 'signup'.
  const [authMode, setAuthMode] = useState(null);
  // PWA install (themed): hook drives the banner + Menu tile + manual sheet.
  const {
    action: installAction,
    browserType: installBrowser,
    trigger: triggerInstall,
    isStandalone: installStandalone,
  } = useCompanionInstall();
  const [showInstallSteps, setShowInstallSteps] = useState(false);
  // Web push: offer a day-before reminder after logging an upcoming tournament.
  // Only when the browser permission is still 'default' (undecided) — once the
  // user grants (or blocks) it, we never show the offer again.
  const { isSupported: pushSupported, requestAndSubscribe } = usePushNotifications();

  const startInstall = useCallback(() => {
    if (installAction === 'native') {
      triggerInstall();
    } else if (installAction === 'manual') {
      setShowInstallSteps(true);
    }
  }, [installAction, triggerInstall]);

  // Command Deck open state (triggered by Composer + button).
  const [deckOpen, setDeckOpen] = useState(false);

  // Deck chips = root actions, plus "Install app" tile while installable.
  const dockChips = useMemo(
    () =>
      installAction && !installStandalone
        ? [
            ...ROOT_CHIPS,
            { id: 'root-install', action: 'install', iconName: 'install', group: 'App', short: 'Install app', label: 'Install app', hint: 'Add to home screen' },
          ]
        : ROOT_CHIPS,
    [installAction, installStandalone]
  );

  const onLogout = useCallback(async () => {
    setMenuOpen(false);
    await handleLogout();
    // Stay on the chat landing (now public). Wipe the conversation + any
    // in-flight log and fall back to the anon home/welcome screen.
    authHandledRef.current = false;
    payloadRef.current = null;
    rawRef.current = null;
    previewRef.current = null;
    travelRef.current = null;
    ambQueueRef.current = [];
    pendingRef.current = null;
    editIdRef.current = null;
    spendRef.current = null;
    gearModeRef.current = false;
    gearPayloadRef.current = null;
    setCalendarOpen(false);
    setDashboardOpen(false);
    setCoachOpen(false);
    setProfile(null);
    setManager(null);
    setSupportOpen(false);
    setTyping(false);
    setBusy(false);
    setDraft('');
    setChips(ANON_CHIPS);
    setMessages([{ id: nextId(), role: 'bot', text: GREETING }]);
    navigate('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleLogout, navigate]);

  const [messages, setMessages] = useState([{ id: nextId(), role: 'bot', text: GREETING }]);
  const [chips, setChips] = useState(hasToken ? ROOT_CHIPS : ANON_CHIPS);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  // Premium profile popup: null = closed, else { loading, data }.
  const [profile, setProfile] = useState(null);
  // Tournament manager popup: null = closed, else { mode, items, categories }.
  const [manager, setManager] = useState(null);
  // Community feed popup: null = closed, else { items, hasMore, loading }.
  const [feed, setFeed] = useState(null);
  const [progress, setProgress] = useState(null);
  const [levelOpen, setLevelOpen] = useState(false);
  // Summary for the name + medals stat strip under the header.
  const [cardSummary, setCardSummary] = useState(null);
  // Canonical category enum for the inline edit-card dropdown (fetched once).
  const [categoryOptions, setCategoryOptions] = useState([]);

  useEffect(() => {
    let active = true;
    getCategoryList()
      .then((res) => { if (active) setCategoryOptions(res.data?.data || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    let active = true;
    getGamificationProgress()
      .then((res) => { if (active) setProgress(res.data?.data ?? null); })
      .catch(() => {});
    getCompanionCard()
      .then((res) => { if (active) setCardSummary(res.data?.data ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, [hasToken]);

  // First-run welcome (ChatGPT/Claude-style) until the user actually sends
  // something or taps a read action — both push a user bubble.
  const started = messages.some((m) => m.role === 'user');

  // Working state for the in-flight log: the confirm payload, the raw parse
  // (used as currentForm so follow-up text MERGES instead of replacing), and a
  // queue of unresolved category ambiguities.
  const payloadRef = useRef(null);
  const rawRef = useRef(null);
  const previewRef = useRef(null);
  const travelRef = useRef(null);
  const ambQueueRef = useRef([]);
  // The missing field we're currently asking the user to supply, or null.
  // { kind: 'name'|'category'|'date'|'entryFee'|'prize', idx?: number }
  const pendingRef = useRef(null);
  // Last spend query { period, data } — drives the winnings/net follow-ups.
  const spendRef = useRef(null);
  // Set to a tournament id when the in-flight confirm is an EDIT (PUT) of an
  // existing record (driven by the assist router), not a new log (POST).
  const editIdRef = useRef(null);
  // Last free-text message sent to the assist router — re-sent (with the picked
  // name appended) when the user taps a disambiguation candidate chip.
  const lastAssistMsgRef = useRef('');
  // Gear-logging flow: true while the next free-text message should be parsed as
  // a gear purchase; gearPayloadRef holds the ready createExpense body.
  const gearModeRef = useRef(false);
  const gearPayloadRef = useRef(null);
  // Set true by AuthSheet on a fresh sign-up so the post-auth effect fires the
  // browser notification prompt once, right after the account is created.
  const signupRef = useRef(false);

  const pushUser = useCallback((text) => {
    setMessages((m) => [...m, { id: nextId(), role: 'user', text }]);
  }, []);

  // Append bot turns (each {text?, card?node}) after a short typing beat.
  const botTurns = useCallback((turns, nextChips) => {
    setChips([]);
    setTyping(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        setTyping(false);
        setMessages((m) => [
          ...m,
          ...turns.map((t) => ({ id: nextId(), role: 'bot', text: t.text, card: t.card || null })),
        ]);
        if (nextChips !== undefined) setChips(nextChips);
        resolve();
      }, 450);
    });
  }, []);

  const botSay = useCallback((text, nextChips) => botTurns([{ text }], nextChips), [botTurns]);

  const resetWork = () => {
    payloadRef.current = null;
    rawRef.current = null;
    previewRef.current = null;
    travelRef.current = null;
    ambQueueRef.current = [];
    pendingRef.current = null;
    editIdRef.current = null;
  };

  // "₹1,200", "1.5k", "1000", "no"/"nothing"/"none" → a non-negative integer.
  const parsePrize = (text) => {
    const t = String(text).toLowerCase().trim();
    if (/\b(no|none|nothing|zero|nil|free)\b/.test(t)) return 0;
    const m = t.replace(/[,₹]|rs\.?/gi, ' ').match(/(\d+(?:\.\d+)?)\s*(k)?/);
    if (!m) return null;
    let n = parseFloat(m[1]);
    if (m[2]) n *= 1000;
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };

  // Apply an inline manual edit (from the confirm-card form) onto the working
  // refs. Mirrors the backend buildFromParse mapping so a manual edit and a
  // parsed/conversational edit converge on the same payload/preview/raw shape.
  const applyManualEdit = useCallback((edited) => {
    const cats = edited.categories || [];
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmtDate = (iso) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${MON[+iso.split('-')[1] - 1]} ${+iso.split('-')[2]}` : null);
    const dateLabels = [...new Set(cats.map((c) => c.date).filter(Boolean))].sort().map(fmtDate).filter(Boolean);
    const dates = dateLabels.length === 0 ? null : dateLabels.length === 1 ? dateLabels[0] : `${dateLabels[0]}–${dateLabels[dateLabels.length - 1]}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const anyResult = cats.some((c) => c.medal && c.medal !== 'None');
    const hasFuture = cats.some((c) => c.date && c.date > todayStr);
    const status = anyResult ? 'completed' : hasFuture ? 'upcoming' : 'completed';

    // Preserve sport + existing location object fields the editor doesn't touch.
    const prevLoc = payloadRef.current?.location;
    payloadRef.current = {
      ...(payloadRef.current || {}),
      name: edited.name || '',
      sport: payloadRef.current?.sport || 'pickleball',
      location: edited.locationQuery ? { ...(prevLoc || {}), name: edited.locationQuery } : undefined,
      categories: cats.map((c) => {
        const won = c.medal && c.medal !== 'None';
        return {
          categoryName: c.categoryName || null,
          date: c.date || null,
          medal: c.medal || 'None',
          entryFee: c.entryFee != null ? c.entryFee : 0,
          prizeAmount: won ? (c.prizeAmount != null ? c.prizeAmount : null) : 0,
          partnerName: c.partnerName || '',
        };
      }),
    };

    rawRef.current = {
      name: edited.name || null,
      locationQuery: edited.locationQuery || null,
      categories: cats.map((c) => ({
        categoryName: c.categoryName || null,
        date: c.date || null,
        medal: c.medal || 'None',
        entryFee: c.entryFee != null ? c.entryFee : null,
        prizeAmount: c.prizeAmount != null ? c.prizeAmount : null,
        partnerName: c.partnerName || '',
      })),
    };

    previewRef.current = {
      name: edited.name || null,
      dates,
      venue: edited.locationQuery || null,
      status,
      travelTotal: edited.travel?.total || 0,
      travel: edited.travel || null,
      categories: cats.map((c) => ({
        format: c.categoryName || '(needs detail)',
        level: null,
        partner: c.partnerName || null,
        date: c.date || null,
        entryFee: c.entryFee != null ? c.entryFee : null,
        prizeAmount: c.prizeAmount != null ? c.prizeAmount : null,
        result: c.medal != null ? { type: 'medal', value: c.medal === 'None' ? null : c.medal } : null,
      })),
    };

    travelRef.current = edited.travel || null;
    // A manual edit resolves all pending gaps + ambiguities.
    ambQueueRef.current = [];
    pendingRef.current = null;
  }, []);

  // ---- render the confirm card from the current working preview/payload ----
  const showConfirmCard = useCallback(async () => {
    const preview = previewRef.current;
    const editing = Boolean(editIdRef.current);
    track('confirm_card_shown', { editing, status: preview?.status, categories: preview?.categories?.length || 0 });
    // "Add to my card" only when a medal was actually won — the card is the medal
    // showcase. A played-but-no-medal result (or upcoming) just saves the record.
    const wonMedal = (preview?.categories || []).some((c) => {
      if (c?.result?.type !== 'medal') return false;
      const v = String(c.result.value || '').toLowerCase();
      return v === 'gold' || v === 'silver' || v === 'bronze';
    });
    const confirmLabel = editing
      ? 'Save changes'
      : preview?.status === 'upcoming'
      ? 'Save it'
      : wonMedal
      ? 'Add to my card'
      : 'Save';
    await botTurns([
      { text: editing ? "Here's the updated version" : "Here's what I'll save" },
      {
        card: (
          <TournamentPreviewCard
            data={preview}
            confirmLabel={confirmLabel}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onSave={onSaveEdit}
            onSaveAndConfirm={onSaveAndConfirm}
            categoryOptions={categoryOptions}
          />
        ),
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurns, categoryOptions]);

  // Inline manual edit saved → apply onto the working refs and re-render the
  // confirm card with the updated details (no LLM round-trip).
  const onSaveEdit = useCallback(async (edited) => {
    applyManualEdit(edited);
    track('confirm_card_edited', {
      categories: edited.categories?.length || 0,
      has_location: Boolean(edited.locationQuery),
      has_travel: Boolean(edited.travel),
    });
    await botTurns([{ text: 'Updated — take a look' }]);
    await showConfirmCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyManualEdit, botTurns]);

  // ---- gap-filler: ask for every required detail the user didn't mention,
  // one at a time, before the confirm card. Detection reads the RAW parse
  // (rawRef) because the payload defaults missing entry fees to 0, which would
  // otherwise hide them. Returns after asking; the answer flows back through
  // onSend, which re-invokes this until nothing is missing. ----
  const askNextMissing = useCallback(async () => {
    const raw = rawRef.current;
    if (!raw) {
      await showConfirmCard();
      return;
    }
    const catLabel = (i) =>
      previewRef.current?.categories?.[i]?.format ||
      raw.categories?.[i]?.categoryName ||
      'that category';

    // 1. Tournament name
    if (!(raw.name || '').trim()) {
      pendingRef.current = { kind: 'name' };
      await botSay("What's the tournament called?", []);
      return;
    }

    const cats = raw.categories || [];
    // No category at all
    if (!cats.length) {
      pendingRef.current = { kind: 'category', idx: 0 };
      await botSay("Which category did you play? e.g. Men's Doubles, Mixed Doubles, Women's Singles…", []);
      return;
    }

    // 2. Per category: name → date → entry fee → prize (if a medal was won)
    for (let i = 0; i < cats.length; i++) {
      const c = cats[i];
      if (!c.categoryName) {
        pendingRef.current = { kind: 'category', idx: i };
        await botSay("Which category was it? e.g. Men's Doubles, Women's Singles, Mixed Doubles…", []);
        return;
      }
      if (!c.date) {
        pendingRef.current = { kind: 'date', idx: i };
        await botSay(`What date for ${catLabel(i)}? e.g. “6 June” or “next Saturday”.`, []);
        return;
      }
      if (c.entryFee == null) {
        pendingRef.current = { kind: 'entryFee', idx: i };
        await botSay(`What was the entry fee for ${catLabel(i)}? Type the amount, or 0 if it was free.`, []);
        return;
      }
      if (c.medal && c.medal !== 'None' && c.prizeAmount == null) {
        pendingRef.current = { kind: 'prize', idx: i };
        await botSay(
          `You won ${c.medal} in ${catLabel(i)}! How much prize money? Type the amount, or 0 if there was no cash prize.`,
          []
        );
        return;
      }
    }

    pendingRef.current = null;
    await showConfirmCard();
  }, [botSay, showConfirmCard]);

  // ---- ambiguity resolution: ask the next pending question as chips ----
  const askNextAmbiguity = useCallback(async () => {
    const q = ambQueueRef.current[0];
    if (!q) {
      await askNextMissing();
      return;
    }
    // Options are structured chips from the backend picker:
    // { label, value, kind: 'final'|'facet', facet?, facetValue? }.
    const options = (q.options || []).map((opt, i) => ({
      id: `amb-${i}`,
      action: 'amb',
      label: opt.label,
      value: opt.value,
      kind: opt.kind,
      facet: opt.facet,
      facetValue: opt.facetValue,
    }));
    await botSay(q.question, options);
  }, [botSay, askNextMissing]);

  // Facet chip tapped → merge the picked facet, re-query the picker for the
  // next narrowing step (deterministic, no LLM), and re-render in place.
  const narrowAmbiguity = useCallback(
    async (chip) => {
      const q = ambQueueRef.current[0];
      if (!q) {
        await askNextMissing();
        return;
      }
      q.facets = { ...(q.facets || {}), [chip.facet]: chip.facetValue };
      try {
        const { data } = await getCategoryOptions(q.facets);
        const step = data.data;
        q.options = step.options;
        q.done = step.done;
        q.question = step.question;
      } catch {
        /* keep the existing options on failure */
      }
      await askNextAmbiguity();
    },
    [askNextAmbiguity, askNextMissing]
  );

  const resolveAmbiguity = useCallback(
    async (value) => {
      const q = ambQueueRef.current.shift();
      if (q && payloadRef.current?.categories?.[q.categoryIndex]) {
        payloadRef.current.categories[q.categoryIndex].categoryName = value;
        if (previewRef.current?.categories?.[q.categoryIndex]) {
          previewRef.current.categories[q.categoryIndex].format = value;
        }
        if (rawRef.current?.categories?.[q.categoryIndex]) {
          rawRef.current.categories[q.categoryIndex].categoryName = value;
        }
      }
      await askNextAmbiguity();
    },
    [askNextAmbiguity]
  );

  // ---- parse free text → preview (+ ambiguities) ----
  const runParse = useCallback(
    async (text, { merge = true } = {}) => {
      setBusy(true);
      setTyping(true);
      try {
        // Merge against the in-flight draft only for follow-ups / mid-log
        // corrections. A fresh log starts clean — otherwise a stale draft from
        // an abandoned earlier flow (e.g. a half-filled "Team Event") leaks its
        // category/medal into the new message.
        if (!merge) resetWork();
        const { data } = await companionParse(text, merge ? rawRef.current || undefined : undefined);
        const { preview, payload, travel, ambiguities, raw } = data.data;
        payloadRef.current = payload;
        rawRef.current = raw;
        previewRef.current = preview;
        travelRef.current = travel || null;
        ambQueueRef.current = Array.isArray(ambiguities) ? [...ambiguities] : [];

        setTyping(false);
        const rootChips = hasToken ? ROOT_CHIPS : ANON_CHIPS;
        if (!preview.categories || preview.categories.length === 0) {
          track('parse_failed', { reason: 'no_categories', authed: hasToken });
          await botSay(
            "I couldn't catch a tournament in that. Try: “Played men's doubles at Grand Slam on May 24, won gold, entry 500.”",
            rootChips
          );
          resetWork();
          return;
        }
        track('parse_succeeded', {
          categories: preview.categories.length,
          status: preview.status,
          ambiguities: ambQueueRef.current.length,
          authed: hasToken,
        });
        if (ambQueueRef.current.length) track('ambiguity_shown', { count: ambQueueRef.current.length });
        await askNextAmbiguity();
      } catch (err) {
        setTyping(false);
        const rootChips = hasToken ? ROOT_CHIPS : ANON_CHIPS;
        const status = err.response?.status;
        track('parse_error', { status: status || 0, authed: hasToken });
        if (status === 429) track('rate_limited', { surface: 'parse', authed: hasToken });
        if (status === 429) {
          // Anon trial cap reached → push them to sign in; authed → soft limit.
          await botSay(
            err.response.data?.message || "You've hit the chat limit — try later.",
            hasToken ? ROOT_CHIPS : LOGIN_CHIPS
          );
        } else if (status === 401) {
          await botSay('Sign in first so I can save your tournaments.', LOGIN_CHIPS);
        } else {
          await botSay("Hmm, I couldn't read that just now. Mind trying again?", rootChips);
        }
      } finally {
        setBusy(false);
      }
    },
    [askNextAmbiguity, botSay, hasToken]
  );

  // ---- confirm → write through existing tournaments endpoint ----
  const onConfirm = useCallback(async () => {
    const payload = payloadRef.current;
    if (!payload) return;

    // Read auth live: this callback can be captured (via showConfirmCard) from
    // an earlier anonymous render, so the closed-over hasToken may be stale
    // after an inline sign-in.
    const loggedIn = Boolean(localStorage.getItem('token'));

    // Anonymous try-before-auth: stash the ready payload and send them to sign
    // in. CompanionChat replays it on return (see the replay effect below).
    if (!loggedIn) {
      track('log_stashed_anon', { status: previewRef.current?.status });
      localStorage.setItem(
        PENDING_LOG_KEY,
        JSON.stringify({
          payload,
          travel: travelRef.current || null,
          preview: previewRef.current || null,
        })
      );
      await botSay(
        "Love it! Create a free account or sign in and I'll save this to your card right away.",
        LOGIN_CHIPS
      );
      return;
    }

    // EDIT path: an existing record resolved by the assist router. Write through
    // PUT and confirm. Travel edits aren't handled here.
    if (editIdRef.current) {
      setBusy(true);
      setTyping(true);
      try {
        await updateTournament(editIdRef.current, payload);
        track('log_saved', { kind: 'edit', categories: payload.categories?.length || 0 });
        setTyping(false);
        const subtitle = [previewRef.current?.name, previewRef.current?.dates].filter(Boolean).join(' · ');
        await botTurns([{ card: <SavedCard title="Updated!" subtitle={subtitle || 'Changes saved.'} /> }], ROOT_CHIPS);
        resetWork();
      } catch (err) {
        setTyping(false);
        track('log_save_failed', { kind: 'edit', status: err.response?.status || 0 });
        const errors = err.response?.data?.errors;
        const first = Array.isArray(errors) && errors.length ? errors[0] : err.response?.data?.message;
        await botSay(`Couldn't save that — ${first || 'something went wrong'}. Tell me and I'll fix it.`, []);
      } finally {
        setBusy(false);
      }
      return;
    }

    const travel = travelRef.current;
    setBusy(true);
    setTyping(true);
    try {
      const res = await createTournament(payload);
      const created = res?.data?.data;
      track('log_saved', {
        kind: 'new',
        status: previewRef.current?.status,
        categories: payload.categories?.length || 0,
        medals: (payload.categories || []).filter((c) => c.medal && c.medal !== 'None').length,
        has_travel: Boolean(travelRef.current && travelRef.current.total > 0),
      });

      // Travel costs go to a linked 'travel' Expense — same two-step the form
      // does. Best-effort: a travel-expense failure must not lose the saved log.
      if (travel && travel.total > 0 && created?._id) {
        const firstDate = created.categories?.[0]?.date || new Date().toISOString().slice(0, 10);
        try {
          await createExpense({
            type: 'travel',
            title: `${created.name} – Travel`,
            amount: travel.total,
            date: firstDate,
            tournamentId: String(created._id),
            fromCity: travel.fromCity || '',
            toCity: travel.toCity || '',
            isInternational: Boolean(travel.isInternational),
            transport: travel.transport || 0,
            localCommute: travel.localCommute || 0,
            accommodation: travel.accommodation || 0,
            food: travel.food || 0,
            equipment: travel.equipment || 0,
            others: travel.others || 0,
            visaDocs: travel.visaDocs || 0,
            travelInsurance: travel.travelInsurance || 0,
          });
        } catch {
          /* travel expense is non-blocking */
        }
      }

      setTyping(false);
      const subtitle = [previewRef.current?.name, previewRef.current?.dates].filter(Boolean).join(' · ');
      const wasUpcoming = previewRef.current?.status === 'upcoming';
      const savedName = previewRef.current?.name;
      await botTurns([{ card: <SavedCard title="Saved!" subtitle={subtitle || 'On your record.'} /> }]);
      resetWork();
      // Upcoming (future, no result yet) → show the upcoming cards, not the medal card.
      if (wasUpcoming) {
        await loadUpcoming();
        // Offer a day-before push reminder (only while permission is undecided).
        await maybeOfferPush(savedName);
      } else {
        // Past result → ask the quick shot review FIRST. The grown player card
        // only appears once the user fills or skips it (askFeedback's onDone),
        // so we don't show the card before the review.
        if (created?._id) {
          await askFeedback(created._id, savedName);
        } else {
          await botSay('Your card just grew', []);
          await loadCard(ROOT_CHIPS);
        }
      }
    } catch (err) {
      setTyping(false);
      track('log_save_failed', { kind: 'new', status: err.response?.status || 0 });
      const errors = err.response?.data?.errors;
      const first = Array.isArray(errors) && errors.length ? errors[0] : err.response?.data?.message;
      await botSay(
        `Almost there — ${first || "something's missing"}. Tell me and I'll fix it.`,
        []
      );
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurns, botSay, hasToken]);

  const onEdit = useCallback(async () => {
    await botSay('Sure — what should I change? Just tell me the corrected detail.', []);
  }, [botSay]);

  // Inline form is now the default save-card view: the user reviews/tweaks the
  // prefilled fields and the primary button saves in one tap. Apply the edits
  // onto the working refs, then run the normal confirm/save path.
  const onSaveAndConfirm = useCallback(async (edited) => {
    applyManualEdit(edited);
    track('confirm_card_edited', {
      categories: edited.categories?.length || 0,
      has_location: Boolean(edited.locationQuery),
      has_travel: Boolean(edited.travel),
    });
    await onConfirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyManualEdit, onConfirm]);

  // ---- saved-tournament manager popup (year + month accordions; edit/delete
  // inline or via type-to-edit). Both "My upcoming" and "My tournaments" open
  // it — mode just controls which month is auto-expanded. ----
  const openManager = useCallback(
    async (mode, autoEditId = null) => {
      try {
        const [tRes, cRes] = await Promise.all([getCompanionTournaments(), getCategoryList()]);
        setManager({
          mode,
          items: tRes.data?.data || [],
          categories: cRes.data?.data || [],
          autoEditId,
        });
      } catch (err) {
        if (err?.response?.status === 401) await botSay(`Sign in and I'll pull up your tournaments`, LOGIN_CHIPS);
        else await botSay('Could not load your tournaments right now.', ROOT_CHIPS);
      }
    },
    [botSay]
  );

  const confirmDeleteTournament = useCallback(
    async (id) => {
      setBusy(true);
      setTyping(true);
      try {
        await deleteTournament(id);
        setTyping(false);
        await botTurns([{ card: <SavedCard title="Deleted" subtitle="Removed from your record." /> }], ROOT_CHIPS);
      } catch (err) {
        setTyping(false);
        if (err?.response?.status === 401) await botSay('Sign in first', LOGIN_CHIPS);
        else await botSay('Could not delete that right now.', ROOT_CHIPS);
      } finally {
        setBusy(false);
      }
    },
    [botTurns, botSay]
  );

  // Seed the in-flight working state from a saved tournament, mark it an edit,
  // and open the confirm card. A free-text correction MERGES onto this record
  // (rawRef = currentForm) and saving writes through PUT.
  const startEditTournament = useCallback(
    async (item) => {
      resetWork();
      editIdRef.current = item.id;
      payloadRef.current = item.payload;
      rawRef.current = item.raw;
      previewRef.current = item.preview;
      pushUser(`✏️ Edit “${item.preview?.name || item.name || 'tournament'}”`);
      await botSay('What should I change? Tell me the corrected detail (date, category, result, entry fee…).', []);
      await showConfirmCard();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pushUser, botSay, showConfirmCard]
  );

  const askDeleteTournament = useCallback(
    async (item) => {
      pushUser(`🗑️ Delete “${item.preview?.name || item.name || 'tournament'}”`);
      await botSay(`Delete “${item.preview?.name || item.name || 'this tournament'}” for good? This can't be undone.`, [
        { id: 'del-yes', action: 'delConfirm', value: item.id, label: '🗑️ Yes, delete' },
        { id: 'del-no', action: 'delCancel', label: 'Cancel' },
      ]);
    },
    [pushUser, botSay]
  );

  // "My upcoming" → render the upcoming cards in chat (edit/delete/share),
  // not the manager popup. ("My tournaments" still opens the popup.)
  const loadUpcoming = useCallback(async () => {
    try {
      const { data } = await getCompanionUpcoming();
      const items = data.data || [];
      await botTurns(
        [
          { text: items.length ? 'Here are your next ones' : "You don't have any upcoming tournaments logged yet." },
          ...(items.length
            ? [{ card: <UpcomingCard items={items} onEdit={startEditTournament} onDelete={askDeleteTournament} /> }]
            : []),
        ],
        ROOT_CHIPS
      );
    } catch (err) {
      if (err?.response?.status === 401) await botSay(`Sign in and I'll show your upcoming tournaments`, LOGIN_CHIPS);
      else await botSay('Could not load your upcoming tournaments right now.', ROOT_CHIPS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurns, botSay, startEditTournament, askDeleteTournament]);

  // ---- conversational router: free text → assist endpoint → act on intent ----
  // (query → answer; spend → spend card; edit → confirm card via PUT;
  //  delete → confirm chips; log → new-tournament parse; clarify → ask back.)
  const runAssist = useCallback(
    async (text) => {
      setBusy(true);
      setTyping(true);
      lastAssistMsgRef.current = text;
      try {
        const { data } = await companionAssist(text);
        const d = data.data || {};
        setTyping(false);
        track('intent_classified', { intent: d.intent || 'unknown' });

        if (d.intent === 'log') {
          // Fresh log → don't merge against any abandoned in-flight draft.
          await runParse(text, { merge: false });
          return;
        }
        if (d.intent === 'spend') {
          await loadSpend(['month', 'year', 'all'].includes(d.period) ? d.period : 'month');
          return;
        }
        if (d.intent === 'edit' && d.confirm) {
          resetWork();
          editIdRef.current = d.confirm.id;
          payloadRef.current = d.confirm.payload;
          rawRef.current = d.confirm.raw;
          previewRef.current = d.confirm.preview;
          await showConfirmCard();
          return;
        }
        if (d.intent === 'delete' && d.target?.id) {
          await botSay(`Delete “${d.target.name || 'this tournament'}” for good? This can't be undone.`, [
            { id: 'del-yes', action: 'delConfirm', value: d.target.id, label: '🗑️ Yes, delete' },
            { id: 'del-no', action: 'delCancel', label: 'Cancel' },
          ]);
          return;
        }
        // query / clarify → plain answer; offer candidate chips when present.
        const cands = Array.isArray(d.candidates) ? d.candidates : [];
        const chips = cands.length
          ? cands.map((name, i) => ({ id: `cand-${i}`, action: 'assistPick', value: name, label: name }))
          : ROOT_CHIPS;
        await botSay(d.answer || "I'm not sure I have that — try rephrasing?", chips);
      } catch (err) {
        setTyping(false);
        const status = err.response?.status;
        track('assist_error', { status: status || 0 });
        if (status === 429) track('rate_limited', { surface: 'assist', authed: true });
        if (status === 429) await botSay(err.response.data?.message || "You've hit the chat limit — try later.", ROOT_CHIPS);
        else if (status === 401) await botSay(`Sign in first and I'll pull that up`, LOGIN_CHIPS);
        else await botSay("Hmm, I couldn't process that just now. Mind trying again?", ROOT_CHIPS);
      } finally {
        setBusy(false);
      }
    },
    // loadSpend is declared below; referenced via closure to avoid the TDZ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runParse, showConfirmCard, botSay]
  );

  // ---- live data surfaces ----
  const loadCard = useCallback(
    async (nextChips) => {
      try {
        const { data } = await getCompanionCard();
        // Same endpoint feeds the header medal tally — refresh it so a newly
        // saved medal shows in the banner without a page reload.
        setCardSummary(data.data ?? null);
        await botTurns(
          [{
            card: (
              <PlayerCard
                card={data.data}
                onUpdated={(patch) => refreshUser?.(patch)}
                onEditWin={(win) => openManager('all', win.tournamentId)}
                onSavedMedal={() => loadCard(nextChips)}
              />
            ),
          }],
          nextChips
        );
      } catch (err) {
        if (err?.response?.status === 401) await botSay(`Sign in and I'll pull up your card`, LOGIN_CHIPS);
        else await botSay('Could not load your card right now.', nextChips);
      }
    },
    // loadCard references itself for the onSavedMedal refresh; deps stay on the
    // stable callbacks to avoid redefining loadCard on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [botTurns, botSay, refreshUser, openManager]
  );

  // After a past result lands, ask the quick shot review and persist the
  // selected wentWell/wentWrong tags onto the tournament. Best-effort; a save
  // failure is surfaced but never blocks the already-saved log.
  const askFeedback = useCallback(
    async (tournamentId, tournamentName) => {
      // Show the grown player card only after the review is filled or skipped.
      const showGrownCard = async () => {
        await botSay('Your card just grew', []);
        await loadCard(ROOT_CHIPS);
      };
      const saveReview = async ({ wentWell, wentWrong }) => {
        try {
          await saveTournamentFeedback(tournamentId, { wentWell, wentWrong });
          track('feedback_saved', {
            well: wentWell.length,
            wrong: wentWrong.length,
          });
        } catch {
          await botSay("Couldn't save that review, but your result is safe.", ROOT_CHIPS);
        }
        await showGrownCard();
      };
      await botTurns(
        [{
          card: (
            <FeedbackCard
              tournamentName={tournamentName}
              onSave={saveReview}
              onSkip={showGrownCard}
            />
          ),
        }],
        ROOT_CHIPS
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [botTurns, botSay, loadCard]
  );

  // Open the premium profile popup for a feed author.
  const openProfile = useCallback(async (userId) => {
    if (!userId) return;
    setProfile({ loading: true, data: null });
    try {
      const { data } = await getPlayer(userId);
      setProfile({ loading: false, data: data.data });
    } catch {
      setProfile({ loading: false, data: null });
    }
  }, []);

  // Community feed opens in a dedicated popup (virtualized list) rather than
  // inline in chat, so a long feed scrolls independently and loads fast.
  const loadFeed = useCallback(
    async (limit = 5) => {
      setFeed((f) => ({ items: f?.items || [], hasMore: f?.hasMore || false, loading: true }));
      try {
        const { data } = await getFeed({ limit });
        setFeed({ items: data.data || [], hasMore: Boolean(data.hasMore), loading: false });
      } catch (err) {
        setFeed(null);
        if (err?.response?.status === 401) await botSay('Sign in to see the community feed', LOGIN_CHIPS);
        else await botSay('Could not load the community feed right now.', ROOT_CHIPS);
      }
    },
    [botSay]
  );

  // Add-expense actions surfaced inside the spend card (empty state + the
  // persistent "+ Add gear expense" button). Routes into the existing flows.
  const onSpendAction = useCallback(
    (action) => {
      if (busy) return;
      track('chip_tapped', { action, source: 'spend_card' });
      if (action === 'gear') {
        pushUser('Add gear expense');
        resetWork();
        gearModeRef.current = true;
        gearPayloadRef.current = null;
        botSay('What gear did you buy, and how much? e.g. “new paddle for 4500” or “court shoes 3200 on June 1”.', []);
      } else if (action === 'log') {
        pushUser('Log a tournament');
        resetWork();
        botSay('Adding an upcoming tournament, or logging one you already played?', [
          { id: 'log-upcoming', action: 'logKind', value: 'upcoming', label: '📅 Upcoming' },
          { id: 'log-past', action: 'logKind', value: 'past', label: '🏆 Already played' },
        ]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, pushUser, botSay]
  );

  // Re-fetch spend for an explicit { year, month } selection (from the card's
  // period selector) and render a fresh spend card. month null = whole year.
  // Defined first so loadSpend can hand it to the card without a TDZ.
  const reloadSpendSelection = useCallback(
    async (selection) => {
      if (busy) return;
      setBusy(true);
      setTyping(true);
      try {
        const { data } = await getCompanionSpend({
          year: selection.year,
          ...(selection.month ? { month: selection.month } : {}),
        });
        const d = data.data;
        spendRef.current = { period: d.selection?.month ? 'month' : 'year', selection: d.selection, data: d };
        track('surface_viewed', { surface: 'spend', reselect: true });
        setTyping(false);
        await botTurns(
          [
            { text: `Here's what you spent · ${d.label}` },
            { card: <ExpenseCard data={d} mode="spend" onSelect={reloadSpendSelection} onAction={onSpendAction} busy={false} /> },
          ],
          [
            { id: 'spend-win', action: 'spendWin', label: `What I won (${d.label})?` },
            { id: 'spend-skip', action: 'spendSkip', label: 'No thanks' },
          ]
        );
      } catch (err) {
        setTyping(false);
        if (err?.response?.status === 401) await botSay(`Sign in and I'll add up your spending`, LOGIN_CHIPS);
        else await botSay('Could not load your spending right now.', ROOT_CHIPS);
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, botTurns, botSay, onSpendAction]
  );

  // Step 1: per-tournament spend (entry + travel) for the default (current
  // month) view. The card's selector lets the user pick any year/month, which
  // routes through reloadSpendSelection. Then offer the winnings step.
  const loadSpend = useCallback(
    async (period = 'month') => {
      try {
        const { data } = await getCompanionSpend(period);
        const d = data.data;
        spendRef.current = { period, selection: d.selection, data: d };
        await botTurns(
          [
            { text: `Here's what you spent · ${d.label}` },
            { card: <ExpenseCard data={d} mode="spend" onSelect={reloadSpendSelection} onAction={onSpendAction} busy={false} /> },
          ],
          [
            { id: 'spend-win', action: 'spendWin', label: `What I won (${d.label})?` },
            { id: 'spend-skip', action: 'spendSkip', label: 'No thanks' },
          ]
        );
      } catch (err) {
        if (err?.response?.status === 401) await botSay(`Sign in and I'll add up your spending`, LOGIN_CHIPS);
        else await botSay('Could not load your spending right now.', ROOT_CHIPS);
      }
    },
    [botTurns, botSay, reloadSpendSelection, onSpendAction]
  );

  // Step 2: per-tournament winnings for the same period. Then offer the net step.
  const loadSpendWinnings = useCallback(async () => {
    const s = spendRef.current;
    if (!s) {
      await botSay('Ask me about your spending first.', ROOT_CHIPS);
      return;
    }
    const phrase = s.data?.label || periodPhrase(s.period);
    await botTurns(
      [
        { text: `Here's what you won · ${phrase}` },
        { card: <ExpenseCard data={s.data} mode="winnings" /> },
      ],
      [
        { id: 'spend-net', action: 'spendNet', label: '📉 Net after entry fees?' },
        { id: 'spend-skip', action: 'spendSkip', label: 'No thanks' },
      ]
    );
  }, [botTurns, botSay]);

  // Step 3: net = winnings − entry fees.
  const loadSpendNet = useCallback(async () => {
    const s = spendRef.current;
    if (!s) {
      await botSay('Ask me about your spending first.', ROOT_CHIPS);
      return;
    }
    await botTurns(
      [
        { text: 'Winnings minus entry fees' },
        { card: <ExpenseCard data={s.data} mode="net" /> },
      ],
      ROOT_CHIPS
    );
  }, [botTurns, botSay]);

  // ---- push reminders: offer once after an upcoming log; the day-before ping
  // itself is sent server-side (pushReminder cron → runPushReminders). ----
  const onEnablePush = useCallback(async () => {
    pushUser('🔔 Yes, remind me');
    const ok = await requestAndSubscribe();
    if (ok) {
      await botSay("Done! I'll ping you 1 day before so you never miss check-in. 🔔", ROOT_CHIPS);
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      await botSay(
        `Looks like notifications are blocked for this site. Enable them in your browser settings and I'll remind you.`,
        ROOT_CHIPS
      );
    } else {
      await botSay("Couldn't turn that on just now — no worries, you can enable it later.", ROOT_CHIPS);
    }
  }, [pushUser, botSay, requestAndSubscribe]);

  const onSkipPush = useCallback(async () => {
    pushUser('Not now');
    await botSay('No problem 👍', ROOT_CHIPS);
  }, [pushUser, botSay]);

  // Show the reminder offer only while the permission is undecided ('default').
  // Granted → already subscribed, server reminds; denied → browser won't reprompt.
  const maybeOfferPush = useCallback(async (name) => {
    if (!pushSupported) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    await botTurns([
      { card: <ReminderPrompt tournamentName={name} onEnable={onEnablePush} onSkip={onSkipPush} /> },
    ]);
  }, [pushSupported, botTurns, onEnablePush, onSkipPush]);

  // ---- gear expense: free text → preview → write through /api/expenses ----
  const onConfirmGear = useCallback(async () => {
    const payload = gearPayloadRef.current;
    if (!payload) return;
    setBusy(true);
    setTyping(true);
    try {
      await createExpense(payload);
      track('gear_saved', { amount: Number(payload.amount) || 0 });
      setTyping(false);
      gearModeRef.current = false;
      gearPayloadRef.current = null;
      await botTurns(
        [{ card: <SavedCard title="Gear added!" subtitle={`${payload.title} · ${formatMoney(payload.amount)}`} /> }],
        ROOT_CHIPS
      );
    } catch (err) {
      setTyping(false);
      const errors = err.response?.data?.errors;
      const first = Array.isArray(errors) && errors.length ? errors[0] : err.response?.data?.message;
      await botSay(`Couldn't save that — ${first || 'something went wrong'}. Tell me the item and price again.`, []);
    } finally {
      setBusy(false);
    }
  }, [botTurns, botSay]);

  const onEditGear = useCallback(async () => {
    gearModeRef.current = true;
    await botSay('Sure — tell me the corrected item, price, or date.', []);
  }, [botSay]);

  const runGearParse = useCallback(
    async (text) => {
      setBusy(true);
      setTyping(true);
      try {
        const { data } = await companionParseGear(text);
        const { preview, payload } = data.data;
        gearPayloadRef.current = payload;
        setTyping(false);
        // Need both an item and a price before we can save.
        if (!preview.title || !preview.amount) {
          gearModeRef.current = true;
          await botSay(
            "Got it — tell me both the item and the price, e.g. “new paddle for 4500”.",
            []
          );
          return;
        }
        gearModeRef.current = false;
        await botTurns([
          { text: "Here's the gear I'll add to your spending" },
          {
            card: (
              <GearPreviewCard data={preview} onConfirm={onConfirmGear} onEdit={onEditGear} />
            ),
          },
        ]);
      } catch (err) {
        setTyping(false);
        gearModeRef.current = false;
        const status = err.response?.status;
        if (status === 429) await botSay(err.response.data?.message || "You've hit the chat limit — try later.", ROOT_CHIPS);
        else if (status === 401) await botSay('Sign in first so I can save your gear.', LOGIN_CHIPS);
        else await botSay("Hmm, I couldn't read that just now. Mind trying again?", ROOT_CHIPS);
      } finally {
        setBusy(false);
      }
    },
    [botTurns, botSay, onConfirmGear, onEditGear]
  );

  // ---- input handlers ----
  const onPickChip = useCallback(
    (chip) => {
      if (busy) return;
      if (chip.action === 'install') {
        startInstall();
        return;
      }
      if (chip.action === 'login') {
        setAuthMode('login');
        return;
      }
      if (chip.action === 'amb') {
        pushUser(chip.label);
        if (chip.kind === 'facet') narrowAmbiguity(chip);
        else resolveAmbiguity(chip.value);
        return;
      }
      // Delete confirm/cancel (raised by the assist router) — handle before the
      // generic pushUser path.
      if (chip.action === 'delConfirm') {
        confirmDeleteTournament(chip.value);
        return;
      }
      if (chip.action === 'delCancel') {
        pushUser(chip.label);
        botSay('Okay, kept it 👍', ROOT_CHIPS);
        return;
      }
      // Disambiguation candidate tapped → re-ask the router with the picked name
      // appended to the original message so the intent is preserved.
      if (chip.action === 'assistPick') {
        pushUser(chip.label);
        runAssist(`${lastAssistMsgRef.current} — ${chip.value}`);
        return;
      }
      // Log flow fork: user picked Upcoming vs Past — prime the right prompt.
      // The parser still auto-detects status from the date/result.
      if (chip.action === 'logKind') {
        pushUser(chip.label);
        resetWork();
        botSay(
          chip.value === 'upcoming'
            ? 'Nice — tell me the tournament name, your category, and the date. e.g. “Mumbai Open, mixed doubles, June 24, entry 500”.'
            : LOG_PROMPT,
          []
        );
        return;
      }
      // Read surfaces need an account — nudge anon to sign in instead of 401ing.
      const READ_ACTIONS = ['upcoming', 'tournaments', 'card', 'spend', 'spendWin', 'spendNet', 'feed', 'calendar', 'dashboard', 'coach', 'gear'];
      if (!hasToken && READ_ACTIONS.includes(chip.action)) {
        pushUser(chip.label);
        botSay(`Sign in and I'll pull that up for you`, LOGIN_CHIPS);
        return;
      }
      pushUser(chip.label);
      track('chip_tapped', { action: chip.action });
      // Read surfaces double as "view" events for the product funnel.
      if (['card', 'upcoming', 'spend', 'feed', 'tournaments', 'calendar', 'dashboard', 'coach'].includes(chip.action)) {
        track('surface_viewed', { surface: chip.action });
      }
      // Any root action cancels a half-started gear flow (the gear branch
      // re-arms it below).
      gearModeRef.current = false;
      gearPayloadRef.current = null;
      if (chip.action === 'log') {
        resetWork();
        botSay('Adding an upcoming tournament, or logging one you already played?', [
          { id: 'log-upcoming', action: 'logKind', value: 'upcoming', label: '📅 Upcoming' },
          { id: 'log-past', action: 'logKind', value: 'past', label: '🏆 Already played' },
        ]);
      } else if (chip.action === 'upcoming') {
        loadUpcoming();
      } else if (chip.action === 'tournaments') {
        openManager('all');
      } else if (chip.action === 'card') {
        loadCard(ROOT_CHIPS);
      } else if (chip.action === 'spend') {
        loadSpend('month');
      } else if (chip.action === 'spendWin') {
        loadSpendWinnings();
      } else if (chip.action === 'spendNet') {
        loadSpendNet();
      } else if (chip.action === 'spendSkip') {
        botSay('Anytime 👍', ROOT_CHIPS);
      } else if (chip.action === 'feed') {
        loadFeed();
      } else if (chip.action === 'calendar') {
        setCalendarOpen(true);
        botSay('Opening your calendar 📆', ROOT_CHIPS);
      } else if (chip.action === 'dashboard') {
        setDashboardOpen(true);
        botSay('Opening your dashboard 📊', ROOT_CHIPS);
      } else if (chip.action === 'coach') {
        setCoachOpen(true);
        botSay('Opening Coach Hub', ROOT_CHIPS);
      } else if (chip.action === 'gear') {
        resetWork();
        gearModeRef.current = true;
        gearPayloadRef.current = null;
        botSay('What gear did you buy, and how much? e.g. “new paddle for 4500” or “court shoes 3200 on June 1”.', []);
      }
    },
    [busy, hasToken, pushUser, resolveAmbiguity, narrowAmbiguity, botSay, openManager, loadUpcoming, confirmDeleteTournament, runAssist, loadCard, loadSpend, loadSpendWinnings, loadSpendNet, loadFeed, startInstall]
  );

  const onSend = useCallback(
    (text) => {
      if (busy) return;
      pushUser(text);
      track('message_sent', {
        length: text.length,
        authed: hasToken,
        mode: gearModeRef.current ? 'gear' : pendingRef.current ? 'gapfill' : payloadRef.current ? 'mid_log' : 'free',
      });

      // Gear-logging flow takes priority over the tournament parser/router.
      if (gearModeRef.current) {
        runGearParse(text);
        return;
      }

      const pending = pendingRef.current;
      if (pending) {
        const idx = pending.idx;
        // Category and date need LLM normalization (enum match / date parsing),
        // so the answer goes back through the merge parser, which re-runs the
        // gap-filler when it returns.
        if (pending.kind === 'category' || pending.kind === 'date') {
          pendingRef.current = null;
          runParse(text);
          return;
        }
        // Name, entry fee, and prize we can set directly.
        if (pending.kind === 'name') {
          const name = text.trim();
          if (!name) {
            botSay('Just type the tournament name — e.g. “Mumbai Open”.', []);
            return;
          }
          if (payloadRef.current) payloadRef.current.name = name;
          if (previewRef.current) previewRef.current.name = name;
          if (rawRef.current) rawRef.current.name = name;
        } else {
          const amt = parsePrize(text);
          if (amt == null) {
            botSay('Just need a number — e.g. 400, or 0.', []);
            return;
          }
          const field = pending.kind === 'entryFee' ? 'entryFee' : 'prizeAmount';
          if (payloadRef.current?.categories?.[idx]) payloadRef.current.categories[idx][field] = amt;
          if (rawRef.current?.categories?.[idx]) rawRef.current.categories[idx][field] = amt;
          // The confirm card renders from previewRef — keep it in sync so the
          // answer shows in the Review & save form (entry fee / prize won).
          if (previewRef.current?.categories?.[idx]) previewRef.current.categories[idx][field] = amt;
        }
        pendingRef.current = null;
        askNextMissing();
        return;
      }

      // Mid-log: a correction to the in-flight draft MERGES via the parser.
      if (payloadRef.current) {
        runParse(text);
        return;
      }
      // Anonymous visitors stay on the try-before-auth log path (assist is
      // authed-only) — a fresh log, so no merge against stale drafts.
      if (!hasToken) {
        runParse(text, { merge: false });
        return;
      }
      runAssist(text);
    },
    [busy, hasToken, pushUser, botSay, runParse, runAssist, runGearParse, askNextMissing]
  );

  // ---- post-auth handoff ----
  // Runs once when the user becomes authenticated (inline popup OR mobile
  // Google redirect return). If a pre-auth log was stashed, restore it and show
  // the confirm card so the visitor finalizes the save in one tap. Otherwise
  // just unlock the full chip set for the now-signed-in user.
  const authHandledRef = useRef(false);
  useEffect(() => {
    if (authHandledRef.current) return;
    if (!user || !localStorage.getItem('token')) return;
    authHandledRef.current = true;
    setAuthMode(null);
    track('authed_in_chat', {
      kind: signupRef.current || user?.isNewUser ? 'signup' : 'login',
      had_pending_log: Boolean(localStorage.getItem(PENDING_LOG_KEY)),
    });

    // Fresh sign-up → ask for notification permission straight away. signupRef
    // covers email sign-up (set by AuthSheet); user.isNewUser covers a brand-new
    // Google account (set in completeGoogleLogin, desktop + mobile redirect).
    if (signupRef.current || user?.isNewUser) {
      signupRef.current = false;
      // Consume the persisted Google new-user flag so a page reload (e.g. after
      // dismissing the prompt) doesn't ask again.
      if (user?.isNewUser) {
        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          delete stored.isNewUser;
          localStorage.setItem('user', JSON.stringify(stored));
        } catch { /* ignore */ }
      }
      if (pushSupported && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        requestAndSubscribe();
      }
    }

    const raw = localStorage.getItem(PENDING_LOG_KEY);
    if (raw) {
      localStorage.removeItem(PENDING_LOG_KEY);
      let pending;
      try {
        pending = JSON.parse(raw);
      } catch {
        pending = null;
      }
      if (pending?.payload) {
        payloadRef.current = pending.payload;
        travelRef.current = pending.travel || null;
        previewRef.current = pending.preview || null;
        rawRef.current = null;
        (async () => {
          pushUser('Signed in — save my tournament');
          const name = pending.preview?.name;
          await botSay(`Welcome back! Ready to save ${name ? `“${name}”` : 'your tournament'}`, []);
          await showConfirmCard();
        })();
        return;
      }
    }
    // No pending log — just make sure the authed user has the full chip set.
    setChips(ROOT_CHIPS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ---- welcome-screen handlers ----
  const onExample = useCallback((text) => setDraft(text), []);

  const onHeroAction = useCallback(
    (action) => {
      const chip = ROOT_CHIPS.find((c) => c.action === action) || LOGIN_CHIPS[0];
      onPickChip(chip);
    },
    [onPickChip]
  );

  return (
    <div
      className="erne-app"
      style={{ minHeight: '100dvh', height: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      <header className="erne-header" style={{ position: 'relative' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <BallMark size={28} />
          <Wordmark size={18} />
        </span>

        {hasToken && progress?.level != null && (() => {
          const lvl = progress.level;
          const isMax = progress.nextLevelXP <= progress.currentLevelXP;
          const span = progress.nextLevelXP - progress.currentLevelXP;
          const pct = isMax
            ? 100
            : Math.max(0, Math.min(100, Math.round(((progress.xp - progress.currentLevelXP) / span) * 100)));
          const toNext = isMax ? 0 : Math.max(0, progress.nextLevelXP - progress.xp);
          return (
            <>
              {levelOpen && (
                <div onClick={() => setLevelOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              )}
              <div
                style={{
                  position: 'relative',
                  zIndex: 41,
                }}
              >
              <button
                type="button"
                onClick={() => setLevelOpen((o) => !o)}
                title="Your rewards level"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--accent)',
                  background: 'var(--accent-soft)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.85 }}>Level</span>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{lvl}</span>
              </button>

              {levelOpen && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 41,
                      width: 244,
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 16,
                      boxShadow: '0 12px 32px rgba(20,22,15,0.18)',
                      padding: 14,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 800, fontSize: 14 }}>{progress.levelTitle || `Level ${lvl}`}</span>
                      <span style={{ color: 'var(--ink)', fontWeight: 800, fontSize: 12 }}>Lv {lvl}</span>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        height: 8,
                        borderRadius: 999,
                        background: 'var(--line)',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
                    </div>

                    <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 700 }}>
                      <span>Lv {lvl}</span>
                      <span>{isMax ? 'Max' : `Lv ${lvl + 1}`}</span>
                    </div>

                    <p style={{ margin: '10px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-soft)', fontWeight: 500 }}>
                      {isMax
                        ? "Top level reached — you've maxed out the rewards ladder."
                        : `${toNext.toLocaleString()} XP to Level ${lvl + 1}. Earn XP by logging tournaments, winning medals, and staying active.`}
                    </p>
                  </div>
                </>
              )}
              </div>
            </>
          );
        })()}

        {!hasToken && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--ink)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '7px 10px',
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--accent-text)',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                padding: '7px 14px',
              }}
            >
              Sign up
            </button>
          </div>
        )}

        {hasToken && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell />
            <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
              className="erne-iconbtn"
            >
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt=""
                  className="erne-headava"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span className="erne-headava">
                  {(user?.name || 'U').trim().charAt(0).toUpperCase()}
                </span>
              )}
            </button>

            {menuOpen && (
                <div className="erne-menu" style={{ right: 0, left: 'auto' }}>
                  <button
                    type="button"
                    className="erne-menu-item"
                    onClick={() => { setMenuOpen(false); setSupportOpen(true); }}
                  >
                    <Icon name="feed" size={17} /> Support
                  </button>
                  <button
                    type="button"
                    className="erne-menu-item"
                    onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}
                  >
                    <Icon name="settings" size={17} /> Settings
                  </button>
                  <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
                  <div className="erne-menu-label">Help</div>
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="erne-menu-item"
                    style={{ textDecoration: 'none', display: 'flex' }}
                  >
                    <Icon name="idcard" size={17} /> Privacy Policy
                  </a>
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="erne-menu-item"
                    style={{ textDecoration: 'none', display: 'flex' }}
                  >
                    <Icon name="idcard" size={17} /> Terms of Service
                  </a>
                  {isAdmin && (
                    <>
                      <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
                      <a
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="erne-menu-item"
                        style={{ textDecoration: 'none', display: 'flex' }}
                      >
                        <Icon name="settings" size={17} /> Admin
                      </a>
                    </>
                  )}
                  <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
                  <button
                    type="button"
                    onClick={onLogout}
                    className="erne-menu-item"
                    style={{ color: '#C0492F' }}
                  >
                    <Icon name="logout" size={17} color="#C0492F" /> Log out
                  </button>
                </div>
            )}
            </div>
          </div>
        )}
      </header>

      <InstallTopBanner onInstall={startInstall} />

      {hasToken && cardSummary && (() => {
        const m = cardSummary.medals || {};
        const initial = (cardSummary.name || user?.name || 'U').trim().charAt(0).toUpperCase();
        return (
          <button
            type="button"
            className="erne-statstrip"
            onClick={() => { if (!busy) onPickChip({ action: 'card', label: 'My card' }); }}
            title="Open my card"
          >
            {cardSummary.profilePhoto ? (
              <img src={cardSummary.profilePhoto} alt="" className="erne-headava sm" style={{ objectFit: 'cover' }} />
            ) : (
              <span className="erne-headava sm">{initial}</span>
            )}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>
              {cardSummary.name || user?.name || 'You'}
            </span>
            <span className="erne-strip-sep" />
            <span className="erne-strip-stat"><MedalDot medal="gold" size={16} /> {m.gold || 0}</span>
            <span className="erne-strip-stat"><MedalDot medal="silver" size={16} /> {m.silver || 0}</span>
            <span className="erne-strip-stat"><MedalDot medal="bronze" size={16} /> {m.bronze || 0}</span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {cardSummary.streak > 0 && (
                <span className="erne-strip-stat" style={{ color: 'var(--ink)' }}>
                  <Icon name="flame" size={15} color="var(--accent)" /> {cardSummary.streak}
                </span>
              )}
              <Icon name="chevron" size={16} color="var(--ink-soft)" />
            </span>
          </button>
        );
      })()}

      {started ? (
        <ChatStream messages={messages} typing={typing} />
      ) : (
        <WelcomeHero
          onExample={onExample}
          onAction={onHeroAction}
          hasToken={hasToken}
          disabled={busy}
        />
      )}

      {/* Composer wrap: contextual chips + composer row (+ button opens CommandDeck) */}
      <div className="erne-composer-wrap">
        {/* Contextual chips (ambiguity, confirm, spend follow-ups, login) take over
            the row mid-flow; otherwise show the persistent quick-access chips. The
            full action list lives in the + Command Deck. */}
        {chips.length > 0 && !chips.some((c) => typeof c.id === 'string' && c.id.startsWith('root-')) ? (
          <GuidedChips chips={chips} onPick={onPickChip} disabled={typing || busy} />
        ) : (
          <GuidedChips chips={hasToken ? QUICK_CHIPS : ANON_QUICK} onPick={onPickChip} disabled={typing || busy} />
        )}
        <Composer
          onSend={onSend}
          disabled={typing || busy}
          value={draft}
          onChange={setDraft}
          autoFocus={!started && draft.length > 0}
          onOpenDeck={hasToken ? () => setDeckOpen(true) : undefined}
        />
      </div>

      {/* Command Deck — bottom sheet for root actions (replaces RadialDock) */}
      {hasToken && (
        <CommandDeck
          chips={dockChips}
          onPick={onPickChip}
          disabled={typing || busy}
          open={deckOpen}
          onClose={() => setDeckOpen(false)}
        />
      )}

      {profile && (
        <ProfilePopup
          player={profile.data}
          loading={profile.loading}
          onClose={() => setProfile(null)}
        />
      )}

      {manager && (
        <TournamentManager
          initialItems={manager.items}
          mode={manager.mode}
          categories={manager.categories}
          autoEditId={manager.autoEditId}
          onClose={() => setManager(null)}
          onChanged={(items) => setManager((m) => (m ? { ...m, items } : m))}
        />
      )}

      {feed && (
        <FeedPopup
          items={feed.items}
          hasMore={feed.hasMore}
          loading={feed.loading}
          currentUserId={user?.id}
          onViewProfile={openProfile}
          onViewAll={() => loadFeed(50)}
          onClose={() => setFeed(null)}
        />
      )}

      {calendarOpen && (
        <PageOverlay title="Calendar" onClose={() => setCalendarOpen(false)}>
          <Calendar />
        </PageOverlay>
      )}
      {dashboardOpen && (
        <PageOverlay title="Dashboard" onClose={() => setDashboardOpen(false)}>
          <Dashboard />
        </PageOverlay>
      )}
      {coachOpen && (
        <PageOverlay title="Coach Hub" onClose={() => setCoachOpen(false)}>
          <CoachHub />
        </PageOverlay>
      )}

      {supportOpen && <SupportPopup onClose={() => setSupportOpen(false)} />}
      {settingsOpen && (
        <SettingsPopup
          user={user}
          refreshUser={refreshUser}
          onClose={() => setSettingsOpen(false)}
          onDeleted={() => {
            setSettingsOpen(false);
            onLogout();
          }}
        />
      )}

      {showInstallSteps && (
        <InstallStepsModal browserType={installBrowser} onClose={() => setShowInstallSteps(false)} />
      )}

      {authMode && !hasToken && (
        <AuthSheet
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onAuthed={(info) => {
            if (info?.isSignup) signupRef.current = true;
            setAuthMode(null);
          }}
        />
      )}
    </div>
  );
}

// Full-screen overlay that hosts an existing app page (Calendar / Dashboard)
// on top of the chat. The page renders unchanged; we just add a sticky bar
// with a title and a close button, on the page's own light theme.
function PageOverlay({ title, onClose, children }) {
  // No Esc-to-close here: the reused pages have their own Esc-closable modals,
  // and a shared handler would close both at once. Use the ✕ button instead.
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        // Below the reused pages' portaled modals (Tailwind z-50) so their
        // popups (e.g. CoachHub's add-slot / detail modals) render on top and
        // stay clickable, not trapped behind this overlay.
        zIndex: 45,
        background: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#16180F',
          color: '#FBFAF4',
          borderBottom: '1px solid #2C2E22',
        }}
      >
        <span style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontWeight: 800, fontSize: 16, color: '#FBFAF4' }}>{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #2C2E22',
            background: 'transparent',
            color: '#FBFAF4',
            fontSize: 18,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </div>
  );
}
