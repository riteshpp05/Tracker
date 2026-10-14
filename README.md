# Shende Industries — Enterprise Portal

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Architecture](https://img.shields.io/badge/Architecture-Clean%20Monorepo-indigo)
![Status](https://img.shields.io/badge/Production-Ready-success)

**Unified Enterprise Operations & Corporate Portal**  
*Industrial Automation • Multi-Axis CNC Machining • Power & Motion Controls • Aerospace & Defense Engineering*

</div>

---

## 1. Executive Summary

**Shende Industries Enterprise Portal** is a production-grade, full-stack management platform engineered for precision manufacturing, technical consulting, and industrial engineering enterprises. 

The platform merges a public-facing corporate website and careers portal with an authenticated, role-governed enterprise workspace supporting four primary operational personas:
1. **Super Admin**: Enterprise system governance, employee access control, client accounts, project masters, ticket assignments, system settings, and tamper-evident audit logging.
2. **HR Administrator**: Workforce directory, recruitment Applicant Tracking System (ATS), **1-Click Candidate-to-Employee Onboarding**, leave balance management, and expense reimbursement reviews.
3. **Engineering Manager**: Team workload balancing, project deliverable scoping, ticket-to-engineer assignments, weekly timesheet verification queues, and team leave approvals.
4. **Employee Self-Service**: Weekly timesheet logging (0.25h increments, billable tracking), active tickets, annual leave applications, and business travel expense claims.

---

## 2. High-Level Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │          SHENDE INDUSTRIES ENTERPRISE PLATFORM         │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                              ┌───────────────────────────────┴───────────────────────────────┐
                              ▼                                                               ▼
  ┌────────────────────────────────────────────────────────┐      ┌────────────────────────────────────────────────────────┐
  │                 PUBLIC CORPORATE PORTAL                │      │             AUTHENTICATED ENTERPRISE WORKSPACE         │
  │ • Corporate Homepage & Industrial Divisions            │      │ • Role Dashboards: Admin, HR, Manager, Employee        │
  │ • Precision Engineering Capabilities & Certifications   │      │ • Workforce Directory & RBAC Access Matrix             │
  │ • Public Careers Board & Real-Time Job Listings        │      │ • Recruitment ATS & 1-Click Candidate Onboarding       │
  │ • Online Job Application Engine & Resume Uploads       │      │ • Timesheet Entry Grid (0.25h billable increments)     │
  │ • Corporate Contact & Technical Review Inquiries       │      │ • Multi-Tier Timesheet, Leave & Travel Approvals       │
  │ • Privacy, Legal, ITAR & IP Protection Policies       │      │ • Immutable Audit Trail & Historical Change Inspector  │
  └───────────────────────────┬────────────────────────────┘      └───────────────────────────┬────────────────────────────┘
                              │                                                               │
                              └───────────────────────────────┬───────────────────────────────┘
                                                              │
                                                              ▼
                                              ┌───────────────────────────────┐
                                              │      REACT 19 SPA CLIENT      │
                                              │    Vite 7 • Tailwind • Lenis  │
                                              │     Port: http://localhost:3000│
                                              └───────────────┬───────────────┘
                                                              │ REST API (/api/v1)
                                                              ▼
                                              ┌───────────────────────────────┐
                                              │    EXPRESS REST API SERVER    │
                                              │   Node.js • JWT • RBAC Guard  │
                                              │     Port: http://localhost:5000│
                                              └───────────────┬───────────────┘
                                                              │ pg Connection Pool
                                                              ▼
                                              ┌───────────────────────────────┐
                                              │     POSTGRESQL 16 DATABASE    │
                                              │  Consolidated Core Schema V1  │
                                              │     Port: localhost:5435      │
                                              └───────────────────────────────┘
```

---

## 3. Project Directory Structure

The repository is structured as a clean, standardized monorepo:

```
Tracker/
├── Backend/                            # Express.js REST API Server
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js             # PostgreSQL connection pool with transaction helpers
│   │   │   └── env.js                  # Validated environment configuration defaults
│   │   ├── controllers/
│   │   │   ├── timesheet/              # Modular timesheet logic (entry, approval, lookup)
│   │   │   ├── auditController.js      # Immutable audit trail & state diff queries
│   │   │   ├── authController.js       # Login, token refresh, and profile management
│   │   │   ├── clientController.js     # Client accounts & SPOC management
│   │   │   ├── dashboardController.js  # Calculated metrics across all 4 operational roles
│   │   │   ├── employeeController.js   # Workforce directory & employee code provisioning
│   │   │   ├── expenseController.js    # Travel expense reimbursement engine
│   │   │   ├── exportController.js     # Excel and CSV export generation via exceljs
│   │   │   ├── leaveController.js      # Annual leave applications & approval queue
│   │   │   ├── notificationController.js # In-app notification center
│   │   │   ├── projectController.js    # Client project master and milestones
│   │   │   ├── publicController.js     # Public job listings, applications & contact forms
│   │   │   ├── recruitmentController.js# ATS pipeline & 1-click candidate onboarding
│   │   │   ├── settingsController.js   # System-wide parameters and working hours
│   │   │   ├── ticketController.js     # Technical deliverable tickets and tasks
│   │   │   └── travelController.js     # Corporate travel authorizations
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js       # JWT validation & strict RBAC authorization
│   │   │   ├── errorHandler.js         # Sanitized exception & error handler
│   │   │   ├── rateLimiter.js          # API throttling & brute-force defense
│   │   │   └── uploadMiddleware.js     # Multer file storage (resumes & expense receipts)
│   │   ├── models/                     # Relational database models and queries
│   │   ├── routes/                     # Centralized API routes (/api/v1/...)
│   │   ├── services/                   # Notification, email, and audit log ingestion
│   │   ├── utils/                      # Time conversion, validation, and math utilities
│   │   └── server.js                   # Application bootstrap with CORS & Helmet security
│   ├── uploads/                        # Persistent storage for user uploads
│   ├── .env.example                    # Backend environment template
│   ├── Dockerfile                      # Production container image for API
│   ├── package.json                    # Backend dependencies & scripts
│   └── README.md                       # Backend-specific architecture guide
│
├── Frontend/                           # React 19 Single Page Application
│   ├── public/                         # Public static files and browser favicon
│   ├── src/
│   │   ├── assets/                     # Logos, diagrams, and corporate media
│   │   ├── components/
│   │   │   ├── admin/                  # Super Admin panels (Users, Clients, Projects, Logs)
│   │   │   ├── common/                 # Layout shell (Sidebar, TopNav, NotificationPopover)
│   │   │   ├── dashboards/             # Role KPI dashboards (Admin, HR, Manager, Employee)
│   │   │   ├── employee/               # Self-service tools (Weekly timesheets, Leaves, Travel)
│   │   │   ├── hr/                     # Recruitment ATS & 1-click candidate onboarding
│   │   │   ├── manager/                # Manager queues (Approvals, Team assignments)
│   │   │   ├── public/                 # Corporate website (Home, Careers, Apply, Contact)
│   │   │   └── ui/                     # Design tokens (Radix UI modals, buttons, badges)
│   │   ├── context/                    # AuthContext & ThemeContext
│   │   ├── hooks/                      # Custom React hooks
│   │   ├── lib/                        # CSS and class merge utilities (cn)
│   │   ├── services/                   # Axios HTTP client with auto-refresh interceptors
│   │   ├── styles/                     # Tailwind CSS and global styling tokens
│   │   ├── App.jsx                     # Top-level application shell
│   │   ├── routes.jsx                  # Centralized React Router v7 route definitions
│   │   └── main.jsx                    # React entrypoint with Lenis smooth scroll
│   ├── .env.example                    # Frontend environment template
│   ├── Dockerfile                      # Multi-stage production Nginx container
│   ├── nginx.conf                      # Production Nginx reverse proxy configuration
│   ├── package.json                    # Frontend dependencies & scripts
│   ├── tailwind.config.js              # Enterprise design token theme configuration
│   ├── vite.config.js                  # Vite configuration with /api development proxy
│   └── README.md                       # Frontend-specific architecture guide
│
├── database/                           # PostgreSQL 16 Database Management
│   ├── 01-shende-core-schema.sql       # Unified production core schema (13 modules)
│   ├── 02-seed-data.sql                # Seed dataset with bcrypt credentials & mock records
│   ├── legacy/                         # Archived historical patches and prototype scripts
│   └── README.md                       # Database schema documentation & restoration guide
│
├── docs/                               # Engineering Documentation & Audits
│   ├── IMPLEMENTATION_PLAN.md          # 11-phase modernization roadmap
│   └── PROJECT_AUDIT.md                # Comprehensive architectural & security audit
│
├── .gitignore                          # Global git ignore configuration
├── docker-compose.yml                  # Multi-container orchestration (DB, API, Web)
├── PROGRESS.md                         # Engineering execution and progress log
├── README.md                           # Master project documentation (this file)
└── TASKS.md                            # Task checklist and verification tracking
```

---

## 4. Pre-Configured Demo Credentials

The database is pre-seeded with tested user accounts across all four operational tiers:

| Role | Email | Password | Access Highlights |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@shendeindustries.com` | `Admin@Shende2026` | Enterprise configuration, user provisioning, client accounts, project masters, audit logs |
| **HR Admin** | `hr@shendeindustries.com` | `HR@Shende2026` | Workforce directory, recruitment ATS pipeline, 1-click candidate onboarding, leave balances |
| **Engineering Manager** | `manager@shendeindustries.com` | `Manager@Shende2026` | Project scope, deliverable tickets, team timesheet approvals, team leave approvals |
| **Employee Self-Service** | `employee@shendeindustries.com` | `Employee@Shende2026` | Weekly timesheet entry grid, assigned tickets, annual leave applications, expense claims |

> **Pro-Tip**: The login interface at `/login` features 1-click demo credential switcher buttons for rapid testing without manual typing.

---

## 5. Application Routes & Navigation

### Public Corporate Website
| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | Corporate Homepage | Executive summary, business divisions, core manufacturing capabilities |
| `/careers` | Careers Job Board | Database-backed public job listings with department & location filters |
| `/careers/:slug` | Job Detail & Apply | Job description, technical requirements, and online application submission |
| `/login` | Employee Sign-In | Secure portal authentication with 1-click demo switcher |

### Authenticated Workspaces
| Route | Access Roles | Key Functionality |
| :--- | :--- | :--- |
| `/admin/dashboard` | Admin | Executive KPI cards, department distribution, timesheet compliance |
| `/admin/users` | Admin, HR | Employee directory, role assignments, employee code provisioning |
| `/admin/clients` | Admin | Client accounts master, SPOC directory, active client status |
| `/admin/projects` | Admin | Client project master, estimated vs approved days, project managers |
| `/admin/tickets` | Admin, Manager | Deliverable ticket master, estimated hours, client/project linkage |
| `/admin/assignments` | Admin, Manager | Assignment matrix: ticket-to-engineer and ticket-to-manager allocation |
| `/admin/timesheet-approval`| Admin, Manager | Weekly timesheet verification, submission audits, approval/rejection |
| `/admin/audit-logs` | Admin | Tamper-proof audit trail, mutation diffs, authentication logs |
| `/admin/settings` | Admin | Working hours policy, weekend rules, system parameters |
| `/hr/dashboard` | HR, Admin | Headcount metrics, recruitment pipeline stats, pending leave requests |
| `/hr/recruitment` | HR, Admin | ATS pipeline (6 stages) & 1-click candidate-to-employee onboarding |
| `/hr/leaves` | HR, Admin | Organization-wide leave allocation, balance adjustments, time-off approvals |
| `/hr/expenses` | HR, Admin | Travel authorization queue and expense reimbursement claims |
| `/manager/dashboard` | Manager, Admin | Team workload allocation, project milestones, approval queues |
| `/manager/timesheet` | Manager | Manager self-service weekly timesheet logging |
| `/manager/approvals` | Manager | Dedicated team timesheet and leave approval queue |
| `/employee/dashboard`| All Roles | Personal weekly hours summary, active tickets, pending approvals |
| `/employee/timesheet`| All Roles | Interactive weekly timesheet entry grid (0.25h increments, billable tracking) |
| `/employee/leaves` | All Roles | Leave balance cards and time-off request submission modal |
| `/employee/expenses` | All Roles | Business travel requests and expense claim filing with receipts |

---

## 6. Quickstart & Local Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18.x or v20.x and `npm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended for PostgreSQL 16)

---

### Option A: Standard Local Development (Recommended)

#### Step 1: Start PostgreSQL via Docker Compose
From the project root:
```powershell
docker compose up -d db
```
*PostgreSQL starts on port `5435` with database `timetrakpro`. The database automatically initializes with `01-shende-core-schema.sql` and `02-seed-data.sql`.*

#### Step 2: Start the Backend API Server
```powershell
cd Backend
npm install
node src/server.js
```
*API runs on `http://localhost:5000`. Verify health: `http://localhost:5000/health`.*

#### Step 3: Start the Frontend Application
In a separate terminal:
```powershell
cd Frontend
npm install
npm run dev
```
*Frontend dev server launches at `http://localhost:3000` with hot module replacement (HMR).*

---

### Option B: Full Docker Stack Deployment
To spin up all services (PostgreSQL, Backend API, and Nginx-served Frontend):
```powershell
docker compose up --build -d
```
Access the application:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **PostgreSQL Database**: `localhost:5435`

---

## 7. Environment Variables Reference

### Backend (`Backend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the Express REST server |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5435` | PostgreSQL port (5435 when using Docker Compose) |
| `DB_NAME` | `timetrakpro` | PostgreSQL database name |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `postgres` | Database password |
| `JWT_SECRET` | `super_secret_jwt_key_timesheet_2024` | Secret key for signing access tokens |
| `JWT_REFRESH_SECRET` | `super_secret_jwt_refresh_key_timesheet_2024`| Secret key for signing refresh tokens |
| `JWT_EXPIRE` | `1d` | Access token duration |
| `JWT_REFRESH_EXPIRE` | `7d` | Refresh token duration |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |

### Frontend (`Frontend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api` | Base path for API requests (proxied by Vite) |
| `VITE_BACKEND_URL` | `http://localhost:5000` | Target URL for Vite reverse proxy in development |

---

## 8. Database Architecture & Schema Management

The database utilizes **PostgreSQL 16** with strong referential integrity, UUID primary keys, and specialized constraints.

### Unified Modules (`database/01-shende-core-schema.sql`)
1. **Security & Organization**: `employees`, `user_roles`, `departments`, `designations`.
2. **Client & Account Master**: `client_master`, `client_spoc`.
3. **Project Management**: `project_master`, `project_assignments`.
4. **Deliverables & Tasks**: `ticket_master`, `task_master`, `ticket_assignments`.
5. **Timesheet Engine**: `daily_timesheet_entries`, `weekly_timesheet_rollups`, `timesheet_approvals`.
6. **Time-Off & Leave Management**: `leave_types`, `leave_balances`, `leave_requests`.
7. **Travel & Expenses**: `travel_requests`, `expense_claims`.
8. **Recruitment ATS**: `job_postings`, `job_applications`.
9. **Governance**: `company_settings`, `audit_logs`, `notifications`.

### Resetting & Re-Seeding the Database
If you need to reset the database to a clean state:
```powershell
# Stop and remove existing database container and volume:
docker compose down -v

# Start fresh database (auto-applies 01-shende-core-schema.sql and 02-seed-data.sql):
docker compose up -d db
```

---

## 9. Verification & Quality Standards

- **Backend API Health Check**: `GET /health` returns `200 OK` with server uptime.
- **Frontend Build Integrity**: `npm run build` compiles 2,700+ modules into optimized static chunks with 0 errors.
- **Scroll Isolation**: Modal dialogues and drawers apply `data-lenis-prevent="true"` to ensure seamless trackpad and mouse-wheel scrolling.
- **Security & Authorization**: All mutating endpoints enforce strict RBAC middleware and team scoping to eliminate horizontal IDOR vulnerabilities.

---

## 10. License & Intellectual Property

Copyright © 2026 **Shende Industries**. All rights reserved.  
Proprietary software for internal enterprise operations, multi-axis manufacturing coordination, and public corporate governance.
