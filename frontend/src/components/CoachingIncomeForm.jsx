import { useState, useEffect, useRef } from 'react';
import { getCurrencySymbol } from '../utils/format';
import useCurrency from '../hooks/useCurrency';

/** Coach: session formats (legacy workshop/bootcamp → Group). */
const COACHING_PRESETS = [
  { value: 'private_lesson', label: 'Private', icon: '👤', sub: '1-on-1' },
  { value: 'group_session', label: 'Group', icon: '👥', sub: 'Small group' },
  { value: 'monthly_package', label: 'Monthly', icon: '📅', sub: 'Plan / retainer' },
];

/** Player: what kind of payment this row is. */
const PLAYER_PACKAGE = [
  { value: 'private_lesson', label: 'Private session', icon: '👤', sub: 'Per lesson / drop-in' },
  { value: 'monthly_package', label: 'Monthly / package', icon: '📅', sub: 'Plan, pack, or retainer' },
];

const EXPENSE_CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'venue_court', label: 'Venue or court' },
  { value: 'materials', label: 'Materials' },
  { value: 'other', label: 'Other' },
];

const today = () => new Date().toISOString().split('T')[0];

const LEGACY_TO_SIMPLE = {
  workshop: 'group_session',
  bootcamp: 'group_session',
  private_lesson: 'private_lesson',
  group_session: 'group_session',
  monthly_package: 'monthly_package',
};

function normalizeTypeForForm(t) {
  return LEGACY_TO_SIMPLE[t] || 'group_session';
}

const EMPTY = {
  type: 'private_lesson',
  date: today(),
  studentNames: [],
  students: 1,
  totalIncome: '',
  notes: '',
  expenseItems: [],
  coachName: '',
  playerAmount: '',
};

function wholeAmountString(raw) {
  const s = String(raw ?? '').trim().replace(/,/g, '');
  if (s === '') return '';
  const n = Math.floor(Number(s));
  if (!Number.isFinite(n) || n < 0) return '';
  return String(n);
}

function cleanExpenseItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((e) => ({
      category: e.category,
      amount: Math.max(0, Math.floor(Number(e.amount) || 0)),
      note: (e.note || '').trim().slice(0, 200),
    }))
    .filter((e) => e.category && e.amount > 0);
}

function getGrossForEdit(initial) {
  if (initial == null) return '';
  let n = 0;
  if (initial.totalEarned != null && initial.totalEarned !== '') {
    n = Number(initial.totalEarned);
  } else if (initial.incomeInputMode === 'lump' && initial.lumpAmount != null && initial.lumpAmount !== '') {
    n = Number(initial.lumpAmount);
  } else {
    const s = Number(initial.students) || 0;
    const f = Number(initial.feePerStudent) || 0;
    n = s && f ? s * f : 0;
  }
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.floor(Math.abs(n)));
}

export default function CoachingIncomeForm({ initial, onSubmit, onCancel, loading }) {
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const [roleTab, setRoleTab] = useState('coach');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [nameInput, setNameInput] = useState('');
  const nameRef = useRef(null);

  const roleLocked = !!initial?._id;

  useEffect(() => {
    if (!initial) {
      setRoleTab('coach');
      setForm(EMPTY);
      setNameInput('');
      return;
    }
    const isPlayer = initial.entryRole === 'player';
    setRoleTab(isPlayer ? 'player' : 'coach');
    if (isPlayer) {
      const amt = initial.playerAmountPaid;
      setForm({
        ...EMPTY,
        type: initial.type === 'monthly_package' ? 'monthly_package' : 'private_lesson',
        date: initial.date || today(),
        coachName: initial.coachName || '',
        playerAmount:
          amt != null && amt !== '' && Number.isFinite(Number(amt)) && Number(amt) > 0
            ? String(Math.floor(Number(amt)))
            : '',
        notes: initial.notes || '',
      });
      setNameInput('');
    } else {
      setForm({
        type: normalizeTypeForForm(initial.type),
        date: initial.date || today(),
        studentNames: initial.studentNames || [],
        students: initial.students || 1,
        totalIncome: getGrossForEdit(initial),
        notes: initial.notes || '',
        coachName: '',
        playerAmount: '',
        expenseItems:
          initial.expenseItems?.length > 0
            ? initial.expenseItems.map((e) => {
                const c = e.category;
                const simple =
                  c === 'travel' || c === 'venue_court' || c === 'materials' ? c : 'other';
                return {
                  category: simple,
                  amount: e.amount != null && e.amount !== '' ? wholeAmountString(String(e.amount)) : '',
                  note: e.note || '',
                };
              })
            : [],
      });
      setNameInput('');
    }
  }, [initial]);

  const totalEarned = Math.max(0, Math.floor(Number(form.totalIncome) || 0));
  const expensesSubtotal = form.expenseItems.reduce(
    (s, e) => s + Math.max(0, Math.floor(Number(e.amount) || 0)),
    0
  );
  const netToCoach = totalEarned - expensesSubtotal;

  const setType = (value) => {
    setForm((p) => {
      let nextStudents = p.students;
      if (value === 'private_lesson') nextStudents = 1;
      if (value === 'group_session') nextStudents = Math.max(Number(p.students) || 0, 2);
      if (value === 'monthly_package') nextStudents = Math.max(1, Number(p.students) || 1);
      return { ...p, type: value, students: nextStudents };
    });
  };

  const setPlayerPackage = (value) => {
    setForm((p) => ({ ...p, type: value }));
  };

  const addName = () => {
    const name = nameInput.trim();
    if (!name) return;
    if (form.studentNames.includes(name)) {
      setNameInput('');
      return;
    }
    setForm((p) => ({
      ...p,
      studentNames: [...p.studentNames, name],
    }));
    setNameInput('');
    nameRef.current?.focus();
  };

  const removeName = (name) => {
    setForm((p) => ({
      ...p,
      studentNames: p.studentNames.filter((n) => n !== name),
    }));
  };

  const handleNameKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addName();
    }
    if (e.key === 'Backspace' && !nameInput && form.studentNames.length > 0) {
      removeName(form.studentNames[form.studentNames.length - 1]);
    }
  };

  const addExpenseRow = () => {
    setForm((p) => ({
      ...p,
      expenseItems: [...p.expenseItems, { category: 'travel', amount: '', note: '' }],
    }));
  };

  const updateExpense = (index, field, value) => {
    setForm((p) => {
      const next = p.expenseItems.map((row, i) => (i === index ? { ...row, [field]: value } : row));
      return { ...p, expenseItems: next };
    });
  };

  const removeExpense = (index) => {
    setForm((p) => ({
      ...p,
      expenseItems: p.expenseItems.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Date is required';

    if (roleTab === 'player') {
      if (form.playerAmount === '' || form.playerAmount == null) {
        errs.playerAmount = 'Enter what you paid';
      } else if (
        Number.isNaN(Number(form.playerAmount)) ||
        Number(form.playerAmount) < 1 ||
        !Number.isInteger(Number(form.playerAmount))
      ) {
        errs.playerAmount = 'Use a whole number (at least 1)';
      }
      return errs;
    }

    if (form.totalIncome === '' || form.totalIncome == null) errs.totalIncome = 'Enter what you earned';
    else if (
      Number.isNaN(Number(form.totalIncome)) ||
      Number(form.totalIncome) < 0 ||
      !Number.isInteger(Number(form.totalIncome))
    ) {
      errs.totalIncome = 'Use a whole number (no decimals)';
    }
    if (Number(form.students) < 1) errs.students = 'At least 1';
    form.expenseItems.forEach((row, i) => {
      const amt = Number(row.amount);
      if (row.amount !== '' && row.amount != null && (isNaN(amt) || amt < 0 || !Number.isInteger(amt))) {
        errs[`ex_${i}`] = 'Use a whole number (no decimals)';
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

    if (roleTab === 'player') {
      const paid = Math.max(1, Math.floor(Number(form.playerAmount) || 0));
      onSubmit({
        entryRole: 'player',
        type: form.type === 'monthly_package' ? 'monthly_package' : 'private_lesson',
        date: form.date,
        coachName: form.coachName.trim(),
        playerAmountPaid: paid,
        studentNames: [],
        students: 1,
        feePerStudent: 0,
        incomeInputMode: 'lump',
        lumpAmount: 0,
        lumpLabel: '',
        lumpContext: '',
        expenseItems: [],
        paid: true,
        notes: form.notes.trim(),
      });
      return;
    }

    const expenseItems = cleanExpenseItems(form.expenseItems);
    const gross = Math.max(0, Math.floor(Number(form.totalIncome) || 0));
    const lumpContext = form.type === 'monthly_package' ? 'monthly' : '';

    onSubmit({
      entryRole: 'coach',
      type: form.type,
      date: form.date,
      studentNames: form.studentNames,
      students: Math.max(1, Math.floor(Number(form.students) || 1)),
      incomeInputMode: 'lump',
      feePerStudent: 0,
      lumpAmount: gross,
      lumpLabel: '',
      lumpContext,
      totalEarned: gross,
      expenseItems,
      paid: true,
      notes: form.notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-7 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#91BE4D]/30 border-t-[#91BE4D] animate-spin" />
            <p className="text-sm font-semibold text-gray-800">Saving…</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 sm:p-4 shadow-sm">
        <p className="text-sm font-extrabold text-gray-900 mb-1">Are you the coach or the student?</p>
        <p className="text-xs text-gray-500 mb-3 leading-snug">
          Pick one — the form below changes. Coaches log <span className="font-semibold text-gray-700">income</span>
          {' '}they earned; students log <span className="font-semibold text-gray-700">what they paid</span> for coaching.
        </p>

        <div
          className="flex rounded-xl p-1 gap-1 bg-gray-200/90"
          role="tablist"
          aria-label="Coach or student for this entry"
        >
          <button
            type="button"
            role="tab"
            aria-selected={roleTab === 'coach'}
            disabled={roleLocked}
            onClick={() => {
              if (roleLocked) return;
              setRoleTab('coach');
              setErrors({});
            }}
            className={`flex-1 min-w-0 rounded-lg py-2.5 px-2 text-center transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-70 ${
              roleTab === 'coach'
                ? 'bg-white text-[#1c350a] ring-1 ring-[#91BE4D]/40'
                : 'bg-transparent text-gray-500 hover:bg-white/50 hover:text-gray-700'
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#91BE4D] mb-0.5">Coach</span>
            <span className="block text-xs sm:text-sm font-extrabold leading-tight">I taught &amp; earned</span>
            <span className="hidden sm:block text-[10px] text-gray-400 font-medium mt-0.5">Income + my costs</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roleTab === 'player'}
            disabled={roleLocked}
            onClick={() => {
              if (roleLocked) return;
              setRoleTab('player');
              setErrors({});
              setForm((p) => ({
                ...p,
                type: p.type === 'monthly_package' ? 'monthly_package' : 'private_lesson',
              }));
            }}
            className={`flex-1 min-w-0 rounded-lg py-2.5 px-2 text-center transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-70 ${
              roleTab === 'player'
                ? 'bg-white text-teal-950 ring-1 ring-teal-300/60'
                : 'bg-transparent text-gray-500 hover:bg-white/50 hover:text-gray-700'
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-600 mb-0.5">Student</span>
            <span className="block text-xs sm:text-sm font-extrabold leading-tight">I paid for lessons</span>
            <span className="hidden sm:block text-[10px] text-gray-400 font-medium mt-0.5">Private or monthly fee</span>
          </button>
        </div>

        <p className="text-[11px] text-gray-600 mt-3 leading-relaxed border-t border-gray-100 pt-3">
          {roleTab === 'coach' ? (
            <>
              <span className="font-bold text-[#4a6e10]">Coach mode:</span> enter what you were paid for this lesson or plan, and optionally costs you had (travel, court share, etc.).
            </>
          ) : (
            <>
              <span className="font-bold text-teal-800">Student mode:</span> enter what <em>you</em> paid your coach or academy — one private session or one monthly / package payment.
            </>
          )}
        </p>
        {roleLocked && (
          <p className="text-[10px] text-amber-900 mt-2 rounded-lg px-2.5 py-2 bg-amber-50 border border-amber-200/80 leading-snug">
            You can&apos;t switch coach / student while editing — this entry was already saved in one role.
          </p>
        )}
      </div>

      {roleTab === 'player' ? (
        <>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What kind of payment was this?</p>
            <div className="grid grid-cols-2 gap-2">
              {PLAYER_PACKAGE.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPlayerPackage(t.value)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 px-1.5 rounded-xl border-2 text-center transition-all ${
                    form.type === t.value
                      ? 'border-teal-400 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className={`text-xs font-extrabold ${form.type === t.value ? 'text-teal-900' : 'text-gray-800'}`}>
                    {t.label}
                  </span>
                  <span className="text-[10px] text-gray-500 leading-tight hidden sm:block">{t.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div data-error-key="date">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => {
                setForm((p) => ({ ...p, date: e.target.value }));
                setErrors((er) => ({ ...er, date: '' }));
              }}
              className="w-full sm:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Coach or academy (optional)
            </label>
            <input
              type="text"
              value={form.coachName}
              onChange={(e) => setForm((p) => ({ ...p, coachName: e.target.value }))}
              placeholder="e.g. Coach Sam, City Pickle Academy"
              maxLength={200}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div data-error-key="playerAmount" className="rounded-2xl border-2 border-teal-200 bg-teal-50/50 p-3 sm:p-4">
            <label className="block text-sm font-extrabold text-teal-950 mb-1">Amount you paid</label>
            <p className="text-[11px] text-gray-600 mb-2">
              One private lesson, or one line for a monthly / package payment (whole numbers).
            </p>
            <div className="flex items-center border border-gray-300 rounded-xl px-3 py-2 bg-white">
              <span className="text-gray-600 text-lg font-bold mr-1">{symbol}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={form.playerAmount}
                onChange={(e) => {
                  setForm((p) => ({ ...p, playerAmount: wholeAmountString(e.target.value) }));
                  setErrors((er) => ({ ...er, playerAmount: '' }));
                }}
                placeholder="0"
                className="w-full text-lg font-bold text-gray-900 py-1 focus:outline-none"
              />
            </div>
            {errors.playerAmount && <p className="text-red-500 text-xs mt-1">{errors.playerAmount}</p>}
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type</p>
            <div className="grid grid-cols-3 gap-2">
              {COACHING_PRESETS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 px-1.5 rounded-xl border-2 text-center transition-all ${
                    form.type === t.value
                      ? 'border-[#91BE4D] bg-[#91BE4D]/8'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className={`text-xs font-extrabold ${form.type === t.value ? 'text-[#4a6e10]' : 'text-gray-800'}`}>
                    {t.label}
                  </span>
                  <span className="text-[10px] text-gray-500 leading-tight hidden sm:block">{t.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div data-error-key="date">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => {
                setForm((p) => ({ ...p, date: e.target.value }));
                setErrors((er) => ({ ...er, date: '' }));
              }}
              className="w-full sm:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>

          <div data-error-key="totalIncome" className="rounded-2xl border-2 border-[#91BE4D]/30 bg-[#f8fbf0] p-3 sm:p-4">
            <label className="block text-sm font-extrabold text-[#1c350a] mb-1">Total income earned</label>
            <p className="text-[11px] text-gray-500 mb-2">
              What you are owed for this session, lesson, or monthly line (before your costs below).
            </p>
            <div className="flex items-center border border-gray-300 rounded-xl px-3 py-2 bg-white">
              <span className="text-gray-600 text-lg font-bold mr-1">{symbol}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={form.totalIncome}
                onChange={(e) => {
                  setForm((p) => ({ ...p, totalIncome: wholeAmountString(e.target.value) }));
                  setErrors((er) => ({ ...er, totalIncome: '' }));
                }}
                placeholder="0"
                className="w-full text-lg font-bold text-gray-900 py-1 focus:outline-none"
              />
            </div>
            {errors.totalIncome && <p className="text-red-500 text-xs mt-1">{errors.totalIncome}</p>}
          </div>

          <div data-error-key="students">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">How many people</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.students}
              onChange={(e) => {
                const s = wholeAmountString(e.target.value);
                if (s === '') setForm((p) => ({ ...p, students: '' }));
                else setForm((p) => ({ ...p, students: Math.max(1, parseInt(s, 10)) }));
                setErrors((er) => ({ ...er, students: '' }));
              }}
              className="w-full sm:max-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {errors.students && <p className="text-red-500 text-xs mt-1">{errors.students}</p>}
          </div>

          <div className="border border-dashed border-gray-200 rounded-xl p-3 sm:p-4 bg-gray-50/80">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Session expenses</p>
            <p className="text-[11px] text-gray-500 mb-2">Optional. Things you paid to run this (gas, court fee, etc.).</p>
            {form.expenseItems.length === 0 && <p className="text-xs text-gray-400 mb-2">None added.</p>}
            <div className="space-y-2 mb-2">
              {form.expenseItems.map((row, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-end gap-2 p-2 rounded-lg bg-white border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Type</label>
                    <select
                      value={row.category}
                      onChange={(e) => updateExpense(i, 'category', e.target.value)}
                      className="w-full mt-0.5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-24">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Amount</label>
                    <div className="mt-0.5 flex items-center border border-gray-300 rounded-lg px-2">
                      <span className="text-gray-500 text-sm">{symbol}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={row.amount}
                        onChange={(e) => updateExpense(i, 'amount', wholeAmountString(e.target.value))}
                        placeholder="0"
                        className="w-full py-1.5 pl-1 text-sm focus:outline-none"
                      />
                    </div>
                    {errors[`ex_${i}`] && <p className="text-red-500 text-[10px] mt-0.5">{errors[`ex_${i}`]}</p>}
                  </div>
                  <div className="flex-1 min-w-0 sm:pb-0.5">
                    <input
                      type="text"
                      value={row.note}
                      onChange={(e) => updateExpense(i, 'note', e.target.value)}
                      placeholder="What for (optional)"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                      maxLength={200}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExpense(i)}
                    className="self-end text-red-500 text-xs font-bold px-2 py-1 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addExpenseRow}
              className="text-sm font-bold text-[#4a6e10] border border-[#91BE4D]/50 rounded-lg px-3 py-1.5 hover:bg-[#f4f8e8] w-full sm:w-auto"
            >
              + Add expense
            </button>
            {expensesSubtotal > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                Costs:{' '}
                <span className="font-bold text-rose-700">
                  −{symbol}
                  {expensesSubtotal.toLocaleString()}
                </span>
              </p>
            )}
          </div>

          {(totalEarned > 0 || form.totalIncome !== '' || expensesSubtotal > 0) && (
            <div
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 border ${
                netToCoach >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">You keep (net)</p>
                <p className="text-[10px] text-gray-500">After session expenses</p>
              </div>
              <span className={`text-lg font-black ${netToCoach >= 0 ? 'text-emerald-800' : 'text-amber-900'}`}>
                {symbol}
                {netToCoach.toLocaleString()}
              </span>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Names (optional)</p>
            <p className="text-[11px] text-gray-500 mb-2">For your &ldquo;By student&rdquo; summary — press Enter after each name.</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.studentNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 text-xs bg-[#91BE4D]/15 text-[#4a6e10] border border-[#91BE4D]/30 px-2.5 py-1 rounded-full font-semibold"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeName(name)}
                    className="text-[#4a6e10]/60 hover:text-red-500 leading-none font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                ref={nameRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleNameKey}
                placeholder="Name"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addName}
                className="px-3 py-2 rounded-lg border border-[#91BE4D]/40 text-[#4a6e10] text-sm font-semibold hover:bg-[#91BE4D]/10"
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={2}
          maxLength={1000}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1 pb-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded-lg text-sm tracking-wide transition-opacity"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-lg text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
