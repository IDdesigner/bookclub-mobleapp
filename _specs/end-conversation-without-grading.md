# End Conversation Without Grading Option

## Overview

When a student taps **End Conversation** during a tutoring session, the confirmation dialog currently offers only two choices: **Cancel** and **End & Grade**. This feature adds a third choice — **End Without Grading** — so students can exit a session without triggering the grading flow, and renames **Cancel** to **Back To Test** to make the dismissal action clearer.

---

## Affected Screens

- `student-app/app/tutor-session-voice/[sessionId].tsx` — voice session (has the End Conversation button and Alert dialog today)
- `student-app/app/tutor-session/[sessionId].tsx` — text session (no End Conversation button today; apply the same pattern when one is added)

---

## Current Behaviour

Tapping **End Conversation** in the voice session triggers a native `Alert.alert` with:

| Button | Action |
|---|---|
| Cancel | Dismisses the dialog, student stays in session |
| End & Grade | Marks session complete, grades conversation, navigates to `/session-results/[sessionId]` |

---

## Desired Behaviour

The dialog should present three choices:

| Button | Label | Action |
|---|---|---|
| Dismiss | **Back To Test** | Closes the dialog; student stays in the session |
| Destructive (no grade) | **End Without Grading** | Marks session as ended, skips grading, navigates back to the assignments tab |
| Confirm (grade) | **End & Grade** | Existing behaviour — grades conversation, navigates to `/session-results/[sessionId]` |

### End Without Grading — side effects

When the student chooses **End Without Grading**:

1. Update the `tutor_sessions` row: set `status` to `'abandoned'` (or equivalent terminal status) and `ended_at` to now.
2. Update `student_assignments`: if the current status is `'in_progress'`, revert it to `'not_started'` so the student can start fresh later. If the status is already `'retake'` or `'completed'`, leave it unchanged.
3. Do **not** call `gradeConversation` or write any rows to `session_grades` or `turn_grades`.
4. Navigate to the assignments tab (`/(tabs)/assignments`).

---

## Dialog Copy

```
Title:   End Conversation
Body:    How would you like to end this session?

Buttons (in display order):
  [Back To Test]          ← neutral / cancel style
  [End Without Grading]   ← destructive style
  [End & Grade]           ← primary / default style
```

---

## Out of Scope

- Adding an End Conversation button to the text session screen (that screen has no such button today; it can be tackled separately).
- Any changes to the grading logic itself.
- Any changes to the session-results screen.

---

## Open Questions

1. Should **End Without Grading** show a brief confirmation toast/snackbar ("Session ended — no grade recorded") after navigating away?
2. What `status` value should be written to `tutor_sessions` for an abandoned session? Confirm the column accepts `'abandoned'` or use an existing value like `'ended'`.
