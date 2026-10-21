# Startup 3: ClipRecall — Spanish listening practice from creator clips

**Inspired by:** [Doomersion](https://www.ycombinator.com/companies/doomersion). We like the idea of matching short language-learning videos to a learner's level. Our idea adds practice that checks whether people understand and remember what they hear.

**Our idea:** We'd turn licensed Spanish clips into five-minute listening lessons with checked captions, phrase explanations, and recall questions. ClipRecall would be our own project.

## 1. Solves one problem extremely well.

Intermediate Spanish learners can recognize a phrase in subtitles and still miss it in fast speech. We want to help them understand and remember everyday expressions across different speakers.

We'll start with adult learners, Spanish only, and clips under a minute. General tutoring, pronunciation scoring, and an unrestricted social feed are outside the first version. We'll measure comprehension of previously missed phrases in new recordings after a delay.

## 2. You know the target customers or have direct access to them.

We'd start with adults in a Spanish conversation club or college language society. We plan to contact instructors and organizers, but we haven't secured a group yet.

We want 15 learners and one bilingual reviewer to try the first lessons. Before building recommendations, we'll run a baseline listening task and arrange recurring sessions so we can see whether learners improve.

## 3. You are familiar with (or can quickly learn) most of the required infrastructure.

We'd use a mobile-friendly web app, private video storage, a media-processing worker, PostgreSQL, hosted transcription, and an LLM that returns structured lesson data. A simple rules-based scheduler would handle spaced review.

Caption timing and media processing are the main areas we'd need to learn. We'll test them with a small clip library before expanding. We don't need a trained recommendation model or native apps for this version.

Our three developers can divide the work across the lesson interface, media and backend services, and lesson generation and validation. We'll first get one complete lesson working from upload through review and playback.

## 4. Reimagines the problem space to make it significantly better.

We want each clip to lead to practice: listen without captions, answer a question, review a missed phrase, then encounter it later in another licensed clip. A colloquial expression someone misses today could return in a different speaker's sentence several days later.

We'll use comprehension and recall to choose what comes next. To test the benefit, we'll compare delayed recall with learners using the same clips and static subtitles.

## 5. An LLM/Generative model is core to the solution (no generic "chatbot in a sidebar").

The model would generate explanations, contextual translations, and questions based on the phrases a learner missed. That lets us adapt lessons to individual mistakes while keeping the original clip as the source material.

## 6. Validation Guardrail: No LLM-generated artifact reaches the user without passing through a validator.

We'll only use creator-owned or explicitly licensed clips. A bilingual reviewer will verify each source transcript and translation before we use it to build lessons. Automatically generated transcription won't skip that review.

Every generated caption variant, explanation, question, answer key, and recap will pass checks for structure, transcript references, timestamp bounds, and vocabulary level. A bilingual human will also check the meaning of every new instructional item, including personalized variants. Another model can flag problems, but it won't replace that review.

Questions must have one supported answer, with no alternative that is also correct in context. The API will serve approved, fixed versions only, with no raw model streaming. We'll keep the content library small enough to support this review workload.

## 7. Self-Correction Loop: Validation errors must automatically feed back into the LLM to retry/correct.

We'll send errors such as `MEANING_CHANGED`, `AMBIGUOUS_ANSWER`, and `OUT_OF_LEVEL_VOCABULARY` back to the model with the relevant transcript references. It will regenerate the failed component, and we'll repeat all checks, including human review.

We'll allow three total attempts. While a lesson is pending, or if it still fails, the learner will get an approved lesson or a fixed availability message. Rejected drafts won't appear in the app.

## 8. Deployability: If built, you are able to fully deploy it.

We'll deploy the app, API, queue, lesson worker, review console, database, and private media storage on managed hosting. We'll use signed video URLs, keep licensing records, and add account deletion, access controls, monitoring, backups, and cost limits. Private progress and personalized lessons will stay scoped to their owner.

Before release, we'll test a licensed clip, reject an incorrect translation, publish a corrected lesson, and verify that a second account can't access another learner's progress. Our team can own the software deployment. We still need creator licenses, a paid bilingual reviewer, and hosting and model accounts before launch.
