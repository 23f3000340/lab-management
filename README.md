# Lab Request Tracker 🔬📋

A production-quality web application built for university research labs to raise, assign, approve, and track resource requests (e.g. "I need a VM", "GPU cluster access", "reimbursement delayed", "lab keys"). 

Provides full accountability with an **append-only audit history**, **role-based permissions**, **automatic assignment to category leads**, and a **Professor Admin command center** with one-click approvals and stuck-request tracking.

---

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy 2.x + SQLite (switchable to PostgreSQL with just `DATABASE_URL`)
- **Database Migrations**: Alembic
- **Authentication**: JWT, bcrypt passwords, OAuth2 password flow
- **Frontend**: React (Vite) + Tailwind CSS + React Router + Lucide Icons + Recharts
- **Testing**: pytest (33 comprehensive tests passing)

---

## Quick Start (Localhost Run)

### Option A: Two-Terminal Run (Recommended for Development)

#### Terminal 1 — Backend (FastAPI on Port 8000):
```bash
cd backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Run migrations
alembic upgrade head

# 3. Seed database (creates admin, sub-admins, users, 15 realistic sample tickets)
python seed.py

# 4. Start backend server
uvicorn app.main:app --reload --port 8000
```
API Documentation will be live at: [http://localhost:8000/docs](http://localhost:8000/docs)

#### Terminal 2 — Frontend (Vite on Port 5173):
```bash
cd frontend

# 1. Install packages
npm install

# 2. Start frontend dev server
npm run dev
```
Open your browser at: **[http://localhost:5173](http://localhost:5173)**

---

### Option B: Docker Compose

```bash
docker-compose up --build
```
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:8000](http://localhost:8000)

---

## Seeded Accounts & Credentials

The seed script creates a complete research lab environment with 10 users and 15 sample requests across varied categories and statuses. The login screen also features **one-click demo login buttons**.

| Role | Name | Email | Password | Domain / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN (Professor)** | Professor Admin | `admin@lab.local` | `admin123` | Full control, approvals, dashboard |
| **SUB_ADMIN** | Ravi Kumar | `ravi@lab.local` | `sub123` | Category Lead: **IT/System** |
| **SUB_ADMIN** | Priya Shah | `priya@lab.local` | `sub123` | Category Lead: **Finance** |
| **SUB_ADMIN** | Dev Patel | `dev@lab.local` | `sub123` | Category Lead: **Operations**, **Other** |
| **USER** | Alice Chen | `alice@lab.local` | `user123` | Intern / Postdoc (Active) |
| **USER** | Bob Nair | `bob@lab.local` | `user123` | Project Associate (Active) |
| **USER** | Carol Wu | `carol@lab.local` | `user123` | PhD Student (Active) |
| **USER** | Deepak Rao | `deepak@lab.local` | `user123` | Intern (Active) |
| **PENDING** | Ethan Park | `ethan@lab.local` | `user123` | Requested role: USER (Pending review) |
| **PENDING** | Fatima Al-Hassan | `fatima@lab.local` | `user123` | Requested role: SUB_ADMIN (Pending review) |

---

## Core Features & Workflow

### 1. Onboarding with Admin Approval
- Anyone can sign up via the signup screen. New accounts start as `PENDING`.
- Attempts to log in before approval return `403 Forbidden` with a dedicated **"Awaiting Admin Approval"** view.
- Professor Admin can approve signups (with optional adjustments to roles and assigned categories) or reject them with a mandatory explanation.

### 2. Auto-Assignment & "Waiting On" Routing
- When a ticket is raised, it automatically assigns to the **Default Sub-Admin** for that category (e.g. IT tickets route to Ravi, Finance to Priya).
- `waiting_on` updates automatically based on ticket state:
  - `OPEN` / `ASSIGNED` / `IN_PROGRESS` / `APPROVED` / `FULFILLED` &rarr; `SUB_ADMIN`
  - `NEEDS_INFO` &rarr; `USER` (Requester)
  - `AWAITING_APPROVAL` &rarr; `ADMIN` (Professor)
  - `CLOSED` / `REJECTED` &rarr; `None`

### 3. Mandatory Note on Every Action (Min 5 Chars)
- Every status transition, reassignment, approval request, and approval/rejection **must** include a short note explaining the change.
- Enforced at both the **API layer (Pydantic / FastAPI)** and **UI modal layer**.
- Notes are permanently bound into the ticket's append-only audit trail.

### 4. Append-Only Activity Log
- Every state change logs: `ticket_id`, `actor`, `action`, `old_value`, `new_value`, `note`, `timestamp`.
- Entries can **never** be edited or deleted (no update/delete routes exist).

### 5. Professor Admin Command Center
- **Summary Cards**: Open requests, Awaiting My Approval, Stuck Tickets (> 3 days, configurable threshold), Overdue requests, Resolved this week, Pending onboarding.
- **One-Click Approval Queue**: Approve or reject requests needing professor sign-off.
- **Interactive Visual Charts**: Tickets by Status, Tickets by Category, Sub-Admin Workload, and Top Tags.
- **Stuck Tickets Alert**: Identifies requests with no activity for > N days, showing exactly who they are waiting on.
- **Full Searchable Grid**: Filter by status, category, priority, tag, assignee, requester, and dates.

---

## Running Backend Pytest Suite

Run all 33 tests with:

```bash
cd backend
pytest -v
```

### Test Coverage Highlights:
- `test_auth.py`: PENDING users blocked from login, INACTIVE users blocked, JWT token issuance and `/me` validation.
- `test_permissions.py`: Regular users cannot see other users' tickets, cannot fulfill tickets, sub-admins restricted to their domains, professor has universal access, only professor can approve or manage users.
- `test_transitions.py`: Valid state transitions succeed, invalid transitions return 400, required note validation (< 5 chars rejected with 422), creator-only close rules.
- `test_activity_log.py`: Auto-logs ticket creation, status changes, and assignments with notes; verifies no PUT/DELETE endpoints exist (append-only integrity).
- `test_tickets.py`: Category auto-assignment to default sub-admin, automatic `waiting_on` updates, tag modifications and permissions, tag search, dashboard counts.

---

## Switching to PostgreSQL

The codebase is built with standard SQLAlchemy 2.0 and supports PostgreSQL by changing only the `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/lab_tracker
```

No code modifications are required.
