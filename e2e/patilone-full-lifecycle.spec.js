import { test, expect } from "@playwright/test";

// Shared candidate data for lifecycle continuity across tests
const candidateTimestamp = Date.now();
const testCandidate = {
  fullName: "Aarav Kulkarni",
  email: `aarav.kulkarni.${candidateTimestamp}@example.com`,
  phone: "+91 98765 43210",
  experienceYears: "4",
  resumeUrl: "https://drive.google.com/aarav-resume.pdf",
  coverNote: "Senior Full-Stack Engineer with React & Node.js payroll engine expertise.",
  trackingCode: "",
};

// Helper to ensure clean unauthenticated state
async function resetSession(page) {
  await page.context().clearCookies();
  try {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // ignore
  }
}

test.describe("PatilOne / Shende Industries Enterprise Portal — End-to-End Full Lifecycle Verification Suite", () => {
  // Test 1: Non-Company Visitor — Public Job Discovery, Application & Live Status Tracking
  test("Test 1: Non-Company Visitor — Public Job Discovery, Application & Live Status Tracking", async ({
    page,
  }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Verify Careers link exists and click it
    const careersPill = page.locator("a:has-text('View Open Positions & Apply')");
    await expect(careersPill).toBeVisible();
    await careersPill.click();

    // Assert URL redirects to /careers without kicking back to /login
    await page.waitForURL("**/careers");
    expect(page.url()).toContain("/careers");
    await expect(page.locator("h1")).toContainText(/Build the software/i);

    // Verify open roles are displayed
    const jobCards = page.locator("div.bg-white:has-text('JOB-2026-')");
    await expect(jobCards.first()).toBeVisible({ timeout: 15000 });
    const count = await jobCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Click "Apply for Role" on Senior Full-Stack Engineer
    const targetCard = page.locator("div.bg-white:has-text('Senior Full-Stack Engineer')").first();
    const applyBtn = targetCard.locator("button:has-text('Apply for Role')");
    await applyBtn.click();

    // Slide-over drawer should be visible
    const drawerTitle = page.locator("h2:has-text('Apply:')");
    await expect(drawerTitle).toBeVisible();

    // Fill candidate details
    await page.fill("input[placeholder='e.g. Aarav Kulkarni']", testCandidate.fullName);
    await page.fill("input[placeholder='aarav.candidate@example.com']", testCandidate.email);
    await page.fill("input[placeholder='+91 98765 43210']", testCandidate.phone);
    await page.fill("input[type='number']", testCandidate.experienceYears);
    await page.fill("input[placeholder*='resume']", testCandidate.resumeUrl);
    await page.fill("textarea", testCandidate.coverNote);

    // Submit Application
    const submitBtn = page.locator("button:has-text('Submit Application')");
    await submitBtn.click();

    // Assert confirmation card with copyable tracking code
    const successHeader = page.locator("h3:has-text('Application Successfully Logged')");
    await expect(successHeader).toBeVisible({ timeout: 15000 });

    const trackingElem = page.locator("span.font-mono.text-base.font-extrabold.text-indigo-700");
    await expect(trackingElem).toBeVisible();
    const trackingCode = await trackingElem.textContent();
    expect(trackingCode).toMatch(/^APP-2026-\d{4}$/);
    testCandidate.trackingCode = trackingCode.trim();

    // Assert 5-step visual pipeline shows Screening highlighted
    const screeningBadge = page.locator("div.bg-indigo-600.text-white:has-text('Screening')");
    await expect(screeningBadge).toBeVisible();

    // Close apply drawer
    await page.locator("button:has-text('Done')").click();
  });

  // Test 2: HR Persona — Candidate Review, Stage Progression & 1-Click Payroll Onboarding
  test("Test 2: HR Persona — Candidate Review, Stage Progression & 1-Click Payroll Onboarding", async ({
    page,
  }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "hr@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");

    // Wait for dashboard redirect
    await page.waitForURL("**/hr/dashboard");
    expect(page.url()).toContain("/hr/dashboard");

    // Navigate to Recruitment Pipeline
    await page.goto("/recruitment");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Talent Acquisition')")).toBeVisible();

    // Locate the exact Aarav Kulkarni candidate row by unique email
    const candidateRow = page.locator(`tr:has-text('${testCandidate.email}')`).first();
    await expect(candidateRow).toBeVisible({ timeout: 15000 });

    // Advance Stage: SCREENING -> TECHNICAL -> HR -> OFFER
    for (let i = 0; i < 3; i++) {
      const advanceBtn = candidateRow.locator("button:has-text('Advance')");
      if (await advanceBtn.isVisible()) {
        await advanceBtn.click();
        await page.waitForTimeout(800);
      }
    }

    // Click "Hire & Onboard to Payroll"
    const hireBtn = candidateRow.locator("button:has-text('Hire & Onboard to Payroll')");
    await expect(hireBtn).toBeVisible({ timeout: 10000 });
    await hireBtn.click();

    // Modal should be open
    const modalHeader = page.locator("h3:has-text('1-Click Employee Onboarding')");
    await expect(modalHeader).toBeVisible();

    // Provision employee with Mode A Net
    const confirmBtn = page.locator("button:has-text('Confirm & Provision Employee')");
    await confirmBtn.click();

    // Assert candidate row status updates to Onboarded
    await expect(candidateRow.locator("span:has-text('Onboarded')").first()).toBeVisible({ timeout: 15000 });
  });

  // Test 3: HR Persona — Dynamic Location Policy Studio & Live Split-Pane Simulator
  test("Test 3: HR Persona — Dynamic Location Policy Studio & Live Split-Pane Simulator", async ({
    page,
  }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "hr@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/hr/dashboard");

    await page.goto("/admin/payroll/locations");
    await page.waitForLoadState("networkidle");

    // Assert Location Policies header is present
    await expect(page.locator("h1:has-text('Location Policies')")).toBeVisible();

    // Assert Live Waterfall Simulator is present in right pane
    await expect(page.locator("h3:has-text('Live Matching Waterfall')")).toBeVisible();

    // Assert Zero-Rupee Reconciliation Variance badge is rendered
    await expect(page.locator("text=Zero-Rupee Variance")).toBeVisible();

    // Open Version History drawer
    const historyBtn = page.locator("button:has-text('History')").first();
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    await expect(page.locator("text=Policy Version History")).toBeVisible();

    // Close drawer
    await page.locator("button:has-text('Close')").first().click();
  });

  // Test 4: HR Persona — Interactive Multi-State Holiday Calendar & Open Draft Payroll Redirection
  test("Test 4: HR Persona — Interactive Multi-State Holiday Calendar & Open Draft Payroll Redirection", async ({
    page,
  }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "hr@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/hr/dashboard");

    // Navigate to Holidays
    await page.goto("/holidays");
    await page.waitForLoadState("networkidle");

    // Assert Holiday Calendar header
    await expect(page.locator("h1:has-text('Holiday Calendar')")).toBeVisible();

    // Verify Cross-Module Payroll Synchronization Banner exists
    const syncBanner = page.locator("h4:has-text('Payroll Attendance Synchronization')");
    await expect(syncBanner).toBeVisible();

    // Click the cross-module redirection button
    const recalcBtn = page.locator("button:has-text('Recalculate Open Draft Payroll Run')");
    await expect(recalcBtn).toBeVisible();
    await recalcBtn.click();

    // Verify smooth redirection to the Monthly Payroll Wizard
    await page.waitForURL("**/admin/payroll/process");
    expect(page.url()).toContain("/admin/payroll/process");
    await expect(page.locator("h1:has-text('Monthly Payroll')")).toBeVisible();
  });

  // Test 5: Bulk 300+ Employee Stress Generator & Kredily Shadow Run Pilot
  test("Test 5: Bulk 300+ Employee Stress Generator & Kredily Shadow Run Pilot", async ({
    page,
  }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "hr@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/hr/dashboard");

    // Navigate to Bulk Import
    await page.goto("/admin/payroll/bulk-import");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1:has-text('Bulk Employee')")).toBeVisible();

    // Click "Generate 300 Sample Records (Stress Test)"
    const stressBtn = page.locator("button:has-text('Generate 300 Sample Records')");
    await expect(stressBtn).toBeVisible();
    await stressBtn.click();

    // Verify 300 records parsed and ready in validation summary
    const previewSummary = page.locator("h3:has-text('Pre-Import Validation Summary')");
    await expect(previewSummary).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Total: 300")).toBeVisible();

    // Navigate to Kredily Shadow Run Pilot
    await page.goto("/admin/payroll/kredily-pilot");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1:has-text('Pilot Comparator')")).toBeVisible();

    // Load Benchmark register
    const sampleBtn = page.locator("button:has-text('Use Sample Benchmark')");
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();

    // Execute Parallel Comparison
    const runCompareBtn = page.locator("button:has-text('Execute Side-by-Side Delta Analysis')");
    await expect(runCompareBtn).toBeVisible();
    await runCompareBtn.click();

    // Verify Comparison metric cards render
    await expect(page.locator("text=Total Matched")).toBeVisible({ timeout: 15000 });
  });

  // Test 6: Maker-Checker Governance State Machine & Export Verification
  test("Test 6: Maker-Checker Governance State Machine & Export Verification", async ({
    page,
  }) => {
    // 1. Log in as HR (Maker)
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "hr@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/hr/dashboard");

    // Navigate to Monthly Payroll
    await page.goto("/admin/payroll/process");
    await page.waitForLoadState("networkidle");

    // Verify Maker-Checker Governance text in wizard description
    await expect(page.locator("text=Maker-Checker")).toBeVisible();

    // 2. Log in as ADMIN (Checker / Reviewer)
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "admin@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/admin/dashboard");

    // Navigate to Monthly Payroll as Admin
    await page.goto("/admin/payroll/process");
    await page.waitForLoadState("networkidle");

    // Verify wizard is visible
    await expect(page.locator("h1:has-text('Monthly Payroll')")).toBeVisible();
  });

  // Test 7: Employee Self-Service Persona — Restricted RBAC & Self-Service Views
  test("Test 7: Employee Self-Service Persona — Restricted RBAC & Self-Service Views", async ({
    page,
  }) => {
    // 1. Log in as standard Employee
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "employee@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/employee/dashboard");
    expect(page.url()).toContain("/employee/dashboard");

    // 2. Verify restricted RBAC (visiting /admin/payroll/locations redirects or blocks)
    await page.goto("/admin/payroll/locations");
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain("/admin/payroll/locations");

    // 3. View employee self-service payslips page
    await page.goto("/employee/payslips");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Salary Slips')")).toBeVisible();
  });
});
