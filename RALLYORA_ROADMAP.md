# rallyora — Full Phased Roadmap

Status: Plan (brainstorm-approved, not yet built)
Owner: sainia
Last updated: 2026-05-31
Supersedes day-to-day planning in: CHAT_COMPANION_PRD.md (still valid for detail/flows)

---

## North star

A chat-first **sports companion** (brand: **rallyora**, `rallyora.com`). User journals their
competitive sports life by talking to a buddy instead of filling forms. Launch on **pickleball**,
nail the experience, then expand sport-by-sport. Architecture is multi-sport from day one; go-to-market
is pickleball-first.

## Theme (use from Phase 0)

- Brand: **rallyora**, logo = "rally arc" (`mockups/rallyora-logo.html`).
- Palette: navy `#16261e` + lime `#c4f53b`.
- Voice: warm buddy/companion, sporty, encouraging. Not "tracker."

## Cross-cutting guardrails (apply to EVERY phase — non-negotiable)

1. **Existing ~64 pickleball users + their data never break.** Additive schema only; never rename/drop.
   New data lives in new fields (`sport`, `categories[].result`, `attributes`).
2. **Flag-gated.** Everything new behind a flag, default OFF in prod (`chat_companion`). Simple local
   flag for now (env / localStorage) — the old `/api/flags` layer is on a SHELVED branch, not main.
3. **Trashable.** Chat lives on an isolated route + isolated components. Deleting them cannot break
   the existing app. Only swap `/` after full validation (Phase 6).
4. **Scope discipline (Phase 1–3):** tournaments + medals ONLY. **No streaks, no casual/drills, no
   sessions.** Resist scope creep.
5. **Cost control:** free LLM tiers (Groq → Gemini fallback) behind an adapter; circuit breaker → form
   fallback; rate limits + abuse guards before any pre-auth LLM call.

---

## PHASE 0 — Foundation & guardrails
**Goal:** safe scaffolding, zero user-facing change.
- Brand tokens (navy/lime), rallyora logo assets exported to `frontend/public/`.
- Local feature flag `chat_companion` (env/localStorage), default OFF.
- Isolated route **`/rally`** (working name; chat UI lives here). Unlisted in all nav.
- `sportConfig` registry scaffold (`backend/src/config/sports.js`) with **pickleball entry only**.
- No existing route/page/nav touched.
**Exit gate:** `/rally` loads an empty themed shell; rest of app identical.

## PHASE 1 — Static chat UI (no LLM, scripted)
**Goal:** validate the *feel* of tournament logging. Pure frontend, fake replies, no backend.
- Components: `ChatStream`, `MessageBubble`, `GuidedChips`, `Composer`, `TypingDots`.
- Cards: `TournamentPreviewCard` (multi-category, upcoming|completed, editable), `ReminderPrompt`,
  `SavedCard` (no streak), `PlayerCardPeek`, `UpcomingList`.
- `mockEngine.js` scripts ALL tournament scenarios (see §Scenarios).
- rallyora theme + logo in header. Chips: `[🏆 Log tournament][🥇 Add past medal][📅 My upcoming][🪪 My card]`.
**Exit gate:** logging a tournament *feels* < 20s and the player-card payoff feels rewarding. If no → tweak/trash; app untouched.

## PHASE 2 — Real tournament logging (authed, pickleball)
**Goal:** chat actually writes tournaments + medals for logged-in users.
- LLM adapter `llm.service.js` (Groq primary, Gemini fallback, OpenAI last resort). Reuse/extend
  `parseTournamentVoice` (already multi-category).
- Confirm-card → write through existing Tournament endpoints, stamping `sport:'pickleball'`.
- **Backfill script** (additive, idempotent, dry-run first): stamp `sport:'pickleball'` on existing
  Tournaments + `sports:['pickleball']` on existing Users.
- `PlayerCardPeek` pulls REAL data.
- Abuse: per-user rate limit (~60 msg/hr, ~30 logs/day), input length cap, circuit breaker → form mode.
**Exit gate:** a real pickleball tournament + medal logged via chat, lands identical to form-logged data; existing data verified untouched.

## PHASE 3 — Benefit loops (the carrots)
**Goal:** make logging pay off → drives retention + push opt-in.
- **Reminders:** logging an UPCOMING tournament → prompt enable push (reuse `usePushNotifications`,
  `push.routes`, NOTIFICATIONS.md) → schedule reminder 1 day before → proactive "you have X upcoming."
- **Player card:** logging past tournaments/medals populates the public card (`PlayerCardPage.jsx`) →
  shown back in chat as the visible persona reward.
- Lightweight onboarding: "Which sports do you play?" — pickleball preselected; other sports shown
  but data is pickleball-only for now (sets `user.sports`).
**Exit gate:** push opt-in works; card visibly grows; proactive upcoming nudge fires.

## PHASE 4 — Pre-auth conversion (the hook)
**Goal:** anonymous visitor logs first, signs in to save.
- Anonymous chat on `/rally`: parse → preview card → "Sign in with Google to save" → pending-log
  replays after OAuth → committed.
- Guards: Cloudflare Turnstile + IP rate-limit + anon parse cap (2 then login wall).
- Persistent auth: refresh-token rotation in httpOnly cookie (current JWT = 7d, no refresh).
**Exit gate:** stranger → first log → Google sign-in → log saved, end-to-end.

## PHASE 5 — UX polish + dogfood
**Goal:** make pickleball experience genuinely good before betting the front door on it.
- Opt-in flag for the 64 existing users; collect feedback; iterate.
- Error handling, latency, empty/edge states, mobile, accessibility.
- Tighten parsing accuracy on real Indian tournament phrasing.
**Exit gate:** existing users prefer chat logging over forms (qual + basic metrics).

## PHASE 6 — Landing swap
**Goal:** make chat the front door.
- Replace `/` with the rallyora chat landing behind a staged flag rollout. Old pages demoted but
  reachable. Measure activation/log-completion vs old.
- Only after Phase 5 validation. Reversible (flag).
**Exit gate:** new landing beats old on activation; rollout to 100%.

## PHASE 7 — Multi-sport expansion
**Goal:** turn on the architecture built since Phase 0.
- Add `sportConfig` entries: Badminton, Tennis, Table Tennis (Tier 1), then Padel/Squash/Chess/Running.
- Activate onboarding multi-select; parser + preview cards read sportConfig (categories, rating system,
  `result.type`: medal | placement | time | score).
- Player card = per-sport tabs (pickleball card unaffected).
- Seed a second sport (or second city) — beachhead discipline still applies.
**Exit gate:** a non-pickleball tournament logs correctly with sport-specific fields; pickleball untouched.

## PHASE 8 — Discovery (nearby tournaments + courts)
**Goal:** become the data layer (two-sided).
- Court model + Mongo 2dsphere geo-search; chat intents `find_tournaments` / `find_courts` / `find_players`.
- Data flywheel: **screenshot → entry** (vision LLM OCRs WhatsApp/KheloMore posters → confirm card →
  published). Crowdsource submissions + moderation; courts seeded from Google Places free tier.
- ⚠️ avoid scraping KheloMore/Huddle (ToS/legal). Beachhead one city.
**Exit gate:** user searches "tournaments near me" and gets real local results.

## PHASE 9 — Monetization (free now, ramp later)
**Goal:** revenue without breaking goodwill.
- Freemium: Free (log + basic search, capped AI msgs) → Silver/Pro (unlimited AI, smart geo alerts,
  export, matchmaking) → Gold/Elite (AI coach, analytics).
- Organizer B2B: listings + **take-rate on registrations** (India: lead transactional, not consumer subs).
- AI-message caps double as cost control + paywall lever.

---

## Sport-flexible data model (built Phase 0, dormant until Phase 7)

```js
// sportConfig registry — adding a sport = config entry, NO migration
sports = {
  pickleball:{ label:'Pickleball', icon:'🏓', categories:['MS','WS','MD','WD','MXD'],
               rating:{key:'dupr',label:'DUPR'}, resultType:'medal' },
  tennis:    { label:'Tennis', icon:'🎾', categories:['Singles','Doubles','Mixed'],
               rating:{key:'ntrp',label:'NTRP'}, resultType:'medal' },
  chess:     { label:'Chess', icon:'♟️', categories:['Open','Rapid','Blitz'],
               rating:{key:'elo',label:'ELO'}, resultType:'placement' },
  running:   { label:'Running', icon:'🏃', categories:['5K','10K','Half','Full'],
               rating:null, resultType:'time' },
}

// Tournament (additive)
{ sport:'pickleball',            // NEW, default 'pickleball'
  name, dates, venue,
  categories:[ { format, level, partner, result:{ type, value } } ],  // multi-category
  attributes:{} }                // NEW, sport-specific overflow

// User (additive)
{ sports:['pickleball'], ratings:{ pickleball:{dupr:3.6} } }   // NEW; existing fields untouched
```
`result.type` ∈ medal | placement | time | score → covers all sports.

## Tournament scenarios (Phase 1 mock + Phase 2 real must cover all)

1. Log upcoming tournament (future) → push opt-in + reminder.
2. Log past tournament + result (medal or no-medal).
3. Update result post-event ("how'd City Open go?").
4. Backfill past medals (persona build).
5. Multi-category in one tournament (MD + MXD + singles, each its own result).
6. Participated, no medal (still logged).
7. View upcoming ("my next tournaments").
8. View player card / medals ("show my card").

## High-fit sports (onboarding shortlist, Phase 3 preview → Phase 7 active)
- Tier 1 (lead chips): Pickleball, Badminton, Tennis, Table Tennis.
- Tier 2: Padel, Squash, Chess, Running/Marathon.
- Tier 3 (+more): Cycling, Golf, Swimming.

## Artifacts
- `CHAT_COMPANION_PRD.md` (detailed flows), `mockups/companion-mockup.html` (UI prototype),
  `mockups/rallyora-logo.html` (chosen logo), this roadmap.
