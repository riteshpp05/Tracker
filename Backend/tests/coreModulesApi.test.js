// Backend/tests/coreModulesApi.test.js
process.env.NODE_ENV = "test";
import assert from "node:assert/strict";
import http from "node:http";

console.log("🚀 Running Core Operations REST API Integration Test Suite (SIPL)...\n");

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

async function runTests() {
  try {
    // 1. Health check
    console.log("▶ 1. Health Check Endpoint...");
    const health = await api("/health");
    assert.equal(health.status, 200);
    assert.equal(health.data.status, "OK");
    assert.equal(health.data.service, "Shende Industries Enterprise API");
    console.log("  ✓ Service healthy and verified");

    // 2. Authentication: Admin & Employee
    console.log("\n▶ 2. Auth Flow & JWT Token Signing...");
    const adminLogin = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@shendeindustries.com", password: "password123" }),
    });
    assert.equal(adminLogin.status, 200);
    const adminToken = adminLogin.data.accessToken;
    assert.ok(adminToken);
    console.log("  ✓ Admin token generated");

    const empLogin = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "employee@shendeindustries.com", password: "password123" }),
    });
    assert.equal(empLogin.status, 200);
    const empToken = empLogin.data.accessToken;
    console.log("  ✓ Employee token generated");

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const empHeaders = { Authorization: `Bearer ${empToken}` };

    // 3. System Settings
    console.log("\n▶ 3. System Settings API...");
    const settingsRes = await api("/api/settings", { headers: adminHeaders });
    assert.equal(settingsRes.status, 200);
    assert.ok(typeof settingsRes.data === "object");
    console.log("  ✓ System settings retrieved successfully");

    // 4. Projects & Tasks
    console.log("\n▶ 4. Projects & Tasks API...");
    const projectsRes = await api("/api/projects", { headers: adminHeaders });
    assert.equal(projectsRes.status, 200);
    const projects = projectsRes.data.projects || projectsRes.data;
    assert.ok(Array.isArray(projects));
    console.log(`  ✓ Projects retrieved: ${projects.length} packaging/automation projects`);

    // 5. Geofence Offices (Public/Protected endpoint)
    console.log("\n▶ 5. Geofence Offices & Verification...");
    const geofencesRes = await api("/api/enterprise/geofences");
    assert.equal(geofencesRes.status, 200);
    const geofences = geofencesRes.data.data || geofencesRes.data;
    assert.ok(Array.isArray(geofences));
    const banerHQ = geofences.find((g) => g.code === "SHENDE-BANER-HQ");
    assert.ok(banerHQ, "Shende Industries Baner Corporate Office must be configured");
    console.log(`  ✓ Geofence verified: ${banerHQ.name} (Radius: ${banerHQ.radius_meters}m)`);

    // 6. Attendance Today Status
    console.log("\n▶ 6. Attendance Status Check (Employee)...");
    const todayRes = await api("/api/attendance/today", { headers: empHeaders });
    assert.equal(todayRes.status, 200);
    console.log("  ✓ Attendance status check retrieved");

    // 7. Policy Documents
    console.log("\n▶ 7. Corporate Documents & Policies...");
    const docsRes = await api("/api/enterprise/documents", { headers: adminHeaders });
    assert.equal(docsRes.status, 200);
    const docs = docsRes.data.data || docsRes.data;
    assert.ok(Array.isArray(docs));
    console.log(`  ✓ Documents retrieved: ${docs.length} corporate policies`);

    // 8. Vercel Serverless Function Adapter Test
    console.log("\n▶ 8. Vercel Serverless Function Handler Test (api/index.js)...");
    const vercelHandler = (await import("../../api/index.js")).default;
    assert.equal(typeof vercelHandler, "function", "Vercel export must be a function");

    // Test with real HTTP server on dynamic port
    const testServer = http.createServer((req, res) => vercelHandler(req, res));
    await new Promise((resolve) => testServer.listen(0, resolve));
    const testPort = testServer.address().port;

    const testHealthRes = await fetch(`http://localhost:${testPort}/health`);
    const testHealthJson = await testHealthRes.json();
    assert.equal(testHealthRes.status, 200);
    assert.equal(testHealthJson.status, "OK");
    testServer.close();
    console.log("  ✓ Vercel serverless function handled real HTTP request on port " + testPort);

    console.log("\n🎉 ALL CORE OPERATIONS & VERCEL TESTS PASSED WITH 100% SUCCESS!\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
}

runTests();
