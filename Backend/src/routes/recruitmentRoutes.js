import express from "express";
import {
  getAllRecruitmentJobs,
  createJobPosting,
  updateJobPosting,
  getAllApplications,
  updateApplicationStage,
  onboardCandidate,
} from "../controllers/recruitmentController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles(["ADMIN", "HR"]));

router.get("/jobs", getAllRecruitmentJobs);
router.post("/jobs", createJobPosting);
router.patch("/jobs/:id", updateJobPosting);

router.get("/applications", getAllApplications);
router.patch("/applications/:id/stage", updateApplicationStage);
router.post("/applications/:id/onboard", onboardCandidate);

export default router;
