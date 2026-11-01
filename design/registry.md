# Design registry

The source of truth for which UI is allowed. Agents build only from entries marked **Approved**. Anything new is pitched as **Proposed**, built from existing tokens, and shown to Nephi in Storybook. Only Nephi moves an entry to Approved.

## Statuses

- **Proposed** — pitched, visible in Storybook with the `proposed` tag, not yet allowed in product screens except as part of the same pitch.
- **Approved** — allowed everywhere. Exported from `@sgp/ui`.
- **Deprecated** — do not use in new work; listed with its replacement.

## How an entry moves

1. Agent builds the component or pattern in `packages/ui` with a Storybook story tagged `proposed` and adds a row below.
2. Nephi reviews in Storybook (or inside a prototype screen) and gives notes.
3. When Nephi approves, the story tag changes to `approved`, the component is exported from `packages/ui/src/index.ts`, and the row below is updated with the date.

## Foundations

| Name | Status | Story | Notes | Approved on |
| --- | --- | --- | --- | --- |
| Design tokens (chrome color, default data palette, type, spacing, radius, density, motion) | Deprecated | Foundations/Tokens | Placeholder values, replaced by the approved Studio neutral theme. Status colors are client data, not tokens. | |
| Theme: Studio neutral (dark and light, compact density) | Approved | Foundations/Studio neutral | Next: becomes `design/tokens/tokens.css` (dark and light) | 2026-11-01 |
| Alt themes: Classic, Bold | Approved | Foundations/Alt Themes | Kept as alternative themes, per Nephi | 2026-11-01 |
| Status display: icon and name (long or short), icon only; solid and tinted chips as alternatives | Approved | Foundations/Studio neutral/Status display options | Long and short names always carry the status icon. Renders any client-chosen color legibly | 2026-11-01 |
| Column summaries with Total row at the top; calculated-column marker | Approved | Studio neutral/Table view | Totals always on the first page, directly under the column headers | 2026-11-01 |
| Table, Cards, Thumbnails views and view switcher icons | Approved | Studio neutral/Table, Card, Thumbnail view | Collapse controls on the left. Thumbnails: size slider. Cards: 1-10 columns (default 4); narrow cards stack fields and show status as icon only | 2026-11-01 |
| Search fields: Global search, Search shots (page), Search navigation | Approved | All Studio neutral stories | Search icon in each | 2026-11-01 |
| Column header right-click menu (status display) | Approved | Studio neutral/Interaction: status display from the column menu | Sort, group, and hide are placeholders | 2026-11-01 |
| Left navigation: no Company grouper; docked and undocked | Approved | Studio neutral/Navigation: docked and undocked | Tables filed into folders like pages | 2026-11-01 |
| App frame specimen: top bar, left nav tree, page header, grouped shot grid, card, controls | Approved | Same pitch | Approved as the design; still pitch specimens. Next: rebuilt as real `@sgp/ui` components | 2026-11-01 |

## Components

| Name | Status | Story | Notes | Approved on |
| --- | --- | --- | --- | --- |

## Patterns and screens

| Name | Status | Location | Notes | Approved on |
| --- | --- | --- | --- | --- |
| Prototype index | Scaffolding | `apps/prototype/src/App.tsx` | Developer index only, not a product design | |
