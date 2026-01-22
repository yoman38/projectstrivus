import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = 'https://vxxvzvguwwqpuzthzwxb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHZ6dmd1d3dxcHV6dGh6d3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDUxMDgsImV4cCI6MjA4MjU4MTEwOH0.8K3ndaJbmP9MsPyWPwZvPbnzXwE31xdYw8lBCwqi0Aw';

const supabase = createClient(supabaseUrl, supabaseKey);

const USER_A_ID = '76a5c1c0-e6d4-4961-9397-36a7f7f14882';
const USER_B_ID = 'b935dc55-de62-4fb8-a4e6-5ea60b2b05a2';

async function checkMuscleTracking() {
    console.log('Testing Muscle Tracking System\n');

    console.log('=== User A (Weightlifting) ===');
    const { data: userAMetrics } = await supabase
        .from('user_fitness_metrics')
        .select('*')
        .eq('user_id', USER_A_ID)
        .order('metric_date', { ascending: false })
        .limit(1)
        .single();

    if (userAMetrics) {
        console.log('Latest Metrics Date:', userAMetrics.metric_date);
        console.log('Fitness Score:', userAMetrics.fitness_score);
        console.log('Fatigue Score:', userAMetrics.fatigue_score);
        console.log('Form Score:', userAMetrics.form_score);
        console.log('ACWR:', userAMetrics.acwr);
        console.log('Muscle Fatigue Data:', userAMetrics.muscle_group_fatigue ? 'Present' : 'Missing');

        if (userAMetrics.muscle_group_fatigue) {
            console.log('\nMuscle-specific fatigue:');
            const fatigue = userAMetrics.muscle_group_fatigue;
            console.log('  Chest:', fatigue.Chest?.toFixed(1) || 0);
            console.log('  Lats:', fatigue.Lats?.toFixed(1) || 0);
            console.log('  Quads:', fatigue.Quads?.toFixed(1) || 0);
            console.log('  Biceps:', fatigue.Biceps?.toFixed(1) || 0);
            console.log('  Triceps:', fatigue.Triceps?.toFixed(1) || 0);
        }
    } else {
        console.log('No metrics found for User A');
    }

    console.log('\n=== User B (Running) ===');
    const { data: userBMetrics } = await supabase
        .from('user_fitness_metrics')
        .select('*')
        .eq('user_id', USER_B_ID)
        .order('metric_date', { ascending: false })
        .limit(1)
        .single();

    if (userBMetrics) {
        console.log('Latest Metrics Date:', userBMetrics.metric_date);
        console.log('Fitness Score:', userBMetrics.fitness_score);
        console.log('Fatigue Score:', userBMetrics.fatigue_score);
        console.log('Form Score:', userBMetrics.form_score);
        console.log('ACWR:', userBMetrics.acwr);
        console.log('Muscle Fatigue Data:', userBMetrics.muscle_group_fatigue ? 'Present' : 'Missing');

        if (userBMetrics.muscle_group_fatigue) {
            console.log('\nMuscle-specific fatigue:');
            const fatigue = userBMetrics.muscle_group_fatigue;
            console.log('  Quads:', fatigue.Quads?.toFixed(1) || 0);
            console.log('  Hams:', fatigue.Hams?.toFixed(1) || 0);
            console.log('  Glutes:', fatigue.Glutes?.toFixed(1) || 0);
            console.log('  Calfs:', fatigue.Calfs?.toFixed(1) || 0);
            console.log('  Chest:', fatigue.Chest?.toFixed(1) || 0);
            console.log('  Lats:', fatigue.Lats?.toFixed(1) || 0);
        }
    } else {
        console.log('No metrics found for User B');
    }

    const { data: workouts } = await supabase
        .from('workouts')
        .select('workout_date, activity_type')
        .in('user_id', [USER_A_ID, USER_B_ID])
        .order('workout_date', { ascending: false })
        .limit(5);

    console.log('\n=== Recent Workouts with Activity Type ===');
    if (workouts) {
        workouts.forEach(w => {
            console.log(`${w.workout_date}: ${w.activity_type || 'Not classified yet'}`);
        });
    }

    console.log('\nTest complete!');
}

checkMuscleTracking().catch(console.error);
