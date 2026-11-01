/**
 * bulkImportService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Bulk employee import from CSV or XLSX for the Location Policy payroll engine.
 *
 * Supports 300+ employees in a single batch.
 * Uses ExcelJS for XLSX parsing (already in Backend/package.json).
 * CSV is parsed with Node.js built-ins (no extra dependency).
 *
 * Template columns (header row must match exactly, case-insensitive):
 *   employee_code, first_name, last_name, location_code,
 *   designation, department, joining_date,
 *   target_net_salary, target_annual_ctc,
 *   bank_name, bank_account, ifsc,
 *   pan, uan, gender, date_of_birth, personal_email
 *
 * All columns except employee_code, first_name, last_name are optional.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import ExcelJS   from "exceljs";
import db        from "../../config/database.js";
import { getPolicyByCode } from "./locationPolicyService.js";
import payrollValidationService from "./payrollValidationService.js";
import bankExportService        from "./bankPaymentExportService.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  "employee_code",
  "first_name",
  "last_name",
  "location_code",
  "designation",
  "department",
  "joining_date",
  "target_net_salary",
  "target_annual_ctc",
  "bank_name",
  "bank_account",
  "ifsc",
  "pan",
  "uan",
  "gender",
  "date_of_birth",
  "personal_email",
];

const REQUIRED_COLUMNS = ["employee_code", "first_name", "last_name"];

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a CSV buffer into an array of row objects keyed by normalised header names.
 * @param {Buffer} buffer
 * @returns {{ headers: string[], rows: object[] }}
 */
function parseCsv(buffer) {
  const text  = buffer.toString("utf-8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    throw Object.assign(new Error("CSV file must contain a header row and at least one data row"), { statusCode: 400 });
  }

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const rows    = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV split — does not handle quoted commas; sufficient for import template
    const cells = lines[i].split(",");
    const row   = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] || "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

// ─── XLSX Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse an XLSX buffer (Sheet 1) into an array of row objects.
 * @param {Buffer} buffer
 * @returns {Promise<{ headers: string[], rows: object[] }>}
 */
async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet   = workbook.worksheets[0];

  if (!sheet) {
    throw Object.assign(new Error("XLSX file contains no sheets"), { statusCode: 400 });
  }

  const allRows  = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    allRows.push(row.values.slice(1)); // ExcelJS row.values[0] is undefined
  });

  if (allRows.length < 2) {
    throw Object.assign(new Error("XLSX file must contain a header row and at least one data row"), { statusCode: 400 });
  }

  const headers = allRows[0].map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const rows    = [];

  for (let i = 1; i < allRows.length; i++) {
    const cells = allRows[i];
    const row   = {};
    headers.forEach((h, idx) => {
      const cell = cells[idx];
      row[h] = cell !== undefined && cell !== null ? String(cell).trim() : "";
    });
    // Skip fully-empty rows
    if (Object.values(row).every(v => v === "")) continue;
    rows.push(row);
  }

  return { headers, rows };
}

// ─── Row Validation ───────────────────────────────────────────────────────────

/**
 * Validate a single parsed row.
 * Returns { valid: true, data: cleanedRow } or { valid: false, errors: [] }
 * @param {object} row     Raw parsed row
 * @param {number} rowNum  1-based row number (for error messages)
 * @returns {{ valid: boolean, errors: object[], data: object }}
 */
async function validateRow(row, rowNum) {
  const errors = [];

  // ── Required fields ──────────────────────────────────────────────────
  for (const col of REQUIRED_COLUMNS) {
    if (!row[col] || String(row[col]).trim() === "") {
      errors.push({ row: rowNum, field: col, message: `${col} is required` });
    }
  }

  // ── Employee code format (alphanumeric, 2–20 chars) ──────────────────
  const code = String(row.employee_code || "").trim().toUpperCase();
  if (code && !/^[A-Z0-9_-]{2,20}$/.test(code)) {
    errors.push({ row: rowNum, field: "employee_code", message: `employee_code '${code}' must be 2-20 alphanumeric/hyphen/underscore chars` });
  }

  // ── PAN ─────────────────────────────────────────────────────────────
  if (row.pan && !payrollValidationService.isValidPAN(row.pan)) {
    errors.push({ row: rowNum, field: "pan", message: `PAN '${row.pan}' is not a valid Indian PAN format (AAAAA1234A)` });
  }

  // ── UAN ─────────────────────────────────────────────────────────────
  if (row.uan && !payrollValidationService.isValidUAN(row.uan)) {
    errors.push({ row: rowNum, field: "uan", message: `UAN '${row.uan}' must be exactly 12 numeric digits` });
  }

  // ── IFSC ─────────────────────────────────────────────────────────────
  if (row.ifsc) {
    const ifscResult = bankExportService.validateIFSC(row.ifsc);
    if (!ifscResult.valid) {
      errors.push({ row: rowNum, field: "ifsc", message: `IFSC '${row.ifsc}': ${ifscResult.error}` });
    }
  }

  // ── Bank account ──────────────────────────────────────────────────────
  if (row.bank_account) {
    const accResult = bankExportService.validateAccountNumber(row.bank_account);
    if (!accResult.valid) {
      errors.push({ row: rowNum, field: "bank_account", message: `bank_account: ${accResult.error}` });
    }
  }

  // ── Salary amounts ────────────────────────────────────────────────────
  if (row.target_net_salary && isNaN(Number(row.target_net_salary))) {
    errors.push({ row: rowNum, field: "target_net_salary", message: "target_net_salary must be a number" });
  }
  if (row.target_annual_ctc && isNaN(Number(row.target_annual_ctc))) {
    errors.push({ row: rowNum, field: "target_annual_ctc", message: "target_annual_ctc must be a number" });
  }

  // ── Joining date ──────────────────────────────────────────────────────
  let joiningDate = null;
  if (row.joining_date) {
    const d = new Date(row.joining_date);
    if (isNaN(d.getTime())) {
      errors.push({ row: rowNum, field: "joining_date", message: `joining_date '${row.joining_date}' is not a valid date (use YYYY-MM-DD)` });
    } else {
      joiningDate = d.toISOString().split("T")[0];
    }
  }

  // ── Location policy lookup ────────────────────────────────────────────
  let locationPolicyId = null;
  if (row.location_code) {
    const policy = await getPolicyByCode(row.location_code);
    if (!policy) {
      errors.push({ row: rowNum, field: "location_code", message: `location_code '${row.location_code}' does not match any active location policy` });
    } else {
      locationPolicyId = policy.id;
    }
  }

  // ── Gender ────────────────────────────────────────────────────────────
  const gender = String(row.gender || "Male").trim();
  if (gender && !["male", "female", "other"].includes(gender.toLowerCase())) {
    errors.push({ row: rowNum, field: "gender", message: `gender '${gender}' must be Male, Female, or Other` });
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null };
  }

  return {
    valid: true,
    errors: [],
    data: {
      employee_code:      code,
      first_name:         String(row.first_name || "").trim(),
      last_name:          String(row.last_name  || "").trim(),
      location_policy_id: locationPolicyId,
      designation:        String(row.designation  || "").trim() || null,
      department:         String(row.department   || "").trim() || null,
      joining_date:       joiningDate,
      target_net_salary:  row.target_net_salary  ? Number(row.target_net_salary)  : null,
      target_annual_ctc:  row.target_annual_ctc  ? Number(row.target_annual_ctc)  : null,
      bank_name:          String(row.bank_name    || "").trim() || null,
      bank_account_no:    String(row.bank_account || "").trim() || null,
      ifsc_code:          row.ifsc ? String(row.ifsc).trim().toUpperCase() : null,
      pan_number:         row.pan  ? String(row.pan).trim().toUpperCase()  : null,
      uan_number:         row.uan  ? String(row.uan).trim()                : null,
      gender:             gender,
      date_of_birth:      row.date_of_birth  || null,
      personal_email:     row.personal_email || null,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a CSV or XLSX buffer and return headers + raw rows.
 * Detects format from XLSX magic bytes; falls back to CSV.
 * @param {Buffer} fileBuffer
 * @returns {Promise<{ headers: string[], rows: object[] }>}
 */
export async function parseBulkTemplate(fileBuffer) {
  // XLSX magic bytes: PK\x03\x04
  const isXlsx = fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B;
  return isXlsx ? parseXlsx(fileBuffer) : parseCsv(fileBuffer);
}

/**
 * Validate all parsed rows.
 * @param {object[]} rows  Raw rows from parseBulkTemplate
 * @returns {Promise<{ valid: object[], errors: { row, field, message }[] }>}
 */
export async function validateBulkRows(rows) {
  const valid  = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const result = await validateRow(rows[i], i + 2); // +2: 1-based + skip header
    if (result.valid) {
      valid.push(result.data);
    } else {
      errors.push(...result.errors);
    }
  }

  return { valid, errors };
}

/**
 * Bulk-import validated employee rows into the payroll_import_staging table.
 *
 * WHY STAGING?
 * The `employees` table requires email (UNIQUE NOT NULL), password_hash (NOT NULL),
 * and role (FK NOT NULL) for authentication. Bulk payroll imports typically arrive
 * without these auth credentials. The staging table holds payroll data; HR then
 * promotes each record to a full account by assigning credentials and role.
 *
 * Deduplicates by employee_code within the same import (first occurrence wins).
 * Records already in staging with import_status='PROMOTED' are also skipped.
 *
 * @param {object[]} validRows  Already-validated clean rows
 * @param {string}   createdBy  Actor UUID
 * @returns {Promise<{ imported: number, skipped: number, skippedCodes: string[], errors: object[] }>}
 */
export async function importValidRows(validRows, createdBy) {
  if (!Array.isArray(validRows) || validRows.length === 0) {
    return { imported: 0, skipped: 0, skippedCodes: [], errors: [] };
  }

  // ── Check for already-promoted codes ──────────────────────────────────
  const codes    = validRows.map(r => r.employee_code);
  const existing = await db.query(
    `SELECT employee_code FROM payroll_import_staging
     WHERE employee_code = ANY($1) AND import_status = 'PROMOTED'`,
    [codes]
  );
  const promotedSet = new Set(existing.rows.map(r => r.employee_code));

  // De-duplicate within this import batch (first occurrence wins)
  const seen     = new Set();
  const toInsert = [];
  const skipped  = [];

  for (const r of validRows) {
    if (promotedSet.has(r.employee_code) || seen.has(r.employee_code)) {
      skipped.push(r.employee_code);
    } else {
      seen.add(r.employee_code);
      toInsert.push(r);
    }
  }

  if (toInsert.length === 0) {
    return { imported: 0, skipped: skipped.length, skippedCodes: skipped, errors: [] };
  }

  // ── Batch INSERT into staging ─────────────────────────────────────────
  const insertErrors = [];
  let importedCount  = 0;

  const BATCH_SIZE = 50;
  for (let start = 0; start < toInsert.length; start += BATCH_SIZE) {
    const batch = toInsert.slice(start, start + BATCH_SIZE);

    const valuePlaceholders = batch.map((_, i) => {
      const base = i * 17;
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17})`;
    }).join(", ");

    const values = [];
    for (const r of batch) {
      values.push(
        r.employee_code,
        r.first_name,
        r.last_name,
        r.designation    || null,
        r.department     || null,
        r.gender         || "Male",
        r.date_of_birth  || null,
        r.joining_date   || null,
        r.personal_email || null,
        r.pan_number     || null,
        r.uan_number     || null,
        r.bank_name      || null,
        r.bank_account_no || null,
        r.ifsc_code      || null,
        r.location_policy_id || null,
        r.target_net_salary  || null,
        r.target_annual_ctc  || null,
      );
    }

    // prepend imported_by placeholder: it's per-batch (same user for all)
    // Build SQL with imported_by as a fixed value
    const sqlValues = values;
    sqlValues.push(createdBy || null);
    const importedByIdx = batch.length * 17 + 1;

    try {
      const sql = `
        INSERT INTO payroll_import_staging (
          employee_code, first_name, last_name,
          designation, department, gender,
          date_of_birth, joining_date, personal_email,
          pan_number, uan_number,
          bank_name, bank_account_no, ifsc_code,
          location_policy_id,
          target_net_salary, target_annual_ctc,
          imported_by
        )
        SELECT v.*, $${importedByIdx} AS imported_by
        FROM (VALUES ${valuePlaceholders}) AS v(
          employee_code, first_name, last_name,
          designation, department, gender,
          date_of_birth, joining_date, personal_email,
          pan_number, uan_number,
          bank_name, bank_account_no, ifsc_code,
          location_policy_id,
          target_net_salary, target_annual_ctc
        )
        RETURNING employee_code
      `;
      const result = await db.query(sql, sqlValues);
      importedCount += result.rowCount;
    } catch (batchErr) {
      insertErrors.push({
        batch:   `rows ${start + 1}–${start + batch.length}`,
        message: batchErr.message,
      });
    }
  }

  return {
    imported:     importedCount,
    skipped:      skipped.length,
    skippedCodes: skipped,
    errors:       insertErrors,
    note:         "Records imported to payroll_import_staging. HR must promote them to employee accounts.",
  };
}

/**
 * Build and return a CSV template string for download.
 * @returns {string}
 */
export function getTemplateCsv() {
  const header  = TEMPLATE_HEADERS.join(",");
  const example = [
    "EMP001", "Rajesh", "Sharma", "BRANCH-ALPHA",
    "Engineer", "Engineering", "2024-01-15",
    "26000", "381132",
    "HDFC Bank", "00001234567890", "HDFC0001234",
    "AAAAA1234A", "123456789012",
    "Male", "1990-05-20", "rajesh@example.com",
  ].join(",");
  const notes = [
    "# NOTES:",
    "# employee_code: unique identifier (required)",
    "# first_name / last_name: required",
    "# location_code: must match an active Location Policy code",
    "# target_net_salary: monthly net in-hand in ₹ (for Mode A / Net-to-CTC)",
    "# target_annual_ctc: approved annual CTC in ₹ (for Mode B / CTC-to-Net)",
    "# pan: Indian PAN format AAAAA1234A",
    "# uan: 12-digit EPFO UAN",
    "# ifsc: 11-character bank IFSC code",
    "# joining_date / date_of_birth: YYYY-MM-DD format",
  ].join("\n");

  return `${header}\n${example}\n${notes}`;
}
