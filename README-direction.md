# startup4501

# Quippy — AI Body Language Coach

## Project Direction

- Existing startup: Quippy
- Proposed feature: Computer-vision-powered body language feedback for simulated social conversations
- Status: Proposed student-team extension; not a claim about features currently shipped by Quippy.

## Overview

Quippy provides personalized social practice through conversation scenarios, voice or text interactions, feedback, and follow-up drills. Our proposed extension adds an opt-in webcam-based body language coach so users can practice not only what they say, but also how they physically communicate during a simulated conversation.

The system will extract observable signals such as posture changes, head orientation, and hand gestures using computer vision. An LLM will combine these measurements with the conversation scenario to produce specific, constructive feedback and a follow-up practice drill. A programmatic validator will screen every generated coaching artifact before it reaches the user, and rejected feedback will be returned to the model for correction.

## How This Project Meets the Eight Requirements

### 1) Solves one problem extremely well

**Problem:** People practicing difficult social interactions may receive guidance on wording and speech, yet lack actionable feedback about their visible nonverbal behavior.

**Our narrow solution:** Provide clear, evidence-based coaching on body language during short simulated conversations. Rather than trying to interpret every social skill, the MVP focuses on a small set of measurable movement cues and one or two practical improvements per session.

### 2) We know the customers or have access to them

Our initial customers are students, young professionals, and other people who want to rehearse interviews, introductions, presentations, or everyday conversations. We can recruit classmates and student organizations to test the prototype, conduct usability interviews, and collect feedback about whether its suggestions are useful, respectful, and understandable.

**Validation plan:** Conduct a small round of user interviews and supervised practice sessions before broadening the target market. Access to prospective testers is a plan, not yet evidence of product-market fit.

### 3) We are familiar with, or can learn, the required infrastructure

A feasible implementation uses:

- Frontend: React or Next.js with opt-in webcam access through browser media APIs.
- Computer vision: MediaPipe Pose and/or Holistic landmarks (or an equivalent pose estimation library) to detect visible movements.
- Backend: Python and FastAPI to process structured observations and orchestrate feedback generation.
- LLM: An API-based generative model to write tailored coaching and practice drills from structured, grounded observations.
- Validation: Typed JSON schemas, rule-based checks, and tests ensuring feedback is linked to detected observations.

The MVP can process short clips or sampled frames rather than requiring low-latency, continuous video inference. Processing video locally where feasible reduces data transfer and privacy risk.

### 4) We reimagine how it can be much better

The extension moves from conversation-only coaching to multimodal practice. After a session, the user could see a brief timeline of detected nonverbal patterns, a few concrete observations, and a targeted exercise. For example, if the model observes that the user's head was angled away from the camera during much of a mock interview, the system could suggest experimenting with a more camera-facing position while clarifying that camera orientation is only a rough proxy for conversational attention.

Longer term, feedback could be paired with Quippy's conversational practice and speech-related coaching; integration with proprietary Quippy systems would require appropriate access or partnership.

### 5) An LLM/generative model is essential

Computer vision measures patterns; the LLM turns them into personalized coaching. For the same observed movement, useful advice depends on whether the user is practicing a job interview, a presentation, or a casual conversation. The LLM will:

1. Interpret structured, observable movement summaries in the context of the selected practice scenario.
2. Generate clear, supportive, scenario-specific feedback without claiming to know the user's emotions or personality.
3. Create a personalized next-round practice drill and explain why it targets a particular observed behavior.

This is central to the product experience, not a general-purpose chatbot added to the interface.

### 6) No LLM-generated artifact reaches the user without validation

Every LLM-generated feedback response and drill must pass a validator before display. The validator will check:

- Schema: Required fields, valid data types, and bounded response length.
- Evidence grounding: Each claimed observation references a specific supported measurement or time interval.
- Confidence: Low-quality, occluded, or uncertain video measurements cannot support strong claims.
- Safety and fairness: No unsupported claims about emotion, honesty, personality, disability, or universal "correct" body language.
- Usefulness: Suggestions stay within the supported set of behaviors and include an actionable drill.

A structured output format makes these requirements automatically testable.

### 7) Validation errors automatically feed back into the LLM for self-correction

If the generated feedback fails validation, the backend will return specific machine-readable error messages to the LLM, along with the allowed observations, and request a corrected response. The corrected output is validated again. Retries are limited; when validation cannot succeed, the interface displays a safe fallback rather than unvalidated advice.

**Example:**

- Initial draft: "You seemed anxious because you kept moving your hands."
- Validator failure: Unsupported emotional inference; only a frequency of detected hand movements is available.
- Revised draft: "Frequent hand movements were detected during your answer. Try a second practice round with slower, intentional gestures and compare which feels more natural."

### 8) If we build it, we can deploy it

The MVP can run as a standalone web application without requiring access to Quippy's production code. A React frontend, Python API, pose estimation component, and hosted LLM service can be deployed using common managed hosting platforms. We will keep API keys on the server and provide a clear camera-permission and data-retention policy.

For an achievable first deployment, the user starts a short practice session, allows camera access, records or processes sampled video, and receives validated feedback after the session. Direct integration into Quippy would be a separate step requiring authorization.

## MVP Scope

### In scope

- Explicit webcam consent and a short recorded or live-sampled practice session.
- Landmark-based measurement of posture, head orientation, and visible gesture frequency.
- A structured observation summary with timestamps and quality/confidence indicators.
- Scenario-aware LLM coaching with one or two evidence-grounded suggestions.
- Automatic validation, error-driven revision, and a safe fallback.
- One personalized drill the user can repeat.

### Out of scope for the first release

- Emotion, deception, or personality detection from facial expressions or gestures.
- Clinical, psychological, or diagnostic judgments.
- Definitive scoring of someone's social ability from appearance.
- Full real-time multimodal integration with Quippy's production platform.

## End-to-End Pipeline

```text
User selects a conversation scenario and opts in to camera use
        ↓
Webcam video → computer vision landmark extraction
        ↓
Observable metrics + timestamps + measurement confidence
        ↓
LLM generates scenario-specific feedback and a practice drill
        ↓
Programmatic validator checks schema, grounding, and rules
        ↓
     Pass? ── Yes → Display validated feedback + next drill
        │
        No
        ↓
Return explicit validation errors to LLM → regenerate → revalidate
        ↓
If retries fail: provide a safe non-LLM fallback
```

## Suggested Success Metrics

- Grounding rate: Percentage of feedback claims backed by recorded observations.
- Validation pass rate: Percentage of outputs passing validation on the first attempt and after correction.
- Usability: Percentage of testers who understand the feedback and can identify a concrete next action.
- Perceived usefulness: Post-session ratings of relevance and helpfulness, including feedback from people with differing communication styles.
- Technical feasibility: Time to generate validated feedback, camera/landmark availability, and deployment reliability.

## First Development Milestones

1. Build a webcam practice page and display pose/gesture landmarks locally.
2. Convert detected landmarks into a small, documented set of observable metrics.
3. Design the structured feedback schema and implement the validator before connecting the LLM.
4. Generate personalized feedback, inject validation errors, and test the repair loop.
5. Run a small user study, measure the success metrics, and deploy a working demonstration.

## Reference

- Quippy official website — public description of its scenario-based social practice, voice/text interaction, adaptive curriculum, feedback, and drills.
