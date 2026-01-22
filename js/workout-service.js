import { supabase } from './supabase-client.js';
import { getUser } from './auth-guard.js';
import { loadExercises } from './exercise-loader.js';
import {
    calculateWorkoutLoad,
    calculateRecoveryCoefficient,
    calculateMuscleFitness,
    calculateMuscleFatigue,
    calculateMuscleReadiness,
    MUSCLE_GROUPS
} from './load-calculator.js';

async function getCurrentUserWithFallback() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return user;
    } catch (err) {
        console.warn('Failed to fetch user from auth:', err.message);
    }
    return getUser();
}

export async function saveWorkout(workoutData) {
    const user = await getCurrentUserWithFallback();
    if (!user) throw new Error('User not authenticated');

    const { workout_date, duration_minutes, intensity_rpe, notes, exercises, sports } = workoutData;

    const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert([{
            user_id: user.id,
            workout_date,
            duration_minutes: parseInt(duration_minutes) || 0,
            intensity_rpe: parseInt(intensity_rpe) || 5,
            notes: notes || ''
        }])
        .select()
        .single();

    if (workoutError) throw workoutError;

    if (exercises && exercises.length > 0) {
        const exerciseRecords = exercises.map(ex => ({
            workout_id: workout.id,
            user_id: user.id,
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            sets_data: ex.sets_data
        }));

        const { error: exerciseError } = await supabase
            .from('workout_exercises')
            .insert(exerciseRecords);

        if (exerciseError) throw exerciseError;

        await updatePersonalRecords(exercises);
    }

    if (sports && sports.length > 0) {
        const sportRecords = sports.map(sport => ({
            workout_id: workout.id,
            user_id: user.id,
            activity_name: sport.activity_name,
            duration_minutes: parseInt(sport.duration_minutes) || 0
        }));

        const { error: sportError } = await supabase
            .from('sport_sessions')
            .insert(sportRecords);

        if (sportError) throw sportError;
    }

    await calculateAndStoreFitnessMetrics(workout_date);

    return workout;
}

async function updatePersonalRecords(exercises) {
    const user = await getCurrentUserWithFallback();
    if (!user) return;

    for (const exercise of exercises) {
        const { exercise_id, exercise_name, sets_data } = exercise;

        if (!sets_data || sets_data.length === 0) continue;

        let maxWeight = 0;
        let maxReps = 0;
        let maxVolume = 0;
        let maxOneRepMax = 0;

        sets_data.forEach(set => {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps) || 0;

            if (weight > maxWeight) maxWeight = weight;
            if (reps > maxReps) maxReps = reps;

            const volume = weight * reps;
            if (volume > maxVolume) maxVolume = volume;

            const estimatedMax = weight * (1 + reps / 30);
            if (estimatedMax > maxOneRepMax) maxOneRepMax = estimatedMax;
        });

        const { data: existingPR } = await supabase
            .from('user_exercise_prs')
            .select('*')
            .eq('user_id', user.id)
            .eq('exercise_id', exercise_id)
            .maybeSingle();

        const prData = {
            user_id: user.id,
            exercise_id,
            exercise_name,
            max_weight: existingPR ? Math.max(existingPR.max_weight, maxWeight) : maxWeight,
            max_reps: existingPR ? Math.max(existingPR.max_reps, maxReps) : maxReps,
            max_volume: existingPR ? Math.max(existingPR.max_volume, maxVolume) : maxVolume,
            max_one_rep_max: existingPR ? Math.max(existingPR.max_one_rep_max, maxOneRepMax) : maxOneRepMax,
            last_performed: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
        };

        if (existingPR) {
            await supabase
                .from('user_exercise_prs')
                .update(prData)
                .eq('id', existingPR.id);
        } else {
            await supabase
                .from('user_exercise_prs')
                .insert([prData]);
        }
    }
}

async function calculateAndStoreFitnessMetrics(workout_date) {
    const user = await getCurrentUserWithFallback();
    if (!user) return;

    await loadExercises();

    const today = new Date(workout_date);
    const fortyTwoDaysAgo = new Date(today);
    fortyTwoDaysAgo.setDate(today.getDate() - 42);

    const { data: recentWorkouts } = await supabase
        .from('workouts')
        .select('*, workout_exercises(*), sport_sessions(*)')
        .eq('user_id', user.id)
        .gte('workout_date', fortyTwoDaysAgo.toISOString().split('T')[0])
        .lte('workout_date', today.toISOString().split('T')[0])
        .order('workout_date', { ascending: true });

    if (!recentWorkouts || recentWorkouts.length === 0) return;

    const { data: checkIns } = await supabase
        .from('user_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in_date', fortyTwoDaysAgo.toISOString().split('T')[0])
        .lte('check_in_date', today.toISOString().split('T')[0])
        .order('check_in_date', { ascending: true });

    const checkInMap = {};
    if (checkIns) {
        checkIns.forEach(ci => {
            checkInMap[ci.check_in_date] = ci;
        });
    }

    let acuteLoad = 0;
    let chronicLoad = 0;
    let muscleFitness = {};
    let muscleFatigue = {};
    MUSCLE_GROUPS.forEach(muscle => {
        muscleFitness[muscle] = 0;
        muscleFatigue[muscle] = 0;
    });

    const alpha_acute = 2 / (7 + 1);
    const alpha_chronic = 2 / (42 + 1);

    for (let i = 0; i < recentWorkouts.length; i++) {
        const workout = recentWorkouts[i];
        const checkIn = checkInMap[workout.workout_date];
        const recoveryCoeff = calculateRecoveryCoefficient(checkIn);

        const loadResult = calculateWorkoutLoad(
            workout,
            workout.workout_exercises,
            workout.sport_sessions
        );

        const workoutLoad = loadResult.totalLoad;

        if (i === 0) {
            acuteLoad = workoutLoad;
            chronicLoad = workoutLoad;
        } else {
            acuteLoad = (workoutLoad * alpha_acute) + (acuteLoad * (1 - alpha_acute));
            chronicLoad = (workoutLoad * alpha_chronic) + (chronicLoad * (1 - alpha_chronic));
        }

        muscleFitness = calculateMuscleFitness(loadResult.muscleLoads, muscleFitness);
        muscleFatigue = calculateMuscleFatigue(loadResult.muscleLoads, muscleFatigue, recoveryCoeff);

        if (workout.activity_type !== loadResult.activityType) {
            await supabase
                .from('workouts')
                .update({ activity_type: loadResult.activityType })
                .eq('id', workout.id);
        }

        if (checkIn && !checkIn.recovery_coefficient) {
            await supabase
                .from('user_check_ins')
                .update({ recovery_coefficient: recoveryCoeff })
                .eq('id', checkIn.id);
        }
    }

    const fitnessScore = chronicLoad;
    const fatigueScore = acuteLoad;
    const formScore = fitnessScore - fatigueScore;
    const acwr = Math.min(2.5, chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0);

    const muscleReadiness = calculateMuscleReadiness(muscleFitness, muscleFatigue);

    const { data: existingMetric } = await supabase
        .from('user_fitness_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('metric_date', workout_date)
        .maybeSingle();

    const metricData = {
        user_id: user.id,
        metric_date: workout_date,
        fitness_score: fitnessScore.toFixed(2),
        fatigue_score: fatigueScore.toFixed(2),
        form_score: formScore.toFixed(2),
        acwr: acwr.toFixed(4),
        muscle_group_data: muscleFatigue,
        muscle_group_fatigue: muscleFatigue
    };

    if (existingMetric) {
        await supabase
            .from('user_fitness_metrics')
            .update(metricData)
            .eq('id', existingMetric.id);
    } else {
        await supabase
            .from('user_fitness_metrics')
            .insert([metricData]);
    }
}

export async function getWorkoutHistory(limit = 50) {
    const user = await getCurrentUserWithFallback();
    if (!user) return [];

    const { data, error } = await supabase
        .from('workouts')
        .select('*, workout_exercises(*), sport_sessions(*)')
        .eq('user_id', user.id)
        .order('workout_date', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

export async function getExerciseHistory(exerciseId, limit = 20) {
    const user = await getCurrentUserWithFallback();
    if (!user) return [];

    const { data, error } = await supabase
        .from('workout_exercises')
        .select('*, workouts(workout_date)')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

export async function getPersonalRecords(exerciseId = null) {
    const user = await getCurrentUserWithFallback();
    if (!user) return [];

    let query = supabase
        .from('user_exercise_prs')
        .select('*')
        .eq('user_id', user.id);

    if (exerciseId) {
        query = query.eq('exercise_id', exerciseId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function saveCheckIn(checkInData) {
    const user = await getCurrentUserWithFallback();
    if (!user) throw new Error('User not authenticated');

    const { check_in_date, sleep_quality, stress_level, nutrition_quality, resting_heart_rate } = checkInData;

    const { data: existingCheckIn } = await supabase
        .from('user_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', check_in_date)
        .maybeSingle();

    const checkInRecord = {
        user_id: user.id,
        check_in_date,
        sleep_quality: parseInt(sleep_quality) || 3,
        stress_level: parseInt(stress_level) || 3,
        nutrition_quality: parseInt(nutrition_quality) || 3,
        resting_heart_rate: resting_heart_rate ? parseInt(resting_heart_rate) : null
    };

    if (existingCheckIn) {
        const { data, error } = await supabase
            .from('user_check_ins')
            .update(checkInRecord)
            .eq('id', existingCheckIn.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('user_check_ins')
            .insert([checkInRecord])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export async function getCheckInHistory(days = 42) {
    const user = await getCurrentUserWithFallback();
    if (!user) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('user_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in_date', startDate.toISOString().split('T')[0])
        .order('check_in_date', { ascending: true });

    if (error) throw error;
    return data;
}

export async function getFitnessMetrics(days = 42) {
    const user = await getCurrentUserWithFallback();
    if (!user) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('user_fitness_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

    if (error) throw error;
    return data;
}

export async function getMuscleReadiness() {
    const user = await getCurrentUserWithFallback();
    if (!user) return null;

    await loadExercises();

    const { data: latestMetric } = await supabase
        .from('user_fitness_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!latestMetric || !latestMetric.muscle_group_fatigue) {
        return null;
    }

    const muscleFatigue = latestMetric.muscle_group_fatigue;

    const fortyTwoDaysAgo = new Date();
    fortyTwoDaysAgo.setDate(fortyTwoDaysAgo.getDate() - 42);

    const { data: historicalMetrics } = await supabase
        .from('user_fitness_metrics')
        .select('muscle_group_fatigue')
        .eq('user_id', user.id)
        .gte('metric_date', fortyTwoDaysAgo.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

    let muscleFitness = {};
    MUSCLE_GROUPS.forEach(muscle => muscleFitness[muscle] = 0);

    if (historicalMetrics && historicalMetrics.length > 0) {
        const alpha = 2.0 / (42 + 1);
        historicalMetrics.forEach(metric => {
            const fatigue = metric.muscle_group_fatigue || {};
            MUSCLE_GROUPS.forEach(muscle => {
                const load = fatigue[muscle] || 0;
                muscleFitness[muscle] = (load * alpha) + (muscleFitness[muscle] * (1 - alpha));
            });
        });
    }

    const readiness = calculateMuscleReadiness(muscleFitness, muscleFatigue);

    return { muscleFatigue, muscleFitness, readiness };
}
