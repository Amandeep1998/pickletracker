import React, { useState, useEffect } from 'react';
import { CATEGORIES, MEDALS } from '../utils/format';
import SearchableSelect from './SearchableSelect';
import LocationAutocomplete from './LocationAutocomplete';

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
};

export default function TournamentForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

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
      });
    }
  }, [initial]);

  const handleCategoryChange = (idx, field, value) => {
    setForm((prev) => {
      const updated = { ...prev };
      const cat = { ...updated.categories[idx] };
      if (field === 'medal' && value === 'None') {
        cat.prizeAmount = 0;
      }
      cat[field] = value;
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

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Tournament name is required';
    if (form.categories.length === 0) errs.categories = 'At least one category is required';

    form.categories.forEach((cat, idx) => {
      if (!cat.categoryName) errs[`cat_${idx}_categoryName`] = 'Category is required';
      if (!cat.date) errs[`cat_${idx}_date`] = 'Category date is required';
      if (cat.entryFee === '' || Number(cat.entryFee) < 0) {
        errs[`cat_${idx}_entryFee`] = 'Entry fee must be 0 or more';
      }
      if (cat.medal !== 'None' && (cat.prizeAmount === '' || Number(cat.prizeAmount) <= 0)) {
        errs[`cat_${idx}_prizeAmount`] = 'Winning amount must be > 0 when a medal is awarded';
      }
      if (cat.medal === 'None' && Number(cat.prizeAmount) > 0) {
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
    onSubmit({
      name: form.name.trim(),
      location: form.location || undefined,
      categories: form.categories.map((cat) => ({
        categoryName: cat.categoryName,
        date: cat.date,
        medal: cat.medal,
        prizeAmount: Number(cat.prizeAmount) || 0,
        entryFee: Number(cat.entryFee),
      })),
    });
  };

  const totalProfit = form.categories.reduce(
    (sum, cat) => sum + ((Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0)),
    0
  );

  const inputClass = "w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
          onSelect={(place) => setForm((prev) => ({ ...prev, location: place }))}
          onClear={() => setForm((prev) => ({ ...prev, location: null }))}
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

            {/* Medal */}
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

            {/* Financials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">My Entry Fee (₹)</label>
                <input
                  type="number"
                  value={cat.entryFee}
                  onChange={(e) => handleCategoryChange(idx, 'entryFee', e.target.value)}
                  min="0"
                  step="0.01"
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

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount Won (₹)</label>
                <input
                  type="number"
                  value={cat.prizeAmount}
                  onChange={(e) => handleCategoryChange(idx, 'prizeAmount', e.target.value)}
                  min="0"
                  step="0.01"
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
          </div>
        ))}

        {/* Add Category Button */}
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={addCategory}
            className="w-full sm:w-fit bg-[#272702] hover:bg-[#3a3a00] text-[#91BE4D] font-semibold px-4 py-2 min-h-[40px] rounded text-sm tracking-wide transition-colors flex items-center justify-center gap-2 border border-[#91BE4D]/30"
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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#ec9937] hover:bg-[#d4831f] disabled:opacity-60 text-white font-bold py-2 sm:py-2.5 min-h-[40px] rounded text-xs sm:text-sm tracking-wide transition-colors"
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
