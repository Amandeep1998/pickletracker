# Latest Changes: Remove Expenses & Add Calendar

## 1. Removed Expenses Field Entirely

### Backend Changes
- **Tournament Model**: Removed `expenses` field completely
- **Validators**: Removed expenses validation from `tournamentSchema`
- **Virtuals Updated**:
  - `totalProfit` now: `sum(prizeAmount - entryFee)` (no expense deduction)
  - `totalExpenses` now: `sum(entryFee)` (only entry fees, no shared expenses)

### Frontend Changes
- **TournamentForm**: Removed "Tournament Expenses" input
- **Tournaments Page**: Removed tournament-level expenses display
- **Dashboard**: Removed expenses from calculations
- **E2E Tests**: Removed expenses from all test data and assertions

### Profit Calculation (Updated)
- **Old**: `profit = prizeAmount - entryFee - expenses`
- **New**: `profit = prizeAmount - entryFee`

---

## 2. Added Calendar Feature

### New Page: Calendar (`frontend/src/pages/Calendar.jsx`)

**Features**:
- Display all tournaments on a calendar view
- Green highlighting for dates with tournaments
- Click a date → view all tournaments on that date
- Click a tournament → view detailed summary in modal
- Month navigation built-in (react-calendar)
- Shows tournament name, categories, and profit on hover

**Dependencies**:
- `react-calendar` (added to `package.json`)

**Data Flow**:
1. Fetch all tournaments from backend
2. Group by date (YYYY-MM-DD)
3. Custom tile styling for dates with tournaments
4. Click handler shows modal with tournament details

### Navigation Updates
- **Navbar**: Added "Calendar" link
- **App Router**: Added `/calendar` protected route

### Modal Details
When a tournament is clicked, modal shows:
- Tournament name & date
- All categories with individual profit per category
- Summary: Total Earnings, Total Expenses, **Total Profit**
- Close button to dismiss modal

### Styling
- Custom CSS for react-calendar integration with Tailwind
- Green highlighting for tournament dates
- Responsive grid layout (1 col mobile, 3 col on larger screens)
- Professional modal with shadow and rounded corners

---

## Testing Updates

### All E2E tests updated:
- Removed `expenses` from all test fixtures
- Updated profit assertions (e.g., 4500 instead of 4300)
- Backend tests updated to match new profit formula
- Authorization tests updated

### Test Files Modified:
- `backend/tests/tournament.test.js`
- `backend/tests/authorization.test.js`
- `e2e/tests/helpers.js`
- `e2e/tests/tournaments.spec.js`
- `e2e/tests/dashboard.spec.js`

---

## Summary of Files Changed

### Backend
- `src/models/Tournament.js` — removed expenses, updated virtuals
- `src/validators/tournament.validator.js` — removed expenses validation
- `tests/tournament.test.js` — updated for new profit formula
- `tests/authorization.test.js` — updated test data

### Frontend
- `package.json` — added react-calendar
- `src/components/TournamentForm.jsx` — removed expenses input
- `src/components/Navbar.jsx` — added Calendar link
- `src/pages/Calendar.jsx` — **NEW FILE**
- `src/pages/Tournaments.jsx` — removed expenses display
- `src/App.jsx` — added Calendar route

### E2E Tests
- `tests/helpers.js` — removed expenses from fixtures
- `tests/tournaments.spec.js` — updated assertions
- `tests/dashboard.spec.js` — updated assertions

---

## Installation

Frontend needs `react-calendar`:
```bash
cd frontend
npm install
```

---

## API Changes

Tournament response now:
```json
{
  "name": "City Open 2024",
  "categories": [
    {
      "categoryName": "Men's Singles",
      "medal": "Gold",
      "prizeAmount": 5000,
      "entryFee": 500
      // no prizeAmount here
    }
  ],
  // NO expenses field
  "totalProfit": 4500,
  "totalEarnings": 5000,
  "totalExpenses": 500,
  "date": "2024-06-15"
}
```

---

## Ready to Run

```bash
# Backend
cd backend && npm run dev

# Frontend (after npm install)
cd frontend && npm run dev

# E2E tests (after both servers running)
cd e2e && npm test
```

All three phases complete with simplified financial model and calendar visualization.
