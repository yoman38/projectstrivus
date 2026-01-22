import { supabase } from './supabase-client.js';
import { getUser } from './auth-guard.js';
import { loadExercises } from './exercise-loader.js';

let standardExercises = [];
let customExercises = [];
let allExercises = [];

async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return user;
    } catch (err) {
        console.warn('Failed to fetch user from auth:', err.message);
    }
    return getUser();
}

export async function loadAllExercises() {
    standardExercises = await loadExercises();

    const user = await getCurrentUser();
    if (user) {
        const { data, error } = await supabase
            .from('user_custom_exercises')
            .select('*')
            .eq('user_id', user.id)
            .order('usage_count', { ascending: false });

        if (!error && data) {
            customExercises = data.map(ex => ({
                ...ex,
                isCustom: true,
                exercise_id: `custom_${ex.id}`,
                muscles: ex.muscle_data || {}
            }));
        }
    }

    allExercises = [
        ...customExercises.map(ex => ({ ...ex, isCustom: true })),
        ...standardExercises.map(ex => ({ ...ex, isCustom: false }))
    ];

    return allExercises;
}

export function filterExercises(options = {}) {
    const {
        search = '',
        muscleGroup = null,
        equipment = null,
        difficulty = null,
        showCustomOnly = false
    } = options;

    let filtered = showCustomOnly ? customExercises : allExercises;

    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(ex =>
            ex.name.toLowerCase().includes(searchLower) ||
            (ex.description && ex.description.toLowerCase().includes(searchLower))
        );
    }

    if (muscleGroup && muscleGroup !== 'all') {
        filtered = filtered.filter(ex => {
            if (ex.isCustom) {
                return ex.main_muscle_group === muscleGroup ||
                    (ex.muscle_data && ex.muscle_data[muscleGroup] > 0);
            }
            return ex.muscles && ex.muscles[muscleGroup] > 0;
        });
    }

    if (equipment && equipment !== 'all') {
        filtered = filtered.filter(ex =>
            ex.equipment && ex.equipment.toLowerCase().includes(equipment.toLowerCase())
        );
    }

    if (difficulty) {
        filtered = filtered.filter(ex => ex.difficulty === difficulty);
    }

    return filtered;
}

export function getExerciseById(id) {
    return allExercises.find(ex =>
        ex.isCustom ? ex.id === id || ex.exercise_id === id : ex.exercise_id === id
    );
}

export function getMuscleGroups() {
    return [
        { id: 'all', name: 'All', icon: '💪' },
        { id: 'Chest', name: 'Chest', icon: '🫁' },
        { id: 'Back', name: 'Back', icon: '🦴' },
        { id: 'Legs', name: 'Legs', icon: '🦵' },
        { id: 'Shoulders', name: 'Shoulders', icon: '💪' },
        { id: 'Arms', name: 'Arms', icon: '💪' },
        { id: 'Core', name: 'Core', icon: '🔥' }
    ];
}

export function getEquipmentTypes() {
    return [
        { id: 'all', name: 'All Equipment' },
        { id: 'Barbell', name: 'Barbell' },
        { id: 'Dumbbell', name: 'Dumbbells' },
        { id: 'Machine', name: 'Machine' },
        { id: 'Cable', name: 'Cable' },
        { id: 'Bodyweight', name: 'Bodyweight' },
        { id: 'Kettlebell', name: 'Kettlebell' },
        { id: 'Band', name: 'Resistance Band' }
    ];
}

export async function incrementExerciseUsage(exerciseId) {
    if (!exerciseId || typeof exerciseId !== 'string') return;

    if (exerciseId.startsWith('custom_')) {
        const customId = exerciseId.replace('custom_', '');
        const user = await getCurrentUser();
        if (!user) return;

        const { data: existing } = await supabase
            .from('user_custom_exercises')
            .select('usage_count')
            .eq('id', customId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existing) {
            await supabase
                .from('user_custom_exercises')
                .update({ usage_count: (existing.usage_count || 0) + 1 })
                .eq('id', customId);
        }
    }
}

export function getStandardExercises() {
    return standardExercises;
}

export function getCustomExercises() {
    return customExercises;
}

export function getAllExercises() {
    return allExercises;
}
