let currentTab = 'dashboard';
let currentRecordStep = 1;
let recordData = {
    date: new Date().toISOString().split('T')[0],
    activityType: 'strength',
    exercises: [],
    rpe: 5,
    notes: '',
    duration: 45,
    trainingType: '',
    equipment: '',
    persona: '',
    focusArea: { upper: 50, lower: 50, core: 30 }
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

    if (window.aiCharacter) {
        window.dispatchEvent(new CustomEvent('aiEvent', {
            detail: { event: 'tab-switched', data: { tab: tabName } }
        }));
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

    if (subtabName === 'prs') {
        loadPRs();
    } else if (subtabName === 'analytics') {
        loadAnalytics();
    } else if (subtabName === 'trends') {
        loadMuscleGroupAnalysis();
    }
}

function switchConditionSubtab(subtabName) {
    const subtabs = document.querySelectorAll('.condition-subtab');
    const buttons = document.querySelectorAll('[data-subtab]');

    subtabs.forEach(subtab => {
        subtab.style.display = 'none';
        subtab.classList.remove('active');
    });

    buttons.forEach(btn => btn.classList.remove('active'));

    const selectedSubtab = document.getElementById(`condition${subtabName.charAt(0).toUpperCase() + subtabName.slice(1)}`);
    if (selectedSubtab) {
        selectedSubtab.style.display = 'block';
        selectedSubtab.classList.add('active');
    }

    if (subtabName === 'history') {
        loadCheckInHistory();
    } else if (subtabName === 'trends') {
        loadReadinessTrends();
    }

    document.querySelector(`[data-subtab="${subtabName}"]`)?.classList.add('active');
}

function loadCheckInHistory() {
    const checkIns = JSON.parse(localStorage.getItem('strivusCheckIns') || '[]');
    const container = document.getElementById('checkInHistory');

    if (checkIns.length === 0) {
        container.innerHTML = '<p class="text-tertiary">No check-ins yet. Start logging!</p>';
        return;
    }

    const last7Days = checkIns.slice(-7).reverse();
    container.innerHTML = last7Days.map(checkin => {
        const average = (checkin.sleep + checkin.energy + checkin.soreness + checkin.mood) / 4;
        const score = Math.round(average * 10);
        return `
            <div class="glass-card" style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p><strong>${new Date(checkin.date).toLocaleDateString()}</strong></p>
                        <p class="text-secondary">Sleep: ${['😴', '😐', '😊', '😄'][checkin.sleep - 1] || '?'} Energy: ${['⚡', '🔋', '💪', '🚀'][checkin.energy - 1] || '?'}</p>
                    </div>
                    <div style="text-align: right;">
                        <p class="text-tertiary">Score</p>
                        <p style="font-size: 20px; font-weight: 700; color: var(--accent-cyan);">${score}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadReadinessTrends() {
    const checkIns = JSON.parse(localStorage.getItem('strivusCheckIns') || '[]');

    if (checkIns.length === 0) {
        document.getElementById('readinessSummary').innerHTML = '<p class="text-tertiary">Not enough data yet. Keep logging!</p>';
        return;
    }

    const scores = checkIns.map(c => Math.round(((c.sleep || 0) + (c.energy || 0) + (c.soreness || 0) + (c.mood || 0)) / 4 * 10));
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    document.getElementById('readinessSummary').innerHTML = `
        <p><strong>Average Readiness:</strong> ${avgScore}/40</p>
        <p class="text-secondary" style="margin-top: 8px;">Highest: ${Math.max(...scores)} | Lowest: ${Math.min(...scores)}</p>
    `;
}

function loadDashboard() {
    setupTrainingWizard();
    loadReadinessScore();
    animateAICharacter();
}

function setupTrainingWizard() {
    const trainingButtons = document.querySelectorAll('[data-training-type]');
    const equipmentButtons = document.querySelectorAll('[data-equipment]');
    const personaButtons = document.querySelectorAll('[data-persona]');

    trainingButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            trainingButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            recordData.trainingType = btn.dataset.trainingType;
            if (window.aiCharacter) {
                window.aiCharacter.showMessage(`${btn.textContent}? Great choice!`, 3000, 'happy');
            }
        });
    });

    equipmentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            equipmentButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            recordData.equipment = btn.dataset.equipment;
        });
    });

    personaButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            personaButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            recordData.persona = btn.dataset.persona;
        });
    });

    const upperSlider = document.getElementById('upperSlider');
    const lowerSlider = document.getElementById('lowerSlider');
    const coreSlider = document.getElementById('coreSlider');

    if (upperSlider) {
        upperSlider.addEventListener('input', (e) => {
            document.getElementById('upperValue').textContent = e.target.value;
            recordData.focusArea = {
                upper: parseInt(e.target.value),
                lower: parseInt(lowerSlider.value),
                core: parseInt(coreSlider.value)
            };
        });
    }

    if (lowerSlider) {
        lowerSlider.addEventListener('input', (e) => {
            document.getElementById('lowerValue').textContent = e.target.value;
            recordData.focusArea = {
                upper: parseInt(upperSlider.value),
                lower: parseInt(e.target.value),
                core: parseInt(coreSlider.value)
            };
        });
    }

    if (coreSlider) {
        coreSlider.addEventListener('input', (e) => {
            document.getElementById('coreValue').textContent = e.target.value;
            recordData.focusArea = {
                upper: parseInt(upperSlider.value),
                lower: parseInt(lowerSlider.value),
                core: parseInt(e.target.value)
            };
        });
    }
}

function loadReadinessScore() {
    const today = new Date().toISOString().split('T')[0];
    const checkIns = JSON.parse(localStorage.getItem('strivusCheckIns') || '[]');
    const todayCheckIn = checkIns.find(c => c.date === today);

    if (todayCheckIn) {
        const average = (todayCheckIn.sleep + todayCheckIn.energy + todayCheckIn.soreness + todayCheckIn.mood) / 4;
        const score = Math.round(average * 10);
        document.getElementById('dashReadiness').textContent = score;

        let statusText = '';
        if (score >= 30) statusText = 'Excellent - Ready for intense training';
        else if (score >= 20) statusText = 'Good - Ready for a solid workout';
        else if (score >= 10) statusText = 'Fair - Take it easy today';
        else statusText = 'Low - Focus on recovery';

        document.getElementById('dashReadinessStatus').textContent = statusText;
    }
}

function loadHistoryTab() {
    loadRecentWorkouts();
}

function loadRecentWorkouts() {
    const workouts = JSON.parse(localStorage.getItem('strivusWorkouts') || '[]');
    const recentList = document.getElementById('recentWorkoutsList');

    if (workouts.length === 0) {
        recentList.innerHTML = '<p class="text-tertiary">No workouts logged yet. Start tracking your progress!</p>';
        return;
    }

    const recent = workouts.slice(-10).reverse();
    recentList.innerHTML = recent.map(workout => `
        <div class="glass-card" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div>
                    <p><strong>${new Date(workout.date).toLocaleDateString()}</strong></p>
                    <p class="text-secondary">${workout.exercises.length} exercises • ${workout.duration || 45} min</p>
                </div>
                <p style="color: var(--accent-cyan); font-weight: 600;">RPE ${workout.intensity}</p>
            </div>
            <p class="text-tertiary" style="font-size: 12px;">${workout.exercises.map(e => e.exerciseName).join(', ')}</p>
        </div>
    `).join('');
}

function loadPRs() {
    const prs = JSON.parse(localStorage.getItem('strivusPRs') || '{}');
    const prsList = document.getElementById('prsList');

    if (Object.keys(prs).length === 0) {
        prsList.innerHTML = '<p class="text-tertiary" style="grid-column: 1/-1;">No PRs recorded yet. Keep training!</p>';
        return;
    }

    prsList.innerHTML = Object.entries(prs).map(([exerciseId, pr]) => {
        const maxWeight = pr.strength?.weight || pr.oneRM?.value || 0;
        return `
            <div class="metric-card">
                <div class="metric-label">PR</div>
                <div class="metric-value" style="color: var(--accent-magenta);">${maxWeight}</div>
                <p class="text-tertiary" style="font-size: 12px; margin-top: 8px;">lbs</p>
            </div>
        `;
    }).join('');
}

function loadAnalytics() {
    const workouts = JSON.parse(localStorage.getItem('strivusWorkouts') || '[]');
    const analyticsList = document.getElementById('analyticsList');

    if (workouts.length === 0) {
        analyticsList.innerHTML = '<p class="text-tertiary" style="grid-column: 1/-1;">No data yet.</p>';
        return;
    }

    const totalWorkouts = workouts.length;
    const totalVolume = workouts.reduce((sum, w) => {
        const sets = w.exercises.reduce((s, ex) => s + (ex.sets?.length || 0), 0);
        return sum + sets;
    }, 0);
    const avgRPE = Math.round(workouts.reduce((sum, w) => sum + (w.intensity || 5), 0) / totalWorkouts);
    const avgDuration = Math.round(workouts.reduce((sum, w) => sum + (w.duration || 45), 0) / totalWorkouts);

    analyticsList.innerHTML = `
        <div class="metric-card">
            <div class="metric-label">Total</div>
            <div class="metric-value">${totalWorkouts}</div>
            <p class="text-tertiary" style="font-size: 12px; margin-top: 8px;">Workouts</p>
        </div>
        <div class="metric-card">
            <div class="metric-label">Volume</div>
            <div class="metric-value">${totalVolume}</div>
            <p class="text-tertiary" style="font-size: 12px; margin-top: 8px;">Sets</p>
        </div>
        <div class="metric-card">
            <div class="metric-label">Avg RPE</div>
            <div class="metric-value">${avgRPE}</div>
            <p class="text-tertiary" style="font-size: 12px; margin-top: 8px;">/10</p>
        </div>
        <div class="metric-card">
            <div class="metric-label">Avg Duration</div>
            <div class="metric-value">${avgDuration}</div>
            <p class="text-tertiary" style="font-size: 12px; margin-top: 8px;">min</p>
        </div>
    `;
}

function loadMuscleGroupAnalysis() {
    const workouts = JSON.parse(localStorage.getItem('strivusWorkouts') || '[]');
    const muscleGroups = {};

    workouts.forEach(workout => {
        workout.exercises.forEach(exercise => {
            const muscle = exercise.muscleGroup || 'General';
            if (!muscleGroups[muscle]) {
                muscleGroups[muscle] = { count: 0, totalSets: 0 };
            }
            muscleGroups[muscle].count++;
            muscleGroups[muscle].totalSets += exercise.sets?.length || 0;
        });
    });

    const sorted = Object.entries(muscleGroups)
        .sort((a, b) => b[1].count - a[1].count);

    const summaryDiv = document.querySelector('#trendSummary') || document.createElement('div');
    summaryDiv.className = 'glass-card';
    summaryDiv.innerHTML = '<h3>Muscle Groups Worked</h3>' + sorted.map(([muscle, data]) => `
        <div style="margin-top: 12px;">
            <p class="text-secondary">${muscle}</p>
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="flex: 1; height: 8px; background: var(--border-light); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min(100, (data.count / sorted[0][1].count) * 100)}%; height: 100%; background: linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-magenta) 100%);"></div>
                </div>
                <p class="text-tertiary">${data.count}x</p>
            </div>
        </div>
    `).join('');
}

function loadConditionTab() {
    setupCheckInButtons();
    updateReadinessGauge();
}

async function loadAICoachTab() {
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
    const checkIns = JSON.parse(localStorage.getItem('strivusCheckIns') || '[]');

    const existingIndex = checkIns.findIndex(c => c.date === today);
    if (existingIndex >= 0) {
        checkIns[existingIndex] = { ...checkInData, date: today };
    } else {
        checkIns.push({ ...checkInData, date: today });
    }

    localStorage.setItem('strivusCheckIns', JSON.stringify(checkIns));

    if (window.syncCheckInToSupabase) {
        window.syncCheckInToSupabase(checkInData, today).then(() => {
            if (window.aiCharacter) {
                window.dispatchEvent(new CustomEvent('aiEvent', {
                    detail: { event: 'checkin-logged', data: {} }
                }));
            }
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
        sports: [],
        duration: recordData.duration || 0
    };

    if (window.syncWorkoutToSupabase) {
        window.syncWorkoutToSupabase(workout).then(() => {
            if (window.aiCharacter) {
                window.dispatchEvent(new CustomEvent('aiEvent', {
                    detail: { event: 'workout-saved', data: { exercises: recordData.exercises.length } }
                }));
            }
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

async function openExercisePicker() {
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
        padding: 20px;
    `;

    modal.innerHTML = `
        <div class="glass-card" style="width: 100%; max-width: 500px; max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column;">
            <h3 style="margin-bottom: 12px;">Add Exercise</h3>
            <p class="text-tertiary" style="margin-bottom: 16px;">Select by muscle group</p>
            <div id="muscleGroupTabs" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;"></div>
            <div id="exerciseList" style="display: grid; gap: 8px; flex: 1; overflow-y: auto;"></div>
            <button class="glass-btn glass-btn-secondary" onclick="this.closest('div').parentElement.remove()" style="width: 100%; margin-top: 16px;">Close</button>
        </div>
    `;

    document.body.appendChild(modal);

    const exercises = await loadExercisesFromDB();
    const categorized = categorizeExercisesByMuscle(exercises);

    const muscleGroupTabs = modal.querySelector('#muscleGroupTabs');
    const exerciseList = modal.querySelector('#exerciseList');

    let currentMuscle = Object.keys(categorized)[0];

    function renderExercises(muscle) {
        exerciseList.innerHTML = '';
        const muscleExercises = categorized[muscle] || [];
        muscleExercises.forEach(ex => {
            const btn = document.createElement('button');
            btn.className = 'glass-btn glass-btn-secondary';
            btn.textContent = ex.name;
            btn.style.justifyContent = 'flex-start';
            btn.onclick = () => {
                recordData.exercises.push({ name: ex.name, sets: [], muscleGroup: ex.main_muscle_group });
                updateSelectedExercises();
                modal.remove();
                if (window.aiCharacter) {
                    window.dispatchEvent(new CustomEvent('aiEvent', {
                        detail: { event: 'exercise-added', data: { name: ex.name } }
                    }));
                }
            };
            exerciseList.appendChild(btn);
        });
    }

    Object.keys(categorized).forEach(muscle => {
        const btn = document.createElement('button');
        btn.className = `glass-btn glass-btn-small ${muscle === currentMuscle ? 'active' : ''}`;
        btn.textContent = muscle;
        btn.onclick = () => {
            currentMuscle = muscle;
            document.querySelectorAll('#muscleGroupTabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderExercises(muscle);
        };
        muscleGroupTabs.appendChild(btn);
    });

    renderExercises(currentMuscle);
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

async function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();

    if (!message) return;

    const chatArea = document.getElementById('chatMessages');
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.textContent = message;
    chatArea.appendChild(userBubble);

    input.value = '';

    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble ai';
    loadingBubble.textContent = 'Thinking...';
    chatArea.appendChild(loadingBubble);

    chatArea.parentElement.scrollTop = chatArea.parentElement.scrollHeight;

    try {
        const userContext = await getUserContextForAI();
        const response = await callAICoach(message, userContext);

        chatArea.removeChild(loadingBubble);

        const aiBubble = document.createElement('div');
        aiBubble.className = 'chat-bubble ai';
        aiBubble.textContent = response;
        chatArea.appendChild(aiBubble);

        chatArea.parentElement.scrollTop = chatArea.parentElement.scrollHeight;

        if (window.aiCharacter) {
            window.aiCharacter.react('happy');
        }
    } catch (error) {
        console.error('Error getting AI response:', error);
        chatArea.removeChild(loadingBubble);

        const errorBubble = document.createElement('div');
        errorBubble.className = 'chat-bubble ai';
        errorBubble.textContent = 'Sorry, I had trouble thinking right now. Try again!';
        chatArea.appendChild(errorBubble);
    }
}

async function getUserContextForAI() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return {};

        const [workoutRes, prRes, checkInRes] = await Promise.all([
            supabase.from('workouts').select('*').eq('user_id', user.id).order('workout_date', { ascending: false }).limit(5),
            supabase.from('user_exercise_prs').select('*').eq('user_id', user.id).order('max_weight', { ascending: false }).limit(5),
            supabase.from('user_check_ins').select('*').eq('user_id', user.id).order('check_in_date', { ascending: false }).limit(3),
        ]);

        return {
            userId: user.id,
            recentWorkouts: workoutRes.data || [],
            personalRecords: prRes.data || [],
            checkInData: checkInRes.data || [],
        };
    } catch (error) {
        console.error('Error fetching user context:', error);
        return {};
    }
}

async function callAICoach(message, userContext) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL ||
            (typeof window !== 'undefined' && window.SUPABASE_URL) ||
            'https://your-project.supabase.co';

        const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY ||
            (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) ||
            'your-anon-key';

        const response = await fetch(`${supabaseUrl}/functions/v1/ai-coach`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                userContext,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.response || generateAIResponse(message);
    } catch (error) {
        console.error('Error calling AI Coach:', error);
        return generateAIResponse(message);
    }
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

    document.getElementById('durationInput')?.addEventListener('input', (e) => {
        recordData.duration = parseInt(e.target.value) || 0;
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
