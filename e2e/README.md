# End-to-End (E2E) Verification & Visual Audit Suite

Automated Playwright testing framework and visual regression capture suite for the **Shende Industries Enterprise Portal (PatilOne / TimeTrakPro v3.0)**.

---

## 1. Test Architecture

The E2E suite consists of two primary test specifications:

1. **Full Lifecycle Verification Suite (`e2e/patilone-full-lifecycle.spec.js`)**:
   - Deterministic multi-persona execution across all 4 operational tiers.
   - Visitor job application &rarr; HR review & stage advancement &rarr; 1-click active payroll onboarding.
   - Dynamic location policy configuration & live split-pane waterfall simulator.
   - Corporate multi-branch holiday calendar synchronization.
   - Bulk 300+ workforce stress test & Kredily shadow run comparison.
   - Maker-Checker 4-tier state machine (Draft &rarr; Submit &rarr; Approve &rarr; Export).
   - Strict RBAC access guard interception.

2. **Visual Audit & Screenshot Suite (`e2e/visual-audit-and-screenshots.spec.js`)**:
   - Comprehensive UI verification capturing high-resolution PNG screenshots of all 26 core screens.
   - Verified at 1280x800 resolution with full network idle state settlement.
   - Automated storage into `e2e/screenshots/`.

---

## 2. Screenshot Directory Reference (`e2e/screenshots/`)

| File | Module / Screen Name | Persona |
| :--- | :--- | :--- |
| `01-login-screen.png` | Side-by-Side Enterprise Login Console | Public / Internal |
| `02-login-persona-switch.png` | 1-Click Interactive Persona Switcher | Public / Internal |
| `03-public-careers-portal.png` | Public Careers Job Board | External Candidate |
| `04-public-careers-apply-drawer.png` | Job Application Sliding Drawer | External Candidate |
| `05-public-careers-submission-success.png` | Application Confirmation & Tracking Code | External Candidate |
| `06-public-careers-tracking-status.png` | Real-Time Candidate Status Tracker | External Candidate |
| `07-hr-dashboard.png` | HR Operations Mission Control Dashboard | HR Admin |
| `08-recruitment-pipeline.png` | Multi-Stage ATS Kanban Board | HR Admin |
| `09-recruitment-advance-stages.png` | Candidate Stage Advancement (Shortlist &rarr; Offer) | HR Admin |
| `10-recruitment-1click-onboard-modal.png` | 1-Click Candidate-to-Payroll Onboarding | HR Admin |
| `11-admin-user-management.png` | Workforce Directory & User Management | Super Admin |
| `12-admin-create-hr-modal.png` | Provision New HR Lead User Modal | Super Admin |
| `13-corporate-holiday-calendar.png` | Multi-Branch Corporate Holiday Calendar | HR / Admin |
| `14-create-holiday-modal.png` | Interactive Add Company Holiday Modal | HR / Admin |
| `15-holiday-created-verified.png` | Real-Time Holiday Calendar Verification | HR / Admin |
| `16-location-policies-studio.png` | Dynamic Multi-Branch Location Policies Studio | HR / Admin |
| `17-location-policy-version-history.png` | Point-in-Time Policy Version History Modal | HR / Admin |
| `18-ctc-breakup-simulator.png` | CTC Breakup Simulator & Waterfall Matching | HR / Admin |
| `19-bulk-300-employee-import.png` | Bulk 300+ Workforce Batch Generator | HR / Admin |
| `20-kredily-pilot-comparator.png` | Kredily Shadow Run Pilot Comparator | HR / Admin |
| `21-monthly-payroll-wizard-draft.png` | Monthly Payroll Wizard (Draft Calculations) | HR Maker |
| `22-maker-checker-submission.png` | Maker Submission for Governance Review | HR Maker |
| `23-admin-payroll-checker-approval.png` | Admin Checker Approval & Payout Finalization | Admin Checker |
| `24-employee-self-service-payslips.png` | Employee Self-Service My Salary Slips | Employee |
| `25-employee-payslip-breakdown-modal.png` | Detailed Payslip Statement Modal | Employee |
| `26-employee-rbac-restriction.png` | Restricted Route RBAC Interception & Redirect | Employee |

---

## 3. Running E2E Tests

Prerequisites: Ensure Backend (`localhost:5000`) and Frontend (`localhost:3000`) are running, or let Playwright auto-spawn them via `playwright.config.js`.

```powershell
# Run full lifecycle verification suite:
npx playwright test e2e/patilone-full-lifecycle.spec.js

# Run visual audit & screenshot generation suite:
npx playwright test e2e/visual-audit-and-screenshots.spec.js

# Run all E2E tests:
npx playwright test
```
