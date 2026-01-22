import { initAuth } from './auth-guard.js';
import { saveCheckIn, getCheckInHistory, getFitnessMetrics, getMuscleReadiness } from './workout-service.js';

let checkInHistoryData = [];
let fitnessMetricsData = [];

async function loadData() {
    try {
        checkInHistoryData = await getCheckInHistory(42);
        fitnessMetricsData = await getFitnessMetrics(42);

        renderCheckInHistory();
        renderFitnessMetrics();
        renderPerformanceTrends();
        renderACWR();
        renderMuscleGroupReadiness();
    } catch (error) {
        console.error('Error loading condition data:', error);
    }
}

function initializePage() {
    const sleepSlider = document.getElementById('sleep-slider');
    const sleepValue = document.getElementById('sleep-value');
    const stressSlider = document.getElementById('stress-slider');
    const stressValue = document.getElementById('stress-value');
    const nutritionSlider = document.getElementById('nutrition-slider');
    const nutritionValue = document.getElementById('nutrition-value');

    if (sleepSlider) {
        sleepSlider.addEventListener('input', (e) => {
            sleepValue.textContent = `${e.target.value} / 5`;
        });
    }

    if (stressSlider) {
        stressSlider.addEventListener('input', (e) => {
            stressValue.textContent = `${e.target.value} / 5`;
        });
    }

    if (nutritionSlider) {
        nutritionSlider.addEventListener('input', (e) => {
            nutritionValue.textContent = `${e.target.value} / 5`;
        });
    }

    document.getElementById('save-checkin-btn')?.addEventListener('click', handleSaveCheckIn);
}

async function handleSaveCheckIn() {
    const saveBtn = document.getElementById('save-checkin-btn');
    const originalText = saveBtn.textContent;

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        saveBtn.classList.add('opacity-50');

        const checkInData = {
            check_in_date: new Date().toISOString().split('T')[0],
            sleep_quality: parseInt(document.getElementById('sleep-slider').value),
            stress_level: parseInt(document.getElementById('stress-slider').value),
            nutrition_quality: parseInt(document.getElementById('nutrition-slider').value),
            resting_heart_rate: document.getElementById('rhr-input').value || null
        };

        await saveCheckIn(checkInData);

        saveBtn.textContent = 'Saved!';
        saveBtn.classList.remove('opacity-50');
        saveBtn.classList.add('bg-green-600');

        await loadData();

        setTimeout(() => {
            saveBtn.classList.remove('bg-green-600');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }, 2000);

    } catch (error) {
        console.error('Error saving check-in:', error);
        saveBtn.textContent = 'Error - Try Again';
        saveBtn.classList.remove('opacity-50');
        saveBtn.classList.add('bg-red-600');

        setTimeout(() => {
            saveBtn.classList.remove('bg-red-600');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }, 3000);
    }
}

function renderCheckInHistory() {
    const canvas = document.getElementById('checkin-history-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 500;

    ctx.clearRect(0, 0, width, height);

    if (checkInHistoryData.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No check-in data yet', width / 2, height / 2);
        return;
    }

    const maxDataPoints = 42;
    const data = checkInHistoryData.slice(-maxDataPoints);

    const padding = 80;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const pointSpacing = chartWidth / Math.max(data.length - 1, 1);

    const drawLine = (dataKey, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();

        data.forEach((point, i) => {
            const x = padding + i * pointSpacing;
            const y = height - padding - (point[dataKey] / 5) * chartHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    };

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = height - padding - (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '20px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(i.toString(), padding - 10, y + 7);
    }

    drawLine('sleep_quality', '#02B2FC');
    drawLine('stress_level', '#f87171');
    drawLine('nutrition_quality', '#34d399');

    ctx.fillStyle = '#02B2FC';
    ctx.fillRect(padding, height - padding + 40, 30, 6);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '20px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Sleep', padding + 40, height - padding + 47);

    ctx.fillStyle = '#f87171';
    ctx.fillRect(padding + 150, height - padding + 40, 30, 6);
    ctx.fillText('Stress', padding + 190, height - padding + 47);

    ctx.fillStyle = '#34d399';
    ctx.fillRect(padding + 300, height - padding + 40, 30, 6);
    ctx.fillText('Nutrition', padding + 340, height - padding + 47);
}

function renderFitnessMetrics() {
    if (fitnessMetricsData.length === 0) {
        document.getElementById('fitness-score').textContent = '0';
        document.getElementById('fatigue-score').textContent = '0';
        document.getElementById('fitness-bar').style.width = '0%';
        document.getElementById('fatigue-bar').style.width = '0%';
        return;
    }

    const latestMetrics = fitnessMetricsData[fitnessMetricsData.length - 1];

    const fitnessScore = parseFloat(latestMetrics.fitness_score) || 0;
    const fatigueScore = parseFloat(latestMetrics.fatigue_score) || 0;
    const formScore = parseFloat(latestMetrics.form_score) || 0;

    if (fitnessScore === 0 && fatigueScore === 0 && fitnessMetricsData.length > 0) {
        console.warn('Validation warning: Fitness and fatigue both 0 despite workout history');
    }

    document.getElementById('fitness-score').textContent = fitnessScore.toFixed(0);
    document.getElementById('fatigue-score').textContent = fatigueScore.toFixed(0);

    const maxScore = Math.max(fitnessScore, fatigueScore, 100);
    document.getElementById('fitness-bar').style.width = `${(fitnessScore / maxScore) * 100}%`;
    document.getElementById('fatigue-bar').style.width = `${(fatigueScore / maxScore) * 100}%`;

    const gaugeFill = document.getElementById('readiness-gauge-fill');
    const gaugeValue = document.getElementById('readiness-gauge-value');
    const formStatus = document.getElementById('form-status');

    const normalizedForm = Math.max(-50, Math.min(50, formScore));
    const rotation = (normalizedForm / 100) * 180;

    gaugeFill.style.transform = `rotate(${rotation}deg)`;
    gaugeValue.textContent = formScore >= 0 ? `+${formScore.toFixed(0)}` : formScore.toFixed(0);

    if (formScore > 20) {
        formStatus.textContent = 'Peak Performance';
        formStatus.className = 'mt-4 text-center font-medium text-green-400';
    } else if (formScore > 0) {
        formStatus.textContent = 'Good Condition';
        formStatus.className = 'mt-4 text-center font-medium text-blue-400';
    } else if (formScore > -20) {
        formStatus.textContent = 'Fatigued';
        formStatus.className = 'mt-4 text-center font-medium text-yellow-400';
    } else {
        formStatus.textContent = 'Overtrained - Rest Needed';
        formStatus.className = 'mt-4 text-center font-medium text-red-400';
    }
}

function renderPerformanceTrends() {
    const canvas = document.getElementById('performance-trends-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 500;

    ctx.clearRect(0, 0, width, height);

    if (fitnessMetricsData.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No fitness data yet', width / 2, height / 2);
        return;
    }

    const data = fitnessMetricsData.slice(-42);

    const padding = 80;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const pointSpacing = chartWidth / Math.max(data.length - 1, 1);

    const maxValue = Math.max(...data.map(d => Math.max(parseFloat(d.fitness_score) || 0, parseFloat(d.fatigue_score) || 0)), 100);

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = height - padding - (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    const drawMetricLine = (dataKey, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();

        data.forEach((point, i) => {
            const value = parseFloat(point[dataKey]) || 0;
            const x = padding + i * pointSpacing;
            const y = height - padding - (value / maxValue) * chartHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    };

    drawMetricLine('fitness_score', '#0235FC');
    drawMetricLine('fatigue_score', '#f43f5e');

    ctx.fillStyle = '#0235FC';
    ctx.fillRect(padding, height - padding + 40, 30, 6);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '20px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Fitness (42-day)', padding + 40, height - padding + 47);

    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(padding + 250, height - padding + 40, 30, 6);
    ctx.fillText('Fatigue (7-day)', padding + 290, height - padding + 47);
}

function renderACWR() {
    const canvas = document.getElementById('acwr-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 500;

    ctx.clearRect(0, 0, width, height);

    if (fitnessMetricsData.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No ACWR data yet', width / 2, height / 2);

        const statusEl = document.getElementById('acwr-status');
        if (statusEl) statusEl.textContent = 'Start logging workouts to see your Acute:Chronic Workload Ratio.';
        return;
    }

    const data = fitnessMetricsData.slice(-42);

    const padding = 80;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = Math.min(chartWidth / data.length - 4, 40);

    const optimalZone = { min: 0.8, max: 1.3 };
    const dangerZone = { low: 0.5, high: 1.5 };

    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    const optimalMinY = height - padding - (optimalZone.min / 2) * chartHeight;
    const optimalMaxY = height - padding - (optimalZone.max / 2) * chartHeight;
    ctx.fillRect(padding, optimalMaxY, chartWidth, optimalMinY - optimalMaxY);

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    [0, 0.5, 1.0, 1.5, 2.0].forEach(value => {
        const y = height - padding - (value / 2) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '20px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(1), padding - 10, y + 7);
    });

    data.forEach((point, i) => {
        const acwr = parseFloat(point.acwr) || 1.0;
        const x = padding + i * (chartWidth / data.length) + (chartWidth / data.length - barWidth) / 2;
        const barHeight = (acwr / 2) * chartHeight;
        const y = height - padding - barHeight;

        let color = '#64748b';
        if (acwr >= optimalZone.min && acwr <= optimalZone.max) {
            color = '#22c55e';
        } else if (acwr < dangerZone.low || acwr > dangerZone.high) {
            color = '#ef4444';
        } else {
            color = '#f59e0b';
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);
    });

    const latestACWR = parseFloat(data[data.length - 1].acwr) || 1.0;
    const statusEl = document.getElementById('acwr-status');
    if (statusEl) {
        if (latestACWR >= optimalZone.min && latestACWR <= optimalZone.max) {
            statusEl.textContent = `Your ACWR is ${latestACWR.toFixed(2)} - You're in the optimal training zone!`;
            statusEl.className = 'mt-4 text-center text-green-400';
        } else if (latestACWR < dangerZone.low) {
            statusEl.textContent = `Your ACWR is ${latestACWR.toFixed(2)} - You may be detraining. Consider increasing workload gradually.`;
            statusEl.className = 'mt-4 text-center text-yellow-400';
        } else if (latestACWR > dangerZone.high) {
            statusEl.textContent = `Your ACWR is ${latestACWR.toFixed(2)} - High injury risk. Reduce training intensity or volume.`;
            statusEl.className = 'mt-4 text-center text-red-400';
        } else {
            statusEl.textContent = `Your ACWR is ${latestACWR.toFixed(2)} - Approaching limits. Monitor carefully.`;
            statusEl.className = 'mt-4 text-center text-amber-400';
        }
    }
}

async function renderMuscleGroupReadiness() {
    const container = document.getElementById('muscle-fatigue-container');
    if (!container) return;

    const muscleReadinessData = await getMuscleReadiness();

    if (!muscleReadinessData) {
        container.innerHTML = `
            <div class="col-span-2 text-center text-slate-400 py-8">
                <p>No muscle readiness data yet.</p>
                <p class="text-sm mt-2">Start logging workouts to see your muscle-specific fatigue and readiness.</p>
            </div>
        `;
        return;
    }

    const { muscleFatigue, muscleFitness, readiness } = muscleReadinessData;

    const muscleDisplayMap = {
        'Chest': 'Chest',
        'Lats': 'Back (Lats)',
        'Deltoids': 'Shoulders',
        'Biceps': 'Biceps',
        'Triceps': 'Triceps',
        'Quads': 'Quads',
        'Hams': 'Hamstrings',
        'Glutes': 'Glutes',
        'Calfs': 'Calves',
        'Abs': 'Abs',
        'Lumbar': 'Lower Back',
        'Trapezius': 'Traps',
        'Forearm': 'Forearms'
    };

    const muscleOrder = ['Chest', 'Lats', 'Deltoids', 'Trapezius', 'Biceps', 'Triceps', 'Forearm', 'Abs', 'Lumbar', 'Quads', 'Hams', 'Glutes', 'Calfs'];

    container.innerHTML = muscleOrder.map(muscle => {
        const fatigueValue = muscleFatigue[muscle] || 0;
        const fitnessValue = muscleFitness[muscle] || 0;
        const readinessValue = readiness[muscle] || 100;

        const maxValue = Math.max(fatigueValue, fitnessValue, 1);
        const fatiguePercent = (fatigueValue / maxValue) * 100;
        const fitnessPercent = (fitnessValue / maxValue) * 100;

        let fatigueColor = 'bg-green-500';
        let statusText = 'Fresh';
        if (fatiguePercent > 70) {
            fatigueColor = 'bg-red-500';
            statusText = 'Fatigued';
        } else if (fatiguePercent > 40) {
            fatigueColor = 'bg-yellow-500';
            statusText = 'Moderate';
        }

        return `
            <div>
                <div class="flex justify-between text-sm mb-2">
                    <span class="font-medium">${muscleDisplayMap[muscle]}</span>
                    <span class="text-slate-400">${statusText} (${readinessValue.toFixed(0)}%)</span>
                </div>
                <div class="space-y-1">
                    <div class="w-full bg-slate-700 rounded-full h-3">
                        <div class="${fatigueColor} h-3 rounded-full transition-all duration-300" style="width: ${fatiguePercent.toFixed(1)}%"></div>
                    </div>
                    <div class="w-full bg-slate-700 rounded-full h-2">
                        <div class="bg-slate-500 h-2 rounded-full transition-all duration-300" style="width: ${fitnessPercent.toFixed(1)}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

(async () => {
    const user = await initAuth();
    if (user) {
        initializePage();
        await loadData();
    }
})();
