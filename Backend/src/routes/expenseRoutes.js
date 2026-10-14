import express from "express";
import {
  getMyExpenseClaims,
  submitExpenseClaim,
  getPendingExpenseApprovals,
  approveExpenseClaim,
  rejectExpenseClaim,
  markReimbursed,
} from "../controllers/expenseController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/my-claims", getMyExpenseClaims);
router.post("/claim", submitExpenseClaim);

router.get("/pending-approvals", authorizeRoles(["ADMIN", "HR", "MANAGER"]), getPendingExpenseApprovals);
router.post("/approve/:id", authorizeRoles(["ADMIN", "HR", "MANAGER"]), approveExpenseClaim);
router.post("/reject/:id", authorizeRoles(["ADMIN", "HR", "MANAGER"]), rejectExpenseClaim);
router.patch("/reimburse/:id", authorizeRoles(["ADMIN", "HR"]), markReimbursed);

export default router;
