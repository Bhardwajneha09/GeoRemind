
/**
 * GeoRemind - Geolocation Module
 */

let pollingIntervalId = null;
let currentPosition = null;
let isPollingActive = false;
let isChecking = false;

// Update GPS status
function updateLocationStatusUI(status, label) {
  const dot = document.getElementById('gps-status-dot');
  const text = document.getElementById('gps-status-text');

  if (dot) dot.className = `status-dot ${status}`;
  if (text) text.textContent = label;
}
// Get current GPS position
function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {

    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by Safari.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        };

        console.log('GPS SUCCESS');
        console.log('Latitude:', pos.coords.latitude);
        console.log('Longitude:', pos.coords.longitude);
        console.log('Accuracy:', pos.coords.accuracy);

        resolve(currentPosition);
      },

      (error) => {
        console.error('GPS FAILED:', error);

        if (error.code === 1) {
          reject(new Error('Location permission denied.'));
        } else if (error.code === 2) {
          reject(new Error('Mac cannot determine your location. Check Wi-Fi and Location Services.'));
        } else if (error.code === 3) {
          reject(new Error('Location request timed out. Try again.'));
        } else {
          reject(error);
        }
      },

      {
        enableHighAccuracy: false,
        timeout: 60000,
        maximumAge: 300000,
        ...options
      }
    );
  });
}

// Request GPS permission
async function requestLocationPermission() {
  updateLocationStatusUI('yellow', 'Acquiring GPS...');

  try {
    const pos = await getCurrentPosition();

    updateLocationStatusUI('active', 'GPS Active');

    if (window.GeoDashboard?.updateUserLocation) {
      window.GeoDashboard.updateUserLocation(
        pos.lat, pos.lng, pos.accuracy
      );
    }

    return pos;

  } catch (error) {
    console.error('GPS Error:', error);

    updateLocationStatusUI(
      error.code === 1 ? 'red' : 'yellow',
      error.code === 1 ? 'GPS Denied' : 'GPS Weak'
    );

    if (window.GeoDashboard?.showToast) {
      let message = 'Unable to get location. Please try again.';

      if (error.code === 1) {
        message = 'Location permission denied.';
      } else if (error.code === 2) {
        message = 'Location information is currently unavailable.';
      } else if (error.code === 3) {
        message = 'Location request timed out. Please try again.';
      }

      window.GeoDashboard.showToast(message, 'warning', 'GPS Error');
    }

    return null;
  }
}

// Send location to backend
async function sendLocationToServer(lat, lng) {

  if (!window.GeoAuth || !window.GeoAuth.isAuthenticated()) {
    console.warn('User is not authenticated.');
    return [];
  }

  try {
    const data = await window.GeoAuth.authFetch('/location/check', {
      method: 'POST',
      body: JSON.stringify({ lat, lng })
    });

    const triggered = Array.isArray(data)
      ? data
      : data?.triggered_reminders ||
        data?.reminders ||
        data?.data?.triggered_reminders ||
        [];

    if (triggered.length > 0) {
      handleTriggeredReminders(triggered);
    }

    return triggered;

  } catch (error) {
    console.error('Location API Error:', error);
    return [];
  }
}

// Handle triggered reminders
function handleTriggeredReminders(reminders) {

  if (!reminders || reminders.length === 0) return;

  window.GeoSocket?.playChimeSound?.();

  reminders.forEach((reminder) => {
    const message = reminder.message || 'You have arrived!';
    const name = reminder.geofence_name || 'Geofence Zone';
    const type = reminder.trigger_type || 'ENTER';

    window.GeoDashboard?.showToast?.(
      message,
      'reminder',
      `📍 ${name} (${type})`
    );
  });

  window.GeoDashboard?.loadHistory?.();
  window.GeoDashboard?.loadReminders?.();
}

// Start GPS polling
function startLocationPolling(intervalMs = 15000) {

  stopLocationPolling();

  isPollingActive = true;

  console.log('GPS polling started.');

  pollOnce();

  pollingIntervalId = setInterval(pollOnce, intervalMs);
}

// Check location
async function pollOnce() {

  if (!isPollingActive || isChecking) return;

  isChecking = true;

  try {
    const pos = await getCurrentPosition();

    updateLocationStatusUI('active', 'GPS Active');

    window.GeoDashboard?.updateUserLocation?.(
      pos.lat, pos.lng, pos.accuracy
    );

    await sendLocationToServer(pos.lat, pos.lng);

  } catch (error) {

    console.warn('GPS unavailable:', error.code, error.message);

    if (error.code === 1) {
      updateLocationStatusUI('red', 'GPS Denied');
      stopLocationPolling();
    } else {
      updateLocationStatusUI('yellow', 'GPS Weak');
    }

  } finally {
    isChecking = false;
  }
}

// Stop GPS polling
function stopLocationPolling() {

  if (pollingIntervalId !== null) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }

  isPollingActive = false;

  console.log('GPS polling stopped.');

  updateLocationStatusUI('yellow', 'GPS Idle');
}

// Simulate location for testing
async function simulateLocation(lat, lng) {

  currentPosition = {
    lat,
    lng,
    accuracy: 10,
    timestamp: Date.now()
  };

  updateLocationStatusUI('active', 'Simulated GPS');

  window.GeoDashboard?.updateUserLocation?.(lat, lng, 10);

  return await sendLocationToServer(lat, lng);
}

// Export functions
window.GeoLocation = {
  getCurrentPosition,
  requestLocationPermission,
  startLocationPolling,
  stopLocationPolling,  
  sendLocationToServer,
  handleTriggeredReminders,
  simulateLocation,

  get currentPosition() {
    return currentPosition;
  }
};
