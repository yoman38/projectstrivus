/*
  # Recalculate Metrics with Upsert
  
  Uses UPSERT to handle multiple workouts on the same date.
  Recalculates only the latest metrics per date with muscle tracking.
*/

DO $$
DECLARE
  user_rec RECORD;
  workout_rec RECORD;
  exercise_rec RECORD;
  
  alpha_acute NUMERIC := 2.0 / (7 + 1);
  alpha_chronic NUMERIC := 2.0 / (42 + 1);
  
  acute_load NUMERIC := 0;
  chronic_load NUMERIC := 0;
  
  muscle_fitness JSONB := '{}'::jsonb;
  muscle_fatigue JSONB := '{}'::jsonb;
  
  workout_load NUMERIC;
  muscle_loads JSONB;
  classified_activity TEXT;
  recovery_coeff NUMERIC;
  
  total_volume NUMERIC;
  muscle_name TEXT;
  
BEGIN
  
  FOR user_rec IN 
    SELECT id FROM auth.users 
    WHERE id IN ('76a5c1c0-e6d4-4961-9397-36a7f7f14882', 'b935dc55-de62-4fb8-a4e6-5ea60b2b05a2')
  LOOP
    
    acute_load := 0;
    chronic_load := 0;
    muscle_fitness := jsonb_build_object(
      'Lats', 0, 'Chest', 0, 'Deltoids', 0, 'Biceps', 0, 'Triceps', 0,
      'Abs', 0, 'Forearm', 0, 'Quads', 0, 'Hams', 0, 'Calfs', 0,
      'Glutes', 0, 'Lumbar', 0, 'Trapezius', 0
    );
    muscle_fatigue := muscle_fitness;
    
    FOR workout_rec IN
      SELECT w.workout_date,
             w.duration_minutes,
             w.intensity_rpe,
             COALESCE(
               (SELECT jsonb_agg(
                 jsonb_build_object(
                   'exercise_id', we.exercise_id,
                   'sets_data', we.sets_data
                 )
               )
               FROM workout_exercises we 
               WHERE we.workout_id IN (
                 SELECT id FROM workouts 
                 WHERE user_id = w.user_id AND workout_date = w.workout_date
               )), 
               '[]'::jsonb
             ) as exercises,
             COALESCE(
               (SELECT jsonb_agg(
                 jsonb_build_object(
                   'activity_name', ss.activity_name,
                   'duration_minutes', ss.duration_minutes
                 )
               )
               FROM sport_sessions ss 
               WHERE ss.workout_id IN (
                 SELECT id FROM workouts 
                 WHERE user_id = w.user_id AND workout_date = w.workout_date
               )),
               '[]'::jsonb
             ) as sports,
             COALESCE(
               (SELECT 
                 (sleep_quality::numeric / 3 * 0.4) + 
                 ((6 - stress_level::numeric) / 3 * 0.3) + 
                 (nutrition_quality::numeric / 3 * 0.3)
                FROM user_check_ins 
                WHERE user_id = w.user_id 
                  AND check_in_date = w.workout_date
                LIMIT 1),
               1.0
             ) as recovery_coefficient
      FROM workouts w
      WHERE w.user_id = user_rec.id
      GROUP BY w.workout_date, w.duration_minutes, w.intensity_rpe, w.user_id
      ORDER BY w.workout_date ASC
    LOOP
      
      IF jsonb_array_length(workout_rec.exercises) > 0 AND jsonb_array_length(workout_rec.sports) = 0 THEN
        classified_activity := 'weightlifting';
      ELSIF jsonb_array_length(workout_rec.sports) > 0 THEN
        IF workout_rec.sports::text ILIKE '%run%' THEN
          classified_activity := 'running';
        ELSE
          classified_activity := 'cardio';
        END IF;
      ELSE
        classified_activity := 'mixed';
      END IF;
      
      muscle_loads := jsonb_build_object(
        'Lats', 0, 'Chest', 0, 'Deltoids', 0, 'Biceps', 0, 'Triceps', 0,
        'Abs', 0, 'Forearm', 0, 'Quads', 0, 'Hams', 0, 'Calfs', 0,
        'Glutes', 0, 'Lumbar', 0, 'Trapezius', 0
      );
      workout_load := 0;
      
      IF classified_activity = 'weightlifting' THEN
        FOR exercise_rec IN
          SELECT 
            (exercise->>'exercise_id')::int as exercise_id,
            exercise->'sets_data' as sets
          FROM jsonb_array_elements(workout_rec.exercises) as exercise
        LOOP
          total_volume := 0;
          
          FOR i IN 0..(jsonb_array_length(exercise_rec.sets) - 1) LOOP
            total_volume := total_volume + 
              COALESCE(((exercise_rec.sets->i->>'weight')::numeric * 
                       (exercise_rec.sets->i->>'reps')::numeric), 0);
          END LOOP;
          
          workout_load := workout_load + total_volume;
          
          IF exercise_rec.exercise_id = 1 THEN
            muscle_loads := jsonb_set(muscle_loads, '{Chest}', 
              to_jsonb((muscle_loads->>'Chest')::numeric + total_volume * 0.37));
            muscle_loads := jsonb_set(muscle_loads, '{Triceps}', 
              to_jsonb((muscle_loads->>'Triceps')::numeric + total_volume * 0.20));
            muscle_loads := jsonb_set(muscle_loads, '{Deltoids}', 
              to_jsonb((muscle_loads->>'Deltoids')::numeric + total_volume * 0.12));
          ELSIF exercise_rec.exercise_id = 2 THEN
            muscle_loads := jsonb_set(muscle_loads, '{Quads}', 
              to_jsonb((muscle_loads->>'Quads')::numeric + total_volume * 0.35));
            muscle_loads := jsonb_set(muscle_loads, '{Glutes}', 
              to_jsonb((muscle_loads->>'Glutes')::numeric + total_volume * 0.25));
            muscle_loads := jsonb_set(muscle_loads, '{Hams}', 
              to_jsonb((muscle_loads->>'Hams')::numeric + total_volume * 0.15));
          ELSIF exercise_rec.exercise_id = 3 THEN
            muscle_loads := jsonb_set(muscle_loads, '{Lats}', 
              to_jsonb((muscle_loads->>'Lats')::numeric + total_volume * 0.20));
            muscle_loads := jsonb_set(muscle_loads, '{Glutes}', 
              to_jsonb((muscle_loads->>'Glutes')::numeric + total_volume * 0.25));
            muscle_loads := jsonb_set(muscle_loads, '{Hams}', 
              to_jsonb((muscle_loads->>'Hams')::numeric + total_volume * 0.25));
            muscle_loads := jsonb_set(muscle_loads, '{Lumbar}', 
              to_jsonb((muscle_loads->>'Lumbar')::numeric + total_volume * 0.15));
          ELSIF exercise_rec.exercise_id = 5 THEN
            muscle_loads := jsonb_set(muscle_loads, '{Chest}', 
              to_jsonb((muscle_loads->>'Chest')::numeric + total_volume * 0.35));
            muscle_loads := jsonb_set(muscle_loads, '{Deltoids}', 
              to_jsonb((muscle_loads->>'Deltoids')::numeric + total_volume * 0.25));
            muscle_loads := jsonb_set(muscle_loads, '{Triceps}', 
              to_jsonb((muscle_loads->>'Triceps')::numeric + total_volume * 0.15));
          ELSIF exercise_rec.exercise_id = 6 THEN
            muscle_loads := jsonb_set(muscle_loads, '{Quads}', 
              to_jsonb((muscle_loads->>'Quads')::numeric + total_volume * 0.40));
            muscle_loads := jsonb_set(muscle_loads, '{Glutes}', 
              to_jsonb((muscle_loads->>'Glutes')::numeric + total_volume * 0.30));
          ELSIF exercise_rec.exercise_id = 7 THEN
            muscle_loads := jsonb_set(muscle_loads, '{Biceps}', 
              to_jsonb((muscle_loads->>'Biceps')::numeric + total_volume * 0.60));
          ELSIF exercise_rec.exercise_id = 8 THEN
            muscle_loads := jsonb_set(muscle_loads, '{Triceps}', 
              to_jsonb((muscle_loads->>'Triceps')::numeric + total_volume * 0.60));
          ELSE
            muscle_loads := jsonb_set(muscle_loads, '{Chest}', 
              to_jsonb((muscle_loads->>'Chest')::numeric + total_volume * 0.2));
            muscle_loads := jsonb_set(muscle_loads, '{Triceps}', 
              to_jsonb((muscle_loads->>'Triceps')::numeric + total_volume * 0.15));
            muscle_loads := jsonb_set(muscle_loads, '{Deltoids}', 
              to_jsonb((muscle_loads->>'Deltoids')::numeric + total_volume * 0.15));
          END IF;
        END LOOP;
        
      ELSIF classified_activity = 'running' THEN
        workout_load := (workout_rec.duration_minutes * workout_rec.intensity_rpe * 10);
        
        muscle_loads := jsonb_set(muscle_loads, '{Quads}', to_jsonb(workout_load * 0.30));
        muscle_loads := jsonb_set(muscle_loads, '{Hams}', to_jsonb(workout_load * 0.25));
        muscle_loads := jsonb_set(muscle_loads, '{Glutes}', to_jsonb(workout_load * 0.20));
        muscle_loads := jsonb_set(muscle_loads, '{Calfs}', to_jsonb(workout_load * 0.15));
        muscle_loads := jsonb_set(muscle_loads, '{Lumbar}', to_jsonb(workout_load * 0.05));
        muscle_loads := jsonb_set(muscle_loads, '{Abs}', to_jsonb(workout_load * 0.05));
      ELSE
        workout_load := (workout_rec.duration_minutes * workout_rec.intensity_rpe * 10);
      END IF;
      
      IF acute_load = 0 AND chronic_load = 0 THEN
        acute_load := workout_load;
        chronic_load := workout_load;
      ELSE
        acute_load := (workout_load * alpha_acute) + (acute_load * (1 - alpha_acute));
        chronic_load := (workout_load * alpha_chronic) + (chronic_load * (1 - alpha_chronic));
      END IF;
      
      recovery_coeff := LEAST(1.5, GREATEST(0.5, workout_rec.recovery_coefficient));
      
      FOREACH muscle_name IN ARRAY ARRAY['Lats', 'Chest', 'Deltoids', 'Biceps', 'Triceps', 
                                           'Abs', 'Forearm', 'Quads', 'Hams', 'Calfs', 
                                           'Glutes', 'Lumbar', 'Trapezius'] LOOP
        muscle_fitness := jsonb_set(
          muscle_fitness, 
          ('{' || muscle_name || '}')::text[],
          to_jsonb(
            ((muscle_loads->>muscle_name)::numeric * alpha_chronic) + 
            ((muscle_fitness->>muscle_name)::numeric * (1 - alpha_chronic))
          )
        );
        
        muscle_fatigue := jsonb_set(
          muscle_fatigue,
          ('{' || muscle_name || '}')::text[],
          to_jsonb(
            ((muscle_loads->>muscle_name)::numeric * alpha_acute) + 
            ((muscle_fatigue->>muscle_name)::numeric * recovery_coeff * (1 - alpha_acute))
          )
        );
      END LOOP;
      
      INSERT INTO user_fitness_metrics (
        user_id,
        metric_date,
        fitness_score,
        fatigue_score,
        form_score,
        acwr,
        muscle_group_fatigue
      ) VALUES (
        user_rec.id,
        workout_rec.workout_date,
        chronic_load,
        acute_load,
        chronic_load - acute_load,
        LEAST(2.5, CASE WHEN chronic_load > 0 THEN acute_load / chronic_load ELSE 1.0 END),
        muscle_fatigue
      )
      ON CONFLICT (user_id, metric_date)
      DO UPDATE SET
        fitness_score = EXCLUDED.fitness_score,
        fatigue_score = EXCLUDED.fatigue_score,
        form_score = EXCLUDED.form_score,
        acwr = EXCLUDED.acwr,
        muscle_group_fatigue = EXCLUDED.muscle_group_fatigue;
      
    END LOOP;
    
    RAISE NOTICE 'Recalculated metrics for user %', user_rec.id;
    
  END LOOP;
  
END $$;
