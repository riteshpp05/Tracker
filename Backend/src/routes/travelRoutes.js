import express from "express";
import {
  getMyTravelRequests,
  submitTravelRequest,
  getPendingTravelApprovals,
  approveTravelRequest,
  rejectTravelRequest,
} from "../controllers/travelController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/my-requests", getMyTravelRequests);
router.post("/request", submitTravelRequest);

router.get("/pending-approvals", authorizeRoles(["ADMIN", "HR", "MANAGER"]), getPendingTravelApprovals);
router.post("/approve/:id", authorizeRoles(["ADMIN", "HR", "MANAGER"]), approveTravelRequest);
router.post("/reject/:id", authorizeRoles(["ADMIN", "HR", "MANAGER"]), rejectTravelRequest);

export default router;
