import { loadAllExercises, filterExercises, getMuscleGroups, getEquipmentTypes, incrementExerciseUsage } from './exercise-picker-service.js';

let modal = null;
let currentFilters = {
    search: '',
    muscleGroup: 'all',
    equipment: 'all',
    showCustomOnly: false
};
let onSelectCallback = null;

export function createExercisePickerModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'exercise-picker-modal';
    modal.className = 'fixed inset-0 z-50 hidden';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" id="modal-overlay"></div>
        <div class="absolute inset-0 flex items-end md:items-center justify-center p-0 md:p-4">
            <div class="bg-slate-900 w-full h-full md:h-[90vh] md:max-w-4xl md:rounded-2xl flex flex-col overflow-hidden border-0 md:border md:border-slate-700 shadow-2xl">
                <div class="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-4 md:px-6 py-4">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-white">Select Exercise</h2>
                        <button id="close-picker" class="text-slate-400 hover:text-white transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <div class="relative mb-4">
                        <input
                            type="text"
                            id="exercise-search"
                            placeholder="Search exercises..."
                            class="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 pl-10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-action-blue focus:border-transparent"
                        />
                        <svg class="w-5 h-5 absolute left-3 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>

                    <div class="flex gap-2 overflow-x-auto pb-2">
                        <button class="filter-toggle flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-white transition-colors whitespace-nowrap" data-filter="custom">
                            <span>⭐</span>
                            <span>My Exercises</span>
                        </button>
                        <div class="border-l border-slate-600 mx-1"></div>
                        <div id="muscle-filters" class="flex gap-2"></div>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-4 md:px-6 py-4">
                    <div id="exercise-loading" class="flex flex-col items-center justify-center py-12">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-action-blue mb-4"></div>
                        <p class="text-slate-400">Loading exercises...</p>
                    </div>

                    <div id="exercise-grid" class="hidden grid grid-cols-1 md:grid-cols-2 gap-3"></div>

                    <div id="exercise-empty" class="hidden text-center py-12">
                        <div class="text-6xl mb-4">🔍</div>
                        <h3 class="text-xl font-bold text-white mb-2">No Exercises Found</h3>
                        <p class="text-slate-400 mb-4">Try adjusting your filters</p>
                        <button id="reset-filters" class="bg-action-blue hover:bg-action-blue-hover text-white font-semibold py-2 px-6 rounded-lg transition">
                            Reset Filters
                        </button>
                    </div>
                </div>

                <div class="flex-shrink-0 bg-slate-800 border-t border-slate-700 px-4 md:px-6 py-3">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-slate-400" id="exercise-count">0 exercises</span>
                        <button id="create-custom" class="text-action-blue hover:text-action-blue-hover font-medium transition-colors">
                            + Create Custom Exercise
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setupModalEventListeners();

    return modal;
}

function setupModalEventListeners() {
    const overlay = modal.querySelector('#modal-overlay');
    const closeBtn = modal.querySelector('#close-picker');
    const searchInput = modal.querySelector('#exercise-search');
    const createCustomBtn = modal.querySelector('#create-custom');
    const resetFiltersBtn = modal.querySelector('#reset-filters');

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    createCustomBtn.addEventListener('click', () => {
        window.location.href = 'custom-exercise.html';
    });

    searchInput.addEventListener('input', (e) => {
        currentFilters.search = e.target.value;
        renderExercises();
    });

    resetFiltersBtn?.addEventListener('click', () => {
        currentFilters = {
            search: '',
            muscleGroup: 'all',
            equipment: 'all',
            showCustomOnly: false
        };
        searchInput.value = '';
        renderMuscleFilters();
        renderExercises();
    });

    renderMuscleFilters();
}

function renderMuscleFilters() {
    const container = modal.querySelector('#muscle-filters');
    const muscleGroups = getMuscleGroups();

    container.innerHTML = muscleGroups.map(mg => `
        <button
            class="muscle-filter-btn px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentFilters.muscleGroup === mg.id
                    ? 'bg-action-blue text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }"
            data-muscle="${mg.id}"
        >
            <span>${mg.icon}</span>
            <span class="ml-1">${mg.name}</span>
        </button>
    `).join('');

    container.querySelectorAll('.muscle-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilters.muscleGroup = btn.dataset.muscle;
            renderMuscleFilters();
            renderExercises();
        });
    });

    const customToggle = modal.querySelector('[data-filter="custom"]');
    customToggle.classList.toggle('bg-accent-teal', currentFilters.showCustomOnly);
    customToggle.classList.toggle('bg-slate-700', !currentFilters.showCustomOnly);

    customToggle.addEventListener('click', () => {
        currentFilters.showCustomOnly = !currentFilters.showCustomOnly;
        renderMuscleFilters();
        renderExercises();
    });
}

async function renderExercises() {
    const grid = modal.querySelector('#exercise-grid');
    const loading = modal.querySelector('#exercise-loading');
    const empty = modal.querySelector('#exercise-empty');
    const countEl = modal.querySelector('#exercise-count');

    grid.classList.add('hidden');
    empty.classList.add('hidden');

    const exercises = filterExercises(currentFilters);

    if (exercises.length === 0) {
        loading.classList.add('hidden');
        empty.classList.remove('hidden');
        countEl.textContent = '0 exercises';
        return;
    }

    loading.classList.add('hidden');
    grid.classList.remove('hidden');
    countEl.textContent = `${exercises.length} exercise${exercises.length === 1 ? '' : 's'}`;

    grid.innerHTML = exercises.map(ex => createExerciseCard(ex)).join('');

    grid.querySelectorAll('.exercise-card-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => selectExercise(exercises[index]));
    });
}

function createExerciseCard(exercise) {
    const isCustom = exercise.isCustom;
    const muscles = exercise.muscles || exercise.muscle_data || {};
    const primaryMuscles = Object.entries(muscles)
        .filter(([, value]) => value > 0.5)
        .map(([muscle]) => muscle)
        .slice(0, 2);

    return `
        <button class="exercise-card-btn text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-action-blue rounded-lg p-4 transition-all group">
            <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="font-bold text-white group-hover:text-action-blue transition-colors">
                            ${exercise.name}
                        </h3>
                        ${isCustom ? '<span class="text-xs px-2 py-0.5 bg-accent-teal text-slate-900 rounded-full font-semibold">Custom</span>' : ''}
                    </div>
                    ${exercise.equipment ? `
                        <div class="text-xs text-slate-400 mb-2">
                            ${exercise.equipment}
                        </div>
                    ` : ''}
                </div>
                <div class="flex items-center gap-1">
                    ${Array.from({ length: exercise.difficulty || 3 }, (_, i) => `
                        <svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                    `).join('')}
                </div>
            </div>

            ${primaryMuscles.length > 0 ? `
                <div class="flex flex-wrap gap-1 mt-2">
                    ${primaryMuscles.map(muscle => `
                        <span class="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                            ${muscle}
                        </span>
                    `).join('')}
                </div>
            ` : ''}

            ${isCustom && exercise.usage_count > 0 ? `
                <div class="text-xs text-slate-500 mt-2">
                    Used ${exercise.usage_count} time${exercise.usage_count === 1 ? '' : 's'}
                </div>
            ` : ''}
        </button>
    `;
}

async function selectExercise(exercise) {
    await incrementExerciseUsage(exercise.exercise_id);

    if (onSelectCallback) {
        onSelectCallback(exercise);
    }

    closeModal();
}

export async function openExercisePicker(onSelect) {
    if (!modal) {
        createExercisePickerModal();
    }

    onSelectCallback = onSelect;

    const loading = modal.querySelector('#exercise-loading');
    const grid = modal.querySelector('#exercise-grid');

    loading.classList.remove('hidden');
    grid.classList.add('hidden');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    await loadAllExercises();
    await renderExercises();
}

export function closeModal() {
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        onSelectCallback = null;
    }
}
