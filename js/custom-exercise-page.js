import { initAuth } from './auth-guard.js';
import { loadExercises } from './exercise-loader.js';
import { saveCustomExercise, getCustomExerciseCount } from './custom-exercise-service.js';
import { findSimilarExercises, validateExerciseName, validateMuscleActivation, getSimilarityColor, getSimilarityLabel } from './exercise-similarity.js';
import { checkSubscriptionStatus } from './subscription-service.js';

let ALL_EXERCISES = [];
const MUSCLES = ['Chest', 'Lats', 'Deltoids', 'Biceps', 'Triceps', 'Forearm', 'Abs', 'Quads', 'Hamstrings', 'Calves', 'Glutes', 'Lumbar', 'Trapezius'];
const EQUIPMENT_OPTIONS = ['Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Cable', 'Smith Machine', 'Resistance Band', 'Bodyweight'];

const muscleData = {};
const equipment = [];

async function initializePage() {
    const subscriptionStatus = await checkSubscriptionStatus();
    const exerciseCount = await getCustomExerciseCount();

    if (!subscriptionStatus.isPro && exerciseCount >= 3) {
        showPremiumUpsell();
        return;
    }

    setupMuscleSliders();
    setupDifficultySlider();
    setupEquipmentInput();
    setupFormListeners();

    document.getElementById('cancel-btn').addEventListener('click', () => {
        window.history.back();
    });

    updateComparisonResults();
}

function showPremiumUpsell() {
    const form = document.getElementById('custom-exercise-form');
    form.innerHTML = `
        <div class="control-card border-2 border-accent-teal">
            <div class="text-center space-y-4">
                <h2 class="text-2xl font-bold text-white">Upgrade to Premium</h2>
                <p class="text-slate-400">You've reached the free tier limit of 3 custom exercises.</p>
                <p class="text-slate-400">Premium users can create unlimited custom exercises.</p>
                <div class="bg-slate-800/50 rounded-lg p-4 my-4">
                    <p class="text-sm text-slate-300 mb-2">Premium includes:</p>
                    <ul class="text-sm text-slate-400 space-y-1">
                        <li>• Unlimited custom exercises</li>
                        <li>• Advanced analytics</li>
                        <li>• Personalized recommendations</li>
                        <li>• Priority support</li>
                    </ul>
                </div>
                <button id="upgrade-btn" class="btn-primary">Upgrade to Premium</button>
                <button id="back-btn" class="btn-secondary w-full">Back to Workouts</button>
            </div>
        </div>
    `;

    document.getElementById('upgrade-btn').addEventListener('click', async () => {
        const { redirectToCheckout } = await import('./subscription-service.js');
        const priceId = document.body.dataset.stripePriceId || 'price_1234567890abcdef';
        try {
            await redirectToCheckout(priceId);
        } catch (error) {
            alert('Upgrade functionality not configured. Please check STRIPE_SETUP.md');
        }
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        window.history.back();
    });
}

function setupMuscleSliders() {
    const container = document.getElementById('muscle-sliders-container');

    MUSCLES.forEach(muscle => {
        muscleData[muscle] = 0;

        const sliderHTML = `
            <div class="muscle-slider-container">
                <label for="muscle-${muscle}">${muscle}</label>
                <input type="range" id="muscle-${muscle}" min="0" max="1" step="0.1" value="0" class="muscle-slider">
                <span class="muscle-value" id="value-${muscle}">0.0</span>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', sliderHTML);

        const slider = document.getElementById(`muscle-${muscle}`);
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            muscleData[muscle] = value;
            document.getElementById(`value-${muscle}`).textContent = value.toFixed(1);
            updateComparisonResults();
        });
    });
}

function setupDifficultySlider() {
    const slider = document.getElementById('exercise-difficulty');
    slider.addEventListener('input', (e) => {
        document.getElementById('difficulty-value').textContent = e.target.value;
    });
}

function setupEquipmentInput() {
    const input = document.getElementById('exercise-equipment-input');
    const btn = document.getElementById('add-equipment-btn');

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        addEquipment(input.value.trim());
        input.value = '';
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addEquipment(input.value.trim());
            input.value = '';
        }
    });
}

function addEquipment(item) {
    if (!item) return;
    if (!equipment.includes(item)) {
        equipment.push(item);
        renderEquipmentList();
    }
}

function removeEquipment(item) {
    const index = equipment.indexOf(item);
    if (index > -1) {
        equipment.splice(index, 1);
        renderEquipmentList();
    }
}

function renderEquipmentList() {
    const list = document.getElementById('equipment-list');
    list.innerHTML = equipment.map(item => `
        <span class="equipment-tag">
            ${item}
            <button type="button" onclick="removeEquipment('${item}')" class="ml-1 cursor-pointer">×</button>
        </span>
    `).join('');
}

function setupFormListeners() {
    document.getElementById('exercise-name').addEventListener('input', updateComparisonResults);
    document.getElementById('exercise-description').addEventListener('input', updateComparisonResults);
}

async function updateComparisonResults() {
    const validationMessage = document.getElementById('muscle-validation-error');
    const validation = validateMuscleActivation(muscleData);

    if (!validation.valid) {
        validationMessage.textContent = validation.error;
        validationMessage.classList.remove('hidden');
        return;
    } else {
        validationMessage.classList.add('hidden');
    }

    const similarExercises = findSimilarExercises(muscleData, ALL_EXERCISES, 3);

    const resultsContainer = document.getElementById('comparison-results');

    if (similarExercises.length === 0) {
        resultsContainer.innerHTML = '<p class="text-slate-400">Add muscle activation to see similar exercises.</p>';
        return;
    }

    resultsContainer.innerHTML = similarExercises.map(({ exercise, similarity }) => `
        <div class="similarity-card">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h3 class="font-semibold text-white">${exercise.Exercise_Name}</h3>
                    <p class="text-xs text-slate-400">${exercise.category || 'General'}</p>
                </div>
                <span class="similarity-badge" style="background-color: ${getSimilarityColor(similarity)}; color: white;">
                    ${similarity}% - ${getSimilarityLabel(similarity)}
                </span>
            </div>

            <div class="comparison-grid">
                <div>
                    <p class="text-xs font-semibold text-slate-300 mb-2">Your Exercise</p>
                    ${renderMuscleComparison(muscleData, true)}
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-300 mb-2">${exercise.Exercise_Name}</p>
                    ${renderMuscleComparison(exercise, false)}
                </div>
            </div>
        </div>
    `).join('');
}

function renderMuscleComparison(exerciseData, isCustom) {
    const topMuscles = getTopMuscles(exerciseData, 4);

    return topMuscles.map(([muscle, value]) => `
        <div class="muscle-bar">
            <span class="w-20 text-slate-400">${muscle}</span>
            <div class="muscle-bar-value">
                <div class="muscle-bar-fill" style="width: ${value * 100}%">
                    ${Math.round(value * 100)}%
                </div>
            </div>
        </div>
    `).join('');
}

function getTopMuscles(exerciseData, count = 4) {
    const entries = Object.entries(exerciseData.muscle_data || exerciseData).filter(([key]) => MUSCLES.includes(key));
    return entries.sort((a, b) => b[1] - a[1]).slice(0, count);
}

document.getElementById('custom-exercise-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('exercise-name').value.trim();
    const nameValidation = validateExerciseName(nameInput, []);
    const nameError = document.getElementById('name-error');

    if (!nameValidation.valid) {
        nameError.textContent = nameValidation.error;
        nameError.classList.remove('hidden');
        return;
    } else {
        nameError.classList.add('hidden');
    }

    const muscleValidation = validateMuscleActivation(muscleData);
    if (!muscleValidation.valid) {
        document.getElementById('muscle-validation-error').textContent = muscleValidation.error;
        document.getElementById('muscle-validation-error').classList.remove('hidden');
        return;
    }

    const saveBtn = document.getElementById('save-exercise-btn');
    const originalText = saveBtn.textContent;

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const exerciseTypes = Array.from(document.querySelectorAll('input[name="exercise-type"]:checked')).map(cb => cb.value);

        const customExerciseData = {
            name: nameInput,
            description: document.getElementById('exercise-description').value.trim(),
            difficulty: parseInt(document.getElementById('exercise-difficulty').value),
            exercise_type: exerciseTypes,
            mechanics: document.getElementById('exercise-mechanics').value,
            equipment: equipment,
            video_url: document.getElementById('exercise-video').value.trim() || null,
            muscle_data: muscleData,
            is_validated: true,
            validation_score: findSimilarExercises(muscleData, ALL_EXERCISES, 1)[0]?.similarity || 0,
            similar_exercise_id: findSimilarExercises(muscleData, ALL_EXERCISES, 1)[0]?.exercise.id || null
        };

        await saveCustomExercise(customExerciseData);

        saveBtn.textContent = 'Saved!';
        saveBtn.classList.add('bg-green-600');

        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1500);
    } catch (error) {
        console.error('Error saving exercise:', error);
        saveBtn.textContent = 'Error - Try Again';
        saveBtn.classList.add('bg-red-600');

        setTimeout(() => {
            saveBtn.classList.remove('bg-red-600');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }, 3000);
    }
});

window.removeEquipment = removeEquipment;

(async () => {
    const user = await initAuth();
    if (user) {
        ALL_EXERCISES = await loadExercises();
        await initializePage();
    }
})();
