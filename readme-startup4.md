# Startup 4: LocalBrief — Creator campaign briefs for neighborhood cafés

**Inspired by:** [TryNearby](https://www.ycombinator.com/companies/trynearby), which describes connecting local businesses with nearby creators and using agents for matching and visit coordination. LocalBrief narrows the opportunity to turning an owner's promotion into a feasible, accurate creator campaign brief. Source reviewed October 15, 2026.

**Proposed product:** A café owner supplies an offer, available filming slots, and a budget. The system produces validated creator-specific briefs and a proposed visit schedule using a small roster of opted-in local creators. This is an independent proposal; customer relationships and technical competence must be verified.

## 1. Solves one problem extremely well

Eliminate the repeated work of explaining a café promotion to local creators. The MVP produces a filming brief, required factual details, deliverables, and available visit slots for one neighborhood. It excludes automated social posting, creator payments, video generation, and a national creator marketplace. Measure owner minutes spent preparing and clarifying each accepted brief.

## 2. You know the target customers or have direct access to them

Target independent café owners and small food creators in one walkable commercial district. Owners are accessible through in-person visits, and creators can opt in through a local creative group; these are recruitment routes, not proof of existing access. Before building, get three owners and five creators to participate in one manually coordinated campaign. This criterion becomes satisfied when both sides share real constraints and commit to testing the briefs. Do not assume access to TryNearby's network.

## 3. You are familiar with, or can quickly learn, most required infrastructure

Use a web dashboard, Python API, PostgreSQL, a hosted LLM, background jobs, and a transactional email provider. Creators maintain their own availability in the app, avoiding social-platform scraping and calendar integrations. Store owner-approved facts as structured fields. The largest learning tasks are scheduling constraints, versioned approvals, and permission-controlled delivery, all feasible with ordinary web development experience and a small prototype.

## 4. Reimagines the problem space to make it significantly better

Make the campaign brief a reusable executable specification. The café enters its actual offer once; each creator gets a tailored shot plan consistent with that offer, their declared format, and the café's filming constraints. If an owner changes a price or filming window, the system invalidates affected briefs and generates validated replacements. Test fewer clarification messages and fewer incorrect promotion details against ordinary email coordination.

## 5. An LLM/Generative model is core to the solution

The LLM transforms an owner's informal campaign goal and a creator's sample style into a concrete shot sequence, caption draft, and deliverable checklist. It can adapt the same verified facts to different creator formats. Deterministic scheduling handles availability; generation handles the creative translation that makes the brief useful.

## 6. Validation Guardrail: No LLM-generated artifact reaches the user without passing through a validator

Treat briefs, suggested matches, captions, scheduling explanations, and notifications as gated artifacts. Deterministic validators check every price, address, date, offer condition, creator ID, deliverable, budget total, and slot against versioned owner/creator records. A separate semantic check flags unsupported promotional claims and conflicts with stated filming preferences. For the MVP, an internal human reviewer validates creative suitability and factual completeness before any generated artifact is visible to an owner or creator.

Build required sponsorship wording into a human-reviewed template and verify its presence in each caption; validation does not establish compliance for all platforms or jurisdictions. The system never invents personal endorsements or promises a positive review. The UI and sender read only approved artifact versions. Owner approval to commission a campaign happens after this internal validation; it is distinct from the validator gate. Editing a source fact or candidate artifact invalidates approval.

## 7. Self-Correction Loop: Validation errors automatically feed back into the LLM

Return structured errors such as `STALE_OFFER_VERSION`, `UNAVAILABLE_SLOT`, `UNSUPPORTED_CLAIM`, or `MISSING_DISCLOSURE` to the generator with the authoritative fields. Automatically regenerate, rerun all checks, and obtain internal reviewer validation where required. Allow three total attempts. On exhaustion, withhold the brief and show a fixed request to update the relevant source fields. Human review rejection triggers the same automated retry process. Revalidate availability immediately before committing a reservation to prevent double booking.

## 8. Deployability: If built, you are able to fully deploy it

Deploy a responsive web app, containerized API/worker, managed PostgreSQL, and a review console. Add HTTPS, separate owner/creator roles, scoped campaign access, email opt-in, secret management, audit logs, database backups, and a sending kill switch. Use transactional reservations with expiring holds. The MVP delivers validated briefs through the app and opted-in email; creators publish their own videos.

Acceptance requires a complete owner-to-creator campaign, a blocked incorrect price, automatic correction, and simultaneous booking attempts that cannot reserve the same slot. A solo web developer can deploy all software components without privileged social APIs. Hosting/model accounts, opted-in participants, and an internal reviewer remain required launch dependencies.

## Smallest paid pilot

Run six campaigns across three cafés and five creators. Test a proposed $39 monthly software fee per café; creator compensation is separate and owner-approved. Continue if brief preparation time falls by half, creators accept most briefs without factual corrections, and two owners pay for a second month. Review labor must fit the software margin.
