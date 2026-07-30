# Calendar & Progress Improvements — Design

Enhancement pass for Become’s Progress view. Scope is local-only polish on top of the existing identity habit tracker.

## Recommendation (approved)

Improve **calendar insight** and **glanceability**. Skip streak badges, export, and Today redesign for this pass.

## Changes

### 1. Day detail (primary)

- Calendar days are buttons (not inert divs).
- Tapping a day selects it and shows a **day detail** panel under the calendar.
- Panel lists all six identities with Started / Not started for that date.
- Default selection: today (when viewing the current month); otherwise clear or first day with data in that month.
- Past days remain read-only (no editing history from the calendar).
- Future days in the current month are selectable but show empty “not started” (no writes).

### 2. Clearer heatmap (secondary)

- When filter is **All identities**, day cells show a **6-dot strip** (one per identity) so partial days are readable at a glance—not just one mid-green fill.
- Fill intensity still scales with how many were started (empty → partial levels → full).
- Single-identity filter keeps solid hit / empty cells.
- Small legend under the calendar: empty / some / all.

### 3. Light month summary

- Under the legend: “X of Y days with at least one start” and “Z full days” for the visible month.

## Out of scope

- Editing past days from the calendar
- Motivational copy / best-streak badges
- Export / backup
- Today view redesign

## Testing

- Tap today and a past day; detail list matches stored completions.
- Filter All shows dots; filter one identity shows solid hits.
- Month nav clears or updates selection sanely (selection stays if that day exists in new month; else today if current month, else none).
- Reload preserves completions; selection can reset to today (UI state only—not persisted).
