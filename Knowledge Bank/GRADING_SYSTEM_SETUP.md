# Grading System Setup Guide

## Overview
The grading system has been fully implemented with assignment status tracking and automated grading using GPT-4.

## Database Changes Required

You need to run this SQL migration in your Supabase SQL Editor:

**File**: `Knowledge Bank/add-student-assignments-table.sql`

This migration creates:
1. **student_assignments** table - tracks assignment status per student (not_started, in_progress, completed, retake)
2. **session_grades** table - stores final grades with rubric breakdown
3. Appropriate RLS policies for security
4. Automatic trigger to update student_assignment status when session completes

## How It Works

### 1. Assignment Status Flow

- **Not Started**: Default state when student first sees an assignment
- **In Progress**: Set when student starts a test (clicks "Start Spoken Test" or "Start Typed Test")
- **Retake**: Set when student completes and grades a test (can take it again to improve score)
- **Completed**: (Future enhancement - could be set when score meets a threshold)

### 2. When Student Starts a Test

In `test-mode-selection/[id].tsx`:
- Creates a tutor_session record
- Creates or updates student_assignments to status "in_progress"
- Links the current session to the assignment

### 3. During the Conversation

In `tutor-session-voice/[sessionId].tsx`:
- Student records voice responses
- AI generates questions using GPT-4
- All turns saved to tutor_turns table
- Conversation displayed as chat bubbles

### 4. When Student Ends Conversation

The "End & Grade" button:
1. Marks session as completed
2. Calls grading service with full conversation
3. GPT-4 analyzes responses against each rubric
4. Generates:
   - Score (0-4) for each rubric
   - Specific feedback explaining the score
   - Evidence (quotes from student responses)
   - Overall weighted percentage score
   - Personalized overall feedback
5. Saves grade to session_grades table
6. Updates student_assignments to "retake" status
7. Navigates to results screen

### 5. Results Screen

`session-results/[sessionId].tsx` displays:
- Overall score with color coding
- AI-generated personalized feedback
- Breakdown by rubric showing:
  - Individual rubric scores (0-4)
  - Weight percentage
  - Specific feedback
  - Evidence quotes from conversation
- Options to review conversation or return to assignments

## Files Created/Modified

### New Files
- `lib/grading.ts` - GPT-4 powered grading logic
- `app/session-results/[sessionId].tsx` - Results display screen
- `types/database.types.ts` - Added StudentAssignment and SessionGrade interfaces
- `Knowledge Bank/add-student-assignments-table.sql` - Database migration

### Modified Files
- `app/test-mode-selection/[id].tsx` - Sets status to "in_progress" when starting
- `app/tutor-session-voice/[sessionId].tsx` - Handles grading on "End Conversation"

## Grading Criteria

Grading uses the rubric scale defined in assignment_rubrics:
- **4 (Strong Mastery)**: Rubric.strong_mastery criteria
- **3 (Adequate)**: Rubric.adequate criteria
- **2 (Emerging)**: Rubric.emerging criteria
- **1 (Minimal)**: Rubric.minimal criteria
- **0 (No Evidence)**: Rubric.no_evidence criteria

GPT-4 analyzes student responses and provides:
- Score justification
- Specific evidence from conversation
- Constructive feedback

## Testing

1. Start the app: `npm start` from student-app directory
2. Login as a student
3. Select an assignment
4. Click "Start Assignment Test"
5. Choose "Spoken Test"
6. Have a conversation with the AI
7. Click "End Conversation" → "End & Grade"
8. View results with scores and feedback

## Future Enhancements

- Allow teachers to review and adjust AI grades
- Track grade history across multiple attempts
- Set passing threshold (e.g., 80%) to mark as "completed" vs "retake"
- Generate detailed performance reports
- Compare scores across attempts to show improvement
