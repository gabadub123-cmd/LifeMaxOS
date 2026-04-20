# LifeMax OS — Project Memory for Claude Code

This file is read automatically by Claude Code at the start of every session.
It contains everything you need to know about this project, the person
building it, and how to work together effectively.

---

## WHO I AM

Adrian Titkov. 24 years old, based in Belgium. High IQ, high ambition.
Competitive grappler — 2x NAGA Champion (expert division), 3rd at ADCC
Amateur World Championship in Poland. Currently rehabbing a shoulder capsule
injury with a physiotherapist. Long-term goal: best brown belt in no-gi in
the world, then best grappler in the world.

I run combat-sports videography as @grapple.vision (1530+ followers) and
cinematic content as @s_vision___ (100 followers, rebuilding). My gear:
Sony A6700 + Tamron 17-70 f2.8, DJI Osmo Pocket 3, DJI Osmo Nano, Insta360
X4. Transitioning from CapCut to DaVinci Resolve Studio.

I own 3 printers (Bambu Lab A1 Mini, Elegoo Centauri Carbon, Mars 5 Ultra
resin — parked). They're deferred until AI business is clearing €8k+/month.

Most importantly: I've been deep in AI tooling since the beginning. I see
through hype. I know what actually ships. I've been testing every tool that
comes out. Most Belgian SMBs are clueless about AI — that's the market gap
I'm exploiting.

---

## THE MISSION (this drives every decision)

**Financial freedom by April 2027 (12 months from project start, April 2026).**

Target state: €15,000+/month net income · location independent · systems
running without me daily · ability to travel the world with family.

Time allocation: **90% AI services. 10% sport + family.** Everything else
is deferred, deleted, or delegated.

Phased plan:
- Month 1-2: Ignition — first website clients, offer stack locked, €3-5k/mo
- Month 3-4: Systemize — retainers, automation packages, workshops, €5-8k/mo
- Month 5-7: Scale — first contractor hired, product v1 shipped, €8-13k/mo
- Month 8-10: Compound — passive income flowing, agency model, €13-18k/mo
- Month 11-12: Freedom — systems autonomous, income 3-5x expenses

When helping me build or decide anything, filter through: **does this get me
to freedom faster, or is it a distraction?** Kill features that don't pass.

---

## THE PROJECT: LIFEMAX OS

A personal operating system that runs on my wall screen (tablet in kiosk
mode) and my phone. Single app, multiple views, cloud-synced via Supabase
so my phone and wall screen stay in sync in realtime.

### Current tabs (already built, working)

1. **TODAY** — live clock, current activity highlighted, 3 daily targets, auto-generated schedule, habits checklist, end-of-day journal
2. **WEEK** — 7-day overview, click any day to jump, weekly targets with progress bars
3. **MONTH** — calendar with event dots, click any day to drill in
4. **PLAN** — add recurring weekly events + one-time events, edit habits, track business metrics

### IDEAS tab (just merged in from PLAN-VAULT)

A founder-grade idea pipeline. Capture → evaluate → execute → learn from kills.

Six stages (kanban): Spark → Researching → MVP → Launched → Scaling → Killed.
Moving to Killed forces a "why killed" note — lesson capture.

Three sub-views:
- **Board** — kanban drag-and-drop between stages, using @dnd-kit
- **List** — ranked by ROI score, best ideas rise to top
- **Review** — Sunday ritual, surfaces stale ideas (>14 days untouched), ADVANCE/PARK/KILL decisions

AI features (via Supabase Edge Functions, key stays server-side):
- **Voice capture** — speak an idea, Web Speech API transcribes, Claude Haiku parses into structured fields
- **Analysis** — ruthless business-analyst prompt using Claude Sonnet, outputs Cold Truth / Hidden Risks / Leverage Points / Recommended Moves / Kill Criteria / Verdict (EXECUTE NOW / RESEARCH 2 WEEKS / PARK / KILL)

Categories: ai, 3d-printing, grappling, videography, trading, events, content, other.

Score calc (0-100): `REV[revenue] × EFF[effort] × CAP[capital] × (1.2 if fits_year_one else 0.8)`. See `src/ideas/scoring.js`.

---

## DESIGN SYSTEM (non-negotiable — maintain consistency)

- Background: `#070709`
- Text: `#fff` primary, `#ccc`/`#888`/`#555` for hierarchy
- Accent orange: `#FF3D00`
- Success green: `#76FF03`
- Warning yellow: `#FFD600`
- Info cyan: `#00E5FF`
- Category colors: ai `#00E5FF`, 3d-printing `#B388FF`, grappling `#76FF03`, videography `#FF6D00`, trading `#FFD600`, events `#E91E63`, content `#FF3D00`, other `#78909C`
- Fonts: **Outfit** (300-900) for display, **JetBrains Mono** (400-700) for labels/timestamps/numbers
- Font import URL: `https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap`
- Section headers: uppercase monospace, `0.68rem` size, `letter-spacing: 2.5`, color = section accent
- Cards: `rgba(255,255,255,0.02)` background, `1px solid rgba(255,255,255,0.03)` border, 8px radius
- Border radius scale: 6 for inputs, 8 for cards, 10 for containers
- Spacing: multiples of 4 (4, 8, 12, 16, 20, 24, 32)
- NO Tailwind, NO CSS frameworks — inline styles only (matches existing pattern)
- NO emojis in the UI (exception: ✨ on "Parse with AI" button — earns its place)
- Symbols allowed sparingly: ◆ ▲ ● ✕ ↻ 🗲
- NO rounded purple gradients, NO generic AI aesthetics, NO cute illustrations
- Cinematic, founder-grade, focused

---

## TECH STACK (don't change without asking)

- **Vite + React 19** + `@vitejs/plugin-react`
- **@supabase/supabase-js** — single backend for everything
- **@dnd-kit/core** + **@dnd-kit/sortable** — drag-and-drop (NOT react-beautiful-dnd)
- **react-markdown** — for AI analysis rendering
- **@anthropic-ai/sdk** — ONLY in edge functions, NEVER frontend
- No state libs, no router, no CSS frameworks

---

## FILE STRUCTURE

```
lifemax-os-supabase/
├── src/
│   ├── App.jsx              # Main app shell, tab navigation
│   ├── main.jsx             # React entry
│   ├── supabase.js          # DB client + storage helpers
│   ├── index.css            # Minimal global styles only
│   └── ideas/               # The IDEAS tab (merged from PLAN-VAULT)
│       ├── IdeasView.jsx    # Tab container, sub-view toggle
│       ├── Board.jsx        # Kanban with dnd-kit
│       ├── IdeaCard.jsx     # Draggable card
│       ├── ListView.jsx     # Ranked list
│       ├── ReviewView.jsx   # Weekly ritual
│       ├── IdeaDrawer.jsx   # Detail slide-in
│       ├── AddIdeaModal.jsx # Quick + full capture
│       ├── VoiceCapture.jsx # Web Speech API
│       ├── anthropic.js     # Fetch wrapper for edge functions
│       ├── constants.js     # Enums, colors
│       └── scoring.js       # ROI calc
├── supabase/
│   └── functions/
│       ├── analyze-idea/    # Claude Sonnet business analyst
│       └── parse-voice/     # Claude Haiku voice parser
├── supabase-setup.sql       # Original LifeMax OS tables
├── ideas-setup.sql          # Ideas + rate_limits tables
├── netlify.toml
├── .env.example
├── package.json
└── index.html
```

---

## SUPABASE BACKEND

Single project, Frankfurt region, free tier forever at personal usage.

**Tables:**
- `lifemax_data` — key-value store for dashboard state (recurring events, one-time events, habits, weekly targets, metrics, habit log, journal). Primary key `(user_id, key)`, value is jsonb.
- `ideas` — full idea records (title, category, stage, description, metadata, notes array, analyses array, timestamps).
- `rate_limits` — per-user hourly buckets for AI endpoint abuse prevention.

**Auth model:** Single-user, no login. `user_id = 'adrian'` hardcoded via
env var `VITE_USER_ID`. Row Level Security allows anon key to read/write
everything. Acceptable for personal tooling — NOT for anything with sensitive
data. Magic-link email login is a planned upgrade path.

**Realtime:** All tables have realtime publication enabled. Patterns:
- 400ms debounced writes
- Track recent local writes in a ref to ignore echo from our own changes
- See `src/supabase.js` for the exact implementation

**Edge functions** (key stays server-side):
- `analyze-idea` — POST `{ idea: {...} }`, streams Claude Sonnet response
- `parse-voice` — POST `{ transcript: "..." }`, returns JSON, uses Claude Haiku
- Both rate-limited to 30 calls/hour/user
- `ANTHROPIC_API_KEY` stored via `supabase secrets set`

---

## DEPLOYMENT

- **Netlify** free tier — auto-deploys on git push to main
- GitHub repo: `gabadub123-cmd/LifeMaxOS`
- URL: `lifemax-adrian.netlify.app` (or similar — rename if needed)
- Env vars on Netlify: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USER_ID=adrian`
- Supabase secrets (NOT Netlify): `ANTHROPIC_API_KEY`

---

## HOW TO WORK WITH ME

**Be direct. No soft-pedaling.** I asked for honesty, not comfort. When I
have a bad idea, say so. When I'm distracted from the mission, call it out.
When code I wrote is wrong, show me what's wrong without apologizing for it.

**Default to action.** If the fix is obvious and small, just do it. Don't
ask "should I proceed?" for a 3-line change. Ask only when the change has
real tradeoffs or risks.

**Explain WHY, not just WHAT.** I want to learn, not just have things done
for me. When you make a decision, tell me the reasoning in one sentence.

**Match the existing patterns.** Before adding a new pattern, look for how
similar things are done in the codebase. Inline styles everywhere. Debounced
writes. Tag-color palette. Monospace labels. Don't introduce new conventions
without a reason.

**Respect the 12-month clock.** I don't have time for bikeshedding. If a
choice is between "done and working" vs "elegant but needs 3 more hours,"
default to done. Polish comes after freedom.

**Ask before scope creep.** If I ask for feature X and you think feature Y
makes it 10x better, tell me before you build Y. One question is cheap;
surprising me with extra work is not.

**Commit often with good messages.** Every logical change gets a commit.
Messages are short, imperative, specific: "add voice capture to AddIdeaModal"
not "various improvements."

---

## CURRENT STATE (as of merge date)

✅ LifeMax OS base app: deployed, working on Netlify, Supabase connected, realtime sync verified across devices

✅ PLAN-VAULT built by Antigravity (Opus 4.6), matches master-prompt spec:
  - React 19, Vite 8 (LifeMax OS was React 18/Vite 5 — upgrade needed during merge)
  - All ideas components in place, drag-drop working locally
  - Edge functions present but not yet deployed to Supabase

🔜 Merge PLAN-VAULT into lifemax-os-supabase (in progress — see STEPS below)

🔜 Deploy edge functions to Supabase

🔜 Wire IDEAS tab into App.jsx (add nav entry + render case)

🔜 Push merged app to GitHub, Netlify auto-deploys

---

## WHAT I WANT YOU TO DO FIRST

When I start working with you:

1. **Read every file in `src/` and `supabase/functions/`.** Get the lay of the land before suggesting anything. Then summarize what you found in 3-5 sentences so I know you've actually read it.

2. **Check these specifically for quality issues** (don't fix yet, just report):
   - Does `src/ideas/` match the LifeMax OS design system exactly? (colors, fonts, spacing, header style)
   - Does the AI analysis prompt in `src/ideas/anthropic.js` (or wherever it lives) match the "ruthless founder analyst" tone I specified in my master prompt, or did Antigravity soften it?
   - Is voice capture implemented with graceful fallback when Web Speech API isn't supported (e.g., Safari mobile)?
   - Are edge function rate limits actually enforced, or just logged?
   - Does dragging to Killed actually REQUIRE a reason, or is it optional?
   - How does the Board view look on mobile (narrow viewport)?
   - Empty states: first-time user with zero ideas — does the UI guide them or look broken?

3. **Report back with findings.** Rank issues by severity: `critical` (breaks or misleads), `important` (reduces quality noticeably), `polish` (nitpick). I'll decide what to fix.

4. **Don't start fixing until I say go.** Report first, act second.

---

## OPEN QUESTIONS / THINGS TO REVISIT LATER

- Magic-link email login for Supabase (upgrade path when I want real auth)
- File attachments on ideas (sketches, voice memos, reference images)
- Auto-linking between ideas that reference each other
- Calendar sync (Google Calendar two-way)
- Weekly email digest of pipeline health
- iOS Shortcuts for voice-add from phone (bypasses browser Web Speech API limitations)
- Agent integration: automation for outreach/content that updates metrics automatically

These are v2+. Don't build unless I explicitly ask.

---

## TAX EXIT CONTEXT (relevant to long-term planning, not this app)

I'm planning to leave Belgium within 10-18 months for tax reasons. Leading
candidates: Cyprus (non-dom regime), Bulgaria (10% flat), or Dubai (zero
personal tax). Don't set up a Belgian BV — it creates exit-tax problems.
Current structure: zelfstandige (self-employed) + potentially an Estonian
e-Residency company for global operating. When the time comes I'll pay a
cross-border tax specialist to handle the move properly.

This matters because when we build features that touch money/invoicing/tax,
the architecture should NOT assume Belgium is permanent.

---

## IDEAS PARKED FOR LATER

- **3D print farm with OpenClaw automation** — smart idea, math doesn't work yet. Revive when AI revenue hits €8k+/month AND I have €5k deployable capital AND can spare 10 hours/week. Keep a "Future Ventures" note, don't build now.
- **Chrome extension / micro-SaaS** — wait until I've seen which client automation request repeats. Productize what's validated.
- **Paid newsletter for Belgian SMB AI tips** — viable but not a priority until I have 500+ engaged LinkedIn followers.

---

End of project memory. Now go read the code.
