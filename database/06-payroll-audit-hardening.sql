-- =====================================================================
-- 06-PAYROLL-AUDIT-HARDENING.SQL
-- PatilOne / Shende Industries Enterprise Portal
-- Audit & Hardening Migration: Constraints, Indexing & Auditability
-- =====================================================================

-- 1. Ensure salary_slips net pay cannot be negative
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_salary_slips_net_pay_non_negative'
    ) THEN
        ALTER TABLE salary_slips ADD CONSTRAINT chk_salary_slips_net_pay_non_negative 
        CHECK (net_pay >= 0 AND rounded_net_pay >= 0);
    END IF;
END $$;

-- 2. Index for active salary assignments lookup by date
CREATE INDEX IF NOT EXISTS idx_esa_active_dates 
ON employee_salary_assignments(employee_id, is_active, from_date, to_date);

-- 3. Index for unpaid expense claims ready for payroll aggregation
CREATE INDEX IF NOT EXISTS idx_exp_claims_reimb_lookup 
ON expense_claims(employee_id, status, reimbursement_status, expense_date);

-- 4. Index on salary slips by employee and period for quick YTD calculations
CREATE INDEX IF NOT EXISTS idx_salary_slips_emp_period 
ON salary_slips(employee_id, year, month);

-- 5. Extend payroll_runs table to support documented proration policy
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS proration_basis VARCHAR(30) DEFAULT 'CALENDAR_DAYS';
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 6. Add check on PAN format (optional warning level in DB, enforced in app)
COMMENT ON COLUMN employees.pan_number IS 'Indian Income Tax PAN — 10 chars (e.g. AAACS1234P)';
COMMENT ON COLUMN payroll_runs.status IS 'DRAFT, SUBMITTED, APPROVED, REJECTED, FINALIZED, PAID, CANCELLED';
