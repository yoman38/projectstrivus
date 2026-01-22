/*
  # Add Muscle Group Fatigue Tracking

  ## Changes
  
  1. Schema Updates
    - Add `muscle_group_fatigue` JSONB column to `user_fitness_metrics` table
    - Add `activity_type` text column to `workouts` table for automatic classification
    - Add `recovery_coefficient` numeric column to `user_check_ins` for daily recovery calculation
  
  2. Purpose
    - Track fatigue per muscle group (11 groups: Lats, Chest, Deltoids, Biceps, Triceps, Abs, Forearm, Quads, Hams, Calfs, Glutes, Lumbar, Trapezius)
    - Auto-detect activity type (weightlifting, running, cycling, swimming, mixed)
    - Calculate daily recovery modifier from sleep, stress, nutrition
  
  3. Data Structure
    - muscle_group_fatigue: { "Chest": 45.2, "Quads": 78.5, ... }
    - activity_type: "weightlifting" | "running" | "cycling" | "swimming" | "mixed"
    - recovery_coefficient: 0.5 to 1.5 multiplier for fatigue decay rate
*/

DO $$
BEGIN
  -- Add muscle_group_fatigue to user_fitness_metrics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_fitness_metrics' AND column_name = 'muscle_group_fatigue'
  ) THEN
    ALTER TABLE user_fitness_metrics 
    ADD COLUMN muscle_group_fatigue JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add activity_type to workouts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workouts' AND column_name = 'activity_type'
  ) THEN
    ALTER TABLE workouts 
    ADD COLUMN activity_type TEXT DEFAULT 'mixed';
  END IF;

  -- Add recovery_coefficient to user_check_ins
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_check_ins' AND column_name = 'recovery_coefficient'
  ) THEN
    ALTER TABLE user_check_ins 
    ADD COLUMN recovery_coefficient NUMERIC DEFAULT 1.0;
  END IF;
END $$;
