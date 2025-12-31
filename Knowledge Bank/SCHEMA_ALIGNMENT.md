# Database Schema Alignment

This document outlines the database schema corrections made to align the mobile app with the existing Supabase database from the teacher portal.

## Summary

✅ **No new tables need to be created in Supabase**

All required tables already exist from the teacher portal setup. The mobile app code has been updated to match the actual database schema.

---

## Schema Corrections Made

### 1. Table Names

| Original (Mobile App) | Corrected (Actual DB) | Status |
|----------------------|---------------------|--------|
| `rubrics` | `assignment_rubrics` | ✅ Fixed |

### 2. Column Names in `tutor_turns` Table

| Original | Corrected | Status |
|----------|-----------|--------|
| `turn_number` | `turn_index` | ✅ Fixed |
| `speaker` | `role` | ✅ Fixed |
| `message` | `content` | ✅ Fixed |

### 3. Column Names in `turn_grades` Table

| Original | Corrected | Status |
|----------|-----------|--------|
| `score` | `score_0_4` | ✅ Fixed |
| `feedback` | `rationale` | ✅ Fixed |
| - | `missing_points` | ✅ Added |
| - | `next_difficulty` | ✅ Added |

### 4. Removed Non-Existent Columns

**In `tutor_sessions`:**
- ❌ `current_rubric_index` - Does NOT exist in schema
  - Solution: Calculate current rubric dynamically based on turn count

**In `students`:**
- ❌ `nickname` - Does NOT exist
- ❌ `grade_level` - Does NOT exist
- ✅ `email` - EXISTS (was missing, now added)

**In `assignments`:**
- ❌ `reading_text` - Does NOT exist
- ✅ Replaced with: `pasted_text` (for pasted content) OR `book_id` + `chapter_ids` (for book content)
- ✅ Added: `content_type`, `ai_voice`, `ai_tone`, `evidence_required`

---

## Updated TypeScript Interfaces

### AssignmentRubric (formerly Rubric)
```typescript
export interface AssignmentRubric {
  id: string;
  assignment_id: string;
  rubric_title: string;
  description?: string;
  what_this_tests: string;
  ai_looking_for: string;
  strong_mastery: string;      // Grading criteria
  adequate: string;
  emerging: string;
  minimal: string;
  no_evidence: string;
  example_ai_followup_if_weak?: string;
  weight: number;
  order_index: number;
  created_at: string;
}
```

### TutorTurn
```typescript
export interface TutorTurn {
  id: string;
  session_id: string;
  turn_index: number;           // NOT turn_number
  role: 'ai' | 'student';       // NOT speaker
  content: string;              // NOT message
  created_at: string;
}
```

### Assignment
```typescript
export interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  content_type: 'book' | 'pasted_text';
  book_id?: string;
  chapter_ids?: string[];
  pasted_text?: string;
  page_range_start?: number;
  page_range_end?: number;
  ai_voice: 'supportive' | 'strict' | 'playful';
  ai_tone: 'easy' | 'medium' | 'hard';
  evidence_required: boolean;
  due_date?: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}
```

### TurnGrade
```typescript
export interface TurnGrade {
  id: string;
  turn_id: string;
  rubric_id: string;
  score_0_4: number;            // 0-4 scale
  rationale?: string;           // NOT feedback
  missing_points?: string;
  next_difficulty?: 'easy' | 'medium' | 'hard';
  created_at: string;
}
```

---

## Files Updated

1. **[types/database.types.ts](types/database.types.ts)** - All interface definitions
2. **[app/assignment/[id].tsx](app/assignment/[id].tsx)** - Assignment detail screen
3. **[app/tutor-session/[sessionId].tsx](app/tutor-session/[sessionId].tsx)** - Tutor session screen

---

## Database Tables (Complete List)

### Core Tables Already in Supabase

1. ✅ `students`
2. ✅ `classes`
3. ✅ `class_students` (junction)
4. ✅ `assignments`
5. ✅ `assignment_students` (junction)
6. ✅ `assignment_rubrics`
7. ✅ `tutor_sessions`
8. ✅ `tutor_turns`
9. ✅ `turn_grades`
10. ✅ `mastery_snapshots`
11. ✅ `books`
12. ✅ `chapters`

### Features

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ 22+ performance indexes
- ✅ Auto-updating timestamps with triggers
- ✅ Foreign key constraints

---

## No Action Required

You do NOT need to:
- ❌ Create any new tables
- ❌ Run any migrations
- ❌ Modify the existing Supabase schema

The mobile app now correctly references your existing database structure.

---

## Next Steps for Development

1. **Add environment variables** to `.env` file
2. **Test the app** with Expo Go
3. **Create test data** in teacher portal
4. **Verify mobile app** can read assignments and create sessions
5. **Implement full AI integration** in tutor session screen
