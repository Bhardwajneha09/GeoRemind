# 📍 GeoRemind — Location-Based Reminder System

> A geofence-powered reminder app that triggers alerts when users enter or leave a defined location.

[![CI](https://github.com/your-org/geo-remind/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/geo-remind/actions)

---

## ✨ Features

- **🔐 JWT Authentication** — Secure user registration, login, and user-scoped data access
- **📍 Geofence Creation** — Define locations by name, latitude, longitude, and trigger radius
- **📡 Location Polling** — Client sends GPS coordinates every 15s; server checks active geofences
- **⚡ Real-time Push** — Socket.io notifies the browser instantly when a geofence is entered/exited
- **🔔 Firebase FCM** — Mobile browser push notifications (background)
- **📧 Email Digests** — Confirmation email on reminder creation + daily 8 AM digest
- **🗺️ Map Visualization** — Interactive Leaflet.js map showing all geofences as circles
- **📜 Reminder History** — Full log of all trigger events with coordinates
- **🔁 Recurring Reminders** — Reminders that re-trigger on every geofence entry/exit

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│         Browser / Client         │
│  Leaflet Map + Socket.io Client  │
│  Location API (every 15 seconds) │
└────────────┬────────────────────┘
             │ HTTP + WebSocket
┌────────────▼────────────────────┐
│     Node.js + Express Server     │
│  JWT Auth │ Socket.io │ REST API │
└────────────┬────────────────────┘
             │
   ┌─────────▼──────────┐
   │   MySQL (Sequelize) │
   │  users, geofences,  │
   │  reminders, logs    │
   └────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for MySQL)
- npm

### 1. Clone & Setup

```bash
git clone https://github.com/your-org/geo-remind.git
cd location_based_reminder

# Copy environment config
cp .env.example .env
# Edit .env with your settings (JWT_SECRET is required)
```

### 2. Start MySQL

```bash
docker-compose up -d
# MySQL will be available on port 3306
```

### 3. Install & Run Backend

```bash
cd backend
npm install

# Run database migrations
npm run migrate

# (Optional) Seed demo data
npm run seed

# Start development server
npm run dev
```

### 4. Open the App

Visit **http://localhost:3000** in your browser.

---

## 🔑 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/fcm-token` | Update Firebase token |

### Geofences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/geofences` | List user's geofences |
| POST | `/api/geofences` | Create geofence |
| PUT | `/api/geofences/:id` | Update geofence |
| DELETE | `/api/geofences/:id` | Delete geofence |

### Reminders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reminders` | List user's reminders |
| POST | `/api/reminders` | Create reminder |
| PUT | `/api/reminders/:id` | Update reminder |
| DELETE | `/api/reminders/:id` | Delete reminder |
| GET | `/api/reminders/logs` | Trigger history |

### Location

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/location/check` | Check current position against geofences |
| GET | `/api/location/history` | Last 50 trigger events |

---

## 🧮 Geofence Logic

Uses the **Haversine formula** to calculate great-circle distance between GPS coordinates:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c  (R = 6371000 metres)
```

**Performance**: A bounding-box SQL pre-filter (indexed `lat`/`lng` columns) eliminates most rows before the expensive Haversine check runs.

---

## 🧪 Testing

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Unit tests only
npm test -- --testPathPattern=tests/unit

# Integration tests only
npm test -- --testPathPattern=tests/integration
```

Target: **70%+ code coverage**

---

## 📡 Socket.io Events

| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `authenticate` | `{ token: "<jwt>" }` |
| Server → Client | `reminder:triggered` | `{ reminder, geofence, triggerType }` |

---

## 🔔 Notifications

- **Socket.io**: Real-time push to active browser tab
- **Firebase FCM**: Background push to mobile browsers (requires FCM setup)
- **Email**: Confirmation on creation + daily 8 AM digest

---

## 🛡️ Security

- JWT with 7-day expiry
- bcrypt password hashing (10 rounds)
- Rate limiting: 6 req/min on `/api/location/check`
- Helmet.js security headers
- Input validation via express-validator
- User-scoped data access (middleware enforced)
- Parameterized queries via Sequelize ORM

---

## 📁 Project Structure

```
location_based_reminder/
├── backend/
│   ├── config/         # DB, Firebase, Email config
│   ├── middleware/     # JWT auth, rate limiting, validation
│   ├── models/         # Sequelize ORM models
│   ├── routes/         # Express route handlers
│   ├── services/       # Geofence, email, Firebase services
│   ├── utils/          # Haversine formula
│   ├── migrations/     # DB migrations
│   ├── seeders/        # Demo data
│   └── tests/          # Jest unit + integration tests
├── frontend/
│   ├── index.html      # Login/Register page
│   ├── dashboard.html  # Main app + map
│   ├── css/style.css   # Dark glassmorphism design
│   └── js/             # Auth, dashboard, geolocation, socket
├── .github/workflows/  # CI/CD pipeline
├── docker-compose.yml  # MySQL container
└── .env.example        # Environment template
```

---

## 🎯 Demo Tips

1. Open the app and register an account
2. Create a geofence around your current location (50–100m radius)
3. Add a reminder with trigger type "enter"
4. Watch the browser location polling kick in (status dot turns green)
5. In Chrome DevTools → Sensors → Geolocation — simulate movement inside the geofence
6. A real-time toast notification will appear instantly! 🎉

---

## 📄 License

MIT
