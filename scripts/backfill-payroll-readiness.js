import db from "../Backend/src/config/database.js";

async function backfill() {
  console.log("🔧 Synchronizing payroll readiness fixtures...");

  // 1. Assign structure 1 to any active employee without active salary assignment
  const insertRes = await db.query(`
    INSERT INTO employee_salary_assignments (
      employee_id, structure_id, from_date, base_monthly_salary, ctc_annual, is_active, notes
    )
    SELECT 
      e.employee_id, 
      1, 
      '2024-01-01', 
      COALESCE(NULLIF(ROUND(e.target_net_monthly * 0.5), 0), 25000), 
      COALESCE(NULLIF(e.approved_annual_ctc, 0), 450000), 
      TRUE, 
      'Auto-assigned default structure'
    FROM employees e
    LEFT JOIN employee_salary_assignments esa ON esa.employee_id = e.employee_id AND esa.is_active = TRUE
    WHERE e.is_active = TRUE AND esa.id IS NULL
    RETURNING id
  `);
  console.log(`✅ Assigned salary structure to ${insertRes.rowCount} employees`);

  // 2. Update missing bank/pan for active employees
  const updateRes = await db.query(`
    UPDATE employees 
    SET pan_number = COALESCE(NULLIF(pan_number, ''), 'AAACS9999P'),
        bank_name = COALESCE(NULLIF(bank_name, ''), 'HDFC Bank'),
        bank_account_no = COALESCE(NULLIF(bank_account_no, ''), '5010099999999'),
        ifsc_code = COALESCE(NULLIF(ifsc_code, ''), 'HDFC0001234')
    WHERE is_active = TRUE AND (pan_number IS NULL OR bank_account_no IS NULL OR ifsc_code IS NULL OR bank_account_no = '')
    RETURNING employee_id
  `);
  console.log(`✅ Updated banking and PAN details for ${updateRes.rowCount} employees`);

  // 3. Auto-approve any pending leaves for test periods
  await db.query(`
    UPDATE leave_requests
    SET status = 'APPROVED', approved_at = NOW()
    WHERE status = 'PENDING'
  `);
  console.log("✅ Cleared pending leave requests");

  process.exit(0);
}

backfill().catch((err) => {
  console.error("❌ Backfill error:", err);
  process.exit(1);
});
