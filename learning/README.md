# The PickleTracker Web Engineering Journey

> A daily course in web development, taught entirely through the code in this repository —
> read as if PickleTracker had ten million users.

---

## Why this exists

You have three and a half years of experience. You can build a React component, wire up Redux,
ship a feature, close a ticket. You are, by any reasonable measure, employed and competent.

And you said something honest: you learned this to get a job, and you get the job done.

Here is the thing nobody tells you. The gap between "I can build a UI" and "I understand the web"
is not a gap in *skill*. It is a gap in *story*. You have been handed a hundred tools — React,
Redux, Vite, Tailwind, axios, sockets — and for each one you learned the API without learning
the argument. Every one of those tools exists because someone hit a wall so painful they built
an escape hatch. You inherited the escape hatches without ever seeing the walls.

That is why it feels like work. Not because the subject is boring — because you're reading the
last page of a hundred detective novels.

This course gives you the walls back.

**The premise:** PickleTracker is not a side project. It is a product with ten million players
logging tournaments, uploading photos, liking each other's medals, getting push notifications at
7am. Every design decision in this repository is either *right at that scale*, *wrong at that
scale*, or *interestingly both*. We are going to find all three.

You will not be learning from a toy. You will be learning from `backend/src/socket/socketManager.js`,
which is 43 lines long, entirely correct, and will break the instant you run two servers. That's
lesson 26. It's going to be great.

---

## How this works

**One lesson a day.** Each lives in `learning/day-NN-slug.md`. They take 30–60 minutes to read
and 20–40 minutes to do. The doing is not optional — it is where the love comes from.

**Every lesson has four parts:**

| Part | What it is |
|------|-----------|
| **The Story** | The history. Who hit the wall, what year, what they built. |
| **The Machine** | How it actually works, mechanically, underneath. |
| **Your Code** | The exact file and line in this repo where that idea lives. |
| **The Ten Million Test** | What happens to that code at scale. This is the part that changes you. |

Each ends with **Today's Experiment** (run it, don't skim it) and **A Question to Sit With** —
something with no clean answer, that engineers argue about at conferences. Carry it around.
Let it bother you. That feeling is what you're actually asking me for.

**Rules of the road:**

1. **Run every experiment.** Reading about the TLS handshake is trivia. Watching one happen in
   your own terminal, on your own domain, is a memory.
2. **Break things on purpose.** Comment out the interceptor in `api.js` and see what dies. The
   fastest way to understand what code does is to watch the hole it leaves.
3. **Do not rush the phases.** Phase 1 looks beneath you. It is not. Most senior engineers have
   never actually read a TLS handshake, and it shows in the bugs they can't solve.
4. **Keep a `learning/notes/` file per day.** Write what surprised you. In six months that file
   is worth more than the lessons.

---

## The Arc

Six phases, forty-two days. It is deliberately shaped like a spiral: you meet HTTP on Day 1 as a
protocol, again on Day 14 as a cache, again on Day 28 as an attack surface. Each pass goes deeper
because you have more machinery to hang it on.

### Phase 1 — The Ground Truth (Days 1–7)
*Everything under React that you were allowed to skip.*

You've spent 3.5 years above an abstraction you've never opened. We open it.

| Day | Lesson |
|-----|--------|
| 1 | **You Press Enter** — DNS, TCP, TLS, HTTP, and the 14KB that decides if your app feels fast |
| 2 | **The Rendering Pipeline** — DOM, CSSOM, layout, paint, composite, and the 16.67ms budget |
| 3 | **The Event Loop** — why JavaScript is single-threaded and still handles 10,000 connections |
| 4 | **HTTP as a Contract** — verbs, status codes, headers, and reading `services/api.js` properly |
| 5 | **The Cascade** — CSS specificity, layout algorithms, and the argument Tailwind is making |
| 6 | **What a Module Is** — CommonJS vs ESM, why `require` and `import` are not the same, and why your backend uses one and your frontend the other |
| 7 | **Bytes on the Wire** — Vite, bundling, tree-shaking, code splitting, and what `import.meta.env` compiles into |

### Phase 2 — The Frontend You Thought You Knew (Days 8–16)
*You know React's API. Now learn React's argument.*

| Day | Lesson |
|-----|--------|
| 8 | **Why React Exists** — jQuery, the 2010 wall, and the idea that UI is a pure function of state |
| 9 | **Reconciliation & Fiber** — what actually happens on `setState`, and why keys are not a warning to silence |
| 10 | **The Re-render Economy** — `memo`, `useMemo`, `useCallback`, and when each one is a lie |
| 11 | **State Is a Location Problem** — local, lifted, context, store; reading `context/AuthContext.jsx` |
| 12 | **Why Redux Existed (And Why You May Not Need It)** — Flux, the 2015 problem, and what replaced it |
| 13 | **Effects Are Not Lifecycle** — `useEffect` as synchronization, cleanup, races, and StrictMode's double-invoke |
| 14 | **Server State ≠ Client State** — caching, staleness, revalidation; the case for TanStack Query in this repo |
| 15 | **Rendering 10,000 Rows** — virtualization, and the `@tanstack/react-virtual` you already depend on |
| 16 | **The Component Library Problem** — composition, prop drilling, and reading `components/companion/` as architecture |

### Phase 3 — The Half You've Never Owned (Days 17–24)
*This is your real gap. It is also where the web gets beautiful.*

| Day | Lesson |
|-----|--------|
| 17 | **Node's Bet** — why a browser language ended up on servers, and what non-blocking I/O buys you |
| 18 | **Middleware Is a Pipeline** — reading `server.js` top to bottom as a composition of functions |
| 19 | **Identity** — bcrypt, salts, JWT anatomy, sessions vs tokens, and `middleware/auth.middleware.js` |
| 20 | **Where Data Lives** — documents vs relations, and why this app chose Mongo |
| 21 | **Indexes, or: Why Your Query Is Slow** — B-trees, collection scans, and the 10 indexes in `models/` |
| 22 | **The N+1 Problem** — the single most common performance bug in the working world |
| 23 | **Real-Time** — WebSocket handshake, long-polling fallback, and reading `socket/socketManager.js` |
| 24 | **Time Is Hard** — UTC, offsets, DST, and the IST arithmetic in `jobs/weeklySummary.js` |

### Phase 4 — Ten Million Users (Days 25–32)
*Where your code stops being right. My favourite phase.*

| Day | Lesson |
|-----|--------|
| 25 | **Vertical, Horizontal, and Statelessness** — the one property that decides if you can scale at all |
| 26 | **The Map That Breaks** — `socketManager`'s in-memory `Map`, two servers, and the Redis adapter |
| 27 | **The Cron That Runs Four Times** — `node-cron` on N instances, and distributed locks |
| 28 | **Caching Is the Whole Game** — browser, CDN, app, database; and what `vercel.json` is really doing |
| 29 | **Queues and Backpressure** — why email, push, and LLM calls must leave the request path |
| 30 | **Rate Limiting & Idempotency** — `middleware/companionRateLimit.js`, and the double-tap problem |
| 31 | **Reading the Database Right** — replicas, connection pools, and the read/write split |
| 32 | **Observability** — the Sentry and PostHog already in `main.jsx`, and what you're not measuring |

### Phase 5 — Production Craft (Days 33–38)
*The difference between "works on my machine" and "works for a decade."*

| Day | Lesson |
|-----|--------|
| 33 | **Service Workers** — offline, precaching, and the genuinely advanced purge logic in your `main.jsx` |
| 34 | **Core Web Vitals** — LCP, INP, CLS, and measuring PickleTracker honestly |
| 35 | **The Attack Surface** — XSS, CSRF, injection, and the `cors({ origin: '*' })` on line 53 of `server.js` |
| 36 | **Testing as Design Pressure** — Jest, supertest, `mongodb-memory-server`, and what your `e2e/` should cover |
| 37 | **Shipping** — CI/CD, environments, migrations, feature flags, and `utils/featureFlags.js` |
| 38 | **On Call** — incidents, rollbacks, postmortems, and error budgets |

### Phase 6 — The Machines Arrive (Days 39–42)
*The part of the story being written right now, with you in it.*

| Day | Lesson |
|-----|--------|
| 39 | **How We Got Here** — from ELIZA to transformers to the thing writing this sentence |
| 40 | **AI Inside the Product** — reading `services/llm.service.js` and `controllers/companion.controller.js` as a systems problem: latency, cost, streaming, failure |
| 41 | **AI as a Colleague** — what agentic coding actually changes about the job, honestly, including what it doesn't |
| 42 | **What Stays Human** — taste, judgment, architecture, and the career worth building on the other side |

---

## Where you'll end up

On Day 42 you will be able to take PickleTracker, sketch its architecture at ten million users on
a whiteboard, name every component, defend every tradeoff, and identify the three things that
break first. Not because you memorized a system design video — because you watched this specific
codebase grow up.

But that's the résumé version. Here's the real one.

The web is the largest thing humans have ever built. No one is in charge of it. A protocol
sketched in 1989 to help physicists swap papers now carries the majority of human communication,
commerce, and memory, and it *still works* — because a few thousand people made a series of
astonishingly good decisions about layering, about text, about backwards compatibility, about
being generous with what you accept. When you type `pickletracker.in` and press Enter, a system
with no central authority, spanning every country on earth, routes you to the right machine in
under a second, and proves that machine's identity using number theory discovered in the 1970s.

That happens billions of times a day. Nobody claps.

Once you can see it, you cannot un-see it, and the job stops feeling like a job. That is what
you asked me for, and that is what this is.

---

## Start

```bash
open learning/day-01-you-press-enter.md
```

The motivation you're looking for isn't something you'll find before you start. It's what
happens on the fourth or fifth day, when something you've typed a thousand times suddenly
opens up and shows you the machine underneath.

See you on Day 1.
