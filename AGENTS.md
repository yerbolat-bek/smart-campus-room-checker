## Project
Smart Campus room availability checker; one room, fictional data.

## Structure
- src/booking.js: booking rule `canBook` (returns boolean)
- src/lib/availability.ts: time helpers and constants
- src/App.tsx, src/components/ResultPanel.tsx, src/components/TimeInput.tsx: UI
- src/booking.test.js: tests T01–T21
- docs/TEST_PLAN.md: hand-written test list

## Constraints
Preserve AC1–AC6; no backend, login or booking creation.
Keep canBook and checkBooking inputs and outputs unchanged. No new dependencies.
Practice 11 exception: one optional "Explain availability" feature is allowed.
It must use a mock adapter by default, validate input and output, and fall back
to a deterministic text. The LLM never decides availability.
Stack: Vite, React, Tailwind, lucide-react only. Import with the `@/` alias for src/.

## Engineering rules
Prefer pure functions and minimal changes; use at most 2 justified patterns.
Do not mutate booking fixtures; keep responsive UI feedback.
Do not weaken or delete existing test assertions.

## Commands
- npm run test (vitest run)
- npm run typecheck
- npm run lint
- npm run build

## Verification
Run existing tests and add focused regression tests.
Report changed files, rationale and test evidence.