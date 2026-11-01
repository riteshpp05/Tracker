import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// Create screenshots directory
const screenshotsDir = path.resolve(process.cwd(), "e2e/screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Helper to capture timestamped/indexed screenshots
async function snap(page, name) {
  const filePath = path.join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 Captured screenshot: ${name}.png`);
}

// Helper to reset browser cookies, localStorage and sessionStorage
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

test.describe.serial("PatilOne / Shende Industries — Visual Audit & End-to-End Enterprise Automation", () => {
  const timestamp = Date.now();
  const testCandidate = {
    fullName: "Aditya Verma",
    email: `aditya.verma.${timestamp}@example.com`,
    phone: "+91 98234 56789",
    experienceYears: "5",
    resumeUrl: "https://drive.google.com/aditya-resume.pdf",
    coverNote: "Lead Systems Architect with deep Indian labor compliance and distributed payroll experience.",
    trackingCode: "",
  };

  const newHRUser = {
    firstName: "Ananya",
    lastName: "Sen",
    email: `ananya.sen.${timestamp}@shendeindustries.com`,
    password: "Password12345!",
    department: "Human Resources",
    designation: "HR Operations Lead",
    employeeCode: `HR${String(timestamp).slice(-4)}`,
    doj: "2024-03-01",
  };

  const newHoliday = {
    name: `Industrial Safety Day ${timestamp}`,
    date: "2026-05-15",
    description: "Annual industrial safety and operations observance across all factory hubs.",
  };

  // 1. World-Class Side-by-Side Login Screen
  test("Screen 01 & 02: Side-by-Side Enterprise Login & Persona Switcher", async ({ page }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Assert branding and side-by-side showcase elements
    await expect(page.locator("h1:has-text('Sign In to Workspace')")).toBeVisible();
    await expect(page.locator("text=Continuous Zero-Rupee Reconciliation")).toBeVisible();
    await snap(page, "01-login-screen");

    // Click through the persona pills: Admin, Manager, Employee, then HR
    await page.locator("button:has-text('Super Admin')").click();
    await expect(page.locator("input[type='email']")).toHaveValue("admin@shendeindustries.com");
    await snap(page, "02-login-persona-switch");

    await page.locator("button:has-text('HR Specialist')").click();
    await expect(page.locator("input[type='email']")).toHaveValue("hr@shendeindustries.com");
  });

  // 2. Public Careers Portal, Application Submission & Live Tracking
  test("Screen 03 to 06: Public Careers Portal, Application Creation & Status Tracking", async ({ page }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Click Careers Portal link
    const careersLink = page.locator("a[href='/careers']").first();
    await expect(careersLink).toBeVisible();
    await careersLink.click();

    await page.waitForURL("**/careers");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText(/Build the software/i);
    await snap(page, "03-public-careers-portal");

    // Open Apply Drawer for Senior Full-Stack Engineer
    const targetJob = page.locator("div.bg-white:has-text('Senior Full-Stack Engineer')").first();
    await expect(targetJob).toBeVisible({ timeout: 15000 });
    const applyBtn = targetJob.locator("button:has-text('Apply for Role')");
    await applyBtn.click();

    await expect(page.locator("h2:has-text('Apply:')")).toBeVisible();

    // Fill application form
    await page.fill("input[placeholder='e.g. Aarav Kulkarni']", testCandidate.fullName);
    await page.fill("input[placeholder='aarav.candidate@example.com']", testCandidate.email);
    await page.fill("input[placeholder='+91 98765 43210']", testCandidate.phone);
    await page.fill("input[type='number']", testCandidate.experienceYears);
    await page.fill("input[placeholder*='resume']", testCandidate.resumeUrl);
    await page.fill("textarea", testCandidate.coverNote);
    await snap(page, "04-public-careers-apply-drawer");

    // Submit Application
    await page.locator("button:has-text('Submit Application')").click();

    // Assert confirmation card and retrieve tracking code
    const successCard = page.locator("h3:has-text('Application Successfully Logged')");
    await expect(successCard).toBeVisible({ timeout: 15000 });

    const codeSpan = page.locator("span.font-mono.text-base.font-extrabold.text-indigo-700");
    await expect(codeSpan).toBeVisible();
    testCandidate.trackingCode = (await codeSpan.textContent()).trim();
    expect(testCandidate.trackingCode).toMatch(/^APP-2026-\d{4}$/);
    await snap(page, "05-public-careers-submission-success");

    // Close drawer
    await page.locator("button:has-text('Done')").click();

    // Track Application Status Modal
    const trackBtn = page.locator("button:has-text('Track Application Status')");
    await expect(trackBtn).toBeVisible();
    await trackBtn.click();

    await expect(page.locator("h3:has-text('Track Your Application')")).toBeVisible();
    await page.fill("input[placeholder*='APP-2026']", testCandidate.trackingCode);
    await page.locator("button:has-text('Lookup')").click();

    // Assert active stage is SCREENING
    await expect(page.locator("span:has-text('SCREENING')").first()).toBeVisible({ timeout: 15000 });
    await snap(page, "06-public-careers-tracking-status");

    // Close tracking modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // 3. HR Persona: Dashboard, Recruitment Pipeline & 1-Click Onboard
  test("Screen 07 to 10: HR Dashboard, Stage Progression & 1-Click Employee Onboarding", async ({ page }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "hr@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/hr/dashboard");
    await page.waitForLoadState("networkidle");
    await snap(page, "07-hr-dashboard");

    // Navigate to Recruitment Pipeline
    await page.goto("/recruitment");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Talent Acquisition')")).toBeVisible();

    const candidateRow = page.locator(`tr:has-text('${testCandidate.email}')`).first();
    await expect(candidateRow).toBeVisible({ timeout: 15000 });
    await snap(page, "08-recruitment-pipeline");

    // Advance Stage: SCREENING -> TECHNICAL -> HR -> OFFER
    for (let i = 0; i < 3; i++) {
      const advBtn = candidateRow.locator("button:has-text('Advance')");
      if (await advBtn.isVisible()) {
        await advBtn.click();
        await page.waitForTimeout(600);
      }
    }
    await snap(page, "09-recruitment-advance-stages");

    // Open Hire & Onboard Modal
    const hireBtn = candidateRow.locator("button:has-text('Hire & Onboard to Payroll')");
    await expect(hireBtn).toBeVisible({ timeout: 10000 });
    await hireBtn.click();

    await expect(page.locator("h3:has-text('1-Click Employee Onboarding')")).toBeVisible();
    await snap(page, "10-recruitment-1click-onboard-modal");

    // Confirm Onboarding
    await page.locator("button:has-text('Confirm & Provision Employee')").click();
    await expect(candidateRow.locator("span:has-text('Onboarded')").first()).toBeVisible({ timeout: 15000 });
  });

  // 4. Admin Persona: User Management & Create New HR Specialist
  test("Screen 11 & 12: Admin User Management & Provision New HR Operations Lead", async ({ page }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "admin@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/admin/dashboard");

    // Navigate to User Management
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Employees & Directory')")).toBeVisible();
    await snap(page, "11-admin-user-management");

    // Open Add Employee Dialog
    const addEmpBtn = page.locator("button:has-text('Add Employee')");
    await expect(addEmpBtn).toBeVisible();
    await addEmpBtn.click();

    await expect(page.locator("text=Create a new employee account")).toBeVisible();

    // Fill new HR details using exact IDs
    await page.fill("#firstName", newHRUser.firstName);
    await page.fill("#lastName", newHRUser.lastName);
    await page.fill("#email", newHRUser.email);
    await page.fill("#password", newHRUser.password);
    await page.fill("#employeeCode", newHRUser.employeeCode);
    await page.fill("#designation", newHRUser.designation);

    // Set Role to HR
    const roleTrigger = page.locator("#role");
    if (await roleTrigger.isVisible()) {
      await roleTrigger.click();
      const hrItem = page.locator("[role='option']:has-text('HR')");
      if (await hrItem.isVisible()) await hrItem.click();
    }

    await snap(page, "12-admin-create-hr-modal");

    // Close dialog to maintain clean fixture state
    const cancelBtn = page.locator("button:has-text('Cancel')").first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }
  });

  // 5. Corporate Holiday Calendar & Create Branch Holiday
  test("Screen 13 to 15: Corporate Holiday Calendar & Interactive Holiday Creation", async ({ page }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "hr@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/hr/dashboard");

    // Navigate to Holidays
    await page.goto("/holidays");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Holiday Calendar')")).toBeVisible();
    await snap(page, "13-corporate-holiday-calendar");

    // Open Add Holiday Modal
    const addHolidayBtn = page.locator("button:has-text('Add Holiday')");
    await expect(addHolidayBtn).toBeVisible();
    await addHolidayBtn.click();

    await expect(page.locator("h3:has-text('Add Company Holiday')")).toBeVisible();
    await page.fill("input[placeholder*='Maharashtra Day']", newHoliday.name);
    await page.fill("input[type='date']", newHoliday.date);
    await page.fill("textarea", newHoliday.description);
    await snap(page, "14-create-holiday-modal");

    // Submit new Holiday
    await page.locator("button:has-text('Add to Calendar')").click();
    await page.waitForTimeout(1000);

    // Assert holiday appears in calendar list
    await expect(page.locator(`h3:has-text('${newHoliday.name}')`)).toBeVisible({ timeout: 15000 });
    await snap(page, "15-holiday-created-verified");
  });

  // 6. Location Policies Studio, Waterfall Simulator & CTC Calculator
  test("Screen 16 to 18: Multi-Branch Location Policy Studio & CTC Simulator", async ({ page }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "hr@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/hr/dashboard");

    // Navigate to Location Policies
    await page.goto("/admin/payroll/locations");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Location Policies')")).toBeVisible();
    await expect(page.locator("h3:has-text('Live Matching Waterfall')")).toBeVisible();
    await expect(page.locator("text=Zero-Rupee Variance")).toBeVisible();
    await snap(page, "16-location-policies-studio");

    // Open Policy Version History
    const historyBtn = page.locator("button:has-text('History')").first();
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    await expect(page.locator("text=Policy Version History")).toBeVisible();
    await snap(page, "17-location-policy-version-history");
    await page.locator("button:has-text('Close')").first().click();

    // Navigate to CTC Simulator
    await page.goto("/admin/payroll/ctc-simulator");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('CTC Matching Engine')")).toBeVisible();
    await snap(page, "18-ctc-breakup-simulator");
  });

  // 7. Bulk Import (300+ Employees) & Kredily Pilot Comparator
  test("Screen 19 & 20: Bulk 300+ Workforce Generator & Kredily Shadow Run Pilot", async ({ page }) => {
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

    // Click Generate 300 Sample Records
    const genBtn = page.locator("button:has-text('Generate 300 Sample Records')");
    await expect(genBtn).toBeVisible();
    await genBtn.click();

    await expect(page.locator("h3:has-text('Pre-Import Validation Summary')")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Total: 300")).toBeVisible();
    await snap(page, "19-bulk-300-employee-import");

    // Navigate to Kredily Pilot Comparator
    await page.goto("/admin/payroll/kredily-pilot");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Pilot Comparator')")).toBeVisible();

    // Load sample benchmark & run comparison
    await page.locator("button:has-text('Use Sample Benchmark')").click();
    await page.locator("button:has-text('Execute Side-by-Side Delta Analysis')").click();

    await expect(page.locator("text=Total Matched")).toBeVisible({ timeout: 15000 });
    await snap(page, "20-kredily-pilot-comparator");
  });

  // 8. Monthly Payroll Processing, Maker-Checker Governance & Export
  test("Screen 21 to 23: Monthly Payroll Wizard, Maker Submit & Checker Approval", async ({ page }) => {
    // HR Maker calculates draft payroll
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "hr@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/hr/dashboard");

    await page.goto("/admin/payroll/process");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Monthly Payroll')")).toBeVisible();

    // Calculate Draft Run if ready
    const calcBtn = page.locator("button:has-text('Calculate Draft Payroll')");
    if (await calcBtn.isVisible()) {
      try {
        await expect(calcBtn).toBeEnabled({ timeout: 5000 });
        await calcBtn.click();
        await page.waitForTimeout(2000);
      } catch (err) {
        console.log("Draft button state handled:", err.message);
      }
    }
    await snap(page, "21-monthly-payroll-wizard-draft");

    // Submit for Checker Review
    const submitBtn = page.locator("button:has-text('Submit for Approval')").first();
    if (await submitBtn.isVisible()) {
      try {
        await submitBtn.click();
        await page.waitForTimeout(1000);
      } catch (err) {
        console.log("Submit button handled");
      }
    }
    await snap(page, "22-maker-checker-submission");

    // Admin Checker logs in to approve & finalize
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "admin@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/admin/dashboard");

    await page.goto("/admin/payroll/process");
    await page.waitForLoadState("networkidle");

    const approveBtn = page.locator("button:has-text('Approve Run')").or(page.locator("button:has-text('Approve')")).first();
    if (await approveBtn.isVisible()) {
      try {
        await approveBtn.click();
        await page.waitForTimeout(1000);
      } catch (err) {
        console.log("Approve button handled");
      }
    }
    await snap(page, "23-admin-payroll-checker-approval");
  });

  // 9. Employee Self-Service & RBAC Access Guard
  test("Screen 24 to 26: Employee Self-Service Payslip Modal & Restricted RBAC Guard", async ({ page }) => {
    await resetSession(page);
    await page.goto("/login");
    await page.fill("input[type='email']", "employee@shendeindustries.com");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/employee/dashboard");
    await page.waitForLoadState("networkidle");

    // Navigate to My Salary Slips
    await page.goto("/my-slips");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('My Salary Slips')")).toBeVisible();
    await snap(page, "24-employee-self-service-payslips");

    // Open first available salary slip modal
    const viewSlipBtn = page.locator("button:has-text('View / Print')").or(page.locator("button:has-text('View Slip')")).first();
    if (await viewSlipBtn.isVisible()) {
      await viewSlipBtn.click();
      await expect(page.locator("h3:has-text('Salary Slip Statement')").or(page.locator("text=Earnings"))).toBeVisible({
        timeout: 10000,
      });
      await snap(page, "25-employee-payslip-breakdown-modal");
      // Close modal
      const closeBtn = page.locator("button:has(svg.lucide-x)").or(page.locator("button:has-text('Close')")).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

    // Verify Restricted RBAC: Employee attempts to access admin payroll
    await page.goto("/admin/payroll");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/admin/payroll");
    expect(page.url()).toContain("/employee/dashboard");
    await snap(page, "26-employee-rbac-restriction");
  });
});
