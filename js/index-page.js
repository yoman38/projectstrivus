import { initAuth, getUser } from './auth-guard.js';
import { supabase } from './supabase-client.js';
import {
    getFitnessMetrics,
    getPersonalRecords,
    getWorkoutHistory,
    saveWorkout as saveWorkoutToSupabase,
    saveCheckIn as saveCheckInToSupabase,
    getCheckInHistory
} from './workout-service.js';
import { calculateBalancedTargets, getReadinessColor, calculateDifficultyRange } from './auto-balancer.js';
import { initializeModeSystem, getCurrentMode, isSimpleMode } from './ui-modes.js';
import { calculateSportTargets, getSportRecommendations, getSportFocusPreferences, getAvailableSports } from './sport-integration.js';
import { PERSONA_CONFIGS, applyPersonaPresets, getPersonaCoachingTone, getPersonaEncouragement } from './persona-configs.js';

let userFitnessData = null;
let userPRs = [];

async function getCurrentUserWithFallback() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return user;
    } catch (err) {
        console.warn('Failed to fetch user from auth:', err.message);
    }
    return getUser();
}

function clearLocalStorageData() {
    localStorage.removeItem('strivusWorkouts');
    localStorage.removeItem('strivusPRs');
    localStorage.removeItem('strivusConditionData');
    localStorage.removeItem('strivusMuscleFatigueData');
}

async function syncDataFromSupabase() {
    try {
        const workouts = await getWorkoutHistory(100);
        const transformedWorkouts = workouts.map(w => ({
            date: w.workout_date,
            intensity: w.intensity_rpe?.toString() || '5',
            notes: w.notes || '',
            exercises: (w.workout_exercises || []).map(ex => ({
                exerciseId: ex.exercise_id,
                exerciseName: ex.exercise_name,
                sets: ex.sets_data || []
            })),
            sports: (w.sport_sessions || []).map(s => ({
                name: s.activity_name,
                duration: s.duration_minutes
            }))
        }));
        localStorage.setItem('strivusWorkouts', JSON.stringify(transformedWorkouts));

        const prs = await getPersonalRecords();
        const transformedPRs = {};
        prs.forEach(pr => {
            transformedPRs[pr.exercise_id] = {
                oneRM: pr.max_one_rep_max ? { value: pr.max_one_rep_max, date: pr.last_performed } : null,
                strength: pr.max_weight ? { weight: pr.max_weight, reps: 5, date: pr.last_performed } : null,
                hypertrophy: pr.max_volume ? { weight: pr.max_weight, reps: 10, date: pr.last_performed } : null,
                endurance: pr.max_reps ? { weight: pr.max_weight, reps: pr.max_reps, date: pr.last_performed } : null
            };
        });
        localStorage.setItem('strivusPRs', JSON.stringify(transformedPRs));

        return true;
    } catch (error) {
        console.error('Error syncing data from Supabase:', error);
        return false;
    }
}

async function syncWorkoutToSupabase(workoutSession) {
    const user = await getCurrentUserWithFallback();
    if (!user) {
        console.error('No authenticated user for sync');
        return false;
    }

    try {
        const workoutData = {
            workout_date: workoutSession.date,
            duration_minutes: workoutSession.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0) * 3, 0) +
                             workoutSession.sports.reduce((sum, s) => sum + (s.duration || 0), 0),
            intensity_rpe: parseInt(workoutSession.intensity) || 5,
            notes: workoutSession.notes || '',
            exercises: workoutSession.exercises.map(ex => ({
                exercise_id: ex.exerciseId,
                exercise_name: ex.exerciseName,
                sets_data: ex.sets
            })),
            sports: workoutSession.sports.map(s => ({
                activity_name: s.name,
                duration_minutes: s.duration
            }))
        };

        await saveWorkoutToSupabase(workoutData);
        return true;
    } catch (error) {
        console.error('Error syncing workout to Supabase:', error);
        return false;
    }
}

async function syncCheckInToSupabase(checkInData, dateStr) {
    const user = await getCurrentUserWithFallback();
    if (!user) {
        console.error('No authenticated user for check-in sync');
        return false;
    }

    try {
        await saveCheckInToSupabase({
            check_in_date: dateStr,
            sleep_quality: checkInData.sleep,
            stress_level: checkInData.stress,
            nutrition_quality: checkInData.nutrition,
            resting_heart_rate: checkInData.rhr ? parseInt(checkInData.rhr) : null
        });
        return true;
    } catch (error) {
        console.error('Error syncing check-in to Supabase:', error);
        return false;
    }
}

async function loadUserData() {
    try {
        const metricsData = await getFitnessMetrics(42);
        if (metricsData.length > 0) {
            userFitnessData = metricsData[metricsData.length - 1];
        }

        userPRs = await getPersonalRecords();

        window.USER_FITNESS_DATA = userFitnessData;
        window.USER_PRS = userPRs;

    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

window.syncWorkoutToSupabase = syncWorkoutToSupabase;
window.syncCheckInToSupabase = syncCheckInToSupabase;
window.clearStrivusLocalStorage = clearLocalStorageData;
window.calculateBalancedTargets = calculateBalancedTargets;
window.getReadinessColor = getReadinessColor;
window.calculateDifficultyRange = calculateDifficultyRange;
window.calculateSportTargets = calculateSportTargets;
window.getSportRecommendations = getSportRecommendations;
window.getSportFocusPreferences = getSportFocusPreferences;
window.getAvailableSports = getAvailableSports;
window.PERSONA_CONFIGS = PERSONA_CONFIGS;
window.applyPersonaPresets = applyPersonaPresets;
window.getPersonaCoachingTone = getPersonaCoachingTone;
window.getPersonaEncouragement = getPersonaEncouragement;
window.isSimpleMode = isSimpleMode;
window.getCurrentMode = getCurrentMode;

(async () => {
    const user = await initAuth();
    if (user) {
        clearLocalStorageData();
        await syncDataFromSupabase();
        await loadUserData();
        initializeModeSystem();
    }
})();
