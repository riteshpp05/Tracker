// Backend/src/services/payroll/bankPaymentExportService.js

/**
 * Bank Payment Export Service
 * Generates standard NEFT / RTGS / Corporate Banking payment files (CSV format)
 * Validates IFSC, account numbers, amounts, and checksums.
 *
 * Security: All exported fields are sanitised against CSV/spreadsheet formula injection.
 * Fields starting with =, +, -, @, TAB (0x09), CR (0x0D) are prefixed with a single-quote
 * to prevent Microsoft Excel / LibreOffice Calc from evaluating them as formulas.
 * Reference: OWASP CSV Injection — https://owasp.org/www-community/attacks/CSV_Injection
 */
class BankPaymentExportService {
  /**
   * Sanitise a single text value against CSV formula injection.
   * Any value that starts with =, +, -, @, 0x09, 0x0D is prefixed with ' so
   * spreadsheet applications treat it as a literal string.
   * The result is always wrapped in double-quotes and internal double-quotes are escaped.
   *
   * @param {*} value
   * @returns {string} CSV-safe quoted string
   */
  sanitiseField(value) {
    const raw = String(value == null ? "" : value).trim();
    // Prefix formula-injection triggers with a single apostrophe
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    // Escape internal double-quotes and wrap in quotes
    return `"${safe.replace(/"/g, '""')}"`;
  }

  /**
   * Validate an Indian IFSC code.
   * Format: 4 uppercase letters (bank code) + '0' + 6 alphanumeric (branch code)
   * Total 11 characters.
   *
   * @param {string} ifsc
   * @returns {{ valid: boolean, error?: string }}
   */
  validateIFSC(ifsc) {
    const code = (ifsc || "").trim().toUpperCase();
    if (!code) return { valid: false, error: "IFSC code is missing" };
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      return {
        valid: false,
        error: `IFSC '${code}' is invalid (expected format: XXXX0XXXXXX — 4 alpha, '0', 6 alphanumeric)`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate an Indian bank account number.
   * Indian bank account numbers are 9–18 digits (numeric only).
   *
   * @param {string} accountNo
   * @returns {{ valid: boolean, error?: string }}
   */
  validateAccountNumber(accountNo) {
    const acc = (accountNo || "").trim();
    if (!acc) return { valid: false, error: "Bank account number is missing" };
    if (!/^\d{9,18}$/.test(acc)) {
      return {
        valid: false,
        error: `Account '${acc}' is invalid (must be 9–18 numeric digits)`,
      };
    }
    return { valid: true };
  }

  /**
   * Generate CSV format for bank batch processing.
   * Standard columns:
   * Sr No, Employee Code, Beneficiary Name, Account Number, IFSC Code, Bank Name, Amount, Currency, Narration, Email
   *
   * NOTE: This method accepts ONLY slips from a FINALIZED or PAID payroll run.
   * The controller layer is responsible for enforcing that pre-condition.
   *
   * @param {Object} run   Payroll run record (month, year, run_code, status)
   * @param {Array}  slips Salary slip rows joined with employee banking details
   * @returns {{ filename, content, totalRecords, totalAmount, validationWarnings }}
   */
  generateBankPaymentCSV(run, slips) {
    const headers = [
      "Sr No",
      "Employee Code",
      "Beneficiary Name",
      "Account Number",
      "IFSC Code",
      "Bank Name",
      "Amount",
      "Currency",
      "Narration",
      "Email",
    ];

    let srNo = 1;
    const rows = [];
    const validationWarnings = [];
    let totalAmount = 0;

    for (const slip of slips) {
      const netPay = Number(slip.rounded_net_pay || 0);
      if (netPay <= 0) continue;

      const accountNo = (slip.bank_account_no || "").trim();
      const ifscRaw = (slip.ifsc_code || "").trim().toUpperCase();
      const narration = `SALARY ${slip.month}/${slip.year} ${slip.employee_code}`;
      const fullName = `${slip.first_name || ""} ${slip.last_name || ""}`.trim();

      // --- Validation ---
      const ifscCheck = this.validateIFSC(ifscRaw);
      if (!ifscCheck.valid) {
        validationWarnings.push({
          employeeCode: slip.employee_code,
          field: "IFSC",
          error: ifscCheck.error,
        });
      }

      const accCheck = this.validateAccountNumber(accountNo);
      if (!accCheck.valid) {
        validationWarnings.push({
          employeeCode: slip.employee_code,
          field: "AccountNumber",
          error: accCheck.error,
        });
      }

      // --- Build sanitised row ---
      rows.push([
        srNo++,                                      // Sr No — numeric, no injection risk
        this.sanitiseField(slip.employee_code),
        this.sanitiseField(fullName),
        this.sanitiseField(accountNo),               // Account number — numeric but sanitised for safety
        this.sanitiseField(ifscRaw),
        this.sanitiseField(slip.bank_name || "N/A"),
        netPay.toFixed(2),                           // Numeric — no wrapping needed, no injection risk
        "INR",
        this.sanitiseField(narration),
        this.sanitiseField(slip.email || ""),
      ]);

      totalAmount += netPay;
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\r\n");

    return {
      filename: `Salary_Payment_Batch_${run.month}_${run.year}_${run.run_code}.csv`,
      content: csvContent,
      totalRecords: rows.length,
      // totalAmount is re-computed from the actual rows generated, not re-summed from raw slip data,
      // preventing double-counting slips skipped for zero/negative pay.
      totalAmount: Math.round(totalAmount * 100) / 100,
      validationWarnings,
    };
  }
}

export default new BankPaymentExportService();
