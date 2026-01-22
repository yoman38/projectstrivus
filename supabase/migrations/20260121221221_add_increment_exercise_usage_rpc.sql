/*
  # Add RPC function for incrementing exercise usage count
  
  ## Overview
  Creates a safe database function to increment usage_count atomically
  without risk of SQL injection or race conditions.
  
  ## New Function
  - `increment_exercise_usage(exercise_uuid uuid)` - Safely increments usage_count
    - Returns the updated exercise record
    - Handles concurrent updates correctly
    - Automatically updates updated_at timestamp
  
  ## Security
  - Function runs with SECURITY DEFINER but checks user permissions
  - Only allows users to increment their own exercises
*/

CREATE OR REPLACE FUNCTION increment_exercise_usage(exercise_uuid uuid)
RETURNS user_custom_exercises
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_exercise user_custom_exercises;
BEGIN
  UPDATE user_custom_exercises
  SET 
    usage_count = usage_count + 1,
    updated_at = now()
  WHERE id = exercise_uuid
    AND user_id = auth.uid()
  RETURNING * INTO updated_exercise;
  
  RETURN updated_exercise;
END;
$$;
