const UI_MODES = {
  SIMPLE: 'simple',
  ADVANCED: 'advanced',
  EXPERT: 'expert'
};

let currentMode = UI_MODES.SIMPLE;

export function initializeModeSystem() {
  const savedMode = localStorage.getItem('ui-mode') || UI_MODES.SIMPLE;
  setUIMode(savedMode);

  document.getElementById('show-advanced-btn')?.addEventListener('click', () => {
    setUIMode(UI_MODES.ADVANCED);
  });

  document.getElementById('show-expert-btn')?.addEventListener('click', () => {
    setUIMode(UI_MODES.EXPERT);
  });

  document.getElementById('show-simple-btn')?.addEventListener('click', () => {
    setUIMode(UI_MODES.SIMPLE);
  });
}

export function setUIMode(mode) {
  currentMode = mode;
  localStorage.setItem('ui-mode', mode);

  document.querySelectorAll('.simple-mode, .advanced-mode, .expert-mode').forEach(el => {
    el.style.display = 'none';
  });

  document.querySelectorAll('.simple-mode').forEach(el => {
    el.style.display = 'block';
  });

  if (mode === UI_MODES.ADVANCED || mode === UI_MODES.EXPERT) {
    document.querySelectorAll('.advanced-mode').forEach(el => {
      el.style.display = 'block';
    });
  }

  if (mode === UI_MODES.EXPERT) {
    document.querySelectorAll('.expert-mode').forEach(el => {
      el.style.display = 'block';
    });
  }

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtn = document.getElementById(`${mode}-mode-btn`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  updateModeButtons();
}

function updateModeButtons() {
  const showAdvancedBtn = document.getElementById('show-advanced-btn');
  const showExpertBtn = document.getElementById('show-expert-btn');
  const showSimpleBtn = document.getElementById('show-simple-btn');

  if (showAdvancedBtn) {
    showAdvancedBtn.style.display = currentMode === UI_MODES.SIMPLE ? 'inline-block' : 'none';
  }

  if (showExpertBtn) {
    showExpertBtn.style.display = currentMode === UI_MODES.ADVANCED ? 'inline-block' : 'none';
  }

  if (showSimpleBtn) {
    showSimpleBtn.style.display = currentMode !== UI_MODES.SIMPLE ? 'inline-block' : 'none';
  }
}

export function getCurrentMode() {
  return currentMode;
}

export function isSimpleMode() {
  return currentMode === UI_MODES.SIMPLE;
}

export function isAdvancedMode() {
  return currentMode === UI_MODES.ADVANCED;
}

export function isExpertMode() {
  return currentMode === UI_MODES.EXPERT;
}
