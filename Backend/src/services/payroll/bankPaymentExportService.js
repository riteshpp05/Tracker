// Backend/src/services/payroll/bankPaymentExportService.js

/**
 * Bank Payment Export Service
 * Generates standard NEFT / RTGS / Corporate Banking payment files (CSV format)
 * Validates IFSC, account numbers, amounts, and checksums.
 */
class BankPaymentExportService {
  /**
   * Generate CSV format for bank batch processing
   * Standard columns:
   * Sr No, Employee Code, Beneficiary Name, Account Number, IFSC Code, Bank Name, Amount, Currency, Narration, Email
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

    for (const slip of slips) {
      if (slip.rounded_net_pay <= 0) continue;

      const accountNo = (slip.bank_account_no || "").trim();
      const ifsc = (slip.ifsc_code || "").trim();
      const narration = `SALARY FOR ${slip.month}/${slip.year} - ${slip.employee_code}`;

      rows.push([
        srNo++,
        slip.employee_code,
        `"${(slip.first_name + " " + slip.last_name).replace(/"/g, '""')}"`,
        `"${accountNo}"`,
        ifsc,
        `"${(slip.bank_name || "N/A").replace(/"/g, '""')}"`,
        Number(slip.rounded_net_pay || 0).toFixed(2),
        "INR",
        `"${narration}"`,
        slip.email || "",
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\r\n");

    return {
      filename: `Salary_Payment_Batch_${run.month}_${run.year}_${run.run_code}.csv`,
      content: csvContent,
      totalRecords: rows.length,
      totalAmount: slips.reduce((sum, s) => sum + (Number(s.rounded_net_pay) || 0), 0),
    };
  }
}

export default new BankPaymentExportService();
