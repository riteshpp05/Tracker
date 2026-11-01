// Backend/src/routes/payrollRoutes.js
import express from "express";
import payrollController from "../controllers/payrollController.js";
import * as locationPolicyController from "../controllers/locationPolicyController.js";
import * as bulkImportController from "../controllers/bulkImportController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// All payroll routes require authenticated session
router.use(authenticateToken);

// ================================================================
// EMPLOYEE SELF-SERVICE (All authenticated users can access their own)
// ================================================================
router.get("/my-slips", payrollController.getMySalarySlips);
router.get("/slips/:id", payrollController.getSalarySlip);

// ================================================================
// HR & ADMIN RESTRICTED MANAGEMENT ENDPOINTS
// ================================================================

// 1. Components & Salary Structures
router.get("/components", authorizeRoles(["ADMIN", "HR"]), payrollController.getComponents);
router.get("/structures", authorizeRoles(["ADMIN", "HR"]), payrollController.getStructures);
router.post("/structures", authorizeRoles(["ADMIN", "HR"]), payrollController.createStructure);

// 2. Employee Compensation & Statutory Identifiers
router.get("/assignments", authorizeRoles(["ADMIN", "HR"]), payrollController.getAssignments);
router.post("/assignments", authorizeRoles(["ADMIN", "HR"]), payrollController.createAssignment);
router.put(
  "/employees/:employeeId/statutory-banking",
  authorizeRoles(["ADMIN", "HR"]),
  payrollController.updateEmployeeStatutoryBanking
);

// 3. Monthly Payroll Runs & Processing Wizard
router.get("/readiness", authorizeRoles(["ADMIN", "HR"]), payrollController.checkReadiness);
router.post("/runs/draft", authorizeRoles(["ADMIN", "HR"]), payrollController.calculateDraftRun);
router.get("/runs", authorizeRoles(["ADMIN", "HR"]), payrollController.getPayrollRuns);
router.get("/runs/:id", authorizeRoles(["ADMIN", "HR"]), payrollController.getPayrollRunById);

// 4. Workflow State Transitions (Submit, Approve, Reject, Finalize, Pay)
router.post("/runs/:id/submit", authorizeRoles(["ADMIN", "HR"]), payrollController.submitPayrollRun);
router.post("/runs/:id/approve", authorizeRoles(["ADMIN", "HR"]), payrollController.approvePayrollRun);
router.post("/runs/:id/reject", authorizeRoles(["ADMIN", "HR"]), payrollController.rejectPayrollRun);
router.post("/runs/:id/finalize", authorizeRoles(["ADMIN"]), payrollController.finalizePayrollRun);
router.post("/runs/:id/record-payment", authorizeRoles(["ADMIN", "HR"]), payrollController.recordPayment);

// 5. Payment File Generation & Statutory Reports
router.get("/runs/:id/bank-export", authorizeRoles(["ADMIN", "HR"]), payrollController.exportBankPaymentFile);
router.get("/reports/statutory", authorizeRoles(["ADMIN", "HR"]), payrollController.getStatutoryReports);

// 6. CTC Breakup Calculator & Reconciliation Engine
router.post("/calculate-ctc-breakup", authorizeRoles(["ADMIN", "HR"]), payrollController.calculateCtcBreakup.bind(payrollController));
router.post("/reconcile-ctc", authorizeRoles(["ADMIN", "HR"]), payrollController.reconcileCtc.bind(payrollController));

// 7. Payroll Pilot & Parallel Testing (Kredily Comparison Engine)
router.post("/pilot/kredily-compare", authorizeRoles(["ADMIN", "HR"]), payrollController.pilotCompareKredily.bind(payrollController));

// ================================================================
// 8. Location Policy Manager (HR-configurable per-branch payroll rules)
// ================================================================
// NOTE: /simulate must be registered BEFORE /:id to avoid route shadowing
router.post(
  "/location-policies/simulate",
  authorizeRoles(["ADMIN", "HR"]),
  locationPolicyController.simulateCtc
);
router.get(
  "/location-policies",
  authorizeRoles(["ADMIN", "HR"]),
  locationPolicyController.listPolicies
);
router.post(
  "/location-policies",
  authorizeRoles(["ADMIN", "HR"]),
  locationPolicyController.createPolicy
);
router.get(
  "/location-policies/:id",
  authorizeRoles(["ADMIN", "HR"]),
  locationPolicyController.getPolicy
);
router.put(
  "/location-policies/:id",
  authorizeRoles(["ADMIN", "HR"]),
  locationPolicyController.updatePolicy
);
router.delete(
  "/location-policies/:id",
  authorizeRoles(["ADMIN", "HR"]),
  locationPolicyController.deletePolicy
);
router.get(
  "/location-policies/:id/history",
  authorizeRoles(["ADMIN", "HR"]),
  locationPolicyController.getPolicyHistory
);
router.post(
  "/location-policies/:id/assign-employees",
  authorizeRoles(["ADMIN", "HR"]),
  locationPolicyController.assignEmployees
);

// ================================================================
// 9. Bulk Import & Staging (300+ Employee Multi-Branch Onboarding)
// ================================================================
const rawBodyParser = express.raw({
  type: [
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
    "text/plain",
    "*/*", // allow raw stream/buffer upload from frontend fetch/axios
  ],
  limit: "15mb",
});

router.get(
  "/bulk-import/template",
  authorizeRoles(["ADMIN", "HR"]),
  bulkImportController.downloadTemplate
);
router.post(
  "/bulk-import/preview",
  authorizeRoles(["ADMIN", "HR"]),
  rawBodyParser,
  bulkImportController.previewImport
);
router.post(
  "/bulk-import",
  authorizeRoles(["ADMIN", "HR"]),
  rawBodyParser,
  bulkImportController.executeImport
);
router.get(
  "/bulk-import/staging",
  authorizeRoles(["ADMIN", "HR"]),
  bulkImportController.listStagedRecords
);

export default router;
