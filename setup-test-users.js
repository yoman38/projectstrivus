const fetch = require('node-fetch');

const SUPABASE_URL = 'https://vxxvzvguwwqpuzthzwxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHZ6dmd1d3dxcHV6dGh6d3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDUxMDgsImV4cCI6MjA4MjU4MTEwOH0.8K3ndaJbmP9MsPyWPwZvPbnzXwE31xdYw8lBCwqi0Aw';

async function setupTestUsers() {
  try {
    console.log('🔄 Creating test users...\n');

    // Call edge function to create users
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/create-test-users`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const results = await response.json();
    console.log('✅ Users created:\n', JSON.stringify(results, null, 2));

    const userA = results.find(r => r.email === 'test@test.com');
    const userB = results.find(r => r.email === 'test1@test1.com');

    if (!userA?.userId || !userB?.userId) {
      throw new Error('Failed to get user IDs');
    }

    console.log('\n🔄 Populating workout data...\n');

    // Now populate workout data
    await populateWorkoutData(userA.userId, userB.userId);

    console.log('\n✅ Test data setup complete!');
    console.log('\nTest Credentials:');
    console.log('User A (Musculation):');
    console.log('  Email: test@test.com');
    console.log('  Password: Guillaume');
    console.log('\nUser B (Running):');
    console.log('  Email: test1@test1.com');
    console.log('  Password: Guillaume');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function populateWorkoutData(userAId, userBId) {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 90);

  // Prepare User A data (Musculation)
  const userAWorkouts = generateUserAWorkouts(userAId, baseDate);
  // Prepare User B data (Running)
  const userBWorkouts = generateUserBWorkouts(userBId, baseDate);

  console.log(`  User A: ${userAWorkouts.workouts.length} workouts`);
  console.log(`  User B: ${userBWorkouts.workouts.length} workouts + check-ins`);
}

function generateUserAWorkouts(userId, baseDate) {
  const workouts = [];
  const exercises = [
    { name: 'Bench Press', id: 1 },
    { name: 'Squat', id: 2 },
    { name: 'Deadlift', id: 3 },
    { name: 'Barbell Row', id: 4 },
    { name: 'Incline Bench', id: 5 },
    { name: 'Leg Press', id: 6 },
    { name: 'Barbell Curl', id: 7 },
    { name: 'Tricep Dips', id: 8 },
  ];

  // Create 15-18 workouts over 90 days
  for (let i = 0; i < 16; i++) {
    const workoutDate = new Date(baseDate);
    workoutDate.setDate(workoutDate.getDate() + i * 6); // Every 6 days = ~15 per 90 days

    workouts.push({
      userId,
      date: workoutDate.toISOString().split('T')[0],
      duration: 45 + Math.floor(Math.random() * 30),
      intensity: 6 + Math.floor(Math.random() * 2),
      notes: 'Strength training session',
      exercises: [exercises[Math.floor(Math.random() * exercises.length)]],
    });
  }

  return { workouts };
}

function generateUserBWorkouts(userId, baseDate) {
  const workouts = [];
  const checkIns = [];

  // Create daily running sessions for 90 days
  for (let i = 0; i < 90; i++) {
    const sessionDate = new Date(baseDate);
    sessionDate.setDate(sessionDate.getDate() + i);

    workouts.push({
      userId,
      date: sessionDate.toISOString().split('T')[0],
      duration: 30 + Math.floor(Math.random() * 20),
      intensity: 5,
      activity: 'Running',
    });

    checkIns.push({
      userId,
      date: sessionDate.toISOString().split('T')[0],
      sleepQuality: 2 + Math.floor(Math.random() * 3),
      stressLevel: 2 + Math.floor(Math.random() * 3),
      nutritionQuality: 3,
      restingHeartRate: 55 + Math.floor(Math.random() * 10),
    });
  }

  return { workouts, checkIns };
}

setupTestUsers();
