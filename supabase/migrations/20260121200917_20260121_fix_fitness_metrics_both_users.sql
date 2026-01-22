/*
  # Add Complete Fitness Metrics for Both Users
  
  Calculates and creates fitness metrics for ALL workout dates for both users:
  - User A: Weightlifting (15 workouts)
  - User B: Running (90 workouts)
  
  Metrics calculated:
  - Fitness score (42-day chronic load using exponential weighted moving average)
  - Fatigue score (7-day acute load using exponential weighted moving average)
  - Form score (fitness - fatigue)
  - ACWR (acute:chronic workload ratio)
*/

DO $$
DECLARE
  workout_rec RECORD;
  prev_user_id uuid := NULL;
  acute_load NUMERIC := 0;
  chronic_load NUMERIC := 0;
  alpha_acute NUMERIC := 2.0 / (7 + 1);
  alpha_chronic NUMERIC := 2.0 / (42 + 1);
  workout_load NUMERIC;
  fitness_score NUMERIC;
  fatigue_score NUMERIC;
  form_score NUMERIC;
  acwr_value NUMERIC;
BEGIN
  
  -- Delete existing metrics to recalculate from scratch
  DELETE FROM user_fitness_metrics 
  WHERE user_id IN (
    '76a5c1c0-e6d4-4961-9397-36a7f7f14882'::uuid,
    'b935dc55-de62-4fb8-a4e6-5ea60b2b05a2'::uuid
  );
  
  -- Process both users
  FOR workout_rec IN 
    SELECT 
      user_id,
      workout_date,
      duration_minutes,
      intensity_rpe
    FROM workouts 
    WHERE user_id IN (
      '76a5c1c0-e6d4-4961-9397-36a7f7f14882'::uuid,
      'b935dc55-de62-4fb8-a4e6-5ea60b2b05a2'::uuid
    )
    ORDER BY user_id, workout_date
  LOOP
    
    -- Reset for new user
    IF prev_user_id IS NULL OR prev_user_id != workout_rec.user_id THEN
      acute_load := 0;
      chronic_load := 0;
      prev_user_id := workout_rec.user_id;
    END IF;
    
    workout_load := (workout_rec.duration_minutes * workout_rec.intensity_rpe);
    
    -- EWMA calculation
    IF acute_load = 0 AND chronic_load = 0 THEN
      acute_load := workout_load;
      chronic_load := workout_load;
    ELSE
      acute_load := (workout_load * alpha_acute) + (acute_load * (1 - alpha_acute));
      chronic_load := (workout_load * alpha_chronic) + (chronic_load * (1 - alpha_chronic));
    END IF;
    
    fitness_score := chronic_load;
    fatigue_score := acute_load;
    form_score := fitness_score - fatigue_score;
    acwr_value := CASE 
      WHEN chronic_load > 0 THEN LEAST(acute_load / chronic_load, 2.5)
      ELSE 1.0 
    END;
    
    INSERT INTO user_fitness_metrics (
      user_id,
      metric_date,
      fitness_score,
      fatigue_score,
      form_score,
      acwr
    )
    VALUES (
      workout_rec.user_id,
      workout_rec.workout_date,
      fitness_score,
      fatigue_score,
      form_score,
      acwr_value
    );
    
  END LOOP;

  RAISE NOTICE 'Added fitness metrics for both users';
END $$;
