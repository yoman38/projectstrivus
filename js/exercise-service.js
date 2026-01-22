async function loadExercisesFromDB() {
    try {
        const { data: exercises, error } = await supabase
            .from('user_custom_exercises')
            .select('*')
            .order('main_muscle_group');

        if (error) {
            console.error('Error loading exercises:', error);
            return getDefaultExercises();
        }

        return exercises || getDefaultExercises();
    } catch (err) {
        console.error('Failed to load exercises from DB:', err);
        return getDefaultExercises();
    }
}

function getDefaultExercises() {
    return [
        { name: 'Bench Press', main_muscle_group: 'Chest', equipment: 'barbell' },
        { name: 'Squats', main_muscle_group: 'Legs', equipment: 'barbell' },
        { name: 'Deadlifts', main_muscle_group: 'Back', equipment: 'barbell' },
        { name: 'Pull-ups', main_muscle_group: 'Back', equipment: 'bodyweight' },
        { name: 'Dumbbell Rows', main_muscle_group: 'Back', equipment: 'dumbbell' },
        { name: 'Dips', main_muscle_group: 'Chest', equipment: 'bodyweight' },
        { name: 'Leg Press', main_muscle_group: 'Legs', equipment: 'machine' },
        { name: 'Lat Pulldown', main_muscle_group: 'Back', equipment: 'machine' },
        { name: 'Chest Fly', main_muscle_group: 'Chest', equipment: 'machine' },
        { name: 'Leg Curl', main_muscle_group: 'Legs', equipment: 'machine' },
        { name: 'Leg Extension', main_muscle_group: 'Legs', equipment: 'machine' },
        { name: 'Shoulder Press', main_muscle_group: 'Shoulders', equipment: 'dumbbell' },
        { name: 'Lateral Raises', main_muscle_group: 'Shoulders', equipment: 'dumbbell' },
        { name: 'Bicep Curls', main_muscle_group: 'Arms', equipment: 'dumbbell' },
        { name: 'Tricep Extensions', main_muscle_group: 'Arms', equipment: 'dumbbell' },
        { name: 'Barbell Rows', main_muscle_group: 'Back', equipment: 'barbell' },
        { name: 'Push-ups', main_muscle_group: 'Chest', equipment: 'bodyweight' },
        { name: 'Planks', main_muscle_group: 'Core', equipment: 'bodyweight' },
        { name: 'Lunges', main_muscle_group: 'Legs', equipment: 'dumbbell' },
    ];
}

function categorizeExercisesByMuscle(exercises) {
    const categorized = {};

    exercises.forEach(ex => {
        const muscle = ex.main_muscle_group || 'General';
        if (!categorized[muscle]) {
            categorized[muscle] = [];
        }
        categorized[muscle].push(ex);
    });

    return categorized;
}

function filterExercisesByEquipment(exercises, equipment) {
    if (!equipment) return exercises;
    return exercises.filter(ex => {
        if (!ex.equipment) return true;
        return ex.equipment === equipment || ex.equipment === 'bodyweight';
    });
}

window.loadExercisesFromDB = loadExercisesFromDB;
window.categorizeExercisesByMuscle = categorizeExercisesByMuscle;
window.filterExercisesByEquipment = filterExercisesByEquipment;
