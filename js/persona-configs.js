export const PERSONA_CONFIGS = {
  'Custom': {
    name: 'Custom',
    description: 'Full control over all settings',
    coachingTone: 'neutral',
    presets: {}
  },

  'Bodybuilder': {
    name: 'Bodybuilder',
    description: 'Muscle growth and aesthetics focus',
    coachingTone: 'hypertrophy-focused',
    presets: {
      focus: 'Hypertrophy',
      numExercises: 7,
      maxTime: 90,
      trainingPrinciple: 'Pyramid',
      supersetStrategy: 'Antagonist',
      difficultyRange: { min: 2, max: 5 },
      repRange: [8, 12],
      restTime: 90,
      mechanics: ['Compound', 'Isolation'],
      types: ['Isotonic (Dynamic)']
    },
    encouragement: [
      "Building that mass! 💪",
      "Sculpting those muscles perfectly",
      "Time to grow!",
      "Feel the pump building"
    ]
  },

  'Powerlifter': {
    name: 'Powerlifter',
    description: 'Maximum strength and low reps',
    coachingTone: 'strength-focused',
    presets: {
      focus: 'Strength',
      numExercises: 5,
      maxTime: 120,
      trainingPrinciple: 'Progressive',
      supersetStrategy: 'None',
      difficultyRange: { min: 3, max: 5 },
      repRange: [3, 5],
      restTime: 180,
      mechanics: ['Compound'],
      types: ['Isotonic (Dynamic)']
    },
    encouragement: [
      "Maximum effort! 🔥",
      "Heavy iron time",
      "Build that raw strength",
      "Crushing PRs today"
    ]
  },

  'Minimalist': {
    name: 'Minimalist',
    description: 'Efficient, short workouts',
    coachingTone: 'efficiency-focused',
    presets: {
      focus: 'Hypertrophy',
      numExercises: 4,
      maxTime: 30,
      trainingPrinciple: 'Standard',
      supersetStrategy: 'Compound',
      difficultyRange: { min: 2, max: 4 },
      repRange: [8, 12],
      restTime: 60,
      mechanics: ['Compound'],
      types: ['Isotonic (Dynamic)'],
      preferredEquipment: ['Bodyweight', 'Dumbbell']
    },
    encouragement: [
      "Maximum results, minimum time ⚡",
      "Efficient and effective",
      "Quality over quantity",
      "Smart training session"
    ]
  },

  'Athlete': {
    name: 'Athlete',
    description: 'Sport-specific performance training',
    coachingTone: 'performance-focused',
    presets: {
      focus: 'Hypertrophy',
      numExercises: 6,
      maxTime: 60,
      trainingPrinciple: 'Standard',
      supersetStrategy: 'Antagonist',
      difficultyRange: { min: 2, max: 5 },
      repRange: [6, 10],
      restTime: 90,
      mechanics: ['Compound', 'Isolation'],
      types: ['Isotonic (Dynamic)', 'Plyometric (Explosive)']
    },
    sportSpecific: true,
    encouragement: [
      "Train like a champion 🏆",
      "Sport-specific excellence",
      "Performance gains ahead",
      "Athletic power building"
    ]
  },

  'Gym Lover': {
    name: 'Gym Lover',
    description: 'Balanced all-around fitness',
    coachingTone: 'enthusiastic',
    presets: {
      focus: 'Hypertrophy',
      numExercises: 6,
      maxTime: 75,
      trainingPrinciple: 'Standard',
      supersetStrategy: 'None',
      difficultyRange: { min: 2, max: 4 },
      repRange: [8, 12],
      restTime: 90,
      mechanics: ['Compound', 'Isolation'],
      types: ['Isotonic (Dynamic)']
    },
    encouragement: [
      "Let's crush this workout! 💪",
      "Feeling the gym energy",
      "Another great session",
      "Progress every day"
    ]
  },

  'Toning & Conditioning': {
    name: 'Toning & Conditioning',
    description: 'Lean muscle and definition',
    coachingTone: 'conditioning-focused',
    presets: {
      focus: 'Endurance',
      numExercises: 6,
      maxTime: 45,
      trainingPrinciple: 'Standard',
      supersetStrategy: 'Compound',
      difficultyRange: { min: 1, max: 3 },
      repRange: [12, 15],
      restTime: 45,
      mechanics: ['Compound', 'Isolation'],
      types: ['Isotonic (Dynamic)']
    },
    encouragement: [
      "Sculpting and defining ✨",
      "Lean and strong",
      "Building that tone",
      "Looking great, feeling better"
    ]
  },

  'Rehab & Prehab User': {
    name: 'Rehab & Prehab User',
    description: 'Injury prevention and recovery',
    coachingTone: 'therapeutic',
    presets: {
      focus: 'Endurance',
      numExercises: 5,
      maxTime: 40,
      trainingPrinciple: 'Standard',
      supersetStrategy: 'None',
      difficultyRange: { min: 1, max: 2 },
      repRange: [12, 15],
      restTime: 60,
      mechanics: ['Corrective', 'Isolation'],
      types: ['Isotonic (Dynamic)', 'Static Mobility (Stretch)', 'Dynamic Mobility']
    },
    encouragement: [
      "Recovery and strength 🌱",
      "Building resilience",
      "Healing through movement",
      "Patient progress pays off"
    ]
  },

  'Senior': {
    name: 'Senior',
    description: 'Safe, joint-friendly exercises',
    coachingTone: 'supportive',
    presets: {
      focus: 'Endurance',
      numExercises: 4,
      maxTime: 35,
      trainingPrinciple: 'Standard',
      supersetStrategy: 'None',
      difficultyRange: { min: 1, max: 2 },
      repRange: [10, 15],
      restTime: 90,
      mechanics: ['Isolation', 'Corrective'],
      types: ['Isotonic (Dynamic)', 'Static Mobility (Stretch)', 'Dynamic Mobility']
    },
    encouragement: [
      "Moving with wisdom 🌟",
      "Age is just a number",
      "Staying strong and healthy",
      "Consistency wins"
    ]
  },

  'Calisthenics': {
    name: 'Calisthenics',
    description: 'Bodyweight strength and skills',
    coachingTone: 'skill-focused',
    presets: {
      focus: 'Strength',
      numExercises: 5,
      maxTime: 60,
      trainingPrinciple: 'Progressive',
      supersetStrategy: 'None',
      difficultyRange: { min: 2, max: 5 },
      repRange: [5, 10],
      restTime: 120,
      mechanics: ['Compound'],
      types: ['Isotonic (Dynamic)', 'Isometric (Static)'],
      preferredEquipment: ['Bodyweight', 'Pull-Up Bar']
    },
    encouragement: [
      "Mastering your body 🤸",
      "Calisthenics excellence",
      "Bodyweight strength building",
      "Skills and strength combined"
    ]
  }
};

export function applyPersonaPresets(persona) {
  const config = PERSONA_CONFIGS[persona];
  if (!config || persona === 'Custom') {
    return null;
  }

  return config.presets;
}

export function getPersonaCoachingTone(persona) {
  const config = PERSONA_CONFIGS[persona];
  return config ? config.coachingTone : 'neutral';
}

export function getPersonaEncouragement(persona) {
  const config = PERSONA_CONFIGS[persona];
  if (!config || !config.encouragement) {
    return "Keep going!";
  }

  const messages = config.encouragement;
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getAvailablePersonas() {
  return Object.keys(PERSONA_CONFIGS);
}

export function getPersonaDescription(persona) {
  const config = PERSONA_CONFIGS[persona];
  return config ? config.description : '';
}

export function isPersonaSportSpecific(persona) {
  const config = PERSONA_CONFIGS[persona];
  return config ? config.sportSpecific === true : false;
}
