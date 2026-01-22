/*
  # User Custom Exercises Table

  ## Overview
  Enables premium users to create their own exercises with muscle activation patterns.
  Stores user-defined exercises alongside standard exercises from exercises.json.

  ## New Table: `user_custom_exercises`
  
  - `id` (uuid, primary key) - Unique exercise identifier
  - `user_id` (uuid, FK to auth.users) - Exercise creator
  - `name` (text) - Exercise name, unique per user
  - `description` (text) - User's description of the exercise
  - `difficulty` (integer) - Difficulty level 1-5
  - `exercise_type` (text[]) - Types: Isotonic, Isometric, Plyometric, Dynamic Mobility
  - `mechanics` (text) - Mechanics: Compound, Isolation, Corrective
  - `equipment` (text[]) - Required equipment
  - `video_url` (text, nullable) - Optional YouTube/video link
  - `notes` (text) - User's personal notes
  - `muscle_data` (jsonb) - Muscle activation values (13 muscles with 0-1 scales)
  - `is_validated` (boolean) - Whether exercise matches standard patterns
  - `validation_score` (decimal) - Similarity to closest standard exercise (0-100)
  - `similar_exercise_id` (integer, nullable) - ID of closest standard exercise match
  - `usage_count` (integer) - Number of times used in workouts
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - RLS enabled: Users can only view/edit/delete their own custom exercises
  - All operations require authentication
  - Data isolation enforced at row level

  ## Indexes
  - user_id for fast user lookups
  - created_at for recent exercises queries
*/

CREATE TABLE IF NOT EXISTS user_custom_exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  difficulty integer DEFAULT 3,
  exercise_type text[] DEFAULT '{}',
  mechanics text DEFAULT 'Isolation',
  equipment text[] DEFAULT '{}',
  video_url text,
  notes text DEFAULT '',
  muscle_data jsonb DEFAULT '{
    "Chest": 0,
    "Lats": 0,
    "Deltoids": 0,
    "Biceps": 0,
    "Triceps": 0,
    "Forearm": 0,
    "Abs": 0,
    "Quads": 0,
    "Hamstrings": 0,
    "Calves": 0,
    "Glutes": 0,
    "Lumbar": 0,
    "Trapezius": 0
  }'::jsonb,
  is_validated boolean DEFAULT false,
  validation_score decimal(5,2) DEFAULT 0,
  similar_exercise_id integer,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE user_custom_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom exercises"
  ON user_custom_exercises FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create custom exercises"
  ON user_custom_exercises FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom exercises"
  ON user_custom_exercises FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom exercises"
  ON user_custom_exercises FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON user_custom_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_created_at ON user_custom_exercises(created_at DESC);
