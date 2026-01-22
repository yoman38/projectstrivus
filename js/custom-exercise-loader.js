import { supabase } from './supabase-client.js';

export async function loadCustomExercises() {
  try {
    const { data, error } = await supabase
      .from('user_custom_exercises')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(exercise => ({
      id: `-${exercise.id}`,
      Exercise_Name: exercise.name,
      category: 'Custom',
      difficulty: exercise.difficulty,
      video_path_gif: exercise.video_url,
      HowToPerform: exercise.description,
      CommonErrors: '',
      metric: 'weight',
      is_custom: true,
      custom_id: exercise.id,
      ...exercise.muscle_data
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
