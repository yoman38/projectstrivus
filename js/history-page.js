import { supabase } from './supabase-client.js';
import { getUser } from './auth-guard.js';

let historyData = {
    workouts: [],
    exercises: [],
    sports: [],
    personalRecords: [],
    currentMonth: new Date()
};

let exerciseDatabase = [];

async function getCurrentUserWithFallback() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return user;
    } catch (err) {
        console.warn('Failed to fetch user from auth:', err.message);
    }
    return getUser();
}

export async function initializeHistoryPage() {
    console.log('Initializing Training History page...');

    showLoading(true);
    hideError();

    try {
        await loadExerciseDatabase();
        await fetchAllHistoryData();
        renderAllComponents();
        showLoading(false);
    } catch (error) {
        console.error('Error initializing history page:', error);
        showLoading(false);
        showError('Failed to load training history. Please refresh the page or try again later.');
    }

    setupRetryButton();
    setupRefreshButton();
    setupPullToRefresh();
}

function setupRefreshButton() {
    const refreshBtn = document.getElementById('history-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const refreshText = document.getElementById('refresh-text');
            const originalText = refreshText.textContent;

            refreshBtn.disabled = true;
            refreshText.textContent = 'Refreshing...';

            try {
                await fetchAllHistoryData();
                renderAllComponents();
                refreshText.textContent = 'Refreshed!';

                setTimeout(() => {
                    refreshBtn.disabled = false;
                    refreshText.textContent = originalText;
                }, 2000);
            } catch (error) {
                console.error('Error refreshing history:', error);
                refreshText.textContent = 'Error!';
                refreshBtn.disabled = false;

                setTimeout(() => {
                    refreshText.textContent = originalText;
                }, 3000);
            }
        });
    }
}

function setupPullToRefresh() {
    let touchStartY = 0;
    let isDragging = false;

    document.addEventListener('touchstart', (e) => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop === 0) {
            touchStartY = e.touches[0].clientY;
        }
    }, false);

    document.addEventListener('touchmove', (e) => {
        if (window.scrollY === 0 && e.touches[0].clientY > touchStartY + 50) {
            isDragging = true;
            const historyDashboard = document.getElementById('history-dashboard');
            if (historyDashboard) {
                historyDashboard.style.transform = `translateY(${e.touches[0].clientY - touchStartY}px)`;
            }
        }
    }, false);

    document.addEventListener('touchend', async (e) => {
        if (isDragging && e.changedTouches[0].clientY - touchStartY > 100) {
            const historyDashboard = document.getElementById('history-dashboard');
            if (historyDashboard) {
                historyDashboard.style.transform = '';
            }

            const refreshBtn = document.getElementById('history-refresh-btn');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else {
            const historyDashboard = document.getElementById('history-dashboard');
            if (historyDashboard) {
                historyDashboard.style.transform = '';
            }
        }
        isDragging = false;
        touchStartY = 0;
    }, false);
}

async function loadExerciseDatabase() {
    try {
        const response = await fetch('/exercises.json');
        exerciseDatabase = await response.json();
    } catch (error) {
        console.error('Error loading exercise database:', error);
        exerciseDatabase = [];
    }
}

async function fetchAllHistoryData() {
    const user = await getCurrentUserWithFallback();
    if (!user) {
        showError('Please log in to view your training history.');
        return;
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [workoutsResult, exercisesResult, sportsResult, prsResult] = await Promise.all([
        supabase
            .from('workouts')
            .select('*')
            .eq('user_id', user.id)
            .gte('workout_date', ninetyDaysAgo.toISOString().split('T')[0])
            .order('workout_date', { ascending: false }),

        supabase
            .from('workout_exercises')
            .select('*, workouts!inner(workout_date, user_id)')
            .eq('workouts.user_id', user.id)
            .gte('workouts.workout_date', ninetyDaysAgo.toISOString().split('T')[0]),

        supabase
            .from('sport_sessions')
            .select('*, workouts!inner(workout_date, user_id)')
            .eq('workouts.user_id', user.id)
            .gte('workouts.workout_date', ninetyDaysAgo.toISOString().split('T')[0]),

        supabase
            .from('user_exercise_prs')
            .select('*')
            .eq('user_id', user.id)
            .order('last_performed', { ascending: false })
    ]);

    if (workoutsResult.error) throw workoutsResult.error;
    if (exercisesResult.error) throw exercisesResult.error;
    if (sportsResult.error) throw sportsResult.error;
    if (prsResult.error) throw prsResult.error;

    historyData.workouts = workoutsResult.data || [];
    historyData.exercises = exercisesResult.data || [];
    historyData.sports = sportsResult.data || [];
    historyData.personalRecords = prsResult.data || [];

    console.log('Loaded history data:', historyData);
}

function renderAllComponents() {
    renderStatsSummary();
    renderCalendarHeatmap();
    renderWeeklyBreakdown();
    renderTrainingDistribution();
    renderTopExercises();
    renderRecentWorkouts();
    renderPRProgression();
    setupCalendarNavigation();
}

function renderStatsSummary() {
    const container = document.getElementById('stats-summary');
    if (!container) return;

    const totalWorkouts = historyData.workouts.length;
    const avgDuration = totalWorkouts > 0
        ? Math.round(historyData.workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) / totalWorkouts)
        : 0;

    const totalVolume = calculateTotalVolume();
    const avgIntensity = totalWorkouts > 0
        ? (historyData.workouts.reduce((sum, w) => sum + (w.intensity_rpe || 5), 0) / totalWorkouts).toFixed(1)
        : '0';

    const last30Days = historyData.workouts.filter(w => {
        const workoutDate = new Date(w.workout_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return workoutDate >= thirtyDaysAgo;
    }).length;

    container.innerHTML = `
        <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg">
            <div class="text-blue-100 text-sm font-semibold mb-1">Total Workouts</div>
            <div class="text-4xl font-bold text-white">${totalWorkouts}</div>
            <div class="text-blue-200 text-xs mt-2">${last30Days} in last 30 days</div>
        </div>

        <div class="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 shadow-lg">
            <div class="text-emerald-100 text-sm font-semibold mb-1">Avg Duration</div>
            <div class="text-4xl font-bold text-white">${avgDuration}<span class="text-2xl ml-1">min</span></div>
            <div class="text-emerald-200 text-xs mt-2">Per workout session</div>
        </div>

        <div class="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-6 shadow-lg">
            <div class="text-amber-100 text-sm font-semibold mb-1">Total Volume</div>
            <div class="text-4xl font-bold text-white">${formatVolume(totalVolume)}</div>
            <div class="text-amber-200 text-xs mt-2">Weight × Reps (90 days)</div>
        </div>

        <div class="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-lg">
            <div class="text-purple-100 text-sm font-semibold mb-1">Avg Intensity</div>
            <div class="text-4xl font-bold text-white">${avgIntensity}<span class="text-2xl ml-1">/10</span></div>
            <div class="text-purple-200 text-xs mt-2">RPE rating</div>
        </div>
    `;
}

function calculateTotalVolume() {
    let totalVolume = 0;
    historyData.exercises.forEach(ex => {
        if (ex.sets_data && Array.isArray(ex.sets_data)) {
            ex.sets_data.forEach(set => {
                const weight = parseFloat(set.weight) || 0;
                const reps = parseInt(set.reps) || 0;
                totalVolume += weight * reps;
            });
        }
    });
    return totalVolume;
}

function formatVolume(volume) {
    if (volume >= 1000000) {
        return (volume / 1000000).toFixed(1) + 'M';
    } else if (volume >= 1000) {
        return (volume / 1000).toFixed(1) + 'k';
    }
    return volume.toString();
}

function renderCalendarHeatmap() {
    const container = document.getElementById('calendar-heatmap');
    if (!container) return;

    const workoutsByDate = {};
    historyData.workouts.forEach(w => {
        const date = w.workout_date;
        if (!workoutsByDate[date]) {
            workoutsByDate[date] = { count: 0, volume: 0, intensity: 0 };
        }
        workoutsByDate[date].count++;
        workoutsByDate[date].intensity = Math.max(workoutsByDate[date].intensity, w.intensity_rpe || 0);
    });

    historyData.exercises.forEach(ex => {
        const workoutDate = ex.workouts?.workout_date;
        if (workoutDate && workoutsByDate[workoutDate]) {
            if (ex.sets_data && Array.isArray(ex.sets_data)) {
                ex.sets_data.forEach(set => {
                    const weight = parseFloat(set.weight) || 0;
                    const reps = parseInt(set.reps) || 0;
                    workoutsByDate[workoutDate].volume += weight * reps;
                });
            }
        }
    });

    const startDate = new Date(historyData.currentMonth);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    document.getElementById('calendar-month-label').textContent =
        startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const weeks = [];
    let currentWeek = [];
    const firstDayOfWeek = startDate.getDay();

    for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push(null);
    }

    for (let day = 1; day <= endDate.getDate(); day++) {
        const date = new Date(startDate.getFullYear(), startDate.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        currentWeek.push({
            day,
            date: dateStr,
            data: workoutsByDate[dateStr] || null
        });

        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push(null);
        }
        weeks.push(currentWeek);
    }

    const maxVolume = Math.max(...Object.values(workoutsByDate).map(d => d.volume), 1);

    container.innerHTML = `
        <div class="mb-3">
            <div class="grid grid-cols-7 gap-2 text-center text-xs text-slate-400 mb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
            </div>
        </div>
        <div class="space-y-2">
            ${weeks.map(week => `
                <div class="grid grid-cols-7 gap-2">
                    ${week.map(day => {
                        if (!day) {
                            return '<div class="aspect-square"></div>';
                        }

                        const intensity = day.data ? (day.data.volume / maxVolume) : 0;
                        const bgColor = day.data
                            ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`
                            : 'rgb(30, 41, 59)';

                        const isToday = day.date === new Date().toISOString().split('T')[0];
                        const borderClass = isToday ? 'ring-2 ring-blue-400' : '';

                        return `
                            <div class="aspect-square rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer transition-all hover:scale-110 ${borderClass}"
                                 style="background-color: ${bgColor}; color: ${day.data ? 'white' : 'rgb(148, 163, 184)'}"
                                 title="${day.date}${day.data ? `\n${day.data.count} workout(s)\nVolume: ${formatVolume(day.data.volume)}\nIntensity: ${day.data.intensity}/10` : '\nNo workout'}"
                                 onclick="showWorkoutDetails('${day.date}')">
                                ${day.day}
                            </div>
                        `;
                    }).join('')}
                </div>
            `).join('')}
        </div>
        <div class="mt-4 flex items-center justify-end gap-2 text-xs text-slate-400">
            <span>Less</span>
            <div class="flex gap-1">
                <div class="w-4 h-4 rounded" style="background-color: rgb(30, 41, 59)"></div>
                <div class="w-4 h-4 rounded" style="background-color: rgba(59, 130, 246, 0.3)"></div>
                <div class="w-4 h-4 rounded" style="background-color: rgba(59, 130, 246, 0.6)"></div>
                <div class="w-4 h-4 rounded" style="background-color: rgba(59, 130, 246, 0.9)"></div>
            </div>
            <span>More</span>
        </div>
    `;
}

function setupCalendarNavigation() {
    const prevBtn = document.getElementById('calendar-prev-month');
    const nextBtn = document.getElementById('calendar-next-month');

    if (prevBtn) {
        prevBtn.onclick = () => {
            historyData.currentMonth.setMonth(historyData.currentMonth.getMonth() - 1);
            renderCalendarHeatmap();
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            historyData.currentMonth.setMonth(historyData.currentMonth.getMonth() + 1);
            renderCalendarHeatmap();
        };
    }
}

window.showWorkoutDetails = function(dateStr) {
    const dayWorkouts = historyData.workouts.filter(w => w.workout_date === dateStr);
    if (dayWorkouts.length === 0) return;

    const workout = dayWorkouts[0];
    const exercises = historyData.exercises.filter(e => e.workouts?.workout_date === dateStr);
    const sports = historyData.sports.filter(s => s.workouts?.workout_date === dateStr);

    let details = `Date: ${dateStr}\n`;
    details += `Duration: ${workout.duration_minutes || 0} min\n`;
    details += `Intensity: ${workout.intensity_rpe || 'N/A'}/10\n\n`;

    if (exercises.length > 0) {
        details += 'Exercises:\n';
        exercises.forEach(ex => {
            details += `  • ${getExerciseName(ex.exercise_id)}\n`;
        });
    }

    if (sports.length > 0) {
        details += '\nSports:\n';
        sports.forEach(s => {
            details += `  • ${s.activity_name}: ${s.duration_minutes} min\n`;
        });
    }

    alert(details);
};

function renderWeeklyBreakdown() {
    const container = document.getElementById('weekly-breakdown');
    if (!container) return;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const workoutsByDay = new Array(7).fill(0);

    historyData.workouts.forEach(w => {
        const dayOfWeek = new Date(w.workout_date).getDay();
        workoutsByDay[dayOfWeek]++;
    });

    const maxCount = Math.max(...workoutsByDay, 1);

    container.innerHTML = `
        <div class="space-y-3">
            ${dayNames.map((day, index) => {
                const count = workoutsByDay[index];
                const percentage = (count / maxCount) * 100;
                return `
                    <div>
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-slate-300 font-medium">${day}</span>
                            <span class="text-slate-400">${count} workouts</span>
                        </div>
                        <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                 style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderTrainingDistribution() {
    const container = document.getElementById('training-distribution');
    if (!container) return;

    const strengthWorkouts = historyData.exercises.length;
    const sportsWorkouts = historyData.sports.length;
    const total = strengthWorkouts + sportsWorkouts;

    if (total === 0) {
        container.innerHTML = '<p class="text-slate-400 text-center py-8">No training data yet</p>';
        return;
    }

    const strengthPercentage = (strengthWorkouts / total * 100).toFixed(1);
    const sportsPercentage = (sportsWorkouts / total * 100).toFixed(1);

    const sportsByType = {};
    historyData.sports.forEach(s => {
        sportsByType[s.activity_name] = (sportsByType[s.activity_name] || 0) + 1;
    });

    container.innerHTML = `
        <div class="mb-6">
            <div class="flex items-center justify-center gap-8 mb-4">
                <div class="text-center">
                    <div class="text-3xl font-bold text-blue-400">${strengthPercentage}%</div>
                    <div class="text-sm text-slate-400 mt-1">Strength Training</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-bold text-emerald-400">${sportsPercentage}%</div>
                    <div class="text-sm text-slate-400 mt-1">Sports Activities</div>
                </div>
            </div>

            <div class="h-4 flex rounded-full overflow-hidden">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600" style="width: ${strengthPercentage}%"></div>
                <div class="bg-gradient-to-r from-emerald-500 to-emerald-600" style="width: ${sportsPercentage}%"></div>
            </div>
        </div>

        ${Object.keys(sportsByType).length > 0 ? `
            <div class="mt-6 pt-6 border-t border-slate-700">
                <h4 class="text-lg font-semibold text-white mb-3">Sports Breakdown</h4>
                <div class="space-y-2">
                    ${Object.entries(sportsByType).map(([sport, count]) => `
                        <div class="flex justify-between items-center">
                            <span class="text-slate-300">${sport}</span>
                            <span class="text-slate-400">${count} sessions</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

function renderTopExercises() {
    const container = document.getElementById('top-exercises');
    if (!container) return;

    const exerciseCounts = {};
    historyData.exercises.forEach(ex => {
        const exId = ex.exercise_id;
        exerciseCounts[exId] = (exerciseCounts[exId] || 0) + 1;
    });

    const sortedExercises = Object.entries(exerciseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (sortedExercises.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-center py-8">No exercises recorded yet</p>';
        return;
    }

    const maxCount = sortedExercises[0][1];

    container.innerHTML = `
        <div class="space-y-3">
            ${sortedExercises.map(([exerciseId, count], index) => {
                const percentage = (count / maxCount) * 100;
                const exerciseName = getExerciseName(parseInt(exerciseId));
                const pr = historyData.personalRecords.find(pr => pr.exercise_id === parseInt(exerciseId));

                return `
                    <div>
                        <div class="flex justify-between items-center text-sm mb-1">
                            <div class="flex items-center gap-2">
                                <span class="text-slate-500 font-bold">#${index + 1}</span>
                                <span class="text-slate-300 font-medium">${exerciseName}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                ${pr ? `<span class="text-amber-400 text-xs">PR: ${pr.max_weight}kg</span>` : ''}
                                <span class="text-slate-400">${count}×</span>
                            </div>
                        </div>
                        <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                                 style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderRecentWorkouts() {
    const container = document.getElementById('recent-workouts');
    if (!container) return;

    const recentWorkouts = historyData.workouts.slice(0, 15);

    if (recentWorkouts.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-center py-8">No workouts recorded yet</p>';
        return;
    }

    container.innerHTML = `
        <div class="space-y-4">
            ${recentWorkouts.map((workout, index) => {
                const exercises = historyData.exercises.filter(e =>
                    e.workouts?.workout_date === workout.workout_date
                );
                const sports = historyData.sports.filter(s =>
                    s.workouts?.workout_date === workout.workout_date
                );

                const isExpanded = false;

                return `
                    <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-3">
                                <div class="text-slate-500 font-bold">#${index + 1}</div>
                                <div>
                                    <div class="text-white font-semibold">${formatDate(workout.workout_date)}</div>
                                    <div class="text-slate-400 text-sm">${getDaysAgo(workout.workout_date)}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-4">
                                <div class="text-center">
                                    <div class="text-slate-400 text-xs">Duration</div>
                                    <div class="text-white font-semibold">${workout.duration_minutes}m</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-slate-400 text-xs">Intensity</div>
                                    <div class="text-white font-semibold">${workout.intensity_rpe || 'N/A'}/10</div>
                                </div>
                                <button onclick="toggleWorkoutDetails(${index})"
                                        class="text-blue-400 hover:text-blue-300 transition-colors">
                                    <span id="toggle-icon-${index}">▼</span>
                                </button>
                            </div>
                        </div>

                        <div id="workout-details-${index}" class="hidden mt-4 pt-4 border-t border-slate-700">
                            ${exercises.length > 0 ? `
                                <div class="mb-4">
                                    <h4 class="text-white font-semibold mb-2">Exercises</h4>
                                    <div class="space-y-2">
                                        ${exercises.map(ex => {
                                            const exName = getExerciseName(ex.exercise_id);
                                            const sets = ex.sets_data || [];
                                            return `
                                                <div class="bg-slate-700/50 rounded p-3">
                                                    <div class="text-slate-200 font-medium mb-2">${exName}</div>
                                                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                        ${sets.map((set, i) => `
                                                            <div class="bg-slate-800 rounded px-2 py-1">
                                                                <span class="text-slate-400">Set ${i + 1}:</span>
                                                                <span class="text-white ml-1">${set.weight}kg × ${set.reps}</span>
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${sports.length > 0 ? `
                                <div class="mb-4">
                                    <h4 class="text-white font-semibold mb-2">Sports Activities</h4>
                                    <div class="space-y-2">
                                        ${sports.map(s => `
                                            <div class="bg-slate-700/50 rounded p-3 flex justify-between items-center">
                                                <span class="text-slate-200">${s.activity_name}</span>
                                                <span class="text-slate-400">${s.duration_minutes} minutes</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            ${workout.notes ? `
                                <div>
                                    <h4 class="text-white font-semibold mb-2">Notes</h4>
                                    <div class="bg-slate-700/50 rounded p-3 text-slate-300 text-sm">
                                        ${workout.notes}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

window.toggleWorkoutDetails = function(index) {
    const detailsEl = document.getElementById(`workout-details-${index}`);
    const iconEl = document.getElementById(`toggle-icon-${index}`);

    if (detailsEl && iconEl) {
        detailsEl.classList.toggle('hidden');
        iconEl.textContent = detailsEl.classList.contains('hidden') ? '▼' : '▲';
    }
};

function renderPRProgression() {
    const container = document.getElementById('pr-progression');
    if (!container) return;

    if (historyData.personalRecords.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-center py-8">No personal records yet. Keep training!</p>';
        return;
    }

    const prsByExercise = {};
    historyData.personalRecords.forEach(pr => {
        if (!prsByExercise[pr.exercise_id]) {
            prsByExercise[pr.exercise_id] = [];
        }
        prsByExercise[pr.exercise_id].push(pr);
    });

    Object.keys(prsByExercise).forEach(exId => {
        prsByExercise[exId].sort((a, b) =>
            new Date(a.last_performed) - new Date(b.last_performed)
        );
    });

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${Object.entries(prsByExercise).slice(0, 6).map(([exerciseId, prs]) => {
                const exerciseName = getExerciseName(parseInt(exerciseId));
                const latestPR = prs[prs.length - 1];
                const improvement = prs.length > 1
                    ? ((latestPR.max_weight - prs[0].max_weight) / prs[0].max_weight * 100).toFixed(1)
                    : 0;

                return `
                    <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <h4 class="text-white font-semibold mb-3">${exerciseName}</h4>
                        <div class="flex items-end justify-between mb-3">
                            <div>
                                <div class="text-slate-400 text-xs mb-1">Current PR</div>
                                <div class="text-3xl font-bold text-amber-400">${latestPR.max_weight}kg</div>
                            </div>
                            ${improvement > 0 ? `
                                <div class="text-emerald-400 text-sm font-semibold">
                                    +${improvement}%
                                </div>
                            ` : ''}
                        </div>
                        <div class="space-y-1">
                            ${prs.slice(-3).reverse().map((pr, i) => `
                                <div class="flex justify-between text-xs ${i === 0 ? 'text-white font-semibold' : 'text-slate-400'}">
                                    <span>${formatDate(pr.last_performed)}</span>
                                    <span>${pr.max_weight}kg × ${pr.max_reps} reps</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getExerciseName(exerciseId) {
    const exercise = exerciseDatabase.find(ex => ex.id === exerciseId);
    return exercise ? exercise.Exercise_Name : `Exercise #${exerciseId}`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysAgo(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

function showLoading(show) {
    const loadingEl = document.getElementById('history-loading');
    if (loadingEl) {
        loadingEl.classList.toggle('hidden', !show);
    }
}

function showError(message) {
    const errorEl = document.getElementById('history-error');
    const errorMessageEl = document.getElementById('history-error-message');
    if (errorEl && errorMessageEl) {
        errorMessageEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function hideError() {
    const errorEl = document.getElementById('history-error');
    if (errorEl) {
        errorEl.classList.add('hidden');
    }
}

function setupRetryButton() {
    const retryBtn = document.getElementById('history-retry-btn');
    if (retryBtn) {
        retryBtn.onclick = () => {
            initializeHistoryPage();
        };
    }
}
