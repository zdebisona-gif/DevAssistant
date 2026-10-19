# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

A single user: Zane, using the app on their own Android phone in ordinary daily life — during a
morning budget check, a study session, an evening review. The job is to keep personal records
(notes, spending, plans, learning) in one place and to get quick, grounded answers about them
without opening several apps or scrolling through raw data.

## Product Purpose

Zen-I Assistant is a personal assistant for notes, finances, planning and learning. It unifies
those records in one app and answers plain-language questions about them. Success means Zane can
ask "how much did I spend on food this month?" or "what's on my plan tomorrow?" and get a
confident, source-backed answer instead of hunting for it.

## Positioning

Answers are grounded in the user's own records, not a general-purpose chatbot. The mechanism is
retrieval across the app's unified data layer (Finances, Notes, Planner, Learning) so responses
cite where a number or fact came from. A generic chatbot or a single-purpose budgeting app could
not truthfully copy this cross-record grounding.

## Operating Context

- Personal, single-user daily use on Android; portrait orientation.
- Onboarding walkthrough introduces the unified data layer, record-grounded answers, and goal
  tracking; replayable from Settings.
- Light and dark appearance, following the device setting.
- Five kinds of records drive everything: Finances (spending, budgets, transactions), Notes,
  Planner (today and weekly schedule), Learning (courses, streaks, study hours, a focus timer and
  per-session takeaways), and Projects (deadline deliverables, assessments and a penalty ledger).
- Records live in Supabase (Postgres) and belong to the signed-in account. The app requires an
  email/password sign-in once per device, and per-user RLS keeps every row readable only by its
  owner.

## Capabilities and Constraints

- Confirmed surfaces: Dashboard, Ask Zen-I, Notes, Finances, Planner, Projects, Learning, Settings,
  and a first-run onboarding flow.
- Ask Zen-I answers questions across the app's records and returns a written answer plus a
  breakdown, an insight, and suggested follow-ups.
- Data is **live** in Supabase: the app reads and writes the user's own records (notes,
  transactions, budgets, courses, study sessions, planner entries, projects and penalties). Every
  row is owned by the signed-in account through `auth.uid()` defaults and owner-only RLS policies;
  the `anon` role has no table access.
- Ask Zen-I is grounded: answers are computed from the user's records in `src/lib/ask.js` and
  return a written answer, a breakdown, an insight, follow-ups and a Sources line naming which
  records were read. This on-device engine is the default answer path.
- AI is an optional, off-by-default layer on top of the grounded engine. When Zane turns it on, an
  intent router (`src/lib/intent.js`) decides which questions the deterministic engine answers
  locally and which are explanations or advice that go to Gemini. Only the minimum context the
  question needs is sent — one domain's aggregates built on demand in `src/lib/context.js` (finance
  totals, study hours, plan entries) — never note bodies, individual transactions, passwords, keys
  or account numbers. Answers are labelled "Local answer" or "AI · Gemini", and any failure falls
  back to the local answer.
- Gemini runs behind a Supabase Edge Function proxy (`supabase/functions/gemini/`) that requires a
  signed-in session: the API key is
  a server-side secret, restricted to free-tier models, with a server-side daily request cap tracked
  in `public.ai_usage` and bounded input/output. There is no API key in the app and no billing
  account, so usage cannot incur charges. Settings shows the remaining requests for the day.
- A note can be summarized with Gemini only when Zane explicitly taps "Summarize with Gemini" in
  the note viewer; the chatbot never sends note bodies on its own.
- Ask Zen-I can also act: commands like "spent 12.50 on coffee" or "delete the note about milk"
  are parsed (on-device first, Gemini fallback when AI is on) into a single whitelisted action —
  log or change a transaction, budget, plan entry, note, course unit or project. Every write shows
  a confirmation card with the exact change before it runs, and deletes are flagged as irreversible.
  Targets for edits and deletes are matched against rows already in memory, so record titles and
  ids are never sent to Gemini.
- "Plan with AI" is a shared capability, not a Learning-only feature: one sheet with a General or
  Study scope (the scope toggle appears only when a course exists), a horizon of Today / This week /
  Next 7 days, and an optional goal. Study scope falls back to a deterministic local plan when AI is
  off or unavailable; General scope prompts to turn AI on instead. Proposals are always previewed as
  a checkbox list ("Add N of M") before anything is written, and one generation is one AI request.
- Courses carry units (`public.course_units`); completing a unit advances the course's completed
  count without logging a study session.
- Projects are commitments with teeth: each is a one-off deliverable with a brief, success criteria
  and a deadline. A submission is a written write-up plus an optional link, judged by a dedicated
  Gemini task (`assess-submission`) against the brief — or self-assessed when AI is off. Passing
  settles the project; failing, or being marked missed, forfeits credits into a permanent penalty
  ledger and locks new projects until an atonement note is written (which is also saved as a note).
  Credits start at 100 and are derived from the ledger, never invented.
- Learning is connected, not isolated: a focus timer records real sessions (persisted across
  restarts), sessions link to a course and capture a takeaway, today's Study-tagged planner blocks
  are startable from Learning, courses carry a weekly hour target, and saving a takeaway also
  writes a Study-tagged note.
- Built as a cross-platform Expo/React Native app (iOS and Android, plus an incidental web
  build), but Android is the design authority for UI decisions.
- Named "Zen-I Assistant"; app scheme `zeni`.

## Brand Commitments

- Product name: **Zen-I Assistant**. The assistant itself is referred to as **Zen-I**.
- The copy positions Zen-I as a calm, competent assistant that knows the user's own data — a
  tool that watches the numbers and flags what needs attention, not a novelty chatbot.

## Evidence on Hand

- Working UI implementation: screens in `src/screens/`, routing in `app/`, shared UI in
  `src/components/`, theme in `src/theme/`.
- Supabase schema and migration in `supabase/`; data access in `src/lib/db.js` with a single
  store in `src/data/store.jsx`; the persisted focus timer in `src/data/focus.jsx`; all figures
  derived in `src/lib/analytics.js`.
- Grounded Ask engine in `src/lib/ask.js` (pure functions) with recent-ask history in
  `src/lib/askHistory.js`; per-domain context builders in `src/lib/context.js`; Gemini routing and
  the proxy client in `src/lib/intent.js` and `src/lib/gemini.js`; the on/off preference and usage
  reading in `src/data/aiPrefs.jsx`; the plan generator, horizons and deterministic study fallback in
  `src/lib/planWithAi.js`; project deadlines, credits, lock state and the penalty ledger in
  `src/lib/projects.js`; every screen reads live rows.
- Absences future work must not fabricate: no real user testimonials, no customers, no
  benchmarks, and no pricing.

## Product Principles

1. **Grounded over generated.** Every answer points back to the user's own records; never invent
   a number, source, or capability that is not in the data.
2. **One place, not five.** Unification of money, notes, plans and learning is the point — avoid
   features that re-silo the data.
3. **Calm and legible.** The assistant should reduce noise and surface what needs attention, not
   add dashboard clutter or alarm.
4. **Daily habit.** The app earns a place in a daily routine, so speed to a useful answer and
   low friction matter more than feature breadth.
5. **Honest about state.** Label what is live, what is still previewed, and which phases remain
   rather than implying functionality that is not there.
