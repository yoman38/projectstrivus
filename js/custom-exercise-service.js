import { supabase } from './supabase-client.js';
import { getUser } from './auth-guard.js';

async function getCurrentUserWithFallback() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (err) {
    console.warn('Failed to fetch user from auth:', err.message);
  }
  return getUser();
}

export async function saveCustomExercise(exerciseData) {
  try {
    const user = await getCurrentUserWithFallback();
    if (!user) throw new Error('User not authenticated');

    const exerciseWithUserId = {
      ...exerciseData,
      user_id: user.id,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_custom_exercises')
      .insert([exerciseWithUserId])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('An exercise with this name already exists');
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error saving custom exercise:', error);
    return {
      success: false,
      error: error.message || 'Failed to save exercise'
    };
  }
}

export async function updateCustomExercise(id, exerciseData) {
  try {
    const updateData = {
      ...exerciseData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_custom_exercises')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('An exercise with this name already exists');
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating custom exercise:', error);
    return {
      success: false,
      error: error.message || 'Failed to update exercise'
    };
  }
}

export async function deleteCustomExercise(id) {
  try {
    const { error } = await supabase
      .from('user_custom_exercises')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting custom exercise:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete exercise'
    };
  }
}

export async function getUserCustomExercises(options = {}) {
  try {
    const {
      sortBy = 'created_at',
      ascending = false,
      limit = null,
      offset = 0
    } = options;

    let query = supabase
      .from('user_custom_exercises')
      .select('*')
      .order(sortBy, { ascending });

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching custom exercises:', error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
}

export async function getCustomExerciseById(id) {
  try {
    const { data, error } = await supabase
      .from('user_custom_exercises')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching custom exercise:', error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
}

export async function getCustomExerciseCount() {
  try {
    const { count, error } = await supabase
      .from('user_custom_exercises')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error fetching custom exercise count:', error);
    return { success: false, count: 0, error: error.message };
  }
}

export async function getCustomExerciseNames() {
  try {
    const { data, error } = await supabase
      .from('user_custom_exercises')
      .select('name');

    if (error) throw error;
    return {
      success: true,
      names: (data || []).map(ex => ex.name.toLowerCase())
    };
  } catch (error) {
    console.error('Error fetching exercise names:', error);
    return { success: false, names: [], error: error.message };
  }
}

export async function incrementUsageCount(exerciseId) {
  try {
    const { data, error } = await supabase
      .rpc('increment_exercise_usage', { exercise_uuid: exerciseId });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating usage count:', error);
    return { success: false, error: error.message };
  }
}

export async function bulkDeleteCustomExercises(ids) {
  try {
    const { error } = await supabase
      .from('user_custom_exercises')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error bulk deleting exercises:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete exercises'
    };
  }
}

export async function duplicateCustomExercise(id, newName) {
  try {
    const { data: original, error: fetchError } = await supabase
      .from('user_custom_exercises')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { id: _, created_at, updated_at, usage_count, ...exerciseData } = original;

    exerciseData.name = newName || `${original.name} (Copy)`;
    exerciseData.usage_count = 0;

    return await saveCustomExercise(exerciseData);
  } catch (error) {
    console.error('Error duplicating exercise:', error);
    return {
      success: false,
      error: error.message || 'Failed to duplicate exercise'
    };
  }
}
