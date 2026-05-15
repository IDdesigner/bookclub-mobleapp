# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

All commands run from `student-app/`:

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android emulator
npm run ios        # Run on iOS simulator
npm run web        # Run in browser
```

No test runner or linter is configured.

## Environment Setup

Create `student-app/.env` with:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_ANTHROPIC_API_KEY=
EXPO_PUBLIC_OPENAI_API_KEY=
```

The `EXPO_PUBLIC_` prefix is required for Expo to expose variables to the client bundle.

## Architecture

### Stack
- **Framework:** React Native + Expo (New Architecture enabled)
- **Routing:** Expo Router (file-based, like Next.js App Router)
- **State:** Zustand for client state (`stores/`), React Query for server state
- **Backend:** Supabase (Postgres + Auth)
- **AI:** Anthropic Claude (`lib/anthropic.ts`) for tutoring logic; OpenAI (`lib/openai.ts`) for Whisper STT and TTS
- **UI:** React Native Paper (Material Design)

### Routing Structure

`app/` uses Expo Router file-based routing:

- `(auth)/` — Login and join-class screens (unauthenticated)
- `(tabs)/` — Main tabbed interface: assignments, progress, profile
- `assignment/[id]` — Assignment detail
- `test-mode-selection/[id]` — Choose text vs. voice tutoring mode
- `tutor-session/[sessionId]` — Text-based Socratic tutoring chat
- `tutor-session-voice/[sessionId]` — Voice-based tutoring
- `session-results/[sessionId]` — Post-session grade display
- `reading-material/[id]` — Reading content viewer

`app/index.tsx` checks auth state and redirects to `(auth)` or `(tabs)`.

### Auth Flow

`stores/authStore.ts` (Zustand) holds session, studentId, classId. On startup, `initialize()` validates the Supabase session from `expo-secure-store`. Students sign up by joining a class via invite code (`signUpAndJoinClass`).

### Tutoring Session Flow

1. Student selects an assignment → `test-mode-selection/[id]` chooses text or voice
2. A `tutor_sessions` row is created in Supabase; its ID drives all subsequent routes
3. **Text mode:** `tutor-session/[sessionId]` — student types responses; Claude generates Socratic follow-up questions via `generateTutorResponse()` in `lib/anthropic.ts`
4. **Voice mode:** `tutor-session-voice/[sessionId]` — audio recorded → Whisper transcription → Claude response → OpenAI TTS playback
5. On session end, `lib/grading.ts` calls GPT-4o to score each rubric criterion and stores results in `turn_grades` / `session_grades`

### Data Layer

React Query handles all Supabase fetches with keys like `['assignments', studentId]` and `['turns', sessionId]`. Mutations create/update `tutor_sessions`, `tutor_turns`, and `student_assignments`.

Database schema and SQL migrations are in `Knowledge Bank/` at the repo root.
