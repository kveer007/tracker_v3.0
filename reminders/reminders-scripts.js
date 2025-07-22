/**
 * Health Tracker App - Reminders Management System
 * 
 * Handles all reminder functionality including:
 * - System notifications (water/protein alerts, intervals)
 * - Custom reminders with repeat patterns
 * - iOS-like interface with multi-view navigation
 * - Advanced scheduling and notification management
 */

class RemindersManager {
  constructor() {
    // Configuration
    this.remindersKey = 'reminders_data';
    this.currentView = 'main'; // 'main', 'system', 'add-custom', 'edit-custom'
    this.editingReminderId = null;
    this.activeTimers = new Map();
    this.intervalTimers = new Map();
    
    // Legacy notification keys for migration
    this.legacyNotificationKeys = {
      global: 'notifications_enabled',
      waterAlert: 'notification_water',
      waterInterval: 'notification_water_interval_enabled',
      proteinAlert: 'notification_protein'
    };
    
    // Default data structure
    this.defaultData = {
      globalEnabled: false,
      systemNotifications: {
        waterAlert: {
          enabled: false,
          time: "20:00",
          days: [1, 2, 3, 4, 5, 6, 0],
          onlyIfGoalNotMet: true,
          message: "Don't forget your daily water goal!"
        },
        waterInterval: {
          enabled: false,
          interval: 120, // minutes
          activeWindow: { start: "08:00", end: "22:00" },
          days: [1, 2, 3, 4, 5, 6, 0],
          onlyIfBelowGoal: true,
          message: "Time to drink water!"
        },
        proteinAlert: {
          enabled: false,
          time: "20:00",
          days: [1, 2, 3, 4, 5, 6, 0],
          onlyIfGoalNotMet: true,
          message: "Check your protein intake for today"
        }
      },
      customReminders: []
    };
    
    // Initialize
    this.loadData();
    this.initializeElements();
    this.initializeEventListeners();
    this.migrateFromLegacyNotifications();
    this.scheduleAllReminders();
    
    console.log('RemindersManager initialized successfully');
  }
  
  /**
   * Load reminders data from localStorage
   */
  loadData() {
    try {
      const stored = localStorage.getItem(this.remindersKey);
      if (stored) {
        this.data = { ...this.defaultData, ...JSON.parse(stored) };
        // Ensure all system notifications exist
        this.data.systemNotifications = { 
          ...this.defaultData.systemNotifications, 
          ...this.data.systemNotifications 
        };
      } else {
        this.data = { ...this.defaultData };
      }
    } catch (error) {
      console.error('Error loading reminders data:', error);
      this.data = { ...this.defaultData };
    }
  }
  
  /**
   * Save reminders data to localStorage
   */
  saveData() {
    try {
      localStorage.setItem(this.remindersKey, JSON.stringify(this.data));
    } catch (error) {
      console.error('Error saving reminders data:', error);
      utils.showToast('Error saving reminders data', 'error');
    }
  }
  
  /**
   * Initialize DOM elements
   */
  initializeElements() {
    // Find or create bell icon
    this.elements = {};
    this.elements.bellIcon = document.getElementById('reminders-bell-icon');
    
    // Find or create reminders panel
    this.elements.remindersPanel = document.getElementById('reminders-panel');
    
    // Find global toggle
    this.elements.globalToggle = document.getElementById('global-reminders-toggle');
  }
  
  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Bell icon click
    if (this.elements.bellIcon) {
      this.elements.bellIcon.addEventListener('click', () => {
        console.log('Bell icon clicked');
        this.togglePanel();
      });
    }
  }
  
  /**
   * Render the entire reminders panel based on current view
   */
  renderPanel() {
    if (!this.elements.remindersPanel) {
      console.error('Reminders panel not found');
      return;
    }
    
    console.log('Rendering panel, current view:', this.currentView);
    
    switch (this.currentView) {
      case 'main':
        this.renderMainView();
        break;
      case 'system':
        this.renderSystemRemindersView();
        break;
      case 'add-custom':
        this.renderCustomReminderModal(false);
        break;
      case 'edit-custom':
        this.renderCustomReminderModal(true);
        break;
      default:
        this.renderMainView();
    }
    
    // CRITICAL FIX: Ensure event listeners are attached after DOM update
    setTimeout(() => {
      this.attachPanelEventListeners();
    }, 10);
  }
  
  /**
   * Render main reminders view (iOS-like)
   */
  renderMainView() {
    const html = `
      <div class="panel-header">
        <h3>🔔 Reminders</h3>
        <button class="close-panel icon-btn" aria-label="Close">
          <i class="material-icons-round">close</i>
        </button>
      </div>
      
      <!-- Global Toggle Section -->
      <div class="global-reminders-section">
        <div class="global-reminders-header">
          <div class="global-reminders-title">
            <i class="material-icons-round">notifications</i>
            Enable Reminders
          </div>
          <label class="reminder-toggle-switch">
            <input type="checkbox" id="global-reminders-toggle" ${this.data.globalEnabled ? 'checked' : ''}>
            <span class="reminder-toggle-slider"></span>
          </label>
        </div>
        <p class="global-reminders-description">
          Allow the app to send you reminders and notifications
        </p>
      </div>
      
      <!-- System Reminders Button -->
      <div class="reminders-category">
        <button class="system-reminders-btn" id="system-reminders-btn">
          <div class="system-reminders-info">
            <i class="material-icons-round">settings</i>
            <div class="system-reminders-text">
              <span class="system-reminders-title">System Reminders</span>
              <span class="system-reminders-count">${this.getActiveSystemRemindersCount()} active</span>
            </div>
          </div>
          <i class="material-icons-round">chevron_right</i>
        </button>
      </div>
      
      <!-- Custom Reminders Section -->
      <div class="reminders-category">
        <div class="reminders-category-header">
          <h4>Custom Reminders</h4>
          <span class="reminders-count">${this.data.customReminders.length}</span>
        </div>
        
        ${this.renderCustomRemindersList()}
        
        <button class="add-reminder-btn" id="add-custom-reminder">
          <i class="material-icons-round">add</i>
          Add Reminder
        </button>
      </div>
    `;
    
    this.elements.remindersPanel.innerHTML = html;
  }
  
  /**
   * Attach event listeners to panel elements
   */
  attachPanelEventListeners() {
    console.log('Attaching panel event listeners for view:', this.currentView);
    
    // Close panel button
    const closeBtn = this.elements.remindersPanel.querySelector('.close-panel');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('Close button clicked');
        this.closePanel();
      });
    }
    
    // Back button
    const backBtn = document.getElementById('back-to-main');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        console.log('Back button clicked');
        this.backToMain();
      });
    }
    
    // Global toggle (re-attach after re-render)
    this.elements.globalToggle = document.getElementById('global-reminders-toggle');
    if (this.elements.globalToggle) {
      this.elements.globalToggle.addEventListener('change', (e) => {
        console.log('Global toggle changed:', e.target.checked);
        if (e.target.checked) {
          this.requestNotificationPermission();
        } else {
          this.data.globalEnabled = false;
          this.saveData();
          this.clearAllTimers();
          utils.showToast('All reminders disabled', 'info');
        }
      });
    }
    
    // System reminders button
    const systemBtn = document.getElementById('system-reminders-btn');
    if (systemBtn) {
      systemBtn.addEventListener('click', () => {
        console.log('System reminders button clicked');
        this.showSystemReminders();
      });
    } else {
      console.warn('System reminders button not found');
    }
    
    // Add custom reminder button
    const addBtn = document.getElementById('add-custom-reminder');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        console.log('Add custom reminder button clicked');
        this.showAddCustomReminderModal();
      });
    } else {
      console.warn('Add custom reminder button not found');
    }
    
    // Save reminder button
    const saveBtn = document.getElementById('save-reminder');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        console.log('Save reminder button clicked');
        this.saveCustomReminder();
      });
    }
    
    // Delete reminder button
    const deleteBtn = document.getElementById('delete-reminder');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        console.log('Delete reminder button clicked');
        this.deleteCustomReminder();
      });
    }
    
    // Form interactions
    this.attachFormEventListeners();
    
    // System notification toggles (using event delegation)
    this.attachSystemNotificationListeners();
  }
  
  /**
   * Attach system notification listeners using event delegation
   */
  attachSystemNotificationListeners() {
    // Use event delegation for system notification toggles
    this.elements.remindersPanel.addEventListener('change', (e) => {
      if (e.target.matches('.system-notification-toggle')) {
        const type = e.target.dataset.type;
        console.log('System notification toggle:', type, e.target.checked);
        this.toggleSystemNotification(type, e.target.checked);
      }
    });
    
    // Use event delegation for day toggles
    this.elements.remindersPanel.addEventListener('click', (e) => {
      if (e.target.matches('.day-toggle')) {
        const type = e.target.dataset.notificationType;
        const day = parseInt(e.target.dataset.day);
        console.log('Day toggle clicked:', type, day);
        this.toggleSystemNotificationDay(type, day);
      }
    });
  }
  
  /**
   * Open reminders panel
   */
  openPanel() {
    if (!this.elements.remindersPanel) {
      console.error('Cannot open panel - reminders panel not found');
      return;
    }
    
    console.log('Opening reminders panel');
    
    // Close any other open panels
    document.querySelectorAll('.panel').forEach(panel => {
      if (panel !== this.elements.remindersPanel) {
        panel.classList.remove('active');
      }
    });
    
    this.currentView = 'main';
    this.elements.remindersPanel.classList.add('active');
    this.renderPanel();
  }
  
  /**
   * Close reminders panel
   */
  closePanel() {
    console.log('Closing reminders panel');
    if (this.elements.remindersPanel) {
      this.elements.remindersPanel.classList.remove('active');
    }
    this.currentView = 'main';
    this.editingReminderId = null;
  }
  
  /**
   * Toggle reminders panel
   */
  togglePanel() {
    if (!this.elements.remindersPanel) {
      console.error('Reminders panel not found');
      return;
    }
    
    const isActive = this.elements.remindersPanel.classList.contains('active');
    console.log('Toggle panel - currently active:', isActive);
    
    if (isActive) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }
  
  /**
   * Show system reminders panel
   */
  showSystemReminders() {
    console.log('Showing system reminders');
    this.currentView = 'system';
    this.renderPanel();
  }
  
  /**
   * Show add custom reminder modal
   */
  showAddCustomReminderModal() {
    console.log('Showing add custom reminder modal');
    this.currentView = 'add-custom';
    this.editingReminderId = null;
    this.renderPanel();
    
    // Focus title input
    setTimeout(() => {
      const titleInput = document.getElementById('reminder-title');
      if (titleInput) titleInput.focus();
    }, 100);
  }
  
  /**
   * Edit custom reminder
   */
  editCustomReminder(id) {
    console.log('Editing custom reminder:', id);
    this.currentView = 'edit-custom';
    this.editingReminderId = id;
    this.renderPanel();
    
    // Focus title input
    setTimeout(() => {
      const titleInput = document.getElementById('reminder-title');
      if (titleInput) titleInput.focus();
    }, 100);
  }
  
  /**
   * Back to main view
   */
  backToMain() {
    console.log('Going back to main view');
    this.currentView = 'main';
    this.editingReminderId = null;
    this.renderPanel();
  }
  
  /**
   * Get active system reminders count
   */
  getActiveSystemRemindersCount() {
    return Object.values(this.data.systemNotifications).filter(notif => notif.enabled).length;
  }
  
  /**
   * Render custom reminders list
   */
  renderCustomRemindersList() {
    if (this.data.customReminders.length === 0) {
      return `
        <div class="empty-reminders">
          <div class="empty-reminders-icon">
            <i class="material-icons-round">alarm_off</i>
          </div>
          <p>No custom reminders yet</p>
        </div>
      `;
    }
    
    return this.data.customReminders.map(reminder => 
      this.renderCustomReminderItem(reminder)
    ).join('');
  }
  
  /**
   * Render custom reminder item
   */
  renderCustomReminderItem(reminder) {
    const scheduleText = this.getCustomReminderScheduleText(reminder);
    const nextAlert = this.getNextAlertText(reminder);
    
    return `
      <div class="custom-reminder-item ${reminder.enabled ? 'enabled' : 'disabled'}">
        <div class="custom-reminder-main" onclick="window.remindersManager.editCustomReminder('${reminder.id}')">
          <div class="custom-reminder-info">
            <h4 class="reminder-title">${reminder.title}</h4>
            <p class="reminder-schedule">${scheduleText}</p>
            ${nextAlert ? `<p class="reminder-next">${nextAlert}</p>` : ''}
            ${reminder.notes ? `<p class="reminder-notes">${reminder.notes}</p>` : ''}
          </div>
          <i class="material-icons-round">chevron_right</i>
        </div>
        <div class="custom-reminder-controls">
          <label class="reminder-toggle-switch">
            <input type="checkbox" 
                   ${reminder.enabled ? 'checked' : ''}
                   data-reminder-id="${reminder.id}"
                   class="custom-reminder-toggle"
                   onclick="event.stopPropagation(); window.remindersManager.toggleCustomReminder('${reminder.id}', this.checked)">
            <span class="reminder-toggle-slider"></span>
          </label>
        </div>
      </div>
    `;
  }
  
  /**
   * Get schedule text for custom reminder
   */
  getCustomReminderScheduleText(reminder) {
    const timeText = reminder.time;
    let repeatText = '';
    
    switch (reminder.repeat) {
      case 'none':
        repeatText = reminder.date ? `Once on ${new Date(reminder.date).toLocaleDateString()}` : 'One time';
        break;
      case 'daily':
        repeatText = 'Daily';
        break;
      case 'weekly':
        repeatText = reminder.days ? this.getDaysText(reminder.days) : 'Weekly';
        break;
      case 'monthly':
        repeatText = 'Monthly';
        break;
      case 'yearly':
        repeatText = 'Yearly';
        break;
      default:
        repeatText = 'Custom';
    }
    
    return `${repeatText} at ${timeText}`;
  }
  
  /**
   * Get next alert text
   */
  getNextAlertText(reminder) {
    const nextTrigger = this.calculateNextTrigger(reminder);
    if (!nextTrigger) return null;
    
    const now = new Date();
    const diffMs = nextTrigger.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `Next: in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `Next: in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'Next: soon';
    }
  }
  
  /**
   * Calculate next trigger time for a reminder
   */
  calculateNextTrigger(reminder) {
    const now = new Date();
    const [hours, minutes] = reminder.time.split(':').map(Number);
    
    // For one-time reminders
    if (reminder.repeat === 'none' && reminder.date) {
      const reminderDate = new Date(reminder.date);
      reminderDate.setHours(hours, minutes, 0, 0);
      return reminderDate > now ? reminderDate : null;
    }
    
    // For repeating reminders
    let nextTrigger = new Date();
    nextTrigger.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, start from tomorrow
    if (nextTrigger <= now) {
      nextTrigger.setDate(nextTrigger.getDate() + 1);
    }
    
    // Handle different repeat patterns
    switch (reminder.repeat) {
      case 'daily':
        return nextTrigger;
        
      case 'weekly':
        if (reminder.days && reminder.days.length > 0) {
          // Find next matching day
          while (!reminder.days.includes(nextTrigger.getDay())) {
            nextTrigger.setDate(nextTrigger.getDate() + 1);
          }
        }
        return nextTrigger;
        
      case 'monthly':
        // Same day next month
        if (nextTrigger.getMonth() === now.getMonth()) {
          nextTrigger.setMonth(nextTrigger.getMonth() + 1);
        }
        return nextTrigger;
        
      case 'yearly':
        // Same date next year
        if (nextTrigger.getFullYear() === now.getFullYear() && 
            (nextTrigger.getMonth() < now.getMonth() || 
             (nextTrigger.getMonth() === now.getMonth() && nextTrigger.getDate() <= now.getDate()))) {
          nextTrigger.setFullYear(nextTrigger.getFullYear() + 1);
        }
        return nextTrigger;
        
      default:
        return nextTrigger;
    }
  }
  
  /**
   * Get days text for weekly reminders
   */
  getDaysText(days) {
    if (!days || days.length === 0) return 'Weekly';
    if (days.length === 7) return 'Daily';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => dayNames[day]).join(', ');
  }
  
  /**
   * Render system reminders sub-view
   */
  renderSystemRemindersView() {
    const html = `
      <div class="panel-header">
        <button class="back-btn icon-btn" id="back-to-main">
          <i class="material-icons-round">arrow_back</i>
        </button>
        <h3>System Reminders</h3>
        <div></div>
      </div>
      
      ${this.renderSystemNotifications()}
    `;
    
    this.elements.remindersPanel.innerHTML = html;
  }
  
  /**
   * Render system notifications
   */
  renderSystemNotifications() {
    return Object.entries(this.data.systemNotifications).map(([type, notification]) => {
      const title = this.getSystemNotificationTitle(type);
      const description = this.getSystemNotificationDescription(type);
      
      return `
        <div class="system-notification-card ${notification.enabled ? 'enabled' : ''}">
          <div class="system-notification-header">
            <div class="system-notification-info">
              <h4>${title}</h4>
              <p>${description}</p>
            </div>
            <label class="reminder-toggle-switch">
              <input type="checkbox" 
                     class="system-notification-toggle"
                     data-type="${type}"
                     ${notification.enabled ? 'checked' : ''}>
              <span class="reminder-toggle-slider"></span>
            </label>
          </div>
          
          ${notification.enabled ? this.renderSystemNotificationSettings(type, notification) : ''}
        </div>
      `;
    }).join('');
  }
  
  /**
   * Get system notification title
   */
  getSystemNotificationTitle(type) {
    switch (type) {
      case 'waterAlert': return 'Water Goal Alert';
      case 'waterInterval': return 'Water Reminders';
      case 'proteinAlert': return 'Protein Goal Alert';
      default: return 'System Alert';
    }
  }
  
  /**
   * Get system notification description
   */
  getSystemNotificationDescription(type) {
    switch (type) {
      case 'waterAlert': return 'Daily reminder to check your water intake';
      case 'waterInterval': return 'Regular reminders to drink water';
      case 'proteinAlert': return 'Daily reminder to check your protein intake';
      default: return 'System notification';
    }
  }
  
  /**
   * Render system notification settings
   */
  renderSystemNotificationSettings(type, notification) {
    let settingsHtml = `
      <div class="system-notification-settings">
        <div class="setting-row">
          <label>Time</label>
          <input type="time" 
                 value="${notification.time || '20:00'}"
                 data-type="${type}"
                 data-setting="time"
                 class="system-setting-input">
        </div>
    `;
    
    // Add interval setting for water interval
    if (type === 'waterInterval' && notification.interval) {
      settingsHtml += `
        <div class="setting-row">
          <label>Interval</label>
          <select data-type="${type}" data-setting="interval" class="system-setting-input">
            <option value="60" ${notification.interval === 60 ? 'selected' : ''}>1 hour</option>
            <option value="120" ${notification.interval === 120 ? 'selected' : ''}>2 hours</option>
            <option value="180" ${notification.interval === 180 ? 'selected' : ''}>3 hours</option>
            <option value="240" ${notification.interval === 240 ? 'selected' : ''}>4 hours</option>
          </select>
        </div>
      `;
    }
    
    // Add days selector
    settingsHtml += `
        <div class="setting-row">
          <label>Days</label>
          ${this.renderDaysSelector(type, notification.days || [1,2,3,4,5,6,0])}
        </div>
      </div>
    `;
    
    return settingsHtml;
  }
  
  /**
   * Render days selector
   */
  renderDaysSelector(type, selectedDays = []) {
    const days = [
      { value: 1, label: 'Mon' },
      { value: 2, label: 'Tue' },
      { value: 3, label: 'Wed' },
      { value: 4, label: 'Thu' },
      { value: 5, label: 'Fri' },
      { value: 6, label: 'Sat' },
      { value: 0, label: 'Sun' }
    ];
    
    return `
      <div class="days-selector">
        ${days.map(day => `
          <button class="day-toggle ${selectedDays.includes(day.value) ? 'active' : ''}" 
                  type="button"
                  data-day="${day.value}"
                  data-notification-type="${type}">
            ${day.label}
          </button>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Toggle system notification
   */
  toggleSystemNotification(type, enabled) {
    console.log('Toggling system notification:', type, enabled);
    
    if (!this.data.systemNotifications[type]) {
      console.error('Unknown notification type:', type);
      return;
    }
    
    this.data.systemNotifications[type].enabled = enabled;
    this.saveData();
    this.scheduleAllReminders();
    
    // Re-render to show/hide settings
    this.renderPanel();
    
    const title = this.getSystemNotificationTitle(type);
    utils.showToast(`${title} ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'success' : 'info');
  }
  
  /**
   * Toggle system notification day
   */
  toggleSystemNotificationDay(type, day) {
    console.log('Toggling day for notification:', type, day);
    
    if (!this.data.systemNotifications[type]) {
      console.error('Unknown notification type:', type);
      return;
    }
    
    const days = this.data.systemNotifications[type].days || [];
    const dayIndex = days.indexOf(day);
    
    if (dayIndex === -1) {
      days.push(day);
    } else {
      days.splice(dayIndex, 1);
    }
    
    this.data.systemNotifications[type].days = days;
    this.saveData();
    this.scheduleAllReminders();
    
    // Update button appearance
    const button = document.querySelector(`[data-notification-type="${type}"][data-day="${day}"]`);
    if (button) {
      button.classList.toggle('active', days.includes(day));
    }
  }
  
  /**
   * Toggle custom reminder enabled state
   */
  toggleCustomReminder(id, enabled) {
    console.log('Toggling custom reminder:', id, enabled);
    
    const reminder = this.data.customReminders.find(r => r.id === id);
    if (reminder) {
      reminder.enabled = enabled;
      this.saveData();
      
      if (enabled && this.data.globalEnabled) {
        this.scheduleCustomReminder(reminder);
        utils.showToast(`Reminder "${reminder.title}" enabled`, 'success');
      } else {
        this.clearCustomReminderTimer(id);
        utils.showToast(`Reminder "${reminder.title}" disabled`, 'info');
      }
      
      // Update the display
      if (this.currentView === 'main') {
        this.renderPanel();
      }
    }
  }
  
  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      utils.showToast('Your browser does not support notifications', 'error');
      this.elements.globalToggle.checked = false;
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        this.data.globalEnabled = true;
        this.saveData();
        this.scheduleAllReminders();
        utils.showToast('Reminders enabled successfully!', 'success');
        
        // Send test notification
        setTimeout(() => {
          this.sendNotification('Reminders Active', 'Your reminders are now working!');
        }, 500);
      } else {
        this.data.globalEnabled = false;
        this.elements.globalToggle.checked = false;
        utils.showToast('Notification permission denied', 'warning');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      this.elements.globalToggle.checked = false;
      utils.showToast('Error enabling notifications', 'error');
    }
  }
  
  /**
   * Send notification
   */
  sendNotification(title, message, icon = 'icons/icon-192.png') {
    if (!this.data.globalEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    
    try {
      const notification = new Notification(title, {
        body: message,
        icon: icon,
        badge: icon,
        tag: 'health-tracker',
        requireInteraction: false
      });
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
      
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  
  /**
   * Clear all active timers
   */
  clearAllTimers() {
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.intervalTimers.forEach(timer => clearInterval(timer));
    this.activeTimers.clear();
    this.intervalTimers.clear();
  }
  
  /**
   * Clear custom reminder timer
   */
  clearCustomReminderTimer(id) {
    const keysToRemove = [];
    this.activeTimers.forEach((timer, timerId) => {
      if (timerId.startsWith(`custom_${id}_`)) {
        clearTimeout(timer);
        keysToRemove.push(timerId);
      }
    });
    keysToRemove.forEach(k => this.activeTimers.delete(k));
  }
  
  /**
   * Schedule all reminders
   */
  scheduleAllReminders() {
    if (!this.data.globalEnabled) return;
    
    this.clearAllTimers();
    
    // Schedule system notifications
    Object.keys(this.data.systemNotifications).forEach(key => {
      if (this.data.systemNotifications[key].enabled) {
        this.scheduleSystemNotification(key);
      }
    });
    
    // Schedule custom reminders
    this.data.customReminders.forEach(reminder => {
      if (reminder.enabled) {
        this.scheduleCustomReminder(reminder);
      }
    });
  }
  
  /**
   * Schedule system notification
   */
  scheduleSystemNotification(type) {
    const notification = this.data.systemNotifications[type];
    if (!notification || !notification.enabled) return;
    
    console.log('Scheduling system notification:', type);
    
    if (type === 'waterInterval') {
      this.scheduleWaterInterval();
    } else {
      this.scheduleTimeBasedNotification(type, {
        time: notification.time,
        days: notification.days,
        callback: () => this.triggerGoalCheckAlert(type)
      });
    }
  }
  
  /**
   * Schedule water interval notifications
   */
  scheduleWaterInterval() {
    const config = this.data.systemNotifications.waterInterval;
    if (!config.enabled) return;
    
    const intervalMs = config.interval * 60 * 1000; // Convert minutes to milliseconds
    const startTime = this.timeStringToMinutes(config.activeWindow.start);
    const endTime = this.timeStringToMinutes(config.activeWindow.end);
    
    const checkAndSchedule = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      // Check if we're in an active day and time window
      if (config.days.includes(currentDay) && currentTime >= startTime && currentTime <= endTime) {
        this.triggerWaterIntervalReminder();
      }
    };
    
    // Start the interval
    const timer = setInterval(checkAndSchedule, intervalMs);
    this.intervalTimers.set('waterInterval', timer);
  }
  
  /**
   * Schedule time-based notification with daily repetition
   */
  scheduleTimeBasedNotification(timerId, config) {
    const scheduleNext = () => {
      const now = new Date();
      const [hours, minutes] = config.time.split(':').map(Number);
      
      // Find next occurrence
      let nextTrigger = new Date();
      nextTrigger.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (nextTrigger <= now) {
        nextTrigger.setDate(nextTrigger.getDate() + 1);
      }
      
      // Find next day that matches our schedule
      while (!config.days.includes(nextTrigger.getDay())) {
        nextTrigger.setDate(nextTrigger.getDate() + 1);
      }
      
      const delay = nextTrigger.getTime() - now.getTime();
      
      const timer = setTimeout(() => {
        config.callback();
        scheduleNext(); // Schedule next occurrence
      }, delay);
      
      this.activeTimers.set(timerId, timer);
    };
    
    scheduleNext();
  }
  
  /**
   * Convert time string to minutes since midnight
   */
  timeStringToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Trigger goal check alert
   */
  triggerGoalCheckAlert(type) {
    if (type === 'waterAlert') {
      this.checkWaterGoalAndAlert();
    } else if (type === 'proteinAlert') {
      this.checkProteinGoalAndAlert();
    }
  }
  
  /**
   * Check water goal and send alert if needed
   */
  checkWaterGoalAndAlert() {
    if (window.waterTracker) {
      const goalMet = window.waterTracker.totalIntake >= window.waterTracker.goal;
      
      if (!goalMet && window.waterTracker.goal > 0) {
        const remaining = window.waterTracker.goal - window.waterTracker.totalIntake;
        const config = this.data.systemNotifications.waterAlert;
        const message = config.message || 
          `You're ${remaining}ml short of your daily water goal. Time to hydrate!`;
        this.sendNotification('Water Intake Alert', message);
      }
    }
  }
  
  /**
   * Check protein goal and send alert if needed
   */
  checkProteinGoalAndAlert() {
    if (window.proteinTracker) {
      const goalMet = window.proteinTracker.totalIntake >= window.proteinTracker.goal;
      
      if (!goalMet && window.proteinTracker.goal > 0) {
        const remaining = window.proteinTracker.goal - window.proteinTracker.totalIntake;
        const config = this.data.systemNotifications.proteinAlert;
        const message = config.message || 
          `You're ${remaining}g short of your daily protein goal. Time to fuel up!`;
        this.sendNotification('Protein Intake Alert', message);
      }
    }
  }
  
  /**
   * Trigger water interval reminder
   */
  triggerWaterIntervalReminder() {
    const config = this.data.systemNotifications.waterInterval;
    this.sendNotification(
      'Water Reminder',
      config.message || 'Time to drink some water! Stay hydrated.'
    );
  }
  
  /**
   * Schedule custom reminder
   */
  scheduleCustomReminder(reminder) {
    const nextTrigger = this.calculateNextTrigger(reminder);
    if (!nextTrigger) return;
    
    console.log('Scheduling custom reminder:', reminder.title, 'for', nextTrigger);
    
    // Schedule all alerts for this reminder
    reminder.alerts.forEach(alertMinutes => {
      const alertTime = new Date(nextTrigger.getTime() - (alertMinutes * 60 * 1000));
      const now = new Date();
      
      if (alertTime > now) {
        const delay = alertTime.getTime() - now.getTime();
        const timerId = `custom_${reminder.id}_${alertMinutes}`;
        
        const timer = setTimeout(() => {
          this.triggerCustomReminder(reminder, alertMinutes);
          // Schedule next occurrence
          this.scheduleCustomReminder(reminder);
        }, delay);
        
        this.activeTimers.set(timerId, timer);
      }
    });
  }
  
  /**
   * Trigger custom reminder
   */
  triggerCustomReminder(reminder, alertMinutes) {
    let title = reminder.title;
    let message = reminder.notes || reminder.title;
    
    if (alertMinutes > 0) {
      const timeText = alertMinutes >= 60 ? 
        `${Math.floor(alertMinutes / 60)} hour${Math.floor(alertMinutes / 60) > 1 ? 's' : ''}` :
        `${alertMinutes} minute${alertMinutes > 1 ? 's' : ''}`;
      message = `Reminder in ${timeText}: ${message}`;
    }
    
    this.sendNotification(title, message);
  }
  
  /**
   * Migrate from legacy notifications
   */
  migrateFromLegacyNotifications() {
    let migrated = false;
    
    // Check each legacy key and migrate if found
    Object.entries(this.legacyNotificationKeys).forEach(([newKey, legacyKey]) => {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        migrated = true;
        
        switch (newKey) {
          case 'global':
            this.data.globalEnabled = legacyValue === 'true';
            break;
            
          case 'waterAlert':
          case 'proteinAlert':
            if (this.data.systemNotifications[newKey]) {
              this.data.systemNotifications[newKey].enabled = legacyValue === 'true';
            }
            break;
            
          case 'waterInterval':
            if (this.data.systemNotifications[newKey]) {
              this.data.systemNotifications[newKey].enabled = legacyValue === 'true';
            }
            
            // Also migrate interval setting
            const interval = localStorage.getItem('notification_water_interval');
            if (interval && !isNaN(parseInt(interval))) {
              this.data.systemNotifications.waterInterval.interval = parseInt(interval);
            }
            break;
        }
      }
    });
    
    // Check if global notifications were enabled
    if ('Notification' in window && Notification.permission === 'granted') {
      this.data.globalEnabled = true;
      migrated = true;
    }
    
    // Save migrated data and clean up legacy keys
    if (migrated) {
      this.saveData();
      // Remove legacy keys
      Object.values(this.legacyNotificationKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('Migrated legacy notification settings to reminders system');
    }
  }
  
  /**
   * Attach form event listeners
   */
  attachFormEventListeners() {
    // Repeat dropdown change
    const repeatSelect = document.getElementById('reminder-repeat');
    if (repeatSelect) {
      repeatSelect.addEventListener('change', (e) => {
        const weeklyDaysGroup = document.getElementById('weekly-days-group');
        if (weeklyDaysGroup) {
          weeklyDaysGroup.style.display = e.target.value === 'weekly' ? 'block' : 'none';
        }
      });
    }
    
    // Day toggle buttons
    document.querySelectorAll('.day-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
      });
    });
    
    // Add alert button
    const addAlertBtn = document.getElementById('add-alert-btn');
    if (addAlertBtn) {
      addAlertBtn.addEventListener('click', () => {
        this.addAlertTime();
      });
    }
    
    // Remove alert buttons
    document.querySelectorAll('.remove-alert-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.removeAlertTime(index);
      });
    });
  }
  
  /**
   * Add alert time
   */
  addAlertTime() {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    
    const alertCount = container.querySelectorAll('.alert-item').length;
    if (alertCount >= 5) {
      utils.showToast('Maximum 5 alerts allowed per reminder', 'warning');
      return;
    }
    
    const newAlert = document.createElement('div');
    newAlert.className = 'alert-item';
    newAlert.dataset.index = alertCount;
    newAlert.innerHTML = `
      <select class="alert-select" data-index="${alertCount}">
        <option value="0">At time of reminder</option>
        <option value="5">5 minutes before</option>
        <option value="15">15 minutes before</option>
        <option value="30">30 minutes before</option>
        <option value="60">1 hour before</option>
        <option value="120">2 hours before</option>
        <option value="1440">1 day before</option>
      </select>
      <button type="button" class="remove-alert-btn" data-index="${alertCount}">
        <i class="material-icons-round">close</i>
      </button>
    `;
    
    container.appendChild(newAlert);
    
    // Attach event listener to remove button
    newAlert.querySelector('.remove-alert-btn').addEventListener('click', (e) => {
      this.removeAlertTime(parseInt(e.target.dataset.index));
    });
  }
  
  /**
   * Remove alert time
   */
  removeAlertTime(index) {
    const alertItem = document.querySelector(`[data-index="${index}"]`);
    if (alertItem) {
      alertItem.remove();
      
      // Reindex remaining alerts
      document.querySelectorAll('.alert-item').forEach((item, i) => {
        item.dataset.index = i;
        item.querySelector('.alert-select').dataset.index = i;
        const removeBtn = item.querySelector('.remove-alert-btn');
        if (removeBtn) {
          removeBtn.dataset.index = i;
        }
      });
    }
  }
  
  /**
   * Save custom reminder (add or update)
   */
  saveCustomReminder() {
    const title = document.getElementById('reminder-title')?.value?.trim();
    const date = document.getElementById('reminder-date')?.value;
    const time = document.getElementById('reminder-time')?.value;
    const repeat = document.getElementById('reminder-repeat')?.value;
    const notes = document.getElementById('reminder-notes')?.value?.trim();
    
    if (!title) {
      utils.showToast('Please enter a reminder title', 'error');
      return;
    }
    
    if (!time) {
      utils.showToast('Please set a time', 'error');
      return;
    }
    
    // Get selected days for weekly repeat
    let days = [];
    if (repeat === 'weekly') {
      const dayCheckboxes = document.querySelectorAll('.day-toggle.active');
      days = Array.from(dayCheckboxes).map(cb => parseInt(cb.dataset.day));
      if (days.length === 0) {
        utils.showToast('Please select at least one day for weekly reminders', 'error');
        return;
      }
    }
    
    // Get alert times
    const alerts = [];
    document.querySelectorAll('.alert-select').forEach(select => {
      alerts.push(parseInt(select.value));
    });
    
    // Create or update reminder
    const reminderData = {
      title,
      time,
      repeat,
      alerts,
      notes,
      enabled: true,
      days: repeat === 'weekly' ? days : [],
      date: repeat === 'none' && date ? date : null
    };
    
    if (this.currentView === 'edit-custom' && this.editingReminderId) {
      // Update existing reminder
      const index = this.data.customReminders.findIndex(r => r.id === this.editingReminderId);
      if (index !== -1) {
        this.data.customReminders[index] = {
          ...this.data.customReminders[index],
          ...reminderData
        };
        utils.showToast('Reminder updated', 'success');
      }
    } else {
      // Add new reminder
      reminderData.id = this.generateUniqueId();
      this.data.customReminders.push(reminderData);
      utils.showToast('Reminder created', 'success');
    }
    
    // Save and reschedule
    this.saveData();
    this.scheduleAllReminders();
    
    // Go back to main view
    this.backToMain();
  }
  
  /**
   * Delete custom reminder
   */
  deleteCustomReminder() {
    if (!this.editingReminderId) return;
    
    if (confirm('Are you sure you want to delete this reminder?')) {
      const index = this.data.customReminders.findIndex(r => r.id === this.editingReminderId);
      if (index !== -1) {
        this.clearCustomReminderTimer(this.editingReminderId);
        this.data.customReminders.splice(index, 1);
        this.saveData();
        utils.showToast('Reminder deleted', 'warning');
        this.backToMain();
      }
    }
  }
  
  /**
   * Generate unique ID for reminders
   */
  generateUniqueId() {
    return 'reminder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Render custom reminder modal (add or edit)
   */
  renderCustomReminderModal(isEdit = false) {
    const reminder = isEdit && this.editingReminderId ? 
      this.data.customReminders.find(r => r.id === this.editingReminderId) : null;
    
    const html = `
      <div class="panel-header">
        <button class="back-btn icon-btn" id="back-to-main">
          <i class="material-icons-round">arrow_back</i>
        </button>
        <h3>${isEdit ? 'Edit' : 'New'} Reminder</h3>
        ${isEdit ? `<button class="delete-reminder-btn icon-btn" id="delete-reminder">
          <i class="material-icons-round">delete</i>
        </button>` : '<div></div>'}
      </div>
      
      <div class="custom-reminder-form">
        <!-- Title -->
        <div class="form-group">
          <input type="text" 
                 id="reminder-title" 
                 class="reminder-title-input" 
                 placeholder="Reminder title"
                 value="${reminder ? reminder.title : ''}"
                 maxlength="100">
        </div>
        
        <!-- Date & Time -->
        <div class="form-group">
          <label class="form-label">Date & Time</label>
          <div class="date-time-group">
            <input type="date" 
                   id="reminder-date" 
                   class="reminder-date-input"
                   value="${reminder && reminder.date ? reminder.date : ''}">
            <input type="time" 
                   id="reminder-time" 
                   class="reminder-time-input"
                   value="${reminder ? reminder.time : '12:00'}">
          </div>
        </div>
        
        <!-- Repeat -->
        <div class="form-group">
          <label class="form-label">Repeat</label>
          <select id="reminder-repeat" class="reminder-repeat-select">
            <option value="none" ${!reminder || reminder.repeat === 'none' ? 'selected' : ''}>Never</option>
            <option value="daily" ${reminder && reminder.repeat === 'daily' ? 'selected' : ''}>Daily</option>
            <option value="weekly" ${reminder && reminder.repeat === 'weekly' ? 'selected' : ''}>Weekly</option>
            <option value="monthly" ${reminder && reminder.repeat === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="yearly" ${reminder && reminder.repeat === 'yearly' ? 'selected' : ''}>Yearly</option>
          </select>
        </div>
        
        <!-- Days (for weekly repeat) -->
        <div class="form-group" id="weekly-days-group" style="display: ${reminder && reminder.repeat === 'weekly' ? 'block' : 'none'}">
          <label class="form-label">Days</label>
          ${this.renderDaysSelector('reminder', reminder ? reminder.days : [])}
        </div>
        
        <!-- Alert Times -->
        <div class="form-group">
          <label class="form-label">Alert</label>
          <div class="alerts-container" id="alerts-container">
            ${this.renderAlertsList(reminder ? reminder.alerts : [0])}
          </div>
          <button type="button" class="add-alert-btn" id="add-alert-btn">
            <i class="material-icons-round">add</i> Add Alert
          </button>
        </div>
        
        <!-- Notes -->
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea id="reminder-notes" 
                    class="reminder-notes-input" 
                    placeholder="Additional details..."
                    maxlength="500">${reminder ? reminder.notes || '' : ''}</textarea>
        </div>
        
        <!-- Save Button -->
        <button class="save-reminder-btn" id="save-reminder">
          ${isEdit ? 'Update' : 'Save'} Reminder
        </button>
      </div>
    `;
    
    this.elements.remindersPanel.innerHTML = html;
  }
  
  /**
   * Render alerts list for form
   */
  renderAlertsList(alerts) {
    return alerts.map((minutes, index) => `
      <div class="alert-item" data-index="${index}">
        <select class="alert-select" data-index="${index}">
          <option value="0" ${minutes === 0 ? 'selected' : ''}>At time of reminder</option>
          <option value="5" ${minutes === 5 ? 'selected' : ''}>5 minutes before</option>
          <option value="15" ${minutes === 15 ? 'selected' : ''}>15 minutes before</option>
          <option value="30" ${minutes === 30 ? 'selected' : ''}>30 minutes before</option>
          <option value="60" ${minutes === 60 ? 'selected' : ''}>1 hour before</option>
          <option value="120" ${minutes === 120 ? 'selected' : ''}>2 hours before</option>
          <option value="1440" ${minutes === 1440 ? 'selected' : ''}>1 day before</option>
        </select>
        ${alerts.length > 1 ? `<button type="button" class="remove-alert-btn" data-index="${index}">
          <i class="material-icons-round">close</i>
        </button>` : ''}
      </div>
    `).join('');
  }
}