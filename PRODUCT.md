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
- Four kinds of records drive everything: Finances (spending, budgets, transactions), Notes,
  Planner (today and weekly schedule), and Learning (courses, streaks, study hours).
- Records live in Supabase (Postgres). The UI shell was built first, reviewed, then wired to real
  data; sign-in is the remaining phase before the app is single-user-secure.

## Capabilities and Constraints

- Confirmed surfaces: Dashboard, Ask Zen-I, Notes, Finances, Planner, Learning, Settings, and a
  first-run onboarding flow.
- Ask Zen-I answers questions across the app's records and returns a written answer plus a
  breakdown, an insight, and suggested follow-ups.
- Data is **live** in Supabase: the app reads and writes the user's own records (notes,
  transactions, budgets, courses, study sessions, planner entries). Dev access uses temporary
  permissive RLS policies on the `anon` role; auth (Phase 3) replaces them before shipping.
- Ask Zen-I is not yet grounded — its answers are still generated locally in
  `src/data/mock.js`. The grounded engine (Phase 5) is the next backend-facing step.
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
  store in `src/data/store.jsx`; all figures derived in `src/lib/analytics.js`.
- Canned Ask answers still live in `src/data/mock.js`; every other screen reads live rows.
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
