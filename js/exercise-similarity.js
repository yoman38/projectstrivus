import { SimpleCache } from './utils.js';

const MUSCLES = [
  'Chest', 'Lats', 'Deltoids', 'Biceps', 'Triceps', 'Forearm',
  'Abs', 'Quads', 'Hamstrings', 'Calves', 'Glutes', 'Lumbar', 'Trapezius'
];

const MUSCLE_WEIGHTS = {
  'Chest': 1.2,
  'Lats': 1.2,
  'Deltoids': 1.1,
  'Quads': 1.2,
  'Hamstrings': 1.2,
  'Glutes': 1.1,
  'Abs': 1.0,
  'Biceps': 0.9,
  'Triceps': 0.9,
  'Forearm': 0.7,
  'Calves': 0.8,
  'Lumbar': 1.0,
  'Trapezius': 1.0
};

const similarityCache = new SimpleCache(5 * 60 * 1000);

export function calculateSimilarity(customMuscles, standardExercise, options = {}) {
  const {
    considerEquipment = true,
    considerMechanics = true,
    considerDifficulty = false
  } = options;

  const cacheKey = `${JSON.stringify(customMuscles)}-${standardExercise.id || standardExercise.Exercise_Name}`;

  if (similarityCache.has(cacheKey)) {
    return similarityCache.get(cacheKey);
  }

  const muscleVector1 = getMuscleVector(customMuscles, true);
  const muscleVector2 = getMuscleVector(standardExercise, true);

  let muscleSimilarity = calculateWeightedCosineSimilarity(muscleVector1, muscleVector2);

  let totalWeight = 1.0;
  let weightedScore = muscleSimilarity;

  if (considerEquipment && customMuscles.equipment && standardExercise.equipment) {
    const equipmentSimilarity = calculateEquipmentSimilarity(
      customMuscles.equipment,
      standardExercise.equipment
    );
    weightedScore += equipmentSimilarity * 0.15;
    totalWeight += 0.15;
  }

  if (considerMechanics && customMuscles.mechanics && standardExercise.mechanics) {
    if (customMuscles.mechanics === standardExercise.mechanics) {
      weightedScore += 0.1;
      totalWeight += 0.1;
    }
  }

  if (considerDifficulty && customMuscles.difficulty && standardExercise.difficulty) {
    const diffDiff = Math.abs(customMuscles.difficulty - standardExercise.difficulty);
    const difficultySimilarity = 1 - (diffDiff / 4);
    weightedScore += difficultySimilarity * 0.05;
    totalWeight += 0.05;
  }

  const finalScore = Math.round((weightedScore / totalWeight) * 100);
  similarityCache.set(cacheKey, finalScore);

  return finalScore;
}

export function findSimilarExercises(customMuscles, allExercises, topN = 5) {
  const results = allExercises
    .map(exercise => ({
      exercise,
      similarity: calculateSimilarity(customMuscles, exercise)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);

  return results;
}

export function getMuscleVector(exerciseData, useWeights = false) {
  return MUSCLES.map(muscle => {
    let value;
    if (typeof exerciseData === 'object' && exerciseData.muscle_data) {
      value = exerciseData.muscle_data[muscle] || 0;
    } else {
      value = exerciseData[muscle] || 0;
    }

    return useWeights ? value * (MUSCLE_WEIGHTS[muscle] || 1.0) : value;
  });
}

function calculateCosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

function calculateWeightedCosineSimilarity(vec1, vec2) {
  return calculateCosineSimilarity(vec1, vec2);
}

function calculateEquipmentSimilarity(equipment1, equipment2) {
  if (!equipment1 || !equipment2) return 0;

  const eq1 = Array.isArray(equipment1) ? equipment1 : [equipment1];
  const eq2 = Array.isArray(equipment2) ? equipment2 : [equipment2];

  if (eq1.length === 0 && eq2.length === 0) return 1;
  if (eq1.length === 0 || eq2.length === 0) return 0;

  const set1 = new Set(eq1.map(e => e.toLowerCase()));
  const set2 = new Set(eq2.map(e => e.toLowerCase()));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

export function getSimilarityColor(similarity) {
  if (similarity >= 90) return '#10b981';
  if (similarity >= 75) return '#3b82f6';
  if (similarity >= 60) return '#eab308';
  return '#6b7280';
}

export function getSimilarityLabel(similarity) {
  if (similarity >= 90) return 'Very Similar';
  if (similarity >= 75) return 'Similar';
  if (similarity >= 60) return 'Somewhat Similar';
  return 'Different';
}

export function validateExerciseName(name, existingNames) {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Exercise name required' };
  }
  if (name.length > 100) {
    return { valid: false, error: 'Name too long (max 100 characters)' };
  }
  if (existingNames.includes(name.toLowerCase())) {
    return { valid: false, error: 'You already have an exercise with this name' };
  }
  return { valid: true };
}

export function validateMuscleActivation(muscleData) {
  const values = Object.values(muscleData);
  const sum = values.reduce((a, b) => a + b, 0);
  const maxValue = Math.max(...values);
  const activeCount = values.filter(v => v > 0.1).length;

  if (sum === 0) {
    return { valid: false, error: 'Select at least one muscle group' };
  }

  if (maxValue < 0.3) {
    return {
      valid: false,
      error: 'At least one muscle should be activated to 0.3 or higher'
    };
  }

  if (sum > 6) {
    return {
      valid: false,
      error: 'Total muscle activation too high (max 6.0). Consider reducing some values.'
    };
  }

  if (activeCount > 10) {
    return {
      valid: false,
      warning: 'Many muscles activated - ensure this accurately represents your exercise'
    };
  }

  if (sum > 4) {
    return {
      valid: true,
      warning: 'High total muscle activation - this appears to be a full-body compound exercise'
    };
  }

  return { valid: true };
}

export function detectAnatomicalIssues(muscleData) {
  const issues = [];

  const chest = muscleData.Chest || 0;
  const lats = muscleData.Lats || 0;
  const triceps = muscleData.Triceps || 0;
  const biceps = muscleData.Biceps || 0;

  if (chest > 0.7 && lats > 0.7) {
    issues.push('High chest and lat activation is unusual - these are typically opposing muscle groups');
  }

  if (triceps > 0.7 && biceps > 0.7) {
    issues.push('High triceps and biceps activation together is uncommon - these are antagonist muscles');
  }

  const pushMuscles = (chest + triceps + (muscleData.Deltoids || 0)) / 3;
  const pullMuscles = (lats + biceps) / 2;

  if (pushMuscles > 0.6 && pullMuscles > 0.6) {
    issues.push('This exercise activates both push and pull muscle groups heavily');
  }

  return issues;
}

export function calculateValidationScore(customMuscles, similarExercises) {
  if (!similarExercises || similarExercises.length === 0) return 0;
  return similarExercises[0].similarity;
}
