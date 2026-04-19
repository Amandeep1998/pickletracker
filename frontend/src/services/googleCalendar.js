const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', AUD: 'A$', EUR: '€', GBP: '£',
  CAD: 'C$', SGD: 'S$', MYR: 'RM', PHP: '₱',
};
function getUserCurrencySymbol() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return CURRENCY_SYMBOLS[u.currency] || '₹';
  } catch { return '₹'; }
}

export function getCalendarToken() {
  const token = localStorage.getItem('gcal_token');
  const expiry = Number(localStorage.getItem('gcal_token_expiry') || 0);
  if (!token || Date.now() > expiry) return null;
  return token;
}

export function isCalendarConnected() {
  return Boolean(getCalendarToken());
}

/**
 * Returns true if the user has previously connected Google Calendar,
 * even if the current token is expired. Used to trigger silent refresh.
 */
export function wasCalendarConnected() {
  return localStorage.getItem('gcal_was_connected') === 'true';
}

/** Call this whenever a new token is obtained (connect or silent refresh). */
export function saveCalendarToken(accessToken) {
  const expiry = Date.now() + 3600 * 1000; // Google tokens last 1 hour
  localStorage.setItem('gcal_token', accessToken);
  localStorage.setItem('gcal_token_expiry', String(expiry));
  localStorage.setItem('gcal_was_connected', 'true');
}

export function disconnectCalendar() {
  localStorage.removeItem('gcal_token');
  localStorage.removeItem('gcal_token_expiry');
  localStorage.removeItem('gcal_was_connected');
}

/**
 * Syncs all categories of a tournament to Google Calendar.
 * Creates new events or updates existing ones (using stored calendarEventId).
 * Returns array of { idx, calendarEventId } for the caller to patch back to the backend.
 */
export async function syncTournamentToCalendar(tournament) {
  const token = getCalendarToken();
  if (!token) return null;

  const results = [];
  for (let i = 0; i < tournament.categories.length; i++) {
    const cat = tournament.categories[i];
    if (!cat.date) continue;

    const event = buildEvent(tournament.name, cat, tournament.location);

    if (cat.calendarEventId) {
      // Update existing event
      await updateEvent(token, cat.calendarEventId, event);
      results.push({ idx: i, calendarEventId: cat.calendarEventId });
    } else {
      // Create new event
      const eventId = await createEvent(token, event);
      results.push({ idx: i, calendarEventId: eventId });
    }
  }
  return results;
}

/**
 * Deletes all calendar events linked to a tournament's categories.
 * Silently ignores 404s (event already deleted).
 */
export async function deleteTournamentFromCalendar(tournament) {
  const token = getCalendarToken();
  if (!token) return;

  for (const cat of tournament.categories) {
    if (cat.calendarEventId) {
      await deleteEvent(token, cat.calendarEventId).catch(() => {});
    }
  }
}

// --- Internal helpers ---

function buildEvent(tournamentName, cat, location) {
  const sym = getUserCurrencySymbol();
  const lines = [
    `Entry Fee: ${sym}${cat.entryFee}`,
    `Medal: ${cat.medal}`,
    cat.medal !== 'None' ? `Amount Won: ${sym}${cat.prizeAmount}` : null,
    `Profit: ${sym}${cat.prizeAmount - cat.entryFee}`,
  ];

  if (location?.name || location?.address) {
    lines.push('');
    lines.push('Tournament Location:');
    if (location.placeId) {
      lines.push(`https://www.google.com/maps/place/?q=place_id:${location.placeId}`);
    } else {
      const query = [location.name, location.address].filter(Boolean).join(' ');
      lines.push(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
    }
  }

  const event = {
    summary: `${tournamentName} – ${cat.categoryName}`,
    description: lines.filter((l) => l !== null).join('\n'),
    start: { date: cat.date },
    end: { date: cat.date },
    colorId: medalColorId(cat.medal),
  };

  // Google Calendar native location field (shows in event details + maps button)
  if (location?.name || location?.address) {
    event.location = [location.name, location.address].filter(Boolean).join(', ');
  }

  return event;
}

function medalColorId(medal) {
  if (medal === 'Gold') return '5';    // Banana (yellow)
  if (medal === 'Silver') return '7';  // Peacock (blue-grey)
  if (medal === 'Bronze') return '6';  // Tangerine (orange)
  return '8';                          // Graphite (grey)
}

async function createEvent(token, event) {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create calendar event');
  }
  const data = await res.json();
  return data.id;
}

async function updateEvent(token, eventId, event) {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to update calendar event');
  }
}

async function deleteEvent(token, eventId) {
  await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
