let ALL_EXERCISES = [];
let exercisesLoaded = false;

export async function loadExercises() {
    if (exercisesLoaded) {
        return ALL_EXERCISES;
    }

    try {
        const response = await fetch('/exercises.json');
        ALL_EXERCISES = await response.json();
        exercisesLoaded = true;
        return ALL_EXERCISES;
    } catch (error) {
        console.error('Failed to load exercises:', error);
        return [];
    }
}

export function getExercises() {
    return ALL_EXERCISES;
}

export function getExerciseById(id) {
    return ALL_EXERCISES.find(ex => ex.id === parseInt(id));
}

export function getMuscleActivation(exerciseId) {
    const exercise = getExerciseById(exerciseId);
    if (!exercise) return null;

    return {
        Lats: parseFloat(exercise.Lats) || 0,
        Chest: parseFloat(exercise.Chest) || 0,
        Deltoids: parseFloat(exercise.Deltoids) || 0,
        Biceps: parseFloat(exercise.Biceps) || 0,
        Triceps: parseFloat(exercise.Triceps) || 0,
        Abs: parseFloat(exercise.Abs) || 0,
        Forearm: parseFloat(exercise.Forearm) || 0,
        Quads: parseFloat(exercise.Quads) || 0,
        Hams: parseFloat(exercise.Hams) || 0,
        Calfs: parseFloat(exercise.Calfs) || 0,
        Glutes: parseFloat(exercise.Glutes) || 0,
        Lumbar: parseFloat(exercise.Lumbar) || 0,
        Trapezius: parseFloat(exercise.Trapezius) || 0
    };
}
