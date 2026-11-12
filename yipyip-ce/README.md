# YipYip

YipYip is a pet companion Chrome extension with two activities: conversation lessons and focused work sessions. Coins and XP earned from either activity grow the same pet. The current app runs inside a phone frame in Chrome's side panel; iOS remains a future target.

## Local setup

Use Node.js 22 or newer. Run commands from `yipyip-ce/`:

```sh
npm ci
```

On first setup, create `.env` from [.env.example](.env.example), preserving any existing configuration. Set `OPENAI_API_KEY` there. Credentials stay on the server; users do not enter a key or pairing code in the extension.

The developer runs the backend in a separate terminal:

```sh
npm run server
```

Build the extension:

```sh
npm run build
```

In `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose `yipyip-ce/dist`. After subsequent builds, reload the extension and reopen its sidebar. `npm run dev` watches and rebuilds source changes.

The backend defaults to `http://127.0.0.1:8787`. `VITE_AI_SERVER_URL` is the public backend origin bundled into the extension; never put credentials in a `VITE_` variable. Server environment changes require restarting the backend; client environment changes require rebuilding the extension. The developer manages backend starts, stops, and restarts.

For hosting, configure `YIPYIP_HOST` and `YIPYIP_ALLOWED_ORIGINS`, serve the backend over HTTPS, support WebSocket upgrades, and rebuild with the hosted `VITE_AI_SERVER_URL`. Origin checks and rate limits are implemented; account authentication is not.

## Current experience

The home screen keeps the pet, stats, bowl, cosmetics, and recommended lesson. Its navigation is **Shop · Tasks · History · Settings**.

**Tasks** offers two compact pills:

- **Converse:** Build conversation skills.
- **Get tasks done:** Focus, finish, earn rewards.

### Conversations

The Converse screen shows today's completed/goal fraction inside a daily-goal pie and a remaining-lessons caption. Its compact Options group contains Edit focus and the All topics toggle. All topics changes color and shows a checkmark when enabled.

Lessons use a chat interface with typed or voice replies and expandable feedback. Completion requires at least three engaged, validated replies with the conversation back on track. Two consecutive off-topic or blocking replies pause the conversation; service failures do not simulate rejection. Voice replies send after a finalized transcript and a pause, and cancellation never sends.

Optional conversation visual feedback uses local face and hand models in a worker. Open Body language and enable Visual feedback (camera) to start the preview, live visibility indicators, and landmark overlay near the composer. Camera off stops capture. Live tracking runs while the preview is enabled and pauses for hidden/stalled video; only samples captured during a voice recording enter that reply’s measurements. Missing hands are unobserved, not a negative score.

Each recorded reply displays a Body language card directly beneath the message. It reports face visibility, observed hand movement, and facial movement variation, or an explicit insufficient-data fallback. Short recordings and gaps cannot produce a measured result. Cancellation, errors, and new recordings discard unfinished results. Only the aggregate summary is saved locally with the reply and remains visible in conversation history; raw frames, landmarks, and blendshapes are never persisted or sent to the AI server. The measurements describe movement, not gesture quality, confidence, emotions, or conversational meaning. AI-generated visual coaching is not implemented. Work Mode retains its separate presence/timer behavior.

### Work sessions

The work landing screen chooses an open-ended question and offers three animated setup modals:

| Choice | Behavior |
| --- | --- |
| Create Task | Enter a title and duration; optionally add notes and checklist steps. |
| Suggest Task | Describe a task, then review and edit the AI-proposed title, time, and steps. |
| No Task, Just Work | Choose a duration and start a timer without a saved task. |

New task forms lead with **Start session**, which saves and starts the task. **Save for later** saves without starting; editing an existing task uses **Save changes**. Notes and steps live under Details & steps. Task cards emphasize title, duration, and Start, with notes, checklists, Edit, and Delete under Details.

The active session uses blue surfaces, a progress ring around the pet and countdown, and coin/XP chips. Pause/Resume and Finish remain prominent. Checklist steps and extra controls expand when needed. Finish and Stop open animated confirmation modals over the session. Motivational check-ins and their settings have been removed.

Durations are whole minutes from 1 to 480. Tasks support up to 12 checklist steps. Checked steps persist, but checking a step never awards rewards or automatically finishes a task. Reaching zero also does not auto-complete or pay rewards; the user confirms Finish. Stop ends the session without rewards.

### Optional Work Mode

All three setup flows offer the Work Mode toggle. Saved tasks retain their choice. Work Mode checks the camera before starting and uses local face detection to keep the timer accountable to being in frame.

- Standard work earns 1 coin and 1 XP per full minute counted.
- Work Mode earns 2 coins and 2 XP per full minute counted.
- Leaving frame pauses counted time; returning resumes it unless the user manually paused.
- Keep the Work screen open for detection. Closing it, hiding the document, camera failure, or stalled frames stops continued unattended counting.
- Camera frames and landmarks are not stored or uploaded. Work Mode requests video only, not microphone access. Face presence is not proof that a task is being completed.

Presence is sampled every 200 ms with an 800 ms departure grace period. The background timer limits counted time to a two-second presence lease, so closing the UI cannot leave a doubled timer running indefinitely. Manual pause requires explicit Resume. The model and WASM runtime are bundled locally; see [the detector asset notes](assets/mediapipe/README.md).

### Rewards and history

Eligible conversation attempts earn 10 coins, 30 XP, and 5 mood points once. Work rewards use `floor(counted seconds / 60)` multiplied by 1 or 2; they are capped by the planned duration and granted once by the serialized background worker.

After successful task or conversation completion, the app returns to the pet's home screen. A phone-style reward notification slides in at the top, stays for five seconds, then fades/slides out over 260 ms. It displays the saved reward amounts. Duplicate completion events do not replay it, and already-collected conversation rewards are not presented as newly earned.

History consolidates Conversations and Work tabs. Work keeps the latest 100 completed sessions, including duration, rewards, and checklist snapshots. Earlier video practice retains its separate 20-recording limit. Viewing history never grants another reward.

## Persistence and services

- `chrome.storage.local`: pet state, preferences, cosmetics, work tasks, active session, and work history.
- IndexedDB: conversation drafts, attempts, completions, and earlier recordings. Existing `dopal-lessons` and `dopal-practice` names remain for compatibility.
- AI server: `POST /api/turn`, `POST /api/task-plan`, `POST /api/transcribe`, and the `/api/voice` WebSocket relay.
- No account or cloud history sync is implemented.

Messages, task descriptions, and voice audio may be processed by the configured AI service. Camera video stays local. Do not describe all media as staying on-device.

## Verification

Follow TDD for behavior changes: write a meaningful failing test, implement, then rerun the relevant tests and required checks. Run the full suite when the change affects shared behavior.

```sh
npm test
npm run build
git diff --check
```

The latest full suite passed 180 tests on November 12, 2026 after live conversation overlays and per-reply visual measurements. The production build packages both face and hand models and the vision worker. Browser checks used synthetic media and mock AI responses; these do not establish physical-camera or live-provider quality.

### Mock browser preview

```sh
npm run build
node scripts/browser-fixture.js
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173/test-room.html`.

**The preview is not a live AI test.** Its task-planning response is always “Tidy my room,” regardless of the entered description. Conversation replies are also mocked. To test real suggestions, use the reloaded extension with the developer-managed AI server running. A `Not found` response from `/api/task-plan` can mean the running backend predates the route and needs a developer restart.

| Preview query | Purpose |
| --- | --- |
| `?work=1` | Work UI with separate mock pet/work state. |
| `?work=1&rewards=1` | Separate reward-flow state, initially seeded with counted work time. |
| `?work=1&planfail=1` | Task-suggestion service failure. |
| `?deny=1` | Denied media access. |
| `?livevoice=1&fillers=1` | Synthetic streaming voice and filler feedback. |
| `?cosmetics=unlocked` / `?cosmetics=locked` | Separate wardrobe states for purchase and level checks. |

Fixtures persist test data, so seeded state is not recreated on every reload. The reward preset uses `yipyip-rewards-test-state` in preview localStorage; clear only that test key to reseed it. Preview conversation storage uses its mock storage/IndexedDB paths; it is not the extension's production data.

For deterministic camera-presence transitions:

```sh
node scripts/browser-fixture.js --work-camera
```

This builds the explicit `camera-test` mode and replaces the detector with a test control for face in frame/away. It still uses synthetic video. The ordinary preview keeps the production detector, which will not detect a face in the fixture's text-only canvas.

For deterministic conversation overlays and measured reply summaries, run `node scripts/browser-fixture.js --visual-camera`. This explicit `visual-test` build injects face/hand observations; it checks the UI and recording-to-summary handoff, not model accuracy. The ordinary preview retains the real vision worker and its text-only synthetic video exercises the insufficient-data fallback.

Always run `npm run build` after preview testing, before loading or sharing `dist/`. This removes the harness, mock APIs, and test detector. Do not distribute a `camera-test` or `visual-test` build.

## Source map

| Location | Purpose |
| --- | --- |
| `src/App.jsx` | Home, navigation, completion routing, reward notification placement. |
| `src/tasks/` | Tasks activity chooser. |
| `src/lessons/` | Converse feed, chat, validation eligibility, history, and lesson persistence. |
| `src/work/` | Task planning UI, checklists, timer model, local camera presence, and work history. |
| `src/visual/` | Optional conversation camera capture, worker-based face/hand tracking, live overlays, and local per-reply summaries. |
| `src/rewards/` | Completion presentation and timed phone notifications. |
| `src/background/index.js` | Serialized state mutations and reward application. |
| `src/media/` | Shared device permissions and voice capture. |
| `src/pet/` | Pet appearance, cosmetics, ownership, and equipment. |
| `server/` | AI planning, conversation validation, transcription, and voice relay. |
| `tests/` | Automated tests and browser-only fixtures. |
| `src/legacy/productivity/` | Preserved original implementation; not the active work experience. |

`yipyip-ce/` is a regular folder in the parent repository, not a submodule. Local handoff files `CLAUDE.md`, `NOTES.md`, and `DEVELOPMENT_NOTES.md` are ignored by Git; this README is the shared setup and behavior reference. Do not commit or push unless requested.
