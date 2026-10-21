# Startup 4: LocalBrief — Creator campaign briefs for neighborhood cafés

**Inspired by:** [TryNearby](https://www.ycombinator.com/companies/trynearby). We're interested in how local businesses coordinate with nearby creators. Our idea focuses on the work of preparing an accurate brief and finding a filming time that works for both sides.

**Our idea:** A café owner enters an offer, filming availability, and budget. We'd use that information to create reviewed briefs and proposed visit schedules for a small group of local creators who have opted in. LocalBrief would be an independent project; we don't have access to TryNearby's network.

## 1. Solves one problem extremely well.

Café owners repeat the same promotion details to several creators and spend time correcting misunderstandings. We want to reduce that work.

We'll start in one neighborhood and produce filming briefs, factual details, deliverables, and available visit slots. Social posting, payments, video generation, and a national marketplace are outside the first version. We'll measure the time owners spend preparing and clarifying each accepted brief.

## 2. You know the target customers or have direct access to them.

Our first users would be independent café owners and small food creators in one walkable commercial district. We plan to approach owners in person and recruit creators through a local creative group. We still need to confirm participation.

Before building the app, we'll try coordinating one campaign manually with three owners and five creators. That should show us their actual scheduling constraints and what information belongs in a useful brief.

## 3. You are familiar with (or can quickly learn) most of the required infrastructure.

We'd use a web dashboard, Python API, PostgreSQL, hosted LLM, background jobs, and transactional email. Creators would enter their availability directly, and owners would approve the facts we store about each offer.

The main technical work is scheduling, versioned approvals, and controlling who can see and receive a brief. Our three developers can split the owner/creator interface, backend and scheduling, and generation and validation. We'll test those pieces together with a small campaign before expanding.

## 4. Reimagines the problem space to make it significantly better.

An owner should enter an offer once and get a suitable brief for each creator. The shot plan would reflect the creator's declared format while preserving the café's prices, offer terms, and filming constraints.

If an owner changes a price or filming window, we'll invalidate affected briefs and generate checked replacements. We'll compare clarification messages and incorrect promotion details with ordinary email coordination.

## 5. An LLM/Generative model is core to the solution (no generic "chatbot in a sidebar").

The model would turn an informal campaign goal and a creator's sample style into a shot sequence, caption draft, and deliverable checklist. It would adapt the presentation of approved facts for different creators. Scheduling and budget calculations would use ordinary application rules.

## 6. Validation Guardrail: No LLM-generated artifact reaches the user without passing through a validator.

Briefs, suggested matches, captions, scheduling explanations, and notifications must pass validation before anyone receives them. We'll check every price, address, date, offer condition, creator ID, deliverable, budget total, and filming slot against the current owner and creator records.

A separate semantic check will flag unsupported promotional claims and conflicts with filming preferences. For the first version, an internal reviewer will also check creative suitability and factual completeness before owners or creators see generated material.

We'll use a human-reviewed sponsorship template and check that each caption includes it. We'll still need to check the requirements of the intended platform and location. We won't invent personal endorsements or promise positive reviews.

Only approved versions can appear in the app or be emailed. An owner can commission a campaign after internal validation. Changing a source fact or draft will invalidate its approval.

## 7. Self-Correction Loop: Validation errors must automatically feed back into the LLM to retry/correct.

Errors such as `STALE_OFFER_VERSION`, `UNAVAILABLE_SLOT`, `UNSUPPORTED_CLAIM`, and `MISSING_DISCLOSURE` will go back to the model with the correct source fields. We'll regenerate, repeat all checks, and get reviewer approval where needed.

We'll allow three total attempts, including retries after human rejection. If the brief still fails, we'll withhold it and show a fixed request to update the relevant fields. We'll check availability again when reserving a slot to prevent double booking.

## 8. Deployability: If built, you are able to fully deploy it.

We'll deploy a responsive web app, API and worker, managed PostgreSQL, and review console. Owners and creators will have separate roles and access only to their campaigns. We'll add HTTPS, email opt-in, secret management, audit logs, backups, and a way to stop outgoing email.

Reservations will use database transactions and expiring holds. We'll deliver approved briefs in the app and through opted-in email; creators will publish their own videos.

Before release, we'll complete an owner-to-creator campaign, reject and correct an incorrect price, and test simultaneous attempts to reserve the same slot. Our team will handle the software deployment. We still need hosting and model accounts, participating owners and creators, and an internal reviewer.
