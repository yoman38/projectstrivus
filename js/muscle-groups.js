export const MUSCLE_GROUPS = {
  'Upper Body - Push': {
    muscles: ['Chest', 'Deltoids', 'Triceps'],
    icon: '💪',
    color: '#02B2FC'
  },
  'Upper Body - Pull': {
    muscles: ['Lats', 'Trapezius', 'Biceps', 'Forearm'],
    icon: '🔙',
    color: '#0235FC'
  },
  'Core': {
    muscles: ['Abs', 'Obliques', 'Lumbar'],
    icon: '🎯',
    color: '#02FCC9'
  },
  'Lower Body': {
    muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
    icon: '🦵',
    color: '#10b981'
  }
};

export const MUSCLE_ALIASES = {
  'Obliques': 'Abs',
  'Lower Back': 'Lumbar',
  'Traps': 'Trapezius',
  'Shoulders': 'Deltoids',
  'Delts': 'Deltoids'
};

export const ALL_MUSCLES = [
  'Chest', 'Lats', 'Deltoids', 'Biceps', 'Triceps', 'Forearm',
  'Abs', 'Quads', 'Hamstrings', 'Calves', 'Glutes', 'Lumbar', 'Trapezius'
];

export const EXERCISE_TEMPLATES = {
  'Push (Chest Focus)': {
    Chest: 1.0,
    Deltoids: 0.5,
    Triceps: 0.6
  },
  'Push (Shoulder Focus)': {
    Deltoids: 1.0,
    Triceps: 0.4,
    Chest: 0.3
  },
  'Pull (Back Focus)': {
    Lats: 1.0,
    Trapezius: 0.5,
    Biceps: 0.6,
    Forearm: 0.3
  },
  'Pull (Biceps Focus)': {
    Biceps: 1.0,
    Forearm: 0.5,
    Lats: 0.4
  },
  'Legs (Quad Focus)': {
    Quads: 1.0,
    Glutes: 0.5,
    Hamstrings: 0.3,
    Calves: 0.2
  },
  'Legs (Hamstring Focus)': {
    Hamstrings: 1.0,
    Glutes: 0.7,
    Lumbar: 0.3
  },
  'Core (Abs Focus)': {
    Abs: 1.0,
    Lumbar: 0.3
  },
  'Full Body Compound': {
    Quads: 0.7,
    Hamstrings: 0.6,
    Glutes: 0.7,
    Lumbar: 0.5,
    Lats: 0.4,
    Trapezius: 0.5,
    Deltoids: 0.4
  }
};

export function getMuscleGroup(muscleName) {
  const normalizedMuscle = MUSCLE_ALIASES[muscleName] || muscleName;

  for (const [groupName, groupData] of Object.entries(MUSCLE_GROUPS)) {
    if (groupData.muscles.includes(normalizedMuscle)) {
      return groupName;
    }
  }

  return 'Other';
}

export function getGroupedMuscles() {
  const grouped = {};

  for (const [groupName, groupData] of Object.entries(MUSCLE_GROUPS)) {
    grouped[groupName] = {
      ...groupData,
      muscles: groupData.muscles.filter(m => ALL_MUSCLES.includes(m))
    };
  }

  return grouped;
}
