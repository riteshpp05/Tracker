# Shende Industries Enterprise Portal — Backend API

Enterprise REST API server powering the **Shende Industries Enterprise Portal**. Built with Node.js (ES Modules), Express, PostgreSQL 16, JWT authentication, and strict Role-Based Access Control (RBAC).

---

## Architecture Overview

```
Backend/
├── src/
│   ├── config/
│   │   ├── database.js          # PostgreSQL connection pool with transaction helpers
│   │   └── env.js               # Validated environment configuration defaults
│   ├── controllers/
│   │   ├── timesheet/           # Granular timesheet handlers (entry, approval, lookup)
│   │   ├── adminProjectAssignmentController.js
│   │   ├── auditController.js   # Immutable audit trail and state diff inspector
│   │   ├── authController.js    # Login, token refresh, and profile management
│   │   ├── clientController.js  # Client accounts and SPOC directory
│   │   ├── dashboardController.js # Metric aggregators for all 4 roles
│   │   ├── employeeController.js # Workforce directory and credential provisioning
│   │   ├── expenseController.js # Expense claims and approval workflows
│   │   ├── exportController.js  # Excel/CSV generation via exceljs
│   │   ├── leaveController.js   # Leave balance tracking and multi-tier approvals
│   │   ├── notificationController.js # In-app notification center
│   │   ├── projectController.js # Client project master and milestones
│   │   ├── publicController.js  # Public job listings, applications, and contact
│   │   ├── recruitmentController.js # ATS pipeline & 1-click candidate onboarding
│   │   ├── reportController.js  # Management reporting analytics
│   │   ├── settingsController.js # Enterprise system settings and parameters
│   │   ├── ticketController.js  # Deliverable tickets and tasks
│   │   └── travelController.js  # Corporate travel authorization engine
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification, RBAC guard, and IDOR protection
│   │   ├── errorHandler.js      # Sanitized central error handling
│   │   ├── rateLimiter.js       # Request throttling and brute-force mitigation
│   │   └── uploadMiddleware.js  # Secure Multer file upload (resumes, receipts)
│   ├── models/                  # Database queries and relational access models
│   ├── routes/                  # Express route definitions mounted under /api/v1
│   ├── services/
│   │   ├── auditService.js      # Audit log ingestion with JSON diffing
│   │   ├── emailService.js      # Nodemailer transport for enterprise notifications
│   │   └── notificationService.js # In-app alert dispatch and status tracking
│   ├── utils/                   # Time math (HH:MM to minutes), dates, validators
│   └── server.js                # Express app entrypoint with security middleware
├── uploads/                     # Storage directory for resumes and expense receipts
├── .env.example                 # Environment variable template
├── check_users.js               # CLI utility: inspect database users
├── Dockerfile                   # Production container build with native build tools
├── get_admins.js                # CLI utility: list system administrators
├── hash_passwords.js            # CLI utility: migrate legacy plaintext passwords
├── package.json                 # Dependencies and start scripts
├── reset_admin.js               # CLI utility: reset Super Admin credentials
└── reset_all_passwords.js       # CLI utility: bulk reset test passwords
```

---

## Technology Stack

- **Runtime**: Node.js 18+ (ES Modules: `"type": "module"`)
- **Web Framework**: Express v4.18
- **Database Driver**: `pg` (node-postgres connection pool)
- **Security**:
  - `bcryptjs` / `bcrypt` for password hashing
  - `jsonwebtoken` for access and refresh tokens
  - `helmet` for HTTP security headers
  - `cors` with granular origin whitelisting
  - `express-rate-limit` for DDoS and brute-force defense
- **Utilities**: `exceljs`, `uuid`, `node-cron`, `nodemailer`, `compression`, `morgan`

---

## Getting Started

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Environment Variables
Create a `.env` file based on `.env.example`:
```powershell
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port on which Express listens |
| `NODE_ENV` | `development` | Runtime environment mode |
| `DB_HOST` | `localhost` | PostgreSQL database host |
| `DB_PORT` | `5435` | PostgreSQL database port (mapped port in Docker) |
| `DB_NAME` | `timetrakpro` | PostgreSQL database name |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `JWT_SECRET` | `...` | High-entropy secret for signing access tokens |
| `JWT_REFRESH_SECRET` | `...` | High-entropy secret for signing refresh tokens |
| `JWT_EXPIRE` | `1d` | Access token lifespan |
| `JWT_REFRESH_EXPIRE` | `7d` | Refresh token lifespan |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |

### 3. Start the Server
```powershell
# Production mode:
npm start

# Development mode (with live reload via nodemon):
npm run dev
```

### 4. Verify Health Check
Send a `GET` request to:
```
http://localhost:5000/health
```
Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-10-12T00:00:00.000Z",
  "uptime": 12.34
}
```

---

## Management Utilities

The backend includes standalone administrative scripts for maintenance:

```powershell
# Verify user records and role assignments
node check_users.js

# List all Super Admin and HR Admin accounts
node get_admins.js

# Hash any un-hashed plaintext passwords in the database
node hash_passwords.js

# Reset the Super Admin account (admin@shendeindustries.com / Admin@Shende2026)
node reset_admin.js

# Reset all demo user passwords to default test credentials
node reset_all_passwords.js
```
