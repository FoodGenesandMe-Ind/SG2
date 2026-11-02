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
| Shot detail page (Flow-style header, pipeline strip, tabs: Activity, Shot info, Tasks, Versions, Notes, Publishes, Assets) | Proposed | Studio neutral/Shot detail page | Tabs are pages with full view options; no History tab; + Note on the Notes tab opens the note form | |
| Threaded detail standard (Notes, Issues): one collapsible thread, inline events, order toggle, side pane, public reply or internal note | Proposed | Studio neutral/Note detail page, Issue detail page | Replaces the tabbed note page | |
| Task dependencies (lines without labels; violations in red with "!") and sub-tasks with their own assignees and to-dos | Proposed | Studio neutral/Tasks: dependencies, Tasks: sub-tasks | Dates never move automatically | |
| Gantt bar labels via right-click (left and right of bars; none by default) | Proposed | Studio neutral/Shots page: gantt view | | |
| Record-type icons and selection in every view (Table, Gantt, Cards, Thumbnails) | Proposed | Studio neutral/Table view, Card view, Thumbnail view, Shots page: gantt view | Cards and thumbnails: icon left of the linked name; header box in the bar above | |
| Record info tab with every field (system fields, code and type, hidden-field toggle) | Proposed | Studio neutral/Shot detail page, Shot info tab | | |
| Reporting charts: pie, donut, vertical bar, horizontal bar, stacked bar, line, area, heat map, line + column combo | Proposed | Studio neutral/Dashboard: reporting charts | ECharts, themed from tokens | |
| Page inside a tab (shared RecordPage: count, search, views, controls, + button) | Proposed | Every detail-page tab | Also supplies Cards and Thumbnails for the Tasks page | |
| Gantt view with time scale slider (Days to Years) | Proposed | Studio neutral/Tasks page: gantt view, Shots page: gantt view | Always a gantt of tasks; offered on Tasks, Shots, Assets pages | |
| Tasks page (department, step, task, sub-task grouping; to-do summary; table with totals at top) | Proposed | Studio neutral/Tasks page: gantt view | All four views | |
| App frame specimen: top bar, left nav tree, page header, grouped shot grid, card, controls | Approved | Same pitch | Approved as the design; still pitch specimens. Next: rebuilt as real `@sgp/ui` components | 2026-11-01 |

## Components

| Name | Status | Story | Notes | Approved on |
| --- | --- | --- | --- | --- |

## Patterns and screens

| Name | Status | Location | Notes | Approved on |
| --- | --- | --- | --- | --- |
| Prototype index | Scaffolding | `apps/prototype/src/App.tsx` | Developer index only, not a product design | |
