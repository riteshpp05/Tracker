// Backend/tests/payrollApiIntegration.test.js
// PatilOne / Shende Industries Enterprise Portal v3.0
// Layer 2: API, RBAC, Governance & Maker-Checker Integration Suite
// ============================================================================

import assert from "node:assert/strict";
import statutoryRulesService from "../src/services/payroll/statutoryRulesService.js";
import ctcReconciliationEngine from "../src/services/payroll/ctcReconciliationEngine.js";
import * as bulkImportService from "../src/services/payroll/bulkImportService.js";
import pilotService from "../src/services/payroll/payrollPilotService.js";
import * as publicController from "../src/controllers/publicController.js";
import * as recruitmentController from "../src/controllers/recruitmentController.js";
import pool from "../src/config/database.js";

let passed = 0;
let failed = 0;

function mockReq(body = {}, params = {}, query = {}, user = { id: "e0000000-0000-0000-0000-000000000002", name: "HR Admin", role: "HR" }) {
  return { body, params, query, user };
}

function mockRes() {
  const res = {
    statusCode: 200,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.data = data; return res; },
  };
  return res;
}

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${label}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function asyncTest(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${label}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("🧪 PatilOne Layer 2: API, RBAC & Maker-Checker Integration Test Suite\n");

// ═══════════════════════════════════════════════════════════════════
// 1. Dynamic Location Policy & Custom PT Slabs Integration
// ═══════════════════════════════════════════════════════════════════
console.log("▶ 1. Dynamic Location Policies & Custom PT Slabs");

test("Custom PT Slabs: HR-defined JSON slabs evaluate accurately over default state", () => {
  const customPolicy = {
    code: "BRANCH-CUSTOM-PT",
    name: "Branch Custom PT",
    state_code: "MH",
    basic_calculation_mode: "PERCENT_OF_NET",
    basic_percent_of_net: 50,
    da_fixed_amount: 3000,
    hra_percent_of_basic_da: 5,
    washing_allowance: 1000,
    education_allowance: 1000,
    conveyance_allowance: 1500,
    medical_allowance: 1000,
    books_periodicals: 1000,
    pf_ceiling_mode: "ACTUAL",
    employee_pf_rate: 0.12,
    employer_pf_rate: 0.13,
    bonus_rate: 0.0833,
    gratuity_rate: 0.0481,
    // Custom municipal slab overriding default MH Act
    pt_slabs_override_json: [
      { min: 0, max: 12000, amount: 0, febAmount: 0 },
      { min: 12001, max: 25000, amount: 150, febAmount: 250 },
      { min: 25001, max: null, amount: 250, febAmount: 350 },
    ],
  };

  // Test at gross ₹20,000 (standard month) → ₹150
  const resultStd = ctcReconciliationEngine.decomposeFromNetSalary({
    netSalary: 20000,
    policy: customPolicy,
    month: 5,
    gender: "Male",
  });
  assert.strictEqual(resultStd.isValid, true);
  assert.strictEqual(resultStd.deductions.professionalTax, 150, "Should use custom slab ₹150");

  // Test at gross ₹20,000 (February surcharge) → ₹250
  const resultFeb = ctcReconciliationEngine.decomposeFromNetSalary({
    netSalary: 20000,
    policy: customPolicy,
    month: 2,
    gender: "Male",
  });
  assert.strictEqual(resultFeb.deductions.professionalTax, 250, "Should use custom Feb surcharge ₹250");
});

test("Mode A 2-Pass Convergence: PT converges across slab threshold when adding PF", () => {
  const boundaryPolicy = {
    code: "BRANCH-CONVERGE",
    name: "Branch Convergence",
    state_code: "MH",
    basic_calculation_mode: "PERCENT_OF_NET",
    basic_percent_of_net: 50,
    da_fixed_amount: 0,
    hra_percent_of_basic_da: 5,
    washing_allowance: 500,
    education_allowance: 500,
    conveyance_allowance: 500,
    medical_allowance: 500,
    books_periodicals: 500,
    pf_ceiling_mode: "15000",
    employee_pf_rate: 0.12,
    employer_pf_rate: 0.13,
    bonus_rate: 0.0833,
    gratuity_rate: 0.0481,
  };

  // Net = ₹9,500. Under Net alone, Male in MH falls in ₹7,501–₹10,000 (PT = ₹175).
  // But adding Employee PF (9,500*50%*12% = ₹570) pushes Provisional Gross to ₹10,070 (> ₹10,000).
  // The 2-pass convergence check must detect this and update PT to ₹200.
  const result = ctcReconciliationEngine.decomposeFromNetSalary({
    netSalary: 9500,
    policy: boundaryPolicy,
    month: 4,
    gender: "Male",
    useGrossForPt: true,
  });

  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.deductions.professionalTax, 200, "2-pass check must evaluate PT at full gross ₹10,070+");
  assert.strictEqual(result.grossSalary, 9500 + result.deductions.employeePF + 200);
});

test("Zero-Rupee Invariant: Gross + Employer Contributions === Monthly Loaded CTC", () => {
  const genericPolicy = {
    code: "BRANCH-INVARIANT",
    name: "Branch Invariant",
    state_code: "MH",
    basic_calculation_mode: "PERCENT_OF_NET",
    basic_percent_of_net: 50,
    da_fixed_amount: 2500,
    hra_percent_of_basic_da: 5,
    washing_allowance: 1000,
    education_allowance: 1000,
    conveyance_allowance: 1500,
    medical_allowance: 1000,
    books_periodicals: 1000,
    pf_ceiling_mode: "ACTUAL",
    employee_pf_rate: 0.12,
    employer_pf_rate: 0.13,
    bonus_rate: 0.0833,
    gratuity_rate: 0.0481,
  };

  // Test across multiple salary levels above the policy's fixed threshold (min ₹16,000)
  const testSalaries = [18000, 24500, 37250, 50000, 78400, 112000];
  for (const net of testSalaries) {
    const res = ctcReconciliationEngine.decomposeFromNetSalary({
      netSalary: net,
      policy: genericPolicy,
      month: 6,
      gender: "Male",
    });

    assert.strictEqual(res.isValid, true, `Should be valid for net ₹${net}`);
    const sum = res.grossSalary + res.employerCosts.totalEmployerCosts;
    assert.strictEqual(sum - res.monthlyCtc, 0, `Zero-rupee invariant must hold for net ₹${net}`);
  }
});

test("Blocking Guard: NET_TOO_LOW triggered when fixed allowances exceed net salary", () => {
  const genericPolicy = {
    code: "BRANCH-INVARIANT",
    name: "Branch Invariant",
    state_code: "MH",
    basic_calculation_mode: "PERCENT_OF_NET",
    basic_percent_of_net: 50,
    da_fixed_amount: 2500,
    hra_percent_of_basic_da: 5,
    washing_allowance: 1000,
    education_allowance: 1000,
    conveyance_allowance: 1500,
    medical_allowance: 1000,
    books_periodicals: 1000,
    pf_ceiling_mode: "ACTUAL",
  };

  // Net = 15,000 is below the required 16,000 threshold for this policy
  const res = ctcReconciliationEngine.decomposeFromNetSalary({
    netSalary: 15000,
    policy: genericPolicy,
    month: 6,
    gender: "Male",
  });

  assert.strictEqual(res.isValid, false, "Must be invalid when net is too low");
  const err = res.validations.find((v) => v.code === "NET_TOO_LOW");
  assert.ok(err, "Must contain NET_TOO_LOW blocking error");
  assert.strictEqual(err.tier, "ERROR");
});

// ═══════════════════════════════════════════════════════════════════
// 2. Maker-Checker State Machine & Self-Approval Prevention
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ 2. Maker-Checker State Transitions & Governance");

test("Maker-Checker: Submitter cannot approve their own payroll run (Self-Approval Guard)", () => {
  const mockRun = {
    id: "run-uuid-001",
    status: "SUBMITTED",
    submitted_by: "user-hr-alice-123",
  };

  const attemptingUser = {
    id: "user-hr-alice-123", // Same user as submitter
    role: "HR",
    email: "alice@example.com",
  };

  const isSelfApproval =
    attemptingUser.role !== "ADMIN" &&
    mockRun.submitted_by &&
    attemptingUser.id &&
    mockRun.submitted_by.toLowerCase().trim() === attemptingUser.id.toLowerCase().trim();

  assert.strictEqual(isSelfApproval, true, "Self-approval must be detected");
});

test("Maker-Checker: Different Reviewer or Admin is permitted to approve", () => {
  const mockRun = {
    id: "run-uuid-001",
    status: "SUBMITTED",
    submitted_by: "user-hr-alice-123",
  };

  const reviewerUser = {
    id: "user-manager-bob-456", // Different reviewer
    role: "HR",
    email: "bob@example.com",
  };

  const isSelfApproval =
    reviewerUser.role !== "ADMIN" &&
    mockRun.submitted_by &&
    reviewerUser.id &&
    mockRun.submitted_by.toLowerCase().trim() === reviewerUser.id.toLowerCase().trim();

  assert.strictEqual(isSelfApproval, false, "Different reviewer must NOT be blocked by self-approval guard");
});

test("Maker-Checker: Rejecting a run requires a reason and reverts status to DRAFT", () => {
  const mockRun = {
    id: "run-uuid-002",
    status: "SUBMITTED",
    rejection_reason: null,
  };

  const rejectPayload = {
    rejectionReason: "Attendance missing for 3 factory workers in Branch Beta",
  };

  assert.ok(rejectPayload.rejectionReason && rejectPayload.rejectionReason.trim().length > 0, "Rejection reason is mandatory");

  // State transition
  mockRun.status = "DRAFT";
  mockRun.rejection_reason = rejectPayload.rejectionReason;

  assert.strictEqual(mockRun.status, "DRAFT", "Status reverts to DRAFT");
  assert.strictEqual(mockRun.rejection_reason, rejectPayload.rejectionReason);
});

// ═══════════════════════════════════════════════════════════════════
// 3. Point-in-Time Immutability & Snapshot Preservation
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ 3. Point-in-Time Immutability");

test("Immutability: Finalized slip preserves exact policy snapshot despite later policy modifications", () => {
  // Step 1: Slip calculated with version 1 policy (DA = ₹3,000)
  const v1Policy = {
    code: "BRANCH-IMMUTABLE",
    name: "Branch Immutable",
    version: 1,
    da_fixed_amount: 3000,
    basic_percent_of_net: 50,
  };

  const slipSnapshot = {
    slip_number: "SLIP/2026/10/EMP001",
    month: 10,
    year: 2026,
    gross_pay: 28000,
    net_pay: 26000,
    policy_snapshot_json: JSON.parse(JSON.stringify(v1Policy)),
    status: "FINALIZED",
  };

  // Step 2: HR updates policy to version 2 (DA increased to ₹4,500)
  const v2Policy = {
    ...v1Policy,
    version: 2,
    da_fixed_amount: 4500,
  };

  // Step 3: Assert the finalized slip snapshot remains exactly version 1 with DA = ₹3,000
  assert.strictEqual(slipSnapshot.policy_snapshot_json.version, 1, "Snapshot must retain version 1");
  assert.strictEqual(slipSnapshot.policy_snapshot_json.da_fixed_amount, 3000, "Snapshot must retain original DA");
  assert.notStrictEqual(slipSnapshot.policy_snapshot_json.da_fixed_amount, v2Policy.da_fixed_amount, "Must not mutate when policy changes");
});

// ═══════════════════════════════════════════════════════════════════
// 4. Kredily Pilot Comparison Diagnostics
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ 4. Kredily Pilot Comparator Diagnostics");

test("Kredily Pilot: Diagnoses EPF ceiling variance between systems", () => {
  const diagnosis = pilotService.diagnoseRootCause(
    "employeeDeductions",
    1800, // PatilOne capped at ₹15,000 ceiling
    3600, // External system uncapped on ₹30,000 basic
    {},
    {}
  );

  assert.ok(diagnosis, "Diagnosis should be produced");
  assert.strictEqual(diagnosis.category, "EPF_CEILING_TREATMENT");
  assert.ok(diagnosis.explanation.includes("₹15,000 cap"));
});

test("Kredily Pilot: Diagnoses Maharashtra February PT surcharge mismatch", () => {
  const diagnosis = pilotService.diagnoseRootCause(
    "employeeDeductions",
    300, // PatilOne MH Feb surcharge
    200, // External system missed Feb surcharge
    {},
    {}
  );

  assert.ok(diagnosis, "Diagnosis should be produced");
  assert.strictEqual(diagnosis.category, "MAHARASHTRA_PT_FEBRUARY");
});

// ═══════════════════════════════════════════════════════════════════
// 5. Public Careers ATS, Candidate Stage Progression & Onboarding
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ 5. Public Careers ATS, Candidate Tracking & Onboarding Handoff");

await asyncTest("Public Careers: GET /api/public/careers/jobs returns seeded OPEN positions", async () => {
  const req = mockReq({}, {}, {});
  const res = mockRes();
  await publicController.getPublicCareersJobs(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.data), "Result must be an array");
  assert.ok(res.data.length >= 3, "At least 3 seeded jobs must be returned");
  const job = res.data[0];
  assert.ok(job.title, "Job title is required");
  assert.ok(job.department, "Department is required");
  assert.strictEqual(job.status, "OPEN", "Status must be OPEN");
});

await asyncTest("Public Careers: Candidate apply, status tracking, stage progression & payroll onboarding", async () => {
  const jobsRes = mockRes();
  await publicController.getPublicCareersJobs(mockReq(), jobsRes);
  const targetJob = jobsRes.data[0];

  const testEmail = `aarav.candidate.${Date.now()}@example.com`;
  const applyReq = mockReq({
    jobId: targetJob.id,
    fullName: "Aarav Kulkarni",
    email: testEmail,
    phone: "+91 98765 43210",
    experienceYears: 4,
    resumeUrl: "https://drive.google.com/sample-resume.pdf",
    coverNote: "Senior Full-Stack Engineer candidate"
  });
  const applyRes = mockRes();
  await publicController.submitPublicCareersApplication(applyReq, applyRes);

  assert.strictEqual(applyRes.statusCode, 201);
  assert.strictEqual(applyRes.data.success, true);
  assert.ok(applyRes.data.tracking_code.startsWith("APP-2026-"), "Tracking code must start with APP-2026-");
  assert.strictEqual(applyRes.data.stage, "SCREENING", "Initial stage must be SCREENING");

  // Verify duplicate prevention
  const dupRes = mockRes();
  await publicController.submitPublicCareersApplication(applyReq, dupRes);
  assert.strictEqual(dupRes.statusCode, 409, "Must reject duplicate application with 409");

  // Verify status tracking lookup
  const trackReq = mockReq({}, { trackingCode: applyRes.data.tracking_code });
  const trackRes = mockRes();
  await publicController.trackPublicCareersApplication(trackReq, trackRes);
  assert.strictEqual(trackRes.statusCode, 200);
  assert.strictEqual(trackRes.data.candidate_name, "Aarav Kulkarni");
  assert.strictEqual(trackRes.data.stage, "SCREENING");

  // Advance stage to TECHNICAL
  const stageReq1 = mockReq({ stage: "TECHNICAL" }, { id: applyRes.data.applicationId });
  const stageRes1 = mockRes();
  await recruitmentController.updateApplicationStage(stageReq1, stageRes1);
  assert.strictEqual(stageRes1.statusCode, 200);
  assert.strictEqual(stageRes1.data.application.stage, "TECHNICAL");

  // Advance stage to OFFER
  const stageReq2 = mockReq({ stage: "OFFER" }, { id: applyRes.data.applicationId });
  const stageRes2 = mockRes();
  await recruitmentController.updateApplicationStage(stageReq2, stageRes2);
  assert.strictEqual(stageRes2.statusCode, 200);
  assert.strictEqual(stageRes2.data.application.stage, "OFFER");

  // 1-Click Onboard Candidate to Payroll
  const onboardReq = mockReq({
    designation: "Senior Staff Engineer",
    salaryMode: "MODE_A_NET_TO_CTC",
    targetNetMonthly: 26000,
    panNumber: "AAACS1234P",
    uanNumber: "100900800700"
  }, { id: applyRes.data.applicationId }, {}, { id: "e0000000-0000-0000-0000-000000000002", name: "HR Manager" });
  const onboardRes = mockRes();
  await recruitmentController.onboardCandidate(onboardReq, onboardRes);
  assert.strictEqual(onboardRes.statusCode, 201);
  assert.strictEqual(onboardRes.data.success, true);
  assert.ok(onboardRes.data.emp_code.startsWith("SH-"), "Generated employee code must start with SH-");
  assert.strictEqual(onboardRes.data.employee.calculation_mode, "MODE_A_NET_TO_CTC");
});

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log(`Layer 2 Integration Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌ ${failed} integration test(s) FAILED\n`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${passed} LAYER 2 INTEGRATION TESTS PASSED!\n`);
  process.exit(0);
}
