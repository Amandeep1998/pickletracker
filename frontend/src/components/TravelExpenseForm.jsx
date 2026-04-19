import React, { useState, useEffect } from 'react';
import { formatCurrency, getCurrencySymbol } from '../utils/format';
import useCurrency from '../hooks/useCurrency';

const COST_BUCKETS = [
  { key: 'transport',     label: 'Transport',           hint: 'Flight / Train / Bus / Fuel' },
  { key: 'localCommute',  label: 'Local Commute',       hint: 'Cabs, Auto, Metro' },
  { key: 'accommodation', label: 'Accommodation',       hint: 'Hotel / Hostel' },
  { key: 'food',          label: 'Food',                hint: 'All meals during trip' },
  { key: 'equipment',     label: 'Equipment & Baggage', hint: 'Extra baggage, gear transport' },
];

const INTL_BUCKETS = [
  { key: 'visaDocs',        label: 'Visa & Documents',  hint: 'Visa fee, passport' },
  { key: 'travelInsurance', label: 'Travel Insurance',  hint: 'Sports coverage' },
];

const EMPTY_FORM = {
  title: '',
  date: '',
  fromCity: '',
  toCity: '',
  isInternational: false,
  tournamentId: '',
  transport: '',
  localCommute: '',
  accommodation: '',
  food: '',
  equipment: '',
  visaDocs: '',
  travelInsurance: '',
};

export default function TravelExpenseForm({ initial, onSubmit, onCancel, loading, tournaments = [] }) {
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        title:           initial.title || '',
        date:            initial.date || '',
        fromCity:        initial.fromCity || '',
        toCity:          initial.toCity || '',
        isInternational: initial.isInternational || false,
        tournamentId:    initial.tournamentId || '',
        transport:       initial.transport || '',
        localCommute:    initial.localCommute || '',
        accommodation:   initial.accommodation || '',
        food:            initial.food || '',
        equipment:       initial.equipment || '',
        visaDocs:        initial.visaDocs || '',
        travelInsurance: initial.travelInsurance || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [initial]);

  const allBuckets = form.isInternational ? [...COST_BUCKETS, ...INTL_BUCKETS] : COST_BUCKETS;

  const total = allBuckets.reduce((sum, b) => sum + (Number(form[b.key]) || 0), 0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Auto-fill title from cities if title is still empty
  const handleCityBlur = () => {
    if (!form.title && form.fromCity && form.toCity) {
      setForm((prev) => ({ ...prev, title: `${prev.fromCity} → ${prev.toCity}` }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Trip name is required';
    if (!form.date) errs.date = 'Date is required';
    if (total <= 0) errs.total = 'Enter at least one cost to save this trip';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const payload = {
      type:            'travel',
      title:           form.title.trim(),
      date:            form.date,
      amount:          total,
      fromCity:        form.fromCity.trim(),
      toCity:          form.toCity.trim(),
      isInternational: form.isInternational,
      tournamentId:    form.tournamentId || null,
      transport:       Number(form.transport) || 0,
      localCommute:    Number(form.localCommute) || 0,
      accommodation:   Number(form.accommodation) || 0,
      food:            Number(form.food) || 0,
      equipment:       Number(form.equipment) || 0,
      visaDocs:        Number(form.visaDocs) || 0,
      travelInsurance: Number(form.travelInsurance) || 0,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Trip name */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Trip name</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="e.g. Mumbai → Ahmedabad"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Date + From + To */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">From city</label>
          <input
            type="text"
            name="fromCity"
            value={form.fromCity}
            onChange={handleChange}
            onBlur={handleCityBlur}
            placeholder="Mumbai"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">To city</label>
          <input
            type="text"
            name="toCity"
            value={form.toCity}
            onChange={handleChange}
            onBlur={handleCityBlur}
            placeholder="Ahmedabad"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
          />
        </div>
      </div>

      {/* International toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
        <input
          type="checkbox"
          name="isInternational"
          checked={form.isInternational}
          onChange={handleChange}
          className="w-4 h-4 rounded accent-teal-500"
        />
        <span className="text-xs sm:text-sm text-gray-700 font-medium">International trip</span>
        <span className="text-xs text-gray-400">(adds visa & insurance fields)</span>
      </label>

      {/* Tournament link */}
      {tournaments.length > 0 && (
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Link to tournament <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            name="tournamentId"
            value={form.tournamentId}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-white"
          >
            <option value="">— Not linked —</option>
            {tournaments.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Cost buckets */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trip costs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allBuckets.map(({ key, label, hint }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {label}
                <span className="text-gray-400 font-normal ml-1">· {hint}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{symbol}</span>
                <input
                  type="number"
                  name={key}
                  value={form[key]}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                />
              </div>
            </div>
          ))}
        </div>
        {errors.total && <p className="text-red-500 text-xs mt-2">{errors.total}</p>}
      </div>

      {/* Live total */}
      <div className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-colors ${
        total > 0 ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <span className="text-sm font-semibold text-gray-700">Total Trip Cost</span>
        <span className={`text-lg font-black ${total > 0 ? 'text-teal-700' : 'text-gray-400'}`}>
          {total > 0 ? formatCurrency(total, currency) : `${symbol}0`}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 disabled:opacity-60 hover:opacity-90 text-white font-bold py-2.5 min-h-[40px] rounded-lg text-xs sm:text-sm tracking-wide transition-opacity"
          style={{ background: 'linear-gradient(to right, #0d9488, #14b8a6)' }}
        >
          {loading ? 'Saving…' : 'Save Trip'}
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
