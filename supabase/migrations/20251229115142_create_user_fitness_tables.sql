/*
  # Strivus Fitness Tracking Database Schema

  ## Overview
  Complete database schema for the Strivus fitness application. Stores user profiles, 
  workout history, exercise performance data, daily check-ins, personal records, and 
  calculated fitness metrics (fatigue, form, ACWR).

  ## New Tables

  ### 1. `user_profiles`
  Extended user profile information beyond Supabase auth.users
  - `id` (uuid, FK to auth.users) - Primary key linked to authenticated user
  - `display_name` (text) - User's display name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### 2. `workouts`
  Records of completed workout sessions
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Links to auth.users
  - `workout_date` (date) - Date the workout was performed
  - `duration_minutes` (integer) - Total workout duration
  - `intensity_rpe` (integer) - Rate of Perceived Exertion (1-10 scale)
  - `notes` (text) - User notes about the session
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `workout_exercises`
  Individual exercises performed within workouts
  - `id` (uuid) - Primary key
  - `workout_id` (uuid, FK) - Links to workouts table
  - `user_id` (uuid, FK) - Links to auth.users
  - `exercise_id` (integer) - Reference to exercise from exercises.json
  - `exercise_name` (text) - Name of the exercise
  - `sets_data` (jsonb) - Array of set objects: [{reps: number, weight: number, time: number}]
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `sport_sessions`
  Non-exercise activities (sports, cardio, etc.)
  - `id` (uuid) - Primary key
  - `workout_id` (uuid, FK) - Links to workouts table
  - `user_id` (uuid, FK) - Links to auth.users
  - `activity_name` (text) - Name of the sport/activity
  - `duration_minutes` (integer) - Duration of the activity
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. `user_check_ins`
  Daily wellness check-ins for recovery tracking
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Links to auth.users
  - `check_in_date` (date) - Date of the check-in
  - `sleep_quality` (integer) - Sleep rating (1-5 scale)
  - `stress_level` (integer) - Stress rating (1-5 scale)
  - `nutrition_quality` (integer) - Nutrition rating (1-5 scale)
  - `resting_heart_rate` (integer, nullable) - Optional RHR measurement
  - `created_at` (timestamptz) - Record creation timestamp

  ### 6. `user_exercise_prs`
  Personal records for each exercise
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Links to auth.users
  - `exercise_id` (integer) - Reference to exercise from exercises.json
  - `exercise_name` (text) - Name of the exercise
  - `max_weight` (decimal, nullable) - Heaviest weight lifted
  - `max_reps` (integer, nullable) - Most reps in a single set
  - `max_volume` (decimal, nullable) - Highest total volume (sets × reps × weight)
  - `max_one_rep_max` (decimal, nullable) - Calculated 1RM
  - `last_performed` (date) - Date of most recent performance
  - `updated_at` (timestamptz) - Last PR update timestamp

  ### 7. `user_fitness_metrics`
  Calculated fitness and fatigue scores over time
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK) - Links to auth.users
  - `metric_date` (date) - Date of the calculation
  - `fitness_score` (decimal) - Chronic training load (42-day EWMA)
  - `fatigue_score` (decimal) - Acute training load (7-day EWMA)
  - `form_score` (decimal) - Fitness minus Fatigue
  - `acwr` (decimal) - Acute:Chronic Workload Ratio
  - `muscle_group_data` (jsonb) - Per-muscle fatigue/fitness data
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security

  All tables have Row Level Security (RLS) enabled with the following policies:

  ### SELECT Policies
  Users can only view their own data (auth.uid() = user_id)

  ### INSERT Policies
  Users can only insert data for themselves (auth.uid() = user_id)

  ### UPDATE Policies
  Users can only update their own data (auth.uid() = user_id)

  ### DELETE Policies
  Users can only delete their own data (auth.uid() = user_id)

  ## Indexes

  Performance indexes are created for:
  - Foreign key relationships (user_id, workout_id)
  - Date-based queries (workout_date, check_in_date, metric_date)
  - Exercise lookups (exercise_id)

  ## Notes

  1. All user_id fields reference auth.users(id) with CASCADE delete
  2. Timestamps use timestamptz for timezone awareness
  3. JSON fields store complex data structures (sets, muscle groups)
  4. Decimal types used for precise weight/volume calculations
  5. Default values prevent null-related calculation errors
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USER PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- WORKOUTS
-- =====================================================

CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes integer DEFAULT 0,
  intensity_rpe integer DEFAULT 5,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date DESC);

-- =====================================================
-- WORKOUT EXERCISES
-- =====================================================

CREATE TABLE IF NOT EXISTS workout_exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id integer NOT NULL,
  exercise_name text NOT NULL,
  sets_data jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout exercises"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout exercises"
  ON workout_exercises FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout exercises"
  ON workout_exercises FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout exercises"
  ON workout_exercises FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_user_id ON workout_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- =====================================================
-- SPORT SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS sport_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_name text NOT NULL,
  duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sport_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sport sessions"
  ON sport_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sport sessions"
  ON sport_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sport sessions"
  ON sport_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sport sessions"
  ON sport_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sport_sessions_workout_id ON sport_sessions(workout_id);
CREATE INDEX IF NOT EXISTS idx_sport_sessions_user_id ON sport_sessions(user_id);

-- =====================================================
-- USER CHECK-INS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_check_ins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  sleep_quality integer DEFAULT 3,
  stress_level integer DEFAULT 3,
  nutrition_quality integer DEFAULT 3,
  resting_heart_rate integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, check_in_date)
);

ALTER TABLE user_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins"
  ON user_check_ins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins"
  ON user_check_ins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins"
  ON user_check_ins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own check-ins"
  ON user_check_ins FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_check_ins_user_id ON user_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_check_ins_date ON user_check_ins(check_in_date DESC);

-- =====================================================
-- USER EXERCISE PERSONAL RECORDS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_exercise_prs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id integer NOT NULL,
  exercise_name text NOT NULL,
  max_weight decimal(10,2) DEFAULT 0,
  max_reps integer DEFAULT 0,
  max_volume decimal(10,2) DEFAULT 0,
  max_one_rep_max decimal(10,2) DEFAULT 0,
  last_performed date,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

ALTER TABLE user_exercise_prs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise PRs"
  ON user_exercise_prs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise PRs"
  ON user_exercise_prs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise PRs"
  ON user_exercise_prs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise PRs"
  ON user_exercise_prs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_exercise_prs_user_id ON user_exercise_prs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_prs_exercise_id ON user_exercise_prs(exercise_id);

-- =====================================================
-- USER FITNESS METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_fitness_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  fitness_score decimal(10,2) DEFAULT 0,
  fatigue_score decimal(10,2) DEFAULT 0,
  form_score decimal(10,2) DEFAULT 0,
  acwr decimal(10,4) DEFAULT 1.0,
  muscle_group_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric_date)
);

ALTER TABLE user_fitness_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fitness metrics"
  ON user_fitness_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fitness metrics"
  ON user_fitness_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fitness metrics"
  ON user_fitness_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fitness metrics"
  ON user_fitness_metrics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_fitness_metrics_user_id ON user_fitness_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fitness_metrics_date ON user_fitness_metrics(metric_date DESC);