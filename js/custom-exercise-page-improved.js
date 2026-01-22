import { initAuth } from './auth-guard.js';
import { loadExercises } from './exercise-loader.js';
import {
  saveCustomExercise,
  updateCustomExercise,
  getCustomExerciseById,
  getCustomExerciseCount,
  getCustomExerciseNames
} from './custom-exercise-service.js';
import {
  findSimilarExercises,
  validateExerciseName,
  validateMuscleActivation,
  getSimilarityColor,
  getSimilarityLabel,
  detectAnatomicalIssues
} from './exercise-similarity.js';
import { checkSubscriptionStatus } from './subscription-service.js';
import { debounce, escapeHtml, saveToLocalStorage, loadFromLocalStorage, clearLocalStorageItem } from './utils.js';
import { ALL_MUSCLES, EXERCISE_TEMPLATES, getGroupedMuscles } from './muscle-groups.js';

let ALL_EXERCISES = [];
let existingExerciseNames = [];
let isEditMode = false;
let editingExerciseId = null;

const muscleData = {};
const equipment = [];

const AUTO_SAVE_KEY = 'custom_exercise_draft';
const AUTO_SAVE_INTERVAL = 30000;
let autoSaveTimer = null;

async function initializePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const exerciseId = urlParams.get('id');

  if (exerciseId) {
    isEditMode = true;
    editingExerciseId = exerciseId;
    await loadExerciseForEdit(exerciseId);
  } else {
    const subscriptionStatus = await checkSubscriptionStatus();
    const countResult = await getCustomExerciseCount();
    const count = countResult.success ? countResult.count : 0;

    if (!subscriptionStatus.isPro && count >= 3) {
      showPremiumUpsell();
      return;
    }

    loadDraftFromLocalStorage();
  }

  const namesResult = await getCustomExerciseNames();
  if (namesResult.success) {
    existingExerciseNames = namesResult.names;
  }

  setupMuscleSliders();
  setupDifficultySlider();
  setupEquipmentInput();
  setupFormListeners();
  setupTemplateSelector();
  setupKeyboardShortcuts();
  startAutoSave();

  document.getElementById('cancel-btn').addEventListener('click', handleCancel);

  updateComparisonResults();
}

async function loadExerciseForEdit(id) {
  const result = await getCustomExerciseById(id);

  if (!result.success || !result.data) {
    alert('Failed to load exercise');
    window.location.href = '/manage-exercises.html';
    return;
  }

  const exercise = result.data;

  document.getElementById('exercise-name').value = exercise.name;
  document.getElementById('exercise-description').value = exercise.description || '';
  document.getElementById('exercise-difficulty').value = exercise.difficulty || 3;
  document.getElementById('difficulty-value').textContent = exercise.difficulty || 3;
  document.getElementById('exercise-mechanics').value = exercise.mechanics || 'Isolation';
  document.getElementById('exercise-video').value = exercise.video_url || '';

  Object.assign(muscleData, exercise.muscle_data);
  Object.keys(muscleData).forEach(muscle => {
    const slider = document.getElementById(`muscle-${muscle}`);
    if (slider) {
      slider.value = muscleData[muscle];
      document.getElementById(`value-${muscle}`).textContent = muscleData[muscle].toFixed(1);
    }
  });

  if (exercise.equipment && Array.isArray(exercise.equipment)) {
    equipment.push(...exercise.equipment);
    renderEquipmentList();
  }

  if (exercise.exercise_type && Array.isArray(exercise.exercise_type)) {
    exercise.exercise_type.forEach(type => {
      const checkbox = document.querySelector(`input[name="exercise-type"][value="${type}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }

  document.querySelector('h1').textContent = 'Edit Custom Exercise';
  document.getElementById('save-exercise-btn').textContent = 'Update Exercise';
}

function loadDraftFromLocalStorage() {
  const draft = loadFromLocalStorage(AUTO_SAVE_KEY, 60 * 60 * 1000);

  if (draft && confirm('You have an unsaved draft. Would you like to restore it?')) {
    document.getElementById('exercise-name').value = draft.name || '';
    document.getElementById('exercise-description').value = draft.description || '';
    document.getElementById('exercise-difficulty').value = draft.difficulty || 3;
    document.getElementById('exercise-mechanics').value = draft.mechanics || 'Isolation';
    document.getElementById('exercise-video').value = draft.video_url || '';

    if (draft.muscle_data) {
      Object.assign(muscleData, draft.muscle_data);
      Object.keys(muscleData).forEach(muscle => {
        const slider = document.getElementById(`muscle-${muscle}`);
        if (slider) {
          slider.value = muscleData[muscle];
          document.getElementById(`value-${muscle}`).textContent = muscleData[muscle].toFixed(1);
        }
      });
    }

    if (draft.equipment) {
      equipment.push(...draft.equipment);
      renderEquipmentList();
    }
  }
}

function startAutoSave() {
  autoSaveTimer = setInterval(() => {
    if (!isEditMode) {
      const draft = collectFormData();
      saveToLocalStorage(AUTO_SAVE_KEY, draft);
    }
  }, AUTO_SAVE_INTERVAL);
}

function collectFormData() {
  const exerciseTypes = Array.from(document.querySelectorAll('input[name="exercise-type"]:checked')).map(cb => cb.value);

  return {
    name: document.getElementById('exercise-name').value.trim(),
    description: document.getElementById('exercise-description').value.trim(),
    difficulty: parseInt(document.getElementById('exercise-difficulty').value),
    exercise_type: exerciseTypes,
    mechanics: document.getElementById('exercise-mechanics').value,
    equipment: [...equipment],
    video_url: document.getElementById('exercise-video').value.trim() || null,
    muscle_data: { ...muscleData }
  };
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
          <ul class="text-sm text-slate-400 space-y-1 text-left max-w-xs mx-auto">
            <li>• Unlimited custom exercises</li>
            <li>• Exercise templates and presets</li>
            <li>• Advanced analytics</li>
            <li>• Priority support</li>
          </ul>
        </div>
        <button id="upgrade-btn" class="btn-primary">Upgrade to Premium</button>
        <button id="back-btn-upsell" class="btn-secondary w-full">Back to Workouts</button>
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

  document.getElementById('back-btn-upsell').addEventListener('click', () => {
    window.location.href = '/index.html';
  });
}

function setupTemplateSelector() {
  const container = document.createElement('div');
  container.className = 'mb-4';
  container.innerHTML = `
    <label class="block mb-2 font-medium">Quick Templates</label>
    <select id="template-selector" class="input-field w-full">
      <option value="">Select a template...</option>
      ${Object.keys(EXERCISE_TEMPLATES).map(template =>
        `<option value="${template}">${template}</option>`
      ).join('')}
    </select>
  `;

  const muscleSection = document.querySelector('#muscle-sliders-container').parentElement;
  muscleSection.insertBefore(container, muscleSection.querySelector('#muscle-sliders-container'));

  document.getElementById('template-selector').addEventListener('change', (e) => {
    if (e.target.value) {
      applyTemplate(e.target.value);
      e.target.value = '';
    }
  });
}

function applyTemplate(templateName) {
  const template = EXERCISE_TEMPLATES[templateName];
  if (!template) return;

  ALL_MUSCLES.forEach(muscle => {
    muscleData[muscle] = template[muscle] || 0;
    const slider = document.getElementById(`muscle-${muscle}`);
    if (slider) {
      slider.value = muscleData[muscle];
      document.getElementById(`value-${muscle}`).textContent = muscleData[muscle].toFixed(1);
    }
  });

  updateComparisonResults();
}

function setupMuscleSliders() {
  const container = document.getElementById('muscle-sliders-container');
  const grouped = getGroupedMuscles();

  Object.entries(grouped).forEach(([groupName, groupData]) => {
    const groupId = groupName.replace(/\s+/g, '-').toLowerCase();

    const groupHTML = `
      <div class="mb-4">
        <button type="button" class="flex items-center justify-between w-full text-left py-2 px-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition mb-2 muscle-group-toggle" data-group="${groupId}">
          <span class="font-semibold text-white">${groupData.icon} ${groupName}</span>
          <span class="transform transition-transform" id="chevron-${groupId}">▼</span>
        </button>
        <div id="group-${groupId}" class="space-y-2 pl-2">
          ${groupData.muscles.map(muscle => {
            muscleData[muscle] = muscleData[muscle] || 0;
            return `
              <div class="muscle-slider-container">
                <label for="muscle-${muscle}" class="min-w-[100px] text-sm">${muscle}</label>
                <input type="range" id="muscle-${muscle}" min="0" max="1" step="0.1" value="${muscleData[muscle]}" class="muscle-slider flex-1">
                <span class="muscle-value min-w-[40px] text-right" id="value-${muscle}">${muscleData[muscle].toFixed(1)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', groupHTML);
  });

  document.querySelectorAll('.muscle-group-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const groupId = e.currentTarget.dataset.group;
      const content = document.getElementById(`group-${groupId}`);
      const chevron = document.getElementById(`chevron-${groupId}`);

      if (content.style.display === 'none') {
        content.style.display = 'block';
        chevron.style.transform = 'rotate(0deg)';
      } else {
        content.style.display = 'none';
        chevron.style.transform = 'rotate(-90deg)';
      }
    });
  });

  ALL_MUSCLES.forEach(muscle => {
    const slider = document.getElementById(`muscle-${muscle}`);
    if (slider) {
      slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        muscleData[muscle] = value;
        document.getElementById(`value-${muscle}`).textContent = value.toFixed(1);
        debouncedComparisonUpdate();
      });
    }
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
  list.innerHTML = equipment.map(item => {
    const escaped = escapeHtml(item);
    return `
      <span class="equipment-tag">
        ${escaped}
        <button type="button" class="ml-1 cursor-pointer remove-equipment-btn" data-equipment="${escaped}">×</button>
      </span>
    `;
  }).join('');

  document.querySelectorAll('.remove-equipment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const equipmentName = e.target.dataset.equipment;
      removeEquipment(equipmentName);
    });
  });
}

function setupFormListeners() {
  document.getElementById('exercise-name').addEventListener('input', () => {
    validateNameField();
    debouncedComparisonUpdate();
  });

  document.getElementById('exercise-description').addEventListener('input', debouncedComparisonUpdate);
}

function validateNameField() {
  const nameInput = document.getElementById('exercise-name').value.trim();
  const nameError = document.getElementById('name-error');

  const filteredNames = existingExerciseNames.filter(name =>
    isEditMode ? name !== document.getElementById('exercise-name').defaultValue.toLowerCase() : true
  );

  const validation = validateExerciseName(nameInput, filteredNames);

  if (!validation.valid && nameInput.length > 0) {
    nameError.textContent = validation.error;
    nameError.classList.remove('hidden');
    return false;
  } else {
    nameError.classList.add('hidden');
    return true;
  }
}

const debouncedComparisonUpdate = debounce(updateComparisonResults, 500);

async function updateComparisonResults() {
  const validationMessage = document.getElementById('muscle-validation-error');
  const validation = validateMuscleActivation(muscleData);

  if (!validation.valid) {
    validationMessage.textContent = validation.error || validation.warning;
    validationMessage.classList.remove('hidden');
    if (validation.error) {
      validationMessage.classList.add('validation-error');
      validationMessage.classList.remove('validation-warning');
      return;
    } else if (validation.warning) {
      validationMessage.classList.add('validation-warning');
      validationMessage.classList.remove('validation-error');
    }
  } else if (validation.warning) {
    validationMessage.textContent = validation.warning;
    validationMessage.classList.remove('hidden', 'validation-error');
    validationMessage.classList.add('validation-warning');
  } else {
    validationMessage.classList.add('hidden');
    validationMessage.classList.remove('validation-error', 'validation-warning');
  }

  const anatomicalIssues = detectAnatomicalIssues(muscleData);
  if (anatomicalIssues.length > 0) {
    const issuesHtml = anatomicalIssues.map(issue => `<li>${issue}</li>`).join('');
    validationMessage.innerHTML = `<strong>Potential Issues:</strong><ul class="list-disc ml-5 mt-2">${issuesHtml}</ul>`;
    validationMessage.classList.remove('hidden', 'validation-error');
    validationMessage.classList.add('validation-warning');
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
          <h3 class="font-semibold text-white">${escapeHtml(exercise.Exercise_Name)}</h3>
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
          <p class="text-xs font-semibold text-slate-300 mb-2">${escapeHtml(exercise.Exercise_Name)}</p>
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
  const data = exerciseData.muscle_data || exerciseData;
  const entries = Object.entries(data).filter(([key]) => ALL_MUSCLES.includes(key));
  return entries.sort((a, b) => b[1] - a[1]).slice(0, count);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      document.getElementById('custom-exercise-form').dispatchEvent(new Event('submit'));
    }

    if (e.key === 'Escape') {
      handleCancel();
    }
  });
}

function handleCancel() {
  const hasChanges = document.getElementById('exercise-name').value.trim() !== '' ||
                     Object.values(muscleData).some(v => v > 0);

  if (hasChanges && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
    return;
  }

  clearLocalStorageItem(AUTO_SAVE_KEY);
  if (autoSaveTimer) clearInterval(autoSaveTimer);

  window.location.href = isEditMode ? '/manage-exercises.html' : '/index.html';
}

document.getElementById('custom-exercise-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateNameField()) return;

  const muscleValidation = validateMuscleActivation(muscleData);
  if (!muscleValidation.valid && muscleValidation.error) {
    document.getElementById('muscle-validation-error').textContent = muscleValidation.error;
    document.getElementById('muscle-validation-error').classList.remove('hidden');
    return;
  }

  const saveBtn = document.getElementById('save-exercise-btn');
  const originalText = saveBtn.textContent;

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = isEditMode ? 'Updating...' : 'Saving...';

    const formData = collectFormData();

    const similarExercises = findSimilarExercises(muscleData, ALL_EXERCISES, 1);
    formData.is_validated = true;
    formData.validation_score = similarExercises[0]?.similarity || 0;
    formData.similar_exercise_id = similarExercises[0]?.exercise.id || null;

    let result;
    if (isEditMode) {
      result = await updateCustomExercise(editingExerciseId, formData);
    } else {
      result = await saveCustomExercise(formData);
    }

    if (result.success) {
      clearLocalStorageItem(AUTO_SAVE_KEY);
      if (autoSaveTimer) clearInterval(autoSaveTimer);

      saveBtn.textContent = isEditMode ? 'Updated!' : 'Saved!';
      saveBtn.classList.add('bg-green-600');

      setTimeout(() => {
        window.location.href = '/manage-exercises.html';
      }, 1000);
    } else {
      throw new Error(result.error || 'Failed to save exercise');
    }
  } catch (error) {
    console.error('Error saving exercise:', error);
    saveBtn.textContent = error.message || 'Error - Try Again';
    saveBtn.classList.add('bg-red-600');

    setTimeout(() => {
      saveBtn.classList.remove('bg-red-600');
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }, 3000);
  }
});

window.addEventListener('beforeunload', (e) => {
  const hasChanges = document.getElementById('exercise-name').value.trim() !== '' ||
                     Object.values(muscleData).some(v => v > 0);

  if (hasChanges && !isEditMode) {
    e.preventDefault();
    e.returnValue = '';
  }
});

(async () => {
  const user = await initAuth();
  if (user) {
    ALL_EXERCISES = await loadExercises();
    await initializePage();
  }
})();
