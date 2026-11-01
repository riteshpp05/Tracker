# Shende Industries Enterprise Portal — Frontend Architecture

The enterprise Single Page Application (SPA) for the **Shende Industries Enterprise Portal (PatilOne / TimeTrakPro v3.0)**. Engineered with React 19, Vite 7, Tailwind CSS, Framer Motion, and Radix UI primitives with smooth Lenis scrolling.

---

## 1. Directory Architecture

```
Frontend/
├── public/                 # Static public assets, favicon, and brand marks
├── src/
│   ├── assets/             # Brand vector graphics, diagram templates, and icons
│   ├── components/
│   │   ├── admin/          # Super Admin panels (Users, Clients, Projects, Audit Logs, Settings)
│   │   │   ├── AttendanceMasterPage.jsx # Employee shift and biometric master
│   │   │   ├── AuditLogsPage.jsx        # Immutable audit log inspector
│   │   │   └── UserManagement.jsx       # Employee directory and code provisioning
│   │   ├── attendance/     # Cloudstine enterprise attendance tracking dashboard
│   │   ├── common/         # Layout components (Sidebar, TopNav, Profile, Notifications)
│   │   ├── dashboards/     # Dedicated role KPI dashboards (Admin, HR, Manager, Employee)
│   │   ├── employee/       # Employee self-service (Timesheets, Leaves, Expenses, Tickets)
│   │   ├── enterprise/     # Enterprise suite (CompanyHolidaysPage, NoticeBoard, PolicyDocs)
│   │   ├── hr/             # Recruitment ATS pipeline and 1-click candidate onboarding
│   │   ├── manager/        # Manager queues (Approvals, Team tickets, Workload allocation)
│   │   ├── payroll/        # PatilOne v3.0 Enterprise Payroll Suite
│   │   │   ├── BulkImportPage.jsx            # Bulk 300+ employee batch generation & pre-validation
│   │   │   ├── CtcMatchingSimulatorPage.jsx  # CTC matching engine & waterfall simulator
│   │   │   ├── EmployeePayslipsPage.jsx      # Employee payslip history & downloadable slips
│   │   │   ├── EmployeeSalariesPage.jsx      # Employee active salary assignments
│   │   │   ├── KredilyPilotPage.jsx          # Kredily shadow run comparison & delta diagnostics
│   │   │   ├── LocationPoliciesPage.jsx      # Dynamic multi-branch policy studio & version history
│   │   │   ├── MonthlyPayrollPage.jsx        # Monthly payroll processing & Maker-Checker review
│   │   │   ├── PayrollDashboard.jsx          # Payroll operational overview & readiness telemetry
│   │   │   ├── PayslipModal.jsx              # High-fidelity printable payslip modal
│   │   │   ├── SalaryStructuresPage.jsx      # Base salary component configuration
│   │   │   └── StatutoryReportsPage.jsx      # EPF ECR, ESIC, and PT statutory challans
│   │   ├── public/         # Public corporate website (Home, About, Services, Careers, Apply, Contact)
│   │   ├── ui/             # Radix UI design tokens (Button, Dialog, Card, Badge, Table, Popover, Select, etc.)
│   │   ├── Layout.jsx      # App shell with responsive sidebar navigation
│   │   └── Login.jsx       # Side-by-side enterprise login console with live telemetry & persona switchers
│   ├── context/            # Global React context providers (AuthContext, ThemeContext)
│   ├── hooks/              # Custom React hooks (useAuth, useNotifications)
│   ├── lib/                # Utility helpers, Tailwind merge, clsx class utilities (cn)
│   ├── services/           # Axios API client with automatic token refresh interceptors
│   ├── styles/             # Global CSS, Tailwind layers, and design token definitions
│   ├── types/              # Domain constants (UserRoles, TimesheetStatuses, PayrollStatuses, ApplicationStages)
│   ├── utils/              # Time conversions, currency formatters, and date utilities
│   ├── App.jsx             # Top-level application component with global providers
│   ├── routes.jsx          # Centralized React Router v7 route definitions with RBAC guards
│   └── main.jsx            # React root mount with Lenis smooth scroll provider
├── .env.example            # Frontend environment template
├── Dockerfile              # Multi-stage production Nginx container
├── nginx.conf              # Production Nginx reverse proxy configuration
├── package.json            # Dependencies and npm script definitions
├── tailwind.config.js      # Custom theme, typography, and color tokens
└── vite.config.js          # Vite build, aliases, and development proxy configuration
```

---

## 2. Key UI/UX Capabilities

1. **Side-by-Side Enterprise Login Console:**
   - Left: Minimalist authentication console with 1-click persona switchers (`Admin`, `HR Specialist`, `Module Lead`, `Staff Member`) for instant credential population.
   - Right: Dark mesh glow telemetry cards displaying live Zero-Rupee Reconciliation invariant, multi-branch facility policies, and 4-tier Maker-Checker governance stepper.
2. **Public Careers Portal & ATS Pipeline:**
   - External candidates can browse openings, apply with resumes, and track live status with an assigned code (`APP-YYYY-NNNN`).
   - HR can advance stages and 1-click onboard candidates into active payroll with auto-assigned salary structures.
3. **Scroll Isolation (`data-lenis-prevent="true"`):**
   - All modal dialogues, drawers, and nested scroll tables apply `data-lenis-prevent="true"` to isolate wheel and trackpad scroll events from global Lenis smoothing.

---

## 3. Production Build & Verification

```powershell
# Development mode:
npm run dev

# Production distribution build:
npm run build

# Preview production build:
npm run preview
```
