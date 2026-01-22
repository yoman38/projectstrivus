import { initAuth } from './auth-guard.js';
import {
  getUserCustomExercises,
  deleteCustomExercise,
  bulkDeleteCustomExercises,
  duplicateCustomExercise
} from './custom-exercise-service.js';
import { escapeHtml, debounce } from './utils.js';

let allExercises = [];
let filteredExercises = [];
let selectedExercises = new Set();

async function initializePage() {
  setupEventListeners();
  await loadExercises();
  renderExercises();
  updateStats();
}

function setupEventListeners() {
  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = '/index.html';
  });

  document.getElementById('create-new-btn').addEventListener('click', () => {
    window.location.href = '/custom-exercise.html';
  });

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', debounce((e) => {
    filterExercises(e.target.value);
  }, 300));

  document.getElementById('sort-select').addEventListener('change', (e) => {
    sortExercises(e.target.value);
  });

  document.getElementById('deselect-all-btn').addEventListener('click', () => {
    selectedExercises.clear();
    renderExercises();
  });

  document.getElementById('bulk-delete-btn').addEventListener('click', handleBulkDelete);

  document.getElementById('cancel-delete-btn').addEventListener('click', () => {
    document.getElementById('delete-modal').classList.remove('active');
  });

  document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);

  document.querySelector('#empty-state button').addEventListener('click', () => {
    window.location.href = '/custom-exercise.html';
  });
}

async function loadExercises() {
  const loadingContainer = document.getElementById('loading-container');
  const exercisesContainer = document.getElementById('exercises-container');
  const emptyState = document.getElementById('empty-state');

  loadingContainer.classList.remove('hidden');
  exercisesContainer.classList.add('hidden');
  emptyState.classList.add('hidden');

  const result = await getUserCustomExercises();

  if (result.success) {
    allExercises = result.data;
    filteredExercises = [...allExercises];

    loadingContainer.classList.add('hidden');

    if (allExercises.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      exercisesContainer.classList.remove('hidden');
    }
  } else {
    loadingContainer.classList.add('hidden');
    alert('Failed to load exercises: ' + result.error);
  }
}

function filterExercises(searchTerm) {
  const term = searchTerm.toLowerCase().trim();

  if (!term) {
    filteredExercises = [...allExercises];
  } else {
    filteredExercises = allExercises.filter(exercise => {
      const name = exercise.name.toLowerCase();
      const description = (exercise.description || '').toLowerCase();
      const mechanics = (exercise.mechanics || '').toLowerCase();
      const equipment = (exercise.equipment || []).join(' ').toLowerCase();

      return name.includes(term) ||
             description.includes(term) ||
             mechanics.includes(term) ||
             equipment.includes(term);
    });
  }

  renderExercises();
}

function sortExercises(sortBy) {
  switch (sortBy) {
    case 'name':
      filteredExercises.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'usage_count':
      filteredExercises.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
      break;
    case 'difficulty':
      filteredExercises.sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0));
      break;
    case 'created_at':
    default:
      filteredExercises.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }

  renderExercises();
}

function renderExercises() {
  const container = document.getElementById('exercises-container');

  if (filteredExercises.length === 0 && allExercises.length > 0) {
    container.innerHTML = '<div class="control-card text-center text-slate-400">No exercises match your search</div>';
    return;
  }

  container.innerHTML = filteredExercises.map(exercise => {
    const isSelected = selectedExercises.has(exercise.id);
    const topMuscles = getTopMuscles(exercise.muscle_data, 3);

    return `
      <div class="exercise-card ${isSelected ? 'selected' : ''}" data-exercise-id="${exercise.id}">
        <div class="flex items-start gap-3">
          <input type="checkbox" class="checkbox-custom" data-id="${exercise.id}" ${isSelected ? 'checked' : ''}>

          <div class="flex-grow">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 class="text-xl font-bold text-white">${escapeHtml(exercise.name)}</h3>
                <p class="text-sm text-slate-400">${escapeHtml(exercise.description || 'No description')}</p>
              </div>
              <div class="flex gap-2">
                <span class="badge badge-difficulty">Level ${exercise.difficulty}/5</span>
                <span class="badge badge-usage">${exercise.usage_count || 0} uses</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 mb-2">
              <span class="text-xs bg-slate-700 px-2 py-1 rounded">${exercise.mechanics || 'N/A'}</span>
              ${(exercise.exercise_type || []).map(type =>
                `<span class="text-xs bg-slate-700 px-2 py-1 rounded">${type}</span>`
              ).join('')}
              ${(exercise.equipment || []).slice(0, 3).map(eq =>
                `<span class="text-xs bg-slate-700 px-2 py-1 rounded">��️ ${escapeHtml(eq)}</span>`
              ).join('')}
            </div>

            <div class="text-xs text-slate-400 mb-1">
              Primary Muscles: ${topMuscles.map(([m, v]) => `${m} (${Math.round(v * 100)}%)`).join(', ')}
            </div>

            <div class="muscle-mini-bar">
              ${renderMuscleMiniBar(exercise.muscle_data)}
            </div>

            <div class="flex gap-2 mt-3">
              <button class="btn-secondary btn-small edit-btn" data-id="${exercise.id}">✏️ Edit</button>
              <button class="btn-secondary btn-small duplicate-btn" data-id="${exercise.id}">📋 Duplicate</button>
              <button class="btn-danger btn-small delete-btn" data-id="${exercise.id}" data-name="${escapeHtml(exercise.name)}">🗑️ Delete</button>
              ${exercise.video_url ? `<a href="${exercise.video_url}" target="_blank" class="btn-secondary btn-small">🎥 Video</a>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  attachExerciseEventListeners();
  updateBulkActionsVisibility();
}

function renderMuscleMiniBar(muscleData) {
  const muscles = ['Chest', 'Lats', 'Deltoids', 'Biceps', 'Triceps', 'Forearm', 'Abs', 'Quads', 'Hamstrings', 'Calves', 'Glutes', 'Lumbar', 'Trapezius'];

  return muscles.map(muscle => {
    const value = muscleData[muscle] || 0;
    return `<div class="muscle-mini-segment" style="flex: ${value}; opacity: ${value > 0 ? 0.6 + (value * 0.4) : 0.1};" title="${muscle}: ${value}"></div>`;
  }).join('');
}

function getTopMuscles(muscleData, count = 3) {
  return Object.entries(muscleData)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, value]) => value > 0)
    .slice(0, count);
}

function attachExerciseEventListeners() {
  document.querySelectorAll('.checkbox-custom').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        selectedExercises.add(id);
      } else {
        selectedExercises.delete(id);
      }
      renderExercises();
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      window.location.href = `/custom-exercise.html?id=${id}`;
    });
  });

  document.querySelectorAll('.duplicate-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      await handleDuplicate(id);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const name = e.target.dataset.name;
      showDeleteModal(id, name);
    });
  });
}

function updateBulkActionsVisibility() {
  const bulkActions = document.getElementById('bulk-actions');
  const selectedCount = document.getElementById('selected-count');

  if (selectedExercises.size > 0) {
    bulkActions.classList.remove('hidden');
    selectedCount.textContent = selectedExercises.size;
  } else {
    bulkActions.classList.add('hidden');
  }
}

function updateStats() {
  const total = allExercises.length;
  const totalUsage = allExercises.reduce((sum, ex) => sum + (ex.usage_count || 0), 0);

  const mostUsed = allExercises.reduce((max, ex) =>
    (ex.usage_count || 0) > (max.usage_count || 0) ? ex : max
  , { usage_count: 0, name: '-' });

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-total-usage').textContent = totalUsage;
  document.getElementById('stat-most-used').textContent = total > 0 ? mostUsed.name : '-';
}

let exerciseToDelete = null;

function showDeleteModal(id, name) {
  exerciseToDelete = id;
  document.getElementById('delete-exercise-name').textContent = name;
  document.getElementById('delete-modal').classList.add('active');
}

async function confirmDelete() {
  if (!exerciseToDelete) return;

  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  const result = await deleteCustomExercise(exerciseToDelete);

  if (result.success) {
    allExercises = allExercises.filter(ex => ex.id !== exerciseToDelete);
    filteredExercises = filteredExercises.filter(ex => ex.id !== exerciseToDelete);
    selectedExercises.delete(exerciseToDelete);

    document.getElementById('delete-modal').classList.remove('active');
    renderExercises();
    updateStats();

    if (allExercises.length === 0) {
      document.getElementById('exercises-container').classList.add('hidden');
      document.getElementById('empty-state').classList.remove('hidden');
    }
  } else {
    alert('Failed to delete exercise: ' + result.error);
  }

  btn.disabled = false;
  btn.textContent = 'Delete Exercise';
  exerciseToDelete = null;
}

async function handleBulkDelete() {
  if (selectedExercises.size === 0) return;

  const count = selectedExercises.size;
  if (!confirm(`Are you sure you want to delete ${count} exercise${count > 1 ? 's' : ''}? This cannot be undone.`)) {
    return;
  }

  const btn = document.getElementById('bulk-delete-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  const ids = Array.from(selectedExercises);
  const result = await bulkDeleteCustomExercises(ids);

  if (result.success) {
    allExercises = allExercises.filter(ex => !selectedExercises.has(ex.id));
    filteredExercises = filteredExercises.filter(ex => !selectedExercises.has(ex.id));
    selectedExercises.clear();

    renderExercises();
    updateStats();

    if (allExercises.length === 0) {
      document.getElementById('exercises-container').classList.add('hidden');
      document.getElementById('empty-state').classList.remove('hidden');
    }
  } else {
    alert('Failed to delete exercises: ' + result.error);
  }

  btn.disabled = false;
  btn.textContent = 'Delete Selected';
}

async function handleDuplicate(id) {
  const exercise = allExercises.find(ex => ex.id === id);
  if (!exercise) return;

  const newName = prompt('Enter a name for the duplicated exercise:', `${exercise.name} (Copy)`);
  if (!newName || newName.trim() === '') return;

  const result = await duplicateCustomExercise(id, newName.trim());

  if (result.success) {
    await loadExercises();
    renderExercises();
    updateStats();
  } else {
    alert('Failed to duplicate exercise: ' + result.error);
  }
}

(async () => {
  const user = await initAuth();
  if (user) {
    await initializePage();
  }
})();
