/**
 * bulkImportController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * REST controller for bulk employee payroll import.
 *
 * Routes:
 *   GET  /api/payroll/bulk-import/template  → downloadTemplate
 *   POST /api/payroll/bulk-import/preview   → previewImport   (no save)
 *   POST /api/payroll/bulk-import           → executeImport   (saves to staging)
 *   GET  /api/payroll/bulk-import/staging   → listStagedRecords
 *
 * File upload:
 *   The routes are registered with express.raw({ type: '*\/*', limit: '10mb' })
 *   middleware, so req.body is already a Buffer when the handler fires.
 *   Client must send the raw file bytes as the POST body.
 *   Content-Type: text/csv           → for CSV files
 *   Content-Type: application/octet-stream → for XLSX files
 *
 *   The service auto-detects CSV vs XLSX from magic bytes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as bulkImportService from "../services/payroll/bulkImportService.js";

// ─── Controller Methods ───────────────────────────────────────────────────────

/**
 * GET /api/payroll/bulk-import/template
 * Returns a CSV template file for download.
 */
export async function downloadTemplate(req, res) {
  try {
    const csv = bulkImportService.getTemplateCsv();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="payroll_bulk_import_template.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/payroll/bulk-import/preview
 * Parse + validate without saving. Returns row preview and validation errors.
 * Body: raw file bytes (CSV or XLSX)
 */
export async function previewImport(req, res) {
  try {
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request body must be the raw file bytes (CSV or XLSX). Set Content-Type accordingly.",
      });
    }

    const { rows } = await bulkImportService.parseBulkTemplate(buffer);
    const { valid, errors } = await bulkImportService.validateBulkRows(rows);

    // Count unique rows with errors (row numbers de-duplicated)
    const invalidRowNums = [...new Set(errors.map(e => e.row))];

    res.json({
      success: true,
      summary: {
        totalRows:    rows.length,
        validRows:    valid.length,
        invalidRows:  invalidRowNums.length,
        errorCount:   errors.length,
      },
      validRows: valid,
      errors,
      readyToImport: errors.length === 0,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/payroll/bulk-import
 * Parse, validate, and import valid rows into payroll_import_staging.
 * Blocks import if there are ANY validation errors unless ?force=true.
 * Body: raw file bytes (CSV or XLSX)
 */
export async function executeImport(req, res) {
  try {
    const forceImportValid = req.query.force === "true";
    const buffer = req.body;

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request body must be the raw file bytes (CSV or XLSX).",
      });
    }

    const { rows } = await bulkImportService.parseBulkTemplate(buffer);
    const { valid, errors } = await bulkImportService.validateBulkRows(rows);

    if (errors.length > 0 && !forceImportValid) {
      return res.status(422).json({
        success: false,
        error:   `${errors.length} validation error(s) found. Fix all errors and re-upload, or add ?force=true to import only valid rows.`,
        summary: {
          totalRows:    rows.length,
          validRows:    valid.length,
          errorCount:   errors.length,
        },
        errors,
      });
    }

    if (valid.length === 0) {
      return res.status(422).json({
        success: false,
        error:   "No valid rows found after validation. Nothing to import.",
        errors,
      });
    }

    const result = await bulkImportService.importValidRows(valid, req.user?.id);

    res.status(201).json({
      success: true,
      message: `Bulk import complete. ${result.imported} record(s) staged for HR review, ${result.skipped} skipped (already existed).`,
      summary: {
        totalRows:        rows.length,
        validRows:        valid.length,
        validationErrors: errors.length,
        imported:         result.imported,
        skipped:          result.skipped,
      },
      skippedCodes: result.skippedCodes,
      importErrors: result.errors,
      note: result.note,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/payroll/bulk-import/staging
 * List staged import records for HR review before promotion.
 * Query: ?status=PENDING|PROMOTED|FAILED  ?limit=100&offset=0
 */
export async function listStagedRecords(req, res) {
  try {
    const { default: db } = await import("../config/database.js");
    const status  = req.query.status  || null;
    const limit   = Math.min(Number(req.query.limit)  || 100, 500);
    const offset  = Math.max(Number(req.query.offset) || 0, 0);

    const whereClause = status ? "WHERE import_status = $1" : "";
    const params      = status ? [status, limit, offset] : [limit, offset];
    const limitIdx    = status ? 2 : 1;

    const [result, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM payroll_import_staging ${whereClause}
         ORDER BY imported_at DESC
         LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
        params
      ),
      db.query(
        `SELECT COUNT(*) FROM payroll_import_staging ${whereClause}`,
        status ? [status] : []
      ),
    ]);

    res.json({
      success: true,
      data:    result.rows,
      total:   Number(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
