const XLSX = require('xlsx');
const Tournament = require('../models/Tournament');
const Session = require('../models/Session');
const Expense = require('../models/Expense');

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const s = String(dateStr).split('T')[0];
  const [y, m, d] = s.split('-');
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
};

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

    const gearExpenses   = expenses.filter((e) => e.type === 'gear');
    const travelExpenses = expenses.filter((e) => e.type === 'travel');

    const wb = XLSX.utils.book_new();
    const now = new Date();

    // ── Sheet 1: Summary ──────────────────────────────────────────────────────
    const totalEntryFees  = tournaments.reduce((s, t) => s + t.categories.reduce((a, c) => a + (c.entryFee || 0), 0), 0);
    const totalWinnings   = tournaments.reduce((s, t) => s + t.categories.reduce((a, c) => a + (c.prizeAmount || 0), 0), 0);
    const totalCourtFees  = sessions.reduce((s, x) => s + (x.courtFee || 0), 0);
    const totalGearSpend  = gearExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalTravelSpend = travelExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netPL = totalWinnings - totalEntryFees - totalCourtFees - totalGearSpend - totalTravelSpend;

    const medals = { Gold: 0, Silver: 0, Bronze: 0 };
    tournaments.forEach((t) => t.categories.forEach((c) => {
      if (medals[c.medal] !== undefined) medals[c.medal]++;
    }));

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
      ['Average rating', sessions.length
        ? (sessions.reduce((s, x) => s + (x.rating || 0), 0) / sessions.length).toFixed(2)
        : '—'],
      [],
      ['GEAR', ''],
      ['Total gear purchases', gearExpenses.length],
      ['Total gear spend (₹)', totalGearSpend],
      [],
      ['TRAVEL', ''],
      ['Total travel trips', travelExpenses.length],
      ['Total travel spend (₹)', totalTravelSpend],
      [],
      ['OVERALL', ''],
      ['Total income (₹)', totalWinnings],
      ['Total costs — entry fees (₹)', totalEntryFees],
      ['Total costs — court fees (₹)', totalCourtFees],
      ['Total costs — gear (₹)', totalGearSpend],
      ['Total costs — travel (₹)', totalTravelSpend],
      ['Net P/L after all costs (₹)', netPL],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 36 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ── Sheet 2: Tournaments ──────────────────────────────────────────────────
    // Build a map of tournamentId → linked travel expense for quick lookup
    const travelByTournament = {};
    travelExpenses.forEach((e) => {
      if (e.tournamentId) travelByTournament[String(e.tournamentId)] = e;
    });

    const tournamentRows = [];
    tournaments.forEach((t) => {
      const linkedTravel = travelByTournament[String(t._id)];
      const travelTotal  = linkedTravel?.amount || 0;
      const route = linkedTravel
        ? [linkedTravel.fromCity, linkedTravel.toCity].filter(Boolean).join(' → ')
        : '';

      t.categories.forEach((cat, idx) => {
        const catProfit = (cat.prizeAmount || 0) - (cat.entryFee || 0);
        // Only attribute travel cost to the first category to avoid double-counting
        const travelForRow = idx === 0 ? travelTotal : 0;
        tournamentRows.push({
          'Tournament Name':   t.name,
          'Location':          t.location?.name || '',
          'Category':          cat.categoryName,
          'Partner':           cat.partnerName || '',
          'Date':              fmtDate(cat.date),
          'Medal':             cat.medal || 'None',
          'Entry Fee (₹)':     cat.entryFee || 0,
          'Amount Won (₹)':    cat.prizeAmount || 0,
          'Category Profit (₹)': catProfit,
          'Travel Cost (₹)':   travelForRow,
          'Travel Route':      idx === 0 ? route : '',
        });
      });
    });
    if (tournamentRows.length === 0) tournamentRows.push({ 'Tournament Name': 'No tournaments recorded yet' });
    const tHeaders = [
      'Tournament Name','Location','Category','Partner','Date','Medal',
      'Entry Fee (₹)','Amount Won (₹)','Category Profit (₹)','Travel Cost (₹)','Travel Route',
    ];
    const wsTournaments = XLSX.utils.json_to_sheet(tournamentRows);
    wsTournaments['!cols'] = colWidths(tournamentRows, tHeaders);
    XLSX.utils.book_append_sheet(wb, wsTournaments, 'Tournaments');

    // ── Sheet 3: Sessions ─────────────────────────────────────────────────────
    const sessionRows = sessions.map((s) => ({
      'Date':         fmtDate(s.date),
      'Type':         s.type ? s.type.charAt(0).toUpperCase() + s.type.slice(1) : '',
      'Rating (1-5)': s.rating || '',
      'Court Fee (₹)': s.courtFee || 0,
      'Location':     s.location?.name || '',
      'Went Well':    (s.wentWell  || []).join(', '),
      'Work On':      (s.wentWrong || []).join(', '),
      'Notes':        s.notes || '',
    }));
    if (sessionRows.length === 0) sessionRows.push({ 'Date': 'No sessions recorded yet' });
    const sHeaders = ['Date','Type','Rating (1-5)','Court Fee (₹)','Location','Went Well','Work On','Notes'];
    const wsSessions = XLSX.utils.json_to_sheet(sessionRows);
    wsSessions['!cols'] = colWidths(sessionRows, sHeaders);
    XLSX.utils.book_append_sheet(wb, wsSessions, 'Sessions');

    // ── Sheet 4: Gear ─────────────────────────────────────────────────────────
    const gearRows = gearExpenses.map((e) => ({
      'Item':        e.title,
      'Date':        fmtDate(e.date),
      'Amount (₹)':  e.amount,
    }));
    if (gearRows.length === 0) gearRows.push({ 'Item': 'No gear purchases recorded yet' });
    const wsGear = XLSX.utils.json_to_sheet(gearRows);
    wsGear['!cols'] = colWidths(gearRows, ['Item', 'Date', 'Amount (₹)']);
    XLSX.utils.book_append_sheet(wb, wsGear, 'Gear');

    // ── Sheet 5: Travel ───────────────────────────────────────────────────────
    const travelRows = travelExpenses.map((e) => ({
      'Trip Name':          e.title,
      'Date':               fmtDate(e.date),
      'From':               e.fromCity || '',
      'To':                 e.toCity || '',
      'International':      e.isInternational ? 'Yes' : 'No',
      'Linked Tournament':  '',           // filled below
      'Transport (₹)':      e.transport || 0,
      'Local Commute (₹)':  e.localCommute || 0,
      'Accommodation (₹)':  e.accommodation || 0,
      'Food (₹)':           e.food || 0,
      'Equipment & Baggage (₹)': e.equipment || 0,
      'Others (₹)':         e.others || 0,
      'Visa & Docs (₹)':    e.visaDocs || 0,
      'Travel Insurance (₹)': e.travelInsurance || 0,
      'Total (₹)':          e.amount || 0,
    }));

    // Back-fill linked tournament name
    const tournamentMap = {};
    tournaments.forEach((t) => { tournamentMap[String(t._id)] = t.name; });
    travelRows.forEach((row, i) => {
      const e = travelExpenses[i];
      if (e.tournamentId) row['Linked Tournament'] = tournamentMap[String(e.tournamentId)] || '';
    });

    if (travelRows.length === 0) travelRows.push({ 'Trip Name': 'No travel expenses recorded yet' });
    const trHeaders = [
      'Trip Name','Date','From','To','International','Linked Tournament',
      'Transport (₹)','Local Commute (₹)','Accommodation (₹)','Food (₹)',
      'Equipment & Baggage (₹)','Others (₹)','Visa & Docs (₹)','Travel Insurance (₹)','Total (₹)',
    ];
    const wsTravel = XLSX.utils.json_to_sheet(travelRows);
    wsTravel['!cols'] = colWidths(travelRows, trHeaders);
    XLSX.utils.book_append_sheet(wb, wsTravel, 'Travel');

    // ── Send ──────────────────────────────────────────────────────────────────
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pickletracker-export-${dateStamp}.xlsx"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
};
