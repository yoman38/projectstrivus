/*
  # Populate Test Users Workout Data

  1. User A (Musculation - Weight Training)
    - 15 workouts over 90 days
    - Progressive strength training

  2. User B (Running - Cardio)
    - 90 daily running sessions
    - Daily check-ins for recovery tracking
*/

DO $$
DECLARE
  user_a_id uuid := '76a5c1c0-e6d4-4961-9397-36a7f7f14882'::uuid;
  user_b_id uuid := 'b935dc55-de62-4fb8-a4e6-5ea60b2b05a2'::uuid;
  base_date date := CURRENT_DATE - INTERVAL '90 days';
  workout_id uuid;
  current_date_iter date;
  i integer;
BEGIN

  -- ============ USER A: MUSCULATION SESSIONS ============
  
  -- Session 1
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date, 65, 8, 'Bench Press, Incline, Tricep Dips');
  
  -- Session 2
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 6, 60, 7, 'Deadlift, Rows, Curls');
  
  -- Session 3
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 12, 75, 8, 'Squats, Leg Press');
  
  -- Session 4
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 18, 60, 7, 'Bench Press, Incline');
  
  -- Session 5
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 24, 55, 7, 'Deadlift, Rows');
  
  -- Session 6
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 30, 70, 8, 'Squats, Leg Press');
  
  -- Session 7
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 36, 62, 7, 'Chest Volume Day');
  
  -- Session 8
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 42, 58, 7, 'Back Strength');
  
  -- Session 9
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 48, 72, 8, 'Leg Volume');
  
  -- Session 10
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 54, 60, 7, 'Chest Moderate');
  
  -- Session 11
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 60, 56, 6, 'Back Light');
  
  -- Session 12
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 66, 70, 8, 'Legs Volume');
  
  -- Session 13
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 72, 65, 7, 'Chest Heavy');
  
  -- Session 14
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 78, 60, 7, 'Back Biceps');
  
  -- Session 15
  INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
  VALUES (user_a_id, base_date + 84, 68, 8, 'Legs Final');

  -- ============ USER B: RUNNING (90 DAYS) ============
  FOR i IN 0..89 LOOP
    current_date_iter := base_date + (i || ' days')::interval;
    
    INSERT INTO workouts (user_id, workout_date, duration_minutes, intensity_rpe, notes)
    VALUES (user_b_id, current_date_iter, 30 + (i % 15), 5, 'Daily run')
    RETURNING id INTO workout_id;
    
    INSERT INTO sport_sessions (workout_id, user_id, activity_name, duration_minutes)
    VALUES (workout_id, user_b_id, 'Running', 30 + (i % 15));
    
    INSERT INTO user_check_ins (user_id, check_in_date, sleep_quality, stress_level, nutrition_quality, resting_heart_rate)
    VALUES (user_b_id, current_date_iter, 2 + ((i + 5) % 3), 2 + ((i + 2) % 3), 3, 55 + ((i + 10) % 8));
  END LOOP;

  RAISE NOTICE 'Test data created: User A (15 workouts) + User B (90 workouts)';
END $$;
