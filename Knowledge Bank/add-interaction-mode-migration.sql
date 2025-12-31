-- Migration: Add interaction_mode to tutor_sessions table
-- This allows tracking whether the student chose spoken or typed test mode
-- Run this in your Supabase SQL Editor

ALTER TABLE tutor_sessions
ADD COLUMN IF NOT EXISTS interaction_mode TEXT CHECK (interaction_mode IN ('spoken', 'typed')) DEFAULT 'typed';

-- Add index for potential queries filtering by mode
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_interaction_mode ON tutor_sessions(interaction_mode);

-- Comment the column
COMMENT ON COLUMN tutor_sessions.interaction_mode IS 'Student test interaction mode: spoken (voice) or typed (text)';
