import React, { useState, useEffect } from 'react';
import { CATEGORIES, MEDALS } from '../utils/format';

const EMPTY_CATEGORY = {
  categoryName: '',
  medal: 'None',
  prizeAmount: '',
  entryFee: '',
};

const EMPTY_FORM = {
  name: '',
  categories: [{ ...EMPTY_CATEGORY }],
  date: '',
};

export default function TournamentForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        categories: (initial.categories || [{ ...EMPTY_CATEGORY }]).map((cat) => ({
          categoryName: cat.categoryName || '',
          medal: cat.medal || 'None',
          prizeAmount: cat.prizeAmount ?? '',
          entryFee: cat.entryFee ?? '',
        })),
        date: initial.date ? initial.date.slice(0, 10) : '',
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
    if (!form.date) errs.date = 'Date is required';
    if (form.categories.length === 0) errs.categories = 'At least one category is required';

    form.categories.forEach((cat, idx) => {
      if (!cat.categoryName) errs[`cat_${idx}_categoryName`] = 'Category is required';
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
      categories: form.categories.map((cat) => ({
        categoryName: cat.categoryName,
        medal: cat.medal,
        prizeAmount: Number(cat.prizeAmount) || 0,
        entryFee: Number(cat.entryFee),
      })),
      date: form.date,
    });
  };

  // Calculate total profit across all categories
  const totalProfit = form.categories.reduce(
    (sum, cat) => sum + ((Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0)),
    0
  );

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
          className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g. City Open 2024"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
      </div>


      {/* Categories */}
      <div className="border-t pt-3 sm:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700">Categories</h3>
          <button
            type="button"
            onClick={addCategory}
            className="text-xs text-green-600 hover:text-green-700 font-medium w-fit"
          >
            + Add Category
          </button>
        </div>

        {form.categories.map((cat, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Category {idx + 1}</span>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Category Name
              </label>
              <select
                value={cat.categoryName}
                onChange={(e) => handleCategoryChange(idx, 'categoryName', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors[`cat_${idx}_categoryName`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_categoryName`]}</p>
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
                      className="accent-green-600"
                    />
                    <span className="text-xs sm:text-sm">{m}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Entry Fees (₹)
                </label>
                <input
                  type="number"
                  value={cat.entryFee}
                  onChange={(e) => handleCategoryChange(idx, 'entryFee', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                />
                {errors[`cat_${idx}_entryFee`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_entryFee`]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Winning Prize (₹)
                </label>
                <input
                  type="number"
                  value={cat.prizeAmount}
                  onChange={(e) => handleCategoryChange(idx, 'prizeAmount', e.target.value)}
                  min="0"
                  step="0.01"
                  disabled={cat.medal === 'None'}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                  placeholder="0"
                />
                {errors[`cat_${idx}_prizeAmount`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`cat_${idx}_prizeAmount`]}</p>
                )}
              </div>
            </div>

            {/* Per-category profit */}
            <div className="text-xs">
              <span className="text-gray-600">Profit: </span>
              <span className={`font-semibold ${(Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                  (Number(cat.prizeAmount) || 0) - (Number(cat.entryFee) || 0)
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total profit preview */}
      <div className={`rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium ${totalProfit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        Total Profit:{' '}
        <span className="font-bold">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
            totalProfit
          )}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2 sm:py-2.5 min-h-[40px] rounded-lg text-xs sm:text-sm transition-colors"
        >
          {loading ? 'Saving...' : initial ? 'Update Tournament' : 'Add Tournament'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 sm:py-2.5 min-h-[40px] rounded-lg text-xs sm:text-sm transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
