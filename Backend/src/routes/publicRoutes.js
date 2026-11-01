import express from "express";
import {
  getCompanyInfo,
  getPublicJobs,
  getPublicJobDetail,
  submitJobApplication,
  submitContactInquiry,
  getPublicCareersJobs,
  getPublicCareersJobDetail,
  submitPublicCareersApplication,
  trackPublicCareersApplication,
} from "../controllers/publicController.js";

const router = express.Router();

router.get("/company-info", getCompanyInfo);
router.get("/jobs", getPublicJobs);
router.get("/jobs/:slug", getPublicJobDetail);
router.post("/applications", submitJobApplication);
router.post("/contact", submitContactInquiry);

// Section 3.2: Dedicated Public Careers ATS Endpoints
router.get("/careers/jobs", getPublicCareersJobs);
router.get("/careers/jobs/:id", getPublicCareersJobDetail);
router.post("/careers/apply", submitPublicCareersApplication);
router.get("/careers/track/:trackingCode", trackPublicCareersApplication);

export default router;
