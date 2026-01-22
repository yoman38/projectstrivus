/*
  # Add Recent Workouts for User A
  
  Adds recent workouts from Jan 16 - Jan 20, 2026 to give User A
  more data within the last 42 days for condition tracking
*/

DO $$
DECLARE
  user_a_id uuid := '76a5c1c0-e6d4-4961-9397-36a7f7f14882'::uuid;
  new_workout_id uuid;
BEGIN
  
  -- Jan 17: Back Day
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, '2026-01-17', 65, 7, 'Back and Biceps')
  RETURNING id INTO new_workout_id;
  
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (new_workout_id, user_a_id, 3, 'Deadlift', '[[{"weight":118,"reps":5},{"weight":118,"reps":5}],"kg"]'::jsonb),
    (new_workout_id, user_a_id, 4, 'Barbell Row', '[[{"weight":102,"reps":8},{"weight":102,"reps":7}],"kg"]'::jsonb),
    (new_workout_id, user_a_id, 7, 'Barbell Curl', '[[{"weight":52,"reps":10},{"weight":52,"reps":8}],"kg"]'::jsonb);
  
  -- Jan 19: Leg Day
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, '2026-01-19', 70, 8, 'Leg Strength')
  RETURNING id INTO new_workout_id;
  
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (new_workout_id, user_a_id, 2, 'Squat', '[[{"weight":145,"reps":8},{"weight":145,"reps":7},{"weight":140,"reps":8}],"kg"]'::jsonb),
    (new_workout_id, user_a_id, 6, 'Leg Press', '[[{"weight":310,"reps":10},{"weight":310,"reps":10}],"kg"]'::jsonb);
  
  -- Jan 21: Chest Day (today)
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, '2026-01-21', 60, 7, 'Chest and Triceps')
  RETURNING id INTO new_workout_id;
  
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (new_workout_id, user_a_id, 1, 'Bench Press', '[[{"weight":90,"reps":8},{"weight":90,"reps":7}],"kg"]'::jsonb),
    (new_workout_id, user_a_id, 5, 'Incline Bench Press', '[[{"weight":72,"reps":10},{"weight":72,"reps":9}],"kg"]'::jsonb),
    (new_workout_id, user_a_id, 8, 'Tricep Dips', '[[{"weight":32,"reps":12},{"weight":32,"reps":11}],"kg"]'::jsonb);
  
  -- Add check-ins for these dates
  INSERT INTO user_check_ins (user_id, check_in_date, sleep_quality, stress_level, nutrition_quality, resting_heart_rate)
  VALUES
    (user_a_id, '2026-01-17', 4, 3, 4, 65),
    (user_a_id, '2026-01-19', 3, 3, 4, 67),
    (user_a_id, '2026-01-21', 4, 2, 4, 64)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Added recent workouts for User A';
END $$;
