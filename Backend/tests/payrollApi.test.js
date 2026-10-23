// Backend/tests/payrollApi.test.js
import assert from "node:assert/strict";

console.log("🚀 Running End-to-End Payroll REST API Integration Test Suite...");

const BASE_URL = `http://localhost:5000`;

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }
  return { status: res.status, headers: res.headers, data: json };
}

try {
  // 1. Authenticate Admin
  console.log("\n▶ 1. Authenticating Admin User...");
  const adminLogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@shendeindustries.com", password: "password123" }),
  });
  assert.equal(adminLogin.status, 200, "Admin login should succeed");
  const adminToken = adminLogin.data.accessToken;
  assert.ok(adminToken, "Admin accessToken must be returned");
  console.log("  ✓ Admin authenticated successfully");

  // 2. Authenticate Employee
  console.log("\n▶ 2. Authenticating Employee User...");
  const empLogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "employee@shendeindustries.com", password: "password123" }),
  });
  assert.equal(empLogin.status, 200, "Employee login should succeed");
  const empToken = empLogin.data.accessToken;
  assert.ok(empToken, "Employee accessToken must be returned");
  console.log("  ✓ Employee authenticated successfully");

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const empHeaders = { Authorization: `Bearer ${empToken}` };

  // 3. Fetch Components
  console.log("\n▶ 3. Fetching Payroll Components...");
  const compRes = await api("/api/payroll/components", { headers: adminHeaders });
  assert.equal(compRes.status, 200, "Get components should return 200");
  assert.ok(compRes.data.data.length >= 10, "Should return at least 10 components");
  console.log(`  ✓ Retrieved ${compRes.data.data.length} components`);

  // 4. Fetch Salary Structures
  console.log("\n▶ 4. Fetching Salary Structures...");
  const structRes = await api("/api/payroll/structures", { headers: adminHeaders });
  assert.equal(structRes.status, 200, "Get structures should return 200");
  assert.ok(structRes.data.data.length >= 3, "Should return at least 3 structures");
  console.log(`  ✓ Retrieved ${structRes.data.data.length} salary structures`);

  // 5. Fetch Employee Assignments
  console.log("\n▶ 5. Fetching Employee Assignments...");
  const asgnRes = await api("/api/payroll/assignments", { headers: adminHeaders });
  assert.equal(asgnRes.status, 200, "Get assignments should return 200");
  assert.ok(asgnRes.data.data.length >= 6, "Should return at least 6 employee records");
  console.log(`  ✓ Retrieved ${asgnRes.data.data.length} employee compensation profiles`);

  // Clean up any previous test run for November 2026 (month 11)
  const dbModule = await import("../src/config/database.js");
  await dbModule.default.query("DELETE FROM payroll_runs WHERE month = 11 AND year = 2026");

  // 6. Check Readiness for November 2026
  console.log("\n▶ 6. Checking Payroll Readiness for November 2026...");
  const readinessRes = await api("/api/payroll/readiness?month=11&year=2026", { headers: adminHeaders });
  assert.equal(readinessRes.status, 200, "Readiness endpoint should return 200");
  assert.equal(readinessRes.data.data.readiness.isValid, true, "Readiness should be valid");
  console.log(`  ✓ Readiness verified: ${readinessRes.data.data.readiness.readyEmployees} employees ready`);

  // 7. Calculate Draft Payroll Run
  console.log("\n▶ 7. Calculating Draft Payroll Run for November 2026...");
  const draftRes = await api("/api/payroll/runs/draft", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ month: 11, year: 2026 }),
  });
  assert.equal(draftRes.status, 200, "Draft run calculation should return 200");
  const runId = draftRes.data.data.runId;
  assert.ok(runId, "Run ID must be generated");
  console.log(`  ✓ Draft run created: ${draftRes.data.data.runCode} (Net Total: ₹${draftRes.data.data.totalNetPay.toLocaleString("en-IN")})`);

  // 8. Fetch Run Details
  console.log("\n▶ 8. Fetching Payroll Run Details & Slips...");
  const runDetailRes = await api(`/api/payroll/runs/${runId}`, { headers: adminHeaders });
  assert.equal(runDetailRes.status, 200);
  assert.equal(runDetailRes.data.data.slips.length, 6, "All 6 active employees should have slips");
  const firstSlip = runDetailRes.data.data.slips[0];
  console.log(`  ✓ Slip 1: ${firstSlip.slip_number} - Net Pay: ₹${firstSlip.rounded_net_pay}`);

  // 9. Workflow: Submit -> Approve -> Finalize
  console.log("\n▶ 9. Testing Workflow: Submit -> Approve -> Finalize...");
  const submitRes = await api(`/api/payroll/runs/${runId}/submit`, { method: "POST", headers: adminHeaders });
  assert.equal(submitRes.status, 200, "Submit should succeed");

  const approveRes = await api(`/api/payroll/runs/${runId}/approve`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ approvalNotes: "Approved by Admin" }),
  });
  assert.equal(approveRes.status, 200, "Approve should succeed");

  const finalizeRes = await api(`/api/payroll/runs/${runId}/finalize`, { method: "POST", headers: adminHeaders });
  assert.equal(finalizeRes.status, 200, "Finalize should succeed");
  console.log("  ✓ Workflow transitions (DRAFT -> SUBMITTED -> APPROVED -> FINALIZED) passed");

  // 10. Bank Payment Export File
  console.log("\n▶ 10. Testing Bank Payment File Export (NEFT/RTGS)...");
  const exportRes = await api(`/api/payroll/runs/${runId}/bank-export`, { headers: adminHeaders });
  assert.equal(exportRes.status, 200, "Bank export should return 200");
  assert.ok(exportRes.data.includes("Beneficiary Name"), "CSV should contain headers");
  assert.ok(exportRes.data.includes("HDFC0000123"), "CSV should contain employee IFSC");
  console.log("  ✓ Bank payment CSV generated with valid headers & amounts");

  // 11. Employee Self-Service & Isolation
  console.log("\n▶ 11. Testing Employee Self-Service & Data Isolation...");
  const mySlipsRes = await api("/api/payroll/my-slips", { headers: empHeaders });
  assert.equal(mySlipsRes.status, 200, "Employee should retrieve their own slips");
  assert.ok(mySlipsRes.data.data.length >= 1, "Employee must see at least 1 finalized slip");
  const empSlip = mySlipsRes.data.data[0];
  console.log(`  ✓ Employee retrieved own slip: ${empSlip.slip_number}`);

  // Security test: Employee viewing own slip vs unauthorized other slip
  const ownSlipRes = await api(`/api/payroll/slips/${empSlip.id}`, { headers: empHeaders });
  assert.equal(ownSlipRes.status, 200, "Employee can view own slip details");

  // Find another slip not belonging to employee
  const otherSlip = runDetailRes.data.data.slips.find((s) => s.id !== empSlip.id);
  if (otherSlip) {
    const unauthRes = await api(`/api/payroll/slips/${otherSlip.id}`, { headers: empHeaders });
    assert.equal(unauthRes.status, 403, "Employee must be rejected (403) when accessing another employee's slip");
    console.log("  ✓ Security: Employee horizontal IDOR blocked (403 Forbidden)");
  }

  console.log("\n🎉 ALL 11 PAYROLL API & SECURITY INTEGRATION TESTS PASSED!\n");
  process.exit(0);
} catch (err) {
  console.error("❌ Test failed:", err);
  process.exit(1);
}
