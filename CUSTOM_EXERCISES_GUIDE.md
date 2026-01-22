# Custom Exercises - Complete Guide

## Overview

The custom exercise feature allows users to create, manage, and track their own exercises with full muscle activation profiles. The system includes intelligent similarity matching, automatic validation, and comprehensive management tools.

## Key Features Implemented

### 1. **Exercise Creation & Editing**
- Create custom exercises with 13-muscle activation profiles
- Edit existing exercises with full data retention
- Duplicate exercises for creating variations
- Auto-save functionality (every 30 seconds)
- Keyboard shortcuts (Cmd/Ctrl+S to save, Esc to cancel)

### 2. **Muscle Activation System**
- **Grouped Muscle Sliders**: Muscles organized by body region
  - Upper Body - Push (Chest, Deltoids, Triceps)
  - Upper Body - Pull (Lats, Trapezius, Biceps, Forearm)
  - Core (Abs, Lumbar)
  - Lower Body (Quads, Hamstrings, Glutes, Calves)
- **Collapsible Groups**: Mobile-friendly accordion interface
- **Quick Templates**: Pre-built activation patterns
  - Push (Chest Focus)
  - Push (Shoulder Focus)
  - Pull (Back Focus)
  - Pull (Biceps Focus)
  - Legs (Quad Focus)
  - Legs (Hamstring Focus)
  - Core (Abs Focus)
  - Full Body Compound

### 3. **Advanced Validation**
- **Name Validation**
  - Duplicate detection (checks existing custom exercises)
  - Length limits (100 characters max)
  - Required field enforcement
- **Muscle Activation Validation**
  - Minimum activation threshold (at least one muscle ≥ 0.3)
  - Maximum total activation (≤ 6.0 to prevent unrealistic profiles)
  - Anatomical issue detection (warns about opposing muscle groups)
  - Full-body compound exercise detection
- **Real-time Feedback**
  - Inline error messages
  - Warning messages for edge cases
  - Debounced validation (500ms delay)

### 4. **Similarity Algorithm**
- **Multi-Factor Comparison**
  - Weighted cosine similarity for muscle activation (larger muscles weighted higher)
  - Equipment similarity (Jaccard index)
  - Mechanics matching (Compound/Isolation/Corrective)
  - Optional difficulty comparison
- **Caching System**
  - 5-minute cache for similarity calculations
  - Significant performance improvement for repeated comparisons
- **Visual Comparison**
  - Side-by-side muscle activation charts
  - Color-coded similarity badges
  - Top 3 similar exercises shown in real-time

### 5. **Exercise Management Dashboard**
- **List View**
  - All custom exercises displayed with key metadata
  - Usage statistics (times used in workouts)
  - Difficulty levels
  - Muscle activation mini-bars
- **Search & Filter**
  - Real-time search (debounced 300ms)
  - Search by name, description, mechanics, equipment
  - Sort options: Newest, Name, Most Used, Difficulty
- **Bulk Operations**
  - Multi-select with checkboxes
  - Bulk delete functionality
  - Selection counter
- **Statistics Dashboard**
  - Total exercise count
  - Most used exercise
  - Total workout usage count

### 6. **Data Persistence**
- **Database Integration**
  - RLS (Row Level Security) enforced
  - User isolation (users only see their own exercises)
  - Atomic operations with proper transaction handling
  - RPC function for safe usage_count increments
- **Local Storage**
  - Auto-save drafts to localStorage
  - 1-hour retention for unsaved work
  - Restore prompt on page revisit
- **Error Handling**
  - Comprehensive error messages
  - Graceful degradation
  - User-friendly error reporting

### 7. **Premium Features**
- **Free Tier**: 3 custom exercises
- **Premium**: Unlimited custom exercises
- **Upsell Flow**
  - Non-intrusive gate at creation limit
  - Clear value proposition
  - Easy upgrade path

## File Structure

```
/custom-exercise.html                    # Exercise creation/edit UI
/manage-exercises.html                   # Exercise management dashboard

/js/custom-exercise-page-improved.js     # Main creation logic
/js/manage-exercises-page.js             # Dashboard logic
/js/custom-exercise-service.js           # API layer (CRUD operations)
/js/custom-exercise-loader.js            # Data loading utilities
/js/exercise-similarity.js               # Similarity algorithm
/js/muscle-groups.js                     # Muscle grouping & templates
/js/utils.js                             # Utilities (debounce, cache, etc.)

/supabase/migrations/
  └── add_increment_exercise_usage_rpc.sql  # Safe usage tracking
```

## API Reference

### Custom Exercise Service

```javascript
import {
  saveCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  getUserCustomExercises,
  getCustomExerciseById,
  getCustomExerciseCount,
  getCustomExerciseNames,
  incrementUsageCount,
  bulkDeleteCustomExercises,
  duplicateCustomExercise
} from './custom-exercise-service.js';
```

### Similarity Functions

```javascript
import {
  calculateSimilarity,
  findSimilarExercises,
  validateExerciseName,
  validateMuscleActivation,
  detectAnatomicalIssues,
  getSimilarityColor,
  getSimilarityLabel
} from './exercise-similarity.js';
```

### Utility Functions

```javascript
import {
  debounce,
  throttle,
  SimpleCache,
  escapeHtml,
  saveToLocalStorage,
  loadFromLocalStorage
} from './utils.js';
```

## Database Schema

```sql
CREATE TABLE user_custom_exercises (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  difficulty integer,
  exercise_type text[],
  mechanics text,
  equipment text[],
  video_url text,
  notes text,
  muscle_data jsonb,
  is_validated boolean,
  validation_score decimal(5,2),
  similar_exercise_id integer,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);
```

## User Workflows

### Creating a Custom Exercise

1. Navigate to Record Training page
2. Click "+ Create Custom Exercise" or "⚙️ Manage"
3. Fill in basic information (name required)
4. Adjust muscle activation sliders or select a template
5. Optionally add equipment, video URL, description
6. Review similar exercises in real-time
7. Save (auto-saved every 30 seconds)
8. Redirected to management dashboard

### Editing an Exercise

1. Go to Manage Custom Exercises
2. Click "✏️ Edit" on any exercise
3. Modify fields as needed
4. See updated similarity comparisons
5. Save changes

### Using Custom Exercises in Workouts

1. Custom exercises automatically appear in exercise picker
2. Marked with teal "Custom" badge
3. Listed first in search results
4. Usage count incremented automatically when used

## Best Practices

### For Users

1. **Muscle Activation Values**
   - Use 1.0 for primary muscles (the main movers)
   - Use 0.5-0.7 for secondary muscles
   - Use 0.3-0.4 for stabilizers
   - Leave at 0 for uninvolved muscles

2. **Naming Conventions**
   - Be specific (e.g., "Smith Machine Squat" not "Squat")
   - Include variations (e.g., "Wide Grip Lat Pulldown")
   - Avoid duplicates

3. **Templates**
   - Start with a template close to your exercise
   - Fine-tune activation values
   - Save as base for similar exercises

### For Developers

1. **Performance**
   - Always debounce rapid updates
   - Use caching for expensive calculations
   - Limit database queries

2. **Security**
   - Never trust client input
   - Validate on both client and server
   - Use RLS policies consistently
   - Escape all user-generated content

3. **Error Handling**
   - Return structured responses with success flags
   - Provide user-friendly error messages
   - Log errors for debugging
   - Handle edge cases gracefully

## Known Limitations

1. **Muscle Model Simplification**
   - 13-muscle model is simplified
   - Doesn't account for muscle fiber types
   - No distinction between concentric/eccentric

2. **Similarity Algorithm**
   - Purely mathematical comparison
   - Doesn't understand exercise biomechanics
   - Can't distinguish complementary vs similar

3. **Free Tier Limits**
   - 3 custom exercises max
   - No cloud backup for free users

## Future Enhancements

### Planned
- Visual body diagram for muscle selection
- Video upload and hosting
- Exercise sharing with friends
- Community exercise library
- Exercise effectiveness tracking
- Form check AI integration

### Under Consideration
- Import from CSV
- Export to PDF
- Progressive overload suggestions
- Injury risk assessment
- Recovery time recommendations

## Troubleshooting

### "An exercise with this name already exists"
- Check Manage Exercises for duplicates
- Names are case-insensitive
- Add variation details to name

### Similarity scores seem off
- Ensure muscle activation values are realistic
- Check that primary muscles are set to 0.7-1.0
- Review anatomical warning messages

### Auto-save not working
- Check browser localStorage is enabled
- Try private/incognito mode to rule out extensions
- Clear localStorage and try again

### Premium upsell showing incorrectly
- Refresh page to sync subscription status
- Check that Stripe is properly configured
- Contact support if issue persists

## Support

For issues or feature requests, please check:
1. This guide
2. SETUP.md for configuration
3. GitHub issues for known problems
