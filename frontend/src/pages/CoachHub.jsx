import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../services/api';
import Modal from '../components/Modal';
import PaddleLoader from '../components/PaddleLoader';
import { getCurrencySymbol } from '../utils/format';
import useCurrency from '../hooks/useCurrency';

// ── Helpers ───────────────────────────────────────────────────────────────────
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYearMonth(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const today = new Date();
const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

const OVERHEAD_LABELS = {
  venue_court: 'Venue / Court',
  travel: 'Travel',
  materials: 'Materials',
  software: 'Software',
  food: 'Food',
  other: 'Other',
};

const EXPENSE_CATS = [
  { value: 'travel', label: 'Travel' },
  { value: 'venue_court', label: 'Venue / Court' },
  { value: 'materials', label: 'Materials' },
  { value: 'other', label: 'Other' },
];

// ── Slot Form (add + edit) ────────────────────────────────────────────────────
function SlotForm({ initialDate, initialData, onSubmit, onCancel, loading, knownStudents, isEdit }) {
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const nameRef = useRef(null);

  const [form, setForm] = useState(() => ({
    studentNames: initialData?.studentNames || [],
    date: initialData?.date || initialDate || todayStr,
    startTime: initialData?.startTime || '07:00',
    endTime: initialData?.endTime || '08:00',
    feeAmount: initialData?.feeAmount != null ? String(initialData.feeAmount) : '',
    sessionExpenses: (initialData?.sessionExpenses || []).map((e) => ({
      category: e.category,
      amount: String(e.amount),
      note: e.note || '',
    })),
    notes: initialData?.notes || '',
  }));
  const [nameInput, setNameInput] = useState('');
  const [errors, setErrors] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  const set = (field, val) => {
    setForm((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  // Student tags
  const filteredSuggestions = useMemo(() => {
    const q = nameInput.trim().toLowerCase();
    return (q ? knownStudents.filter((s) => s.toLowerCase().includes(q)) : knownStudents)
      .filter((s) => !form.studentNames.includes(s))
      .slice(0, 6);
  }, [nameInput, knownStudents, form.studentNames]);

  const addStudent = (name) => {
    const n = (name || nameInput).trim();
    if (!n || form.studentNames.includes(n)) { setNameInput(''); return; }
    set('studentNames', [...form.studentNames, n]);
    setNameInput('');
    nameRef.current?.focus();
  };
  const removeStudent = (name) => set('studentNames', form.studentNames.filter((s) => s !== name));
  const handleNameKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addStudent(); }
    if (e.key === 'Backspace' && !nameInput && form.studentNames.length > 0)
      removeStudent(form.studentNames[form.studentNames.length - 1]);
  };

  // Session expenses
  const addExpenseRow = () => set('sessionExpenses', [...form.sessionExpenses, { category: 'travel', amount: '', note: '' }]);
  const updateExpense = (i, field, val) =>
    set('sessionExpenses', form.sessionExpenses.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const removeExpense = (i) => set('sessionExpenses', form.sessionExpenses.filter((_, idx) => idx !== i));

  const fee = Math.floor(Number(form.feeAmount) || 0);
  const expTotal = form.sessionExpenses.reduce((s, e) => s + Math.floor(Number(e.amount) || 0), 0);
  const netProfit = fee - expTotal;

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Date is required';
    if (!form.startTime) errs.startTime = 'Required';
    if (!form.endTime) errs.endTime = 'Required';
    if (form.startTime && form.endTime && form.startTime >= form.endTime) errs.endTime = 'End must be after start';
    if (form.studentNames.length === 0) errs.studentNames = 'At least one student is required';
    if (!form.feeAmount || fee < 1) errs.feeAmount = 'Fee is required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit({
      studentNames: form.studentNames,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      feeAmount: fee,
      sessionExpenses: form.sessionExpenses
        .filter((e) => Math.floor(Number(e.amount)) > 0)
        .map((e) => ({ category: e.category, amount: Math.floor(Number(e.amount)), note: e.note.trim() })),
      notes: form.notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-7 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#91BE4D]/30 border-t-[#91BE4D] animate-spin" />
            <p className="text-sm font-semibold text-gray-800">Saving…</p>
          </div>
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
        <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
          className="w-full sm:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Start</label>
          <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" />
          {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">End</label>
          <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" />
          {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime}</p>}
        </div>
      </div>

      {/* Student names */}
      <div className="relative">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Student names <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.studentNames.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 text-xs bg-[#91BE4D]/15 text-[#4a6e10] border border-[#91BE4D]/30 px-2.5 py-1 rounded-full font-semibold">
              {name}
              <button type="button" onClick={() => removeStudent(name)} className="text-[#4a6e10]/60 hover:text-red-500 leading-none font-bold">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input ref={nameRef} type="text" value={nameInput}
            onChange={(e) => { setNameInput(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleNameKey}
            placeholder="Type name and press Enter"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" />
          <button type="button" onClick={() => addStudent()}
            className="px-3 py-2 rounded-lg border border-[#91BE4D]/40 text-[#4a6e10] text-sm font-semibold hover:bg-[#91BE4D]/10">
            Add
          </button>
        </div>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {filteredSuggestions.map((s) => (
              <li key={s}>
                <button type="button" onMouseDown={() => addStudent(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#f4f8e8] text-gray-800">{s}</button>
              </li>
            ))}
          </ul>
        )}
        {errors.studentNames && <p className="text-red-500 text-xs mt-1">{errors.studentNames}</p>}
      </div>

      {/* Fee — mandatory */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
          Total session fee <span className="text-red-400">*</span>
        </label>
        <p className="text-[11px] text-gray-400 mb-1">Combined fee for all students in this session</p>
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white w-full sm:w-40 focus-within:ring-2 focus-within:ring-[#91BE4D]">
          <span className="text-gray-500 font-bold mr-1">{symbol}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.feeAmount}
            onChange={(e) => set('feeAmount', e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0" className="w-full text-sm font-bold text-gray-900 focus:outline-none" />
        </div>
        {errors.feeAmount && <p className="text-red-500 text-xs mt-1">{errors.feeAmount}</p>}
      </div>

      {/* Session expenses */}
      <div className="border border-dashed border-gray-200 rounded-xl p-3 bg-gray-50/80">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Session expenses (optional)</p>
        <p className="text-[11px] text-gray-400 mb-2">Travel, court fee, etc. — deducted from your net.</p>
        {form.sessionExpenses.length === 0 && <p className="text-xs text-gray-400 mb-2">None added.</p>}
        <div className="space-y-2 mb-2">
          {form.sessionExpenses.map((row, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-end gap-2 p-2 rounded-lg bg-white border border-gray-200">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Type</label>
                <select value={row.category} onChange={(e) => updateExpense(i, 'category', e.target.value)}
                  className="w-full mt-0.5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                  {EXPENSE_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="w-full sm:w-24">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Amount</label>
                <div className="mt-0.5 flex items-center border border-gray-300 rounded-lg px-2">
                  <span className="text-gray-500 text-sm">{symbol}</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={row.amount}
                    onChange={(e) => updateExpense(i, 'amount', e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0" className="w-full py-1.5 pl-1 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <input type="text" value={row.note} onChange={(e) => updateExpense(i, 'note', e.target.value)}
                  placeholder="What for (optional)" maxLength={200}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
              </div>
              <button type="button" onClick={() => removeExpense(i)}
                className="self-end text-red-500 text-xs font-bold px-2 py-1 hover:bg-red-50 rounded">Remove</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addExpenseRow}
          className="text-sm font-bold text-[#4a6e10] border border-[#91BE4D]/50 rounded-lg px-3 py-1.5 hover:bg-[#f4f8e8] w-full sm:w-auto">
          + Add expense
        </button>
      </div>

      {/* Net profit preview */}
      {fee > 0 && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 border ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Net profit</p>
            <p className="text-[10px] text-gray-400">Fee − session expenses</p>
          </div>
          <span className={`text-lg font-black ${netProfit >= 0 ? 'text-emerald-800' : 'text-amber-900'}`}>
            {symbol}{netProfit.toLocaleString()}
          </span>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes (optional)</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
          rows={2} maxLength={500} placeholder="Drills, focus areas…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      <div className="flex gap-2 pt-1 pb-2">
        <button type="submit" disabled={loading}
          className="flex-1 disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded-lg text-sm tracking-wide transition-opacity"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}>
          {loading ? 'Saving…' : isEdit ? 'Update session' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-lg text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ── Slot Detail (view, edit, delete) ─────────────────────────────────────────
function SlotDetail({ slot, onDelete, onEdit, onClose, symbol }) {
  const expTotal = (slot.sessionExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm text-gray-700">
        <div className="flex justify-between">
          <span className="text-gray-500">Date</span>
          <span className="font-semibold">
            {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Time</span>
          <span className="font-semibold">{fmt12(slot.startTime)} – {fmt12(slot.endTime)}</span>
        </div>
        {(slot.studentNames || []).length > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-500 flex-shrink-0">Students</span>
            <span className="font-semibold text-right">{slot.studentNames.join(', ')}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Fee</span>
          <span className="font-semibold text-emerald-700">{symbol}{(slot.feeAmount || 0).toLocaleString()}</span>
        </div>
        {expTotal > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Session expenses</span>
              <span className="font-semibold text-rose-600">−{symbol}{expTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="text-gray-700 font-semibold">Net profit</span>
              <span className="font-black text-gray-900">{symbol}{((slot.feeAmount || 0) - expTotal).toLocaleString()}</span>
            </div>
          </>
        )}
        {slot.notes && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">{slot.notes}</div>
        )}
      </div>

      <div className="flex gap-2 pt-2 flex-wrap">
        <button onClick={onEdit}
          className="flex-1 text-white font-semibold py-3 rounded-lg text-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}>
          Edit
        </button>
        <button onClick={onDelete}
          className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-lg text-sm transition-colors">
          Delete
        </button>
        <button onClick={onClose}
          className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-lg text-sm transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

// ── Overhead Form ─────────────────────────────────────────────────────────────
function OverheadForm({ yearMonth, onSubmit, onCancel, loading }) {
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const [form, setForm] = useState({ category: 'venue_court', amount: '', note: '' });
  const [errors, setErrors] = useState({});
  const set = (f, v) => { setForm((p) => ({ ...p, [f]: v })); setErrors((p) => ({ ...p, [f]: '' })); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = Math.floor(Number(form.amount) || 0);
    if (amt < 1) { setErrors({ amount: 'Enter a valid amount' }); return; }
    onSubmit({ yearMonth, category: form.category, amount: amt, note: form.note.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(OVERHEAD_LABELS).map(([v, l]) => (
            <button key={v} type="button" onClick={() => set('category', v)}
              className={`py-2 px-2 rounded-xl border-2 text-center text-xs font-semibold transition-all ${form.category === v ? 'border-[#91BE4D] bg-[#91BE4D]/8 text-[#4a6e10]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Amount</label>
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white w-full sm:w-40">
          <span className="text-gray-500 font-bold mr-1">{symbol}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.amount}
            onChange={(e) => set('amount', e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0" className="w-full text-sm font-bold text-gray-900 focus:outline-none" />
        </div>
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note (optional)</label>
        <input type="text" value={form.note} onChange={(e) => set('note', e.target.value)}
          placeholder="e.g. Monthly court slot" maxLength={300}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2 pt-1 pb-2">
        <button type="submit" disabled={loading}
          className="flex-1 disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded-lg text-sm tracking-wide transition-opacity"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}>
          {loading ? 'Saving…' : 'Add overhead'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-lg text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = ['Schedule', 'Students', 'Financials'];

export default function CoachHub() {
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);

  const [activeTab, setActiveTab] = useState('Schedule');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const yearMonth = toYearMonth(viewYear, viewMonth);

  const [slots, setSlots] = useState([]);
  const [coachingIncomes, setCoachingIncomes] = useState([]);
  const [overheads, setOverheads] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [addModal, setAddModal] = useState(null);   // null | date string
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const [detailSlot, setDetailSlot] = useState(null); // slot object for view/edit/delete
  const [editSlot, setEditSlot] = useState(null);     // slot being edited
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [overheadModal, setOverheadModal] = useState(false);
  const [overheadLoading, setOverheadLoading] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, cRes, oRes, stuRes] = await Promise.allSettled([
        api.getCoachScheduleSlots(yearMonth),
        api.getCoachingIncomes(),
        api.getCoachOverheads(yearMonth),
        api.getCoachStudents(),
      ]);
      setSlots(sRes.status === 'fulfilled' ? (sRes.value.data.data || []) : []);
      setCoachingIncomes(cRes.status === 'fulfilled' ? (cRes.value.data.data || []) : []);
      setOverheads(oRes.status === 'fulfilled' ? (oRes.value.data.data || []) : []);
      setStudents(stuRes.status === 'fulfilled' ? (stuRes.value.data.data || []) : []);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const slotsByDate = useMemo(() => {
    const map = {};
    slots.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [slots]);

  const monthIncomes = useMemo(
    () => coachingIncomes.filter((c) => c.date?.startsWith(yearMonth)),
    [coachingIncomes, yearMonth]
  );

  const financials = useMemo(() => {
    const coachEntries = monthIncomes.filter((c) => c.entryRole !== 'player');
    const grossIncome = coachEntries.reduce((s, c) => s + (c.totalEarned || 0), 0);
    const sessionCosts = coachEntries.reduce((s, c) => s + (c.expensesTotal || 0), 0);
    const overheadTotal = overheads.reduce((s, o) => s + (o.amount || 0), 0);
    return { grossIncome, sessionCosts, overheadTotal, netIncome: grossIncome - sessionCosts - overheadTotal };
  }, [monthIncomes, overheads]);

  // Per-student session stats computed from all loaded slots (all months)
  const studentStats = useMemo(() => {
    const map = {};
    slots.forEach((s) => {
      (s.studentNames || []).forEach((name) => {
        if (!map[name]) map[name] = { sessions: 0, lastDate: '' };
        map[name].sessions += 1;
        if (s.date > map[name].lastDate) map[name].lastDate = s.date;
      });
    });
    return map;
  }, [slots]);

  const knownStudents = useMemo(() => {
    // Prefer persistent student records; fall back to names from slots/incomes
    const fromStudents = students.map((s) => s.name);
    const fromSlots = new Set();
    slots.forEach((s) => (s.studentNames || []).forEach((n) => fromSlots.add(n)));
    coachingIncomes.forEach((c) => (c.studentNames || []).forEach((n) => fromSlots.add(n)));
    const all = new Set([...fromStudents, ...fromSlots]);
    return [...all].filter(Boolean).sort();
  }, [students, slots, coachingIncomes]);

  // ── Month nav ─────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // ── Save slot → auto-create income ───────────────────────────────────────
  const handleSlotSubmit = async (data) => {
    setAddLoading(true);
    setAddError('');
    try {
      // 1. Save the slot
      const slotRes = await api.createCoachScheduleSlot(data);
      const newSlot = slotRes.data.data;

      // 2. Auto-create income entry
      const incomeData = {
        entryRole: 'coach',
        type: data.studentNames.length > 1 ? 'group_session' : 'private_lesson',
        date: data.date,
        studentNames: data.studentNames,
        students: Math.max(1, data.studentNames.length),
        incomeInputMode: 'lump',
        lumpAmount: data.feeAmount,
        totalEarned: data.feeAmount,
        expenseItems: data.sessionExpenses,
        paid: true,
        notes: data.notes || '',
      };
      const incomeRes = await api.createCoachingIncome(incomeData);
      const newIncome = incomeRes.data.data;

      // 3. Link slot to income
      try {
        const linked = await api.updateCoachScheduleSlot(newSlot._id, { linkedIncomeId: newIncome._id });
        setSlots((prev) => [...prev, linked.data.data]);
      } catch {
        setSlots((prev) => [...prev, newSlot]);
      }

      setCoachingIncomes((prev) => [newIncome, ...prev]);

      // Auto-persist student names
      if (data.studentNames.length > 0) {
        try {
          const stuRes = await api.upsertCoachStudents(data.studentNames);
          setStudents(stuRes.data.data || []);
        } catch { /* non-fatal */ }
      }

      setAddModal(null);
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm('Delete this slot and its income entry?')) return;
    try {
      await api.deleteCoachScheduleSlot(slot._id);
      setSlots((prev) => prev.filter((s) => s._id !== slot._id));
      // Also remove the linked income entry if it exists
      if (slot.linkedIncomeId) {
        try {
          await api.deleteCoachingIncome(slot.linkedIncomeId);
          setCoachingIncomes((prev) => prev.filter((c) => c._id !== slot.linkedIncomeId));
        } catch { /* non-fatal */ }
      }
      setDetailSlot(null);
    } catch { /* ignore */ }
  };

  const handleSlotEditSubmit = async (data) => {
    setEditLoading(true);
    setEditError('');
    try {
      const slotRes = await api.updateCoachScheduleSlot(editSlot._id, data);
      const updatedSlot = slotRes.data.data;

      // Patch linked income entry if it exists
      if (editSlot.linkedIncomeId) {
        const incomeUpdate = {
          type: data.studentNames.length > 1 ? 'group_session' : 'private_lesson',
          date: data.date,
          studentNames: data.studentNames,
          students: Math.max(1, data.studentNames.length),
          lumpAmount: data.feeAmount,
          totalEarned: data.feeAmount,
          expenseItems: data.sessionExpenses,
          notes: data.notes || '',
        };
        try {
          const incRes = await api.updateCoachingIncome(editSlot.linkedIncomeId, incomeUpdate);
          setCoachingIncomes((prev) =>
            prev.map((c) => (c._id === editSlot.linkedIncomeId ? incRes.data.data : c))
          );
        } catch { /* non-fatal */ }
      }

      setSlots((prev) => prev.map((s) => (s._id === updatedSlot._id ? updatedSlot : s)));

      // Auto-persist any new student names
      if (data.studentNames.length > 0) {
        try {
          const stuRes = await api.upsertCoachStudents(data.studentNames);
          setStudents(stuRes.data.data || []);
        } catch { /* non-fatal */ }
      }

      setEditSlot(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteIncome = async (id) => {
    if (!window.confirm('Delete this income entry?')) return;
    try {
      await api.deleteCoachingIncome(id);
      setCoachingIncomes((prev) => prev.filter((c) => c._id !== id));
    } catch { /* ignore */ }
  };

  const handleOverheadSubmit = async (data) => {
    setOverheadLoading(true);
    try {
      const res = await api.createCoachOverhead(data);
      setOverheads((prev) => [res.data.data, ...prev]);
      setOverheadModal(false);
    } catch { /* ignore */ } finally { setOverheadLoading(false); }
  };

  const handleDeleteOverhead = async (id) => {
    if (!window.confirm('Delete this overhead expense?')) return;
    try {
      await api.deleteCoachOverhead(id);
      setOverheads((prev) => prev.filter((o) => o._id !== id));
    } catch { /* ignore */ }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Remove ${student.name} from your student list?`)) return;
    try {
      await api.deleteCoachStudent(student._id);
      setStudents((prev) => prev.filter((s) => s._id !== student._id));
    } catch { /* ignore */ }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><PaddleLoader /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-black text-gray-900">Coach Hub</h1>
          <p className="text-xs text-gray-500 mt-0.5">Timetable and income tracking</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-10">
        <div className="max-w-4xl mx-auto flex">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-[#91BE4D] text-[#4a6e10]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4">
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        {/* ── SCHEDULE TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'Schedule' && (
          <div>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-bold text-gray-800 text-base">{monthLabel}</span>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mb-3">Tap a date to add a session</p>

            {/* Calendar grid */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
              <div className="grid grid-cols-7 border-b border-gray-100">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthGrid.map((day, i) => {
                  if (!day) return <div key={i} className="min-h-[72px] sm:min-h-[90px] border-b border-r border-gray-50 last:border-r-0" />;
                  const dateStr = toDateStr(viewYear, viewMonth, day);
                  const daySlots = (slotsByDate[dateStr] || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const isToday = dateStr === todayStr;
                  return (
                    <div key={i}
                      onClick={() => setAddModal(dateStr)}
                      className="min-h-[72px] sm:min-h-[90px] border-b border-r border-gray-100 last:border-r-0 p-1 cursor-pointer hover:bg-[#f4f8e8] transition-colors active:bg-[#eef5e0]">
                      <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#91BE4D] text-white' : 'text-gray-700'}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {daySlots.slice(0, 3).map((s) => (
                          <div key={s._id}
                            onClick={(e) => { e.stopPropagation(); setDetailSlot(s); }}
                            className="text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded leading-tight truncate cursor-pointer bg-[#91BE4D]/15 text-[#4a6e10] hover:bg-[#91BE4D]/25">
                            {(s.studentNames || []).length > 0 ? s.studentNames[0] : '—'}
                            {(s.studentNames || []).length > 1 && ` +${s.studentNames.length - 1}`}
                          </div>
                        ))}
                        {daySlots.length > 3 && (
                          <div className="text-[9px] text-gray-400 font-semibold pl-1">+{daySlots.length - 3}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slot list */}
            {slots.filter((s) => s.date.startsWith(yearMonth)).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{monthLabel} — sessions</p>
                {slots
                  .filter((s) => s.date.startsWith(yearMonth))
                  .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                  .map((s) => {
                    const exp = (s.expensesTotal || 0);
                    return (
                      <div key={s._id}
                        onClick={() => setDetailSlot(s)}
                        className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 cursor-pointer hover:border-[#91BE4D]/50 hover:bg-[#f9fbf4] transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900">
                            {(s.studentNames || []).length > 0 ? s.studentNames.join(', ') : '(no students)'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(s.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {' · '}{fmt12(s.startTime)} – {fmt12(s.endTime)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-emerald-700 text-sm">{symbol}{(s.feeAmount || 0).toLocaleString()}</p>
                          {exp > 0 && <p className="text-[10px] text-gray-400">net {symbol}{((s.feeAmount || 0) - exp).toLocaleString()}</p>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── STUDENTS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'Students' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">My Students</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {students.length} student{students.length !== 1 ? 's' : ''} · added automatically when you log sessions
                </p>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <div className="text-4xl mb-3">🎾</div>
                <p className="font-semibold text-gray-700">No students yet</p>
                <p className="text-sm text-gray-400 mt-1">Students are added automatically when you log coaching sessions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((stu) => {
                  const stats = studentStats[stu.name] || { sessions: 0, lastDate: '' };
                  return (
                    <div key={stu._id} className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#91BE4D]/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-black text-[#4a6e10]">{stu.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900">{stu.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {stats.sessions > 0
                            ? `${stats.sessions} session${stats.sessions !== 1 ? 's' : ''}${stats.lastDate ? ` · last ${new Date(stats.lastDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`
                            : 'No sessions this period'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteStudent(stu)}
                        className="text-xs text-red-400 hover:text-red-600 font-bold flex-shrink-0 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FINANCIALS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'Financials' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-bold text-gray-800 text-base">{monthLabel}</span>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Net summary */}
            <div className={`rounded-2xl border-2 p-4 ${financials.netIncome >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Monthly summary</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Gross income', financials.grossIncome, 'text-emerald-800'],
                  ['Session costs', financials.sessionCosts, 'text-rose-700'],
                  ['Overhead', financials.overheadTotal, 'text-rose-700'],
                  ['Net take-home', financials.netIncome, financials.netIncome >= 0 ? 'text-emerald-900' : 'text-amber-900'],
                ].map(([label, val, cls]) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-500 font-semibold">{label}</p>
                    <p className={`text-lg font-black ${cls}`}>{symbol}{Math.abs(val).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Income entries */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-3">Income entries</h3>
              {monthIncomes.filter((c) => c.entryRole !== 'player').length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  <p className="text-sm text-gray-400">No sessions logged for {monthLabel}.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {monthIncomes.filter((c) => c.entryRole !== 'player').map((c) => (
                    <div key={c._id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-900">{symbol}{(c.totalEarned || 0).toLocaleString()}</span>
                          {c.expensesTotal > 0 && (
                            <span className="text-[10px] text-gray-500">net {symbol}{((c.totalEarned || 0) - c.expensesTotal).toLocaleString()}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{c.date}{c.studentNames?.length > 0 ? ` · ${c.studentNames.join(', ')}` : ''}</p>
                      </div>
                      <button onClick={() => handleDeleteIncome(c._id)} className="text-xs text-red-400 hover:text-red-600 font-bold flex-shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overhead expenses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Overhead expenses</h3>
                  <p className="text-[11px] text-gray-400">Monthly fixed costs — venue rent, food, etc.</p>
                </div>
                <button onClick={() => setOverheadModal(true)}
                  className="text-xs font-bold border border-[#91BE4D]/50 text-[#4a6e10] px-3 py-1.5 rounded-lg hover:bg-[#f4f8e8]">
                  + Add
                </button>
              </div>
              {overheads.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p className="text-sm text-gray-400">No overhead for {monthLabel}.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {overheads.map((o) => (
                    <div key={o._id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">−{symbol}{o.amount.toLocaleString()}</span>
                          <span className="text-[10px] font-semibold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full">{OVERHEAD_LABELS[o.category] || o.category}</span>
                        </div>
                        {o.note && <p className="text-xs text-gray-500 mt-0.5">{o.note}</p>}
                      </div>
                      <button onClick={() => handleDeleteOverhead(o._id)} className="text-xs text-red-400 hover:text-red-600 font-bold flex-shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Slot Modal ─────────────────────────────────────────────────── */}
      {addModal && (
        <Modal isOpen onClose={() => { setAddModal(null); setAddError(''); }} title="Add session">
          {addError && <p className="text-red-500 text-sm mb-3">{addError}</p>}
          <SlotForm
            initialDate={addModal}
            knownStudents={knownStudents}
            onSubmit={handleSlotSubmit}
            onCancel={() => { setAddModal(null); setAddError(''); }}
            loading={addLoading}
          />
        </Modal>
      )}

      {/* ── Slot Detail Modal (view / edit / delete) ───────────────────────── */}
      {detailSlot && (
        <Modal isOpen onClose={() => setDetailSlot(null)} title="Session details">
          <SlotDetail
            slot={detailSlot}
            symbol={symbol}
            onEdit={() => { setEditSlot(detailSlot); setDetailSlot(null); }}
            onDelete={() => handleDeleteSlot(detailSlot)}
            onClose={() => setDetailSlot(null)}
          />
        </Modal>
      )}

      {/* ── Edit Slot Modal ─────────────────────────────────────────────────── */}
      {editSlot && (
        <Modal isOpen onClose={() => { setEditSlot(null); setEditError(''); }} title="Edit session">
          {editError && <p className="text-red-500 text-sm mb-3">{editError}</p>}
          <SlotForm
            initialData={editSlot}
            knownStudents={knownStudents}
            onSubmit={handleSlotEditSubmit}
            onCancel={() => { setEditSlot(null); setEditError(''); }}
            loading={editLoading}
            isEdit
          />
        </Modal>
      )}

      {/* ── Overhead Modal ─────────────────────────────────────────────────── */}
      {overheadModal && (
        <Modal isOpen onClose={() => setOverheadModal(false)} title="Add overhead expense">
          <OverheadForm
            yearMonth={yearMonth}
            onSubmit={handleOverheadSubmit}
            onCancel={() => setOverheadModal(false)}
            loading={overheadLoading}
          />
        </Modal>
      )}
    </div>
  );
}
