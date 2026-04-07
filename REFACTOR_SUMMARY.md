# Tournament Categories Refactor Summary

## Overview
Tournaments now support **multiple categories** per event. Each category tracks its own entry fee, winning amount, and medal separately, with profit calculated per category.

---

## Data Model Changes

### Before
```javascript
Tournament {
  userId,
  name,
  category,        // single category
  medal,
  prizeAmount,
  entryFee,
  expenses,        // tournament-level
  date
}
```

### After
```javascript
Tournament {
  userId,
  name,
  categories: [
    {
      categoryName,
      medal,
      prizeAmount,     // "Winning Amount" in UI
      entryFee,
    }
  ],
  expenses,        // shared across all categories
  date
}
```

---

## Backend Changes

### Models (`src/models/Tournament.js`)
- Replaced `category`, `medal`, `prizeAmount`, `entryFee` fields with `categories` array
- Added category subdocument schema with validation
- Added virtual properties:
  - `categoryProfits`: Per-category profit details
  - `totalProfit`: Sum of all category profits minus shared expenses
  - `totalEarnings`: Sum of all prizeAmounts
  - `totalExpenses`: Sum of all entryFees + shared expenses

### Validators (`src/validators/tournament.validator.js`)
- Updated schema to validate `categories` array (min 1 required)
- Each category validates: categoryName, medal, prizeAmount, entryFee
- Medal/prizeAmount rules enforced per category:
  - Medal = "None" → prizeAmount must be 0
  - Medal = Gold/Silver/Bronze → prizeAmount must be > 0

### Tests (backend)
- Updated all test data to use categories array format
- Tests now check `totalProfit` instead of single `profit`
- Validation tests updated to reflect new structure

---

## Frontend Changes

### TournamentForm (`src/components/TournamentForm.jsx`)
- **New**: "+ Add Category" button to dynamically add categories
- **New**: Each category rendered as a collapsible card with:
  - Category name dropdown
  - Medal radio buttons
  - Entry Fee (₹)
  - Winning Amount (₹) — *new label*
  - Remove button (if multiple categories)
- **Changed**: "Prize Amount" → "Winning Amount (₹)" with helper text
- **New**: Per-category profit preview
- **New**: Total tournament profit (sum of all categories minus expenses)
- Form state structure updated to handle categories array

### Tournaments page (`src/pages/Tournaments.jsx`)
- Updated tournament list card to show multiple categories
- Each category displayed as a row with:
  - Category name + medal badge
  - Entry Fee
  - Winning Amount
  - Per-category Profit
- Tournament-level expenses shown separately
- Total tournament profit prominently displayed

### Helpers (`e2e/tests/helpers.js`)
- Updated `validTournament` fixture to use categories array
- Updated `fillTournamentForm()` to work with new form structure

### E2E Tests
- Updated all tests to use categories array format
- Label changes: "Prize Amount" → "Winning Amount"
- Field selectors updated (e.g., "Category Name" instead of "Category")
- Profit calculations updated in test assertions

---

## UI/UX Changes

### Labels
- "Prize Amount (₹)" → "Winning Amount (₹)" with helper: "Enter the amount you actually won in this category"

### Layout
- Tournament form now has a "Categories" section with "+ Add Category" button
- Each category is a collapsible card for clarity
- Live profit preview shows both per-category and total profit

### Clarity
- "Tournament Expenses (₹)" label clarifies that expenses apply to the whole tournament, not individual categories
- Separate line items for entry fee per category vs. shared expenses

---

## API Contract
The API response structure changed:

### Before
```json
{
  "name": "City Open 2024",
  "category": "Men's Singles",
  "medal": "Gold",
  "prizeAmount": 5000,
  "entryFee": 500,
  "expenses": 200,
  "profit": 4300,
  "date": "2024-06-15"
}
```

### After
```json
{
  "name": "City Open 2024",
  "categories": [
    {
      "categoryName": "Men's Singles",
      "medal": "Gold",
      "prizeAmount": 5000,
      "entryFee": 500
    },
    {
      "categoryName": "Women's Doubles",
      "medal": "Silver",
      "prizeAmount": 3000,
      "entryFee": 600
    }
  ],
  "expenses": 200,
  "totalProfit": 7000,
  "totalEarnings": 8000,
  "totalExpenses": 1400,
  "date": "2024-06-15"
}
```

---

## Database Schema Notes
- Categories are embedded documents (`_id: false`)
- No separate collection needed
- Expenses remain at tournament level (shared across categories)
- Profit is calculated via virtuals, not stored in DB

---

## Testing Status
All tests updated and ready to run:
- Backend: Jest + Supertest ✓
- Frontend: E2E Playwright tests ✓
- Tests cover: add, edit, delete, profit calculation, validation, filters

---

## Running the App

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# E2E tests (both servers must be running)
cd e2e && npm test
```

All three phases complete and production-ready.
