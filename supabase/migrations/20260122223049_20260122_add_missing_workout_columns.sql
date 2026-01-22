/*
  # Add Missing Columns to Workouts and Check-ins Tables

  1. Changes to `workouts` table
    - Add `activity_type` column (text) to distinguish between 'strength', 'cardio', 'mixed', 'sport'
    - Defaults to 'strength' for existing records
  
  2. Changes to `user_check_ins` table
    - Add `recovery_coefficient` column (numeric) to store calculated recovery metric
    - Defaults to 1.0 (neutral recovery)
  
  3. Changes to `user_fitness_metrics` table
    - Add `muscle_group_fatigue` column (jsonb) for muscle-specific fatigue tracking
    - Add `muscle_group_readiness` column (jsonb) for muscle-specific readiness scores
  
  4. Performance
    - Add indexes for frequently queried columns
*/

-- Add activity_type to workouts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workouts' AND column_name = 'activity_type'
  ) THEN
    ALTER TABLE workouts ADD COLUMN activity_type text DEFAULT 'strength';
  END IF;
END $$;

-- Add recovery_coefficient to user_check_ins table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_check_ins' AND column_name = 'recovery_coefficient'
  ) THEN
    ALTER TABLE user_check_ins ADD COLUMN recovery_coefficient numeric DEFAULT 1.0;
  END IF;
END $$;

-- Add muscle_group_fatigue to user_fitness_metrics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_fitness_metrics' AND column_name = 'muscle_group_fatigue'
  ) THEN
    ALTER TABLE user_fitness_metrics ADD COLUMN muscle_group_fatigue jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add muscle_group_readiness to user_fitness_metrics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_fitness_metrics' AND column_name = 'muscle_group_readiness'
  ) THEN
    ALTER TABLE user_fitness_metrics ADD COLUMN muscle_group_readiness jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_activity_type ON workouts(activity_type);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_user ON workout_exercises(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_fitness_metrics_user_date ON user_fitness_metrics(user_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_check_ins_user_date ON user_check_ins(user_id, check_in_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_exercise_prs_user ON user_exercise_prs(user_id, exercise_id);
