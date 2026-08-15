# Timed Habits + Food Log Edit — Notes

**Date:** 2026-08-15

## Food log editing
See `2026-08-15-food-log-editing-design.md` (implemented).

## Timed habits (recommended defaults, shipped with this build)

- Habit fields: `timed` (bool), `defaultMinutes` (number|null).
- Create on Habits page: “Timed habit” checkbox + default minutes.
- Countdown timer (not stopwatch): set minutes before Start; Pause / Resume / Cancel.
- Timer state in `state.habitTimers`; persists across refresh.
- On countdown complete → habit auto-checked for that day; timer cleared.
- Manual checkbox still works; checking done clears any active timer.
- Surfaces: Home habit list + Habits page.
