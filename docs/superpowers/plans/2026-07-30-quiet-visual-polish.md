# Quiet Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a CSS-only quiet polish so Become feels calmer and less card-stacked, with three restrained transitions.

**Architecture:** Single stylesheet update to existing selectors in `styles.css`. No `app.js` or `index.html` changes. Keep all color and font CSS variables as they are.

**Tech Stack:** CSS only (existing Fraunces / Source Sans 3, green/earth tokens).

## Global Constraints

- CSS-only; do not change `app.js` or `index.html`.
- Same palette and fonts — do not edit `--bg0`, `--ink`, `--accent`, `--font-display`, `--font-body`, etc. values for a restyle.
- Exactly three intentional motion targets: Start button, nav active, day cell selected.
- Honor `prefers-reduced-motion: reduce` by disabling transitions.
- Spec: `docs/superpowers/specs/2026-07-30-quiet-visual-polish-design.md`.

## File map

| File | Role |
|------|------|
| `styles.css` | Only file modified |
| `app.js` / `index.html` | Untouched |

---

### Task 1: Soften surfaces and header spacing

**Files:**
- Modify: `styles.css` (`:root` shadow token, `.site-header`, `.identity-list`, `.identity-row`, `.progress-section`, `.day-detail`)

**Interfaces:**
- Consumes: existing class names rendered by `app.js`
- Produces: softer visual weight; no new classes required

- [ ] **Step 1: Soften the shadow token and header spacing**

In `styles.css` `:root`, change:

```css
--shadow: 0 10px 30px rgba(28, 42, 34, 0.06);
```

to:

```css
--shadow: 0 4px 16px rgba(28, 42, 34, 0.04);
--shadow-quiet: 0 1px 0 rgba(28, 42, 34, 0.04);
```

Update `.site-header`:

```css
.site-header {
  margin-bottom: 2rem;
}
```

Update `.brand` letter-spacing stays; ensure tagline margin remains secondary (no color change).

- [ ] **Step 2: Soften identity rows toward a list**

Replace `.identity-list` / `.identity-row` rules with:

```css
.identity-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.identity-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.85rem 1rem;
  background: var(--surface);
  border: 1px solid rgba(28, 42, 34, 0.08);
  border-radius: 12px;
  box-shadow: var(--shadow-quiet);
  transition: background 180ms ease, border-color 180ms ease;
}
```

(Remove `transform` from the row transition — rows are not a motion target.)

- [ ] **Step 3: Soften Progress section spacing and day-detail surface**

```css
.progress-section {
  margin-bottom: 1.35rem;
}

.day-detail {
  padding: 1rem 1.05rem;
  background: var(--surface);
  border: 1px solid rgba(28, 42, 34, 0.08);
  border-radius: 12px;
  box-shadow: var(--shadow-quiet);
}
```

Keep remaining `.day-detail-*` rules as-is.

- [ ] **Step 4: Manual visual check**

Open `index.html` in a browser. Expected: Today rows look less elevated/stacked; Progress sections sit closer; colors/fonts unchanged.

- [ ] **Step 5: Commit**

```bash
git add styles.css
git commit -m "Soften Become surfaces and spacing for quiet polish"
```

---

### Task 2: Three restrained transitions + reduced motion

**Files:**
- Modify: `styles.css` (`.nav-btn`, `.start-btn`, `.day-cell`, add `@media (prefers-reduced-motion: reduce)`)

**Interfaces:**
- Consumes: existing `.is-active`, `.is-started`, `.is-selected` classes from `app.js`
- Produces: transitions on those three controls only

- [ ] **Step 1: Soften nav and Start button transitions**

Ensure `.nav-btn` includes:

```css
.nav-btn {
  border: 0;
  background: transparent;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  color: var(--muted);
  font-weight: 600;
  transition: background 180ms ease, color 180ms ease;
}
```

Ensure `.start-btn` transition is:

```css
transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
```

(Already present — confirm 180ms and leave hover/focus rules unchanged.)

- [ ] **Step 2: Quiet day-cell selection transition**

Update `.day-cell` to include transition, and keep selection ring:

```css
.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.2rem;
  transition: box-shadow 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease;
}

.day-cell.is-selected {
  box-shadow: 0 0 0 2px var(--ink);
}
```

- [ ] **Step 3: Add reduced-motion override at end of `styles.css`**

```css
@media (prefers-reduced-motion: reduce) {
  .nav-btn,
  .start-btn,
  .identity-row,
  .day-cell {
    transition: none;
  }
}
```

- [ ] **Step 4: Manual verification checklist**

- Toggle Start on Today — background/border ease; persistence still works.
- Switch Today / Progress — active pill eases.
- Tap calendar days — selection ring eases; day detail still correct.
- Mobile ~375px width — layout intact.
- With OS reduce-motion on — no transitions.

- [ ] **Step 5: Commit**

```bash
git add styles.css
git commit -m "Add quiet transitions and reduced-motion support"
```
