import { supabase } from './supabase-client.js';
import { getUser } from './auth-guard.js';

async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return user;
    } catch (err) {
        console.warn('Failed to fetch user from auth:', err.message);
    }
    return getUser();
}

export async function getWorkoutHistory(options = {}) {
    const user = await getCurrentUser();
    if (!user) return { workouts: [], total: 0 };

    const {
        limit = 30,
        offset = 0,
        startDate = null,
        endDate = null,
        activityType = null
    } = options;

    let query = supabase
        .from('workouts')
        .select('*, workout_exercises(*), sport_sessions(*)', { count: 'exact' })
        .eq('user_id', user.id);

    if (startDate) {
        query = query.gte('workout_date', startDate);
    }
    if (endDate) {
        query = query.lte('workout_date', endDate);
    }
    if (activityType && activityType !== 'all') {
        query = query.eq('activity_type', activityType);
    }

    const { data, error, count } = await query
        .order('workout_date', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Error fetching workout history:', error);
        return { workouts: [], total: 0 };
    }

    return { workouts: data || [], total: count || 0 };
}

export async function getWorkoutStats(days = 30) {
    const user = await getCurrentUser();
    if (!user) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: workouts } = await supabase
        .from('workouts')
        .select('*, workout_exercises(*)')
        .eq('user_id', user.id)
        .gte('workout_date', startDateStr)
        .order('workout_date', { ascending: true });

    if (!workouts || workouts.length === 0) {
        return {
            totalWorkouts: 0,
            totalVolume: 0,
            totalDuration: 0,
            averageIntensity: 0,
            exerciseFrequency: {},
            currentStreak: 0,
            longestStreak: 0
        };
    }

    let totalVolume = 0;
    let totalDuration = 0;
    let totalIntensity = 0;
    const exerciseFrequency = {};
    const workoutDates = new Set();

    workouts.forEach(workout => {
        totalDuration += workout.duration_minutes || 0;
        totalIntensity += workout.intensity_rpe || 0;
        workoutDates.add(workout.workout_date);

        if (workout.workout_exercises) {
            workout.workout_exercises.forEach(ex => {
                if (ex.sets_data && Array.isArray(ex.sets_data)) {
                    ex.sets_data.forEach(set => {
                        const weight = parseFloat(set.weight) || 0;
                        const reps = parseInt(set.reps) || 0;
                        totalVolume += weight * reps;
                    });
                }

                const exName = ex.exercise_name || 'Unknown';
                exerciseFrequency[exName] = (exerciseFrequency[exName] || 0) + 1;
            });
        }
    });

    const { currentStreak, longestStreak } = calculateStreaks(Array.from(workoutDates).sort());

    return {
        totalWorkouts: workouts.length,
        totalVolume: Math.round(totalVolume),
        totalDuration,
        averageIntensity: workouts.length > 0 ? (totalIntensity / workouts.length).toFixed(1) : 0,
        exerciseFrequency,
        currentStreak,
        longestStreak
    };
}

function calculateStreaks(sortedDates) {
    if (sortedDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    const today = new Date().toISOString().split('T')[0];

    for (let i = sortedDates.length - 1; i >= 0; i--) {
        const currentDate = new Date(sortedDates[i]);
        const nextDate = i < sortedDates.length - 1 ? new Date(sortedDates[i + 1]) : null;

        if (nextDate) {
            const daysDiff = Math.floor((nextDate - currentDate) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }

        if (sortedDates[sortedDates.length - 1] === today ||
            Math.floor((new Date(today) - new Date(sortedDates[sortedDates.length - 1])) / (1000 * 60 * 60 * 24)) <= 1) {
            if (i === sortedDates.length - 1) {
                currentStreak = tempStreak;
            }
        }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
}

export async function getExerciseHistory(exerciseId, limit = 20) {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('workout_exercises')
        .select('*, workouts(workout_date, intensity_rpe)')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching exercise history:', error);
        return [];
    }

    return data || [];
}

export async function getPersonalRecords(limit = 10) {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('user_exercise_prs')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching PRs:', error);
        return [];
    }

    return data || [];
}

export async function deleteWorkout(workoutId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);

    if (exercisesError) throw exercisesError;

    const { error: sportsError } = await supabase
        .from('sport_sessions')
        .delete()
        .eq('workout_id', workoutId);

    if (sportsError) throw sportsError;

    const { error: workoutError } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', user.id);

    if (workoutError) throw workoutError;

    return true;
}
