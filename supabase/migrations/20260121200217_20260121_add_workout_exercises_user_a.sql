/*
  # Add Workout Exercises for User A
  
  Populates workout_exercises table with proper exercise data for User A's 15 workouts
  so condition metrics can be calculated correctly
*/

DO $$
DECLARE
  user_a_id uuid := '76a5c1c0-e6d4-4961-9397-36a7f7f14882'::uuid;
  workout_ids uuid[];
  wid uuid;
BEGIN
  
  -- Get all User A workout IDs in chronological order
  SELECT ARRAY_AGG(id ORDER BY workout_date) INTO workout_ids
  FROM workouts 
  WHERE user_id = user_a_id;
  
  -- Session 1: Bench Press, Incline, Tricep Dips
  wid := workout_ids[1];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 1, 'Bench Press', '[[{"weight":80,"reps":8},{"weight":85,"reps":6},{"weight":80,"reps":8}],"kg"]'::jsonb),
    (wid, user_a_id, 5, 'Incline Bench Press', '[[{"weight":65,"reps":10},{"weight":65,"reps":10}],"kg"]'::jsonb),
    (wid, user_a_id, 8, 'Tricep Dips', '[[{"weight":25,"reps":12},{"weight":25,"reps":10}],"kg"]'::jsonb);

  -- Session 2: Deadlift, Rows, Curls
  wid := workout_ids[2];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 3, 'Deadlift', '[[{"weight":110,"reps":5},{"weight":110,"reps":4}],"kg"]'::jsonb),
    (wid, user_a_id, 4, 'Barbell Row', '[[{"weight":90,"reps":8},{"weight":90,"reps":8}],"kg"]'::jsonb),
    (wid, user_a_id, 7, 'Barbell Curl', '[[{"weight":45,"reps":10},{"weight":45,"reps":9}],"kg"]'::jsonb);

  -- Session 3: Squats, Leg Press
  wid := workout_ids[3];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 2, 'Squat', '[[{"weight":130,"reps":8},{"weight":130,"reps":7},{"weight":125,"reps":8}],"kg"]'::jsonb),
    (wid, user_a_id, 6, 'Leg Press', '[[{"weight":260,"reps":10},{"weight":260,"reps":10}],"kg"]'::jsonb);

  -- Session 4: Bench Press, Incline
  wid := workout_ids[4];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 1, 'Bench Press', '[[{"weight":82,"reps":8},{"weight":82,"reps":8},{"weight":78,"reps":8}],"kg"]'::jsonb),
    (wid, user_a_id, 5, 'Incline Bench Press', '[[{"weight":67,"reps":10},{"weight":67,"reps":9}],"kg"]'::jsonb);

  -- Session 5: Deadlift, Rows
  wid := workout_ids[5];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 3, 'Deadlift', '[[{"weight":115,"reps":5},{"weight":115,"reps":5}],"kg"]'::jsonb),
    (wid, user_a_id, 4, 'Barbell Row', '[[{"weight":95,"reps":8},{"weight":95,"reps":7}],"kg"]'::jsonb);

  -- Session 6: Squats, Leg Press
  wid := workout_ids[6];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 2, 'Squat', '[[{"weight":135,"reps":8},{"weight":135,"reps":6},{"weight":130,"reps":8}],"kg"]'::jsonb),
    (wid, user_a_id, 6, 'Leg Press', '[[{"weight":270,"reps":10},{"weight":270,"reps":9}],"kg"]'::jsonb);

  -- Session 7: Chest
  wid := workout_ids[7];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 1, 'Bench Press', '[[{"weight":83,"reps":8},{"weight":83,"reps":7}],"kg"]'::jsonb),
    (wid, user_a_id, 8, 'Tricep Dips', '[[{"weight":27,"reps":12},{"weight":27,"reps":11}],"kg"]'::jsonb);

  -- Session 8: Back
  wid := workout_ids[8];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 3, 'Deadlift', '[[{"weight":117,"reps":5},{"weight":117,"reps":5}],"kg"]'::jsonb),
    (wid, user_a_id, 4, 'Barbell Row', '[[{"weight":97,"reps":8},{"weight":97,"reps":8}],"kg"]'::jsonb);

  -- Session 9: Legs
  wid := workout_ids[9];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 2, 'Squat', '[[{"weight":137,"reps":8},{"weight":137,"reps":7}],"kg"]'::jsonb),
    (wid, user_a_id, 6, 'Leg Press', '[[{"weight":280,"reps":10},{"weight":280,"reps":10}],"kg"]'::jsonb);

  -- Session 10: Chest
  wid := workout_ids[10];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 1, 'Bench Press', '[[{"weight":85,"reps":8},{"weight":85,"reps":7}],"kg"]'::jsonb),
    (wid, user_a_id, 5, 'Incline Bench Press', '[[{"weight":70,"reps":10},{"weight":70,"reps":9}],"kg"]'::jsonb);

  -- Session 11: Back
  wid := workout_ids[11];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 3, 'Deadlift', '[[{"weight":112,"reps":6},{"weight":112,"reps":5}],"kg"]'::jsonb),
    (wid, user_a_id, 7, 'Barbell Curl', '[[{"weight":47,"reps":10},{"weight":47,"reps":9}],"kg"]'::jsonb);

  -- Session 12: Legs
  wid := workout_ids[12];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 2, 'Squat', '[[{"weight":140,"reps":8},{"weight":140,"reps":6}],"kg"]'::jsonb),
    (wid, user_a_id, 6, 'Leg Press', '[[{"weight":290,"reps":10},{"weight":290,"reps":9}],"kg"]'::jsonb);

  -- Session 13: Chest
  wid := workout_ids[13];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 1, 'Bench Press', '[[{"weight":87,"reps":8},{"weight":87,"reps":6}],"kg"]'::jsonb),
    (wid, user_a_id, 8, 'Tricep Dips', '[[{"weight":30,"reps":12},{"weight":30,"reps":10}],"kg"]'::jsonb);

  -- Session 14: Back
  wid := workout_ids[14];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 4, 'Barbell Row', '[[{"weight":100,"reps":8},{"weight":100,"reps":7}],"kg"]'::jsonb),
    (wid, user_a_id, 7, 'Barbell Curl', '[[{"weight":50,"reps":10},{"weight":50,"reps":8}],"kg"]'::jsonb);

  -- Session 15: Legs
  wid := workout_ids[15];
  INSERT INTO workout_exercises (workout_id, user_id, exercise_id, exercise_name, sets_data)
  VALUES
    (wid, user_a_id, 2, 'Squat', '[[{"weight":142,"reps":8},{"weight":142,"reps":7}],"kg"]'::jsonb),
    (wid, user_a_id, 6, 'Leg Press', '[[{"weight":300,"reps":10},{"weight":300,"reps":10}],"kg"]'::jsonb);

  RAISE NOTICE 'Added exercises for 15 workouts for User A';
END $$;
