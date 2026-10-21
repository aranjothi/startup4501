# Startup 3: ClipRecall — Spanish listening practice from creator clips

**Inspired by:** [Doomersion](https://www.ycombinator.com/companies/doomersion), which describes a short-video language-learning feed matched to the learner's level. ClipRecall builds on that format with a focused comprehension-and-recall loop. Source reviewed October 15, 2026.

**Proposed product:** Turn licensed, short Spanish videos into five-minute listening lessons with validated captions, contextual explanations, and retrieval questions. This is an independent proposal. Customer access and founder infrastructure knowledge are assumptions to establish.

## 1. Solves one problem extremely well

Help intermediate Spanish learners understand and remember everyday phrases in fast native speech. The MVP covers one language, adult learners, and clips under a minute. It excludes general tutoring, pronunciation scoring, and an unrestricted social feed. Measure delayed comprehension of previously missed phrases on new recordings, rather than minutes spent scrolling.

## 2. You know the target customers or have direct access to them

Start with adult learners in one Spanish conversation club or college language society. Access could come through an instructor or club organizer, but no existing relationship is asserted. Recruit 15 consenting learners and one bilingual reviewer through a cooperating organizer before building the recommendation system. This criterion is satisfied when the organizer provides recurring pilot access and learners complete a baseline listening task.

## 3. You are familiar with, or can quickly learn, most required infrastructure

Use a mobile-friendly web app, private video storage, a media transcoding worker, PostgreSQL, a hosted transcription model, and an LLM producing structured lesson objects. A simple rules-based scheduler handles spaced review. The main new skills are caption alignment and media processing, which can be prototyped with a small clip library. Avoid training a recommendation model or building native apps in the MVP. This assumes basic web/API development competence, to be confirmed through a working lesson prototype.

## 4. Reimagines the problem space to make it significantly better

Each entertaining clip becomes an observable learning cycle: listen without captions, answer one question, inspect a phrase explanation, then retrieve that phrase later in a different licensed clip. For example, a missed colloquial expression returns in another speaker's sentence several days later. Personalization follows demonstrated comprehension and retention, not watch time alone. Compare delayed recall against the same clips with static subtitles to establish whether the extra loop helps.

## 5. An LLM/Generative model is core to the solution

The model identifies phrase-level misunderstandings and generates level-appropriate explanations, contextual translations, and targeted questions. It adapts the lesson to what each learner missed. The generated instructional layer turns a video library into personalized practice; it is not a separate chat feature.

## 6. Validation Guardrail: No LLM-generated artifact reaches the user without passing through a validator

Only creator-owned or explicitly licensed clips enter the library. A bilingual reviewer first verifies the canonical transcript and translations used as source material; transcription output is treated as generated content and cannot bypass review. Every generated explanation, caption variant, question, answer key, and personalized recap must pass schema checks, exact transcript-span checks, timestamp bounds, vocabulary constraints, and a separate bilingual semantic review.

An independent model may flag semantic errors, but a bilingual human validates every new instructional artifact in the MVP before publication, including personalized variants. Questions must have one supported answer and no distractor that is also valid in context. The lesson API exposes only approved immutable versions. There is no raw streaming. This trades instant novelty for an enforceable quality gate; automated checks cannot guarantee translation accuracy alone.

## 7. Self-Correction Loop: Validation errors automatically feed back into the LLM

Machine and reviewer errors become structured feedback such as `MEANING_CHANGED`, `AMBIGUOUS_ANSWER`, or `OUT_OF_LEVEL_VOCABULARY`, with transcript references. The worker automatically regenerates the failed lesson component and reruns the entire validation pipeline, including human approval where needed. Limit generation to three total attempts. Pending or exhausted items are withheld; the learner receives an already approved lesson or a fixed availability notice. Rejected lessons are never shown as drafts.

## 8. Deployability: If built, you are able to fully deploy it

Deploy the web app, API, queue, lesson worker, review console, database, and private media storage on managed hosting. Serve approved videos using signed URLs, retain licensing metadata, and implement account deletion, access controls, monitoring, backups, and media/model cost limits. Keep learner-specific artifacts scoped to their owner. Check production using a licensed clip, a deliberately incorrect translation, a corrected-and-approved lesson, and a second learner account that cannot access private progress.

A solo web developer can deploy the full software MVP without social-platform scraping or app-store approval. Creator licenses, a paid bilingual reviewer, and hosting/model accounts are necessary launch dependencies. The business must support the review workload before expanding personalized content generation.

## Smallest paid pilot

Use 30 licensed clips, 15 learners, and a two-week delayed-recall experiment. Test a proposed $8 monthly subscription. Proceed if learners return for at least three sessions weekly, recall improves over the subtitle-only comparison, and paid conversion covers expected review and inference costs. These are pilot targets, not measured outcomes.
