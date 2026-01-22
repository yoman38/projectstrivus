# Strivus Setup Guide

## Prerequisites

1. A Supabase account (free tier works fine)
2. Node.js installed on your machine

## Initial Setup

### 1. Supabase Project Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for your project to finish provisioning
3. Once ready, go to **Settings** → **API** in your Supabase dashboard
4. Copy your **Project URL** and **anon/public key**

### 2. Configuration

1. Copy the example config file to create your own:
   ```bash
   cp js/config.example.js js/config.js
   ```

2. Open the file `js/config.js` in your text editor

3. Replace the placeholder values with your actual Supabase credentials:
   ```javascript
   window.SUPABASE_CONFIG = {
       url: 'https://your-project.supabase.co',
       anonKey: 'your-actual-anon-key-here'
   };
   ```

4. Save the file

### 3. Database Migration

The database schema has already been applied through the Supabase migration system. Your database should include:

- `user_profiles` - Extended user information
- `workouts` - Workout session records
- `workout_exercises` - Individual exercises within workouts
- `sport_sessions` - Non-exercise activities
- `user_check_ins` - Daily wellness check-ins
- `user_exercise_prs` - Personal records
- `user_fitness_metrics` - Calculated fitness/fatigue scores

All tables have Row Level Security (RLS) enabled, ensuring users can only access their own data.

### 4. Running the Application

**Option A: Static File Server (Recommended for most users)**

Simply serve the files using any static file server. For example:

Using Python:
```bash
python -m http.server 8000
```

Using Node.js with `http-server`:
```bash
npx http-server -p 8000
```

Then open your browser to `http://localhost:8000`

**Option B: With Backend Server (For AI Exercise Generation)**

If you want to use the AI-powered exercise generation feature:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your OpenAI API key in `server.js`

3. Start the backend server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:3000`

## First Time User Flow

1. Navigate to `/auth.html` to create an account
2. Sign up with your email and password
3. You'll be automatically logged in and redirected to the home page
4. Start by recording your first workout in the **Record** section
5. Check your fitness metrics in the **Condition** section

## Features

### Authentication
- Email/password authentication via Supabase Auth
- Secure session management
- Auto-redirect to login if not authenticated

### Workout Recording
- Log exercises with sets, reps, and weights
- Track sport activities with duration
- Record workout intensity (RPE) and notes
- Automatic personal record tracking

### Condition Tracking
- Daily wellness check-ins (sleep, stress, nutrition)
- Fitness and fatigue score calculation
- ACWR (Acute:Chronic Workload Ratio) monitoring
- Muscle group readiness visualization

### Data Persistence
- All data stored securely in Supabase
- Automatic backup and sync across devices
- Full workout history and analytics
- Personal records automatically calculated

## Security

- All database tables use Row Level Security (RLS)
- Users can only access their own data
- Passwords are securely hashed by Supabase Auth
- Session tokens are managed automatically

## Troubleshooting

### "Supabase configuration is missing"
- Check that `js/config.js` exists and has your actual Supabase credentials
- Make sure you replaced the placeholder values with your real URL and anon key
- Clear your browser cache and reload the page

### "User not authenticated" errors
- Make sure you're logged in by visiting `/auth.html`
- Check your browser console for any authentication errors

### Data not showing up
- Verify you've completed at least one workout
- Check the browser console for any API errors
- Ensure your Supabase project is running and accessible

## Support

For issues or questions, check the Supabase documentation at https://supabase.com/docs
