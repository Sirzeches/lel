# Pickleball Open Court Manager — MVP Plan

## Overview

A lightweight web app that lets players at a recreational pickleball facility see which courts are open, join a queue, and get notified when a court is available.

---

## MVP Features

### 1. Court Status Board
- Display all courts with real-time status: **Open**, **In Use**, or **Reserved**
- Show how long a court has been occupied
- Auto-refreshing view (no manual reload required)

### 2. Player Check-In / Queue
- Players enter their name (and optional group size, 2 or 4)
- Join the waitlist when all courts are full
- See their position in queue and estimated wait time
- Leave the queue at any time

### 3. Court Assignment
- When a court opens, the next group in queue is notified and assigned
- Court operator (or the players themselves) can mark a court as "open" when done
- Simple "I'm done" button on the court card

### 4. Session Timer
- Each occupied court shows elapsed play time
- Configurable max session length (default: 15 min) — court flashes as a reminder when time is up

### 5. Admin Panel (basic)
- Add / remove courts
- Clear the queue
- Override court status manually
- Set max session duration

---

## Tech Stack

| Layer        | Technology                                      | Reason                                           |
|--------------|-------------------------------------------------|--------------------------------------------------|
| Frontend     | **React** (Vite)                                | Fast dev experience, component-based UI          |
| Styling      | **Tailwind CSS**                                | Utility-first, rapid prototyping                 |
| Real-time    | **WebSockets** (via Socket.IO)                  | Push court updates to all clients instantly      |
| Backend      | **Node.js + Express**                           | Lightweight, easy Socket.IO integration          |
| Database     | **SQLite** (via better-sqlite3)                 | Zero-config, file-based, perfect for MVP scale   |
| ORM          | **Drizzle ORM**                                 | Type-safe schema, simple migrations              |

---

## Database Schema

### `courts`
| Column         | Type      | Notes                              |
|----------------|-----------|------------------------------------|
| `id`           | INTEGER PK | Auto-increment                    |
| `name`         | TEXT       | e.g. "Court 1"                    |
| `status`       | TEXT       | `open` \| `in_use` \| `reserved`  |
| `session_start`| DATETIME   | NULL when open                    |
| `max_duration` | INTEGER    | Minutes; default 15               |
| `created_at`   | DATETIME   | Row creation timestamp            |

### `queue_entries`
| Column       | Type      | Notes                              |
|--------------|-----------|------------------------------------|
| `id`         | INTEGER PK | Auto-increment                    |
| `player_name`| TEXT       | Display name                      |
| `group_size` | INTEGER    | 2 or 4                            |
| `position`   | INTEGER    | Order in queue (1-indexed)        |
| `status`     | TEXT       | `waiting` \| `assigned` \| `done` |
| `court_id`   | INTEGER FK | NULL until assigned               |
| `joined_at`  | DATETIME   |                                   |
| `assigned_at`| DATETIME   | NULL until assigned               |

### `sessions` (audit log)
| Column        | Type      | Notes                            |
|---------------|-----------|----------------------------------|
| `id`          | INTEGER PK |                                 |
| `court_id`    | INTEGER FK |                                 |
| `player_name` | TEXT       |                                 |
| `group_size`  | INTEGER    |                                 |
| `started_at`  | DATETIME   |                                 |
| `ended_at`    | DATETIME   |                                 |
| `duration_min`| REAL       | Computed on close                |

---

## Project Structure

```
pickleball-manager/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── CourtCard.jsx
│   │   │   ├── CourtBoard.jsx
│   │   │   ├── QueuePanel.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── hooks/
│   │   │   └── useSocket.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── index.html
├── server/                  # Express + Socket.IO backend
│   ├── db/
│   │   ├── schema.js        # Drizzle schema definitions
│   │   ├── migrate.js       # Run migrations
│   │   └── db.js            # DB connection singleton
│   ├── routes/
│   │   ├── courts.js        # REST: GET/POST/PATCH courts
│   │   └── queue.js         # REST: GET/POST/DELETE queue
│   ├── socket/
│   │   └── handlers.js      # Socket.IO event handlers
│   ├── services/
│   │   └── scheduler.js     # Session timer / auto-notify
│   └── index.js             # Entry point
├── package.json
└── Plan.md
```

---

## API Endpoints (REST)

| Method | Path                        | Description                       |
|--------|-----------------------------|-----------------------------------|
| GET    | `/api/courts`               | List all courts with status       |
| PATCH  | `/api/courts/:id`           | Update court status               |
| GET    | `/api/queue`                | Get current waitlist              |
| POST   | `/api/queue`                | Add player to queue               |
| DELETE | `/api/queue/:id`            | Remove player from queue          |
| POST   | `/api/courts/:id/release`   | Mark court as done, assign next   |
| GET    | `/api/admin/sessions`       | View session history              |

---

## Socket.IO Events

| Event (server → client) | Payload                        | Trigger                        |
|--------------------------|--------------------------------|--------------------------------|
| `courts:updated`         | Full courts array              | Any court status change        |
| `queue:updated`          | Full queue array               | Any queue change               |
| `court:assigned`         | `{ playerName, courtName }`    | Player assigned to a court     |
| `session:warning`        | `{ courtId, courtName }`       | Session approaching time limit |

---

## MVP Milestones

1. **Phase 1 — Backend foundation**: DB schema, Express server, REST endpoints, SQLite working
2. **Phase 2 — Real-time layer**: Socket.IO integration, session timer service
3. **Phase 3 — Frontend core**: Court board, queue panel, live updates via WebSocket
4. **Phase 4 — Admin panel**: Court management, queue clearing, session config
5. **Phase 5 — Polish**: Responsive layout, toast notifications, session history view
