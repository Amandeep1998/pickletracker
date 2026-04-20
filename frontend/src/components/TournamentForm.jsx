import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES, MEDALS, formatCurrency, getCurrencySymbol } from '../utils/format';
import useCurrency from '../hooks/useCurrency';
import SearchableSelect from './SearchableSelect';
import LocationAutocomplete from './LocationAutocomplete';
import DatePicker from './DatePicker';

const SKILL_TAGS = [
  'Serve', 'Return of serve', 'Third shot drop', 'Third shot drive',
  'Dinking', 'Backhand', 'Forehand', 'Volleys', 'Lob', 'Reset',
  'Poaching', 'Speed-up', 'Erne', 'Drop shot', 'Kitchen play',
  'Transition zone', 'Movement', 'Stamina', 'Communication',
  'Patience', 'Aggression', 'Mental focus', 'Stacking',
];

const RATINGS = [
  { value: 1, emoji: '😫', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Poor' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'On fire!' },
];

const EMPTY_CATEGORY = {
  categoryName: '',
  date: '',
  medal: 'None',
  prizeAmount: '',
  entryFee: '',
  partnerName: '',
};

const EMPTY_TRAVEL = {
  fromCity: '',
  toCity: '',
  isInternational: false,
  transport: '',
  localCommute: '',
  accommodation: '',
  food: '',
  equipment: '',
  visaDocs: '',
  travelInsurance: '',
};

const STEP_DISPLAY = { details: 'Details', categories: 'Categories', results: 'Results', extras: 'Extras' };

/** Keep only digits so entry fee / prize amount stay positive whole numbers. */
const sanitizeIntInput = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits === '') return '';
  return digits.replace(/^0+(?=\d)/, '');
};

/**
 * Normalise a currency-ish value coming from the server for display in the
 * now-integer-only entry-fee / prize-amount inputs. Existing tournaments saved
 * before we locked decimals out could legitimately have values like `500.5` or
 * `"500.50"` stored in Mongo — we round those to the nearest whole number so
 * users can open and re-save their old tournaments without tripping the new
 * integer-only validation. Empty / null / undefined stay empty so the input
 * shows its placeholder. Negative values get clamped to 0.
 */
const coerceToIntString = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '';
  return String(Math.max(0, Math.round(n)));
};

/** Fresh object every call — never reuse a shared constant as useState(initial) (shallow updates mutate nested arrays). */
function getEmptyForm() {
  return {
    name: '',
    location: null,
    categories: [{ ...EMPTY_CATEGORY }],
    rating: null,
    wentWell: [],
    wentWrong: [],
    notes: '',
  };
}

/** Normalize API / ISO strings so <input type="date"> always gets YYYY-MM-DD. */
function toInputDateStr(value) {
  if (!value) return '';
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export default function TournamentForm({ initial, onSubmit, onCancel, loading }) {
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const [form, setForm] = useState(() => getEmptyForm());
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [travelOpen, setTravelOpen] = useState(false);
  const [travel, setTravel] = useState({ ...EMPTY_TRAVEL });
  const stepTopRef = useRef(null);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        location: initial.location || null,
        categories: (initial.categories || [{ ...EMPTY_CATEGORY }]).map((cat) => ({
          categoryName: cat.categoryName || '',
          date: toInputDateStr(cat.date),
          medal: cat.medal || 'None',
          prizeAmount: coerceToIntString(cat.prizeAmount),
          entryFee: coerceToIntString(cat.entryFee),
          partnerName: cat.partnerName || '',
        })),
        rating: initial.rating || null,
        wentWell: [...(initial.wentWell || [])],
        wentWrong: [...(initial.wentWrong || [])],
        notes: initial.notes || '',
      });
    } else {
      setForm(getEmptyForm());
    }
    setStep(1);
    setTravelOpen(false);
    setTravel({ ...EMPTY_TRAVEL });
  }, [initial]);

  const handleCategoryChange = (idx, field, value) => {
    setForm((prev) => {
      const cat = { ...prev.categories[idx] };
      if (field === 'medal' && value === 'None') {
        cat.prizeAmount = 0;
      }
      // If a date is moved to the future, clear any results already entered —
      // the Results step will disappear and the backend would reject medal+no-prize.
      if (field === 'date' && value > today) {
        cat.medal = 'None';
        cat.prizeAmount = 0;
      }
      cat[field] = value;
      return {
        ...prev,
        categories: prev.categories.map((c, i) => (i === idx ? cat : c)),
      };
    });
    setErrors((prev) => ({ ...prev, [`cat_${idx}_${field}`]: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const addCategory = () => {
    setForm((prev) => ({
      ...prev,
      categories: [...prev.categories, { ...EMPTY_CATEGORY }],
    }));
  };

  const removeCategory = (idx) => {
    if (form.categories.length > 1) {
      setForm((prev) => ({
        ...prev,
        categories: prev.categories.filter((_, i) => i !== idx),
      }));
    }
  };

  const toggleTag = (field, tag) => {
    setForm((prev) => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
      };
    });
  };

  const handleTravelChange = (field, value) => {
    setTravel((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTravel = () => {
    if (travelOpen) setTravel({ ...EMPTY_TRAVEL });
    setTravelOpen((o) => !o);
  };

  const travelTotal = travelOpen
    ? (Number(travel.transport) || 0) +
      (Number(travel.localCommute) || 0) +
      (Number(travel.accommodation) || 0) +
      (Number(travel.food) || 0) +
      (Number(travel.equipment) || 0) +
      (Number(travel.visaDocs) || 0) +
      (Number(travel.travelInsurance) || 0)
    : 0;

  const totalProfit = form.categories.reduce(
    (sum, cat) => sum + ((Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0)),
    0
  );

  const today = new Date().toISOString().slice(0, 10);
  const hasPlayedCategories = form.categories.some((cat) => cat.date && cat.date <= today);
  const stepIds = hasPlayedCategories
    ? ['details', 'categories', 'results', 'extras']
    : ['details', 'categories', 'extras'];
  const currentStepId = stepIds[step - 1] || 'extras';
  const totalSteps = stepIds.length;

  // Clamp step if the results step disappears (e.g. user changed all dates to future)
  useEffect(() => {
    setStep((s) => Math.min(s, stepIds.length));
  }, [stepIds.length]);

  const validateStep = (stepId) => {
    const errs = {};
    if (stepId === 'details') {
      if (!form.name.trim()) errs.name = 'Tournament name is required';
    }
    if (stepId === 'categories') {
      form.categories.forEach((cat, idx) => {
        if (!cat.categoryName) errs[`cat_${idx}_categoryName`] = 'Select a category';
        if (!cat.date) errs[`cat_${idx}_date`] = 'Date is required';
        const feeNum = Number(cat.entryFee);
        if (cat.entryFee === '' || !Number.isFinite(feeNum) || feeNum < 0 || !Number.isInteger(feeNum)) {
          errs[`cat_${idx}_entryFee`] = 'Enter entry fee as a whole number (0 if free)';
        }
      });
    }
    if (stepId === 'results') {
      form.categories.forEach((cat, idx) => {
        const prizeNum = Number(cat.prizeAmount);
        if (cat.medal !== 'None') {
          if (cat.prizeAmount === '' || !Number.isFinite(prizeNum) || prizeNum <= 0 || !Number.isInteger(prizeNum)) {
            errs[`cat_${idx}_prizeAmount`] = 'Enter winning amount as a whole number';
          }
        }
        if (cat.medal === 'None' && Number.isFinite(prizeNum) && prizeNum > 0) {
          errs[`cat_${idx}_prizeAmount`] = 'Clear amount or select a medal';
        }
      });
    }
    return errs;
  };

  const scrollToTop = () => {
    requestAnimationFrame(() =>
      stepTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const goNext = (e) => {
    // Belt-and-suspenders: when advancing from the last non-terminal step the
    // button re-renders as a submit button in the same position. We prevent
    // the click's default action so even if any reconciliation edge reuses
    // the DOM node, no stray form submission can happen.
    e?.preventDefault?.();
    const errs = validateStep(currentStepId);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
    scrollToTop();
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => s - 1);
    scrollToTop();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Safety net: re-validate all steps in order
    for (const sid of stepIds) {
      const errs = validateStep(sid);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        setStep(stepIds.indexOf(sid) + 1);
        scrollToTop();
        return;
      }
    }
    onSubmit({
      name: form.name.trim(),
      location: form.location || undefined,
      categories: form.categories.map((cat) => ({
        categoryName: cat.categoryName,
        date: cat.date,
        medal: cat.medal,
        prizeAmount: Number(cat.prizeAmount) || 0,
        entryFee: Number(cat.entryFee),
        partnerName: cat.partnerName?.trim() || '',
      })),
      rating: form.rating || null,
      wentWell: form.wentWell,
      wentWrong: form.wentWrong,
      notes: form.notes.trim(),
      travelExpense: travelOpen && travelTotal > 0 ? {
        fromCity: travel.fromCity.trim(),
        toCity: travel.toCity.trim(),
        isInternational: travel.isInternational,
        transport: Number(travel.transport) || 0,
        localCommute: Number(travel.localCommute) || 0,
        accommodation: Number(travel.accommodation) || 0,
        food: Number(travel.food) || 0,
        equipment: Number(travel.equipment) || 0,
        visaDocs: Number(travel.visaDocs) || 0,
        travelInsurance: Number(travel.travelInsurance) || 0,
        total: travelTotal,
      } : null,
    });
  };

  const inputClass = "w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 relative" autoComplete="off">

      {/* Saving overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-7 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#91BE4D]/30 border-t-[#91BE4D] animate-spin" />
            <p className="text-sm font-semibold text-gray-800">Saving tournament…</p>
            <p className="text-xs text-gray-400">Just a moment</p>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div ref={stepTopRef} className="flex items-start pt-1">
        {stepIds.map((sid, i) => {
          const s = i + 1;
          const isComplete = s < step;
          const isActive = s === step;
          return (
            <React.Fragment key={sid}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isComplete
                    ? 'bg-[#91BE4D] text-white'
                    : isActive
                    ? 'bg-[#4a6e10] text-white ring-4 ring-[#91BE4D]/20'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {isComplete ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${
                  isActive ? 'text-[#4a6e10]' : isComplete ? 'text-[#91BE4D]' : 'text-gray-400'
                }`}>
                  {STEP_DISPLAY[sid]}
                </span>
              </div>
              {i < stepIds.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1.5 mt-3.5 transition-all ${isComplete ? 'bg-[#91BE4D]' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step: Details ── */}
      {currentStepId === 'details' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Tournament Details</h3>
            <p className="text-xs text-gray-500 mt-0.5">Start with the name and location</p>
          </div>

          <div data-error-key="name">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Tournament Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. City Open 2024"
              autoFocus
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <LocationAutocomplete
              value={form.location}
              onSelect={(place) => setForm((prev) => ({ ...prev, location: place }))}
              onClear={() => setForm((prev) => ({ ...prev, location: null }))}
            />
            {form.location?.address && (
              <p className="text-xs text-gray-500 mt-1 truncate">{form.location.address}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Step: Categories ── */}
      {currentStepId === 'categories' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Your Categories</h3>
            <p className="text-xs text-gray-500 mt-0.5">Which categories did you enter in this tournament?</p>
          </div>

          {/* Multi-category tip */}
          <div className="flex items-start gap-2 bg-[#f7faf3] border border-[#91BE4D]/30 rounded-lg px-3 py-2.5 text-xs text-[#3d6210] leading-relaxed">
            <span className="text-base leading-none mt-0.5 flex-shrink-0" aria-hidden="true">💡</span>
            <p>
              Pickleball tournaments often run across multiple days — you might play{' '}
              <span className="font-semibold">Men&apos;s Singles on Saturday</span> and{' '}
              <span className="font-semibold">Mixed Doubles on Sunday</span>, each as a separate category.
              Add one entry per category you played.
            </p>
          </div>

          {form.categories.map((cat, idx) => (
            <div key={idx} className="bg-[#F3F8F9] border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#272702] uppercase tracking-wide">Category {idx + 1}</span>
                {form.categories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCategory(idx)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div data-error-key={`cat_${idx}_categoryName`}>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <SearchableSelect
                  options={CATEGORIES}
                  value={cat.categoryName}
                  onChange={(value) => handleCategoryChange(idx, 'categoryName', value)}
                  placeholder="e.g. Men's Singles Open, Mixed Doubles…"
                />
                {errors[`cat_${idx}_categoryName`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_categoryName`]}</p>
                )}
              </div>

              <div data-error-key={`cat_${idx}_date`}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {cat.date && cat.date <= today ? 'Date Played' : 'Date'}
                </label>
                <DatePicker
                  value={cat.date}
                  onChange={(val) => handleCategoryChange(idx, 'date', val)}
                  error={!!errors[`cat_${idx}_date`]}
                />
                {errors[`cat_${idx}_date`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_date`]}</p>
                )}
              </div>

              <div data-error-key={`cat_${idx}_entryFee`}>
                <label className="block text-xs font-medium text-gray-600 mb-1">My Entry Fee ({symbol})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={cat.entryFee}
                  onChange={(e) => handleCategoryChange(idx, 'entryFee', sanitizeIntInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
                  }}
                  className={inputClass}
                  placeholder="0"
                />
                {/doubles|mixed/i.test(cat.categoryName) && (
                  <p className="text-xs text-amber-600 mt-1">Enter your share only — not the combined total for both partners.</p>
                )}
                {errors[`cat_${idx}_entryFee`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_entryFee`]}</p>
                )}
              </div>

              {/* Partner name — only for doubles / mixed categories */}
              {/doubles|mixed/i.test(cat.categoryName) && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Partner Name <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={cat.partnerName}
                    onChange={(e) => handleCategoryChange(idx, 'partnerName', e.target.value)}
                    className={inputClass}
                    placeholder="Who did you play with?"
                  />
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addCategory}
            className="w-full bg-white hover:bg-[#f4f8e8] text-[#4a6e10] font-semibold px-4 py-2.5 min-h-[40px] rounded-lg text-sm border-2 border-dashed border-[#91BE4D] hover:border-[#2d7005] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add another category
          </button>
        </div>
      )}

      {/* ── Step: Results ── */}
      {currentStepId === 'results' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Your Results</h3>
            <p className="text-xs text-gray-500 mt-0.5">Medals, prizes and how it felt overall</p>
          </div>

          {form.categories.map((cat, idx) => (
            <div key={idx} className="bg-[#F3F8F9] border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3">
              <p className="text-xs font-semibold text-[#272702] uppercase tracking-wide">
                {cat.categoryName || `Category ${idx + 1}`}
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Medal</label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {MEDALS.map((m) => (
                    <label key={m} className="flex items-center gap-1 cursor-pointer min-h-[32px]">
                      <input
                        type="radio"
                        checked={cat.medal === m}
                        onChange={(e) => handleCategoryChange(idx, 'medal', e.target.value)}
                        value={m}
                        className="accent-[#91BE4D]"
                      />
                      <span className="text-xs sm:text-sm">{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div data-error-key={`cat_${idx}_prizeAmount`}>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount Won ({symbol})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={cat.prizeAmount}
                  onChange={(e) => handleCategoryChange(idx, 'prizeAmount', sanitizeIntInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
                  }}
                  disabled={cat.medal === 'None'}
                  className={`${inputClass} disabled:bg-gray-200 disabled:cursor-not-allowed`}
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {cat.medal === 'None' ? 'Select a medal above to enter an amount' : 'Amount won in this event'}
                </p>
                {errors[`cat_${idx}_prizeAmount`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_prizeAmount`]}</p>
                )}
              </div>

              <div className="text-xs border-t border-gray-200 pt-2">
                <span className="text-gray-500">Profit: </span>
                <span className={`font-semibold ${(Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0) >= 0 ? 'text-[#91BE4D]' : 'text-red-600'}`}>
                  {formatCurrency((Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0), currency)}
                </span>
              </div>
            </div>
          ))}

          <div className={`rounded px-3 py-2.5 text-xs sm:text-sm font-medium border ${totalProfit >= 0 ? 'bg-[#91BE4D]/10 text-[#4a6e10] border-[#91BE4D]/30' : 'bg-red-50 text-red-700 border-red-200'}`}>
            Total Profit: <span className="font-bold">{formatCurrency(totalProfit, currency)}</span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Overall Performance</p>
            <div className="flex gap-2 sm:gap-3">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, rating: p.rating === r.value ? null : r.value }))}
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
            <p className="text-[11px] text-gray-400 mt-1.5">Optional — tap to select, tap again to clear</p>
          </div>

          {/* What went well */}
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

          {/* What needs work */}
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

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Tournament Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              maxLength={2000}
              placeholder="Key moments, opponents, areas to work on for next time…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] resize-none"
            />
          </div>
        </div>
      )}

      {/* ── Step: Extras ── */}
      {currentStepId === 'extras' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Travel Expenses</h3>
            <p className="text-xs text-gray-500 mt-0.5">Optional — log trip costs linked to this tournament</p>
          </div>

          {!hasPlayedCategories && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 text-xs text-amber-800 leading-relaxed">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <span className="font-bold">Once you&apos;ve played, come back and edit this tournament</span>{' '}
                to log your medals, prize money, overall rating, and reflections (what went well, what needs work, notes).
              </span>
            </div>
          )}

          {/* Travel Expenses */}
          <div className="pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Travel Expenses</span>
                <span className="text-xs text-gray-400 font-normal">(optional)</span>
              </div>
              <div className="flex items-center gap-2">
                {travelOpen && travelTotal > 0 && (
                  <span className="text-xs font-semibold text-blue-600">{formatCurrency(travelTotal, currency)}</span>
                )}
                <button
                  type="button"
                  onClick={toggleTravel}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${travelOpen ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100' : 'border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                >
                  {travelOpen ? 'Remove' : '+ Add'}
                </button>
              </div>
            </div>

            {travelOpen && (
              <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-3">
                <p className="text-[11px] text-blue-500 leading-relaxed">
                  Log your trip costs — they&apos;ll be saved as a travel expense linked to this tournament.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From City</label>
                    <input
                      type="text"
                      value={travel.fromCity}
                      onChange={(e) => handleTravelChange('fromCity', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">To City</label>
                    <input
                      type="text"
                      value={travel.toCity}
                      onChange={(e) => handleTravelChange('toCity', e.target.value)}
                      className={inputClass}
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
                    { field: 'transport', label: 'Transport' },
                    { field: 'localCommute', label: 'Local Commute' },
                    { field: 'accommodation', label: 'Accommodation' },
                    { field: 'food', label: 'Food' },
                    { field: 'equipment', label: 'Equipment & Baggage' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label} ({symbol})</label>
                      <input
                        type="number"
                        value={travel[field]}
                        onChange={(e) => handleTravelChange(field, e.target.value)}
                        min="0"
                        step="1"
                        className={inputClass}
                        placeholder="0"
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
                          min="0" step="1"
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Travel Insurance ({symbol})</label>
                        <input
                          type="number"
                          value={travel.travelInsurance}
                          onChange={(e) => handleTravelChange('travelInsurance', e.target.value)}
                          min="0" step="1"
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className={`text-xs font-semibold py-1.5 px-2 rounded ${travelTotal > 0 ? 'text-blue-700 bg-blue-100/60' : 'text-gray-400'}`}>
                  Travel Total: {formatCurrency(travelTotal, currency)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="pt-2 space-y-2">
        <div className="flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="flex-shrink-0 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-4 py-2 sm:py-2.5 min-h-[40px] rounded text-xs sm:text-sm transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}

          {step < totalSteps ? (
            <button
              key="nav-next"
              type="button"
              onClick={goNext}
              className="flex-1 text-white font-bold py-2 sm:py-2.5 min-h-[40px] rounded text-xs sm:text-sm tracking-wide transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
            >
              Next
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              key="nav-submit"
              type="submit"
              disabled={loading}
              className="flex-1 disabled:opacity-60 hover:opacity-90 text-white font-bold py-2 sm:py-2.5 min-h-[40px] rounded text-xs sm:text-sm tracking-wide transition-opacity"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
            >
              {loading ? 'Saving...' : 'Save Tournament'}
            </button>
          )}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
