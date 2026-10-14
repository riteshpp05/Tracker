import express from "express";
import {
  getLeaveTypes,
  getMyBalances,
  getMyRequests,
  applyLeave,
  getPendingLeaveApprovals,
  approveLeave,
  rejectLeave,
} from "../controllers/leaveController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/types", getLeaveTypes);
router.get("/my-balances", getMyBalances);
router.get("/my-requests", getMyRequests);
router.post("/apply", applyLeave);

// Manager & HR/Admin approval endpoints
router.get("/pending-approvals", authorizeRoles(["ADMIN", "HR", "MANAGER"]), getPendingLeaveApprovals);
router.post("/approve/:id", authorizeRoles(["ADMIN", "HR", "MANAGER"]), approveLeave);
router.post("/reject/:id", authorizeRoles(["ADMIN", "HR", "MANAGER"]), rejectLeave);

export default router;
