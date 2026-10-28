# Zeni (Expo / React Native)

Mobile-first Expo app (SDK 57, Expo Router). Source is JS/JSX, not TypeScript. Runs on Windows.

## Project map (look here first, do not search for these)
- Routes: `app/` (every file is a screen). Do not use `src/app/`.
- Money screen: `src/screens/Finances.jsx`. Ask Zen-I screen: `src/screens/AskAI.jsx`. Other screens: `src/screens/`.
- Data and actions: `src/data/store.jsx`, `src/lib/accounts.js`, `src/lib/db.js`, `src/lib/validation.js`, `src/lib/format.js`, `src/data/constants.js`.
- Forms: `src/components/forms/` (TxForm, AdjustAccountSheet, TransferForm). UI parts: `src/components/ui/` (Field, Sheet, TagPicker). Layout: `src/components/layout/Screen.jsx`.
- Icons: `src/icons.js`. Only use icons already exported there. Never search `node_modules` for icons. If one is missing, add a single import line following the existing pattern.
- Backend: `supabase/`.
- Import `Link`, `router`, `useLocalSearchParams` from `expo-router`.

## Save requests (important)
- Every step costs one request from a small daily limit. Use as few steps as possible.
- Work only on the files named in the request or in the project map above. Do not explore the repo.
- Call `read`, `grep`, `glob` and `edit` directly. Do not use the `execute` tool.
- Run independent tool calls together in the same step.
- Plan all changes to a file first, then apply them in as few edit calls as possible. Replace a whole contiguous block in one edit instead of making many small edits one after another.
- If you need most of a file, read it once in full. Do not read it in several chunks.
- Do not re-read a file after editing it. A successful edit is already confirmed.
- Large files (`src/lib/actions.js`, `src/lib/ask.js`, `AskAI.jsx`, `Finances.jsx`): read only the relevant section.
- Make the smallest change that does the task. Do not refactor or reformat unrelated code.
- When you remove or rename a variable, ref or function, grep once for leftover uses before finishing. A leftover reference crashes the app at runtime.
- If a command or edit fails once, fix it once. If it fails again, stop and tell me what went wrong.
- Do not run lint, typecheck, or builds unless I ask.
- Do not fetch docs or search the web unless an API call fails or you are unsure of a specific function.
- Bugs that only appear in a production build (they work in Expo Go): you cannot test these. Make one well-reasoned change, tell me exactly what to test, and stop. Do not keep trying variations.

## Shell: Windows PowerShell (not bash)
- Never use `head`, `tail`, `grep`, `cat`, `sed`, `awk`, or `2>&1 | ...`. They do not exist here.
- Use `Select-Object -First N`, `Get-Content -Tail N`, `Select-String`, `Get-ChildItem` instead.
- Do not nest `node -e "..."` inside `powershell -Command "..."`. Write a small `.js` file and run it with `node`.
- Python, pip, rsvg-convert, ImageMagick and similar tools are NOT installed. Do not check for them. If a task needs one, tell me instead of searching.
- Use Windows paths (`C:\dev\zeni-mobile\...`).

## Commands (only when needed)
- Add packages with `npx expo install <package>` (never `npm install`).
- `npx expo start` to run.

## Constraints
- Never create or edit `ios/` or `android/`. Configure native behavior in `app.json` and config plugins.
- Prefer Expo modules over third-party libraries.

## Context files (read only when the task needs them)
- `DESIGN.md`: UI and visual design tasks only.
- `PRODUCT.md`: product-decision tasks only.