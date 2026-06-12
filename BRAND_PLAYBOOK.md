# Brand Playbook — Erne (Volt) companion

> Source of truth for this doc = live code, not a deck. Tokens come from
> [frontend/src/index.css](frontend/src/index.css) (`.erne-app :root` block, lines 109–128),
> the glyph + wordmark from [frontend/src/components/companion/erne/Icon.jsx](frontend/src/components/companion/erne/Icon.jsx),
> and the JS mirror in [frontend/src/components/companion/theme.js](frontend/src/components/companion/theme.js).
> If you change a value, change it in code first, then update this file.

---

## 0. Naming — READ FIRST (open tension)

Two names coexist in the codebase right now:

| Where | Value |
|---|---|
| Visible app name `APP_NAME` ([featureFlags.js:2](frontend/src/utils/featureFlags.js#L2)) | **PickleTracker** |
| Design system / glyph `aria-label` / CSS namespace (`.erne-app`, `BallMark`) | **Erne** |
| Earlier shelved name (memory) | rallyora |

`Wordmark` renders `APP_NAME` → today the wordmark literally says "PickleTracker" in the
Erne type/palette. **"Erne" is the internal design-system name, not yet the public name.**

**Rule:** pick one public name before any external/marketing use. Until then, all visible
copy uses `APP_NAME` (single source) — never hardcode a product name in components.

---

## 1. Brand essence

- **What it is:** a pickleball **companion / buddy**, not a tracker, not an expense app, not a "performance dashboard."
- **Voice:** warm, plain-language, low-friction. First-person ("Hi, I'm …"). Talks like a friend who logs the boring stuff for you.
- **Promise:** "Just tell me about a tournament in your own words — the result, the entry fee, even your travel costs — and I'll log it for you." ([WelcomeHero.jsx](frontend/src/components/companion/WelcomeHero.jsx))
- **Feel target:** chat-first (ChatGPT/Claude empty-state energy) + a confident sports edge (Volt accent).

---

## 2. Color — Volt palette

Light theme, single mode (`color-scheme: light`). Accent is the only loud color; everything else is warm off-white + near-black ink.

### Light surfaces (default app)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#f1f0e8` | app background (warm paper) |
| `--surface` | `#fbfaf4` | cards, sheets |
| `--surface2` | `#ffffff` | raised / inputs |
| `--ink` | `#16180f` | primary text |
| `--ink-soft` | `#6c6e60` | secondary text |
| `--line` | `#e2e0d4` | borders, dividers |

### Accent (Volt)
| Token | Hex | Use |
|---|---|---|
| `--accent` | `#c7f23a` | primary CTAs, brand glyph fill, highlights |
| `--accent-text` | `#16180f` | text/icons **on** accent (always ink, never white) |
| `--accent-soft` | `#eef8c8` | accent tints, selected chips, subtle fills |

### Dark surfaces (headers, dark cards, on-dark sections)
| Token | Hex | Use |
|---|---|---|
| `--dark` | `#16180f` | dark surface |
| `--on-dark` | `#fbfaf4` | text on dark |
| `--on-dark-soft` | `#9da08c` | secondary text on dark |
| `--dark-line` | `#2c2e22` | borders on dark |

### Rules
- **Accent is for action + brand only.** One accent element per view ideally; never large flat fills of `#c7f23a` behind body text.
- **On accent, text is `--ink` (`#16180f`)** — never white. The Volt green is light; white-on-Volt fails contrast.
- Don't introduce new hexes in components. Use the CSS vars (`.erne-app` scope) or `T` from `theme.js`. The `theme.js` `T` map is the JS mirror for inline styles; keys are stable even though values were remapped from the legacy navy/lime.
- ⚠️ `theme.js` `T.lime = #C7F23A` matches `--accent`; `T.navy = #16180F` matches `--ink`/`--dark`. Legacy `navy`/`lime` key **names** are kept for compatibility — values are Volt. Don't rename keys.

### Scoping (important)
CSS vars live on `.erne-app` / `.erne-popup`, **not** global `:root`. This is deliberate:
reused light-theme pages (Calendar / Dashboard / Coach Hub) render inside `PageOverlay` and
must **not** inherit Volt tokens. Keep new companion surfaces inside the `.erne-app` scope.

---

## 3. Typography

Two pairings live in the codebase — companion shell vs. legacy/global. Don't mix them.

### Companion shell (Erne) — use this for all new companion UI
| Role | Family | Settings |
|---|---|---|
| Display / headings (`.erne-h`, `Wordmark`) | **Archivo** | `--display-wght: 800`, `--display-stretch: 112%`, `letter-spacing: -0.01em` |
| Body | **Hanken Grotesk** | normal weight; 500 for emphasis |

```
--font-display: 'Archivo', system-ui, sans-serif;
--font-body:    'Hanken Grotesk', system-ui, sans-serif;
```

### Global / legacy (auth, admin, non-companion)
- Headings: `Barlow Condensed` (`letter-spacing: 0.02em`)
- Body: `Roboto`

> The `theme.js` `T.font` lists `Hanken Grotesk → Archivo` fallback for inline-styled companion bits.

### Type rules
- Headings always use the display family via `.erne-h` (don't hand-set font-family in components).
- Expanded display stretch (112%) + heavy weight (800) is the brand signature — keep headings chunky and slightly wide.
- Min input font-size 16px on iOS (auto-zoom guard already in CSS) — don't override below that.

---

## 4. Logo & glyph

All in [erne/Icon.jsx](frontend/src/components/companion/erne/Icon.jsx).

### BallMark (primary glyph)
A **pickleball**: filled disc with punched holes.
- `bg = var(--accent)` (Volt), `holes = var(--ink)` (near-black), holes at `opacity 0.92`.
- 7 holes, asymmetric placement (don't "tidy" them to a grid — the scatter is intentional).
- `aria-label="Erne"`.
- Use at 28–44px in chat headers / welcome. Don't recolor the disc to anything but `--accent` (or `--ink` on accent backgrounds, inverted).

```jsx
<BallMark size={44} />                       // welcome hero
<BallMark size={28} bg="var(--ink)" holes="var(--accent)" />  // on-accent inverse
```

### Wordmark
Renders `APP_NAME` in display font (Archivo 800, stretch 112%, `-0.01em`). See §0 — the
string is `PickleTracker` today. Lockup = `BallMark` + `Wordmark` side by side, ball left.

### Icon system
Single `<Icon name size stroke color />` component — **stroke-based, geometric, no emoji** in
the Erne set. Default `stroke=1.75`, `color="currentColor"`, round caps/joins. Available names:
nav/system (plus, close, send, search, chevron(s), back, check, edit, trash, share), domain
(ball, calendar, chart, whistle, idcard, bag, wallet, feed, install, flame, spark, history, pin,
net, arrowRight, trophy/medal/etc.), plus multicolor `google`.

**Rule:** new companion icons go in `ICON_PATHS` as stroke paths on the 24×24 grid — don't drop
emoji or raster icons into Erne surfaces. (Older popups still carry emoji; migrate when touched.)

---

## 5. Shape & layout

- **Radius:** `T.radius = 16` (cards/sheets). Pills/chips fully rounded. Keep corners soft.
- **Header:** 56px tall, bordered bottom (`--line`), padded `0 14px 0 18px`.
- **Surfaces:** card = `--surface` bg + `1px solid --line`. Raised/input = `--surface2`.
- **Motion:** subtle. Existing `cell-breathe` (1.3s ease-in-out, scale 1→1.08 + Volt-tinted shadow) marks a fresh save on a calendar cell. Honor `prefers-reduced-motion` (already wired). No gratuitous animation.
- **Safe areas:** use `.pb-safe` / `.bottom-safe` / `.install-modal-footer` for iOS notch/home-indicator — don't hardcode bottom padding.

---

## 6. Voice & copy

- First person, friendly, concise. "Hi, I'm {APP_NAME}." "Your pickleball buddy."
- Show, don't instruct: welcome offers **tappable example sentences** that prefill the composer
  ("Won gold in mixed doubles at Mumbai Open on May 24, entry 500") instead of a how-to.
- Composer placeholder: `Message {APP_NAME}…`.
- Use curly quotes in UI copy (' '). Indian context: rupee amounts, Indian city/tournament names in examples.
- Never call it a "tracker," "expense manager," or "dashboard" in user-facing copy.

---

## 7. Do / Don't

**Do**
- Pull all color/type from `.erne-app` CSS vars or `theme.js` `T`.
- Keep accent rare and intentional; ink-on-accent always.
- Keep the companion in its own `.erne-app` scope; leave overlay pages light.
- Use `APP_NAME` for every visible product-name string.
- Use stroke icons + the BallMark glyph.

**Don't**
- Hardcode hexes or a product name in components.
- Put white text on Volt accent.
- Leak Volt tokens into reused overlay pages.
- Rename `theme.js` legacy keys (`navy`/`lime`) — values are Volt, names stay.
- Add emoji to new Erne surfaces.

---

## 8. Open items
1. **Pick the public name** (PickleTracker vs Erne vs new) — §0. Blocks any external brand asset.
2. Migrate remaining emoji-based popups to the stroke Icon set.
3. No favicon/PWA-icon/social-card spec captured here yet — add once name is locked.
