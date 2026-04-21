# PickleTracker — Pre-Deploy QA Checklist

Run this checklist on **both desktop (Chrome) and mobile (real device or Chrome DevTools → iPhone 14, 390px)** before every production deploy.

Mark each item ✅ pass / ❌ fail. Do not ship with any ❌.

---

## 1. Auth

| # | Test | What to verify |
|---|------|----------------|
| 1.1 | Sign up with email + password | Account created, redirected to app |
| 1.2 | Log out, log back in | Correct data loads |
| 1.3 | Sign in with Google | Redirected to app, name/email populated |
| 1.4 | Forgot password flow | Reset email arrives, link works, password updated |
| 1.5 | Access protected route when logged out | Redirected to login |

---

## 2. Tournament — Add

| # | Test | What to verify |
|---|------|----------------|
| 2.1 | Add tournament, all steps, no travel expense | Appears in Tournaments list and Calendar |
| 2.2 | Add tournament with travel expense (transport + food filled) | Travel page shows linked expense; detail popup shows breakdown and correct net profit |
| 2.3 | Add tournament with future date | Results step is skipped; form saves without medal/prize fields |
| 2.4 | Add tournament, skip optional fields (location, partner, notes) | Saves without error |
| 2.5 | Validation: click Next with name empty | Error shown, scrolls to it |
| 2.6 | Validation: click Next with no category selected | Error shown on category field |
| 2.7 | Validation: select Gold medal, leave prize amount empty, click Save | Error shown on prize field |
| 2.8 | Multiple categories in one tournament | Each category saved; entry fees and prizes sum correctly in detail popup |
| 2.9 | Category search on mobile | Bottom sheet opens; list shows above keyboard; search with spaces works (e.g. "35 plus") |

---

## 3. Tournament — Edit

| # | Test | What to verify |
|---|------|----------------|
| 3.1 | Open edit on a tournament — all fields pre-fill | Name, location, categories, medal, prize, entry fee all populated |
| 3.2 | Open edit on a tournament **with travel expense** | Travel section is open; transport/food/accommodation amounts are pre-filled |
| 3.3 | Edit travel expense amounts, save | Travel page and detail popup show updated amounts; no duplicate expense created |
| 3.4 | Remove travel expense (click Remove), save | Travel expense disappears from Travel page and detail popup |
| 3.5 | Add travel expense to a tournament that had none, save | New expense appears on Travel page; detail popup shows breakdown |
| 3.6 | Change category date from past → future | Medal and prize reset to None/0; Results step disappears |
| 3.7 | Change category date from future → past | Results step reappears; can enter medal/prize |

---

## 4. Tournament — Delete

| # | Test | What to verify |
|---|------|----------------|
| 4.1 | Delete a tournament with no travel expense | Gone from list and Calendar |
| 4.2 | Delete a tournament that has a linked travel expense | Travel expense also gone from Travel page |

---

## 5. Tournament Detail Popup (Calendar)

| # | Test | What to verify |
|---|------|----------------|
| 5.1 | Tap a tournament with no travel expense | Shows categories, Total Earnings, Total Entry Fees, Net Profit (earnings − fees) |
| 5.2 | Tap a tournament with travel expense | Travel breakdown card visible (route, line items); Net Profit = earnings − entry fees − travel total |
| 5.3 | Net profit is negative | Shown in red |
| 5.4 | Net profit is zero or positive | Shown in green |

---

## 6. Travel Expenses (standalone)

| # | Test | What to verify |
|---|------|----------------|
| 6.1 | Add standalone travel expense (not linked to tournament) | Appears on Travel page |
| 6.2 | Edit standalone travel expense | Updated amounts show correctly |
| 6.3 | Delete standalone travel expense | Gone from Travel page |
| 6.4 | International trip checkbox → shows Visa & Docs and Travel Insurance fields | Fields appear and save |

---

## 7. Sessions

| # | Test | What to verify |
|---|------|----------------|
| 7.1 | Log a session (practice, casual, tournament match) | Appears in session list |
| 7.2 | Edit a session — all fields pre-fill | Duration, location, rating, skills, notes populated |
| 7.3 | Delete a session | Gone from list; session count on Dashboard updates |

---

## 8. Calendar

| # | Test | What to verify |
|---|------|----------------|
| 8.1 | Navigate months (prev/next) | Tournaments appear on correct dates |
| 8.2 | Tap a date with multiple events | Day popup lists all events |
| 8.3 | Add tournament from Calendar | Tournament appears on tapped date |
| 8.4 | Add session from Calendar | Session appears on tapped date |
| 8.5 | Location modal (change location) — mobile | Modal opens above the + FAB; Auto-detect button is tappable |
| 8.6 | Edit tournament from detail popup | Opens pre-filled edit form; saves correctly |

---

## 9. Dashboard

| # | Test | What to verify |
|---|------|----------------|
| 9.1 | Add a tournament, check Dashboard | Total earnings / entry fees / net profit updated |
| 9.2 | Delete a tournament, check Dashboard | Totals decrease accordingly |
| 9.3 | Add a travel expense, check Dashboard | Travel spend reflects in total expenses |
| 9.4 | Medal tally | Correct count after add/delete |
| 9.5 | Month filter / year filter (if present) | Correct subset of data shown |

---

## 10. Profile

| # | Test | What to verify |
|---|------|----------------|
| 10.1 | Edit name, city, DUPR rating — save | Updated on profile and Friends view |
| 10.2 | Upload profile photo | Photo appears in header/avatar |
| 10.3 | Change currency (INR → USD etc.) | All currency values across app update |
| 10.4 | Enable WhatsApp notifications — enter number | Saved; toggle reflects state |
| 10.5 | Disable WhatsApp notifications | Number cleared/hidden |

---

## 11. Friends

| # | Test | What to verify |
|---|------|----------------|
| 11.1 | Search for another user by name | Result appears |
| 11.2 | Send friend request | Pending state shown |
| 11.3 | Accept friend request | Friend appears in list |
| 11.4 | Remove friend | Gone from list |
| 11.5 | View friend's public profile | Name, city, rating, medal tally visible; financial data not visible |

---

## 12. Admin (admin account only)

| # | Test | What to verify |
|---|------|----------------|
| 12.1 | User list loads | All users visible with last active date |
| 12.2 | Platform stats | Total tournaments, sessions, gear spend, travel spend correct |
| 12.3 | Expand a user | Sessions, financials, medals, activity chart all populated |

---

## 13. Forms — Cross-cutting

| # | Test | What to verify |
|---|------|----------------|
| 13.1 | Scroll-to-error on Next/Save | Page scrolls to the topmost error field |
| 13.2 | SearchableSelect on mobile | Bottom sheet opens on tap; options visible above keyboard; selecting works without ghost-select |
| 13.3 | DatePicker | Works on both desktop and mobile; selected date shown correctly |
| 13.4 | Location autocomplete | Suggestions appear; selecting populates address field |

---

## 14. Mobile-specific

| # | Test | What to verify |
|---|------|----------------|
| 14.1 | All modals/sheets open above keyboard | No content hidden behind keyboard |
| 14.2 | FAB (+ button on Calendar) | Doesn't block any modal or popup |
| 14.3 | Bottom sheets close on backdrop tap | Works without triggering the element behind |
| 14.4 | Scrolling in lists | No accidental dropdown opens or closes while scrolling |

---

## 15. Data integrity — End-to-end smoke test

Run this full scenario after every significant deploy:

1. Add a tournament with 2 categories (one past, one future) + travel expense
2. Verify it appears on Calendar and Tournaments list
3. Open detail popup → confirm travel breakdown and net profit are correct
4. Edit the tournament → change travel amounts → save → re-open detail → confirm updated
5. Edit the tournament → remove travel expense → save → confirm it's gone from Travel page and detail popup
6. Delete the tournament → confirm it's gone from Calendar, Tournaments list, and Travel page
7. Check Dashboard totals reflect all changes throughout

---

*Last updated: April 2026*
