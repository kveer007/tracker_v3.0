/**
 * UI Module - Core user interface functionality
 * Updated to support the new reminders system
 */

/**
 * Initialize theme functionality
 */
function initializeTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      document.body.classList.toggle('dark-theme');
      
      const isLight = document.body.classList.contains('light-theme');
      const theme = isLight ? 'light' : 'dark';
      
      localStorage.setItem('theme', theme);
      utils.changeThemeColor(!isLight);
      utils.showToast(`Switched to ${theme} theme`, 'success');
    });
  }
  
  // Apply saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${savedTheme}-theme`);
  }
}

/**
 * Initialize tab navigation
 */
function initializeTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const appContainers = document.querySelectorAll('.app-container');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetApp = button.getAttribute('data-app');
      
      // Update tab buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update app containers
      appContainers.forEach(container => {
        container.classList.remove('active');
      });
      
      const targetContainer = document.getElementById(`${targetApp}-app`);
      if (targetContainer) {
        targetContainer.classList.add('active');
        
        // Update body class for theming
        document.body.className = document.body.className.replace(/\b\w+-app\b/g, '');
        document.body.classList.add(`${targetApp}-app`);
      }
      
      // Close any open panels when switching tabs
      document.querySelectorAll('.panel, .reminders-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      
      console.log(`Switched to ${targetApp} app`);
    });
  });
  
  // Initialize first tab
  const firstTab = document.querySelector('.tab-btn.active');
  if (firstTab) {
    firstTab.click();
  }
}

/**
 * Initialize data management functionality
 */
function initializeDataManagement() {
  // Export data
  const exportBtn = document.getElementById('export-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      try {
        const csv = convertDataToCSV();
        downloadCSV(csv, 'health-tracker-data.csv');
        utils.showToast('Data exported successfully!', 'success');
      } catch (error) {
        console.error('Export error:', error);
        utils.showToast('Error exporting data', 'error');
      }
    });
  }
  
  // Import data
  const importBtn = document.getElementById('import-data-btn');
  const importInput = document.getElementById('import-data');
  
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => {
      importInput.click();
    });
    
    importInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = parseCSVData(e.target.result);
            applyImportedData(importedData);
            utils.showToast('Data imported successfully!', 'success');
            
            // Refresh displays
            if (window.waterTracker) window.waterTracker.updateDisplay();
            if (window.proteinTracker) window.proteinTracker.updateDisplay();
            if (window.workoutTracker) window.workoutTracker.updateDisplay();
            if (window.habitsTracker) window.habitsTracker.renderHabits();
            
          } catch (error) {
            console.error('Import error:', error);
            utils.showToast('Error importing data. Please check file format.', 'error');
          }
        };
        reader.readAsText(file);
      }
      
      // Reset input
      event.target.value = '';
    });
  }
  
  // Reset all data
  const resetBtn = document.getElementById('reset-all-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('⚠️ WARNING: This will delete ALL your tracking data. This action cannot be undone.\n\nAre you sure you want to continue?')) {
        if (confirm('This is your final warning. ALL data will be permanently deleted. Continue?')) {
          // Clear all localStorage
          const keysToKeep = ['theme']; // Keep theme setting
          const allKeys = Object.keys(localStorage);
          
          allKeys.forEach(key => {
            if (!keysToKeep.includes(key)) {
              localStorage.removeItem(key);
            }
          });
          
          utils.showToast('All data has been reset', 'warning');
          
          // Refresh page to reset everything
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    });
  }
}

/**
 * Initialize inner tab functionality for history panels
 */
function initializeInnerTabs() {
  document.querySelectorAll('.tab-button').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tabId = tabBtn.dataset.tab;
      const tabsContainer = tabBtn.closest('.panel');
      
      // Update active state for buttons
      tabsContainer.querySelectorAll('.tab-button').forEach(b => {
        b.classList.remove('active');
      });
      tabBtn.classList.add('active');
      
      // Show active tab content
      tabsContainer.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Initialize history tabs
  document.getElementById('water-daily-history').classList.add('active');
  document.getElementById('protein-daily-history').classList.add('active');
  document.getElementById('workout-daily-history').classList.add('active');
}

/**
 * FIXED: Initialize panels (settings, history, more options) - Updated for reminders
 */
function initializePanels() {
  console.log('Initializing panels with reminders support...');
  
  // FIXED: Panel toggle buttons (removed notifications-settings-toggle)
  const panelToggles = {
    'water-settings-toggle': 'water-settings-section',
    'water-history-toggle': 'water-history-popup',
    'protein-settings-toggle': 'protein-settings-section',
    'protein-history-toggle': 'protein-history-popup',
    'workout-settings-toggle': 'workout-settings-section',
    'workout-history-toggle': 'workout-history-popup',
    'more-options-toggle': 'more-options-panel'
    // Note: reminders panel is handled by RemindersManager, not here
  };
  
  // Set up panel toggles
  Object.entries(panelToggles).forEach(([toggleId, panelId]) => {
    const toggleBtn = document.getElementById(toggleId);
    const panel = document.getElementById(panelId);
    
    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        console.log(`Panel toggle clicked: ${toggleId} -> ${panelId}`);
        
        // FIXED: Hide all other panels first (including reminders panel)
        document.querySelectorAll('.panel, .reminders-panel').forEach(p => {
          if (p.id !== panelId) {
            p.classList.remove('active');
          }
        });
        
        // Toggle this panel
        panel.classList.toggle('active');
      });
    } else {
      console.warn(`Panel toggle missing: ${toggleId} or ${panelId}`);
    }
  });
  
  // Close panel buttons
  document.querySelectorAll('.close-panel').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      console.log('Close panel button clicked');
      const panel = closeBtn.closest('.panel, .reminders-panel');
      if (panel) {
        panel.classList.remove('active');
      }
    });
  });
  
  // FIXED: Close panels when clicking outside - improved to handle reminders panel
  document.addEventListener('click', (event) => {
    // Check if clicked element or its ancestors are panels or toggle buttons
    const isPanel = !!event.target.closest('.panel, .reminders-panel');
    const isToggle = !!event.target.closest('[id$="-toggle"], #reminders-bell-icon');
    const isTogglePressed = Object.keys(panelToggles).some(id => 
      event.target.closest(`#${id}`) !== null
    );
    
    // FIXED: Also check for reminders bell icon specifically
    const isRemindersBell = !!event.target.closest('#reminders-bell-icon');
    
    // Only close panels if clicked outside any panel and toggle button
    if (!isPanel && !isToggle && !isTogglePressed && !isRemindersBell) {
      console.log('Clicking outside panels - closing all panels');
      document.querySelectorAll('.panel, .reminders-panel').forEach(panel => {
        panel.classList.remove('active');
      });
    }
  }, true);
  
  console.log('Panels initialization complete');
}

/**
 * Initialize tracker actions for a specific tracker
 * @param {Tracker} tracker - Tracker instance
 */
function initializeTrackerActions(tracker) {
  const type = tracker.type;
  
  // Set up quick add buttons
  document.querySelectorAll(`[data-action="${type}-add"]`).forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.dataset.amount);
      if (!isNaN(amount) && amount > 0) {
        tracker.addIntake(amount);
      }
    });
  });
  
  // Set up manual add button
  const addManualBtn = document.getElementById(`${type}-add-manual`);
  if (addManualBtn) {
    addManualBtn.addEventListener('click', () => {
      tracker.addManualIntake();
    });
  }
  
  // Set up enter key for manual input
  const manualInput = document.getElementById(`${type}-manual`);
  if (manualInput) {
    manualInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        tracker.addManualIntake();
      }
    });
  }
  
  // Set goal button
  const setGoalBtn = document.getElementById(`${type}-set-goal`);
  if (setGoalBtn) {
    setGoalBtn.addEventListener('click', () => {
      tracker.setGoal();
    });
  }
  
  // Reset daily button
  const resetDailyBtn = document.getElementById(`${type}-reset-daily`);
  if (resetDailyBtn) {
    resetDailyBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to reset today's ${type} intake data?`)) {
        tracker.resetDailyIntake();
        utils.showToast(`Today's ${type} intake has been reset.`, 'warning');
      }
    });
  }
  
  // Reset all data button
  const resetDataBtn = document.getElementById(`${type}-reset-data`);
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
      if (confirm(`⚠️ WARNING: This will delete ALL ${type} tracking data. This action cannot be undone.\n\nAre you sure you want to continue?`)) {
        if (confirm(`This is your final warning. ALL ${type} data will be permanently deleted. Continue?`)) {
          tracker.resetAllData();
          utils.showToast(`All ${type} data has been reset.`, 'warning');
        }
      }
    });
  }
}

/**
 * Initialize workout tracker actions
 * @param {WorkoutTracker} workoutTracker - Workout tracker instance
 */
function initializeWorkoutTrackerActions(workoutTracker) {
  // Workout tab clicks
  document.querySelectorAll('.workout-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const workoutType = tab.dataset.workout;
      if (workoutType) {
        workoutTracker.addWorkout(workoutType);
      }
    });
  });
  
  // Reset daily workouts
  const resetDailyBtn = document.getElementById('workout-reset-daily');
  if (resetDailyBtn) {
    resetDailyBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset today\'s workout data?')) {
        workoutTracker.resetDaily();
        utils.showToast('Today\'s workouts have been reset.', 'warning');
      }
    });
  }
  
  // Reset all workout data
  const resetDataBtn = document.getElementById('workout-reset-data');
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
      if (confirm('⚠️ WARNING: This will delete ALL workout data. This action cannot be undone.\n\nAre you sure you want to continue?')) {
        if (confirm('This is your final warning. ALL workout data will be permanently deleted. Continue?')) {
          workoutTracker.resetAllData();
          utils.showToast('All workout data has been reset.', 'warning');
        }
      }
    });
  }
  
  // Add workout type
  const addWorkoutTypeBtn = document.getElementById('add-workout-type');
  if (addWorkoutTypeBtn) {
    addWorkoutTypeBtn.addEventListener('click', () => {
      workoutTracker.addWorkoutType();
    });
  }
  
  // Enter key for workout type input
  const workoutTypeInput = document.getElementById('new-workout-type');
  if (workoutTypeInput) {
    workoutTypeInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        workoutTracker.addWorkoutType();
      }
    });
  }
}

/**
 * Convert all data to CSV format for export
 */
function convertDataToCSV() {
  const rows = [];
  
  // Helper function to add rows
  const addRow = (category, key, value) => {
    if (value !== null && value !== undefined) {
      rows.push(`"${category}","${key}","${value}"`);
    }
  };
  
  // Add headers
  rows.push('"Category","Key","Value"');
  
  // Process water data
  const waterGoal = localStorage.getItem('water_goal');
  const waterIntake = localStorage.getItem('water_intake');
  const waterHistory = localStorage.getItem('water_history');
  
  if (waterGoal) addRow("water", "goal", waterGoal);
  if (waterIntake) addRow("water", "intake", waterIntake);
  if (waterHistory) addRow("water", "history", waterHistory);
  
  // Process protein data
  const proteinGoal = localStorage.getItem('protein_goal');
  const proteinIntake = localStorage.getItem('protein_intake');
  const proteinHistory = localStorage.getItem('protein_history');
  
  if (proteinGoal) addRow("protein", "goal", proteinGoal);
  if (proteinIntake) addRow("protein", "intake", proteinIntake);
  if (proteinHistory) addRow("protein", "history", proteinHistory);
  
  // Process workout data
  const workoutTypes = localStorage.getItem('workout_types');
  const workoutState = localStorage.getItem('workout_state');
  const workoutCount = localStorage.getItem('workout_count');
  const workoutHistory = localStorage.getItem('workout_history');
  
  if (workoutTypes) addRow("workout", "types", workoutTypes);
  if (workoutState) addRow("workout", "state", workoutState);
  if (workoutCount) addRow("workout", "count", workoutCount);
  if (workoutHistory) addRow("workout", "history", workoutHistory);
  
  // Process habits data
  const habitsData = localStorage.getItem('habits_data');
  if (habitsData) {
    addRow("habits", "data", habitsData);
  }
  
  // FIXED: Process reminders data
  const remindersData = localStorage.getItem('reminders_data');
  if (remindersData) {
    addRow("reminders", "data", remindersData);
  }
  
  // Process settings
  const theme = localStorage.getItem('theme');
  const reminder = localStorage.getItem('reminder');
  
  if (theme) addRow("settings", "theme", theme);
  if (reminder) addRow("settings", "reminder", reminder);
  
  return rows.join('\n');
}

/**
 * Parse CSV data for import
 */
function parseCSVData(csvText) {
  const lines = csvText.split('\n');
  const importedData = {
    water: {},
    protein: {},
    workout: {},
    habits: {},
    reminders: {},
    settings: {}
  };
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle quoted values)
    const matches = line.match(/^"([^"]*?)","([^"]*?)","(.*)"$/);
    if (!matches) continue;
    
    const [, category, key, value] = matches;
    
    switch (category) {
      case 'water':
        if (key === 'goal') importedData.water.goal = value;
        if (key === 'intake') importedData.water.intake = value;
        if (key === 'history') importedData.water.history = value;
        break;
        
      case 'protein':
        if (key === 'goal') importedData.protein.goal = value;
        if (key === 'intake') importedData.protein.intake = value;
        if (key === 'history') importedData.protein.history = value;
        break;
        
      case 'workout':
        if (key === 'types') importedData.workout.types = value;
        if (key === 'state') importedData.workout.state = value;
        if (key === 'count') importedData.workout.count = value;
        if (key === 'history') importedData.workout.history = value;
        break;
        
      case 'habits':
        if (key === 'data') importedData.habits.data = value;
        break;
        
      case 'reminders':
        if (key === 'data') importedData.reminders.data = value;
        break;
        
      case 'settings':
        if (key === 'theme') importedData.settings.theme = value;
        if (key === 'reminder') importedData.settings.reminder = value;
        break;
    }
  }
  
  return importedData;
}

/**
 * Apply imported data to localStorage
 */
function applyImportedData(data) {
  try {
    // Apply water data
    if (data.water) {
      if (data.water.goal) localStorage.setItem('water_goal', data.water.goal);
      if (data.water.intake) localStorage.setItem('water_intake', data.water.intake);
      if (data.water.history) localStorage.setItem('water_history', data.water.history);
    }
    
    // Apply protein data
    if (data.protein) {
      if (data.protein.goal) localStorage.setItem('protein_goal', data.protein.goal);
      if (data.protein.intake) localStorage.setItem('protein_intake', data.protein.intake);
      if (data.protein.history) localStorage.setItem('protein_history', data.protein.history);
    }
    
    // Apply workout data
    if (data.workout) {
      if (data.workout.types) localStorage.setItem('workout_types', data.workout.types);
      if (data.workout.state) localStorage.setItem('workout_state', data.workout.state);
      if (data.workout.count) localStorage.setItem('workout_count', data.workout.count);
      if (data.workout.history) localStorage.setItem('workout_history', data.workout.history);
    }
    
    // Apply habits data
    if (data.habits && data.habits.data) {
      localStorage.setItem('habits_data', data.habits.data);
    }
    
    // FIXED: Apply reminders data
    if (data.reminders && data.reminders.data) {
      console.log('Applying reminders data:', data.reminders.data);
      localStorage.setItem('reminders_data', data.reminders.data);
      
      // Reload reminders manager data if it exists
      if (window.remindersManager && typeof window.remindersManager.loadData === 'function') {
        try {
          window.remindersManager.loadData();
          window.remindersManager.scheduleAllReminders();
          console.log('Reminders data reloaded');
        } catch (error) {
          console.error('Error reloading reminders data:', error);
        }
      }
    }
    
    // Apply settings
    if (data.settings) {
      if (data.settings.theme) localStorage.setItem('theme', data.settings.theme);
      if (data.settings.reminder) localStorage.setItem('reminder', data.settings.reminder);
    }
    
    console.log('Data import completed successfully');
  } catch (error) {
    console.error('Error applying imported data:', error);
    throw error;
  }
}

/**
 * Download CSV file
 */
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
