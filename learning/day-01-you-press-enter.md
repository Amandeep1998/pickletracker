# Day 1 — You Press Enter

**Phase 1: The Ground Truth · Reading: ~40 min · Doing: ~30 min**

---

## Before we start

Open a terminal. Type this. Don't read ahead until you've run it.

```bash
curl -s -o /dev/null -w "%{time_namelookup}  %{time_connect}  %{time_appconnect}  %{time_starttransfer}  %{time_total}\n" https://pickletracker.in
```

Five numbers, in seconds. Cumulative — each includes everything before it.

```
DNS lookup   TCP connect   TLS done   First byte   Complete
```

Keep those numbers. By the end of today you will know what every one of them is, why the gaps
between them are the size they are, and which of them you can actually do something about.

Most engineers with 3.5 years of experience cannot explain the third number. After today, you can.

---

## Part 1 — The Story

### A proposal nobody was excited about

March 1989. CERN, the particle physics lab outside Geneva. A 33-year-old software engineer named
Tim Berners-Lee has a bureaucratic problem: CERN has thousands of scientists, on dozens of
incompatible computer systems, and every one of them keeps their documents in a different place
in a different format. People leave, and their knowledge leaves with them.

He writes a document titled *"Information Management: A Proposal."* It suggests a system of
documents that can point at each other across machines, over the network, without anyone
maintaining a central index.

His manager, Mike Sendall, writes two words at the top: **"Vague but exciting."**

That's it. That's the founding document of the web. A mildly interested shrug.

Berners-Lee got a NeXT cube — a beautiful, commercially doomed machine built by Steve Jobs
during his exile from Apple — and over the next eighteen months wrote four things that didn't
exist before:

- **HTML**, a way to mark up a document so a machine could find the links in it
- **HTTP**, a protocol for asking another computer for a document
- **URLs**, a naming scheme so any document anywhere could be addressed
- **A browser and a server**, so the other three would do something

Every single thing you have built in 3.5 years sits on those four ideas. All four were done by
Christmas 1990.

### HTTP 0.9: the entire protocol

Here is the first version of HTTP, in full. Not a summary — the whole thing.

The client opens a TCP connection and sends one line:

```
GET /hypertext/WWW/TheProject.html
```

The server sends back the HTML. Then it closes the connection.

That's the protocol.

Sit with what's *missing*. No headers. No `Content-Type` — the response was always HTML, so why
say so. No status codes; if something went wrong the server sent you an HTML page that said so,
and your program had no way to tell that apart from success. No `POST`, no `PUT`, no `DELETE` —
one verb, `GET`, because the web was for *reading*. No version number in the request, which is
why we retroactively call it 0.9; at the time it was just "HTTP."

No cookies. No sessions. No authentication. No caching. No compression. No encryption — the idea
that you'd send a credit card number over this would have been absurd, because there was nothing
to buy and no one to buy it from.

Now hold that next to the request your browser sends `pickletracker.in` today: fifteen headers, a
compressed and multiplexed binary framing layer, an encrypted tunnel negotiated with elliptic
curve cryptography, a service worker that may answer without touching the network at all, and a
JWT proving who you are.

**Every single one of those is a scar.** Someone hit a wall, and this is the shape of the
bandage. The rest of this course is the story of those walls.

### The decision that made it the web

1993 is the year it becomes inevitable, for two reasons.

The first: Marc Andreessen and Eric Bina release **Mosaic**, the first browser that felt good —
and, critically, the first to render images *inline*, with a new tag called `<img>`. Before
Mosaic, an image was a link you clicked to download a file. After Mosaic, pages had pictures in
them. That's the moment the web stopped being a document system for physicists and started being
a *medium*.

The second, and the more important one: on **30 April 1993**, CERN published a declaration
putting the World Wide Web's underlying technology into the **public domain**. No licence. No
royalties. No patents. Anyone could implement it, forever, for free.

Understand how strange that was. This is the era of competing proprietary online services —
CompuServe, AOL, Prodigy, Minitel — each a walled garden charging by the hour. Gopher, the web's
main competitor and in some ways a nicer protocol, announced in early 1993 that the University of
Minnesota would charge licensing fees for commercial servers. It died almost immediately. Not
because it was worse. Because it had an owner.

The web won because nobody owned it. That is not a footnote to the story. **That is the story.**
The reason you can `npm install` anything, read any spec, open DevTools on any site, and build a
company on infrastructure you paid nothing for — that all traces back to a decision, by a
publicly funded physics lab, to give the thing away.

And then in May 1995, at Netscape, Brendan Eich was given about ten days to add a scripting
language to the browser. Ten days. He shipped a prototype with first-class functions, closures,
and prototypal inheritance — genuinely good ideas — alongside `==` type coercion, `null` vs
`undefined`, and a `typeof null` of `"object"`. The good parts and the disasters, cast in the same
ten days, both now permanent, because the web's superpower — *nothing ever breaks* — is also its
curse: **you can never remove anything.**

You are typing, in 2026, in a language whose worst decisions are older than you started school,
kept alive because a hundred million pages depend on them.

---

## Part 2 — The Machine

You typed `pickletracker.in` and pressed Enter. Here is everything that happens, in order.

### Step 0 — Your browser doesn't trust you

Before touching the network, the browser parses what you typed. `pickletracker.in` isn't a URL —
there's no scheme. The browser guesses: is this a search query or a hostname? It sees a valid TLD,
assumes hostname, prepends `https://`, and produces:

```
https://pickletracker.in/
        └───────┬──────┘└┬┘
             host       path (defaulted to "/")
```

Then it checks a list. **HSTS preload** — a list compiled into Chrome itself, of domains that have
sworn they will only ever be served over HTTPS. If a domain is on it, the browser will refuse to
speak plain HTTP to it even if you explicitly type `http://`. Not "warn." *Refuse.* This is one
of the very few places the web has genuine, non-negotiable enforcement, and it exists because
downgrade attacks on public wifi were trivially easy for two decades.

**Nothing has left your machine yet.**

### Step 1 — DNS: the phone book nobody owns

`pickletracker.in` is a name for humans. The network only routes to **IP addresses**. Something
must translate.

Your browser checks caches in order — its own, the OS's, your router's — and on a miss asks your
**recursive resolver** (your ISP's, or `8.8.8.8`, or `1.1.1.1`). If the resolver doesn't know
either, it walks the tree from the top:

```
1. Resolver → a ROOT server:          "Where is .in?"
   Root:                              "I don't know. But .in's servers are at these IPs."

2. Resolver → the .in TLD server:     "Where is pickletracker.in?"
   TLD:                               "I don't know. But its nameservers are these."

3. Resolver → the AUTHORITATIVE NS:   "Where is pickletracker.in?"
   Authoritative:                     "76.76.21.21. Cache that for 300 seconds."
```

Three questions, and notice: **no server in that chain knew the answer.** Each one only knew who
to ask next. The entire global naming system for the internet is a chain of polite referrals.

Some things worth actually absorbing here:

**There are 13 root server addresses.** Labelled `a.root-servers.net` through `m.root-servers.net`.
Thirteen, because that's how many fit in a single 512-byte UDP packet in the original design —
a number from 1980s packet-size arithmetic, permanently frozen into the architecture of the
internet. But there aren't 13 machines. Those 13 *addresses* are announced from hundreds of
physical locations worldwide using **anycast**: many servers announcing the same IP, and the
network's routing protocol delivers your packet to whichever is closest. You and someone in São
Paulo can send packets to the identical IP address and reach different continents.

**Nobody owns this.** The root is operated by twelve independent organizations — universities,
NASA, the US Army, a Dutch nonprofit, a Japanese consortium. They cooperate. There is no company
that could shut DNS off, and no single point that failing takes it down.

**It's held together by caching.** That TTL — 300 seconds — is why the root servers aren't
drowning. Nearly every lookup is answered from a cache somewhere. It also has a consequence you
will one day feel personally: when you change a DNS record, the old value stays alive in caches
around the world for up to the TTL. This is why "I updated DNS, why is it still hitting the old
server" is a rite of passage. The answer is: because the internet is not a database, it's a rumour
network with expiry dates.

### Step 2 — TCP: agreeing to talk

You have an IP. Now you need a connection. TCP gives you an ordered, reliable byte stream on top
of a network that guarantees neither — packets can arrive out of order, twice, or not at all, and
TCP hides all of it.

Opening one costs a **three-way handshake**:

```
You  ──── SYN ────────────▶  Server     "Let's talk. My sequence number is X."
You  ◀─── SYN-ACK ────────   Server     "Agreed. Mine is Y. I got your X."
You  ──── ACK ────────────▶  Server     "I got your Y."
```

One full round trip before a single byte of *your* data moves.

This is your first encounter with the tyrant of this entire field: **latency is not bandwidth.**
Bandwidth you can buy. Latency is distance divided by the speed of light in glass, and nobody
gets to negotiate with that. Mumbai to Virginia is ~12,000km; light in fibre does ~200,000 km/s;
that's ~60ms one way, ~120ms round trip, *before* routers and queuing — realistically 180–250ms.

Upgrading your server does nothing to that number. Ever. The only fix is to move the server
closer, or to need fewer round trips. Both of those are architecture, not code — and both are
Day 28.

### Step 3 — TLS: the beautiful part

You have a connection. It is completely public. Every router between you and the server can read
every byte, and on shared wifi so can the person two tables over.

So the browser and server perform a **TLS handshake** and solve what sounds impossible:

> Two computers that have never communicated before, shouting across a room where everyone can
> hear, must agree on a secret number that nobody else in the room learns.

Your intuition says this is not possible. Your intuition is wrong, and the reason is one of the
loveliest results in applied mathematics — **Diffie–Hellman key exchange**, published in 1976.

The metaphor that actually works:

> You and I each have a private paint colour we never reveal. We publicly agree on a shared
> yellow. I mix my private red into the yellow and send you the orange. You mix your private blue
> into the yellow and send me the green. Everyone watching sees yellow, orange, and green.
>
> Now I add *my* red to your green. You add *your* blue to my orange. We both hold
> yellow+red+blue — the identical colour. The eavesdropper has all three public mixtures and
> cannot produce it, because **unmixing paint is hard**.

Real TLS uses elliptic curves rather than paint, where "unmixing" means solving the discrete
logarithm problem, which is computationally infeasible. But the shape is exactly that. Two
strangers, in the open, deriving a shared secret that the audience cannot.

That happens billions of times a day. It's happening right now, in the tab you have open behind
this file. It is arguably the single reason commerce works on the internet, and almost nobody who
builds for the web has ever watched one happen.

You will watch one in the experiment. That's the point of the experiment.

The handshake also does the *other* essential job: **identity**. Encryption alone is worthless if
you've encrypted a conversation with an attacker. So the server presents a **certificate** — its
public key, signed by a Certificate Authority your browser already trusts, in a chain that ends
at a root certificate shipped inside your operating system. The browser verifies the chain, the
expiry, and that the name on it matches `pickletracker.in`.

Cost: **one round trip** on TLS 1.3, two on TLS 1.2. TLS 1.3 (2018) cut a round trip by being
optimistic — the client guesses which key-exchange the server will pick and sends its material
immediately. A guess, on a protocol carrying the world's banking. It's usually right.

That's the gap between your second and third `curl` numbers. Go look at it now.

### Step 4 — Finally, the actual request

Three steps, two round trips, and *now* you send what you wanted to send:

```http
GET / HTTP/1.1
Host: pickletracker.in
User-Agent: Mozilla/5.0 (...)
Accept: text/html,application/xhtml+xml,...
Accept-Encoding: gzip, deflate, br
Accept-Language: en-US,en;q=0.9
Connection: keep-alive
```

Berners-Lee's `GET /page.html`, plus thirty-five years of scars.

`Host` is the most consequential line there, and it's why HTTP/1.1 mattered. In HTTP/1.0 there
was no `Host` header, so a server at one IP could serve exactly **one** website — it had no way to
know which site you meant. `Host` created **virtual hosting**: thousands of domains per machine.
Without that one header, shared hosting is impossible, and so is essentially all affordable web
hosting. One header. Entire industry.

`Accept-Encoding: gzip, deflate, br` says "compress it, I can decompress." Your HTML will come
back 70–80% smaller. Free, by asking.

And `User-Agent` is pure archaeology. Yours almost certainly begins with `Mozilla/5.0` — a
declaration of compatibility with Netscape Navigator, a browser that has not existed for over
twenty years, sent by every browser on earth, because in the 90s servers sniffed this string to
decide whether to send you the good page, and no browser could ever afford to stop lying. It is
a fossil. You transmit it several hundred times a day.

### Step 5 — The 14KB that decides how fast your app feels

This one changes how you think about performance.

TCP does not start at full speed. Because the sender has no idea how much the network between you
can absorb, it starts cautiously and ramps up — **slow start**. The initial allowance
(the congestion window) is about **10 packets**, roughly **14KB**, and the server *must stop and
wait for an ACK* before sending more.

So:

- If your critical response fits in **~14KB compressed**, it arrives in **one round trip**.
- At 14.1KB, the tail waits for a full extra round trip — 200ms+ on mobile — before it even ships.

There is a cliff in your performance profile, at fourteen kilobytes, put there by a congestion
control algorithm from the 1980s, and it is invisible in every framework tutorial ever written.

This is *why* the entire discipline of critical-path optimization exists. Inline critical CSS.
Server-render the shell. Defer everything else. All of it is people fighting for one round trip
against a number nobody chose for their app.

### Step 6 — Bytes become pixels

The first bytes arrive. The browser does **not** wait for the rest. It starts parsing immediately,
building the DOM incrementally, and firing off requests for the CSS and JS it discovers — often
with a separate **preload scanner** racing ahead of the main parser to find URLs early.

For PickleTracker that HTML is nearly empty: a `<div id="root">` and a `<script>`. The real work
starts when your bundle lands, React boots, and `ReactDOM.createRoot(...).render(...)` in
`frontend/src/main.jsx` runs. Everything from there — parse, style, layout, paint, composite — is
Day 2, and it has its own tyrant number: **16.67 milliseconds**.

---

## Part 3 — Your Code

Now the good bit. Everything above is already in this repository, and you've never read it as
architecture.

### This is a two-origin application

From `frontend/src/services/api.js:3`:

```js
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

And from the README:

> The **frontend** (e.g. Vercel) and **backend** (e.g. `api.pickletracker.in`) deploy separately.

So PickleTracker is not one server. It's **two completely independent systems** that only meet in
the user's browser:

```
                    ┌──────────────────────────┐
   pickletracker.in │  Vercel CDN — static     │  HTML, JS, CSS
                    │  files, ~100 edge PoPs   │  Cached near the user
                    └──────────────────────────┘
                                 │
                        browser loads app
                                 │
                    ┌──────────────────────────┐
api.pickletracker.in│  Node/Express + Mongo    │  Live data
                    │  One region              │  Every request travels
                    └──────────────────────────┘
```

Two hostnames. **Two of everything from Part 2** — two DNS resolutions, two TCP handshakes, two
TLS handshakes. The first API call your app makes pays the full setup cost from scratch, because
it's a different origin.

That's a real cost, and it buys something real: your UI ships from a CDN edge node in the user's
city, while your data comes from wherever your database is. Different problems, different
solutions, deliberately separated. Day 28 is about what that separation makes possible.

### The cleverest file in your repository

`vercel.json`. You have probably never read it. It is a masterclass, and you should be quietly
proud of it:

Condensed to its two load-bearing rules (the real file nests each value under a `headers` array —
go read it):

```jsonc
{ "source": "/assets/:path*",   → Cache-Control: "public, max-age=31536000, immutable" }
{ "source": "/((?!assets/).*)", → Cache-Control: "no-cache, no-store, must-revalidate" }
```

Two rules, and they say opposite things:

- Anything in `/assets/` → **cache for a year and never revalidate** (`31536000` = 365 days).
- Everything else, `index.html` included → **never cache, ever**.

Why is that not insane?

Because Vite doesn't emit `app.js`. It emits `app-4f9a2c1b.js`, where the hash is computed **from
the file's contents**. This is **content-addressed storage**, and it has a property worth
appreciating:

> **A cached asset can never be stale.** If the content changes, the hash changes, so the *name*
> changes — and a new name is a cache miss by construction. The old file isn't invalidated; it
> becomes unreachable. Nothing points at it any more.

Which means the only file that ever needs to be fresh is the one holding the *pointers* —
`index.html`. Hence: `index.html` never cached, everything it references cached forever.

That is a genuinely elegant idea. Cache invalidation is famously one of the two hard problems in
computer science, and this design doesn't solve it — it *dissolves* it, by making staleness
impossible to express. Repeat visits to PickleTracker download one small HTML file and get the
entire application from local disk at zero network cost.

You get one more thing free: **atomic deploys**. Because old hashed assets are never deleted, a
user mid-session on the old `index.html` can still fetch the old chunks. No broken deploy window.
Day 37.

### A line written by someone who'd been burned

`backend/server.js:48`:

```js
app.set('trust proxy', 1);
```

With the comment above it:

```
// Behind Render's single proxy hop. Lets req.ip resolve to the real client
// (the proxy-appended X-Forwarded-For entry) instead of a client-forgeable one,
// so the companion anon rate limit can't be bypassed with a spoofed XFF header.
```

Unpack it. Your Node process doesn't talk to users. A proxy does, and forwards to you — so from
Node's view *every* request comes from the proxy's IP. Useless for rate limiting.

The fix is the `X-Forwarded-For` header, where each proxy appends the IP it saw. But — and this is
the part the comment gets right — **a client can send that header themselves.** An attacker sends
`X-Forwarded-For: 1.2.3.4`, the proxy appends the real IP, and you get a list where the *first*
entry is a lie.

`trust proxy: 1` means "trust exactly one hop": take the entry the proxy appended, ignore anything
the client claims. Get the number wrong in either direction and you either can't rate limit at
all, or you let anyone forge their identity by typing a header.

One line of configuration. A whole security property. This is what senior work actually looks
like — not clever abstractions, but knowing precisely which byte to trust.

### The health check, and what it admits

`backend/server.js:87`:

```js
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});
```

> `// Lightweight health check — used by uptime pingers to prevent cold starts`

Read that comment as a confession. It says: **this server goes to sleep.** On a free or low tier,
an idle instance is spun down, and the next unlucky user pays several seconds of boot time. So
something pings `/health` every few minutes to keep it warm.

It works. It's also a load-bearing workaround, and Day 25 is where we talk about what replaces it.

---

## Part 4 — The Ten Million Test

Ten million users. What in today's material breaks?

**1. Your static frontend is already fine.** Genuinely. The Vercel CDN serves your JS from edge
nodes worldwide, the content-hashed assets cache forever, and a user in Pune never touches a
server in Virginia to load the UI. Ten million users of *static assets* is a solved problem, and
`vercel.json` solved it. This is the good news, and it's worth knowing which of your problems are
already handled.

**2. Every API request still crosses the planet.** `api.pickletracker.in` resolves to one region.
A user in Delhi loading their dashboard pays full DNS + TCP + TLS + round-trip latency to reach
it. The UI appears in 200ms; the *data* takes 800ms. Users don't perceive "fast shell, slow data" —
they perceive slow. Fixes: edge caching for public reads, regional read replicas (Day 31),
optimistic UI (Day 14).

**3. The `/health` ping stops being a trick and becomes a liability.** Keep-warm works for one
instance. At ten million users you run many instances behind a load balancer, they're never idle,
and `/health` changes job entirely: it becomes how the balancer decides which instances get
traffic. And then it needs to be *honest* — a `/health` that returns `ok` while the database
connection is dead is worse than none, because the balancer keeps feeding traffic to a broken
box. Day 32.

**4. DNS TTL becomes an incident-response tool.** Your 300-second TTL is a promise you'll be held
to. To fail over to a new region, you change DNS — and for up to five minutes, resolvers worldwide
keep sending users to the dead one. Low TTLs let you move fast and cost you extra lookups. That
tradeoff, at scale, is a decision someone has to actually make.

**5. TLS handshake cost becomes a line item.** Every new connection burns CPU on asymmetric crypto.
At millions of connections that is *real* server cost, which is why session resumption, TLS 1.3's
0-RTT, and connection reuse stop being trivia and start being budget. It's also why HTTP/2 —
which multiplexes many requests over *one* connection instead of opening six — was worth
rewriting the entire protocol as binary to get.

**6. And the one that bites first.** `server.js:82` is a bare `app.use(cors())` — no options. The
default is `Access-Control-Allow-Origin: *`, meaning any website on the internet may make
requests to your API from a user's browser. (Your socket.io server says the same thing explicitly
at `server.js:53`: `cors: { origin: '*' }`.) Combined with `Bearer` tokens in `localStorage`
(`api.js:11`), that's not immediately exploitable — but it's a wide-open door next to a room full
of credentials, and there is no reason for it. Day 35 is the full accounting.

---

## Today's Experiment

Four commands. Run all four. Read the output — really read it.

### 1. Watch DNS walk the tree

```bash
dig +trace pickletracker.in
```

You will see the referral chain from Part 2, live: root → `.in` → your authoritative nameservers →
the answer. Every line is one server saying "not me, ask them." Note the TTL on the final record.

Then:

```bash
dig pickletracker.in
dig api.pickletracker.in
```

Same IP, or different? That single fact tells you whether your two origins share infrastructure —
and now you can read that off DNS instead of guessing.

### 2. Watch a TLS handshake

```bash
openssl s_client -connect pickletracker.in:443 -servername pickletracker.in </dev/null 2>&1 | head -40
```

Find these in the output:

- **`Certificate chain`** — your cert, then who signed it, up to a root your OS trusts.
- **`Protocol : TLSv1.3`** — which version won the negotiation.
- **`Cipher : TLS_AES_256_GCM_SHA384`** — the exact algorithms these two machines agreed on,
  moments ago, having never met.
- **`Verify return code: 0 (ok)`** — the chain checked out.

That output is the Diffie–Hellman exchange from Part 3, completed. You are looking at the result
of the paint-mixing.

### 3. Confirm the caching design with your own eyes

```bash
curl -sI https://pickletracker.in | grep -i cache-control
```

Expect `no-cache, no-store, must-revalidate`. Now load the site in a browser, open DevTools →
Network, find any file under `/assets/`, copy its URL, and:

```bash
curl -sI "https://pickletracker.in/assets/THE-FILE-YOU-COPIED.js" | grep -i cache-control
```

Expect `max-age=31536000, immutable`. Look at the filename — that hash in the middle is the
content address. **You just verified the invalidation-proof cache from Part 3 on your own
production deploy.**

### 4. Find your own 14KB cliff

```bash
curl -s -H "Accept-Encoding: gzip, br" -o /tmp/pt.gz https://pickletracker.in && \
  echo "compressed HTML: $(wc -c < /tmp/pt.gz) bytes"
```

Under ~14,000? Your HTML shell arrives in one round trip. Then, the number that actually matters —
in DevTools → Network, sort by size and look at your main JS chunk. That's the real payload, and
it is almost certainly many times 14KB. Write the number down. On Day 7 we're going to cut it.

---

## A Question to Sit With

Everything today rested on one design choice: **layering.**

DNS doesn't know what TCP is. TCP has no idea it's carrying TLS. TLS cannot read the HTTP inside
it. HTTP is indifferent to whether it's moving JSON or a JPEG. Each layer knows only its own job
and the interface to its neighbours — which is exactly why HTTP/3 could move off TCP onto QUIC
without a single line of your application changing.

That decomposition is why the web could be extended for 35 years by strangers who never met, and
never had to coordinate.

So:

> **Every layer is a boundary someone chose. Which boundaries in PickleTracker are real — meaning
> you could replace one side entirely without touching the other — and which ones only look like
> boundaries?**

Concretely, to make it bite: your frontend and backend are separate *deployments*. But are they
separate *systems*? If you rewrote the backend in Go tomorrow, keeping every URL and JSON shape
identical, how much of `frontend/src/` would have to change?

If the honest answer is "nothing" — you have a real boundary, and that is worth a great deal.

If the honest answer is "quite a lot" — then something has leaked across, and finding *what*
is your first real piece of architectural work in this codebase.

Have a look. Bring what you find to Day 2.

---

**Next: Day 2 — The Rendering Pipeline.** The bytes have arrived. Now watch the browser turn them
into pixels sixty times a second, and find out what your `PaddleLoader` is really asking the
compositor to do.
