import { initAuth } from './auth-guard.js';
import { saveWorkout, getPersonalRecords } from './workout-service.js';
import { loadExercises, getExercises } from './exercise-loader.js';
import { loadCustomExercises } from './custom-exercise-loader.js';

let ALL_EXERCISES = [];

async function loadExercisesData() {
    const standardExercises = await loadExercises();
    const customExercises = await loadCustomExercises();
    ALL_EXERCISES = [...standardExercises, ...customExercises];
}

const workoutState = {
    exercises: [],
    sports: []
};

function initializePage() {
    document.getElementById('workout-date').value = new Date().toISOString().split('T')[0];

    document.getElementById('intensity-slider').addEventListener('input', (e) => {
        document.getElementById('intensity-value').textContent = e.target.value;
    });

    document.getElementById('save-workout-btn').addEventListener('click', handleSaveWorkout);
    document.getElementById('add-activity-btn').addEventListener('click', handleAddActivity);
    document.getElementById('close-modal-btn').addEventListener('click', closeExerciseModal);

    populateActivityDropdown();
}

function populateActivityDropdown() {
    const select = document.getElementById('activity-type');
    const activities = [
        'Weightlifting',
        'Running',
        'Cycling',
        'Swimming',
        'Yoga',
        'CrossFit',
        'Martial Arts',
        'Team Sports',
        'Other'
    ];

    select.innerHTML = activities.map(activity =>
        `<option value="${activity}">${activity}</option>`
    ).join('');
}

function handleAddActivity() {
    const activityType = document.getElementById('activity-type').value;

    const sportActivities = ['Running', 'Cycling', 'Swimming', 'Yoga', 'Martial Arts', 'Team Sports', 'Other'];

    if (sportActivities.includes(activityType)) {
        addSportSession(activityType);
    } else {
        openExerciseModal();
    }
}

function addSportSession(sportName) {
    const template = document.getElementById('sport-session-template');
    const clone = template.content.cloneNode(true);

    const card = clone.querySelector('.control-card');
    card.dataset.activityName = sportName;
    card.querySelector('.activity-name').textContent = sportName;

    const durationInput = card.querySelector('.duration-input');
    durationInput.addEventListener('input', updateTotalDurationDisplay);

    card.querySelector('.remove-card-btn').addEventListener('click', () => {
        card.remove();
        updateTotalDurationDisplay();
    });

    document.getElementById('workout-log-container').appendChild(card);

    workoutState.sports.push({
        activity_name: sportName,
        duration_minutes: 0
    });
}

function updateTotalDurationDisplay() {
    const sportCards = document.querySelectorAll('#workout-log-container .control-card[data-activity-name]');
    let totalSportDuration = 0;

    sportCards.forEach(card => {
        const duration = parseInt(card.querySelector('.duration-input').value) || 0;
        totalSportDuration += duration;
    });

    const durationInput = document.getElementById('workout-duration');
    const currentTotal = parseInt(durationInput.value) || 0;

    if (currentTotal === 0 && totalSportDuration > 0) {
        durationInput.value = totalSportDuration;
    }
}

function openExerciseModal() {
    const modal = document.getElementById('exercise-modal-overlay');
    const searchInput = document.getElementById('exercise-search');
    const exerciseList = document.getElementById('exercise-list');

    const renderExercises = (filter = '') => {
        const filtered = ALL_EXERCISES.filter(ex =>
            ex.Exercise_Name.toLowerCase().includes(filter.toLowerCase())
        );

        const customExercises = filtered.filter(ex => ex.is_custom);
        const standardExercises = filtered.filter(ex => !ex.is_custom).slice(0, 50);

        let html = '';

        if (customExercises.length > 0) {
            html += '<div class="mb-3 pb-3 border-b border-slate-600">';
            html += '<div class="text-xs font-semibold text-accent-teal mb-2 px-4">YOUR CUSTOM EXERCISES</div>';
            html += customExercises.map(ex => `
                <button class="w-full text-left px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition mb-1" data-exercise-id="${ex.id}">
                    <div class="font-semibold text-white">${ex.Exercise_Name}</div>
                    <div class="text-xs text-accent-teal">Custom • ${ex.difficulty}/5 difficulty</div>
                </button>
            `).join('');
            html += '</div>';
        }

        if (standardExercises.length > 0) {
            html += '<div class="text-xs font-semibold text-slate-400 mb-2 px-4">STANDARD EXERCISES</div>';
            html += standardExercises.map(ex => `
                <button class="w-full text-left px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition mb-1" data-exercise-id="${ex.id}">
                    <div class="font-semibold text-white">${ex.Exercise_Name}</div>
                    <div class="text-xs text-slate-400">${ex.category || 'General'} • ${ex.difficulty}/5 difficulty</div>
                </button>
            `).join('');
        }

        exerciseList.innerHTML = html;

        exerciseList.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const exerciseId = btn.dataset.exerciseId;
                addExercise(exerciseId);
                closeExerciseModal();
            });
        });
    };

    searchInput.value = '';
    renderExercises();
    searchInput.addEventListener('input', (e) => renderExercises(e.target.value));

    modal.classList.remove('hidden');
}

function closeExerciseModal() {
    const modal = document.getElementById('exercise-modal-overlay');
    modal.classList.add('hidden');
}

async function addExercise(exerciseId) {
    const parsedId = typeof exerciseId === 'string' ? exerciseId : exerciseId.toString();
    const exercise = ALL_EXERCISES.find(ex => ex.id.toString() === parsedId);
    if (!exercise) return;

    const template = document.getElementById('exercise-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.control-card');

    card.dataset.exerciseId = parsedId;
    card.dataset.isCustom = exercise.is_custom ? 'true' : 'false';
    card.querySelector('.exercise-name').textContent = exercise.Exercise_Name;

    const prs = await getPersonalRecords(exerciseId);
    const pr = prs.length > 0 ? prs[0] : null;

    if (pr) {
        const prDisplay = card.querySelector('.pr-display');
        const prGrid = prDisplay.querySelector('.grid');
        prGrid.innerHTML = `
            <div><span class="text-slate-500">Max Weight:</span> <span class="text-action-blue font-semibold">${pr.max_weight} kg</span></div>
            <div><span class="text-slate-500">Max Reps:</span> <span class="text-action-blue font-semibold">${pr.max_reps}</span></div>
            <div><span class="text-slate-500">Best Volume:</span> <span class="text-action-blue font-semibold">${pr.max_volume.toFixed(0)} kg</span></div>
            <div><span class="text-slate-500">Est. 1RM:</span> <span class="text-action-blue font-semibold">${pr.max_one_rep_max.toFixed(1)} kg</span></div>
        `;
    }

    if (exercise.video_path_gif) {
        const videoSection = card.querySelector('.video-section');
        const iframe = videoSection.querySelector('iframe');
        const videoId = exercise.video_path_gif.includes('youtube.com') || exercise.video_path_gif.includes('youtu.be')
            ? exercise.video_path_gif.split('/').pop().split('?')[0].replace('watch?v=', '')
            : null;

        if (videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}`;
            videoSection.classList.remove('hidden');
        }
    }

    if (exercise.HowToPerform) {
        const howToSection = card.querySelector('.how-to-perform-section');
        howToSection.querySelector('.how-to-perform-text').textContent = exercise.HowToPerform;
        howToSection.classList.remove('hidden');
    }

    if (exercise.CommonErrors) {
        const errorsSection = card.querySelector('.common-errors-section');
        errorsSection.querySelector('.common-errors-text').textContent = exercise.CommonErrors;
        errorsSection.classList.remove('hidden');
    }

    const isTimeBased = exercise.metric === 'time';
    if (isTimeBased) {
        const setsContainer = card.querySelector('.sets-container');
        setsContainer.dataset.isTimeBased = 'true';
    }

    card.querySelector('.remove-card-btn').addEventListener('click', () => {
        card.remove();
        workoutState.exercises = workoutState.exercises.filter(e => e.exercise_id !== exerciseId);
    });

    card.querySelector('.add-set-btn').addEventListener('click', () => {
        addSetRow(card, isTimeBased);
    });

    addSetRow(card, isTimeBased);

    document.getElementById('workout-log-container').appendChild(card);

    workoutState.exercises.push({
        exercise_id: exerciseId,
        exercise_name: exercise.Exercise_Name,
        sets_data: []
    });
}

function addSetRow(card, isTimeBased = false) {
    const template = document.getElementById('set-row-template');
    const clone = template.content.cloneNode(true);
    const setRow = clone.querySelector('.set-row');

    const setsContainer = card.querySelector('.sets-container');
    const setNumber = setsContainer.querySelectorAll('.set-row').length + 1;
    setRow.querySelector('.set-number').textContent = setNumber;

    if (isTimeBased) {
        setRow.querySelector('.reps-input').classList.add('hidden');
        setRow.querySelector('.time-input').classList.remove('hidden');
    }

    setRow.querySelector('.delete-set-btn').addEventListener('click', () => {
        setRow.remove();
        updateSetNumbers(card);
    });

    setsContainer.appendChild(setRow);
}

function updateSetNumbers(card) {
    const setRows = card.querySelectorAll('.set-row');
    setRows.forEach((row, index) => {
        row.querySelector('.set-number').textContent = index + 1;
    });
}

async function handleSaveWorkout() {
    const saveBtn = document.getElementById('save-workout-btn');
    const originalText = saveBtn.textContent;

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const workoutDate = document.getElementById('workout-date').value;
        const duration = parseInt(document.getElementById('workout-duration').value) || 0;
        const intensity = parseInt(document.getElementById('intensity-slider').value);
        const notes = document.getElementById('workout-notes').value;

        const exercises = [];
        document.querySelectorAll('#workout-log-container .control-card[data-exercise-id]').forEach(card => {
            const exerciseId = parseInt(card.dataset.exerciseId);
            const exerciseName = card.querySelector('.exercise-name').textContent;
            const isTimeBased = card.querySelector('.sets-container').dataset.isTimeBased === 'true';

            const sets = [];
            card.querySelectorAll('.set-row').forEach(row => {
                const weight = row.querySelector('.weight-input').value;
                const reps = isTimeBased ? null : row.querySelector('.reps-input').value;
                const time = isTimeBased ? row.querySelector('.time-input').value : null;

                if (weight) {
                    sets.push({
                        weight: parseFloat(weight),
                        reps: reps ? parseInt(reps) : 0,
                        time: time ? parseInt(time) : null
                    });
                }
            });

            if (sets.length > 0) {
                exercises.push({
                    exercise_id: exerciseId,
                    exercise_name: exerciseName,
                    sets_data: sets
                });
            }
        });

        const sports = [];
        document.querySelectorAll('#workout-log-container .control-card[data-activity-name]').forEach(card => {
            const activityName = card.dataset.activityName;
            const duration = card.querySelector('.duration-input').value;

            if (duration) {
                sports.push({
                    activity_name: activityName,
                    duration_minutes: parseInt(duration)
                });
            }
        });

        if (exercises.length === 0 && sports.length === 0) {
            alert('Please add at least one exercise or sport activity.');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            return;
        }

        await saveWorkout({
            workout_date: workoutDate,
            duration_minutes: duration,
            intensity_rpe: intensity,
            notes,
            exercises,
            sports
        });

        saveBtn.textContent = 'Saved!';
        saveBtn.classList.add('bg-green-600');

        setTimeout(() => {
            saveBtn.classList.remove('bg-green-600');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }, 2000);

        document.getElementById('workout-log-container').innerHTML = '';
        document.getElementById('workout-duration').value = '';
        document.getElementById('workout-notes').value = '';
        document.getElementById('intensity-slider').value = '5';
        document.getElementById('intensity-value').textContent = '5';

    } catch (error) {
        console.error('Error saving workout:', error);
        saveBtn.textContent = 'Error - Try Again';
        saveBtn.classList.add('bg-red-600');

        setTimeout(() => {
            saveBtn.classList.remove('bg-red-600');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }, 3000);
    }
}

(async () => {
    const user = await initAuth();
    if (user) {
        await loadExercisesData();
        initializePage();
    }
})();
