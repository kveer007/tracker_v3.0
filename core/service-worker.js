/**
 * Health Tracker PWA Service Worker
 */

// Cache name (Updated version for reminders feature)
const CACHE_NAME = "daily-tracker-v2";

// Files to cache (UPDATED - Added reminders files)
const FILES_TO_CACHE = [
  '/',
  'index.html',
  'core/core-styles.css',
  'core/core-scripts.js',
  'core/notification.js',
  'core/ui.js',
  'trackers/trackers-scripts.js',
  'trackers/trackers-styles.css',
  'workouts/workouts-scripts.js',
  'workouts/workouts-styles.css',
  'habits/habits-scripts.js',
  'habits/habits-styles.css',
  'reminders/reminders-scripts.js',
  'reminders/reminders-styles.css',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

// Install event - Precache static resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  // Precache static resources
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and content');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch((error) => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  
  // Clear old caches
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - Serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            // Return cached response
            return response;
          }
          
          // Fetch from network
          return fetch(event.request)
            .then((response) => {
              // Check if valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response
              const responseToCache = response.clone();
              
              // Cache the fetched response
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch((error) => {
              console.error('[Service Worker] Fetch failed:', error);
              // You could return a custom offline page here
            });
        })
    );
  }
});

// Push event - Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let title = 'Daily Tracker';
  let options = {
    body: 'Time to check your health reminders!',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'reminder-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  // Try to parse the push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      options.tag = data.tag || options.tag;
      
      // Add custom data for reminders
      if (data.type === 'reminder') {
        options.data = {
          type: 'reminder',
          reminderId: data.reminderId || null,
          action: data.action || 'open'
        };
      }
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - Enhanced for reminders
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event);
  
  // Close notification
  event.notification.close();
  
  // Handle different notification actions
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  if (action === 'dismiss') {
    // Just close the notification
    return;
  }
  
  // Default action or 'open' action
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            // If it's a reminder notification, send message to open reminders panel
            if (notificationData.type === 'reminder') {
              client.postMessage({
                type: 'notification-click',
                action: 'open-reminders',
                reminderId: notificationData.reminderId
              });
            }
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        let url = '/';
        if (notificationData.type === 'reminder') {
          url += '?open=reminders';
          if (notificationData.reminderId) {
            url += `&reminder=${notificationData.reminderId}`;
          }
        }
        
        return clients.openWindow(url);
      })
  );
});

// Background sync event - For future reminder sync functionality
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event);
  
  if (event.tag === 'reminder-sync') {
    event.waitUntil(
      // Future: Sync reminders with server or update scheduled notifications
      Promise.resolve()
    );
  }
});

// Message event - Handle messages from main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'schedule-reminder':
      // Future: Handle reminder scheduling
      console.log('[Service Worker] Reminder scheduling requested:', data);
      break;
      
    case 'cancel-reminder':
      // Future: Handle reminder cancellation
      console.log('[Service Worker] Reminder cancellation requested:', data);
      break;
      
    case 'update-cache':
      // Force cache update
      event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
          return cache.addAll(FILES_TO_CACHE);
        })
      );
      break;
      
    default:
      console.log('[Service Worker] Unknown message type:', type);
  }
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification.tag);
  
  // Analytics or tracking for closed notifications could go here
  const notificationData = event.notification.data || {};
  
  if (notificationData.type === 'reminder') {
    // Future: Track reminder dismissal analytics
    console.log('[Service Worker] Reminder notification dismissed');
  }
});