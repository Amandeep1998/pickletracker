import React, { useState, useEffect } from 'react';

const GEAR_CATEGORIES = [
  'Paddle', 'Shoes', 'Balls', 'Bag', 'Grip tape', 'Apparel', 'Accessories', 'Other',
];

const EMPTY_FORM = { title: '', amount: '', date: '', category: '' };

export default function ExpenseForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '',
        amount: initial.amount ?? '',
        date: initial.date || '',
        category: initial.category || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Item name is required';
    if (!form.date) errs.date = 'Date is required';
    if (form.amount === '' || Number(form.amount) <= 0) errs.amount = 'Amount must be greater than 0';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit({ type: 'gear', title: form.title.trim(), amount: Number(form.amount), date: form.date });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Quick category chips */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</label>
        <div className="flex flex-wrap gap-1.5">
          {GEAR_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setForm((p) => ({ ...p, category: cat, title: p.title || cat }));
              }}
              className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${
                form.category === cat
                  ? 'text-white border-transparent'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
              }`}
              style={form.category === cat ? { background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Item name */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Item name</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="e.g. Selkirk SLK Halo paddle"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Amount + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            min="1"
            step="1"
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date purchased</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 disabled:opacity-60 hover:opacity-90 text-white font-bold py-2.5 min-h-[40px] rounded-lg text-xs sm:text-sm tracking-wide transition-opacity"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 min-h-[40px] rounded-lg text-xs sm:text-sm transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
