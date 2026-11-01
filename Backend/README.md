# Shende Industries Enterprise Portal — Backend Architecture

Enterprise REST API server powering the **Shende Industries Enterprise Portal (PatilOne / TimeTrakPro v3.0)**. Built with Node.js (ES Modules), Express, PostgreSQL 16, JWT authentication, and strict Role-Based Access Control (RBAC).

---

## 1. Directory Architecture

```
Backend/
├── src/
│   ├── config/
│   │   └── database.js               # PostgreSQL connection pool with transaction helpers
│   ├── controllers/
│   │   ├── timesheet/                # Granular timesheet handlers (entry, approval, lookup)
│   │   │   ├── approvalController.js # Multi-tier timesheet review and approval state transitions
│   │   │   ├── entryController.js    # Daily entry mutations and timesheet rollups
│   │   │   └── lookupController.js   # Project, ticket, and department lookup helpers
│   │   ├── adminProjectAssignmentController.js
│   │   ├── attendanceController.js   # Biometric and geofenced attendance tracking
│   │   ├── auditController.js        # Immutable audit trail and state diff queries
│   │   ├── authController.js         # Login, token refresh, and profile management
│   │   ├── bulkImportController.js   # Bulk 300+ employee batch parsing & stress calculator
│   │   ├── clientController.js       # Client accounts and SPOC directory
│   │   ├── dashboardController.js    # Metric aggregators for all 4 operational roles
│   │   ├── dbBackup.js               # Scheduled PostgreSQL backup job runner
│   │   ├── emailController.js        # Automated email dispatch and digest cron jobs
│   │   ├── employeeController.js     # Workforce directory and credential provisioning
│   │   ├── enterpriseController.js   # Corporate multi-branch holiday calendar & notice board
│   │   ├── expenseController.js      # Travel expense claims and approval workflows
│   │   ├── exportController.js       # Excel/CSV generation via exceljs
│   │   ├── leaveController.js        # Annual leave balance tracking and approvals
│   │   ├── locationPolicyController.js # Multi-branch dynamic location policies & versioning
│   │   ├── managerTicketAssignmentController.js
│   │   ├── notificationController.js # In-app notification center
│   │   ├── payrollController.js      # Monthly payroll wizard & Maker-Checker state machine
│   │   ├── projectAssignmentController.js
│   │   ├── projectController.js      # Client project master and milestones
│   │   ├── publicController.js       # Public website and contact submissions
│   │   ├── recruitmentController.js  # ATS pipeline & 1-click candidate onboarding
│   │   ├── reportController.js       # Management reporting and billability analytics
│   │   ├── settingsController.js     # Enterprise system settings and working hours
│   │   ├── taskController.js         # Granular project task master
│   │   ├── ticketAssignmentController.js
│   │   ├── ticketController.js       # Deliverable tickets and tasks
│   │   ├── timesheetReportController.js # Detailed timesheet compliance reports
│   │   └── travelController.js       # Corporate travel authorizations
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT verification, RBAC guard, and IDOR protection
│   │   ├── errorHandler.js           # Centralized sanitized exception handler
│   │   └── uploadMiddleware.js       # Secure Multer file upload (resumes, receipts)
│   ├── models/
│   │   └── Client.js                 # Client master Data Access Object (DAO)
│   ├── routes/                       # Centralized Express route definitions (/api/...)
│   │   └── index.js                  # Central root router mounting all domain sub-routers
│   ├── services/
│   │   ├── emailService.js           # Nodemailer transport for enterprise notifications
│   │   ├── exportServices.js         # Tabular data export services
│   │   ├── geofenceService.js        # Attendance geofence radius calculation
│   │   ├── notificationService.js    # In-app alert dispatch and status tracking
│   │   └── payroll/                  # PatilOne Core Statutory Payroll Engine
│   │       ├── bankPaymentExportService.js # NEFT/RTGS CSV generator with injection prevention
│   │       ├── bulkImportService.js  # CSV workforce batch parser & pre-validation engine
│   │       ├── ctcReconciliationEngine.js # Zero-Rupee Reconciliation invariant & Mode A engine
│   │       ├── locationPolicyService.js # Multi-branch policy snapshots & custom PT slab evaluator
│   │       ├── payrollCalculationEngine.js # Gross-to-net waterfall & proration engine
│   │       ├── payrollInputCollector.js # Timesheet hours, attendance, and leave proration
│   │       ├── payrollMockData.js    # Fallback seed state for demo simulation
│   │       ├── payrollPilotService.js# Side-by-side Kredily shadow run delta analyzer
│   │       ├── payrollValidationService.js # Pre-flight payroll calculation readiness guards
│   │       └── statutoryRulesService.js # FY 2026-27 Sec 87A rebate, EPF, ESIC, Multi-State PT
│   ├── utils/
│   │   ├── bcrypt.js                 # Password hashing with standard salt rounds
│   │   ├── recalculationHelper.js    # Timesheet recalculation helper
│   │   └── timeUtils.js              # Time conversion (minutes to HH:MM, work hours)
│   └── server.js                     # Express application bootstrap with Helmet, CORS, and routing
├── tests/
│   ├── coreModulesApi.test.js        # Core API endpoint regression suite
│   ├── payrollApiIntegration.test.js # Layer 2 API, RBAC & Maker-Checker integration tests
│   └── payrollEngine.test.js         # 102 statutory rule and payroll engine unit tests
├── uploads/                          # Persistent storage for user resumes and receipts
├── .env.example                      # Backend environment template
├── Dockerfile                        # Multi-stage production container image
└── package.json                      # Backend dependencies & npm scripts
```

---

## 2. Statutory Engine & Compliance Standards

- **Income Tax TDS (Section 192):** Fully compliant with New Tax Regime for **FY 2026-27 / AY 2026-27**, enforcing the ₹12,00,000 Section 87A rebate ceiling and ₹75,000 standard deduction.
- **EPF & EPS:** Strict statutory wage ceiling of ₹15,000/mo (EPF ₹1,800/mo, EPS ₹1,250/mo), post-2014 EPS exclusion rule for joiners with basic > ₹15,000, and EDLI capped at ₹75/mo.
- **ESIC:** Gross wage eligibility threshold of ₹21,000/mo, Rule 50 contribution period continuity proviso, and `Math.round` symmetric integer rounding.
- **Multi-State Professional Tax:** Maharashtra standard slabs with February ₹300 surcharge and female exemption (gross &le; ₹25,000), Madhya Pradesh, and Karnataka state rules.
- **Zero-Rupee Reconciliation:**
  $$\text{Gross Salary} + \text{Total Employer Contributions} - \text{Monthly Loaded CTC} = 0.00$$

---

## 3. Running Backend Tests

```powershell
# Run payroll engine unit tests (102 tests):
node tests/payrollEngine.test.js

# Run API & Maker-Checker integration tests (12 tests):
node tests/payrollApiIntegration.test.js

# Run all test suites:
npm test
```
