# PickleTracker — Notifications & Reminders

All automated notifications sent to users. Each entry lists the name, purpose, and delivery time.

---

## Email Reminders

| Name | Purpose | Time |
|------|---------|------|
| Tournament Day-Before Reminder | Emails users who have email reminders enabled with a list of their tournaments happening tomorrow, including category name and entry fee | Daily at **8:00 AM IST** (02:30 UTC) |
| Result Nudge | Emails users who played a tournament yesterday but have not yet logged their result (medal, prize amount) — prompts them to complete their entry | Daily at **8:00 AM IST** (02:30 UTC) |
| Weekly Performance Summary | Emails users a digest of the past week: sessions logged, average rating, day streak, top strengths, focus areas, and career medal tally | Every **Monday at 8:00 AM IST** (02:30 UTC) |
| Monthly P&L Report | Emails users a profit & loss breakdown for the previous month: earnings, entry fees, net profit, and medal count | **1st of every month at 8:00 AM IST** (02:30 UTC) |
| Inactive User Re-engagement | Emails users who signed up but have not yet added any tournaments, sessions, or gear — encourages them to log their first entry | Daily at **10:00 AM IST** (04:30 UTC) |

---

## Push Notifications

| Name | Purpose | Time |
|------|---------|------|
| Tournament Day-Before Push | Sends a push notification to users who have subscribed, reminding them of their tournament(s) happening tomorrow — works on PWA, mobile browser, and desktop Chrome | Daily at **7:00 PM IST** (13:30 UTC) |

---

## Notes

- All times are in IST (UTC+5:30). Cron jobs run on the Render backend server in UTC.
- Email reminders require the user to have **email reminders enabled** in their profile settings.
- Push notifications require the user to have **allowed notifications** either via the prompt shown after saving a future tournament, or via the Notifications card on the Profile page.
- To add a new notification, create a job file in `backend/src/jobs/` and register it in `backend/server.js`.
