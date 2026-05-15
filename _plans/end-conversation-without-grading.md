# Plan: End Conversation Without Grading

## Context

The "End Conversation" dialog in the voice tutoring session currently offers only **Cancel** and **End & Grade**. Students have no way to exit a session without triggering grading — which is needed when a student wants to abandon an unfinished or accidental session. This change adds **End Without Grading** and renames **Cancel** to **Back To Test** to make intent clearer.

The `'abandoned'` status for `tutor_sessions` is already defined in `database.types.ts` (line 64) — no schema migration needed.

---

## File to Modify

**`student-app/app/tutor-session-voice/[sessionId].tsx`** — only file that has the End Conversation button and dialog.

---

## Implementation Steps

### 1. Add `Snackbar` import

Add `Snackbar` to the existing `react-native-paper` import at the top of the file.

### 2. Add state variable

Add one new state variable:
```
const [abandonSnackbarVisible, setAbandonSnackbarVisible] = useState(false);
```

### 3. Replace the `Alert.alert` call (lines ~415–502)

Change the button array from 2 buttons to 3:

| Button | Style | Action |
|---|---|---|
| `'Back To Test'` | `'cancel'` | Dismisses dialog, stays in session |
| `'End Without Grading'` | `'destructive'` | Runs abandon handler (see step 4) |
| `'End & Grade'` | default | Existing handler, unchanged |

Update the dialog body copy to: `'How would you like to end this session?'`

### 4. Add the "End Without Grading" handler

Inside the `'End Without Grading'` button's `onPress`, wrapped in `try/finally` with `setIsProcessing`:

1. Set `isProcessing = true`
2. Update `tutor_sessions`: `status = 'abandoned'`, `completed_at = new Date().toISOString()`
3. Fetch existing `student_assignments` row for this student + assignment
4. If found and `status === 'in_progress'`: update to `status = 'not_started'`
   If found and status is `'retake'` or `'completed'`: leave unchanged
   If not found: do nothing
5. Set `isProcessing = false` (in finally)
6. Set `abandonSnackbarVisible = true`

### 5. Render the Snackbar

Add a `<Snackbar>` at the bottom of the returned JSX (inside the outermost `View`):

- `visible={abandonSnackbarVisible}`
- `duration={2500}`
- `onDismiss`: sets `abandonSnackbarVisible = false`, then calls `router.replace('/(tabs)/assignments')`
- Message: `"Session ended — no grade recorded"`

Navigation happens in `onDismiss` so the snackbar is visible before the screen unmounts.

---

## Verification

1. Run `npm start` from `student-app/`
2. Start a voice tutoring session
3. Tap **End Conversation** → confirm dialog now shows **Back To Test**, **End Without Grading**, **End & Grade**
4. Tap **Back To Test** → dialog dismisses, session continues normally
5. Tap **End Without Grading** → snackbar appears with "Session ended — no grade recorded", then app navigates to assignments tab
6. In Supabase: confirm `tutor_sessions.status = 'abandoned'` for that session row
7. In Supabase: confirm `student_assignments.status` reverted to `'not_started'` (if it was `'in_progress'`)
8. Tap **End & Grade** → existing grading flow is unchanged, navigates to session-results screen
