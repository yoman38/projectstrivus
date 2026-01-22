let currentTab = 'dashboard';
let currentRecordStep = 1;
let recordData = {
    date: new Date().toISOString().split('T')[0],
    activityType: 'strength',
    exercises: [],
    rpe: 5,
    notes: ''
};

let checkInData = {
    sleep: null,
    energy: null,
    soreness: null,
    mood: null
};

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-button');
    const navItems = document.querySelectorAll('.bottom-nav-item');

    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    buttons.forEach(btn => btn.classList.remove('active'));
    navItems.forEach(item => item.classList.remove('active'));

    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'flex';
    }

    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    document.querySelector(`.bottom-nav-item[data-tab="${tabName}"]`)?.classList.add('active');

    currentTab = tabName;

    if (window.swipeNav) {
        window.swipeNav.syncCurrentTab(tabName);
    }

    if (tabName === 'record') {
        initRecordTab();
    } else if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'history') {
        loadHistoryTab();
    } else if (tabName === 'condition') {
        loadConditionTab();
    } else if (tabName === 'ai-coach') {
        loadAICoachTab();
    } else if (tabName === 'settings') {
        loadSettingsTab();
    }
}

function recordNextStep() {
    if (currentRecordStep === 2 && recordData.exercises.length === 0) {
        alert('Please add at least one exercise to continue');
        return;
    }

    if (currentRecordStep === 3 && recordData.exercises.some(ex => ex.sets.length === 0)) {
        alert('Please log sets for all exercises');
        return;
    }

    if (currentRecordStep < 5) {
        const currentStepEl = document.getElementById(`recordStep${currentRecordStep}`);
        if (currentStepEl) currentStepEl.style.display = 'none';

        currentRecordStep++;

        const nextStepEl = document.getElementById(`recordStep${currentRecordStep}`);
        if (nextStepEl) nextStepEl.style.display = 'block';

        if (currentRecordStep === 3) {
            renderSetsLogging();
        } else if (currentRecordStep === 5) {
            renderReview();
        }

        updateRecordProgress();
        updateStepIndicators();
    } else {
        saveWorkout();
    }
}

function recordPrevStep() {
    if (currentRecordStep > 1) {
        const currentStepEl = document.getElementById(`recordStep${currentRecordStep}`);
        if (currentStepEl) currentStepEl.style.display = 'none';

        currentRecordStep--;

        const prevStepEl = document.getElementById(`recordStep${currentRecordStep}`);
        if (prevStepEl) prevStepEl.style.display = 'block';

        updateRecordProgress();
        updateStepIndicators();
    }
}

function updateRecordProgress() {
    const progress = (currentRecordStep / 5) * 100;
    const progressFill = document.getElementById('recordProgress');
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }

    const nextBtn = document.getElementById('recordNextBtn');
    const prevBtn = document.getElementById('recordPrevBtn');

    if (currentRecordStep === 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.textContent = 'Next';
    } else if (currentRecordStep === 5) {
        if (prevBtn) prevBtn.style.display = 'block';
        if (nextBtn) nextBtn.textContent = 'Save';
    } else {
        if (prevBtn) prevBtn.style.display = 'block';
        if (nextBtn) nextBtn.textContent = 'Next';
    }
}

function updateStepIndicators() {
    for (let i = 1; i <= 5; i++) {
        const stepEl = document.getElementById(`step${i}`);
        if (stepEl) {
            stepEl.classList.remove('active', 'completed');
            if (i < currentRecordStep) {
                stepEl.classList.add('completed');
            } else if (i === currentRecordStep) {
                stepEl.classList.add('active');
            }
        }
    }
}

function initRecordTab() {
    recordData.date = document.getElementById('workoutDate').value || new Date().toISOString().split('T')[0];
    document.getElementById('workoutDate').value = recordData.date;
    updateRecordProgress();
    updateStepIndicators();
}

function switchHistorySubtab(subtabName) {
    const subtabs = document.querySelectorAll('.history-subtab');
    const buttons = document.querySelectorAll('[data-subtab]');

    subtabs.forEach(subtab => {
        subtab.style.display = 'none';
        subtab.classList.remove('active');
    });

    buttons.forEach(btn => btn.classList.remove('active'));

    const selectedSubtab = document.getElementById(`history${subtabName.charAt(0).toUpperCase() + subtabName.slice(1)}`);
    if (selectedSubtab) {
        selectedSubtab.style.display = 'block';
        selectedSubtab.classList.add('active');
    }

    document.querySelector(`[data-subtab="${subtabName}"]`)?.classList.add('active');
}

function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const workouts = JSON.parse(localStorage.getItem('strivusWorkouts') || '[]');
    const todayWorkouts = workouts.filter(w => w.date === today);

    document.getElementById('dashTodayWorkouts').textContent = todayWorkouts.length;

    const greatingMessages = [
        "Time to shine!",
        "Let's crush it!",
        "You've got this!",
        "Keep the momentum!",
        "Stay strong!"
    ];

    const encouragements = [
        "Your consistency is paying off",
        "Every rep brings you closer to your goals",
        "You're building something amazing",
        "Your future self will thank you",
        "This is where champions are made"
    ];

    const randomGreeting = greatingMessages[Math.floor(Math.random() * greatingMessages.length)];
    const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];

    document.getElementById('dashboardGreeting').textContent = randomGreeting;
    document.getElementById('dashboardMessage').textContent = randomEncouragement;

    animateAICharacter();
}

function loadHistoryTab() {
    const workouts = JSON.parse(localStorage.getItem('strivusWorkouts') || '[]');
    const recentList = document.getElementById('recentWorkoutsList');

    if (workouts.length === 0) {
        recentList.innerHTML = '<p class="text-tertiary">No workouts logged yet. Start tracking your progress!</p>';
        return;
    }

    const recent = workouts.slice(-10).reverse();
    recentList.innerHTML = recent.map(workout => `
        <div class="glass-card" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <p><strong>${new Date(workout.date).toLocaleDateString()}</strong></p>
                    <p class="text-secondary">${workout.exercises.length} exercises</p>
                </div>
                <p class="text-tertiary">RPE ${workout.intensity}</p>
            </div>
        </div>
    `).join('');
}

function loadConditionTab() {
    setupCheckInButtons();
    updateReadinessGauge();
}

function loadAICoachTab() {
    const chatArea = document.getElementById('chatMessages');
    if (chatArea && chatArea.children.length === 0) {
        chatArea.innerHTML = `
            <div class="chat-bubble ai">
                <p>Hey there! I'm your personal AI fitness coach. I'm here to help you:</p>
                <ul style="margin-top: 12px; margin-left: 20px;">
                    <li>Answer questions about your training</li>
                    <li>Give form tips and corrections</li>
                    <li>Suggest recovery strategies</li>
                    <li>Motivate you to reach your goals</li>
                </ul>
                <p style="margin-top: 12px;">What would you like to know?</p>
            </div>
        `;
    }
}

function loadSettingsTab() {
    (async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                document.getElementById('settingsEmail').textContent = `Email: ${user.email}`;
            }
        } catch (error) {
            console.error('Error loading user email:', error);
        }
    })();
}

function setupCheckInButtons() {
    const buttons = document.querySelectorAll('.quick-btn[data-metric]');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const metric = button.dataset.metric;
            const value = parseInt(button.dataset.value);

            const siblingButtons = document.querySelectorAll(`[data-metric="${metric}"]`);
            siblingButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            checkInData[metric] = value;
            updateReadinessGauge();
        });
    });
}

function updateReadinessGauge() {
    const values = Object.values(checkInData).filter(v => v !== null);
    if (values.length === 0) {
        document.getElementById('readinessScore').textContent = '--';
        document.getElementById('readinessText').textContent = 'Log your check-in to see readiness';
        return;
    }

    const average = values.reduce((a, b) => a + b) / values.length;
    const score = Math.round(average * 10);
    document.getElementById('readinessScore').textContent = score;

    let statusText = '';
    if (score >= 30) statusText = 'Excellent - Ready for intense training';
    else if (score >= 20) statusText = 'Good - Ready for a solid workout';
    else if (score >= 10) statusText = 'Fair - Take it easy today';
    else statusText = 'Low - Focus on recovery';

    document.getElementById('readinessText').textContent = statusText;
    document.getElementById('readinessForecast').textContent = generateReadinessForecast(score);
}

function generateReadinessForecast(score) {
    const forecasts = [
        "You're in great shape. Push yourself today!",
        "You're ready for a good session. Go for it!",
        "Take it easy and focus on form.",
        "Prioritize recovery today. Light work recommended.",
        "Your body needs rest. Consider a rest day."
    ];

    if (score >= 30) return forecasts[0];
    else if (score >= 20) return forecasts[1];
    else if (score >= 10) return forecasts[2];
    else return forecasts[4];
}

function saveCheckIn() {
    const values = Object.values(checkInData).filter(v => v !== null);
    if (values.length === 0) {
        alert('Please fill in at least one metric');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (window.syncCheckInToSupabase) {
        window.syncCheckInToSupabase(checkInData, today).then(() => {
            alert('Check-in saved!');
            checkInData = { sleep: null, energy: null, soreness: null, mood: null };
            document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
        });
    }
}

function openExercisePicker() {
    alert('Exercise picker modal would open here');
}

function saveWorkout() {
    if (recordData.exercises.length === 0) {
        alert('Please add at least one exercise');
        return;
    }

    const workout = {
        date: recordData.date,
        exercises: recordData.exercises,
        intensity: recordData.rpe,
        notes: recordData.notes,
        sports: []
    };

    if (window.syncWorkoutToSupabase) {
        window.syncWorkoutToSupabase(workout).then(() => {
            alert('Workout saved!');
            resetRecordTab();
            switchTab('dashboard');
        });
    }
}

function resetRecordTab() {
    currentRecordStep = 1;
    recordData = {
        date: new Date().toISOString().split('T')[0],
        activityType: 'strength',
        exercises: [],
        rpe: 5,
        notes: ''
    };
}

function openExercisePicker() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    modal.innerHTML = `
        <div class="glass-card" style="width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto;">
            <h3>Add Exercise</h3>
            <p class="text-tertiary" style="margin-bottom: 16px;">Select an exercise to add</p>
            <div id="exerciseList" style="display: grid; gap: 8px;"></div>
            <button class="glass-btn glass-btn-secondary" onclick="this.closest('div').parentElement.remove()" style="width: 100%; margin-top: 16px;">Close</button>
        </div>
    `;

    document.body.appendChild(modal);

    const exercises = [
        'Bench Press', 'Squats', 'Deadlifts', 'Pull-ups', 'Rows',
        'Dips', 'Leg Press', 'Lat Pulldown', 'Chest Fly', 'Leg Curl',
        'Running', 'Cycling', 'Swimming', 'Rowing', 'Jump Rope'
    ];

    const exerciseList = modal.querySelector('#exerciseList');
    exercises.forEach(ex => {
        const btn = document.createElement('button');
        btn.className = 'glass-btn glass-btn-secondary';
        btn.textContent = ex;
        btn.style.justifyContent = 'flex-start';
        btn.onclick = () => {
            recordData.exercises.push({ name: ex, sets: [] });
            updateSelectedExercises();
            modal.remove();
        };
        exerciseList.appendChild(btn);
    });
}

function updateSelectedExercises() {
    const container = document.getElementById('selectedExercises');
    container.innerHTML = recordData.exercises.map((ex, idx) => `
        <div class="glass-card" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span>${ex.name}</span>
            <button class="glass-btn glass-btn-small" onclick="removeExercise(${idx})">Remove</button>
        </div>
    `).join('');
}

function renderSetsLogging() {
    const container = document.getElementById('setsContainer');
    container.innerHTML = recordData.exercises.map((ex, exIdx) => `
        <div class="glass-card" style="margin-bottom: 16px;">
            <h4 style="margin-bottom: 12px;">${ex.name}</h4>
            <div id="sets-${exIdx}" style="margin-bottom: 12px;"></div>
            <button class="glass-btn glass-btn-secondary" onclick="addSet(${exIdx})" style="width: 100%;">+ Add Set</button>
        </div>
    `).join('');

    recordData.exercises.forEach((ex, exIdx) => {
        const setsContainer = document.getElementById(`sets-${exIdx}`);
        ex.sets = ex.sets || [];
        setsContainer.innerHTML = ex.sets.map((set, setIdx) => `
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="number" placeholder="Weight" value="${set.weight || ''}"
                    class="glass-input" style="flex: 1; max-width: 80px;"
                    onchange="updateSet(${exIdx}, ${setIdx}, 'weight', this.value)">
                <input type="number" placeholder="Reps" value="${set.reps || ''}"
                    class="glass-input" style="flex: 1; max-width: 60px;"
                    onchange="updateSet(${exIdx}, ${setIdx}, 'reps', this.value)">
                <button class="glass-btn glass-btn-small" onclick="removeSet(${exIdx}, ${setIdx})" style="padding: 8px 12px;">Delete</button>
            </div>
        `).join('');
    });
}

function addSet(exerciseIdx) {
    if (!recordData.exercises[exerciseIdx].sets) {
        recordData.exercises[exerciseIdx].sets = [];
    }
    recordData.exercises[exerciseIdx].sets.push({ weight: '', reps: '' });
    renderSetsLogging();
}

function removeSet(exerciseIdx, setIdx) {
    recordData.exercises[exerciseIdx].sets.splice(setIdx, 1);
    renderSetsLogging();
}

function updateSet(exerciseIdx, setIdx, field, value) {
    if (!recordData.exercises[exerciseIdx].sets[setIdx]) {
        recordData.exercises[exerciseIdx].sets[setIdx] = { weight: '', reps: '' };
    }
    recordData.exercises[exerciseIdx].sets[setIdx][field] = value;
}

function renderReview() {
    document.getElementById('reviewDate').textContent = new Date(recordData.date).toLocaleDateString();
    document.getElementById('reviewExercises').textContent = recordData.exercises.map(ex => ex.name).join(', ');
    document.getElementById('reviewRPE').textContent = recordData.rpe;
}

function removeExercise(index) {
    recordData.exercises.splice(index, 1);
    updateSelectedExercises();
}

function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();

    if (!message) return;

    const chatArea = document.getElementById('chatMessages');
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.textContent = message;
    chatArea.appendChild(userBubble);

    input.value = '';

    setTimeout(() => {
        const aiBubble = document.createElement('div');
        aiBubble.className = 'chat-bubble ai';
        aiBubble.innerHTML = generateAIResponse(message);
        chatArea.appendChild(aiBubble);

        chatArea.parentElement.scrollTop = chatArea.parentElement.scrollHeight;

        animateAICharacter();
    }, 500);
}

function sendAIPrompt(prompt) {
    document.getElementById('aiInput').value = prompt;
    sendAIMessage();
}

function generateAIResponse(userMessage) {
    const responses = {
        'focus': "Based on your recent workouts, I recommend focusing on your weak points. Push yourself on compound lifts today!",
        'form': "Great question! Keep your chest up, core tight, and move with control. Quality reps beat heavy weight every time.",
        'recovery': "Sleep well, eat enough protein, and don't skip stretching. Your muscles grow during recovery, not in the gym!",
        'tired': "Rest is important! Listen to your body. A rest day now prevents burnout and injury later.",
        'default': "That's a great question! Keep me updated on your progress, and we'll adjust your training based on your results."
    };

    const lower = userMessage.toLowerCase();
    if (lower.includes('focus') || lower.includes('today')) return responses.focus;
    if (lower.includes('form') || lower.includes('technique')) return responses.form;
    if (lower.includes('recovery') || lower.includes('rest')) return responses.recovery;
    if (lower.includes('tired') || lower.includes('fatigue')) return responses.tired;
    return responses.default;
}

function animateAICharacter() {
    const character = document.getElementById('aiCharacter');
    if (character) {
        character.style.animation = 'none';
        setTimeout(() => {
            character.style.animation = 'gentle-bob 3s ease-in-out infinite';
        }, 10);
    }
}

function exportData() {
    const workouts = localStorage.getItem('strivusWorkouts');
    const data = JSON.stringify(JSON.parse(workouts || '[]'), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'strivus-workouts.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearAllData() {
    if (confirm('Are you sure? This will delete all your workout data. This cannot be undone.')) {
        localStorage.clear();
        location.reload();
    }
}

function logout() {
    (async () => {
        await supabase.auth.signOut();
        location.href = 'auth.html';
    })();
}

document.addEventListener('DOMContentLoaded', () => {
    updateRecordProgress();
    setupCheckInButtons();
    document.getElementById('rpeSlider')?.addEventListener('input', (e) => {
        recordData.rpe = parseInt(e.target.value);
        document.getElementById('rpeValue').textContent = recordData.rpe;
    });

    document.getElementById('workoutDate')?.addEventListener('change', (e) => {
        recordData.date = e.target.value;
    });

    document.getElementById('activityType')?.addEventListener('change', (e) => {
        recordData.activityType = e.target.value;
    });

    document.getElementById('workoutNotes')?.addEventListener('change', (e) => {
        recordData.notes = e.target.value;
    });

    const tabButtons = document.querySelectorAll('.tab-button[data-tab]');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    loadDashboard();
});
