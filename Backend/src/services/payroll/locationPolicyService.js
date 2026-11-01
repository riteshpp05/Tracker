/**
 * locationPolicyService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CRUD + business logic for payroll_location_policies.
 *
 * Responsibilities:
 *  - Create / read / update / soft-delete location policies
 *  - Record immutable change history for each mutation
 *  - Validate policy parameters before persistence
 *  - Expose a fast in-memory cache for the calculation engine
 *
 * Location names are ALWAYS user-defined generic strings.
 * No real geographic names exist anywhere in this module.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import db from "../../config/database.js";

// ─── Validation ───────────────────────────────────────────────────────────────

const ALLOWED_STATE_CODES = ['MH', 'MP', 'GJ', 'KA', 'TN', 'AP', 'TS', 'WB', 'OTHER', 'NONE'];
const ALLOWED_BASIC_MODES = ['PERCENT_OF_NET', 'PERCENT_OF_CTC', 'FIXED_GRADE'];
const ALLOWED_PF_CEILINGS  = ['15000', '25000', 'ACTUAL'];
const ALLOWED_TAX_REGIMES  = ['NEW', 'OLD'];
const ALLOWED_ASMT_YEARS   = ['AY_2025_26', 'AY_2026_27', 'AY_2027_28'];

/**
 * Validate policy fields. Returns { valid: true } or { valid: false, errors: [] }.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePolicyData(data) {
  const errors = [];

  if (!data.name || String(data.name).trim().length === 0) {
    errors.push('name is required');
  }
  if (!data.code || !/^[A-Z0-9_-]{2,50}$/.test(String(data.code).toUpperCase())) {
    errors.push('code must be 2-50 uppercase alphanumeric/hyphen/underscore characters');
  }
  if (data.state_code && !ALLOWED_STATE_CODES.includes(data.state_code)) {
    errors.push(`state_code must be one of: ${ALLOWED_STATE_CODES.join(', ')}`);
  }
  if (data.basic_calculation_mode && !ALLOWED_BASIC_MODES.includes(data.basic_calculation_mode)) {
    errors.push(`basic_calculation_mode must be one of: ${ALLOWED_BASIC_MODES.join(', ')}`);
  }
  if (data.pf_ceiling_mode && !ALLOWED_PF_CEILINGS.includes(data.pf_ceiling_mode)) {
    errors.push(`pf_ceiling_mode must be one of: ${ALLOWED_PF_CEILINGS.join(', ')}`);
  }
  if (data.default_tax_regime && !ALLOWED_TAX_REGIMES.includes(data.default_tax_regime)) {
    errors.push(`default_tax_regime must be one of: ${ALLOWED_TAX_REGIMES.join(', ')}`);
  }
  if (data.default_assessment_year && !ALLOWED_ASMT_YEARS.includes(data.default_assessment_year)) {
    errors.push(`default_assessment_year must be one of: ${ALLOWED_ASMT_YEARS.join(', ')}`);
  }

  const pctFields = [
    ['basic_percent_of_net', 0.01, 100],
    ['basic_percent_of_ctc', 0.01, 100],
    ['hra_percent_of_basic_da', 0, 100],
    ['employee_pf_rate', 0, 1],
    ['employer_pf_rate', 0, 1],
    ['bonus_rate', 0, 1],
    ['gratuity_rate', 0, 1],
    ['esic_employer_rate', 0, 1],
    ['esic_employee_rate', 0, 1],
  ];
  for (const [field, min, max] of pctFields) {
    if (data[field] !== undefined) {
      const v = Number(data[field]);
      if (isNaN(v) || v < min || v > max) {
        errors.push(`${field} must be a number between ${min} and ${max}`);
      }
    }
  }

  const amtFields = [
    'da_fixed_amount', 'washing_allowance', 'education_allowance',
    'conveyance_allowance', 'medical_allowance', 'books_periodicals',
  ];
  for (const field of amtFields) {
    if (data[field] !== undefined) {
      const v = Number(data[field]);
      if (isNaN(v) || v < 0) {
        errors.push(`${field} must be a non-negative number`);
      }
    }
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

// ─── Service Methods ───────────────────────────────────────────────────────────

/**
 * List all active (or all, if includeInactive=true) location policies.
 * @param {{ includeInactive?: boolean }} opts
 * @returns {Promise<object[]>}
 */
export async function listPolicies({ includeInactive = false } = {}) {
  const whereClause = includeInactive ? '' : 'WHERE is_active = TRUE';
  const result = await db.query(
    `SELECT * FROM payroll_location_policies ${whereClause} ORDER BY name ASC`
  );
  return result.rows;
}

/**
 * Fetch a single policy by ID. Throws if not found.
 * @param {string} id UUID
 * @returns {Promise<object>}
 */
export async function getPolicy(id) {
  const result = await db.query(
    'SELECT * FROM payroll_location_policies WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Location policy not found'), { statusCode: 404 });
  }
  return result.rows[0];
}

/**
 * Fetch a policy by code (case-insensitive). Returns null if not found.
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export async function getPolicyByCode(code) {
  const result = await db.query(
    'SELECT * FROM payroll_location_policies WHERE UPPER(code) = $1 AND is_active = TRUE',
    [String(code).toUpperCase()]
  );
  return result.rows[0] || null;
}

/**
 * Create a new location policy.
 * @param {object} data   Policy fields
 * @param {string} userId Creator's user ID (UUID)
 * @returns {Promise<object>} Created policy row
 */
export async function createPolicy(data, userId) {
  const validation = validatePolicyData(data);
  if (!validation.valid) {
    throw Object.assign(
      new Error(`Invalid policy data: ${validation.errors.join('; ')}`),
      { statusCode: 400, errors: validation.errors }
    );
  }

  const code = String(data.code).toUpperCase();

  const values = [
    data.name, code, data.description || null, data.state_code || 'MH',
    data.basic_calculation_mode || 'PERCENT_OF_NET',
    data.basic_percent_of_net  !== undefined ? Number(data.basic_percent_of_net)  : 50.00,
    data.basic_percent_of_ctc  !== undefined ? Number(data.basic_percent_of_ctc)  : 40.00,
    data.da_fixed_amount       !== undefined ? Number(data.da_fixed_amount)       : 0.00,
    data.hra_percent_of_basic_da !== undefined ? Number(data.hra_percent_of_basic_da) : 5.00,
    data.washing_allowance     !== undefined ? Number(data.washing_allowance)     : 1000.00,
    data.education_allowance   !== undefined ? Number(data.education_allowance)   : 1200.00,
    data.conveyance_allowance  !== undefined ? Number(data.conveyance_allowance)  : 1750.00,
    data.medical_allowance     !== undefined ? Number(data.medical_allowance)     : 1000.00,
    data.books_periodicals     !== undefined ? Number(data.books_periodicals)     : 1000.00,
    data.pf_ceiling_mode || 'ACTUAL',
    data.employee_pf_rate  !== undefined ? Number(data.employee_pf_rate)  : 0.1200,
    data.employer_pf_rate  !== undefined ? Number(data.employer_pf_rate)  : 0.1300,
    data.bonus_rate        !== undefined ? Number(data.bonus_rate)        : 0.0833,
    data.gratuity_rate     !== undefined ? Number(data.gratuity_rate)     : 0.0481,
    data.default_assessment_year || 'AY_2026_27',
    data.default_tax_regime     || 'NEW',
    data.esic_employer_rate !== undefined ? Number(data.esic_employer_rate) : 0.0325,
    data.esic_employee_rate !== undefined ? Number(data.esic_employee_rate) : 0.0075,
    data.pt_slabs_override_json ? JSON.stringify(data.pt_slabs_override_json) : null,
    data.working_days_mode || 'CALENDAR_DAYS',
    userId || null,
  ];

  const insertSQL = `
    INSERT INTO payroll_location_policies (
      name, code, description, state_code,
      basic_calculation_mode, basic_percent_of_net, basic_percent_of_ctc,
      da_fixed_amount, hra_percent_of_basic_da,
      washing_allowance, education_allowance, conveyance_allowance,
      medical_allowance, books_periodicals,
      pf_ceiling_mode, employee_pf_rate, employer_pf_rate,
      bonus_rate, gratuity_rate,
      default_assessment_year, default_tax_regime,
      esic_employer_rate, esic_employee_rate,
      pt_slabs_override_json, working_days_mode,
      is_active, created_by
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9,
      $10, $11, $12,
      $13, $14,
      $15, $16, $17,
      $18, $19,
      $20, $21,
      $22, $23,
      $24, $25,
      TRUE, $26
    )
    RETURNING *
  `;

  const result = await db.query(insertSQL, values);
  const created = result.rows[0];

  // Record history
  await _recordHistory(created.id, 'CREATE', created, userId, 'Policy created');

  return created;
}

/**
 * Update an existing location policy.
 * Merges supplied fields with current values; validates the merged result.
 * @param {string} id     Policy UUID
 * @param {object} data   Partial update fields
 * @param {string} userId Updater's user ID
 * @returns {Promise<object>} Updated policy row
 */
export async function updatePolicy(id, data, userId) {
  const current = await getPolicy(id);

  // Merge for validation
  const merged = { ...current, ...data };
  const validation = validatePolicyData(merged);
  if (!validation.valid) {
    throw Object.assign(
      new Error(`Invalid policy update: ${validation.errors.join('; ')}`),
      { statusCode: 400, errors: validation.errors }
    );
  }

  // Build SET clause dynamically (only updatable fields)
  const updatable = [
    'name', 'description', 'state_code',
    'basic_calculation_mode', 'basic_percent_of_net', 'basic_percent_of_ctc',
    'da_fixed_amount', 'hra_percent_of_basic_da',
    'washing_allowance', 'education_allowance', 'conveyance_allowance',
    'medical_allowance', 'books_periodicals',
    'pf_ceiling_mode', 'employee_pf_rate', 'employer_pf_rate',
    'bonus_rate', 'gratuity_rate',
    'default_assessment_year', 'default_tax_regime',
    'esic_employer_rate', 'esic_employee_rate',
    'pt_slabs_override_json', 'working_days_mode',
  ];

  const setClauses = [];
  const vals = [];
  let idx = 1;

  for (const field of updatable) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = $${idx}`);
      vals.push(data[field]);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    return current; // Nothing to update
  }

  vals.push(id);
  const sql = `UPDATE payroll_location_policies SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
  const result = await db.query(sql, vals);
  const updated = result.rows[0];

  await _recordHistory(id, 'UPDATE', updated, userId, `Fields updated: ${Object.keys(data).join(', ')}`);

  return updated;
}

/**
 * Soft-delete a policy (sets is_active = false).
 * Employees linked to this policy retain the FK but the policy won't be used in new payrolls.
 * @param {string} id     Policy UUID
 * @param {string} userId Actor's user ID
 * @returns {Promise<object>} Updated row
 */
export async function deletePolicy(id, userId) {
  const current = await getPolicy(id);

  const result = await db.query(
    'UPDATE payroll_location_policies SET is_active = FALSE WHERE id = $1 RETURNING *',
    [id]
  );

  await _recordHistory(id, 'DEACTIVATE', result.rows[0], userId, 'Policy deactivated (soft delete)');

  return result.rows[0];
}

/**
 * Assign a policy to a list of employees by employee IDs.
 * @param {string[]} employeeIds  Array of employee UUIDs
 * @param {string}   policyId     Policy UUID (or null to clear)
 * @param {string}   userId       Actor
 * @returns {Promise<{ updated: number }>}
 */
export async function assignPolicyToEmployees(employeeIds, policyId, userId) {
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw Object.assign(new Error('employeeIds must be a non-empty array'), { statusCode: 400 });
  }
  if (policyId) {
    await getPolicy(policyId); // validates existence
  }

  const placeholders = employeeIds.map((_, i) => `$${i + 1}`).join(', ');
  const result = await db.query(
    `UPDATE employees SET location_policy_id = $${employeeIds.length + 1}
     WHERE id IN (${placeholders})`,
    [...employeeIds, policyId || null]
  );

  return { updated: result.rowCount };
}

/**
 * Get the policy applicable for a given employee.
 * Returns null if no policy is assigned or if the assigned policy is inactive.
 * @param {string} employeeId
 * @returns {Promise<object|null>}
 */
export async function getPolicyForEmployee(employeeId) {
  const result = await db.query(
    `SELECT lp.*
     FROM employees e
     JOIN payroll_location_policies lp ON lp.id = e.location_policy_id
     WHERE e.id = $1 AND lp.is_active = TRUE`,
    [employeeId]
  );
  return result.rows[0] || null;
}

/**
 * Return policy history for a given policy.
 * @param {string} policyId
 * @returns {Promise<object[]>}
 */
export async function getPolicyHistory(policyId) {
  const result = await db.query(
    `SELECT * FROM payroll_location_policy_history
     WHERE policy_id = $1
     ORDER BY changed_at DESC`,
    [policyId]
  );
  return result.rows;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function _recordHistory(policyId, changeType, snapshot, changedBy, summary) {
  try {
    await db.query(
      `INSERT INTO payroll_location_policy_history
         (policy_id, changed_by, change_type, snapshot, change_summary)
       VALUES ($1, $2, $3, $4, $5)`,
      [policyId, changedBy || null, changeType, JSON.stringify(snapshot), summary]
    );
  } catch (err) {
    // History recording failure must never break the primary operation
    console.error('[locationPolicyService] History record failed:', err.message);
  }
}
