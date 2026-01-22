/*
  # Create user custom exercises table

  1. New Tables
    - `user_custom_exercises`
      - `id` (uuid, primary key) - unique identifier for each custom exercise
      - `user_id` (uuid, foreign key) - user who created the exercise
      - `name` (text) - exercise name
      - `description` (text) - how to perform the exercise
      - `difficulty` (integer) - difficulty level 1-5
      - `video_url` (text, nullable) - URL to exercise video
      - `equipment` (text, nullable) - equipment needed (barbell, dumbbell, bodyweight, etc.)
      - `main_muscle_group` (text, nullable) - primary muscle group targeted
      - `muscle_data` (jsonb) - muscle activation data (Chest, Back, Legs, etc.)
      - `usage_count` (integer) - times this exercise has been used
      - `created_at` (timestamp) - when created
      - `updated_at` (timestamp) - when last updated

  2. Security
    - Enable RLS on `user_custom_exercises` table
    - Add policy for authenticated users to create custom exercises
    - Add policy for authenticated users to read their own custom exercises
    - Add policy for authenticated users to update their own custom exercises
    - Add policy for authenticated users to delete their own custom exercises

  3. Indexes
    - Index on user_id for faster lookups
    - Index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS user_custom_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  difficulty integer DEFAULT 3,
  video_url text,
  equipment text DEFAULT 'Bodyweight',
  main_muscle_group text DEFAULT 'General',
  muscle_data jsonb DEFAULT '{}'::jsonb,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE user_custom_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own custom exercises"
  ON user_custom_exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own custom exercises"
  ON user_custom_exercises
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom exercises"
  ON user_custom_exercises
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom exercises"
  ON user_custom_exercises
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_custom_exercises_user_id_idx ON user_custom_exercises(user_id);
CREATE INDEX IF NOT EXISTS user_custom_exercises_created_at_idx ON user_custom_exercises(created_at DESC);
