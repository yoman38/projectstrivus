import { getMuscleActivation } from './exercise-loader.js';

export const MUSCLE_GROUPS = [
    'Lats', 'Chest', 'Deltoids', 'Biceps', 'Triceps',
    'Abs', 'Forearm', 'Quads', 'Hams', 'Calfs', 'Glutes',
    'Lumbar', 'Trapezius'
];

const SPORT_MUSCLE_PROFILES = {
    running: {
        Quads: 0.30,
        Hams: 0.25,
        Glutes: 0.20,
        Calfs: 0.15,
        Lumbar: 0.05,
        Abs: 0.05,
        Lats: 0, Chest: 0, Deltoids: 0, Biceps: 0, Triceps: 0, Forearm: 0, Trapezius: 0
    },
    cycling: {
        Quads: 0.35,
        Hams: 0.20,
        Glutes: 0.25,
        Calfs: 0.10,
        Lumbar: 0.05,
        Abs: 0.05,
        Lats: 0, Chest: 0, Deltoids: 0, Biceps: 0, Triceps: 0, Forearm: 0, Trapezius: 0
    },
    swimming: {
        Lats: 0.25,
        Chest: 0.15,
        Deltoids: 0.20,
        Triceps: 0.10,
        Biceps: 0.10,
        Abs: 0.10,
        Quads: 0.05,
        Glutes: 0.05,
        Hams: 0, Calfs: 0, Forearm: 0, Lumbar: 0, Trapezius: 0
    }
};

export function classifyActivityType(workout, exercises, sports) {
    if (exercises && exercises.length > 0 && (!sports || sports.length === 0)) {
        return 'weightlifting';
    }

    if (sports && sports.length > 0) {
        const sportNames = sports.map(s => s.activity_name.toLowerCase());

        if (sportNames.some(name => name.includes('run') || name.includes('jog'))) {
            return 'running';
        }
        if (sportNames.some(name => name.includes('cycl') || name.includes('bike'))) {
            return 'cycling';
        }
        if (sportNames.some(name => name.includes('swim'))) {
            return 'swimming';
        }

        if (exercises && exercises.length > 0) {
            return 'mixed';
        }

        return 'cardio';
    }

    return 'mixed';
}

export function calculateWeightliftingLoad(exercises) {
    const muscleLoads = {};
    MUSCLE_GROUPS.forEach(muscle => muscleLoads[muscle] = 0);

    let totalVolume = 0;

    exercises.forEach(exercise => {
        const muscleActivation = getMuscleActivation(exercise.exercise_id);
        if (!muscleActivation) return;

        let exerciseVolume = 0;
        exercise.sets_data.forEach(set => {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps) || 0;
            exerciseVolume += weight * reps;
        });

        totalVolume += exerciseVolume;

        MUSCLE_GROUPS.forEach(muscle => {
            const activation = muscleActivation[muscle] || 0;
            muscleLoads[muscle] += exerciseVolume * activation;
        });
    });

    return { muscleLoads, totalLoad: totalVolume };
}

export function calculateCardioLoad(duration, intensity, activityType) {
    const muscleLoads = {};

    const profile = SPORT_MUSCLE_PROFILES[activityType] || SPORT_MUSCLE_PROFILES.running;

    const trainingStressScore = duration * intensity * 10;

    MUSCLE_GROUPS.forEach(muscle => {
        muscleLoads[muscle] = trainingStressScore * (profile[muscle] || 0);
    });

    return { muscleLoads, totalLoad: trainingStressScore };
}

export function calculateWorkoutLoad(workout, exercises, sports) {
    const activityType = classifyActivityType(workout, exercises, sports);

    let muscleLoads = {};
    MUSCLE_GROUPS.forEach(muscle => muscleLoads[muscle] = 0);
    let totalLoad = 0;

    if (activityType === 'weightlifting' && exercises && exercises.length > 0) {
        const result = calculateWeightliftingLoad(exercises);
        muscleLoads = result.muscleLoads;
        totalLoad = result.totalLoad;
    } else if (sports && sports.length > 0) {
        sports.forEach(sport => {
            const sportType = sport.activity_name.toLowerCase().includes('run') ? 'running' :
                            sport.activity_name.toLowerCase().includes('cycl') ? 'cycling' :
                            sport.activity_name.toLowerCase().includes('swim') ? 'swimming' : 'running';

            const result = calculateCardioLoad(
                sport.duration_minutes,
                workout.intensity_rpe,
                sportType
            );

            MUSCLE_GROUPS.forEach(muscle => {
                muscleLoads[muscle] += result.muscleLoads[muscle];
            });
            totalLoad += result.totalLoad;
        });

        if (exercises && exercises.length > 0) {
            const weightResult = calculateWeightliftingLoad(exercises);
            MUSCLE_GROUPS.forEach(muscle => {
                muscleLoads[muscle] += weightResult.muscleLoads[muscle];
            });
            totalLoad += weightResult.totalLoad;
        }
    } else {
        const genericLoad = workout.duration_minutes * workout.intensity_rpe * 10;
        totalLoad = genericLoad;
        const loadPerMuscle = genericLoad / MUSCLE_GROUPS.length;
        MUSCLE_GROUPS.forEach(muscle => {
            muscleLoads[muscle] = loadPerMuscle;
        });
    }

    return { activityType, muscleLoads, totalLoad };
}

export function calculateRecoveryCoefficient(checkIn) {
    if (!checkIn) return 1.0;

    const sleepQuality = checkIn.sleep_quality || 3;
    const stressLevel = checkIn.stress_level || 3;
    const nutritionQuality = checkIn.nutrition_quality || 3;

    const sleepFactor = (sleepQuality / 3) * 0.4;
    const stressFactor = ((6 - stressLevel) / 3) * 0.3;
    const nutritionFactor = (nutritionQuality / 3) * 0.3;

    const coefficient = sleepFactor + stressFactor + nutritionFactor;

    return Math.max(0.5, Math.min(1.5, coefficient));
}

export function applyMuscleFatigueDecay(currentFatigue, recoveryCoefficient, daysSinceLastWorkout = 1) {
    const decayedFatigue = {};

    const MUSCLE_RECOVERY_RATES = {
        Chest: 0.15,
        Lats: 0.15,
        Deltoids: 0.14,
        Biceps: 0.18,
        Triceps: 0.18,
        Abs: 0.20,
        Forearm: 0.25,
        Quads: 0.12,
        Hams: 0.13,
        Calfs: 0.16,
        Glutes: 0.13,
        Lumbar: 0.14,
        Trapezius: 0.16
    };

    MUSCLE_GROUPS.forEach(muscle => {
        const fatigue = currentFatigue[muscle] || 0;
        const baseDecayRate = MUSCLE_RECOVERY_RATES[muscle] || 0.15;
        const adjustedDecayRate = baseDecayRate * recoveryCoefficient;

        decayedFatigue[muscle] = Math.max(0, fatigue * Math.pow(1 - adjustedDecayRate, daysSinceLastWorkout));
    });

    return decayedFatigue;
}

export function calculateMuscleFitness(muscleLoads, previousFitness) {
    const fitness = {};
    const alpha = 2.0 / (42 + 1);

    MUSCLE_GROUPS.forEach(muscle => {
        const previousValue = previousFitness[muscle] || 0;
        const currentLoad = muscleLoads[muscle] || 0;

        if (previousValue === 0 && currentLoad > 0) {
            fitness[muscle] = currentLoad;
        } else {
            fitness[muscle] = (currentLoad * alpha) + (previousValue * (1 - alpha));
        }
    });

    return fitness;
}

export function calculateMuscleFatigue(muscleLoads, previousFatigue, recoveryCoefficient) {
    const fatigue = {};
    const alpha = 2.0 / (7 + 1);

    MUSCLE_GROUPS.forEach(muscle => {
        const previousValue = previousFatigue[muscle] || 0;
        const currentLoad = muscleLoads[muscle] || 0;

        const decayedPrevious = previousValue * recoveryCoefficient;

        if (previousValue === 0 && currentLoad > 0) {
            fatigue[muscle] = currentLoad;
        } else {
            fatigue[muscle] = (currentLoad * alpha) + (decayedPrevious * (1 - alpha));
        }
    });

    return fatigue;
}

export function calculateMuscleReadiness(muscleFitness, muscleFatigue) {
    const readiness = {};

    MUSCLE_GROUPS.forEach(muscle => {
        const fitness = muscleFitness[muscle] || 0;
        const fatigue = muscleFatigue[muscle] || 0;

        if (fitness === 0) {
            readiness[muscle] = 100;
        } else {
            const fatigueRatio = fatigue / fitness;
            readiness[muscle] = Math.max(0, Math.min(100, 100 - (fatigueRatio * 100)));
        }
    });

    return readiness;
}
