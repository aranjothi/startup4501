# Startup 1: FirstPitch (Name TBD) — An all-in-one productivity app

**Inspired by:** [Quippy](https://www.ycombinator.com/companies/quippy). We like its approach to practicing conversations and getting feedback. Our main improvement is adding video-based practice and visual feedback so users can review how they communicate as well as what they say. This is our own project, separate from Quippy.

**Our idea:** We're building an all-in-one productivity app, starting with conversation and communication practice. Anyone could use it to rehearse everyday conversations, introductions, interviews, workplace discussions, or public speaking. Users will record themselves during practice and receive feedback afterward. We may add other productivity tasks, but we haven't decided what those will be yet.

**Our team and platform:** We have three developers. We're building the initial prototypes as a Chrome extension so we can test the core experience before scaling. The final product will be an iOS app.

## 1. Solves one problem extremely well.

It's hard to improve a conversation when you don't know what to work on. We want users to practice, review specific feedback, and try again with a clear next step.

The first version will include a choice of scenarios, an AI practice partner, a live camera preview, and video recording. After the session, users will get feedback on clarity, relevance to the other speaker, pacing, filler words, and a small set of visible cues such as head orientation, posture changes, and gestures. Public speaking is one use case alongside everyday and professional conversations.

We'll compare first and later recordings using the same scenario-specific rubric and reviewers who don't know which attempt came first. That will help us check whether the feedback improves communication.

## 2. You know the target customers or have direct access to them.

Our audience is anyone who wants to improve their conversations and communication. That includes job seekers, professionals, students, and people who want more practice with social interactions. Individual users could pay for the app, and employers, coaches, or community and educational organizations could also be customers.

We still need to establish access to people who will test it. We plan to recruit ten participants through personal networks or a cooperating workplace, community group, coaching practice, or student organization, then observe five practice sessions. We'll use a small group to learn what works while keeping the broader audience in mind.

## 3. You are familiar with (or can quickly learn) most of the required infrastructure.

We'll start with a Chrome extension that opens a dedicated practice page for camera and microphone recording. Our proposed backend uses a Python API, PostgreSQL, private video storage, a hosted LLM, timestamped transcription, and an existing pose or landmark estimation library.

Our first complete prototype should run a short turn-based conversation, record the user's video, transcribe their speech, extract a few supported visual observations, and return validated feedback afterward. We'll need to work through extension development, recording and uploads, conversation flow, video analysis, and background processing.

For iOS, we're considering Swift and SwiftUI. We'll design the backend so the mobile app can reuse accounts, session history, processing, and validation. We'll also need to build and test mobile recording, uploads, playback, and permissions. We don't plan to train our own models for the first version.

We'll divide responsibilities across our three developers based on our skills:

- **Client experience:** Chrome extension, recording, playback, and feedback display, followed by the iOS app.
- **Backend and deployment:** API, accounts, storage, session history, processing jobs, and hosting.
- **AI and feedback:** Conversation generation, transcription and visual analysis, validation, and automatic correction.

We'll share integration, code review, and end-to-end testing. Before expanding the feature set, we'll agree on the API and data formats and get one full practice session working across all three areas.

## 4. Reimagines the problem space to make it significantly better.

We want users to review verbal and visual feedback together, with timestamps that take them to the relevant moment in their recording. For example, we could point out an answer that missed the practice partner's question and separately highlight a moment when the user's head turned away from the camera.

We'll keep those observations specific. Turning away from a camera doesn't prove someone wasn't paying attention, and different people communicate differently. Our goal is to give users something useful to experiment with in their next attempt.

We'll compare our feedback with simply watching a recording and using a static checklist to see whether the extra guidance helps.

## 5. An LLM/Generative model is core to the solution (no generic "chatbot in a sidebar").

The model will generate practice-partner turns based on the conversation so far. Afterward, it will use the transcript and structured visual observations to suggest feedback, a short practice plan, and a retry exercise.

Each feedback item will link to transcript evidence or a measured visual observation. Pacing and filler-word counts will come from transcript analysis, while visual measurements will come from video processing. The model's job is to explain those observations in the context of the user's goal and choose useful practice steps.

Visual feedback is part of the initial feature. We'll limit it to observations our prototype can reliably support.

## 6. Validation Guardrail: No LLM-generated artifact reaches the user without passing through a validator.

Every generated practice-partner turn, feedback item, plan, exercise, and summary will stay on the server until it passes validation. We'll check structure, length, scenario scope, and coaching rules. Quotes must match the transcript, timestamps must fall within the recording, and numbers must match our computed measurements.

Visual claims need supporting observations with sufficient confidence. Missing or obscured landmarks won't justify feedback. We'll reject unsupported claims about emotion, honesty, personality, or attention, along with claims that one body-language style is right for everyone.

A separate rubric evaluator will check whether feedback follows from its evidence. Uncertain or disputed items will need validation by a trained communication coach or instructor before release. We'll use model checks to help with review, without treating them as proof that advice is correct.

The interface will only fetch approved generated items. We won't stream raw model output, and generated error messages will go through the same checks. Users can watch their own recording while feedback is processing.

## 7. Self-Correction Loop: Validation errors must automatically feed back into the LLM to retry/correct.

The validator will return specific errors such as `UNSUPPORTED_FEEDBACK_CLAIM`, `LOW_CONFIDENCE_VISUAL_EVIDENCE`, `INVALID_TIMESTAMP`, and `METRIC_MISMATCH`. We'll send those errors and the allowed evidence back to the model, then validate the revised response again.

We'll allow three total generation attempts. If they all fail, we'll show a fixed retry message or an already approved exercise. Coach or instructor rejections will trigger the same correction process. We'll log the rejected version, errors, attempts, and validator version so we can investigate recurring problems.

## 8. Deployability: If built, you are able to fully deploy it.

For the prototype, we'll package the Chrome extension for testers and host the API and worker with managed PostgreSQL and private video storage. We'll add HTTPS, authentication, per-user access, secret storage, explicit camera and microphone consent, recording deletion, backups, upload limits, and usage limits. Generation, video analysis, and validation will run in the worker, and the API will only serve approved generated results.

Before sharing it, we'll install the extension in a fresh Chrome profile and complete a recorded conversation with validated verbal and visual feedback. We'll also test two-account isolation, rejected output, permission handling, playback, and missing or low-confidence video observations.

For the final iOS app, we'll use the same backend, test on supported devices, run a TestFlight beta, and prepare an App Store release. We'll check recording, uploads, playback, permissions, account isolation, deletion, and feedback before scaling.

Our three developers will own the client, backend, AI processing, and deployment. We still need to confirm our iOS development readiness, arrange Apple developer access, obtain hosting and model accounts, and find a communication coach or instructor for uncertain feedback.
