-- Supabase Setup for Mobile App Authentication
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. Add auth_user_id to students table to link with Supabase Auth
-- ============================================================================

ALTER TABLE students
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index to ensure one student per auth user
CREATE UNIQUE INDEX IF NOT EXISTS students_auth_user_id_unique
ON students(auth_user_id);

-- ============================================================================
-- 2. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE turn_grades ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLASSES TABLE POLICIES
-- ============================================================================

-- Allow anyone to read classes by invite code (needed for joining)
CREATE POLICY "Anyone can read classes"
ON classes
FOR SELECT
USING (true);

-- Teachers can manage their own classes
CREATE POLICY "Teachers can insert their own classes"
ON classes
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own classes"
ON classes
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own classes"
ON classes
FOR DELETE
USING (auth.uid() = teacher_id);

-- ============================================================================
-- STUDENTS TABLE POLICIES
-- ============================================================================

-- Students can read their own profile
CREATE POLICY "Students can read their own profile"
ON students
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Students can insert their own profile (during signup)
CREATE POLICY "Students can create their own profile"
ON students
FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Students can update their own profile
CREATE POLICY "Students can update their own profile"
ON students
FOR UPDATE
USING (auth.uid() = auth_user_id);

-- Teachers can read students in their classes
CREATE POLICY "Teachers can read students in their classes"
ON students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    WHERE cs.student_id = students.id
    AND c.teacher_id = auth.uid()
  )
);

-- ============================================================================
-- CLASS_STUDENTS TABLE POLICIES
-- ============================================================================

-- Students can read their own class enrollments
CREATE POLICY "Students can read their own enrollments"
ON class_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = class_students.student_id
    AND students.auth_user_id = auth.uid()
  )
);

-- Students can insert their own enrollments (when joining a class)
CREATE POLICY "Students can join classes"
ON class_students
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = class_students.student_id
    AND students.auth_user_id = auth.uid()
  )
);

-- Teachers can read enrollments in their classes
CREATE POLICY "Teachers can read their class enrollments"
ON class_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_students.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Teachers can manage enrollments in their classes
CREATE POLICY "Teachers can manage their class enrollments"
ON class_students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_students.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- ============================================================================
-- ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- Students can read published assignments in their classes
CREATE POLICY "Students can read published assignments in their classes"
ON assignments
FOR SELECT
USING (
  status = 'published' AND
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN students s ON s.id = cs.student_id
    WHERE cs.class_id = assignments.class_id
    AND s.auth_user_id = auth.uid()
  )
);

-- Teachers can manage assignments in their classes
CREATE POLICY "Teachers can manage their assignments"
ON assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = assignments.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- ============================================================================
-- ASSIGNMENT_RUBRICS TABLE POLICIES
-- ============================================================================

-- Students can read rubrics for assignments they have access to
CREATE POLICY "Students can read rubrics for their assignments"
ON assignment_rubrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN class_students cs ON cs.class_id = a.class_id
    JOIN students s ON s.id = cs.student_id
    WHERE a.id = assignment_rubrics.assignment_id
    AND a.status = 'published'
    AND s.auth_user_id = auth.uid()
  )
);

-- Teachers can manage rubrics for their assignments
CREATE POLICY "Teachers can manage rubrics for their assignments"
ON assignment_rubrics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON c.id = a.class_id
    WHERE a.id = assignment_rubrics.assignment_id
    AND c.teacher_id = auth.uid()
  )
);

-- ============================================================================
-- TUTOR_SESSIONS TABLE POLICIES
-- ============================================================================

-- Students can read their own sessions
CREATE POLICY "Students can read their own sessions"
ON tutor_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = tutor_sessions.student_id
    AND students.auth_user_id = auth.uid()
  )
);

-- Students can create their own sessions
CREATE POLICY "Students can create their own sessions"
ON tutor_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = tutor_sessions.student_id
    AND students.auth_user_id = auth.uid()
  )
);

-- Students can update their own sessions
CREATE POLICY "Students can update their own sessions"
ON tutor_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = tutor_sessions.student_id
    AND students.auth_user_id = auth.uid()
  )
);

-- Teachers can read sessions for students in their classes
CREATE POLICY "Teachers can read sessions for their students"
ON tutor_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON c.id = a.class_id
    WHERE a.id = tutor_sessions.assignment_id
    AND c.teacher_id = auth.uid()
  )
);

-- ============================================================================
-- TUTOR_TURNS TABLE POLICIES
-- ============================================================================

-- Students can read turns in their own sessions
CREATE POLICY "Students can read turns in their sessions"
ON tutor_turns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tutor_sessions ts
    JOIN students s ON s.id = ts.student_id
    WHERE ts.id = tutor_turns.session_id
    AND s.auth_user_id = auth.uid()
  )
);

-- Students can insert turns in their own sessions
CREATE POLICY "Students can insert turns in their sessions"
ON tutor_turns
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tutor_sessions ts
    JOIN students s ON s.id = ts.student_id
    WHERE ts.id = tutor_turns.session_id
    AND s.auth_user_id = auth.uid()
  )
);

-- Teachers can read turns in their students' sessions
CREATE POLICY "Teachers can read turns in their students sessions"
ON tutor_turns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tutor_sessions ts
    JOIN assignments a ON a.id = ts.assignment_id
    JOIN classes c ON c.id = a.class_id
    WHERE ts.id = tutor_turns.session_id
    AND c.teacher_id = auth.uid()
  )
);

-- ============================================================================
-- TURN_GRADES TABLE POLICIES
-- ============================================================================

-- Students can read grades for their own turns
CREATE POLICY "Students can read their own turn grades"
ON turn_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tutor_turns tt
    JOIN tutor_sessions ts ON ts.id = tt.session_id
    JOIN students s ON s.id = ts.student_id
    WHERE tt.id = turn_grades.turn_id
    AND s.auth_user_id = auth.uid()
  )
);

-- System can insert grades (done by AI during tutoring)
CREATE POLICY "Authenticated users can insert grades"
ON turn_grades
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Teachers can read grades for their students
CREATE POLICY "Teachers can read their students grades"
ON turn_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tutor_turns tt
    JOIN tutor_sessions ts ON ts.id = tt.session_id
    JOIN assignments a ON a.id = ts.assignment_id
    JOIN classes c ON c.id = a.class_id
    WHERE tt.id = turn_grades.turn_id
    AND c.teacher_id = auth.uid()
  )
);

-- ============================================================================
-- 3. Database Trigger to create student profile after magic link click
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_student_user()
RETURNS TRIGGER AS $$
DECLARE
  student_record_id UUID;
  class_id_from_metadata UUID;
BEGIN
  -- Get metadata from the user
  class_id_from_metadata := (NEW.raw_user_meta_data->>'class_id')::UUID;

  -- Create student record
  INSERT INTO public.students (name, auth_user_id)
  VALUES (
    NEW.raw_user_meta_data->>'name',
    NEW.id
  )
  RETURNING id INTO student_record_id;

  -- Join student to class if class_id was provided
  IF class_id_from_metadata IS NOT NULL THEN
    INSERT INTO public.class_students (class_id, student_id)
    VALUES (class_id_from_metadata, student_record_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_student_user();

-- ============================================================================
-- DONE!
-- ============================================================================
-- After running this SQL, your mobile app will be able to:
-- 1. Students can sign up with magic links
-- 2. Students can only see their own data
-- 3. Teachers can see all data for their students
-- 4. All tables are protected with RLS
-- 5. Student profiles are automatically created when they click the magic link
