import { supabase } from './supabase-client.js';

export async function loadCustomExercises() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_custom_exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(exercise => ({
      id: exercise.id,
      Exercise_Name: exercise.name,
      category: 'Custom',
      difficulty: exercise.difficulty || 3,
      video_path_gif: exercise.video_url || null,
      HowToPerform: exercise.description || '',
      CommonErrors: '',
      metric: 'weight',
      is_custom: true,
      custom_id: exercise.id,
      equipment: exercise.equipment || 'Bodyweight',
      main_muscle_group: exercise.main_muscle_group || 'General',
      ...(exercise.muscle_data || {})
    }));
  } catch (error) {
    console.error('Error loading custom exercises:', error);
    return [];
  }
}

export async function mergeExercises(standardExercises, customExercises) {
  return [
    ...standardExercises,
    ...customExercises
  ];
}
