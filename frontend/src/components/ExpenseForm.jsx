import React, { useState, useEffect } from 'react';

const TYPE_LABELS = {
  court_booking: 'Court Booking',
  gear: 'Gear',
};

const EMPTY_FORM = {
  type: 'court_booking',
  title: '',
  amount: '',
  date: '',
};

export default function ExpenseForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        type: initial.type || 'court_booking',
        title: initial.title || '',
        amount: initial.amount ?? '',
        date: initial.date || '',
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
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.date) errs.date = 'Date is required';
    if (form.amount === '' || Number(form.amount) <= 0) {
      errs.amount = 'Amount must be greater than 0';
    }
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
      type: form.type,
      title: form.title.trim(),
      amount: Number(form.amount),
      date: form.date,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
          Expense Type
        </label>
        <div className="flex gap-3">
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <label
              key={value}
              className={`flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                form.type === value
                  ? value === 'court_booking'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={form.type === value}
                onChange={handleChange}
                className="sr-only"
              />
              {value === 'court_booking' ? '🏟️' : '🎒'} {label}
            </label>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder={form.type === 'court_booking' ? 'e.g. Court rent at Smash Arena' : 'e.g. Selkirk paddle'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Amount + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Amount (₹)
          </label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2 sm:py-2.5 min-h-[40px] rounded-lg text-xs sm:text-sm transition-colors"
        >
          {loading ? 'Saving...' : 'Save'}
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
