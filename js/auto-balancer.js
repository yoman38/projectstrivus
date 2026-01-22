import { supabase } from './supabase-client.js';
import { getUser } from './auth-guard.js';

const MUSCLE_GROUPS = [
  'Lats', 'Chest', 'Deltoids', 'Biceps', 'Triceps',
  'Abs', 'Forearm', 'Quads', 'Hams', 'Calfs',
  'Glutes', 'Lumbar', 'Trapezius'
];

const MUSCLE_CATEGORY_MAP = {
  upper_push: ['Chest', 'Deltoids', 'Triceps'],
  upper_pull: ['Lats', 'Biceps', 'Trapezius', 'Forearm'],
  core: ['Abs', 'Lumbar'],
  lower: ['Quads', 'Hams', 'Glutes', 'Calfs']
};

async function getCurrentUserWithFallback() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (err) {
    console.warn('Failed to fetch user from auth:', err.message);
  }
  return getUser();
}

export async function calculateBalancedTargets() {
  try {
    const user = await getCurrentUserWithFallback();
    if (!user) {
      return getDefaultBalancedTargets();
    }

    const readinessData = await getMuscleReadiness(user.id);
    const recentWorkouts = await getRecentWorkoutTypes(user.id, 7);

    return computeBalancedTargets(readinessData, recentWorkouts);
  } catch (error) {
    console.error('Error calculating balanced targets:', error);
    return getDefaultBalancedTargets();
  }
}

async function getMuscleReadiness(userId) {
  const { data: latestMetric } = await supabase
    .from('user_fitness_metrics')
    .select('muscle_group_fatigue, fitness_score, fatigue_score, form_score, metric_date')
    .eq('user_id', userId)
    .order('metric_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestMetric || !latestMetric.muscle_group_fatigue) {
    return getDefaultReadiness();
  }

  const { data: historicalMetrics } = await supabase
    .from('user_fitness_metrics')
    .select('muscle_group_fatigue, metric_date')
    .eq('user_id', userId)
    .gte('metric_date', new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('metric_date', { ascending: false });

  const muscleFatigue = latestMetric.muscle_group_fatigue;
  const muscleFitness = calculateMuscleFitness(historicalMetrics || []);
  const readiness = calculateMuscleReadiness(muscleFitness, muscleFatigue);

  return {
    readiness,
    muscleFatigue,
    muscleFitness,
    formScore: latestMetric.form_score || 0
  };
}

function calculateMuscleFitness(historicalMetrics) {
  const muscleFitness = {};

  MUSCLE_GROUPS.forEach(muscle => {
    const muscleData = historicalMetrics
      .map(m => m.muscle_group_fatigue?.[muscle] || 0)
      .filter(v => v > 0);

    if (muscleData.length > 0) {
      muscleFitness[muscle] = muscleData.reduce((sum, val) => sum + val, 0) / muscleData.length;
    } else {
      muscleFitness[muscle] = 50;
    }
  });

  return muscleFitness;
}

function calculateMuscleReadiness(muscleFitness, muscleFatigue) {
  const readiness = {};

  MUSCLE_GROUPS.forEach(muscle => {
    const fitness = muscleFitness[muscle] || 50;
    const fatigue = muscleFatigue[muscle] || 0;

    if (fitness === 0) {
      readiness[muscle] = 100;
    } else {
      const ratio = fatigue / fitness;
      readiness[muscle] = Math.max(0, Math.min(100, 100 - (ratio * 100)));
    }
  });

  return readiness;
}

async function getRecentWorkoutTypes(userId, days) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: recentWorkouts } = await supabase
    .from('workouts')
    .select('id, workout_date, activity_type')
    .eq('user_id', userId)
    .gte('workout_date', startDate)
    .order('workout_date', { ascending: false });

  if (!recentWorkouts || recentWorkouts.length === 0) {
    return [];
  }

  const { data: workoutExercises } = await supabase
    .from('workout_exercises')
    .select('workout_id, exercise_name')
    .in('workout_id', recentWorkouts.map(w => w.id));

  const workoutTypes = new Set();

  recentWorkouts.forEach(workout => {
    if (workout.activity_type === 'weightlifting' || workout.activity_type === 'mixed') {
      const exercises = workoutExercises?.filter(e => e.workout_id === workout.id) || [];

      if (exercises.some(e => isUpperBodyExercise(e.exercise_name))) {
        workoutTypes.add('upper');
      }
      if (exercises.some(e => isLowerBodyExercise(e.exercise_name))) {
        workoutTypes.add('lower');
      }
      if (exercises.some(e => isCoreExercise(e.exercise_name))) {
        workoutTypes.add('core');
      }
    }

    if (['running', 'cycling', 'swimming'].includes(workout.activity_type)) {
      workoutTypes.add('cardio');
    }
  });

  return Array.from(workoutTypes);
}

function isUpperBodyExercise(name) {
  const upper = /bench|press|pull|row|curl|extension|dip|pushup|fly|raise|shrug/i;
  return upper.test(name);
}

function isLowerBodyExercise(name) {
  const lower = /squat|lunge|deadlift|leg|calf|glute|hip/i;
  return lower.test(name);
}

function isCoreExercise(name) {
  const core = /plank|crunch|situp|ab|core|twist|woodchop/i;
  return core.test(name);
}

function computeBalancedTargets(readinessData, recentWorkouts) {
  const { readiness, formScore } = readinessData;
  const targets = {};

  MUSCLE_GROUPS.forEach(muscle => {
    const readinessScore = readiness[muscle] || 50;
    targets[muscle] = readinessScore;

    if (targets[muscle] < 15) targets[muscle] = 15;
  });

  if (!recentWorkouts.includes('upper')) {
    MUSCLE_CATEGORY_MAP.upper_push.forEach(m => {
      targets[m] = Math.min(100, targets[m] * 1.4);
    });
    MUSCLE_CATEGORY_MAP.upper_pull.forEach(m => {
      targets[m] = Math.min(100, targets[m] * 1.4);
    });
  }

  if (!recentWorkouts.includes('lower')) {
    MUSCLE_CATEGORY_MAP.lower.forEach(m => {
      targets[m] = Math.min(100, targets[m] * 1.4);
    });
  }

  if (!recentWorkouts.includes('core')) {
    MUSCLE_CATEGORY_MAP.core.forEach(m => {
      targets[m] = Math.min(100, targets[m] * 1.3);
    });
  }

  const maxTarget = Math.max(...Object.values(targets));
  if (maxTarget > 0) {
    MUSCLE_GROUPS.forEach(muscle => {
      targets[muscle] = Math.round((targets[muscle] / maxTarget) * 100);
    });
  }

  return { targets, readiness, formScore: formScore || 0 };
}

function getDefaultReadiness() {
  const readiness = {};
  MUSCLE_GROUPS.forEach(muscle => {
    readiness[muscle] = 70;
  });

  return {
    readiness,
    muscleFatigue: {},
    muscleFitness: {},
    formScore: 0
  };
}

function getDefaultBalancedTargets() {
  const targets = {};

  targets.Chest = 70;
  targets.Lats = 70;
  targets.Deltoids = 60;
  targets.Biceps = 50;
  targets.Triceps = 50;
  targets.Abs = 50;
  targets.Forearm = 30;
  targets.Quads = 80;
  targets.Hams = 70;
  targets.Glutes = 70;
  targets.Calfs = 40;
  targets.Lumbar = 50;
  targets.Trapezius = 40;

  const readiness = {};
  MUSCLE_GROUPS.forEach(muscle => {
    readiness[muscle] = 70;
  });

  return { targets, readiness, formScore: 0 };
}

export function getReadinessColor(readinessScore) {
  if (readinessScore >= 80) return { color: '#10b981', label: 'Fully Recovered' };
  if (readinessScore >= 60) return { color: '#fbbf24', label: 'Moderate Fatigue' };
  if (readinessScore >= 40) return { color: '#f97316', label: 'Elevated Fatigue' };
  return { color: '#ef4444', label: 'High Fatigue' };
}

export function calculateDifficultyRange(formScore, userHistory = []) {
  let avgRecent = 3;

  if (userHistory.length > 0) {
    const recentDifficulties = userHistory.map(w => w.averageDifficulty || 3);
    avgRecent = recentDifficulties.reduce((sum, d) => sum + d, 0) / recentDifficulties.length;
  }

  let min, max;

  if (formScore > 20) {
    min = Math.max(1, Math.floor(avgRecent));
    max = Math.min(5, Math.ceil(avgRecent + 1));
  } else if (formScore < -20) {
    min = Math.max(1, Math.floor(avgRecent - 1));
    max = Math.max(2, Math.ceil(avgRecent));
  } else {
    min = Math.max(1, Math.floor(avgRecent - 0.5));
    max = Math.min(5, Math.ceil(avgRecent + 0.5));
  }

  return { min, max };
}
