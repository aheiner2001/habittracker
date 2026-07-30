# Quiet Visual Polish — Design

CSS-only refinement of Become. Same palette and fonts (Fraunces + Source Sans 3, green/earth tokens). No JS behavior changes. No new features.

## Approach

**Quiet refinement:** Soften surfaces and add restrained transitions so the app feels calmer and less “card stack,” without a restyle.

## Changes

### Today — identity rows

- Lighter shadow and thinner border on `.identity-row`.
- Slightly less padding so rows read more as a list than a dashboard of cards.
- Started state keeps the green wash; Start button transitions background/border/color ~160–200ms.

### Header

- Slightly more space under the **Become** brand.
- Tagline stays secondary (muted).
- Nav pill structure unchanged; active tab transition softens (~160–200ms).

### Progress

- Tighter vertical gap between streaks and calendar sections.
- Selected day ring retained; selection transition is quiet (box-shadow / border), not flashy.
- Day-detail panel uses the same softer surface treatment as Today rows.

### Motion (exactly three, restrained)

1. Start button state change  
2. Nav active state  
3. Day cell selected state  

No row stagger, celebration flash, or layout animation. Respect `prefers-reduced-motion: reduce` by disabling transitions.

## Files

- Modify: `styles.css` only  
- No changes to `app.js` or `index.html` unless a class hook is strictly required (prefer none).

## Out of scope

- Color or font changes  
- Dark mode  
- New components or features  
- HTML structure churn  
- Stronger motion / Approach 2

## Testing

- Open Today and Progress in a browser; confirm layout still works on mobile width (~375px).
- Toggle Start; confirm smooth state change and persistence still works (unchanged JS).
- Switch Today / Progress nav; confirm active state still clear.
- Tap calendar days; confirm selection ring and day detail still correct.
- With OS “reduce motion” on, transitions should not run.
