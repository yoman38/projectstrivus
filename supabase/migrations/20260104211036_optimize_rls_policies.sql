/*
  # Optimize RLS Policies for Better Query Performance

  ## Overview
  This migration updates all Row Level Security (RLS) policies to use the optimized
  pattern `(select auth.uid())` instead of `auth.uid()`. This prevents the auth
  function from being re-evaluated for each row, significantly improving query
  performance at scale.

  ## Changes Made

  ### Tables Updated
  1. `user_profiles` - All RLS policies optimized
  2. `workouts` - All RLS policies optimized  
  3. `workout_exercises` - All RLS policies optimized
  4. `sport_sessions` - All RLS policies optimized
  5. `user_check_ins` - All RLS policies optimized
  6. `user_exercise_prs` - All RLS policies optimized
  7. `user_fitness_metrics` - All RLS policies optimized

  ## Security
  - No changes to security posture
  - Same access controls maintained
  - Only query performance is improved

  ## Notes
  - This is a performance optimization recommended by Supabase
  - The (select ...) wrapper ensures auth.uid() is evaluated once per query
  - See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
*/

-- =====================================================
-- USER PROFILES - Optimized Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- =====================================================
-- WORKOUTS - Optimized Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own workouts" ON workouts;
CREATE POLICY "Users can view own workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own workouts" ON workouts;
CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own workouts" ON workouts;
CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own workouts" ON workouts;
CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- WORKOUT EXERCISES - Optimized Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own workout exercises" ON workout_exercises;
CREATE POLICY "Users can view own workout exercises"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own workout exercises" ON workout_exercises;
CREATE POLICY "Users can insert own workout exercises"
  ON workout_exercises FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own workout exercises" ON workout_exercises;
CREATE POLICY "Users can update own workout exercises"
  ON workout_exercises FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own workout exercises" ON workout_exercises;
CREATE POLICY "Users can delete own workout exercises"
  ON workout_exercises FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- SPORT SESSIONS - Optimized Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own sport sessions" ON sport_sessions;
CREATE POLICY "Users can view own sport sessions"
  ON sport_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own sport sessions" ON sport_sessions;
CREATE POLICY "Users can insert own sport sessions"
  ON sport_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own sport sessions" ON sport_sessions;
CREATE POLICY "Users can update own sport sessions"
  ON sport_sessions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own sport sessions" ON sport_sessions;
CREATE POLICY "Users can delete own sport sessions"
  ON sport_sessions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- USER CHECK-INS - Optimized Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own check-ins" ON user_check_ins;
CREATE POLICY "Users can view own check-ins"
  ON user_check_ins FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own check-ins" ON user_check_ins;
CREATE POLICY "Users can insert own check-ins"
  ON user_check_ins FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own check-ins" ON user_check_ins;
CREATE POLICY "Users can update own check-ins"
  ON user_check_ins FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own check-ins" ON user_check_ins;
CREATE POLICY "Users can delete own check-ins"
  ON user_check_ins FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- USER EXERCISE PERSONAL RECORDS - Optimized Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own exercise PRs" ON user_exercise_prs;
CREATE POLICY "Users can view own exercise PRs"
  ON user_exercise_prs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own exercise PRs" ON user_exercise_prs;
CREATE POLICY "Users can insert own exercise PRs"
  ON user_exercise_prs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own exercise PRs" ON user_exercise_prs;
CREATE POLICY "Users can update own exercise PRs"
  ON user_exercise_prs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own exercise PRs" ON user_exercise_prs;
CREATE POLICY "Users can delete own exercise PRs"
  ON user_exercise_prs FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- USER FITNESS METRICS - Optimized Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own fitness metrics" ON user_fitness_metrics;
CREATE POLICY "Users can view own fitness metrics"
  ON user_fitness_metrics FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own fitness metrics" ON user_fitness_metrics;
CREATE POLICY "Users can insert own fitness metrics"
  ON user_fitness_metrics FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own fitness metrics" ON user_fitness_metrics;
CREATE POLICY "Users can update own fitness metrics"
  ON user_fitness_metrics FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own fitness metrics" ON user_fitness_metrics;
CREATE POLICY "Users can delete own fitness metrics"
  ON user_fitness_metrics FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
