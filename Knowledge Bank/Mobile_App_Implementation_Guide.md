# Book Club Mobile App - Implementation Guide

## Overview

This document outlines the implementation strategy for the Book Club student mobile application built with React Native. This app allows students to join classes, complete reading assignments with AI tutor guidance, and track their progress.

---

## Technology Stack

### Core Framework
- **React Native** (via Expo for easier development and testing)
- **TypeScript** for type safety
- **Expo SDK** for streamlined iOS/Android development

### Key Libraries
- **Expo Router** - File-based navigation
- **React Native Paper** or **NativeBase** - UI component library
- **Supabase JS Client** - Backend integration (same database as teacher app)
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Expo SecureStore** - Secure local storage for tokens

### Development & Testing
- **Expo Go** - Test on your iPhone during development
- **EAS Build** - Production builds for App Store
- **Jest** & **React Native Testing Library** - Unit/integration testing

---

## Project Setup

### 1. Initialize Expo Project

```bash
# Navigate to your mobile app directory
cd /path/to/mobile-app-folder

# Create new Expo project with TypeScript
npx create-expo-app@latest student-app --template expo-template-blank-typescript

# Navigate into project
cd student-app

# Install dependencies
npm install @supabase/supabase-js zustand @tanstack/react-query react-hook-form
npm install expo-secure-store expo-router react-native-paper
```

### 2. Project Structure

```
student-app/
├── app/                          # Expo Router file-based routing
│   ├── (auth)/                   # Auth stack
│   │   ├── login.tsx
│   │   └── join-class.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx
│   │   ├── assignments.tsx       # List of assignments
│   │   ├── progress.tsx          # Student progress view
│   │   └── profile.tsx           # Student profile
│   ├── assignment/
│   │   └── [id].tsx              # Individual assignment detail
│   ├── tutor-session/
│   │   └── [sessionId].tsx       # Active tutoring session
│   └── _layout.tsx               # Root layout
├── components/
│   ├── auth/
│   │   └── JoinClassForm.tsx
│   ├── assignments/
│   │   ├── AssignmentCard.tsx
│   │   └── AssignmentStatus.tsx
│   ├── tutor/
│   │   ├── ChatMessage.tsx
│   │   ├── TutorInput.tsx
│   │   └── ProgressIndicator.tsx
│   └── common/
│       ├── Button.tsx
│       └── Card.tsx
├── lib/
│   ├── supabase.ts               # Supabase client setup
│   └── api.ts                    # API helper functions
├── stores/
│   ├── authStore.ts              # Authentication state
│   ├── assignmentStore.ts        # Assignment data
│   └── sessionStore.ts           # Active tutor session state
├── types/
│   └── database.types.ts         # TypeScript types from Supabase
└── utils/
    ├── formatters.ts
    └── validators.ts
```

---

## Core Features & Screens

### 1. Authentication Flow

#### Join Class Screen (`app/(auth)/join-class.tsx`)
- **Purpose**: Students join a class using the invite code from their teacher
- **UI Components**:
  - Text input for 8-character invite code (XXXX-XXXX format)
  - "Join Class" button
  - Auto-format input with dash after 4 characters
  - Error handling for invalid codes

**Implementation Notes**:
```typescript
// Student record creation flow:
// 1. User enters invite code
// 2. Look up class by invite_code in classes table
// 3. Create student record in students table
// 4. Create class_students junction record
// 5. Store student_id in secure storage
// 6. Navigate to assignments list
```

#### Student Profile Creation
- After joining class, prompt for:
  - Student name (required)
  - Optional: nickname, grade level
- Store in `students` table

---

### 2. Assignments List Screen (`app/(tabs)/assignments.tsx`)

**Purpose**: Display all assignments for the student's class

**UI Components**:
- List of assignment cards showing:
  - Assignment title
  - Book/text being read
  - Due date (if set)
  - Status badge: Not Started / In Progress / Completed
  - Progress bar (e.g., "2/5 rubrics completed")
- Filter options: All / Active / Completed
- Pull-to-refresh

**Data Source**:
```sql
-- Query to get student's assignments
SELECT
  a.*,
  COUNT(DISTINCT ts.id) as sessions_count,
  MAX(ts.completed_at) as last_session
FROM assignments a
JOIN assignment_students ast ON ast.assignment_id = a.id
LEFT JOIN tutor_sessions ts ON ts.assignment_id = a.id AND ts.student_id = ast.student_id
WHERE ast.student_id = [current_student_id]
  AND a.status = 'published'
GROUP BY a.id
ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
```

---

### 3. Assignment Detail Screen (`app/assignment/[id].tsx`)

**Purpose**: Show assignment details and allow student to start tutoring session

**UI Components**:
- Assignment title and description
- Reading material preview (first few paragraphs if pasted text)
- List of rubrics/objectives with:
  - Rubric title
  - Weight percentage
  - Completion status per rubric
- "Start Reading Session" or "Continue Session" button
- Due date countdown
- AI tutor settings display (voice, difficulty level)

**Actions**:
- Start new tutor session
- Resume incomplete session
- View past session history

---

### 4. Tutor Session Screen (`app/tutor-session/[sessionId].tsx`)

**Purpose**: Interactive AI tutoring session with Socratic dialogue

**UI Components**:

#### Chat Interface
- Scrollable message list (AI and student messages)
- Message bubbles:
  - AI messages: Left-aligned, gray background
  - Student messages: Right-aligned, blue background
- Typing indicator when AI is "thinking"
- Auto-scroll to latest message

#### Input Area
- Text input for student responses
- "Send" button
- Character counter (optional)
- Microphone button for voice input (future enhancement)

#### Progress Sidebar/Header
- Current rubric being tested
- Rubric progress (e.g., "3/5 objectives completed")
- Session timer
- "Pause Session" button

**Session Flow**:
1. Load or create tutor session from `tutor_sessions` table
2. Display reading material (scrollable text view)
3. AI asks first question based on first rubric
4. Student responds
5. AI evaluates response against rubric criteria
6. AI provides feedback/follow-up questions
7. AI assigns grade for rubric (stored in `turn_grades`)
8. Repeat for all rubrics
9. Mark session as completed when all rubrics assessed

**Technical Implementation**:
```typescript
// Real-time AI conversation flow
// 1. Student submits answer
// 2. Save student turn to tutor_turns table
// 3. Call Anthropic API with:
//    - Assignment text
//    - Current rubric criteria
//    - Conversation history
//    - Grading instructions
// 4. AI responds with evaluation + next question
// 5. Save AI turn to tutor_turns table
// 6. Save grade to turn_grades table
// 7. Display AI response to student
```

---

### 5. Progress Screen (`app/(tabs)/progress.tsx`)

**Purpose**: Show student's overall progress and performance

**UI Components**:
- Summary cards:
  - Total assignments completed
  - Average score across all rubrics
  - Current streak (days in a row)
- Chart/graph of performance over time
- List of completed assignments with scores
- Breakdown by rubric category (if applicable)

**Data Visualization**:
- Bar chart: Scores per assignment
- Pie chart: Performance by rubric type
- Line chart: Progress trend over time

---

### 6. Profile Screen (`app/(tabs)/profile.tsx`)

**Purpose**: Student profile and app settings

**UI Components**:
- Student name and class info
- Edit profile button
- Settings:
  - Notification preferences
  - Theme (light/dark mode)
  - Text size
- Log out button

---

## Database Integration

### Supabase Client Setup (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Key Database Tables Used

**Students Table**:
```sql
students (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  class_id UUID REFERENCES classes(id),
  created_at TIMESTAMP
)
```

**Assignment Access**:
```sql
-- Join through assignment_students to get student's assignments
SELECT a.*
FROM assignments a
JOIN assignment_students ast ON ast.assignment_id = a.id
WHERE ast.student_id = [student_id]
  AND a.status = 'published'
```

**Tutor Sessions**:
```sql
tutor_sessions (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  assignment_id UUID REFERENCES assignments(id),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50) -- 'in_progress', 'completed', 'abandoned'
)
```

---

## AI Tutor Integration

### Anthropic API Setup

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
});

interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function getChatResponse(
  messages: TutorMessage[],
  assignmentText: string,
  currentRubric: Rubric,
  aiSettings: { voice: string; tone: string; evidenceRequired: boolean }
): Promise<string> {
  const systemPrompt = `You are a Socratic tutor helping a student understand "${assignmentText}".

Current Objective: ${currentRubric.rubric_title}
What to assess: ${currentRubric.what_this_tests}
Look for: ${currentRubric.ai_looking_for}

Voice: ${aiSettings.voice}
Difficulty: ${aiSettings.tone}
Evidence Required: ${aiSettings.evidenceRequired ? 'Yes - ask for quotes/examples' : 'No'}

Grading Criteria:
- Strong Mastery: ${currentRubric.strong_mastery}
- Adequate: ${currentRubric.adequate}
- Emerging: ${currentRubric.emerging}
- Minimal: ${currentRubric.minimal}
- No Evidence: ${currentRubric.no_evidence}

After 2-3 exchanges, provide a grade based on the criteria and move to the next objective.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages,
  });

  return response.content[0].text;
}
```

### Grading Logic

After AI evaluates student's understanding of a rubric:
1. Extract grade from AI response (or use structured output)
2. Store in `turn_grades` table:
```sql
INSERT INTO turn_grades (
  turn_id,
  rubric_id,
  score,
  feedback
) VALUES (
  [last_turn_id],
  [current_rubric_id],
  [ai_assigned_score],
  [ai_feedback_text]
);
```

---

## State Management

### Auth Store (`stores/authStore.ts`)

```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  studentId: string | null;
  studentName: string | null;
  classId: string | null;
  isLoading: boolean;
  joinClass: (inviteCode: string, studentName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  studentId: null,
  studentName: null,
  classId: null,
  isLoading: false,

  joinClass: async (inviteCode: string, studentName: string) => {
    // 1. Find class by invite code
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (!classData) throw new Error('Invalid invite code');

    // 2. Create student record
    const { data: studentData } = await supabase
      .from('students')
      .insert([{ name: studentName }])
      .select()
      .single();

    // 3. Join student to class
    await supabase
      .from('class_students')
      .insert([{
        class_id: classData.id,
        student_id: studentData.id,
      }]);

    set({
      studentId: studentData.id,
      studentName: studentName,
      classId: classData.id,
    });
  },

  logout: async () => {
    set({ studentId: null, studentName: null, classId: null });
  },
}));
```

### Session Store (`stores/sessionStore.ts`)

Manages active tutor session state:
- Current session ID
- Conversation history
- Current rubric index
- Session status

---

## Testing on iPhone

### Setup Expo Go
1. Install **Expo Go** from App Store on your iPhone
2. Make sure iPhone and development machine are on same WiFi
3. Run development server:
   ```bash
   npx expo start
   ```
4. Scan QR code with iPhone camera
5. App opens in Expo Go

### Testing Workflow
- **Hot reload**: Changes appear instantly
- **Shake device**: Open developer menu
- **Console logs**: View in terminal where `expo start` is running

### Building for TestFlight (Production Testing)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Create iOS build
eas build --platform ios

# Submit to TestFlight
eas submit --platform ios
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up Expo project with TypeScript
- [ ] Configure Supabase client
- [ ] Build authentication flow (join class)
- [ ] Create basic navigation structure
- [ ] Test on iPhone with Expo Go

### Phase 2: Core Features (Week 2)
- [ ] Assignments list screen
- [ ] Assignment detail screen
- [ ] Basic tutor session UI (chat interface)
- [ ] Store/retrieve tutor turns in database

### Phase 3: AI Integration (Week 3)
- [ ] Integrate Anthropic API
- [ ] Implement Socratic questioning logic
- [ ] Add grading/evaluation system
- [ ] Store session results

### Phase 4: Progress & Polish (Week 4)
- [ ] Progress screen with charts
- [ ] Profile screen
- [ ] Notifications for due dates
- [ ] UI polish and animations
- [ ] Error handling improvements

### Phase 5: Testing & Deployment
- [ ] Comprehensive testing on iPhone
- [ ] Build production version with EAS
- [ ] Submit to TestFlight
- [ ] Beta testing with real students
- [ ] App Store submission

---

## Key Considerations

### Performance
- **Offline support**: Cache assignments and allow offline reading
- **Image optimization**: Use Expo Image for efficient loading
- **List virtualization**: Use FlatList for long assignment/message lists

### Security
- **API Keys**: Store in `.env`, never commit
- **Secure storage**: Use Expo SecureStore for student IDs
- **RLS policies**: Ensure students can only access their own data

### UX Principles
- **Simple navigation**: Students should easily find assignments
- **Clear feedback**: Show loading states, success/error messages
- **Encouragement**: Positive reinforcement in AI responses
- **Accessibility**: Support larger text sizes, screen readers

### Future Enhancements
- Push notifications for assignment due dates
- Voice input for student responses
- Dark mode
- Gamification (badges, streaks, leaderboards)
- Parent portal view
- Offline mode for reading assignments

---

## Environment Variables

Create `.env` file in project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-key
```

**Important**: Add `.env` to `.gitignore`!

---

## Resources & Documentation

### Official Docs
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Anthropic API Docs](https://docs.anthropic.com/)

### Tutorials
- [Expo Router Tutorial](https://docs.expo.dev/router/introduction/)
- [React Query with React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)

### Tools
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Expo Snack](https://snack.expo.dev/) - Test code snippets online

---

## Next Steps

1. **Create new VS Code workspace** for mobile app
2. **Run Expo initialization** commands from this guide
3. **Set up Supabase connection** and test database queries
4. **Build join class screen** as first milestone
5. **Test on your iPhone** using Expo Go

Good luck building the Book Club mobile app! 📱📚
