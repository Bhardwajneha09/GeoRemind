/**
 * GeoRemind — Interactive Dashboard Module
 * Manages Leaflet Map, geofence visualization, reminders, history, modals, and toasts.
 */

let map = null;
let userMarker = null;
let userAccuracyCircle = null;
let geofenceLayers = []; // array of { id, circle, marker }
let tempClickMarker = null;
let tempPreviewCircle = null;

let currentGeofences = [];
let currentReminders = [];
let currentHistory = [];
let activeTab = 'reminders'; // 'reminders' | 'geofences' | 'history'

// ==========================================
// Toast Notification Engine
// ==========================================

function showToast(message, type = 'info', title = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'reminder') {
    iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
  } else if (type === 'success') {
    iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else {
    iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  const defaultTitles = {
    reminder: '📍 Proximity Alert',
    success: 'Success',
    warning: 'Notice',
    error: 'Error',
    info: 'Information'
  };

  const finalTitle = title || defaultTitles[type] || 'GeoRemind';

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(finalTitle)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const closeBtn = toast.querySelector('.toast-close');
  const dismiss = () => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 350);
  };

  closeBtn.addEventListener('click', dismiss);

  // Auto-dismiss after 6.5 seconds
  const autoDismissTimeout = setTimeout(dismiss, 6500);

  // Animate progress bar
  const progressBar = toast.querySelector('.toast-progress');
  if (progressBar) {
    progressBar.style.transition = 'width 6.5s linear';
    requestAnimationFrame(() => {
      progressBar.style.width = '0%';
    });
  }

  return toast;
}

// Utility: HTML Escaper
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

// Utility: Format Date
function formatTime(isoString) {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
  } catch (e) {
    return isoString;
  }
}

// ==========================================
// Map Initialization & Management
// ==========================================


function initMap() {
  const mapElement = document.getElementById('map');

  if (!mapElement) {
    console.error('Map element not found');
    return;
  }

  // Prevent duplicate map initialization
  if (map) {
    map.invalidateSize();
    return;
  }

  // Create map
  map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([37.7749, -122.4194], 13);

  // OpenStreetMap - no API key required
  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }
  ).addTo(map);

  // Zoom controls
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  // Resize map
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 500);

  // Map resize event
  window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
  });

  // Click map to create reminder
  map.on('click', (e) => {
    openAddModal(e.latlng.lat, e.latlng.lng);
  });

  console.log('GeoRemind map initialized successfully');
}

/**
 * Updates or creates the user's live pulsing position marker on the Leaflet map
 */
function updateUserLocation(lat, lng, accuracy = 20) {
  if (!map) return;

  const latlng = [lat, lng];

  if (!userMarker) {
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: '<div class="user-marker-pulse"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    userMarker = L.marker(latlng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    userMarker.bindTooltip('Your Location', { direction: 'top', className: 'user-tooltip' });

    userAccuracyCircle = L.circle(latlng, {
      radius: accuracy,
      color: '#06b6d4',
      fillColor: '#06b6d4',
      fillOpacity: 0.1,
      weight: 1,
      dashArray: '4, 4'
    }).addTo(map);

    // Initial center on user
    map.setView(latlng, 14);
  } else {
    userMarker.setLatLng(latlng);
    if (userAccuracyCircle) {
      userAccuracyCircle.setLatLng(latlng);
      userAccuracyCircle.setRadius(accuracy);
    }
  }
}

/**
 * Draws all geofences as colored neon rings on the Leaflet map
 */
function renderGeofencesOnMap(geofences) {
  if (!map) return;

  // Clear existing geofence layers
  geofenceLayers.forEach(item => {
    if (item.circle) map.removeLayer(item.circle);
    if (item.marker) map.removeLayer(item.marker);
  });
  geofenceLayers = [];

  if (!geofences || !geofences.length) return;

  const colors = [
    { stroke: '#7c3aed', fill: 'rgba(124, 58, 237, 0.22)' },
    { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.22)' },
    { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.22)' },
    { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.22)' }
  ];

  geofences.forEach((geo, idx) => {
    const lat = parseFloat(geo.lat || geo.latitude);
    const lng = parseFloat(geo.lng || geo.longitude);
    const radius = parseFloat(geo.radius_m || geo.radius || 200);

    if (isNaN(lat) || isNaN(lng)) return;

    const colorScheme = colors[idx % colors.length];

    // Neon circle
    const circle = L.circle([lat, lng], {
      radius,
      color: colorScheme.stroke,
      fillColor: colorScheme.fill,
      fillOpacity: 0.25,
      weight: 2,
      dashArray: null
    }).addTo(map);

    // Center icon pin
    const centerIcon = L.divIcon({
      className: 'custom-geofence-marker',
      html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([lat, lng], { icon: centerIcon }).addTo(map);

    // Linked reminders count
    const linkedReminders = currentReminders.filter(r => (r.geofence_id == geo.id || (r.geofence && r.geofence.id == geo.id)));

    // Popup content with dark glass styling
    const popupContent = `
      <div class="popup-geofence-card">
        <div class="popup-geofence-title">
          <span>📍</span>
          <span>${escapeHtml(geo.name)}</span>
        </div>
        <div class="popup-geofence-info">
          <div>Radius: <strong>${Math.round(radius)} meters</strong></div>
          <div>Coords: <strong>${lat.toFixed(4)}, ${lng.toFixed(4)}</strong></div>
          <div style="margin-top: 4px;">Linked Reminders: <strong>${linkedReminders.length}</strong></div>
        </div>
        <div class="popup-actions">
          <button class="btn btn-primary btn-sm" onclick="window.GeoDashboard.openAddModal(${lat}, ${lng}, '', ${geo.id})">
            + Add Reminder
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="window.GeoDashboard.deleteGeofence(${geo.id})">
            Delete
          </button>
        </div>
      </div>
    `;

    circle.bindPopup(popupContent);
    marker.bindPopup(popupContent);

    geofenceLayers.push({ id: geo.id, circle, marker, lat, lng });
  });
}

// Center map to a specific geofence
function focusGeofenceOnMap(id) {
  if (!id) return;
  const item = geofenceLayers.find(l => l.id == id);
  if (item && map) {
    map.flyTo([item.lat, item.lng], 16, { duration: 1.2 });
    item.circle.openPopup();

    // On mobile, collapse sidebar on selection
    if (window.innerWidth < 768) {
      document.querySelector('.dash-sidebar')?.classList.remove('open');
    }
  }
}

// ==========================================
// Data Loaders (Geofences, Reminders, Logs)
// ==========================================

async function loadGeofences() {
  try {
    const data = await window.GeoAuth.authFetch('/geofences');
    currentGeofences = Array.isArray(data) ? data : (data.geofences || data.data || []);

    renderGeofencesList(currentGeofences);
    renderGeofencesOnMap(currentGeofences);
    updateTabBadge('geofences', currentGeofences.length);

    // Update geofence select in modal
    populateGeofenceSelect(currentGeofences);

    return currentGeofences;
  } catch (err) {
    console.error('Error loading geofences:', err);
    return [];
  }
}

async function loadReminders() {
  try {
    const data = await window.GeoAuth.authFetch('/reminders');
    currentReminders = Array.isArray(data) ? data : (data.reminders || data.data || []);

    renderRemindersList(currentReminders);
    updateTabBadge('reminders', currentReminders.length);

    // Re-render map popups if geofences were already loaded
    if (currentGeofences.length) {
      renderGeofencesOnMap(currentGeofences);
    }

    return currentReminders;
  } catch (err) {
    console.error('Error loading reminders:', err);
    return [];
  }
}

async function loadHistory() {
  try {
    const data = await window.GeoAuth.authFetch('/reminders/logs');
    currentHistory = Array.isArray(data) ? data : (data.logs || data.data || []);

    renderHistoryList(currentHistory);
    updateTabBadge('history', currentHistory.length);

    return currentHistory;
  } catch (err) {
    console.error('Error loading history logs:', err);
    return [];
  }
}

function updateTabBadge(tabName, count) {
  const badge = document.getElementById(`badge-tab-${tabName}`);
  if (badge) {
    badge.textContent = count;
  }
}

// ==========================================
// Sidebar Rendering
// ==========================================

function renderRemindersList(reminders) {
  const container = document.getElementById('reminders-container');
  if (!container) return;

  const searchQuery = (document.getElementById('sidebar-search-input')?.value || '').toLowerCase().trim();

  const filtered = reminders.filter(r => {
    const msg = (r.message || '').toLowerCase();
    const geoName = (r.geofence?.name || r.geofence_name || '').toLowerCase();
    return msg.includes(searchQuery) || geoName.includes(searchQuery);
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>
        <h4>No reminders yet</h4>
        <p>${searchQuery ? 'No reminders match your search.' : 'Click anywhere on the map or click "+" to create your first location reminder.'}</p>
        ${!searchQuery ? '<button class="btn btn-primary btn-sm" onclick="window.GeoDashboard.openAddModal()">Create Reminder</button>' : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => {
    const geofenceName = r.geofence?.name || r.geofence_name || 'Associated Geofence';
    const triggerType = r.trigger_type || 'ENTER';
    const isRecurring = Boolean(r.is_recurring);
    const triggerClass = triggerType.toLowerCase() === 'exit' ? 'trigger-exit' : (triggerType.toLowerCase() === 'dwell' ? 'trigger-dwell' : 'trigger-enter');

    return `
      <div class="reminder-item-card ${triggerClass}" onclick="window.GeoDashboard.focusGeofenceOnMap(${r.geofence_id || (r.geofence && r.geofence.id)})">
        <div class="reminder-header">
          <div class="reminder-msg">${escapeHtml(r.message)}</div>
          <button class="btn-icon btn-sm" style="width: 28px; height: 28px; color: #ef4444;" title="Delete Reminder" onclick="event.stopPropagation(); window.GeoDashboard.deleteReminder(${r.id});">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
        <div class="reminder-meta">
          <span class="badge ${triggerType === 'ENTER' ? 'badge-purple' : (triggerType === 'EXIT' ? 'badge-cyan' : 'badge-warning')}">
            ${escapeHtml(triggerType)}
          </span>
          <span class="badge ${isRecurring ? 'badge-success' : 'badge-purple'}">
            ${isRecurring ? '🔁 Recurring' : '⚡ One-Time'}
          </span>
          <span style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
            📍 ${escapeHtml(geofenceName)}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function renderGeofencesList(geofences) {
  const container = document.getElementById('geofences-container');
  if (!container) return;

  const searchQuery = (document.getElementById('sidebar-search-input')?.value || '').toLowerCase().trim();

  const filtered = geofences.filter(g => (g.name || '').toLowerCase().includes(searchQuery));

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="10"></circle><path d="m4.93 4.93 4.24 4.24"></path><path d="m14.83 9.17 4.24-4.24"></path><path d="m14.83 14.83 4.24 4.24"></path><path d="m9.17 14.83-4.24 4.24"></path>
          </svg>
        </div>
        <h4>No Geofences</h4>
        <p>${searchQuery ? 'No geofences match your query.' : 'Click anywhere on the map to define a geofence radius.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(g => {
    const lat = parseFloat(g.lat || g.latitude || 0).toFixed(4);
    const lng = parseFloat(g.lng || g.longitude || 0).toFixed(4);
    const radius = Math.round(g.radius_m || g.radius || 200);
    const count = currentReminders.filter(r => (r.geofence_id == g.id || (r.geofence && r.geofence.id == g.id))).length;

    return `
      <div class="geofence-item-card" onclick="window.GeoDashboard.focusGeofenceOnMap(${g.id})">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #ffffff;">${escapeHtml(g.name)}</h4>
          <button class="btn-icon btn-sm" style="width: 28px; height: 28px; color: #ef4444;" title="Delete Geofence" onclick="event.stopPropagation(); window.GeoDashboard.deleteGeofence(${g.id});">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
        <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
          <span class="badge badge-cyan">${radius}m Radius</span>
          <span class="badge badge-purple">${count} ${count === 1 ? 'Reminder' : 'Reminders'}</span>
        </div>
        <div style="margin-top: 0.6rem; font-size: 0.78rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">
          ${lat}, ${lng}
        </div>
      </div>
    `;
  }).join('');
}

function renderHistoryList(historyLogs) {
  const container = document.getElementById('history-container');
  if (!container) return;

  if (!historyLogs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <h4>No Trigger History</h4>
        <p>When you enter or exit defined geofences, trigger logs will automatically appear here in realtime.</p>
      </div>
    `;
    return;
  }

  // Sort by triggered_at desc
  const sorted = [...historyLogs].sort((a, b) => new Date(b.triggered_at || b.created_at) - new Date(a.triggered_at || a.created_at));

  container.innerHTML = sorted.map(log => {
    const msg = log.reminder?.message || log.message || 'Trigger event breached';
    const geoName = log.geofence?.name || log.geofence_name || 'Geofence Zone';
    const type = log.trigger_type || log.reminder?.trigger_type || 'TRIGGER';
    const timeStr = formatTime(log.triggered_at || log.created_at);

    return `
      <div class="history-item-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <span class="badge badge-success">⚡ ${escapeHtml(type)}</span>
          <span class="history-time">${escapeHtml(timeStr)}</span>
        </div>
        <div style="font-weight: 600; color: #ffffff; font-size: 0.88rem; margin: 0.35rem 0;">${escapeHtml(msg)}</div>
        <div style="font-size: 0.78rem; color: var(--accent-cyan-light);">📍 ${escapeHtml(geoName)}</div>
      </div>
    `;
  }).join('');
}

function populateGeofenceSelect(geofences) {
  const select = document.getElementById('modal-existing-geofence');
  if (!select) return;

  select.innerHTML = '<option value="">-- Create New Geofence --</option>' +
    geofences.map(g => `<option value="${g.id}">${escapeHtml(g.name)} (${Math.round(g.radius_m || 200)}m)</option>`).join('');
}

// ==========================================
// Add Geofence & Reminder Modal
// ==========================================

function openAddModal(lat, lng, prefillName = '', existingGeoId = null) {
  const modal = document.getElementById('add-modal');
  if (!modal) return;

  const latInput = document.getElementById('geo-lat');
  const lngInput = document.getElementById('geo-lng');
  const nameInput = document.getElementById('geo-name');
  const radiusInput = document.getElementById('geo-radius');
  const radiusValue = document.getElementById('geo-radius-val');
  const msgInput = document.getElementById('reminder-message');
  const existingSelect = document.getElementById('modal-existing-geofence');
  const geofenceFields = document.getElementById('new-geofence-fields');

  // Fill default coords if none provided
  if (lat !== undefined && lng !== undefined) {
    latInput.value = Number(lat).toFixed(6);
    lngInput.value = Number(lng).toFixed(6);

    // Place temporary preview circle on map
    showMapPreviewCircle(lat, lng, radiusInput ? parseInt(radiusInput.value) : 200);
  } else if (window.GeoLocation && window.GeoLocation.currentPosition) {
    latInput.value = Number(window.GeoLocation.currentPosition.lat).toFixed(6);
    lngInput.value = Number(window.GeoLocation.currentPosition.lng).toFixed(6);
    showMapPreviewCircle(window.GeoLocation.currentPosition.lat, window.GeoLocation.currentPosition.lng, 200);
  }

  if (existingGeoId && existingSelect) {
    existingSelect.value = existingGeoId;
    if (geofenceFields) geofenceFields.style.display = 'none';
  } else {
    if (existingSelect) existingSelect.value = '';
    if (geofenceFields) geofenceFields.style.display = 'block';
  }

  if (prefillName && nameInput) {
    nameInput.value = prefillName;
  }

  if (radiusInput && radiusValue) {
    radiusValue.textContent = `${radiusInput.value} m`;
  }

 modal.classList.add('active');

setTimeout(() => {
    if (map) {
        map.invalidateSize();
    }
}, 300);
  setTimeout(() => {
    if (nameInput && nameInput.value === '') {
      nameInput.focus();
    } else if (msgInput) {
      msgInput.focus();
    }
  }, 150);
}

function closeAddModal() {
  const modal = document.getElementById('add-modal');
  if (modal) {
    modal.classList.remove('active');
  }

  clearMapPreviewCircle();
}

function showMapPreviewCircle(lat, lng, radius) {
  if (!map) return;
  clearMapPreviewCircle();

  tempClickMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'temp-pin',
      html: '<div style="width:18px;height:18px;background:#06b6d4;border:2px solid #fff;border-radius:50%;box-shadow:0 0 15px #06b6d4;"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })
  }).addTo(map);

  tempPreviewCircle = L.circle([lat, lng], {
    radius,
    color: '#06b6d4',
    fillColor: '#06b6d4',
    fillOpacity: 0.18,
    weight: 2,
    dashArray: '6, 6'
  }).addTo(map);
}

function clearMapPreviewCircle() {
  if (tempClickMarker && map) {
    map.removeLayer(tempClickMarker);
    tempClickMarker = null;
  }
  if (tempPreviewCircle && map) {
    map.removeLayer(tempPreviewCircle);
    tempPreviewCircle = null;
  }
}

// Live update of radius preview
function updateRadiusPreview(val) {
  const radiusValue = document.getElementById('geo-radius-val');
  if (radiusValue) {
    radiusValue.textContent = `${val} m`;
  }
  if (tempPreviewCircle) {
    tempPreviewCircle.setRadius(parseInt(val));
  }
}

/**
 * Submits the modal form:
 * 1) If new geofence: POST /api/geofences { name, lat, lng, radius_m }
 * 2) Then: POST /api/reminders { message, geofence_id, trigger_type, is_recurring }
 */
async function submitAddForm(event) {
  if (event) event.preventDefault();

  const existingSelect = document.getElementById('modal-existing-geofence');
  const selectedExistingId = existingSelect ? existingSelect.value : '';

  const nameInput = document.getElementById('geo-name');
  const latInput = document.getElementById('geo-lat');
  const lngInput = document.getElementById('geo-lng');
  const radiusInput = document.getElementById('geo-radius');

  const msgInput = document.getElementById('reminder-message');
  const triggerSelect = document.getElementById('reminder-trigger-type');
  const recurringToggle = document.getElementById('reminder-recurring');
  const submitBtn = document.getElementById('btn-modal-submit');

  const message = msgInput ? msgInput.value.trim() : '';
  const triggerType = triggerSelect ? triggerSelect.value : 'ENTER';
  const isRecurring = recurringToggle ? recurringToggle.checked : false;

  if (!message) {
    showToast('Please enter a reminder message.', 'warning');
    if (msgInput) msgInput.focus();
    return;
  }

  let finalGeofenceId = selectedExistingId;

  // Set loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> <span>Saving...</span>';
  }

  try {
    // If not using an existing geofence, create a new one first
    if (!finalGeofenceId) {
      const name = nameInput ? nameInput.value.trim() : '';
      const lat = parseFloat(latInput ? latInput.value : '');
      const lng = parseFloat(lngInput ? lngInput.value : '');
      const radius_m = parseInt(radiusInput ? radiusInput.value : 200);

      if (!name) {
        throw new Error('Please give your geofence a name (e.g., "Home", "Office", "Grocery Store").');
      }

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Please specify valid latitude and longitude coordinates.');
      }

      // POST /api/geofences
      const newGeoData = await window.GeoAuth.authFetch('/geofences', {
        method: 'POST',
        body: JSON.stringify({ name, lat, lng, radius_m })
      });

      const newGeo = newGeoData.geofence || newGeoData.data || newGeoData;
      finalGeofenceId = (newGeo && (newGeo.id || newGeo._id || newGeo.insertId)) || newGeo;
    }

    // Now create the reminder linked to this geofence
    // POST /api/reminders
    await window.GeoAuth.authFetch('/reminders', {
      method: 'POST',
      body: JSON.stringify({
        message,
        geofence_id: finalGeofenceId,
        trigger_type: triggerType,
        is_recurring: isRecurring
      })
    });

    showToast('Geofence & Reminder created successfully!', 'success');
    closeAddModal();

    // Reset fields
    if (nameInput) nameInput.value = '';
    if (msgInput) msgInput.value = '';

    // Reload all data
    await loadGeofences();
    await loadReminders();

    // Switch to Reminders tab
    switchSidebarTab('reminders');
  } catch (err) {
    showToast(err.message || 'Failed to create reminder', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Save Reminder';
    }
  }
}

// ==========================================
// Deletion Handlers
// ==========================================

async function deleteGeofence(id) {
  if (!confirm('Are you sure you want to delete this geofence? Any linked reminders may also be removed.')) {
    return;
  }

  try {
    await window.GeoAuth.authFetch(`/geofences/${id}`, {
      method: 'DELETE'
    });

    showToast('Geofence deleted successfully.', 'success');
    await loadGeofences();
    await loadReminders();
  } catch (err) {
    showToast(err.message || 'Could not delete geofence.', 'error');
  }
}

async function deleteReminder(id) {
  if (!confirm('Are you sure you want to delete this reminder?')) {
    return;
  }

  try {
    await window.GeoAuth.authFetch(`/reminders/${id}`, {
      method: 'DELETE'
    });

    showToast('Reminder deleted.', 'info');
    await loadReminders();
  } catch (err) {
    showToast(err.message || 'Could not delete reminder.', 'error');
  }
}

// ==========================================
// Sidebar Tabs & Navigation
// ==========================================

function switchSidebarTab(tabName) {
  activeTab = tabName;

  const tabs = ['reminders', 'geofences', 'history'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const section = document.getElementById(`${t}-section`);

    if (btn) btn.classList.toggle('active', t === tabName);
    if (section) section.style.display = t === tabName ? 'block' : 'none';
  });

  // Re-run render with current search query
  if (tabName === 'reminders') renderRemindersList(currentReminders);
  if (tabName === 'geofences') renderGeofencesList(currentGeofences);
  if (tabName === 'history') renderHistoryList(currentHistory);
}

// ==========================================
// Initialization
// ==========================================

async function initDashboard() {
  console.log('🚀 Initializing GeoRemind Dashboard...');

  // 1. Verify user authentication
  const user = await window.GeoAuth.checkAuth();
  if (!user) return; // checkAuth redirects to index if unauthenticated

  // Update User UI
  const userNameElem = document.getElementById('nav-user-name');
  const userAvatarElem = document.getElementById('nav-user-avatar');
  if (userNameElem) {
    userNameElem.textContent = user.name || user.email.split('@')[0];
  }
  if (userAvatarElem) {
    const initials = (user.name || user.email || 'U').substring(0, 2).toUpperCase();
    userAvatarElem.textContent = initials;
  }

  // 2. Initialize Leaflet Map
  initMap();

  // 3. Connect Socket.io
  const token = window.GeoAuth.getToken();
  if (window.GeoSocket) {
    window.GeoSocket.initSocket(token);
    window.GeoSocket.requestDesktopNotificationPermission();
  }

  // 4. Request GPS & Start Polling
  if (window.GeoLocation) {
    await window.GeoLocation.requestLocationPermission();
    window.GeoLocation.startLocationPolling(15000);
  }

  // 5. Load Data
  await Promise.all([
    loadGeofences(),
    loadReminders(),
    loadHistory()
  ]);

  // Setup Event Listeners
  setupDashboardEventListeners();
}

function setupDashboardEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out?')) {
        if (window.GeoLocation) window.GeoLocation.stopLocationPolling();
        if (window.GeoSocket) window.GeoSocket.disconnectSocket();
        window.GeoAuth.logout();
      }
    });
  }

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.querySelector('.dash-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Close sidebar on click outside on mobile
  const mapWrap = document.querySelector('.dash-map-wrap');
  if (mapWrap && sidebar) {
    mapWrap.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Sidebar Tab buttons
  document.getElementById('tab-btn-reminders')?.addEventListener('click', () => switchSidebarTab('reminders'));
  document.getElementById('tab-btn-geofences')?.addEventListener('click', () => switchSidebarTab('geofences'));
  document.getElementById('tab-btn-history')?.addEventListener('click', () => switchSidebarTab('history'));

  // Sidebar Search
  const searchInput = document.getElementById('sidebar-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (activeTab === 'reminders') renderRemindersList(currentReminders);
      if (activeTab === 'geofences') renderGeofencesList(currentGeofences);
    });
  }

  // FAB button
  const fabBtn = document.getElementById('fab-add');
  if (fabBtn) {
    fabBtn.addEventListener('click', () => openAddModal());
  }

  // Modal close buttons
  document.getElementById('btn-close-modal')?.addEventListener('click', closeAddModal);
  document.getElementById('btn-cancel-modal')?.addEventListener('click', closeAddModal);

  // Click on modal overlay backdrop
  document.getElementById('add-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'add-modal') {
      closeAddModal();
    }
  });

  // Radius slider
  const radiusSlider = document.getElementById('geo-radius');
  if (radiusSlider) {
    radiusSlider.addEventListener('input', (e) => updateRadiusPreview(e.target.value));
  }

  // Modal Existing Geofence Toggle
  const existingSelect = document.getElementById('modal-existing-geofence');
  const newGeofenceFields = document.getElementById('new-geofence-fields');
  if (existingSelect && newGeofenceFields) {
    existingSelect.addEventListener('change', () => {
      if (existingSelect.value) {
        newGeofenceFields.style.display = 'none';
        clearMapPreviewCircle();
      } else {
        newGeofenceFields.style.display = 'block';
      }
    });
  }

  // 'Use Current Location' Button in modal
  const btnUseCurrentLoc = document.getElementById('btn-use-current-loc');
  if (btnUseCurrentLoc) {
    btnUseCurrentLoc.addEventListener('click', async () => {
      btnUseCurrentLoc.innerHTML = '<span class="spinner"></span> Locating...';
      try {
        const pos = await window.GeoLocation.getCurrentPosition();
        document.getElementById('geo-lat').value = Number(pos.lat).toFixed(6);
        document.getElementById('geo-lng').value = Number(pos.lng).toFixed(6);
        showMapPreviewCircle(pos.lat, pos.lng, parseInt(document.getElementById('geo-radius').value || 200));
        if (map) map.flyTo([pos.lat, pos.lng], 16);
      } catch (e) {
        showToast('Could not acquire current location. Make sure GPS permissions are granted.', 'warning');
      } finally {
        btnUseCurrentLoc.innerHTML = '📍 Use My Location';
      }
    });
  }

  // 'Locate Me' Button on Map overlay
  const btnMapLocate = document.getElementById('btn-map-locate');
  if (btnMapLocate) {
    btnMapLocate.addEventListener('click', async () => {
      try {
        const pos = await window.GeoLocation.getCurrentPosition();
        if (map) {
          map.flyTo([pos.lat, pos.lng], 16, { duration: 1.2 });
        }
      } catch (e) {
        showToast('Unable to locate you. Please check GPS settings.', 'warning');
      }
    });
  }

  // Modal Form Submit
  const formAdd = document.getElementById('form-add-reminder');
  if (formAdd) {
    formAdd.addEventListener('submit', submitAddForm);
  }

  // Listen for global custom events from socket or geolocation triggers
  window.addEventListener('georemind:reminder-triggered', (e) => {
    loadHistory();
    loadReminders();
  });
}

// Export dashboard API to window
window.GeoDashboard = {
  initDashboard,
  initMap,
  loadGeofences,
  loadReminders,
  loadHistory,
  renderGeofencesOnMap,
  openAddModal,
  closeAddModal,
  submitAddForm,
  deleteGeofence,
  deleteReminder,
  showToast,
  updateUserLocation,
  focusGeofenceOnMap,
  switchSidebarTab
};

// Auto start dashboard on DOM load if map element is present
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('map')) {
    initDashboard();
  }
});
