import React from 'react';
import { Icon } from './erne/Icon';
import LocationAutocomplete from '../LocationAutocomplete';

/* ---------- shared bits (Erne) ---------- */

const MEDAL = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// result:{type,value} → medal key (gold/silver/bronze) or null
const resultMedal = (result) => {
  if (!result || result.type !== 'medal') return null;
  const v = String(result.value || '').toLowerCase();
  return MEDAL[v] ? v : null;
};

const resultLabel = (result, upcoming) => {
  if (!result) return upcoming ? '—' : 'No medal';
  const { type, value } = result;
  if (type === 'medal') return value ? MEDAL[String(value).toLowerCase()] || value : 'No medal';
  if (type === 'placement') return value ? `#${value}` : 'Participated';
  if (type === 'time') return value || '—';
  if (type === 'score') return value || '—';
  return 'Participated';
};

export function MedalDot({ medal, size = 26 }) {
  const c = { gold: '#E6B43C', silver: '#B8BEC4', bronze: '#C77B45' }[medal] || 'var(--line)';
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle at 35% 30%, ${c}, ${c}99)`,
        boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.18)',
      }}
    >
      <Icon name="medal" size={size * 0.58} color="rgba(255,255,255,0.92)" stroke={1.9} />
    </span>
  );
}

function Shell({ children, accent, style }) {
  return (
    <div
      className="erne-card"
      style={{
        background: 'var(--surface)',
        color: 'var(--ink)',
        borderRadius: 18,
        padding: 16,
        border: accent ? '1.5px solid var(--accent)' : '1px solid var(--line)',
        boxShadow: '0 1px 2px rgba(20,22,15,0.04)',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    upcoming: { bg: 'var(--accent-soft)', fg: 'var(--ink)', bd: 'var(--accent)' },
    done: { bg: 'transparent', fg: 'var(--ink-soft)', bd: 'var(--line)' },
    neutral: { bg: 'transparent', fg: 'var(--ink-soft)', bd: 'var(--line)' },
  }[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '4px 9px',
        borderRadius: 999,
        background: tones.bg,
        color: tones.fg,
        border: `1px solid ${tones.bd}`,
      }}
    >
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = 'ghost', icon, full, small }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: small ? 12.5 : 14,
    padding: small ? '8px 13px' : '11px 16px',
    borderRadius: 12,
    border: '1.5px solid transparent',
    flex: full ? 1 : 'none',
    transition: 'transform .12s ease, background .15s ease',
    whiteSpace: 'nowrap',
  };
  const styles = {
    solid: { background: 'var(--ink)', color: 'var(--surface)' },
    accent: { background: 'var(--accent)', color: 'var(--accent-text)' },
    ghost: { background: 'transparent', color: 'var(--ink)', borderColor: 'var(--line)' },
  };
  return (
    <button type="button" onClick={onClick} className="erne-btn" style={{ ...base, ...styles[variant] }}>
      {icon && <Icon name={icon} size={small ? 15 : 17} />}
      {children}
    </button>
  );
}

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  background: 'var(--surface2)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '10px 13px',
};

/* ---------- TournamentPreviewCard ---------- */
// data: { name, dates, venue, status, categories:[{format,level,partner,result:{type,value},entryFee}], travelTotal }
//
// Edit paths:
//  - onEdit()           → conversational edit ("tell me what to change") — back-compat.
//  - onSave(d)          → INLINE manual edit, re-renders the summary afterwards.
//  - onSaveAndConfirm(d)→ INLINE form is the DEFAULT view: all fields shown prefilled,
//    the primary button applies the edits AND saves in one tap (no Edit click).
// When onSaveAndConfirm + categoryOptions are wired the card opens straight into
// the editable form; otherwise it falls back to the read-only summary + Edit.
export function TournamentPreviewCard({
  data,
  onConfirm,
  onEdit,
  onSave,
  onSaveAndConfirm,
  categoryOptions = [],
  confirmLabel = 'Looks right',
}) {
  // Default to the inline form when the save-and-confirm path is wired so the
  // user sees every prefilled detail immediately and can tweak in place.
  const inlineDefault = Boolean(onSaveAndConfirm && categoryOptions.length);
  const [editing, setEditing] = React.useState(inlineDefault);
  const { name, dates, venue, status = 'completed', categories = [], travelTotal = 0 } = data || {};
  const upcoming = status === 'upcoming';

  if (editing && (onSave || onSaveAndConfirm)) {
    return (
      <TournamentEditForm
        data={data}
        categoryOptions={categoryOptions}
        showHint={inlineDefault}
        saveLabel={inlineDefault ? confirmLabel : 'Done'}
        onCancel={inlineDefault ? null : () => setEditing(false)}
        onSave={(edited) => {
          // Inline-default form saves directly; legacy Edit-button form returns
          // to the summary so the user can confirm separately.
          if (inlineDefault && onSaveAndConfirm) {
            onSaveAndConfirm(edited);
          } else {
            setEditing(false);
            onSave(edited);
          }
        }}
      />
    );
  }

  // Prefer inline editing when the parent wired onSave + provided category options.
  const editHandler = onSave && categoryOptions.length ? () => setEditing(true) : onEdit;

  return (
    <Shell accent>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="erne-h"
            style={{
              fontSize: 19,
              lineHeight: 1.1,
              color: name ? 'var(--ink)' : 'var(--ink-soft)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name || 'Name needed'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 5, fontWeight: 600 }}>
            {[dates, venue].filter(Boolean).join('  ·  ')}
          </div>
        </div>
        <Pill tone={upcoming ? 'upcoming' : 'done'}>
          <Icon name={upcoming ? 'calendar' : 'check'} size={12} /> {upcoming ? 'Upcoming' : 'Completed'}
        </Pill>
      </div>

      {categories.length > 0 && (
        <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map((c, i) => {
            const medal = resultMedal(c.result);
            return (
              <div key={i} style={rowStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {medal && <MedalDot medal={medal} />}
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, display: 'block' }}>{c.format}</span>
                    {(c.level || c.partner) && (
                      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>
                        {[c.level, c.partner && `w/ ${c.partner}`].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                </span>
                <span style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, display: 'block' }}>
                    {resultLabel(c.result, upcoming)}
                  </span>
                  {c.entryFee != null && (
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
                      entry {inr(c.entryFee)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {travelTotal > 0 && (
        <div style={{ ...rowStyle, marginTop: 8, background: 'transparent', borderStyle: 'dashed' }}>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--ink-soft)',
              display: 'flex',
              gap: 7,
              alignItems: 'center',
            }}
          >
            <Icon name="bag" size={15} /> Travel costs
          </span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{inr(travelTotal)}</span>
        </div>
      )}

      {(onConfirm || editHandler) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {editHandler && <Btn onClick={editHandler} icon="edit" full>Edit</Btn>}
          {onConfirm && (
            <Btn variant="accent" onClick={onConfirm} icon="check" full>
              {confirmLabel}
            </Btn>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ---------- TournamentEditForm (inline manual editor) ---------- */
// Drives a local draft built from the preview card, then hands a normalized
// edited shape back up. The parent maps it onto its working refs (payload/raw/
// preview) so a manual edit and a conversational edit converge on the same save.
const MEDALS = ['None', 'Gold', 'Silver', 'Bronze'];
const TRAVEL_FIELDS = [
  ['transport', 'Transport (flight/train/cab)'],
  ['accommodation', 'Hotel / stay'],
  ['food', 'Food'],
  ['localCommute', 'Local commute'],
  ['others', 'Other'],
];
const sumTravel = (t) => TRAVEL_FIELDS.reduce((s, [k]) => s + (Number(t?.[k]) || 0), 0);

const fieldLabel = { fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 11px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  fontWeight: 600,
};

function TournamentEditForm({ data, categoryOptions, onCancel, onSave, showHint = false, saveLabel = 'Done' }) {
  // medal value lives on result:{type:'medal', value}; '' value = no medal (None).
  const medalOf = (c) => {
    if (!c.result || c.result.type !== 'medal' || !c.result.value) return 'None';
    const v = String(c.result.value).toLowerCase();
    return v === 'gold' ? 'Gold' : v === 'silver' ? 'Silver' : v === 'bronze' ? 'Bronze' : 'None';
  };

  const [name, setName] = React.useState(data?.name || '');
  // Location is a Google Places object {name,address,lat,lng,placeId}; we only
  // persist the name up (locationQuery) but keep the full object for the search.
  const [loc, setLoc] = React.useState(data?.venue ? { name: data.venue } : null);
  const [showVenue, setShowVenue] = React.useState(Boolean(data?.venue));
  const [cats, setCats] = React.useState(
    (data?.categories || []).map((c) => ({
      categoryName: c.format && c.format !== '(needs detail)' ? c.format : '',
      date: c.date || '',
      medal: medalOf(c),
      entryFee: c.entryFee != null ? c.entryFee : '',
      prizeAmount: c.prizeAmount != null ? c.prizeAmount : '',
      partnerName: c.partner || '',
    }))
  );
  const [travelOpen, setTravelOpen] = React.useState((data?.travelTotal || 0) > 0);
  const [travel, setTravel] = React.useState(
    data?.travel || { transport: 0, accommodation: 0, food: 0, localCommute: 0, others: 0 }
  );

  const setCat = (i, patch) => setCats((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const addCat = () =>
    setCats((cs) => [...cs, { categoryName: '', date: '', medal: 'None', entryFee: '', prizeAmount: '', partnerName: '' }]);
  const removeCat = (i) => setCats((cs) => (cs.length > 1 ? cs.filter((_, j) => j !== i) : cs));

  const isDoubles = (n) => /doubles|mixed/i.test(n);

  const save = () => {
    const travelTotal = travelOpen ? sumTravel(travel) : 0;
    onSave({
      name: name.trim(),
      locationQuery: showVenue && loc?.name?.trim() ? loc.name.trim() : null,
      categories: cats.map((c) => ({
        categoryName: c.categoryName || null,
        date: c.date || null,
        medal: c.medal || 'None',
        entryFee: c.entryFee === '' ? null : Math.max(0, Math.round(Number(c.entryFee) || 0)),
        prizeAmount:
          c.medal === 'None' ? 0 : c.prizeAmount === '' ? null : Math.max(0, Math.round(Number(c.prizeAmount) || 0)),
        partnerName: c.partnerName || '',
      })),
      travel:
        travelTotal > 0
          ? { ...travel, transport: Number(travel.transport) || 0, accommodation: Number(travel.accommodation) || 0,
              food: Number(travel.food) || 0, localCommute: Number(travel.localCommute) || 0, others: Number(travel.others) || 0,
              total: travelTotal }
          : null,
    });
  };

  return (
    <Shell accent>
      <div className="erne-h" style={{ fontSize: 16, marginBottom: showHint ? 4 : 10 }}>
        {showHint ? 'Review & save' : 'Edit details'}
      </div>
      {showHint && (
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 12, lineHeight: 1.35 }}>
          Everything I picked up is below — tweak anything right here, or just tell me in chat.
        </div>
      )}

      <label style={fieldLabel}>Tournament name</label>
      <input style={{ ...inputStyle, marginTop: 4 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mumbai Open" />

      {showVenue ? (
        <div style={{ marginTop: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={fieldLabel}>Location</label>
            <button type="button" onClick={() => { setShowVenue(false); setLoc(null); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              Remove
            </button>
          </div>
          <div style={{ marginTop: 4 }}>
            <LocationAutocomplete
              value={loc}
              onSelect={(place) => setLoc(place)}
              onClear={() => setLoc(null)}
            />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowVenue(true)}
          style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--line)', borderRadius: 10, padding: '8px 12px', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
          <Icon name="pin" size={14} /> Add location
        </button>
      )}

      <div style={{ height: 1, background: 'var(--line)', margin: '14px 0 10px' }} />
      <label style={fieldLabel}>Categories</label>

      {cats.map((c, i) => (
        <div key={i} style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 8, padding: 12 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select style={{ ...inputStyle, flex: 1 }} value={c.categoryName} onChange={(e) => setCat(i, { categoryName: e.target.value })}>
              <option value="">Pick a category…</option>
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {cats.length > 1 && (
              <button type="button" onClick={() => removeCat(i)} aria-label="Remove category"
                style={{ border: '1px solid var(--line)', background: 'transparent', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', color: 'var(--ink-soft)', flexShrink: 0 }}>
                <Icon name="trash" size={15} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Date</label>
              <input type="date" style={{ ...inputStyle, marginTop: 3 }} value={c.date} onChange={(e) => setCat(i, { date: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Result</label>
              <select style={{ ...inputStyle, marginTop: 3 }} value={c.medal} onChange={(e) => setCat(i, { medal: e.target.value })}>
                {MEDALS.map((m) => <option key={m} value={m}>{m === 'None' ? 'No medal' : m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Entry fee ₹</label>
              <input type="number" min="0" inputMode="numeric" style={{ ...inputStyle, marginTop: 3 }} value={c.entryFee} onChange={(e) => setCat(i, { entryFee: e.target.value })} placeholder="0" />
            </div>
            {c.medal !== 'None' && (
              <div style={{ flex: 1 }}>
                <label style={fieldLabel}>Prize won ₹</label>
                <input type="number" min="0" inputMode="numeric" style={{ ...inputStyle, marginTop: 3 }} value={c.prizeAmount} onChange={(e) => setCat(i, { prizeAmount: e.target.value })} placeholder="0" />
              </div>
            )}
          </div>

          {isDoubles(c.categoryName) && (
            <div>
              <label style={fieldLabel}>Partner (optional)</label>
              <input style={{ ...inputStyle, marginTop: 3 }} value={c.partnerName} onChange={(e) => setCat(i, { partnerName: e.target.value })} placeholder="Partner name" />
            </div>
          )}
        </div>
      ))}

      <button type="button" onClick={addCat}
        style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--line)', borderRadius: 10, padding: '8px 12px', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
        <Icon name="plus" size={14} /> Add category
      </button>

      <div style={{ height: 1, background: 'var(--line)', margin: '14px 0 10px' }} />

      {travelOpen ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={fieldLabel}>Travel cost ₹</label>
            <button type="button" onClick={() => setTravelOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              Remove
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 6 }}>
            {TRAVEL_FIELDS.map(([k, label]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
                <input type="number" min="0" inputMode="numeric" style={{ ...inputStyle, width: 110, flex: 'none' }}
                  value={travel[k] || ''} onChange={(e) => setTravel((t) => ({ ...t, [k]: e.target.value }))} placeholder="0" />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, fontWeight: 800 }}>
            <span style={{ color: 'var(--ink-soft)' }}>Travel total</span>
            <span>{inr(sumTravel(travel))}</span>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setTravelOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--line)', borderRadius: 10, padding: '8px 12px', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
          <Icon name="bag" size={14} /> Add travel cost
        </button>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {onCancel && <Btn onClick={onCancel} full>Cancel</Btn>}
        <Btn variant="accent" onClick={save} icon="check" full>{saveLabel}</Btn>
      </div>
    </Shell>
  );
}

/* ---------- GearPreviewCard ---------- */
// data: { title, amount, dateLabel, category }
export function GearPreviewCard({ data, onConfirm, onEdit, confirmLabel = 'Add to spending' }) {
  const { title, amount, dateLabel, category } = data || {};
  return (
    <Shell accent>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="bag" size={22} color="var(--ink)" />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="erne-h" style={{ fontSize: 17, color: title ? 'var(--ink)' : 'var(--ink-soft)' }}>
            {title || 'Item needed'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
            {[category, dateLabel].filter(Boolean).join(' · ') || 'Gear'}
          </div>
        </div>
        <div className="erne-h" style={{ fontSize: 18, color: amount ? 'var(--ink)' : 'var(--ink-soft)' }}>
          {amount ? inr(amount) : '—'}
        </div>
      </div>
      {(onConfirm || onEdit) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {onEdit && <Btn onClick={onEdit} icon="edit" full>Edit</Btn>}
          {onConfirm && (
            <Btn variant="accent" onClick={onConfirm} icon="check" full>
              {confirmLabel}
            </Btn>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ---------- ReminderPrompt ---------- */
export function ReminderPrompt({ tournamentName, onEnable, onSkip }) {
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="bell" size={21} color="var(--ink)" />
        </span>
        <div>
          <div className="erne-h" style={{ fontSize: 15 }}>Want a reminder?</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 1 }}>
            I'll ping you 1 day before {tournamentName ? `“${tournamentName}”` : 'your tournament'} so you
            never miss check-in.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
        <Btn onClick={onSkip} full>Not now</Btn>
        <Btn variant="accent" onClick={onEnable} icon="bell" full>Turn on</Btn>
      </div>
    </Shell>
  );
}

/* ---------- SavedCard (animated check + optional confetti) ---------- */
export function SavedCard({ title = 'Saved!', subtitle, celebrate }) {
  const dots = Array.from({ length: 10 });
  return (
    <Shell style={{ overflow: 'hidden', position: 'relative' }}>
      {celebrate && (
        <div style={{ position: 'absolute', left: 30, top: 28, pointerEvents: 'none' }}>
          {dots.map((_, i) => {
            const a = (i / dots.length) * Math.PI * 2;
            return (
              <span
                key={i}
                className="erne-confetti"
                style={{
                  '--dx': `${Math.cos(a) * 46}px`,
                  '--dy': `${Math.sin(a) * 46}px`,
                  background: i % 2 ? 'var(--accent)' : 'var(--ink)',
                  animationDelay: `${i * 18}ms`,
                }}
              />
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          className="erne-checkwrap"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="check" size={22} color="var(--accent-text)" stroke={2.4} />
        </span>
        <div>
          <div className="erne-h" style={{ fontSize: 16 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
