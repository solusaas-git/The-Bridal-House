// Simple service worker to prevent 404 errors
// This can be enhanced later if PWA functionality is needed

self.addEventListener('install', function(event) {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());
});

// For now, just pass through all fetch requests
self.addEventListener('fetch', function(event) {
  // Let the browser handle all requests normally
  return;
}); 