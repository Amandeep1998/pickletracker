# PickleTracker — Chat Companion PRD

Status: Draft (validation phase)
Owner: sainia
Last updated: 2026-05-31

---

## 1. Vision

PickleTracker becomes a **pickleball companion you chat with** — a buddy that quietly
journals your pickleball life while you just talk to it. Not an "expense tracker," not a
"performance tracker." A companion.

Goal of logging: **make it feel like texting a friend**, not filling a form.

## 2. Goal of THIS phase (validation, not commitment)

Build the chat experience on an **isolated, trashable route** so we can feel it before
betting the product on it.

- New route: `/companion` (existing app and `/` landing untouched).
- Behind feature flag `chat_companion`, default **OFF** in prod.
- If we don't like it: delete the route + its components + the flag = gone. Zero residue.
- If we like it: a LATER phase swaps it to the front door and trims unused pages.

## 3. Non-goals (this phase)

- NOT removing existing pages / bottom nav yet.
- NOT migrating existing users yet.
- NOT changing the database schema (reuse existing models).
- NOT building every feature in chat — only the top 3 use cases below.

## 4. Hard safety rules (existing users + data)

1. **Existing data is sacred.** Nothing already saved changes. Chat writes go through the
   *same validated controllers* into the *same collections* (Session, Tournament, Expense),
   so a chat-logged tournament is byte-identical to a form-logged one.
2. **Additive only.** If any field is needed, add it; never rename/drop.
3. **Two front doors coexist.** Old app keeps working. A logged-in user can use either; data
   shows up in both (same DB).
4. **Read-first parity.** Chat reads existing data via existing endpoints, so an existing
   user's companion already "knows" their past tournaments on day one.
5. **Trashable.** Route + components + flag are self-contained. Removing them cannot break the
   existing app.

## 5. Who uses it

- **Visitor** — anonymous, not signed in. Lands, tries chat, gets hooked, signs in.
- **Existing user** — already has data. Opens companion, sees their journey, logs by chatting.

## 6. MVP use cases (validate ONLY these)

1. **Log a tournament** (with result / medal).
2. **Add or update a medal** on an existing tournament.
3. **Log a casual session or drill.**
4. **"Show my stats"** — a read card, to prove retrieval works in chat.

Everything else (expenses, travel, feed, coach hub, gear, etc.) is OUT until these 4 feel great.

## 7. Core flows

### 7.1 Anonymous — log-first, auth-to-save
```
Visitor types: "won bronze in MD 3.5 at City Open on May 24"
  → AI parses → shows a PREVIEW CARD (editable by tapping)
  → "Sign in with Google to keep this in your journal" (single CTA)
  → Google login (once)
  → the pending log replays to the backend → saved
  → companion: "Saved! That's your first medal logged 🥉"
```
The first log IS the reason to sign up.

### 7.2 Existing user
```
Opens /companion → greeted by name, sees a short "recent journey" recap
  → types or taps a chip → parse → preview card → confirm
  → saved → instantly visible in chat AND in the old pages (same DB)
```

## 8. Conversation design

- **Greeting + chips** remove the blank-page problem:
  `[🏆 Log tournament] [🥇 Add medal] [🎾 Quick session] [📊 My stats]`
- **Slot-filling:** AI extracts what it can, asks only for what's missing.
- **Confirm card is mandatory** for anything with a medal or money — AI guesses, user fixes
  by tapping, never silent-saves. (Wrong medal saved = lost trust.)
- **Companion tone:** encouraging, pickleball-native buddy. Tone is a feature, not decoration.
- **Off-topic guard:** a cheap classifier short-circuits non-pickleball chatter with a canned
  reply, so we don't pay for people using us as free ChatGPT.

## 9. LLM strategy (zero incremental cost)

- Task = structured extraction → small fast model is enough.
- **Groq (Llama 3.3)** primary, **Gemini 2.0 Flash** fallback, OpenAI last resort.
- Behind a provider adapter (`llm.service.js`) so we swap by config, no rewrite.
- **Two-tier:** cheap model classifies + extracts (95% of traffic); bigger model only for
  ambiguous parses (rare).

## 10. Abuse / budget protection

- **Anonymous wall:** 2 free parses per session, then login required (also converts).
- **Rate limits:** IP-based pre-auth; per-user post-auth (~60 msgs/hr, ~30 logs/day).
- **Bot gate:** Cloudflare Turnstile on landing chat, verified server-side before any LLM call.
- **Cloudflare free** in front of Render (WAF + caching).
- **Input length cap** (~500 chars) blocks token-bombs.
- **Circuit breaker:** daily LLM-call counter; over budget → degrade to form mode (no LLM).
  App keeps working; spend hits a hard ceiling.

## 11. UI / screens

- **Landing chat (anon):** hero line + live chat box + chips + a couple of sample cards.
- **Inline auth-wall card:** appears after the preview, "Sign in with Google to save."
- **Main chat (authed):** message stream, interactive cards, chip bar, input box, a pinned
  mini player-card header (name, DUPR, streak, medal count).
- **Card types:** preview/confirm, result ("Saved!"), stats, milestone.

Visual approach: ASCII wireframe → hi-fi mockups (design tool) → review → then code.

## 12. Execution phases

| Phase | What | Risk |
|-------|------|------|
| P0 | This PRD + approved visuals | none |
| P1 | Static chat UI on `/companion` — fake replies, no LLM. Validate look/feel | none |
| P2 | Wire Groq adapter + tournament intent end-to-end (authed only) | low |
| P3 | Add medal-update + session intents + stats card | low |
| P4 | Anonymous pre-auth + auth-to-save replay + abuse guards | medium |
| P5 | Review → keep or trash. If keep: separate later project to flip front door + trim pages | — |

## 13. Success criteria

- A real user logs a tournament by chatting in **< 20 seconds**, with **fewer taps** than the form.
- Data lands correctly and is identical to form-logged data.
- Existing data is provably untouched.
- It *feels* like a buddy, not a form.

## 14. Risks

- **Chat is weak at overview/retrieval** → mitigate with summoned cards + pinned player card.
- **Parse errors on medals/money** → confirm card mandatory.
- **Cost/abuse** → free tier + circuit breaker + walls.
- **Existing-user confusion** → flag-gated, opt-in, old app stays.
