/*
  # Add Check-ins and Fitness Metrics for User A
  
  1. Creates daily check-ins for User A on all workout days
  2. Calculates and creates fitness metrics based on workout history
     - Fitness score (42-day chronic load)
     - Fatigue score (7-day acute load)
     - Form score (fitness - fatigue)
     - ACWR (acute:chronic workload ratio)
*/

DO $$
DECLARE
  user_a_id uuid := '76a5c1c0-e6d4-4961-9397-36a7f7f14882'::uuid;
  workout_rec RECORD;
  days_back INTEGER;
  chronic_load NUMERIC;
  acute_load NUMERIC;
  fitness_score NUMERIC;
  fatigue_score NUMERIC;
  form_score NUMERIC;
  acwr_value NUMERIC;
BEGIN
  
  -- Add check-ins for User A on all workout days
  INSERT INTO user_check_ins (user_id, check_in_date, sleep_quality, stress_level, nutrition_quality, resting_heart_rate)
  SELECT 
    user_a_id,
    workout_date,
    3 + (RANDOM() * 2)::INTEGER, -- 3-5
    2 + (RANDOM() * 2)::INTEGER, -- 2-4  
    3 + (RANDOM() * 2)::INTEGER, -- 3-5
    62 + (RANDOM() * 8)::INTEGER  -- 62-70 bpm
  FROM workouts
  WHERE user_id = user_a_id
  ON CONFLICT DO NOTHING;

  -- Calculate and insert fitness metrics for each workout date
  FOR workout_rec IN 
    SELECT DISTINCT workout_date 
    FROM workouts 
    WHERE user_id = user_a_id 
    ORDER BY workout_date
  LOOP
    days_back := (CURRENT_DATE - workout_rec.workout_date);
    
    -- Calculate chronic load (42-day exponentially weighted average)
    SELECT COALESCE(SUM(
      duration_minutes * intensity_rpe * EXP(-0.05 * (workout_rec.workout_date - w.workout_date))
    ), 0) INTO chronic_load
    FROM workouts w
    WHERE w.user_id = user_a_id 
      AND w.workout_date <= workout_rec.workout_date
      AND w.workout_date > workout_rec.workout_date - 42;
    
    -- Calculate acute load (7-day exponentially weighted average)
    SELECT COALESCE(SUM(
      duration_minutes * intensity_rpe * EXP(-0.15 * (workout_rec.workout_date - w.workout_date))
    ), 0) INTO acute_load
    FROM workouts w
    WHERE w.user_id = user_a_id 
      AND w.workout_date <= workout_rec.workout_date
      AND w.workout_date > workout_rec.workout_date - 7;
    
    fitness_score := chronic_load * 0.15;
    fatigue_score := acute_load * 0.35;
    form_score := fitness_score - fatigue_score;
    acwr_value := CASE 
      WHEN chronic_load > 0 THEN LEAST(acute_load / chronic_load, 2.0)
      ELSE 1.0 
    END;
    
    -- Insert fitness metrics
    INSERT INTO user_fitness_metrics (
      user_id, 
      metric_date, 
      fitness_score, 
      fatigue_score, 
      form_score, 
      acwr
    )
    VALUES (
      user_a_id,
      workout_rec.workout_date,
      fitness_score,
      fatigue_score,
      form_score,
      acwr_value
    )
    ON CONFLICT DO NOTHING;
    
  END LOOP;

  RAISE NOTICE 'Added check-ins and fitness metrics for User A';
END $$;
