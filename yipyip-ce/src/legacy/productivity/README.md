# Previous DoPal productivity flow

We've kept the original task and focus-session implementation here as a reference. The active app now supports conversation practice and a new productivity experience in `src/work/`. These files aren't imported by the active application.

This snapshot includes the old app and styles, task management, timers, camera check, face-detection hook, popup, and background worker. The original assets remain in `src/assets`. Relative imports in these snapshots reflect their original locations; this folder is a reference for restoring or adapting the feature, not a second runnable entry point.

Existing task data stays in Chrome storage. The new worker clears active timer keys and retires task-completion alarms so old timers can't pay out rewards or interrupt practice. It retains the existing pet and inventory.

The active app no longer uses focus penalties or treats camera direction as attention. The active Work Mode uses local face presence and a bounded timer lease, with optional doubled coin/XP rewards. It does not reconnect this old worker or its penalties. See [the main README](../../../README.md) for current behavior.
