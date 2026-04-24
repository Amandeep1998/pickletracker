import { useState, useEffect } from 'react';
import LocationAutocomplete from './LocationAutocomplete';
import { getCurrencySymbol } from '../utils/format';
import useCurrency from '../hooks/useCurrency';

const SKILL_TAGS = [
  'Serve', 'Return of serve', 'Third shot drop', 'Third shot drive',
  'Dinking', 'Backhand', 'Forehand', 'Volleys', 'Lob', 'Reset',
  'Poaching', 'Speed-up', 'Erne', 'Drop shot', 'Kitchen play',
  'Transition zone', 'Movement', 'Stamina', 'Communication',
  'Patience', 'Aggression', 'Mental focus', 'Stacking',
];

const DRILL_FOCUS_TAGS = [
  'Third Shot Drop',
  'Third Shot Drive',
  'Dinking',
  'Reset & Defense',
  'Serving & Return',
  'Volleys & Hands',
  'Kitchen (NVZ) Play',
  'Transition Zone',
  'Footwork & Movement',
  'Speed-ups & Attacks',
  'Lob & Overhead',
  'Point Play / Scenarios',
  'Ball Machine / Multi-ball',
];

const SESSION_TYPES = [
  { value: 'casual',   label: 'Casual Play', icon: '🎾', desc: 'Recreational / court booking' },
  { value: 'practice', label: 'Drill',        icon: '🎯', desc: 'Structured practice' },
];

// Legacy option: surfaced only when editing a pre-existing session saved as 'tournament'
const LEGACY_TOURNAMENT_TYPE = { value: 'tournament', label: 'Tournament', icon: '🏆', desc: 'Competitive event (legacy)' };

const RATINGS = [
  { value: 1, emoji: '😫', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Poor' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'On fire!' },
];

const PLAY_FORMATS = [
  { value: 'singles', label: 'Singles',     icon: '🧍' },
  { value: 'doubles', label: 'Doubles',     icon: '👥' },
  { value: 'both',    label: 'Played Both', icon: '↔️' },
];

const DRILL_MODES = [
  { value: 'solo',    label: 'Solo',           icon: '🧍' },
  { value: 'partner', label: 'With Partner',   icon: '🤝' },
  { value: 'group',   label: 'Group / Clinic', icon: '👥' },
];

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_TRAVEL = {
  fromCity: '',
  toCity: '',
  isInternational: false,
  transport: '',
  localCommute: '',
  accommodation: '',
  food: '',
  equipment: '',
  others: '',
  visaDocs: '',
  travelInsurance: '',
};

const EMPTY = {
  type: 'casual',
  date: today(),
  location: null,
  courtFee: '',
  rating: null,
  notes: '',
  // casual-only
  playFormat: null,
  wentWell: [],
  wentWrong: [],
  // drill-only
  drillFocus: [],
  drillMode: null,
  coached: false,
  duration: '',
};

export default function SessionForm({ initial, onSubmit, onCancel, loading }) {
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [travelOpen, setTravelOpen] = useState(false);
  const [travel, setTravel] = useState({ ...EMPTY_TRAVEL });

  const travelTotal = travelOpen
    ? (Number(travel.transport) || 0) +
      (Number(travel.localCommute) || 0) +
      (Number(travel.accommodation) || 0) +
      (Number(travel.food) || 0) +
      (Number(travel.equipment) || 0) +
      (Number(travel.others) || 0) +
      (Number(travel.visaDocs) || 0) +
      (Number(travel.travelInsurance) || 0)
    : 0;

  const handleTravelChange = (field, value) => setTravel((p) => ({ ...p, [field]: value }));

  const toggleTravel = () => {
    if (travelOpen) setTravel({ ...EMPTY_TRAVEL });
    setTravelOpen((o) => !o);
  };

  useEffect(() => {
    if (initial) {
      setForm({
        type:       initial.type       || 'casual',
        date:       initial.date       || today(),
        location:   initial.location   || null,
        courtFee:   initial.courtFee   || '',
        rating:     initial.rating     || null,
        notes:      initial.notes      || '',
        playFormat: initial.playFormat || null,
        wentWell:   initial.wentWell   || [],
        wentWrong:  initial.wentWrong  || [],
        drillFocus: initial.drillFocus || [],
        drillMode:  initial.drillMode  || null,
        coached:    initial.coached    || false,
        duration:   initial.duration   || '',
      });
      const te = initial?.travelExpense;
      if (te && te.total > 0) {
        setTravelOpen(true);
        setTravel({
          fromCity:        te.fromCity        || '',
          toCity:          te.toCity          || '',
          isInternational: te.isInternational || false,
          transport:       te.transport       || '',
          localCommute:    te.localCommute    || '',
          accommodation:   te.accommodation   || '',
          food:            te.food            || '',
          equipment:       te.equipment       || '',
          others:          te.others          || '',
          visaDocs:        te.visaDocs        || '',
          travelInsurance: te.travelInsurance || '',
        });
      } else {
        setTravelOpen(false);
        setTravel({ ...EMPTY_TRAVEL });
      }
    }
  }, [initial]);

  const isDrill   = form.type === 'practice';
  const isCasual  = form.type === 'casual' || form.type === 'tournament';

  const toggleTag = (field, tag) => {
    setForm((prev) => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
      };
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.rating) errs.rating = 'Please rate your session';
    if (!form.date)   errs.date   = 'Date is required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const formEl = e.currentTarget;
      requestAnimationFrame(() => {
        for (const key of Object.keys(errs)) {
          const el = formEl.querySelector(`[data-error-key="${key}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const focusable = el.querySelector('input, textarea, select, button');
            focusable?.focus?.({ preventScroll: true });
            break;
          }
        }
      });
      return;
    }

    const payload = {
      type:     form.type,
      date:     form.date,
      location: form.location || undefined,
      courtFee: form.courtFee !== '' ? Number(form.courtFee) : 0,
      rating:   form.rating,
      notes:    form.notes.trim(),
      travelExpense: travelOpen && travelTotal > 0 ? {
        fromCity:        travel.fromCity.trim(),
        toCity:          travel.toCity.trim(),
        isInternational: travel.isInternational,
        transport:       Number(travel.transport)       || 0,
        localCommute:    Number(travel.localCommute)    || 0,
        accommodation:   Number(travel.accommodation)   || 0,
        food:            Number(travel.food)            || 0,
        equipment:       Number(travel.equipment)       || 0,
        others:          Number(travel.others)          || 0,
        visaDocs:        Number(travel.visaDocs)        || 0,
        travelInsurance: Number(travel.travelInsurance) || 0,
        total:           travelTotal,
      } : null,
    };

    if (isCasual) {
      payload.playFormat = form.playFormat || undefined;
      payload.wentWell   = form.wentWell;
      payload.wentWrong  = form.wentWrong;
    }

    if (isDrill) {
      payload.drillFocus = form.drillFocus;
      payload.drillMode  = form.drillMode  || undefined;
      payload.coached    = form.coached;
      payload.duration   = form.duration ? Number(form.duration) : undefined;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 relative">

      {/* Saving overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-7 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#91BE4D]/30 border-t-[#91BE4D] animate-spin" />
            <p className="text-sm font-semibold text-gray-800">Saving session…</p>
            <p className="text-xs text-gray-400">Just a moment</p>
          </div>
        </div>
      )}

      {/* ── Session type ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Session type</p>
        <div className={`grid gap-2 ${form.type === 'tournament' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {(form.type === 'tournament' ? [...SESSION_TYPES, LEGACY_TOURNAMENT_TYPE] : SESSION_TYPES).map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setForm((p) => ({ ...p, type: t.value }))}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                form.type === t.value
                  ? 'border-[#91BE4D] bg-[#91BE4D]/8'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className={`text-xs font-bold leading-tight ${form.type === t.value ? 'text-[#4a6e10]' : 'text-gray-700'}`}>
                {t.label}
              </span>
              <span className="text-[10px] text-gray-400 leading-tight hidden sm:block">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CASUAL: format ── */}
      {isCasual && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Format <span className="text-gray-400 font-normal normal-case">(optional)</span>
          </p>
          <div className="flex gap-2">
            {PLAY_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, playFormat: p.playFormat === f.value ? null : f.value }))}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-center transition-all ${
                  form.playFormat === f.value
                    ? 'border-[#91BE4D] bg-[#91BE4D]/8'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{f.icon}</span>
                <span className={`text-xs font-bold leading-tight ${form.playFormat === f.value ? 'text-[#4a6e10]' : 'text-gray-700'}`}>
                  {f.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── DRILL: focus + mode + coached + duration ── */}
      {isDrill && (
        <>
          {/* What did you drill? */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              What did you drill? <span className="text-gray-400 font-normal normal-case">(tap to select, optional)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DRILL_FOCUS_TAGS.map((tag) => {
                const selected = form.drillFocus.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag('drillFocus', tag)}
                    className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${
                      selected
                        ? 'bg-[#91BE4D] border-[#91BE4D] text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-[#91BE4D] hover:text-[#4a6e10]'
                    }`}
                  >
                    {selected && '✓ '}{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* How did you drill? */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              How did you drill? <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </p>
            <div className="flex gap-2">
              {DRILL_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, drillMode: p.drillMode === m.value ? null : m.value }))}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-center transition-all ${
                    form.drillMode === m.value
                      ? 'border-[#91BE4D] bg-[#91BE4D]/8'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className={`text-xs font-bold leading-tight ${form.drillMode === m.value ? 'text-[#4a6e10]' : 'text-gray-700'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Coached + Duration */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Coached toggle */}
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Coach-led?</p>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, coached: !p.coached }))}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  form.coached
                    ? 'border-[#91BE4D] bg-[#91BE4D]/8 text-[#4a6e10]'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="text-lg">👨‍🏫</span>
                {form.coached ? '✓ Yes, coached session' : 'No coach'}
              </button>
            </div>

            {/* Duration */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Duration (mins) <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                step="5"
                value={form.duration}
                onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                placeholder="e.g. 60"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
              />
            </div>
          </div>
        </>
      )}

      {/* ── Date + Location (shared) ── */}
      <div className="grid grid-cols-2 gap-3">
        <div data-error-key="date">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => { setForm((p) => ({ ...p, date: e.target.value })); setErrors((e2) => ({ ...e2, date: '' })); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Location <span className="text-gray-400 font-normal normal-case">(optional)</span>
          </label>
          <LocationAutocomplete
            value={form.location}
            onSelect={(place) => setForm((p) => ({ ...p, location: place }))}
            onClear={() => setForm((p) => ({ ...p, location: null }))}
          />
        </div>
      </div>

      {/* ── Court fee (shared) ── */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Court Fee ({symbol}) <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={form.courtFee}
          onChange={(e) => setForm((p) => ({ ...p, courtFee: e.target.value }))}
          placeholder="0"
          className="w-full sm:w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
        />
        <p className="text-[11px] text-gray-400 mt-1">What you paid to book the court for this session</p>
      </div>

      {/* ── Travel expenses (shared) ── */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Travel Expenses</span>
            <span className="text-gray-400 text-xs font-normal normal-case">(optional)</span>
          </div>
          <div className="flex items-center gap-2">
            {travelOpen && travelTotal > 0 && (
              <span className="text-xs font-semibold text-blue-600">{symbol}{travelTotal}</span>
            )}
            <button
              type="button"
              onClick={toggleTravel}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                travelOpen
                  ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
                  : 'border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100'
              }`}
            >
              {travelOpen ? 'Remove' : '+ Add'}
            </button>
          </div>
        </div>

        {travelOpen && (
          <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-3">
            <p className="text-[11px] text-blue-500 leading-relaxed">
              Break down your trip costs — transport, food, accommodation and more.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From City</label>
                <input
                  type="text"
                  value={travel.fromCity}
                  onChange={(e) => handleTravelChange('fromCity', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                  placeholder="e.g. Mumbai"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To City</label>
                <input
                  type="text"
                  value={travel.toCity}
                  onChange={(e) => handleTravelChange('toCity', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                  placeholder="e.g. Delhi"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                checked={travel.isInternational}
                onChange={(e) => handleTravelChange('isInternational', e.target.checked)}
                className="accent-blue-500 w-3.5 h-3.5"
              />
              International trip
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { field: 'transport',    label: 'Transport',           hint: 'Flight / Train / Bus / Fuel' },
                { field: 'localCommute', label: 'Local Commute',       hint: 'Cabs, Auto, Metro' },
                { field: 'accommodation',label: 'Accommodation',       hint: 'Hotel / Hostel' },
                { field: 'food',         label: 'Food',                hint: 'All meals' },
                { field: 'equipment',    label: 'Equipment & Baggage', hint: 'Gear transport' },
                { field: 'others',       label: 'Others',              hint: 'Miscellaneous' },
              ].map(({ field, label, hint }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {label} ({symbol})
                    <span className="text-gray-400 font-normal ml-1">· {hint}</span>
                  </label>
                  <input
                    type="number"
                    value={travel[field]}
                    onChange={(e) => handleTravelChange(field, e.target.value)}
                    min="0"
                    step="1"
                    placeholder="0"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                  />
                </div>
              ))}
              {travel.isInternational && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Visa & Docs ({symbol})</label>
                    <input
                      type="number"
                      value={travel.visaDocs}
                      onChange={(e) => handleTravelChange('visaDocs', e.target.value)}
                      min="0" step="1" placeholder="0"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Travel Insurance ({symbol})</label>
                    <input
                      type="number"
                      value={travel.travelInsurance}
                      onChange={(e) => handleTravelChange('travelInsurance', e.target.value)}
                      min="0" step="1" placeholder="0"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                    />
                  </div>
                </>
              )}
            </div>

            <div className={`text-xs font-semibold py-1.5 px-2 rounded ${travelTotal > 0 ? 'text-blue-700 bg-blue-100/60' : 'text-gray-400'}`}>
              Travel Total: {symbol}{travelTotal}
            </div>
          </div>
        )}
      </div>

      {/* Net expense pill — shown when court fee or travel is entered */}
      {((Number(form.courtFee) || 0) + travelTotal) > 0 && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-orange-700">Net Session Expense</span>
          <span className="text-sm font-black text-orange-700">
            {symbol}{(Number(form.courtFee) || 0) + travelTotal}
          </span>
        </div>
      )}

      {/* ── Rating (shared, label differs by type) ── */}
      <div data-error-key="rating">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {isDrill ? 'How effective was this session?' : 'How did you play?'}
        </p>
        <div className="flex gap-2 sm:gap-3">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => { setForm((p) => ({ ...p, rating: r.value })); setErrors((e) => ({ ...e, rating: '' })); }}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${
                form.rating === r.value
                  ? 'border-[#91BE4D] bg-[#91BE4D]/10 scale-105'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{r.emoji}</span>
              <span className={`text-[10px] font-semibold leading-none ${form.rating === r.value ? 'text-[#4a6e10]' : 'text-gray-500'}`}>
                {r.label}
              </span>
            </button>
          ))}
        </div>
        {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
      </div>

      {/* ── CASUAL: what went well / needs work ── */}
      {isCasual && (
        <>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              What went well <span className="text-gray-400 font-normal normal-case">(tap to select)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_TAGS.map((tag) => {
                const selected = form.wentWell.includes(tag);
                const conflict = form.wentWrong.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={conflict}
                    onClick={() => toggleTag('wentWell', tag)}
                    className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${
                      selected
                        ? 'bg-[#91BE4D] border-[#91BE4D] text-white'
                        : conflict
                        ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-[#91BE4D] hover:text-[#4a6e10]'
                    }`}
                  >
                    {selected && '✓ '}{tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              What needs work <span className="text-gray-400 font-normal normal-case">(tap to select)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_TAGS.map((tag) => {
                const selected = form.wentWrong.includes(tag);
                const conflict = form.wentWell.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={conflict}
                    onClick={() => toggleTag('wentWrong', tag)}
                    className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${
                      selected
                        ? 'bg-orange-400 border-orange-400 text-white'
                        : conflict
                        ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
                    }`}
                  >
                    {selected && '✗ '}{tag}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Notes (shared) ── */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={3}
          maxLength={2000}
          placeholder={isDrill
            ? 'What to focus on next session, what clicked today…'
            : 'Anything else you want to remember about this session…'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] resize-none"
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1 pb-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded-lg text-sm tracking-wide transition-opacity"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          {loading ? 'Saving…' : 'Save Session'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
