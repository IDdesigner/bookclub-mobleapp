-- Add student_assignments table to track assignment status per student
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. Create student_assignments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'retake')),
  current_session_id UUID REFERENCES tutor_sessions(id) ON DELETE SET NULL,
  latest_score DECIMAL(5,2), -- percentage score (0-100)
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, assignment_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_assignments_student_id ON student_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_assignments_assignment_id ON student_assignments(assignment_id);

-- ============================================================================
-- 2. Add RLS policies
-- ============================================================================

ALTER TABLE student_assignments ENABLE ROW LEVEL SECURITY;

-- Students can read their own assignment status
CREATE POLICY "Students can read their own assignment status"
ON student_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = student_assignments.student_id
    AND students.auth_user_id = auth.uid()
  )
);

-- Students can update their own assignment status
CREATE POLICY "Students can update their own assignment status"
ON student_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = student_assignments.student_id
    AND students.auth_user_id = auth.uid()
  )
);

-- Students can insert their own assignment status
CREATE POLICY "Students can insert their own assignment status"
ON student_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = student_assignments.student_id
    AND students.auth_user_id = auth.uid()
  )
);

-- Teachers can read assignment status for students in their classes
CREATE POLICY "Teachers can read their students assignment status"
ON student_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON c.id = a.class_id
    WHERE a.id = student_assignments.assignment_id
    AND c.teacher_id = auth.uid()
  )
);

-- ============================================================================
-- 3. Add session_grades table for final grades
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE UNIQUE,
  overall_score DECIMAL(5,2) NOT NULL, -- percentage (0-100)
  rubric_scores JSONB NOT NULL, -- { rubric_id: { score: number, feedback: string, evidence: string[] } }
  ai_feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_session_grades_session_id ON session_grades(session_id);

-- ============================================================================
-- 4. Add RLS policies for session_grades
-- ============================================================================

ALTER TABLE session_grades ENABLE ROW LEVEL SECURITY;

-- Students can read grades for their own sessions
CREATE POLICY "Students can read their own session grades"
ON session_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tutor_sessions ts
    JOIN students s ON s.id = ts.student_id
    WHERE ts.id = session_grades.session_id
    AND s.auth_user_id = auth.uid()
  )
);

-- System can insert grades
CREATE POLICY "Authenticated users can insert session grades"
ON session_grades
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Teachers can read grades for their students
CREATE POLICY "Teachers can read their students session grades"
ON session_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tutor_sessions ts
    JOIN assignments a ON a.id = ts.assignment_id
    JOIN classes c ON c.id = a.class_id
    WHERE ts.id = session_grades.session_id
    AND c.teacher_id = auth.uid()
  )
);

-- ============================================================================
-- 5. Trigger to update student_assignments when session is completed
-- ============================================================================

CREATE OR REPLACE FUNCTION update_student_assignment_on_session_complete()
RETURNS TRIGGER AS $$
DECLARE
  student_assignment_record RECORD;
  session_score DECIMAL(5,2);
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Get the session grade if it exists
    SELECT overall_score INTO session_score
    FROM session_grades
    WHERE session_id = NEW.id;

    -- Check if student_assignment record exists
    SELECT * INTO student_assignment_record
    FROM student_assignments
    WHERE student_id = NEW.student_id
    AND assignment_id = NEW.assignment_id;

    IF student_assignment_record IS NULL THEN
      -- Create new record
      INSERT INTO student_assignments (
        student_id,
        assignment_id,
        status,
        current_session_id,
        latest_score,
        attempts,
        last_attempt_at
      ) VALUES (
        NEW.student_id,
        NEW.assignment_id,
        'retake',
        NEW.id,
        session_score,
        1,
        NEW.completed_at
      );
    ELSE
      -- Update existing record
      UPDATE student_assignments
      SET
        status = 'retake',
        current_session_id = NEW.id,
        latest_score = COALESCE(session_score, latest_score),
        attempts = attempts + 1,
        last_attempt_at = NEW.completed_at,
        updated_at = NOW()
      WHERE student_id = NEW.student_id
      AND assignment_id = NEW.assignment_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tutor_session_completed ON tutor_sessions;
CREATE TRIGGER on_tutor_session_completed
  AFTER UPDATE ON tutor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_student_assignment_on_session_complete();

-- ============================================================================
-- DONE!
-- ============================================================================
