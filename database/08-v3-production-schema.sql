-- =====================================================================
-- 08-V3-PRODUCTION-SCHEMA.SQL
-- PatilOne / Shende Industries Enterprise Portal v3.0
-- Production Hardening, Immutability Snapshots, Policy Slabs & Governance
-- =====================================================================

BEGIN;

-- 1. Hard Database-Level Maker-Checker Separation Constraint
-- Prevents the user who submitted a payroll run from approving it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_maker_checker_distinct'
    ) THEN
        ALTER TABLE payroll_runs 
        ADD CONSTRAINT chk_maker_checker_distinct 
        CHECK (submitted_by IS NULL OR approved_by IS NULL OR submitted_by <> approved_by);
    END IF;
END $$;

-- 2. Extend payroll_location_policies for Custom PT Slabs & Working Days Mode
ALTER TABLE payroll_location_policies
    ADD COLUMN IF NOT EXISTS pt_slabs_override_json JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS working_days_mode VARCHAR(30) DEFAULT 'CALENDAR_DAYS',
    ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

COMMENT ON COLUMN payroll_location_policies.pt_slabs_override_json IS 
    'Optional custom state/municipal Professional Tax slabs defined directly by HR in the UI. Overrides default state rules.';

COMMENT ON COLUMN payroll_location_policies.working_days_mode IS 
    'CALENDAR_DAYS (default 30/31), FIXED_26_DAYS (standard factory 26-day basis), or SCHEDULED_WORKING_DAYS (excluding weekly offs & holidays).';

-- 3. Extend salary_slips for Point-in-Time Immutability & Compliance Advisories
ALTER TABLE salary_slips
    ADD COLUMN IF NOT EXISTS policy_snapshot_json JSONB,
    ADD COLUMN IF NOT EXISTS compliance_advisories_json JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS statutory_breakdown_json JSONB,
    ADD COLUMN IF NOT EXISTS reconciliation_variance NUMERIC(8,2) DEFAULT 0.00;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_salary_slips_zero_variance'
    ) THEN
        ALTER TABLE salary_slips
        ADD CONSTRAINT chk_salary_slips_zero_variance
        CHECK (reconciliation_variance = 0.00);
    END IF;
END $$;

COMMENT ON COLUMN salary_slips.policy_snapshot_json IS 
    'Immutable copy of the location policy active at the moment this salary slip was calculated.';

COMMENT ON COLUMN salary_slips.compliance_advisories_json IS 
    'Statutory legal advisories (e.g., INTERNAL_CAP_25K_ADVISORY, ESIC_RULE_50_CONTINUITY_ACTIVE, BONUS_CAPPED).';

-- 4. Extend company_holidays for State & Location Policy Applicability
ALTER TABLE company_holidays
    ADD COLUMN IF NOT EXISTS applicable_states TEXT[] DEFAULT '{"ALL"}',
    ADD COLUMN IF NOT EXISTS applicable_policy_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN company_holidays.applicable_states IS 
    'Array of state codes (e.g. {MH, MP}) or {ALL} where this holiday is observed.';

-- 5. Employee Statutory Profile Extensions
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS calculation_mode VARCHAR(30) DEFAULT 'MODE_A_NET_TO_CTC',
    ADD COLUMN IF NOT EXISTS target_net_monthly NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS approved_annual_ctc NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS pf_member_joined_after_sep_2014 BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS esic_enrolled_in_current_period BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS vpf_percent NUMERIC(5,2) DEFAULT 0.00;

-- 6. Trigger to Auto-Increment Version on Policy Update
CREATE OR REPLACE FUNCTION increment_policy_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_policy_version ON payroll_location_policies;
CREATE TRIGGER trg_increment_policy_version
    BEFORE UPDATE ON payroll_location_policies
    FOR EACH ROW EXECUTE FUNCTION increment_policy_version();

COMMIT;
