# Voice Mode Implementation Guide

## Overview

The student app now supports **voice-based tutoring sessions** where students can speak their answers and hear the AI tutor's questions spoken back to them. Text transcripts are shown on screen for both student and AI.

## Architecture

```
Student speaks
    ↓ (expo-av records audio)
OpenAI Whisper API
    ↓ (transcribes to text, shown on screen)
Anthropic Claude API
    ↓ (generates tutor response based on rubrics, shown on screen)
OpenAI TTS API
    ↓ (converts to speech)
expo-av plays audio
```

## Components Created

### 1. OpenAI Service ([lib/openai.ts](../student-app/lib/openai.ts))

**`transcribeAudio(audioUri: string): Promise<string>`**
- Uses OpenAI Whisper API to convert speech to text
- Handles audio file upload via FormData
- Returns transcribed text

**`textToSpeech(text: string, voice?: string): Promise<string>`**
- Uses OpenAI TTS API to convert text to speech
- Supports multiple voices: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
- Default voice: 'nova' (female, natural)
- Returns local file URI to audio file
- Audio saved to cache directory

### 2. Anthropic Tutoring Service ([lib/anthropic.ts](../student-app/lib/anthropic.ts))

**`generateTutorResponse(context: TutorContext): Promise<string>`**
- Builds comprehensive system prompt with:
  - Assignment details and reading material
  - All rubrics with grading criteria
  - Current rubric focus
  - AI voice/tone settings
  - Evidence requirements
- Generates contextual responses based on conversation history
- Keeps responses SHORT (max 300 tokens) for voice
- Uses Claude 3.5 Sonnet

**`shouldMoveToNextRubric(history, index): boolean`**
- Determines when to move to next learning objective
- Currently uses 6 turns per rubric heuristic
- Can be enhanced with more sophisticated logic

### 3. Voice Session Screen ([app/tutor-session-voice/[sessionId].tsx](../student-app/app/tutor-session-voice/[sessionId].tsx))

**Features:**
- ✅ Automatic conversation start with AI greeting
- ✅ Large microphone button for recording
- ✅ Visual feedback (red when recording)
- ✅ Processing indicator while transcribing/thinking
- ✅ Text shown for both student and AI messages
- ✅ Play button on each message to replay audio
- ✅ Auto-scroll as conversation progresses
- ✅ Shows current learning objective
- ✅ Disables recording while processing

**Flow:**
1. Screen loads → AI generates greeting → Converts to speech → Plays audio
2. Student taps microphone → Records audio
3. Student taps stop → Transcribes → Shows text → Saves to DB
4. AI generates response → Shows text → Converts to speech → Plays audio
5. Repeat steps 2-4

## API Keys Required

### OpenAI API Key
Get from: https://platform.openai.com/api-keys

Add to `.env`:
```
EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-key-here
```

**Costs:**
- Whisper (transcription): $0.006 per minute
- TTS (text-to-speech): $15.00 per 1M characters

### Anthropic API Key
Already configured:
```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

**Costs:**
- Claude 3.5 Sonnet: ~$3 per 1M input tokens, ~$15 per 1M output tokens

## Database Migration

Run this in Supabase SQL Editor:

```sql
ALTER TABLE tutor_sessions
ADD COLUMN IF NOT EXISTS interaction_mode TEXT
CHECK (interaction_mode IN ('spoken', 'typed'))
DEFAULT 'typed';
```

## Testing Checklist

- [ ] Add OpenAI API key to `.env`
- [ ] Run database migration
- [ ] Restart Expo server
- [ ] Navigate to assignment
- [ ] Click "Start Assignment Test"
- [ ] Select "Spoken Test"
- [ ] Grant microphone permissions
- [ ] Hear AI's opening question
- [ ] See AI's question as text on screen
- [ ] Tap microphone to record
- [ ] Speak an answer
- [ ] Tap stop
- [ ] See your answer transcribed as text
- [ ] Hear AI's response
- [ ] See AI's response as text
- [ ] Verify conversation continues naturally

## Voice Selection

Current voice: **nova** (warm, friendly female voice)

Other options:
- **alloy** - neutral, balanced
- **echo** - male, clear
- **fable** - expressive, British accent
- **onyx** - deep male voice
- **shimmer** - soft female voice

Change in [tutor-session-voice/[sessionId].tsx](../student-app/app/tutor-session-voice/[sessionId].tsx):242

```typescript
const audioUri = await textToSpeech(aiResponse, 'nova'); // Change voice here
```

## Future Enhancements

### 1. Audio Caching
Store generated audio in Supabase Storage to avoid regenerating the same responses

### 2. Interrupt Detection
Allow students to interrupt AI while it's speaking

### 3. Background Noise Reduction
Pre-process audio before sending to Whisper

### 4. Conversation Summary
Generate summaries at end of session with key points covered

### 5. Advanced Rubric Tracking
More sophisticated logic to determine rubric progression based on response quality

### 6. Offline Mode
Cache some responses for basic offline functionality

### 7. Voice Settings
Let students choose AI voice preference in settings

## Troubleshooting

### "No audio permissions"
- Check device microphone permissions
- On iOS: Settings → App → Microphone
- On Android: Settings → Apps → Permissions → Microphone

### "Failed to transcribe"
- Check OpenAI API key is valid
- Check network connection
- Verify audio file is not corrupted
- Check OpenAI API usage limits

### "Failed to generate speech"
- Check OpenAI API key is valid
- Verify text is not too long (max ~4096 chars)
- Check network connection

### "No AI response"
- Check Anthropic API key is valid
- Check network connection
- Verify assignment has rubrics
- Check console logs for errors

## Code References

- OpenAI Service: [lib/openai.ts](../student-app/lib/openai.ts)
- Anthropic Service: [lib/anthropic.ts](../student-app/lib/anthropic.ts)
- Voice Session: [app/tutor-session-voice/[sessionId].tsx](../student-app/app/tutor-session-voice/[sessionId].tsx)
- Mode Selection: [app/test-mode-selection/[id].tsx](../student-app/app/test-mode-selection/[id].tsx)
- Database Types: [types/database.types.ts](../student-app/types/database.types.ts)
