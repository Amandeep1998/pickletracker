const XLSX = require('xlsx');
const Tournament = require('../models/Tournament');
const Session = require('../models/Session');
const Expense = require('../models/Expense');

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const s = dateStr.split('T')[0];
  const [y, m, d] = s.split('-');
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
};

// Column widths helper
const colWidths = (data, headers) =>
  headers.map((h) => ({
    wch: Math.max(h.length + 2, ...data.map((r) => String(r[h] ?? '').length + 2)),
  }));

exports.exportData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [tournaments, sessions, expenses] = await Promise.all([
      Tournament.find({ userId }).sort({ createdAt: -1 }).lean(),
      Session.find({ userId }).sort({ date: -1 }).lean(),
      Expense.find({ userId }).sort({ date: -1 }).lean(),
    ]);

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary ──────────────────────────────────────────────────────
    const now = new Date();
    const totalEntryFees = tournaments.reduce(
      (s, t) => s + t.categories.reduce((a, c) => a + (c.entryFee || 0), 0), 0
    );
    const totalWinnings = tournaments.reduce(
      (s, t) => s + t.categories.reduce((a, c) => a + (c.prizeAmount || 0), 0), 0
    );
    const totalCourtFees = sessions.reduce((s, x) => s + (x.courtFee || 0), 0);
    const totalGear = expenses.reduce((s, x) => s + (x.amount || 0), 0);
    const medals = { Gold: 0, Silver: 0, Bronze: 0 };
    tournaments.forEach((t) => t.categories.forEach((c) => { if (medals[c.medal] !== undefined) medals[c.medal]++; }));

    const summaryRows = [
      ['PickleTracker — Data Export'],
      [`Exported on: ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`],
      [],
      ['TOURNAMENTS', ''],
      ['Total tournaments', tournaments.length],
      ['Total categories played', tournaments.reduce((s, t) => s + t.categories.length, 0)],
      ['Total entry fees (₹)', totalEntryFees],
      ['Total prize winnings (₹)', totalWinnings],
      ['Net tournament P/L (₹)', totalWinnings - totalEntryFees],
      ['Gold medals', medals.Gold],
      ['Silver medals', medals.Silver],
      ['Bronze medals', medals.Bronze],
      [],
      ['SESSIONS', ''],
      ['Total sessions logged', sessions.length],
      ['Total court fees (₹)', totalCourtFees],
      ['Average rating', sessions.length ? (sessions.reduce((s, x) => s + x.rating, 0) / sessions.length).toFixed(2) : '—'],
      [],
      ['GEAR', ''],
      ['Total gear purchases', expenses.length],
      ['Total gear spend (₹)', totalGear],
      [],
      ['OVERALL', ''],
      ['Net P/L after all costs (₹)', totalWinnings - totalEntryFees - totalCourtFees - totalGear],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 32 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ── Sheet 2: Tournaments ──────────────────────────────────────────────────
    const tournamentRows = [];
    tournaments.forEach((t) => {
      t.categories.forEach((cat) => {
        tournamentRows.push({
          'Tournament Name': t.name,
          'Location': t.location?.name || '',
          'Category': cat.categoryName,
          'Date': fmtDate(cat.date),
          'Medal': cat.medal || 'None',
          'Entry Fee (₹)': cat.entryFee || 0,
          'Prize Won (₹)': cat.prizeAmount || 0,
          'Profit (₹)': (cat.prizeAmount || 0) - (cat.entryFee || 0),
        });
      });
    });
    if (tournamentRows.length === 0) tournamentRows.push({ 'Tournament Name': 'No tournaments recorded yet' });
    const wsTournaments = XLSX.utils.json_to_sheet(tournamentRows);
    const tHeaders = ['Tournament Name', 'Location', 'Category', 'Date', 'Medal', 'Entry Fee (₹)', 'Prize Won (₹)', 'Profit (₹)'];
    wsTournaments['!cols'] = colWidths(tournamentRows, tHeaders);
    XLSX.utils.book_append_sheet(wb, wsTournaments, 'Tournaments');

    // ── Sheet 3: Sessions ─────────────────────────────────────────────────────
    const sessionRows = sessions.map((s) => ({
      'Date': fmtDate(s.date),
      'Type': s.type ? s.type.charAt(0).toUpperCase() + s.type.slice(1) : '',
      'Rating (1-5)': s.rating,
      'Court Fee (₹)': s.courtFee || 0,
      'Location': s.location?.name || '',
      'Went Well': (s.wentWell || []).join(', '),
      'Work On': (s.wentWrong || []).join(', '),
      'Notes': s.notes || '',
    }));
    if (sessionRows.length === 0) sessionRows.push({ 'Date': 'No sessions recorded yet' });
    const wsSessions = XLSX.utils.json_to_sheet(sessionRows);
    const sHeaders = ['Date', 'Type', 'Rating (1-5)', 'Court Fee (₹)', 'Location', 'Went Well', 'Work On', 'Notes'];
    wsSessions['!cols'] = colWidths(sessionRows, sHeaders);
    XLSX.utils.book_append_sheet(wb, wsSessions, 'Sessions');

    // ── Sheet 4: Gear ─────────────────────────────────────────────────────────
    const gearRows = expenses.map((e) => ({
      'Item': e.title,
      'Date': fmtDate(e.date),
      'Amount (₹)': e.amount,
    }));
    if (gearRows.length === 0) gearRows.push({ 'Item': 'No gear purchases recorded yet' });
    const wsGear = XLSX.utils.json_to_sheet(gearRows);
    wsGear['!cols'] = colWidths(gearRows, ['Item', 'Date', 'Amount (₹)']);
    XLSX.utils.book_append_sheet(wb, wsGear, 'Gear');

    // ── Send as download ──────────────────────────────────────────────────────
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `pickletracker-export-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
};
