const SPORT_PROFILES = {
  'Swimming': {
    primaryMuscles: ['Lats', 'Deltoids', 'Triceps', 'Abs'],
    secondaryMuscles: ['Chest', 'Trapezius', 'Forearm'],
    preferredTypes: ['Isotonic (Dynamic)', 'Dynamic Mobility'],
    emphasizeEndurance: true
  },
  'Running / Track & Field': {
    primaryMuscles: ['Quads', 'Hams', 'Calfs', 'Glutes'],
    secondaryMuscles: ['Abs', 'Lumbar'],
    preferredTypes: ['Plyometric (Explosive)', 'Dynamic Mobility'],
    emphasizeEndurance: true
  },
  'Cycling / BMX': {
    primaryMuscles: ['Quads', 'Glutes', 'Calfs'],
    secondaryMuscles: ['Hams', 'Lumbar', 'Abs'],
    preferredTypes: ['Isotonic (Dynamic)', 'Isometric (Static)'],
    emphasizeEndurance: true
  },
  'MMA / Boxing / Kickboxing / Muay Thai': {
    primaryMuscles: ['Deltoids', 'Chest', 'Abs', 'Quads'],
    secondaryMuscles: ['Triceps', 'Biceps', 'Hams', 'Calfs'],
    preferredTypes: ['Plyometric (Explosive)', 'Isotonic (Dynamic)'],
    emphasizePower: true
  },
  'Basketball / Volleyball': {
    primaryMuscles: ['Quads', 'Calfs', 'Deltoids', 'Abs'],
    secondaryMuscles: ['Hams', 'Glutes', 'Triceps'],
    preferredTypes: ['Plyometric (Explosive)', 'Isotonic (Dynamic)'],
    emphasizePower: true
  },
  'Soccer / Football / Rugby': {
    primaryMuscles: ['Quads', 'Hams', 'Glutes', 'Calfs', 'Abs'],
    secondaryMuscles: ['Deltoids', 'Lumbar'],
    preferredTypes: ['Plyometric (Explosive)', 'Isotonic (Dynamic)'],
    emphasizePower: true
  },
  'Tennis / Badminton / Squash': {
    primaryMuscles: ['Deltoids', 'Forearm', 'Quads', 'Calfs'],
    secondaryMuscles: ['Abs', 'Lumbar', 'Triceps'],
    preferredTypes: ['Plyometric (Explosive)', 'Isotonic (Dynamic)'],
    emphasizePower: true
  },
  'Rowing / Canoeing / Kayaking': {
    primaryMuscles: ['Lats', 'Trapezius', 'Quads', 'Abs'],
    secondaryMuscles: ['Biceps', 'Deltoids', 'Lumbar', 'Hams'],
    preferredTypes: ['Isotonic (Dynamic)'],
    emphasizeEndurance: true
  },
  'Rock Climbing / Bouldering': {
    primaryMuscles: ['Forearm', 'Lats', 'Biceps', 'Abs'],
    secondaryMuscles: ['Deltoids', 'Trapezius', 'Quads'],
    preferredTypes: ['Isometric (Static)', 'Isotonic (Dynamic)'],
    emphasizeStrength: true
  },
  'Gymnastics / Artistic Gymnastics': {
    primaryMuscles: ['Abs', 'Deltoids', 'Triceps', 'Chest'],
    secondaryMuscles: ['Lats', 'Biceps', 'Forearm', 'Quads'],
    preferredTypes: ['Isometric (Static)', 'Plyometric (Explosive)'],
    emphasizeStrength: true
  },
  'Powerlifting / Weightlifting / Bodybuilding': {
    primaryMuscles: ['Chest', 'Lats', 'Quads', 'Hams', 'Deltoids'],
    secondaryMuscles: ['Triceps', 'Biceps', 'Glutes', 'Trapezius'],
    preferredTypes: ['Isotonic (Dynamic)'],
    emphasizeStrength: true
  },
  'CrossFit / Functional Fitness': {
    primaryMuscles: ['Quads', 'Hams', 'Chest', 'Lats', 'Abs', 'Deltoids'],
    secondaryMuscles: ['Triceps', 'Biceps', 'Glutes', 'Calfs'],
    preferredTypes: ['Isotonic (Dynamic)', 'Plyometric (Explosive)'],
    emphasizePower: true,
    emphasizeEndurance: true
  },
  'Yoga / Pilates': {
    primaryMuscles: ['Abs', 'Lumbar', 'Deltoids'],
    secondaryMuscles: ['Quads', 'Hams', 'Glutes'],
    preferredTypes: ['Isometric (Static)', 'Static Mobility (Stretch)', 'Dynamic Mobility'],
    emphasizeFlexibility: true
  },
  'Golf': {
    primaryMuscles: ['Abs', 'Lumbar', 'Forearm', 'Deltoids'],
    secondaryMuscles: ['Quads', 'Hams', 'Chest'],
    preferredTypes: ['Dynamic Mobility', 'Isotonic (Dynamic)'],
    emphasizeFlexibility: true
  },
  'Skiing / Snowboarding': {
    primaryMuscles: ['Quads', 'Glutes', 'Abs', 'Lumbar'],
    secondaryMuscles: ['Hams', 'Calfs', 'Deltoids'],
    preferredTypes: ['Isometric (Static)', 'Plyometric (Explosive)'],
    emphasizeStrength: true
  },
  'Surfing / Skateboarding': {
    primaryMuscles: ['Abs', 'Lumbar', 'Deltoids', 'Quads'],
    secondaryMuscles: ['Chest', 'Triceps', 'Calfs', 'Glutes'],
    preferredTypes: ['Isometric (Static)', 'Plyometric (Explosive)'],
    emphasizePower: true
  }
};

export function calculateSportTargets(selectedSports, currentTargets = {}) {
  if (!selectedSports || selectedSports.length === 0) {
    return currentTargets;
  }

  const sportTargets = {};
  const allMuscles = [
    'Lats', 'Chest', 'Deltoids', 'Biceps', 'Triceps',
    'Abs', 'Forearm', 'Quads', 'Hams', 'Calfs',
    'Glutes', 'Lumbar', 'Trapezius'
  ];

  allMuscles.forEach(muscle => {
    sportTargets[muscle] = 0;
  });

  selectedSports.forEach(sport => {
    const profile = SPORT_PROFILES[sport];
    if (!profile) return;

    profile.primaryMuscles.forEach(muscle => {
      sportTargets[muscle] += 100;
    });

    profile.secondaryMuscles.forEach(muscle => {
      sportTargets[muscle] += 60;
    });
  });

  const maxValue = Math.max(...Object.values(sportTargets));
  if (maxValue > 0) {
    allMuscles.forEach(muscle => {
      sportTargets[muscle] = Math.round((sportTargets[muscle] / maxValue) * 100);
    });
  }

  return sportTargets;
}

export function getSportRecommendations(exercise, selectedSports) {
  if (!selectedSports || selectedSports.length === 0) {
    return { score: 0, isRecommended: false };
  }

  let totalScore = 0;
  let matchCount = 0;

  selectedSports.forEach(sport => {
    const profile = SPORT_PROFILES[sport];
    if (!profile) return;

    let sportScore = 0;

    profile.primaryMuscles.forEach(muscle => {
      const activation = exercise[muscle] || 0;
      sportScore += activation * 2;
    });

    profile.secondaryMuscles.forEach(muscle => {
      const activation = exercise[muscle] || 0;
      sportScore += activation;
    });

    if (exercise.type && profile.preferredTypes) {
      const typeMatches = exercise.type.filter(t => profile.preferredTypes.includes(t)).length;
      sportScore += typeMatches * 0.5;
    }

    if (exercise.tags && exercise.tags.includes(sport)) {
      sportScore += 1.5;
    }

    totalScore += sportScore;
    matchCount++;
  });

  const avgScore = matchCount > 0 ? totalScore / matchCount : 0;
  const isRecommended = avgScore > 2.0;

  return { score: avgScore, isRecommended };
}

export function getSportFocusPreferences(selectedSports) {
  if (!selectedSports || selectedSports.length === 0) {
    return null;
  }

  let emphasizeStrength = false;
  let emphasizePower = false;
  let emphasizeEndurance = false;
  let emphasizeFlexibility = false;

  selectedSports.forEach(sport => {
    const profile = SPORT_PROFILES[sport];
    if (!profile) return;

    if (profile.emphasizeStrength) emphasizeStrength = true;
    if (profile.emphasizePower) emphasizePower = true;
    if (profile.emphasizeEndurance) emphasizeEndurance = true;
    if (profile.emphasizeFlexibility) emphasizeFlexibility = true;
  });

  if (emphasizeStrength && !emphasizeEndurance) return 'Strength';
  if (emphasizeEndurance && !emphasizeStrength) return 'Endurance';
  if (emphasizePower) return 'Hypertrophy';
  return null;
}

export function getAvailableSports() {
  return Object.keys(SPORT_PROFILES).sort();
}

export function getSportProfile(sportName) {
  return SPORT_PROFILES[sportName];
}
