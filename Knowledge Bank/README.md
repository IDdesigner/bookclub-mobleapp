# Book Club Student App

A React Native mobile application for students to complete reading assignments with AI tutor guidance.

## Setup Instructions

### 1. Configure Environment Variables

Open the `.env` file and add your credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npx expo start
```

### 4. Test on Your iPhone

1. Install **Expo Go** from the App Store on your iPhone
2. Make sure your iPhone and development machine are on the same WiFi network
3. Open the Expo Go app
4. Scan the QR code shown in your terminal

The app will load in Expo Go and you can start testing!

## Features Implemented

### Phase 1 - Foundation ✅
- [x] Expo project with TypeScript
- [x] Supabase client configuration
- [x] Authentication flow (join class)
- [x] Navigation structure with Expo Router
- [x] Zustand state management
- [x] Join class screen with invite code input

### Current Screens

#### Authentication
- **Join Class** - Students enter invite code and name to join a class

#### Main App (Tabs)
- **Assignments** - List of all reading assignments for the student
- **Progress** - Student progress overview and statistics
- **Profile** - Student profile and app settings

#### Assignment Flow
- **Assignment Detail** - View assignment details and start reading session
- **Tutor Session** - Interactive AI tutoring with Socratic dialogue

## Project Structure

```
student-app/
├── app/                          # Expo Router file-based routing
│   ├── (auth)/                   # Authentication screens
│   │   └── join-class.tsx        # Join class with invite code
│   ├── (tabs)/                   # Main app tabs
│   │   ├── assignments.tsx       # Assignments list
│   │   ├── progress.tsx          # Student progress
│   │   └── profile.tsx           # Student profile
│   ├── assignment/
│   │   └── [id].tsx              # Assignment detail screen
│   ├── tutor-session/
│   │   └── [sessionId].tsx       # Active tutoring session
│   ├── index.tsx                 # Entry point
│   └── _layout.tsx               # Root layout
├── lib/
│   └── supabase.ts               # Supabase client setup
├── stores/
│   └── authStore.ts              # Authentication state (Zustand)
├── types/
│   └── database.types.ts         # TypeScript database types
└── .env                          # Environment variables
```

## Next Steps

### Phase 2 - Core Features
- [ ] Enhance assignments list with session status
- [ ] Add assignment filtering (Active/Completed)
- [ ] Display actual rubric completion progress
- [ ] Implement session resume functionality

### Phase 3 - AI Integration
- [ ] Integrate Anthropic API for real AI responses
- [ ] Implement Socratic questioning logic
- [ ] Add grading/evaluation system
- [ ] Store grades in `turn_grades` table

### Phase 4 - Progress & Polish
- [ ] Progress charts and visualizations
- [ ] Notifications for due dates
- [ ] UI animations and transitions
- [ ] Error handling improvements
- [ ] Offline reading support

## Database Schema

The app uses the following Supabase tables:

- `students` - Student profiles
- `classes` - Class information with invite codes
- `class_students` - Junction table linking students to classes
- `assignments` - Reading assignments
- `assignment_students` - Junction table for student assignments
- `rubrics` - Learning objectives for each assignment
- `tutor_sessions` - Active and completed tutoring sessions
- `tutor_turns` - Conversation history (student and AI messages)
- `turn_grades` - Grades assigned by AI for each rubric

## Development Tips

### Hot Reload
Changes to your code will automatically reload in Expo Go.

### Debugging
- Shake your device to open the developer menu
- View console logs in the terminal where `npx expo start` is running

### Troubleshooting

**Issue: Can't connect to development server**
- Ensure iPhone and computer are on the same WiFi
- Try running with tunnel: `npx expo start --tunnel`

**Issue: Environment variables not loading**
- Restart the development server after changing `.env`
- Make sure variable names start with `EXPO_PUBLIC_`

## Building for Production

When ready to deploy:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Create iOS build
eas build --platform ios

# Submit to TestFlight
eas submit --platform ios
```

## Tech Stack

- **React Native** (via Expo)
- **TypeScript**
- **Expo Router** - File-based navigation
- **React Native Paper** - UI components
- **Supabase** - Backend database
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **Anthropic Claude API** - AI tutoring
