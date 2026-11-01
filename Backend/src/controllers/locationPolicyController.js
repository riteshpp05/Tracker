/**
 * locationPolicyController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * REST controller for Location Policy management (HR-configurable payroll rules)
 * and the Mode-A CTC Matching Engine simulation endpoint.
 *
 * Routes (registered in payrollRoutes.js):
 *   GET    /api/payroll/location-policies                     → listPolicies
 *   POST   /api/payroll/location-policies                     → createPolicy
 *   GET    /api/payroll/location-policies/:id                 → getPolicy
 *   PUT    /api/payroll/location-policies/:id                 → updatePolicy
 *   DELETE /api/payroll/location-policies/:id                 → deletePolicy
 *   GET    /api/payroll/location-policies/:id/history         → getPolicyHistory
 *   POST   /api/payroll/location-policies/:id/assign-employees → assignEmployees
 *   POST   /api/payroll/location-policies/simulate            → simulateCtc
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as locationPolicyService from "../services/payroll/locationPolicyService.js";
import ctcReconciliationEngine     from "../services/payroll/ctcReconciliationEngine.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sendError(res, err) {
  const status = err.statusCode || 500;
  const message = err.message || "Internal server error";
  const errors  = err.errors  || undefined;
  res.status(status).json({ success: false, error: message, ...(errors && { errors }) });
}

// ─── Controller Methods ───────────────────────────────────────────────────────

/**
 * GET /api/payroll/location-policies
 * Returns all active location policies (HR/Admin).
 * Query param: ?includeInactive=true to include deactivated policies.
 */
export async function listPolicies(req, res) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const policies = await locationPolicyService.listPolicies({ includeInactive });
    res.json({ success: true, data: policies, count: policies.length });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * POST /api/payroll/location-policies
 * Create a new location policy. HR/Admin only.
 */
export async function createPolicy(req, res) {
  try {
    const created = await locationPolicyService.createPolicy(req.body, req.user?.id);
    res.status(201).json({ success: true, data: created, message: "Location policy created successfully." });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * GET /api/payroll/location-policies/:id
 * Fetch a single policy by UUID.
 */
export async function getPolicy(req, res) {
  try {
    const policy = await locationPolicyService.getPolicy(req.params.id);
    res.json({ success: true, data: policy });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * PUT /api/payroll/location-policies/:id
 * Update an existing policy. Records change history.
 */
export async function updatePolicy(req, res) {
  try {
    const updated = await locationPolicyService.updatePolicy(req.params.id, req.body, req.user?.id);
    res.json({ success: true, data: updated, message: "Location policy updated successfully." });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * DELETE /api/payroll/location-policies/:id
 * Soft-delete: sets is_active=false. Preserves historical linkage for employees.
 */
export async function deletePolicy(req, res) {
  try {
    const deactivated = await locationPolicyService.deletePolicy(req.params.id, req.user?.id);
    res.json({ success: true, data: deactivated, message: "Location policy deactivated." });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * GET /api/payroll/location-policies/:id/history
 * Returns the immutable change log for a policy.
 */
export async function getPolicyHistory(req, res) {
  try {
    const history = await locationPolicyService.getPolicyHistory(req.params.id);
    res.json({ success: true, data: history, count: history.length });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * POST /api/payroll/location-policies/:id/assign-employees
 * Body: { employeeIds: string[] }
 * Bulk-assign a policy to a list of employees.
 */
export async function assignEmployees(req, res) {
  try {
    const { employeeIds } = req.body;
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ success: false, error: "employeeIds must be a non-empty array" });
    }
    const result = await locationPolicyService.assignPolicyToEmployees(
      employeeIds,
      req.params.id,
      req.user?.id
    );
    res.json({ success: true, ...result, message: `Policy assigned to ${result.updated} employee(s).` });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * POST /api/payroll/location-policies/simulate
 *
 * Run the CTC Matching Engine without saving.
 * Supports both Mode A (Net → CTC) and Mode B (CTC → Components).
 *
 * Body (Mode A):
 *   {
 *     mode: "NET_TO_CTC",
 *     netSalary: 26000,
 *     policyId: "<uuid>",   // one of policyId OR policy object
 *     policy: { ... },      // inline policy (for preview before save)
 *     month: 3,
 *     gender: "Male"
 *   }
 *
 * Body (Mode B):
 *   {
 *     mode: "CTC_TO_NET",
 *     annualCtc: 500000,
 *     pfCeilingMode: "15000",
 *     hraType: "METRO",
 *     basicPercent: 50,
 *     month: 3,
 *     gender: "Male",
 *     assessmentYear: "AY_2026_27"
 *   }
 */
export async function simulateCtc(req, res) {
  try {
    const { mode = "NET_TO_CTC" } = req.body;

    if (mode === "NET_TO_CTC") {
      // ── Mode A: Net → CTC ──────────────────────────────────────────────
      let policy = req.body.policy;

      if (!policy && req.body.policyId) {
        policy = await locationPolicyService.getPolicy(req.body.policyId);
      }

      if (!policy) {
        return res.status(400).json({
          success: false,
          error: "Mode NET_TO_CTC requires either policyId (UUID) or an inline policy object.",
        });
      }

      const result = ctcReconciliationEngine.decomposeFromNetSalary({
        netSalary: Number(req.body.netSalary) || 0,
        policy,
        month:  Number(req.body.month)  || new Date().getMonth() + 1,
        gender: req.body.gender         || "Male",
        useGrossForPt: req.body.useGrossForPt === true,
      });

      return res.json({ success: true, mode: "NET_TO_CTC", data: result });
    }

    if (mode === "CTC_TO_NET") {
      // ── Mode B: CTC → Net (existing reverse-CTC engine) ───────────────
      const result = ctcReconciliationEngine.decomposeAnnualCtc({
        annualCtc:              Number(req.body.annualCtc) || 0,
        pfCeilingMode:          req.body.pfCeilingMode         || "15000",
        hraType:                req.body.hraType               || "METRO",
        basicPercent:           Number(req.body.basicPercent)  || 50,
        month:                  Number(req.body.month)         || new Date().getMonth() + 1,
        gender:                 req.body.gender                || "Male",
        allowSpecialBalancing:  req.body.allowSpecialBalancing !== false,
        includeGratuity:        req.body.includeGratuity       !== false,
        assessmentYear:         req.body.assessmentYear        || "AY_2026_27",
        isPost2014NewMemberAboveCap: req.body.isPost2014NewMemberAboveCap === true,
      });

      return res.json({ success: true, mode: "CTC_TO_NET", data: result });
    }

    return res.status(400).json({
      success: false,
      error: `Unknown mode '${mode}'. Supported: 'NET_TO_CTC', 'CTC_TO_NET'.`,
    });
  } catch (err) {
    sendError(res, err);
  }
}
