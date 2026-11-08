
/**
 * GeoRemind - Socket.io Client
 */

let socketInstance = null;

// Play reminder sound
function playChimeSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const tones = [659.25, 830.61, 987.77];

        tones.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.frequency.value = freq;
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(
                0.001, ctx.currentTime + i * 0.12 + 0.5
            );

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.5);
        });
    } catch (error) {
        console.warn('Audio error:', error);
    }
}

// Update socket status
function updateSocketStatus(status, label) {
    const dot = document.getElementById('socket-status-dot');
    const text = document.getElementById('socket-status-text');

    if (dot) dot.className = 'status-dot ' + status;
    if (text) text.textContent = label;
}

// Initialize socket
function initSocket() {
    if (socketInstance && socketInstance.connected) {
        return socketInstance;
    }

    if (typeof io === 'undefined') {
        console.error('Socket.IO library not loaded');
        updateSocketStatus('red', 'Socket unavailable');
        return null;
    }

    const token = localStorage.getItem('geo_token');

    if (!token) {
        console.error('Authentication token not found');
        updateSocketStatus('red', 'Login required');
        return null;
    }

    socketInstance = io('http://localhost:3000', {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
    });

    // Authenticate after connecting
    socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance.id);

        updateSocketStatus('yellow', 'Authenticating...');

        socketInstance.emit('authenticate', { token: token });
    });

    // Authentication successful
    socketInstance.on('authenticated', (data) => {
        console.log('Socket authenticated:', data);
        updateSocketStatus('active', 'Realtime Live');
    });

    socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        updateSocketStatus('yellow', 'Connecting...');
    });

    socketInstance.on('connect_error', (error) => {
        console.error('Socket error:', error.message);
        updateSocketStatus('red', 'Connection Failed');
    });

    // Reminder notification
    socketInstance.on('reminder:triggered', (data) => {
        console.log('Reminder triggered:', data);

        playChimeSound();

        if (window.GeoDashboard) {
            window.GeoDashboard.showToast(
                data.message || 'Reminder triggered!',
                'reminder',
                'Location Reminder'
            );

            window.GeoDashboard.loadReminders();
            window.GeoDashboard.loadHistory();
        }
    });

    return socketInstance;
}

// Get socket
function getSocket() {
    return socketInstance;
}

// Disconnect socket
function disconnectSocket() {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}
// Request desktop notification permission
function requestDesktopNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("Notifications are not supported");
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}


// Export functions
window.GeoSocket = {
  initSocket,
  getSocket,
  disconnectSocket,
  playChimeSound,
  requestDesktopNotificationPermission
};