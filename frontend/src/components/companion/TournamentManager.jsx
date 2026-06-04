import React, { useEffect, useMemo, useRef, useState } from 'react';
import { T } from './theme';
import { Icon } from './erne/Icon';
import { MedalDot } from './Cards';

const medalKey = (v) => ({ gold: 'gold', silver: 'silver', bronze: 'bronze' }[String(v || '').toLowerCase()] || null);
import {
  getCompanionTournaments,
  updateTournament,
  deleteTournament,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../../services/api';

// Travel-cost line items shown in the editor → Expense model field names.
const TRAVEL_FIELDS = [
  ['accommodation', 'Hotel'],
  ['transport', 'Transport'],
  ['food', 'Food'],
  ['localCommute', 'Local commute'],
  ['others', 'Other'],
];
const emptyTravel = () => ({ accommodation: 0, transport: 0, food: 0, localCommute: 0, others: 0 });
const travelTotal = (t) => TRAVEL_FIELDS.reduce((s, [k]) => s + (Number(t?.[k]) || 0), 0);

/**
 * TournamentManager — single popup that replaces the separate "My upcoming"
 * and "My tournaments" cards. Year selector at top, month-wise accordions
 * below. Each tournament can be edited inline (structured fields OR a
 * type-to-edit natural-language box) and deleted (with confirm).
 *
 * Opened in mode 'upcoming' auto-expands the month of the nearest upcoming
 * tournament; mode 'all' expands the current month.
 *
 * Props: initialItems, mode, categories[], onClose, onChanged(items)
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MEDALS = ['None', 'Gold', 'Silver', 'Bronze'];
const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [, m, d] = iso.split('-');
  return `${MON_SHORT[+m - 1]} ${+d}`;
};

// Earliest dated category drives where a tournament sits in the calendar.
const primaryDate = (it) => {
  const ds = (it.raw?.categories || it.payload?.categories || [])
    .map((c) => c.date)
    .filter(Boolean)
    .sort();
  return ds[0] || null;
};

const cloneCats = (cats) =>
  (cats || []).map((c) => ({
    categoryName: c.categoryName || '',
    date: c.date || '',
    medal: c.medal || 'None',
    entryFee: c.entryFee != null ? c.entryFee : 0,
    prizeAmount: c.prizeAmount != null ? c.prizeAmount : 0,
    partnerName: c.partnerName || '',
  }));

export default function TournamentManager({ initialItems = [], mode = 'all', categories = [], autoEditId = null, onClose, onChanged }) {
  const [items, setItems] = useState(initialItems);
  const [year, setYear] = useState(null);
  const [expanded, setExpanded] = useState({}); // key `${year}-${monthIdx}` -> bool
  const [editingId, setEditingId] = useState(null);
  const [work, setWork] = useState(null); // { name, sport, location, categories[] }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // tournamentId -> existing travel Expense doc (one per tournament).
  const [travelByTid, setTravelByTid] = useState({});

  // Load existing travel expenses once so the editor can prefill + update them.
  const loadTravel = async () => {
    try {
      const { data } = await getExpenses();
      const map = {};
      for (const e of data.data || []) {
        if (e.type === 'travel' && e.tournamentId) map[e.tournamentId] = e;
      }
      setTravelByTid(map);
    } catch { /* non-fatal — editor still works, just no prefill */ }
  };
  useEffect(() => { loadTravel(); }, []);

  // Years present (+ current), newest first.
  const years = useMemo(() => {
    const set = new Set(items.map((it) => primaryDate(it)).filter(Boolean).map((d) => +d.slice(0, 4)));
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [items]);

  // Initial year + expanded month, depending on mode. Runs once per open.
  useEffect(() => {
    const now = new Date();
    if (mode === 'upcoming') {
      const upcoming = items
        .filter((it) => it.preview?.status === 'upcoming' && primaryDate(it))
        .sort((a, b) => (primaryDate(a) > primaryDate(b) ? 1 : -1));
      if (upcoming.length) {
        const d = primaryDate(upcoming[0]);
        const y = +d.slice(0, 4);
        const m = +d.slice(5, 7) - 1;
        setYear(y);
        setExpanded({ [`${y}-${m}`]: true });
        return;
      }
    }
    const y = now.getFullYear();
    setYear(y);
    setExpanded({ [`${y}-${now.getMonth()}`]: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tournaments for the selected year, bucketed by month index.
  const byMonth = useMemo(() => {
    const map = {};
    for (const it of items) {
      const d = primaryDate(it);
      if (!d || +d.slice(0, 4) !== year) continue;
      const m = +d.slice(5, 7) - 1;
      (map[m] = map[m] || []).push(it);
    }
    return map;
  }, [items, year]);

  const undated = useMemo(
    () => (year === new Date().getFullYear() ? items.filter((it) => !primaryDate(it)) : []),
    [items, year]
  );

  const monthKeys = Object.keys(byMonth).map(Number).sort((a, b) => a - b);

  const refresh = async () => {
    const { data } = await getCompanionTournaments();
    const next = data.data || [];
    setItems(next);
    onChanged?.(next);
    return next;
  };

  const toggleMonth = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const startEdit = (it) => {
    setErr('');
    setEditingId(it.id);
    const existing = travelByTid[it.id];
    const travel = existing
      ? TRAVEL_FIELDS.reduce((o, [k]) => ({ ...o, [k]: existing[k] || 0 }), {})
      : emptyTravel();
    setWork({
      name: it.payload?.name || '',
      sport: it.payload?.sport || 'pickleball',
      location: it.payload?.location,
      categories: cloneCats(it.payload?.categories),
      travel,
      travelOpen: !!existing && travelTotal(travel) > 0,
    });
  };

  // Deep-link: a tournament id passed from the player card's "TOURNAMENT WINS"
  // row → jump straight into that tournament's editor (expand its month first).
  const autoEditDone = useRef(false);
  useEffect(() => {
    if (autoEditDone.current || !autoEditId) return;
    const it = items.find((i) => i.id === autoEditId);
    if (!it) return;
    autoEditDone.current = true;
    const d = primaryDate(it);
    if (d) {
      const y = +d.slice(0, 4);
      const m = +d.slice(5, 7) - 1;
      setYear(y);
      setExpanded((e) => ({ ...e, [`${y}-${m}`]: true }));
    }
    startEdit(it);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEditId, items]);

  const cancelEdit = () => {
    setEditingId(null);
    setWork(null);
    setErr('');
  };

  const setCat = (i, patch) =>
    setWork((w) => ({ ...w, categories: w.categories.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  const addCat = () =>
    setWork((w) => ({
      ...w,
      categories: [...w.categories, { categoryName: '', date: '', medal: 'None', entryFee: 0, prizeAmount: 0, partnerName: '' }],
    }));

  const removeCat = (i) => setWork((w) => ({ ...w, categories: w.categories.filter((_, j) => j !== i) }));

  const setTravel = (k, v) =>
    setWork((w) => ({ ...w, travel: { ...w.travel, [k]: v } }));

  // Create / update / delete the linked travel Expense based on the editor totals.
  const saveTravel = async (payload) => {
    const t = work.travel || emptyTravel();
    const total = travelTotal(t);
    const existing = travelByTid[editingId];
    if (total <= 0) {
      if (existing?._id) await deleteExpense(existing._id);
      return;
    }
    const date = (payload.categories.map((c) => c.date).filter(Boolean).sort()[0]) || todayISO();
    const body = {
      type: 'travel',
      title: `Travel — ${payload.name}`.slice(0, 100),
      amount: total,
      date,
      tournamentId: editingId,
      ...TRAVEL_FIELDS.reduce((o, [k]) => ({ ...o, [k]: Number(t[k]) || 0 }), {}),
    };
    if (existing?._id) await updateExpense(existing._id, body);
    else await createExpense(body);
    await loadTravel();
  };

  const validate = (w) => {
    if (!w.name.trim()) return 'Tournament name is required.';
    if (!w.categories.length) return 'Add at least one category.';
    for (const c of w.categories) {
      if (!c.categoryName) return 'Every category needs a name (pick from the list).';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date)) return 'Every category needs a date.';
    }
    return '';
  };

  const save = async () => {
    const v = validate(work);
    if (v) { setErr(v); return; }
    setBusy(true);
    setErr('');
    const payload = {
      name: work.name.trim(),
      sport: work.sport || 'pickleball',
      location: work.location,
      categories: work.categories.map((c) => {
        const medal = c.medal || 'None';
        return {
          categoryName: c.categoryName,
          date: c.date,
          medal,
          entryFee: Number(c.entryFee) || 0,
          prizeAmount: medal === 'None' ? 0 : Number(c.prizeAmount) || 0,
          partnerName: c.partnerName || '',
        };
      }),
    };
    try {
      await updateTournament(editingId, payload);
      await saveTravel(payload);
      await refresh();
      cancelEdit();
    } catch (e) {
      const errors = e.response?.data?.errors;
      setErr((Array.isArray(errors) && errors[0]) || e.response?.data?.message || 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (id) => {
    setBusy(true);
    try {
      await deleteTournament(id);
      const next = await refresh();
      setConfirmDeleteId(null);
      if (editingId === id) cancelEdit();
      return next;
    } catch {
      setErr('Could not delete that.');
    } finally {
      setBusy(false);
    }
  };

  const renderRow = (it) => {
    const p = it.preview || {};
    const isEditing = editingId === it.id;
    const isUpcoming = p.status === 'upcoming';

    return (
      <div key={it.id} style={{ background: T.navy3, borderRadius: 12, padding: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>{p.name || 'Tournament'}</div>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
              {[p.dates, p.venue].filter(Boolean).join(' · ')}
            </div>
          </div>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 999,
              background: isUpcoming ? '#eaf6cf' : T.navy,
              color: isUpcoming ? T.navy : T.muted,
              border: isUpcoming ? 'none' : `1px solid ${T.navy3}`,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name={isUpcoming ? 'calendar' : 'check'} size={10} color={isUpcoming ? T.navy : T.muted} />
            {isUpcoming ? 'Upcoming' : 'Done'}
          </span>
        </div>

        {!isEditing && (p.categories || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {p.categories.map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: T.white }}>
                {c.format}
                {c.result?.value ? (
                  <span style={{ color: T.lime, display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                    {' · '}
                    {medalKey(c.result.value) && <MedalDot medal={medalKey(c.result.value)} size={14} />}
                    {c.result.value}
                  </span>
                ) : null}
                {c.partner ? <span style={{ color: T.muted }}> · w/ {c.partner}</span> : null}
              </div>
            ))}
          </div>
        )}

        {/* edit panel */}
        {isEditing && work && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={lbl}>Name</label>
            <input style={inp} value={work.name} onChange={(e) => setWork((w) => ({ ...w, name: e.target.value }))} />

            {work.categories.map((c, i) => (
              <div key={i} style={{ background: T.navy, borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: T.muted }}>Category {i + 1}</span>
                  {work.categories.length > 1 && (
                    <button type="button" onClick={() => removeCat(i)} style={linkBtn}>Remove</button>
                  )}
                </div>
                <select style={inp} value={c.categoryName} onChange={(e) => setCat(i, { categoryName: e.target.value })}>
                  <option value="">Select category…</option>
                  {categories.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" style={{ ...inp, flex: 1 }} value={c.date} onChange={(e) => setCat(i, { date: e.target.value })} />
                  <select style={{ ...inp, flex: 1 }} value={c.medal} onChange={(e) => setCat(i, { medal: e.target.value })}>
                    {MEDALS.map((m) => (
                      <option key={m} value={m}>{m === 'None' ? 'No medal' : m}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" min="0" placeholder="Entry fee" style={{ ...inp, flex: 1 }} value={c.entryFee} onChange={(e) => setCat(i, { entryFee: e.target.value })} />
                  {c.medal !== 'None' && (
                    <input type="number" min="0" placeholder="Prize" style={{ ...inp, flex: 1 }} value={c.prizeAmount} onChange={(e) => setCat(i, { prizeAmount: e.target.value })} />
                  )}
                </div>
                <input placeholder="Partner (optional)" style={inp} value={c.partnerName} onChange={(e) => setCat(i, { partnerName: e.target.value })} />
              </div>
            ))}

            <button type="button" onClick={addCat} style={linkBtn}>+ Add category</button>

            {/* travel costs */}
            {!work.travelOpen ? (
              <button
                type="button"
                onClick={() => setWork((w) => ({ ...w, travelOpen: true }))}
                style={linkBtn}
              >
                + Add travel cost
              </button>
            ) : (
              <div style={{ background: T.navy, borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: T.muted }}>TRAVEL COST</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: T.lime }}>Total {travelTotal(work.travel)}</span>
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>
                  Tip: in chat you can type like “hotel - 2000, transport - 6000”.
                </div>
                {TRAVEL_FIELDS.map(([k, label]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: T.white, width: 110, flexShrink: 0 }}>{label}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      style={{ ...inp, flex: 1 }}
                      value={work.travel?.[k] ?? 0}
                      onChange={(e) => setTravel(k, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            {err && <div style={{ fontSize: 12, color: '#ff8a8a' }}>{err}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={save} disabled={busy} style={{ ...primaryBtn, flex: 1 }}>{busy ? 'Saving…' : 'Save changes'}</button>
              <button type="button" onClick={cancelEdit} disabled={busy} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        )}

        {/* row actions */}
        {!isEditing && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {confirmDeleteId === it.id ? (
              <>
                <button type="button" onClick={() => doDelete(it.id)} disabled={busy} style={{ ...dangerSolid, flex: 1 }}>{busy ? '…' : 'Confirm delete'}</button>
                <button type="button" onClick={() => setConfirmDeleteId(null)} style={ghostBtn}>Cancel</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => startEdit(it)} style={{ ...primaryBtn, flex: 1 }}>✏️ Edit</button>
                <button type="button" onClick={() => { setErr(''); setConfirmDeleteId(it.id); }} style={dangerGhost}>🗑️</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={sheet}>
        <div style={{ height: 5, background: T.lime }} />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 17, fontWeight: 800 }}>My tournaments</span>
            <button type="button" onClick={onClose} aria-label="Close" style={{ ...ghostBtn, padding: '4px 10px' }}>✕</button>
          </div>

          {/* year selector */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => { setYear(y); }}
                style={{
                  cursor: 'pointer',
                  fontFamily: T.font,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${T.lime}`,
                  background: y === year ? T.lime : 'transparent',
                  color: y === year ? T.navy : T.lime,
                }}
              >
                {y}
              </button>
            ))}
          </div>

          {/* month accordions */}
          <div style={{ marginTop: 14 }}>
            {monthKeys.length === 0 && undated.length === 0 && (
              <div style={{ fontSize: 13, color: T.muted, padding: '12px 0' }}>No tournaments in {year}.</div>
            )}

            {monthKeys.map((m) => {
              const key = `${year}-${m}`;
              const open = !!expanded[key];
              const list = byMonth[m];
              return (
                <div key={key} style={{ borderTop: `1px solid ${T.navy3}` }}>
                  <button type="button" onClick={() => toggleMonth(key)} style={accordionHead}>
                    <span>{MONTHS[m]} <span style={{ color: T.muted, fontWeight: 600 }}>({list.length})</span></span>
                    <span style={{ color: T.muted }}>{open ? '▾' : '▸'}</span>
                  </button>
                  {open && <div style={{ paddingBottom: 8 }}>{list.map(renderRow)}</div>}
                </div>
              );
            })}

            {undated.length > 0 && (
              <div style={{ borderTop: `1px solid ${T.navy3}` }}>
                <button type="button" onClick={() => toggleMonth(`${year}-undated`)} style={accordionHead}>
                  <span>Undated <span style={{ color: T.muted, fontWeight: 600 }}>({undated.length})</span></span>
                  <span style={{ color: T.muted }}>{expanded[`${year}-undated`] ? '▾' : '▸'}</span>
                </button>
                {expanded[`${year}-undated`] && <div style={{ paddingBottom: 8 }}>{undated.map(renderRow)}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  fontFamily: T.font,
};
const sheet = {
  width: '100%',
  maxWidth: 440,
  maxHeight: '90vh',
  overflowY: 'auto',
  background: `linear-gradient(160deg, ${T.navy2} 0%, ${T.navy} 100%)`,
  color: T.white,
  borderRadius: T.radius,
  border: `1px solid ${T.navy3}`,
};
const accordionHead = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: T.white,
  fontFamily: T.font,
  fontSize: 14,
  fontWeight: 700,
  padding: '12px 2px',
};
const lbl = { fontSize: 11.5, fontWeight: 700, color: T.muted };
const inp = {
  fontFamily: T.font,
  fontSize: 13.5,
  padding: '9px 11px',
  borderRadius: 10,
  border: `1px solid ${T.navy3}`,
  background: T.navy2,
  color: T.white,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
const primaryBtn = {
  cursor: 'pointer',
  fontFamily: T.font,
  fontSize: 13.5,
  fontWeight: 800,
  padding: '10px 14px',
  borderRadius: 10,
  background: T.lime,
  color: T.navy,
  border: 'none',
};
const ghostBtn = {
  cursor: 'pointer',
  fontFamily: T.font,
  fontSize: 13.5,
  fontWeight: 700,
  padding: '10px 14px',
  borderRadius: 10,
  background: 'transparent',
  color: T.white,
  border: `1px solid ${T.navy3}`,
};
const linkBtn = {
  cursor: 'pointer',
  fontFamily: T.font,
  fontSize: 12.5,
  fontWeight: 700,
  padding: 0,
  background: 'transparent',
  color: T.lime,
  border: 'none',
  alignSelf: 'flex-start',
};
const dangerGhost = {
  cursor: 'pointer',
  fontFamily: T.font,
  fontSize: 14,
  fontWeight: 700,
  padding: '10px 14px',
  borderRadius: 10,
  background: 'transparent',
  color: '#ff8a8a',
  border: '1px solid #ff8a8a',
};
const dangerSolid = {
  cursor: 'pointer',
  fontFamily: T.font,
  fontSize: 13.5,
  fontWeight: 800,
  padding: '10px 14px',
  borderRadius: 10,
  background: '#ff8a8a',
  color: T.navy,
  border: 'none',
};
