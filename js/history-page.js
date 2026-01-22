import { getWorkoutHistory, getWorkoutStats, getPersonalRecords } from './history-service.js';

let currentFilter = 'all';
let currentTab = 'workouts';
let workoutsData = [];
let statsData = null;
let prsData = [];

export async function initializeHistoryPage() {
    setupEventListeners();
    await loadData();
}

function setupEventListeners() {
    document.getElementById('close-history')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            setFilter(chip.dataset.filter);
        });
    });
}

function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.getElementById('tab-workouts').classList.toggle('hidden', tab !== 'workouts');
    document.getElementById('tab-prs').classList.toggle('hidden', tab !== 'prs');
    document.getElementById('tab-analytics').classList.toggle('hidden', tab !== 'analytics');

    if (tab === 'prs' && prsData.length === 0) {
        loadPRs();
    } else if (tab === 'analytics') {
        renderAnalytics();
    }
}

function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === filter);
    });

    renderWorkouts();
}

async function loadData() {
    try {
        const [workoutsResult, stats] = await Promise.all([
            getWorkoutHistory({ limit: 100 }),
            getWorkoutStats(90)
        ]);

        workoutsData = workoutsResult.workouts || [];
        statsData = stats;

        renderStats();
        renderWorkouts();
    } catch (error) {
        console.error('Error loading history:', error);
        showError();
    }
}

function renderStats() {
    if (!statsData) return;

    document.getElementById('stat-workouts').textContent = statsData.totalWorkouts;
    document.getElementById('stat-volume').textContent = formatVolume(statsData.totalVolume);
    document.getElementById('stat-intensity').textContent = statsData.averageIntensity;
    document.getElementById('stat-streak').textContent = `${statsData.currentStreak}d`;
}

function renderWorkouts() {
    const container = document.getElementById('workouts-list');
    const loading = document.getElementById('loading-state');
    const empty = document.getElementById('empty-state');

    loading.classList.add('hidden');

    const filteredWorkouts = currentFilter === 'all'
        ? workoutsData
        : workoutsData.filter(w => w.activity_type === currentFilter);

    if (filteredWorkouts.length === 0) {
        container.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = '';

    filteredWorkouts.forEach(workout => {
        const card = createWorkoutCard(workout);
        container.appendChild(card);
    });
}

function createWorkoutCard(workout) {
    const card = document.createElement('div');
    card.className = 'workout-card fade-in';

    const date = new Date(workout.workout_date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const exercises = workout.workout_exercises || [];
    const exerciseCount = exercises.length;
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets_data?.length || 0), 0);

    let volume = 0;
    exercises.forEach(ex => {
        if (ex.sets_data) {
            ex.sets_data.forEach(set => {
                volume += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
            });
        }
    });

    const activityType = workout.activity_type || 'strength';
    const intensity = workout.intensity_rpe || 5;
    const intensityClass = intensity <= 3 ? 'intensity-low' : intensity <= 6 ? 'intensity-medium' : 'intensity-high';

    card.innerHTML = `
        <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-bold text-white">${dateStr}</span>
                    <span class="badge badge-${activityType}">${activityType}</span>
                    <span class="intensity-dot ${intensityClass}"></span>
                </div>
                <div class="text-sm text-slate-400">
                    ${exerciseCount} exercises · ${totalSets} sets · ${formatVolume(volume)}
                </div>
            </div>
            <button class="text-slate-400 hover:text-white transition expand-btn">
                <svg class="w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
        </div>

        <div class="exercises-detail hidden mt-3 pt-3 border-t border-slate-700">
            ${exercises.slice(0, 5).map(ex => `
                <div class="mb-2">
                    <div class="font-semibold text-white text-sm">${ex.exercise_name}</div>
                    <div class="text-xs text-slate-400">
                        ${ex.sets_data?.length || 0} sets
                        ${ex.sets_data ? ` · Best: ${getBestSet(ex.sets_data)}` : ''}
                    </div>
                </div>
            `).join('')}
            ${exercises.length > 5 ? `<div class="text-xs text-slate-500 mt-2">+${exercises.length - 5} more exercises</div>` : ''}

            ${workout.notes ? `
                <div class="mt-3 pt-3 border-t border-slate-700">
                    <div class="text-xs text-slate-400">${workout.notes}</div>
                </div>
            ` : ''}
        </div>
    `;

    const expandBtn = card.querySelector('.expand-btn');
    const detail = card.querySelector('.exercises-detail');
    const icon = expandBtn.querySelector('svg');

    expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = !detail.classList.contains('hidden');

        if (isExpanded) {
            detail.classList.add('hidden');
            icon.classList.remove('rotate-180');
            card.classList.remove('expanded');
        } else {
            detail.classList.remove('hidden');
            icon.classList.add('rotate-180');
            card.classList.add('expanded');
        }
    });

    return card;
}

function getBestSet(sets) {
    if (!sets || sets.length === 0) return '-';

    let best = sets[0];
    let bestVolume = (parseFloat(best.weight) || 0) * (parseInt(best.reps) || 0);

    sets.forEach(set => {
        const volume = (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
        if (volume > bestVolume) {
            bestVolume = volume;
            best = set;
        }
    });

    return `${best.reps} × ${best.weight}kg`;
}

async function loadPRs() {
    try {
        prsData = await getPersonalRecords(20);
        renderPRs();
    } catch (error) {
        console.error('Error loading PRs:', error);
    }
}

function renderPRs() {
    const container = document.getElementById('prs-list');
    const empty = document.getElementById('prs-empty');

    if (prsData.length === 0) {
        container.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = '';

    prsData.forEach(pr => {
        const card = document.createElement('div');
        card.className = 'stat-card fade-in';

        const lastPerformed = new Date(pr.last_performed);
        const daysAgo = Math.floor((new Date() - lastPerformed) / (1000 * 60 * 60 * 24));

        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <h4 class="font-bold text-white mb-2">${pr.exercise_name}</h4>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <div class="text-slate-400 text-xs">Max Weight</div>
                            <div class="text-action-blue font-bold">${pr.max_weight}kg</div>
                        </div>
                        <div>
                            <div class="text-slate-400 text-xs">Max Reps</div>
                            <div class="text-accent-teal font-bold">${pr.max_reps}</div>
                        </div>
                        <div>
                            <div class="text-slate-400 text-xs">Max Volume</div>
                            <div class="text-white font-bold">${Math.round(pr.max_volume)}kg</div>
                        </div>
                        <div>
                            <div class="text-slate-400 text-xs">Est 1RM</div>
                            <div class="text-white font-bold">${Math.round(pr.max_one_rep_max)}kg</div>
                        </div>
                    </div>
                    <div class="text-xs text-slate-500 mt-2">
                        Last performed ${daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`}
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function renderAnalytics() {
    if (!statsData) return;

    renderTopExercises();
    renderMonthlySummary();
}

function renderTopExercises() {
    const container = document.getElementById('top-exercises');
    const exercises = Object.entries(statsData.exerciseFrequency || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (exercises.length === 0) {
        container.innerHTML = '<div class="text-slate-400 text-sm">No exercise data</div>';
        return;
    }

    const maxCount = exercises[0][1];

    container.innerHTML = exercises.map(([name, count]) => {
        const percentage = (count / maxCount) * 100;
        return `
            <div class="mb-3">
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-white">${name}</span>
                    <span class="text-slate-400">${count}x</span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-2">
                    <div class="bg-action-blue rounded-full h-2 transition-all" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderMonthlySummary() {
    const container = document.getElementById('monthly-summary');

    if (!statsData) {
        container.innerHTML = '<div class="text-slate-400 text-sm">No data available</div>';
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
                <div class="text-slate-400 text-xs mb-1">Total Duration</div>
                <div class="text-white font-bold">${formatDuration(statsData.totalDuration)}</div>
            </div>
            <div>
                <div class="text-slate-400 text-xs mb-1">Longest Streak</div>
                <div class="text-white font-bold">${statsData.longestStreak} days</div>
            </div>
            <div>
                <div class="text-slate-400 text-xs mb-1">Avg per Week</div>
                <div class="text-white font-bold">${Math.round((statsData.totalWorkouts / 90) * 7)} workouts</div>
            </div>
            <div>
                <div class="text-slate-400 text-xs mb-1">Total Volume</div>
                <div class="text-white font-bold">${formatVolume(statsData.totalVolume)}</div>
            </div>
        </div>
    `;
}

function formatVolume(kg) {
    if (kg >= 1000) {
        return `${(kg / 1000).toFixed(1)}t`;
    }
    return `${Math.round(kg)}kg`;
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

function showError() {
    const loading = document.getElementById('loading-state');
    const container = document.getElementById('workouts-list');
    const empty = document.getElementById('empty-state');

    loading.classList.add('hidden');
    container.classList.add('hidden');
    empty.classList.remove('hidden');

    empty.innerHTML = `
        <div class="text-6xl mb-4">⚠️</div>
        <h3 class="text-xl font-bold text-white mb-2">Failed to Load History</h3>
        <p class="text-slate-400 mb-4">Please try again</p>
        <button onclick="location.reload()" class="bg-action-blue hover:bg-action-blue-hover text-white font-semibold py-2 px-6 rounded-lg transition">
            Retry
        </button>
    `;
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', initializeHistoryPage);
}
