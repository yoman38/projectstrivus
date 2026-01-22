/*
  # Recalculate Fitness Metrics for User A
  
  Recalculates all fitness metrics for User A after adding recent workouts
*/

DO $$
DECLARE
  user_a_id uuid := '76a5c1c0-e6d4-4961-9397-36a7f7f14882'::uuid;
  workout_rec RECORD;
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
  
  -- Delete existing metrics for User A
  DELETE FROM user_fitness_metrics WHERE user_id = user_a_id;
  
  -- Process all User A workouts
  FOR workout_rec IN 
    SELECT 
      workout_date,
      duration_minutes,
      intensity_rpe
    FROM workouts 
    WHERE user_id = user_a_id
    ORDER BY workout_date
  LOOP
    
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
      user_a_id,
      workout_rec.workout_date,
      fitness_score,
      fatigue_score,
      form_score,
      acwr_value
    );
    
  END LOOP;

  RAISE NOTICE 'Recalculated fitness metrics for User A';
END $$;
