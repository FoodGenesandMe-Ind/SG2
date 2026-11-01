---
name: Product vision master plan
overview: "Write a living master_plan.md that defines an indie-first production platform: Shotgun/Flow’s customizable tracking, review, and asset model, plus AI collaboration from script to screen."
todos:
  - id: write-master-plan
    content: Write master_plan.md with vision, pipeline, Shotgun/Flow core, review, sandbox, data truth, permissions, AI assistant, and phased roadmap
    status: pending
isProject: false
---

# Product vision master plan

This is a document at the repo root. The repo is an empty git project, so this file is the first artifact. It is a product vision, not an implementation spec. Later notes can extend clearly marked open sections.

Working title in the doc: **SGPipeline**. Easy to rename. The name is only a handle so the rest of the document can speak about one product.

Foundational requirements for the Company > Project hierarchy, per-project configuration, navigation, events, production management, and page types live in [Expectations_Fundamentals.md](Expectations_Fundamentals.md). Where this vision and the fundamentals overlap, the fundamentals are the more specific source.

The app lives in the cloud but we also want to allow big studios or secret project (like car companies) to license the tech stack and install it locally, behind a firewall.

The app needs to be very affordable, free to start, and then a very thin-profit margin plan that charges by use (storage, agent use, cloud compute, admin) with a modest markup.. and anothger revenue stream will be letting artists, doing work for hire, get paid for work through the app, we collect a very small fraction of a percent on the processing. The goal: adoption, we want adoption, adoption, adoption, the price can not be a barrier. _For bigger studios we also make money on SLA's_

Inside secret: Nephi was one of the founders of Shotgun, which was bought by Autodesk and re-named 'Flow'. He has contacts in the industry and a stable of future employees who are dying to get back to the 'good old days' when Shotgun was known for being an amazing creative pipeline tool with the best service you could ask for... which is NOT the case now, because Autodesk got rid of the specialized support team, and now clients complain about the poor service.

## What the document will argue

An independent artist, or a small crew, should be able to go from script to finished frames without a studio pipeline department. SGPipeline keeps the production spine that Autodesk Shotgun / Flow Production Tracking proved works, and adds AI where independents usually have no specialist: story development, world-building, visualization, technical glue between tools, and “load what this shot actually needs.”

Artistic authority stays human. AI drafts, suggests, and assembles. Directors and leads approve. An artist cannot approve their own work.

## Document outline

1. **Vision and promise** — script to screen, economical, one person or a small crew, studio-grade tracking without studio overhead.
2. **Who it is for** — writer-director, artist, producer, artistic lead, accounting/scheduling, studio executives, third-party funders, admin. Multi-user from the start, usable alone.
3. **Principles** — platform first: every tool is built on the same tables, configuration, pages, permissions, and events; script as upstream truth; sandbox until the artist submits; published iterations only enter review; latest-file truth per shot; open tools first (Blender and other OSS); render spend only after a shot is approved final; AI assists, people approve.
4. **Pipelines** — customizable. Users can add their own steps (create a customized table), add their own fields, etc. Each project picks a pipeline type (film, animation, manga, design, video games, and others), and the same system tables behave differently per project: for example, Shot status values in one project can be Not Ready through Final, while another uses only Ready to Start, In Progress, and Final Render Complete. Templates work like git: a template is itself a project, and a new project starts from a standard template or from an existing project and becomes a branch that evolves freely. Template changes are never applied automatically; they queue up, and a project accepts only the individual changes it wants. Most of the learning flows the other way: the template adopts the project changes it wants to keep. We have starter templates for: 2d, 3d, Vfx, Video Games, VR, Stop Motion, Live Action, Manga, Design...each classical step as purpose, inputs, outputs, who reviews, and where AI helps (3d pipeline used for example below):
   - Script
   - Shots / Versions
   - Scenes
   - Sequences
   - Art / design
   - Storyboards
   - Previs (two tracks: low-tech sketches + dialogue, and 3D layout)
   - Modeling and rigging
   - Set, prop, and world design
   - Paint / backdrop / matte
   - Layout and cameras
   - Animation
   - VFX, simulation, crowds
   - UV / texturing
   - Lighting and compositing
   - Final rendering
5. **Shotgun/Flow core, as example of features** — projects, sequences, shots, assets, tasks, pipeline steps, versions, notes, playlists, publishes, dependencies, assignments, playback and markup tools, bids and progress, activity, events, saved pages, dashboards, people, and permissions. Enough detail to show parity, without copying Autodesk UI.
6. **The artist’s path (narrative)** — the flow of each pipeline varies, but there are common tools that AI can assist with, for example:
   - Collaborate with AI on the script until the story holds.
   - Build the world bible: characters, sets, props, rules, tone.
   - Visualize in 2D and 3D.
   - Hand design into Blender (and similar, e.g. Maya, Houdini) for models, rigs, sets, props, mattes, simulations, vfx, etc.
   - Assemble scenes, layout shots, and cameras inside Blender, with SGPipeline knowing which publishes belong in the shot.
   - Optional low-tech previs in parallel: sketches plus dialogue for tone and flavor before 3D exists.
   - Voice overs ("scratch" and final)
   - Animate on the approved rigs.
   - After shot approval, lighting, comp, textures, VFX, and crowds finish their tasks.
   - Approved-final shots dispatch frames to render (simplified)
   - General help: the in-app AI is an expert on how to get things done. Need help with how to use the app? Ask your in-app agent.
7. **Review** — a playback tool for directors and artistic leads. Stop on a frame, draw markup, attach a note, send it to the artist who owns the task. Compare versions. Approval is a permission, not a status anyone can set.
8. **Sandbox and pipeline** — private working files until the artist chooses to submit an iteration. Submission creates a version in the structured pipeline and makes it visible to reviewers. Producers see submitted progress, not private scraps.
9. **Data truth** — for every shot, a manifest of required publishes (model, rig, prop, matte, animation, texture, vfx, lighting, comp). Track latest approved, latest submitted, and in-progress. “Open shot” loads the latest approved publishes into Blender (or the relevant tool) without a scavenger hunt.
10. **People and permissions** — logins for admins, producers, managers, directors, department leads, artists, accounting, executives, funders, and optional external reviewers. Permission sets start from templates and clients can customize them or create their own. A short permission matrix: who creates projects, who assigns tasks, who sees a sandbox, who can review, who can approve, who can send a shot to render, who sees financial fields. Explicit rule: no self-approval, and clients cannot switch it off.
11. **AI technical assistant** — on call across the app and inside DCC integrations. It fills gaps: naming, publishes, missing dependencies, “why won’t this shot build,” version questions. It does not approve work or overwrite an artist’s files without an explicit action.
12. **Production management and director views** — budgets, bids, schedules, and progress reports for producers, accountants, executives, and funders, built as dashboard and table pages on the same data artists use; progress by sequence, shot, and step; what is in sandbox vs submitted vs approved vs rendering; directors browse completed assets and cut playback, producers see effort and status.
13. **Phases** — so “more to come” has a place to land:
    - Now: this vision, the fundamentals, and the UI design phase.
    - First build: the platform core (Company > Project hierarchy, tables and fields, per-project configuration, events, permissions, table / card / dashboard pages, navigation), because every tool sits on it. Nephi then builds the first pipeline templates on it.
    - Then: script collaboration, the first specialized tool, because the story is the critical path of every production.
    - Then: world bible and 2D/3D visualization.
    - Then: artist pipeline (tasks, sandbox vs submit, publishes, versions).
    - Then: review player and frame markup.
    - Then: Blender (and other 3rd party apps) bridge, shot manifest, and layout/animation.
    - Then: production management depth (bids, budgets, schedules, reports), downstream departments, render dispatch.
14. **Open** — an explicit section for the notes still coming, so the file stays the single master plan.

A customizable database platform than facilitates creating customizable pipelines. We use the same platform to create the pre-set templates, we favor platfrom over hard-coded logic. At the core, even the most complex pipelines can be easily understood by a database in normal forms.

(mermaid tbd) after creating the platform basics, Nephi will actually start using the platform to create the first 'pipeline' templates.

## Architecture

[architecture.md](architecture.md) is where we brainstorm with Agents over which tech is best suited for this app, and where decisions are logged.

## UI

All UI will come from a library of approved designs, never create anything on your own, always look to the library for the standards. If a design does not exist, use the existing design standards to pitch the new component to Nephi.

## Misc

No application code yet, schema, or UI here. Pricing TBD. No claim that SGPipeline clones Autodesk products; the doc describes the jobs those tools do and how SGPipeline should do them for independents.
