// Backend/src/routes/payrollRoutes.js
import express from "express";
import payrollController from "../controllers/payrollController.js";
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

// 4. Workflow State Transitions (Submit, Approve, Finalize, Pay)
router.post("/runs/:id/submit", authorizeRoles(["ADMIN", "HR"]), payrollController.submitPayrollRun);
router.post("/runs/:id/approve", authorizeRoles(["ADMIN", "HR"]), payrollController.approvePayrollRun);
router.post("/runs/:id/finalize", authorizeRoles(["ADMIN"]), payrollController.finalizePayrollRun);
router.post("/runs/:id/record-payment", authorizeRoles(["ADMIN", "HR"]), payrollController.recordPayment);

// 5. Payment File Generation & Statutory Reports
router.get("/runs/:id/bank-export", authorizeRoles(["ADMIN", "HR"]), payrollController.exportBankPaymentFile);
router.get("/reports/statutory", authorizeRoles(["ADMIN", "HR"]), payrollController.getStatutoryReports);

// 6. CTC Breakup Calculator — Zero-mismatch reverse engine (no DB required)
router.post("/calculate-ctc-breakup", authorizeRoles(["ADMIN", "HR"]), payrollController.calculateCtcBreakup.bind(payrollController));

export default router;
