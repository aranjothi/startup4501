# Startup 1: FirstPitch — An all-in-one productivity app

**Inspired by:** [Quippy](https://www.ycombinator.com/companies/quippy), which describes short social practice conversations with adaptive, line-by-line feedback. FirstPitch applies that practice-and-feedback model to public speaking within a broader productivity app. Source reviewed October 15, 2026.

**Proposed product:** An all-in-one productivity app that helps users organize their work and improve the skills needed to complete it. The main improvement we see right now is public-speaking practice: users video themselves in real time, finish their recording, and receive feedback afterward. The first release centers on this workflow; broader productivity tools are the long-term direction.

This is a proposed independent startup, not an affiliation with Quippy. Customer access and founder skills below are assumptions to verify, not claims about the reader's background.

## 1. Solves one problem extremely well

Help users prepare and deliver clearer presentations through a repeatable record, review, and retry workflow. Start with college students practicing class presentations, club speeches, or pitches. The MVP provides a live camera preview, video recording, and feedback after the session on structure, clarity, pacing, filler words, and concrete next steps. It does not interrupt the user with live coaching. Measure improvement through blinded reviewer scores of the first and final recordings, using the same rubric. The all-in-one vision guides expansion, while public speaking gives the first release one clear problem to solve.

## 2. You know the target customers or have direct access to them

The initial users are students preparing for upcoming presentations; a potential buyer is a student organization or campus communication center. Direct access is plausible through classmates, club officers, or an instructor, but has not been established. Before building, recruit ten students through one cooperating class or campus organization and observe five practice sessions. This criterion is satisfied once that group agrees to distribute the pilot and students participate. Without that access, the idea remains conditional.

## 3. You are familiar with, or can quickly learn, most required infrastructure

Use a browser application with camera and microphone recording, a Python API, PostgreSQL, private video storage, a hosted LLM, and speech transcription with timestamps. Build an end-to-end prototype that records a short video, uploads it, transcribes it, and returns validated feedback after processing. The main learning tasks are browser recording, reliable uploads, transcript analysis, and background job processing; no custom model training or native mobile application is necessary. This assumes basic web development skills, which should be confirmed through the prototype.

## 4. Reimagines the problem space to make it significantly better

The main improvement is turning a self-recorded presentation into an actionable practice session within the user's productivity workflow. Users record themselves in real time and review specific feedback afterward, alongside the recording and timestamped transcript. For example, instead of generic advice to “be clearer,” the app can identify a passage where the main point is hard to follow and suggest a focused retry. Users can then record another attempt and compare sessions. Test whether this improves presentation scores over watching a recording with a static checklist; improvement is a hypothesis, not an established result.

## 5. An LLM/Generative model is core to the solution

The LLM analyzes the completed transcript in the context of the user's speaking goal and proposes personalized feedback, a short practice plan, and a targeted retry exercise. Each feedback item includes transcript-span references and timestamps so the user can revisit the relevant moment in the video. Pacing and filler-word measurements come from timestamped transcript analysis; the model explains those measurements in context. Removing generation leaves a recording tool and basic metrics without the personalized coaching that makes this feature useful. Visual delivery analysis is a possible later addition; the first release does not infer body language or eye contact from a transcript.

## 6. Validation Guardrail: No LLM-generated artifact reaches the user without passing through a validator

Every feedback item, practice plan, retry exercise, and generated summary is buffered server-side. A separate validation service checks JSON schema, length, allowed coaching scope, and safety. Feedback quotes must match the transcript, timestamps must fall within the recording, and numerical claims must match the computed measurements. An independent rubric evaluator checks that the feedback follows from the cited spans. Unsupported claims and subjective items with uncertain evaluator agreement go to a trained speaking coach or instructor for validation before release. Model judging alone is not proof of correctness.

Only approved generated artifact IDs can be fetched by the UI. Raw model tokens are never streamed, and generated error explanations are also gated. Users can review their own recording while feedback is processing.

## 7. Self-Correction Loop: Validation errors automatically feed back into the LLM

The validator returns structured errors such as `UNSUPPORTED_FEEDBACK_CLAIM`, `INVALID_TIMESTAMP`, or `METRIC_MISMATCH`, along with the failing field and permitted evidence. The server automatically resubmits the candidate and those errors to the generator, then reruns all checks. Allow three total generation attempts. If all fail, show a fixed, human-authored retry notice or an already validated exercise; never expose the rejected draft. Coach or instructor rejections enter the same retry queue. Record artifact hashes, errors, attempts, and validator versions for auditing.

## 8. Deployability: If built, you are able to fully deploy it

Deploy the web app and containerized API/worker on managed hosting with managed PostgreSQL and private object storage. Configure HTTPS, authentication, per-user access, secret storage, recording deletion, daily backups, upload limits, and usage limits. Keep generation and validation in the worker; the public API serves approved generated artifacts only. Verify deployment by creating two accounts, confirming recording isolation, deliberately rejecting an artifact, and completing a video recording and validated feedback session in production. Check camera and microphone permissions and recording playback in the supported browsers.

A technically capable solo builder can own this initial software deployment without external productivity integrations. Launch still requires hosting/model accounts and a speaking coach or instructor for uncertain feedback; those are explicit dependencies, not completed arrangements.

## Smallest paid pilot

Run a two-week pilot with ten students and one speaking coach or instructor. Charge a proposed $100 per campus cohort after a free demonstration. Proceed if at least seven students complete three recording-and-feedback sessions, blinded presentation scores improve, and the organization agrees to pay for another cohort. Track review time, video storage, transcription, and model costs to test whether pricing supports the workflow. Use pilot feedback to decide which broader productivity feature belongs next in the all-in-one app.
