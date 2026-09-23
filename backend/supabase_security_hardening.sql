-- ==============================================================================
-- Redora AI (LifeOS) — Supabase Pre-Launch Security & Hardening Script
-- Enables Row Level Security (RLS) on all tables and locks down Storage Buckets.
-- Run this in the Supabase SQL Editor prior to production deployment.
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL APPLICATION TABLES
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS session_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gpa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS speaking_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mock_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resource_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS practice_questions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. USERS TABLE POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text OR auth.email() = email);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text OR auth.email() = email);

-- ------------------------------------------------------------------------------
-- 3. TASKS TABLE POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own tasks" ON tasks;
CREATE POLICY "Users manage own tasks"
  ON tasks FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

-- ------------------------------------------------------------------------------
-- 4. GOALS TABLE POLICIES (with Public Community Templates support)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own goals" ON goals;
CREATE POLICY "Users manage own goals"
  ON goals FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Public can view goal templates" ON goals;
CREATE POLICY "Public can view goal templates"
  ON goals FOR SELECT
  USING (is_template = 'true');

-- ------------------------------------------------------------------------------
-- 5. MEMORIES TABLE POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own memories" ON memories;
CREATE POLICY "Users manage own memories"
  ON memories FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

-- ------------------------------------------------------------------------------
-- 6. CHAT SESSIONS & CONVERSATIONS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own chat sessions" ON chat_sessions;
CREATE POLICY "Users manage own chat sessions"
  ON chat_sessions FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Users manage own conversations" ON conversations;
CREATE POLICY "Users manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

-- ------------------------------------------------------------------------------
-- 7. SESSION DOCUMENTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own session documents" ON session_documents;
CREATE POLICY "Users manage own session documents"
  ON session_documents FOR ALL
  USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id::text = auth.uid()::text OR user_id IN (SELECT id FROM users WHERE email = auth.email())))
  WITH CHECK (session_id IN (SELECT id FROM chat_sessions WHERE user_id::text = auth.uid()::text OR user_id IN (SELECT id FROM users WHERE email = auth.email())));

-- ------------------------------------------------------------------------------
-- 8. HABITS, ACTIVITY LOGS, SUGGESTIONS & GPA RECORDS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own habits" ON habits;
CREATE POLICY "Users manage own habits"
  ON habits FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Users manage own activity logs" ON activity_logs;
CREATE POLICY "Users manage own activity logs"
  ON activity_logs FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Users manage own suggestions" ON suggestions;
CREATE POLICY "Users manage own suggestions"
  ON suggestions FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Users manage own GPA records" ON gpa_records;
CREATE POLICY "Users manage own GPA records"
  ON gpa_records FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

-- ------------------------------------------------------------------------------
-- 9. SPEAKING PRACTICE & MOCK INTERVIEW SESSIONS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own speaking practice" ON speaking_practice_sessions;
CREATE POLICY "Users manage own speaking practice"
  ON speaking_practice_sessions FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Users manage own mock interviews" ON mock_interview_sessions;
CREATE POLICY "Users manage own mock interviews"
  ON mock_interview_sessions FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

-- ------------------------------------------------------------------------------
-- 10. FLASHCARD DECKS & FLASHCARDS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own flashcard decks" ON flashcard_decks;
CREATE POLICY "Users manage own flashcard decks"
  ON flashcard_decks FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

DROP POLICY IF EXISTS "Users manage own flashcards" ON flashcards;
CREATE POLICY "Users manage own flashcards"
  ON flashcards FOR ALL
  USING (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()))
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (SELECT id FROM users WHERE email = auth.email()));

-- ------------------------------------------------------------------------------
-- 11. SUPABASE STORAGE BUCKET ISOLATION & POLICIES
-- ------------------------------------------------------------------------------
-- Ensure private storage buckets exist with public = false
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('session_documents', 'session_documents', false),
  ('resumes', 'resumes', false),
  ('pdf_tools', 'pdf_tools', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Restrict storage objects: Authenticated users can only access files in their own folder (auth.uid())
DROP POLICY IF EXISTS "Users can only upload to own folder" ON storage.objects;
CREATE POLICY "Users can only upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('session_documents', 'resumes', 'pdf_tools') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can only read own uploaded files" ON storage.objects;
CREATE POLICY "Users can only read own uploaded files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id IN ('session_documents', 'resumes', 'pdf_tools') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can only update own files" ON storage.objects;
CREATE POLICY "Users can only update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('session_documents', 'resumes', 'pdf_tools') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can only delete own files" ON storage.objects;
CREATE POLICY "Users can only delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('session_documents', 'resumes', 'pdf_tools') AND (storage.foldername(name))[1] = auth.uid()::text);
