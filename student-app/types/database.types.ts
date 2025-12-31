// Database Types - Matches actual Supabase schema from teacher portal

export interface Student {
  id: string;
  email?: string;
  name: string;
  created_at: string;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  description?: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

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

export interface AssignmentRubric {
  id: string;
  assignment_id: string;
  rubric_title: string;
  description?: string;
  what_this_tests: string;
  ai_looking_for: string;
  strong_mastery: string;
  adequate: string;
  emerging: string;
  minimal: string;
  no_evidence: string;
  example_ai_followup_if_weak?: string;
  weight: number;
  order_index: number;
  created_at: string;
}

export interface TutorSession {
  id: string;
  student_id: string;
  assignment_id: string;
  started_at: string;
  completed_at?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  interaction_mode?: 'spoken' | 'typed';
}

export interface TutorTurn {
  id: string;
  session_id: string;
  turn_index: number;
  role: 'ai' | 'student';
  content: string;
  created_at: string;
}

export interface TurnGrade {
  id: string;
  turn_id: string;
  rubric_id: string;
  score_0_4: number;
  rationale?: string;
  missing_points?: string;
  next_difficulty?: 'easy' | 'medium' | 'hard';
  created_at: string;
}

export interface MasterySnapshot {
  id: string;
  session_id: string;
  rubric_id: string;
  mastery_score_0_4: number;
  updated_at: string;
}

export interface AssignmentStudent {
  assignment_id: string;
  student_id: string;
  assigned_at: string;
}

export interface ClassStudent {
  class_id: string;
  student_id: string;
  joined_at: string;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  source?: string;
  public_domain_bool: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  number: number;
  title: string;
  source_text_ref?: string;
  status: 'draft' | 'ingested' | 'published';
  created_at: string;
  updated_at: string;
}

export interface StudentAssignment {
  id: string;
  student_id: string;
  assignment_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'retake';
  current_session_id?: string;
  latest_score?: number;
  attempts: number;
  last_attempt_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionGrade {
  id: string;
  session_id: string;
  overall_score: number;
  rubric_scores: {
    [rubricId: string]: {
      score: number;
      feedback: string;
      evidence: string[];
    };
  };
  ai_feedback?: string;
  graded_at: string;
  created_at: string;
}
