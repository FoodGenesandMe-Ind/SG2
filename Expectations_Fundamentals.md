1. The UI is organized around this fundamental heirarchy, with some 'system' Tables, notes below (Company, Projects, Users, etc) and with client-created [custom tables], and in most cases we will have some system tables the live on the same heirarchical level (e.g. Company>Projects>Shots)

- Company is at the top level example "Disney", etc., e.g. there is one company per URL / client and it is the one table that clients don't/can't customize
- Company>Events
  Company>Projects (e.g. "Toy Story 9", "Monsters, Inc. 11", "Finding Nemo, Jr.")
- Company>Assets
- Company>Users
- Company>Templates
- Company>Permissions (we start with some template permissions but these can be customized by clients, and/or they can create their own permissions)
- Company>[Custom Tables] (e.g. "Issues", "Documentation", etc.)
- Company>Projects>Shots, Assets, Departments, Steps, Phases, Versions
- Company>Projects>[Custom Tables] (e.g. "Experimental Table", or "Quarks", or "Marketing Campaign", or "Reels")

2. The Projects level is where clients can create projects, each with distinct pipeline _types_, e.g. film, animation, manga, design, video games, etc. We have several pipleline-type templates that they can use to start with, or they can create their own, new, pipeline types. Important note: some templates will use a common table, like Shots, in different ways per project, for example in project "Nemo" the Shots table utilized a system drop-down selection field called 'Status' (even though it is a system field, it can be customized) with valid values of "Not Ready", "Ready to Start", "In Story", "In Layout", "In Animation", "In Comp/Light", and "Final"; while in project "Pirates" they only want "Ready to Start", "In Progress", and "Final Render Complete". In each, the statuses represent progress in each respective pipeline.

3. Related to above, there is a robust ability for the app to hide and show database fields and their nuances based on the project, template, and permissions. So we need a robust platform that tracks a lot of 'meta' data about the tables/fields/data.

4. The primary Navigation uses a Left Navigation tree structure based on heirarchy described here. Fundamental to this is the client's ability to create as many new Navigation destinations, or 'Saved Pages' as they like, and so the Nav needs a little intelligence: e.g. I create a new Saved Page where I specify I want to see all Shots across all projects, grouped by project -- upon creation, this should show up at the Company (above Project) level since it contains information about multiple, or all, projects. Later on, I can go into the Page Settings and adjust my query/filter settings, and If I narrow it to one project, that Page moves inside the Project

5. Continuation of 4 above: Clients can create 'folders' in the Nav that help them organize all the Pages that get built up -- a folder can only accept Pages in the same heirarchy: no breaking rules and putting one Project page inside a folder of a different project!

6. We embrace that clients want customizable colors and status names and icons, conditional colors (turn the bg of the shot row red if the due date is in the past), calculated columns, (the animation due date is the shot due date minus 4 weeks; or the 'total budget' field = the sum of three other fields; or the 'total bid' field = (the sum of all sub-bids) \* markup). We also have columns that can be configured to show summary data like 'sum', and 'avg' on numberic fields.

7. We embrace that pipleines are deeply integrated with other business logic and so our API is extremely robust, and key to that is our Event table, that tracks _every single thing_ that happens in the pipeline, knowing that clients rely on that to trigger other processes.

8. We embrace that production management (accountants, producers, 3rd party funders, studio executives, etc.) is going to need robust tools of their own to produce budgets, bids, progress reports, etc. We need to be really really sophisticated in how we allow the pipelines to be artist-centric, but at the same time give production management the numbers, stats, and scheduling/reporting/budgeting tools that they need.

9. We have some basic staples in our UI that the app uses:

- a 'table' Page view, which is data dense and pretty much a table view, and limited to one table
- a 'card' page view that can be flipped to from any table view, and it will display the data inside a collapsible widget, with more UI customizations available like which fields show in the title when collapsed, and what shows up with uncollapsed
- a 'dashboard' page that is configured to have x number of rows and columns and inside each users can select from the widget library which types of widgets to configure and display (e.g. pie charts, heat maps, histograms, bar charts, etc.)

10. We have all the usual field types, common in postgres, _and_ some specialized field types: query fields, calculated fields, Status fields (that have a long display: "In Progress", an abbreviated display: "IP", and an icon that can be customized) and we have the concept of a "pipeline" fields which is the stages/phases/steps/Departments that Shots or Assets (or other) go through. It is an open question what the data model is for theses pipelines/phases/steps/departments. Are they just fields in a Table that represent the workflow? Or are they tables of their own? Is it just an enum list that gets represented through query-fields? I am inclined to put a line in the sand by saying they are a specialized field type: of type 'Step', and when configured certain parameters are defined (order, how 'done' is defined) But I want an elegant way to define and configure them.

11. Specialized "Notes" tables.  We have a system table called Notes, that is just what is sounds like:  an email-like note (that users can subscribe to and get them also sent to their email).  All users have an inbox with notes

12. Notifications:  users have a robust notification where they can manage notification subscriptions to certain key things.  At the most basic level, a note addressed to a person always shows up in their inbox, where it is just like an email, it is read or unread, we have basic meta data:  who is is from, when it was timestamped, and if it was regarding something in production (e.g. a director note on an asset) we see a link to that thing.  Notes also have their own set of statuses and when I get a note it is by default open and does not get closed until I close it manually.  Notes are threaded just like emails and go back and forth.  my inbox supports a gmail-like ability, so it is familiar (e.g. I can create smart folders to store different types of notes, e.g. by status, or by label, or by type )

13. 