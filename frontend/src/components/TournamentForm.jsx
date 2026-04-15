import React, { useState, useEffect } from 'react';
import { CATEGORIES, MEDALS } from '../utils/format';
import SearchableSelect from './SearchableSelect';
import LocationAutocomplete from './LocationAutocomplete';
import VoiceInput from './VoiceInput';
import DocumentInput from './DocumentInput';

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
};

const EMPTY_FORM = {
  name: '',
  location: null,
  categories: [{ ...EMPTY_CATEGORY }],
  rating: null,
  wentWell: [],
  wentWrong: [],
  notes: '',
};

export default function TournamentForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [voiceLocationQuery, setVoiceLocationQuery] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        location: initial.location || null,
        categories: (initial.categories || [{ ...EMPTY_CATEGORY }]).map((cat) => ({
          categoryName: cat.categoryName || '',
          date: cat.date || '',
          medal: cat.medal || 'None',
          prizeAmount: cat.prizeAmount ?? '',
          entryFee: cat.entryFee ?? '',
        })),
        rating: initial.rating || null,
        wentWell: initial.wentWell || [],
        wentWrong: initial.wentWrong || [],
        notes: initial.notes || '',
      });
    }
  }, [initial]);

  const handleCategoryChange = (idx, field, value) => {
    setForm((prev) => {
      const updated = { ...prev };
      const cat = { ...updated.categories[idx] };
      const todayStr = new Date().toISOString().split('T')[0];
      if (field === 'medal' && value === 'None') {
        cat.prizeAmount = 0;
      }
      cat[field] = value;
      if (field === 'date' && value && value > todayStr) {
        // Future categories should not carry result fields.
        cat.medal = 'None';
        cat.prizeAmount = 0;
      }
      updated.categories[idx] = cat;
      return updated;
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

  const handleVoiceFill = (data) => {
    setForm((prev) => {
      const next = { ...prev };

      if (data.name) {
        next.name = data.name;
        setErrors((e) => ({ ...e, name: '' }));
      }

      // AI returns the complete merged categories — just apply them directly
      if (data.categories && data.categories.length > 0) {
        next.categories = data.categories.map((cat) => ({
          categoryName: cat.categoryName || '',
          date: cat.date || '',
          medal: cat.medal || 'None',
          prizeAmount: (cat.medal === 'None' || !cat.medal) ? 0 : cat.prizeAmount != null ? cat.prizeAmount : '',
          entryFee: cat.entryFee != null ? cat.entryFee : '',
        }));
      }

      return next;
    });

    if (data.locationQuery) {
      setVoiceLocationQuery(data.locationQuery);
    }
  };

  const validate = () => {
    const errs = {};
    const todayStr = new Date().toISOString().split('T')[0];
    if (!form.name.trim()) errs.name = 'Tournament name is required';
    if (form.categories.length === 0) errs.categories = 'At least one category is required';

    form.categories.forEach((cat, idx) => {
      const isPastOrToday = cat.date && cat.date <= todayStr;
      if (!cat.categoryName) errs[`cat_${idx}_categoryName`] = 'Category is required';
      if (!cat.date) errs[`cat_${idx}_date`] = 'Category date is required';
      if (cat.entryFee === '' || Number(cat.entryFee) < 0) {
        errs[`cat_${idx}_entryFee`] = 'Entry fee must be 0 or more';
      }
      if (isPastOrToday && cat.medal !== 'None' && (cat.prizeAmount === '' || Number(cat.prizeAmount) <= 0)) {
        errs[`cat_${idx}_prizeAmount`] = 'Winning amount must be > 0 when a medal is awarded';
      }
      if (isPastOrToday && cat.medal === 'None' && Number(cat.prizeAmount) > 0) {
        errs[`cat_${idx}_prizeAmount`] = 'Winning amount must be 0 when no medal';
      }
    });

    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    onSubmit({
      name: form.name.trim(),
      location: form.location || undefined,
      categories: form.categories.map((cat) => ({
        categoryName: cat.categoryName,
        date: cat.date,
        medal: cat.date && cat.date <= todayStr ? cat.medal : 'None',
        prizeAmount: cat.date && cat.date <= todayStr ? (Number(cat.prizeAmount) || 0) : 0,
        entryFee: Number(cat.entryFee),
      })),
      // Only include feedback when at least one category is past/present
      ...(showFeedback && {
        rating: form.rating || null,
        wentWell: form.wentWell,
        wentWrong: form.wentWrong,
        notes: form.notes.trim(),
      }),
    });
  };

  const totalProfit = form.categories.reduce(
    (sum, cat) => sum + ((Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0)),
    0
  );

  // Only show performance feedback if at least one category date is today or in the past
  const today = new Date().toISOString().split('T')[0];
  const showFeedback = form.categories.some((cat) => cat.date && cat.date <= today);

  const inputClass = "w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 relative">

      {/* Saving overlay — fixed to viewport so it's always visible on mobile */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-7 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#91BE4D]/30 border-t-[#91BE4D] animate-spin" />
            <p className="text-sm font-semibold text-gray-800">Saving tournament…</p>
            <p className="text-xs text-gray-400">Just a moment</p>
          </div>
        </div>
      )}

      {/* Prefill from PDF or screenshot */}
      <div className="space-y-2 pb-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Prefill from PDF or Screenshot</span>
        </div>
        <DocumentInput onFill={handleVoiceFill} currentForm={form} />
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Upload a tournament invoice, ticket, or screenshot to auto-fill the form. Accuracy depends on the information available in the file.
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">or fill in manually</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Tournament Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className={inputClass}
          placeholder="e.g. City Open 2024"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
          Location <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <LocationAutocomplete
          value={form.location}
          onSelect={(place) => {
            setForm((prev) => ({ ...prev, location: place }));
            setVoiceLocationQuery('');
          }}
          onClear={() => {
            setForm((prev) => ({ ...prev, location: null }));
            setVoiceLocationQuery('');
          }}
          voiceQuery={voiceLocationQuery}
        />
        {form.location?.address && (
          <p className="text-xs text-gray-500 mt-1 truncate">{form.location.address}</p>
        )}
      </div>

      {/* Categories */}
      <div className="border-t pt-3 sm:pt-4">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Categories</h3>

        {form.categories.map((cat, idx) => (
          <div key={idx} className="bg-[#F3F8F9] border border-gray-200 rounded-lg p-3 sm:p-4 mb-3 space-y-3">
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const showResults = cat.date && cat.date <= todayStr;
              return (
                <>
            <div className="flex items-center justify-between mb-2">
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

            {/* Category Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category Name</label>
              <SearchableSelect
                options={CATEGORIES}
                value={cat.categoryName}
                onChange={(value) => handleCategoryChange(idx, 'categoryName', value)}
                placeholder="Search category..."
              />
              {errors[`cat_${idx}_categoryName`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_categoryName`]}</p>
              )}
            </div>

            {/* Category Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category Date</label>
              <input
                type="date"
                value={cat.date}
                onChange={(e) => handleCategoryChange(idx, 'date', e.target.value)}
                className={inputClass}
              />
              {errors[`cat_${idx}_date`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_date`]}</p>
              )}
            </div>

            {/* Medal / winning amount are only for today or past categories */}
            {showResults ? (
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
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-xs text-blue-800">
                  Medal and amount won will appear once this category date is today or in the past.
                </p>
              </div>
            )}

            {/* Financials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">My Entry Fee (₹)</label>
                <input
                  type="number"
                  value={cat.entryFee}
                  onChange={(e) => handleCategoryChange(idx, 'entryFee', e.target.value)}
                  min="0"
                  step="1"
                  className={inputClass}
                  placeholder="0"
                />
                {/doubles|mixed/i.test(cat.categoryName) && (
                  <p className="text-xs text-amber-600 mt-1">
                    Enter your share only — not the combined total for both partners.
                  </p>
                )}
                {errors[`cat_${idx}_entryFee`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_entryFee`]}</p>
                )}
              </div>

              {showResults && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount Won (₹)</label>
                  <input
                    type="number"
                    value={cat.prizeAmount}
                    onChange={(e) => handleCategoryChange(idx, 'prizeAmount', e.target.value)}
                    min="0"
                    step="1"
                    disabled={cat.medal === 'None'}
                    className={`${inputClass} disabled:bg-gray-200 disabled:cursor-not-allowed`}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {cat.medal === 'None' ? 'Select a medal to enter amount' : 'Amount won in this category'}
                  </p>
                  {errors[`cat_${idx}_prizeAmount`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_prizeAmount`]}</p>
                  )}
                </div>
              )}
            </div>

            {/* Per-category profit */}
            <div className="text-xs border-t border-gray-200 pt-2">
              <span className="text-gray-600">Profit: </span>
              <span className={`font-semibold ${(Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0) >= 0 ? 'text-[#91BE4D]' : 'text-red-600'}`}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                  (Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0)
                )}
              </span>
            </div>
                </>
              );
            })()}
          </div>
        ))}

        {/* Add Category Button */}
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={addCategory}
            className="w-full sm:w-fit hover:opacity-90 text-white font-semibold px-4 py-2 min-h-[40px] rounded text-sm tracking-wide transition-opacity flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            <span>+</span>
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Total profit preview */}
      <div className={`rounded px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border ${totalProfit >= 0 ? 'bg-[#91BE4D]/10 text-[#4a6e10] border-[#91BE4D]/30' : 'bg-red-50 text-red-700 border-red-200'}`}>
        Total Profit:{' '}
        <span className="font-bold">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalProfit)}
        </span>
      </div>

      {/* ── Performance feedback — only shown for past/present tournaments ── */}
      {showFeedback && <div className="border-t pt-4 space-y-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Performance Feedback <span className="text-gray-300 font-normal normal-case">(optional)</span></p>

        {/* Rating */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How did you perform overall?</p>
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
            Tournament notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
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
      </div>}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 disabled:opacity-60 hover:opacity-90 text-white font-bold py-2 sm:py-2.5 min-h-[40px] rounded text-xs sm:text-sm tracking-wide transition-opacity"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          {loading ? 'Saving...' : 'Save Tournament'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 sm:py-2.5 min-h-[40px] rounded text-xs sm:text-sm transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
