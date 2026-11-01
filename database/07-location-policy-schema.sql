-- ============================================================
-- Location Policy Schema
-- Multi-branch configurable payroll policy engine
-- ============================================================
-- NOTE: Location names are purely user-defined generic strings.
--       No real geographic names are seeded here.
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- Table: payroll_location_policies
-- Stores per-branch payroll formula configuration editable by HR
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_location_policies (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                        VARCHAR(150) NOT NULL,          -- User-defined generic name, e.g., "Branch Alpha"
    code                        VARCHAR(50)  NOT NULL UNIQUE,   -- Slug, e.g., "BRANCH-ALPHA"
    description                 TEXT,

    -- ── Professional Tax ──────────────────────────────────────
    state_code                  VARCHAR(10)  NOT NULL DEFAULT 'MH',
    -- Supported values: 'MH' (Maharashtra), 'MP' (Madhya Pradesh),
    --                   'GJ' (Gujarat), 'KA' (Karnataka), 'NONE'

    -- ── Basic Salary Configuration ────────────────────────────
    basic_calculation_mode      VARCHAR(20)  NOT NULL DEFAULT 'PERCENT_OF_NET',
    -- 'PERCENT_OF_NET'  : basic = netSalary × basic_percent_of_net / 100
    -- 'PERCENT_OF_CTC'  : basic = monthlyCTC × basic_percent_of_ctc / 100
    -- 'FIXED_GRADE'     : basic = amount from grade table (future)
    basic_percent_of_net        NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    basic_percent_of_ctc        NUMERIC(5,2) NOT NULL DEFAULT 40.00,

    -- ── DA (Dearness Allowance) ───────────────────────────────
    da_fixed_amount             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    -- Fixed monthly DA amount in ₹; 0 = no DA for this location

    -- ── HRA ──────────────────────────────────────────────────
    hra_percent_of_basic_da     NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    -- HRA = (Basic + DA) × hra_percent_of_basic_da / 100

    -- ── Fixed Allowances (monthly, ₹) ────────────────────────
    washing_allowance           NUMERIC(12,2) NOT NULL DEFAULT 1000.00,
    education_allowance         NUMERIC(12,2) NOT NULL DEFAULT 1200.00,
    conveyance_allowance        NUMERIC(12,2) NOT NULL DEFAULT 1750.00,
    medical_allowance           NUMERIC(12,2) NOT NULL DEFAULT 1000.00,
    books_periodicals           NUMERIC(12,2) NOT NULL DEFAULT 1000.00,

    -- ── PF Configuration ─────────────────────────────────────
    pf_ceiling_mode             VARCHAR(20)  NOT NULL DEFAULT 'ACTUAL',
    -- '15000'   : PF wage capped at ₹15,000 (statutory minimum ceiling)
    -- '25000'   : PF wage capped at ₹25,000 (higher voluntary ceiling)
    -- 'ACTUAL'  : PF wage = Basic+DA with no ceiling
    employee_pf_rate            NUMERIC(7,4) NOT NULL DEFAULT 0.1200,  -- 12%
    employer_pf_rate            NUMERIC(7,4) NOT NULL DEFAULT 0.1300,
    -- NOTE: 13% is a combined approximation used for cost modelling
    -- (EPF 3.67% + EPS 8.33% + EDLI 0.50% + Admin ~0.50%).
    -- Legal compliance deductions continue to use precise split rates
    -- in statutoryRulesService.js. This rate is for CTC costing only.

    -- ── Bonus ─────────────────────────────────────────────────
    bonus_rate                  NUMERIC(7,4) NOT NULL DEFAULT 0.0833,  -- 8.33%
    -- Payment of Bonus Act: 8.33% of (Basic+DA), capped at ₹7,000/month
    -- The cap enforcement happens in the calculation engine.

    -- ── Gratuity ──────────────────────────────────────────────
    gratuity_rate               NUMERIC(7,4) NOT NULL DEFAULT 0.0481,  -- 4.81%
    -- Employer cost accrual per AS 15 / actuarial estimate.
    -- NOT the statutory vesting amount (which requires 5 years service).
    -- Formula: (Basic+DA) × 15 / 26 / 12 ≈ 4.81% per month

    -- ── Tax / TDS ─────────────────────────────────────────────
    default_assessment_year     VARCHAR(20)  NOT NULL DEFAULT 'AY_2026_27',
    default_tax_regime          VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    -- 'NEW' : New tax regime (default from FY 2024-25 onwards)
    -- 'OLD' : Old tax regime (opt-in)

    -- ── ESIC ──────────────────────────────────────────────────
    esic_employer_rate          NUMERIC(7,4) NOT NULL DEFAULT 0.0325,  -- 3.25%
    esic_employee_rate          NUMERIC(7,4) NOT NULL DEFAULT 0.0075,  -- 0.75%

    -- ── Metadata ──────────────────────────────────────────────
    is_active                   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by                  UUID,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- ── Constraints ───────────────────────────────────────────
    CONSTRAINT chk_basic_mode   CHECK (basic_calculation_mode IN ('PERCENT_OF_NET', 'PERCENT_OF_CTC', 'FIXED_GRADE')),
    CONSTRAINT chk_pf_ceiling   CHECK (pf_ceiling_mode IN ('15000', '25000', 'ACTUAL')),
    CONSTRAINT chk_state_code   CHECK (state_code IN ('MH', 'MP', 'GJ', 'KA', 'TN', 'AP', 'TS', 'WB', 'OTHER', 'NONE')),
    CONSTRAINT chk_tax_regime   CHECK (default_tax_regime IN ('NEW', 'OLD')),
    CONSTRAINT chk_basic_pct    CHECK (basic_percent_of_net > 0 AND basic_percent_of_net <= 100),
    CONSTRAINT chk_hra_pct      CHECK (hra_percent_of_basic_da >= 0 AND hra_percent_of_basic_da <= 100)
);

COMMENT ON TABLE payroll_location_policies IS
    'Configurable payroll formula parameters per branch/location. '
    'All numeric rates and allowances are editable by HR from the UI. '
    'Location names are free-text; no geographic names are hardcoded.';

-- ----------------------------------------------------------------
-- Trigger: auto-update updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_location_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_location_policy_updated_at ON payroll_location_policies;
CREATE TRIGGER trg_location_policy_updated_at
    BEFORE UPDATE ON payroll_location_policies
    FOR EACH ROW EXECUTE FUNCTION update_location_policy_timestamp();

-- ----------------------------------------------------------------
-- Alter employees: add location_policy_id FK (nullable)
-- ----------------------------------------------------------------
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS location_policy_id UUID
        REFERENCES payroll_location_policies(id)
        ON DELETE SET NULL;

COMMENT ON COLUMN employees.location_policy_id IS
    'Links employee to a payroll location policy. '
    'NULL = use system-default policy. '
    'The existing free-text `location` column is preserved for display.';

-- ----------------------------------------------------------------
-- Table: payroll_location_policy_history
-- Immutable audit log of every policy change for reproducible payroll
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_location_policy_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       UUID NOT NULL REFERENCES payroll_location_policies(id),
    changed_by      UUID,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_type     VARCHAR(20) NOT NULL,   -- 'CREATE', 'UPDATE', 'DEACTIVATE'
    snapshot        JSONB NOT NULL,         -- Full policy row at the time of change
    change_summary  TEXT
);

COMMENT ON TABLE payroll_location_policy_history IS
    'Immutable audit log of payroll_location_policies changes. '
    'Enables historically accurate payroll recalculation for any past period.';

-- ----------------------------------------------------------------
-- Index: fast employee lookup by policy
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_employees_location_policy_id
    ON employees(location_policy_id)
    WHERE location_policy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_policy_history_policy_id
    ON payroll_location_policy_history(policy_id, changed_at DESC);

-- ----------------------------------------------------------------
-- Table: payroll_import_staging
-- Temporary holding area for bulk-imported employee payroll data.
--
-- Employees are staged here, then promoted to the `employees` table
-- by HR once auth credentials (email, password, role) are assigned.
-- This decouples payroll data import from the auth account creation flow.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_import_staging (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code       VARCHAR(50) NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    designation         VARCHAR(100),
    department          VARCHAR(100),
    gender              VARCHAR(20) DEFAULT 'Male',
    date_of_birth       DATE,
    joining_date        DATE,
    personal_email      VARCHAR(255),
    pan_number          VARCHAR(20),
    uan_number          VARCHAR(30),
    bank_name           VARCHAR(100),
    bank_account_no     VARCHAR(50),
    ifsc_code           VARCHAR(20),
    location_policy_id  UUID REFERENCES payroll_location_policies(id) ON DELETE SET NULL,
    target_net_salary   NUMERIC(12,2),
    target_annual_ctc   NUMERIC(12,2),
    import_status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- 'PENDING'   : Staged, not yet promoted
    -- 'PROMOTED'  : Successfully moved to employees table
    -- 'FAILED'    : Promotion failed (see promotion_error)
    -- 'DUPLICATE' : employee_code already existed, skipped
    promotion_error     TEXT,
    imported_by         UUID,
    imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    promoted_at         TIMESTAMPTZ,
    employee_id         UUID REFERENCES employees(employee_id) ON DELETE SET NULL
    -- Populated after successful promotion
);

COMMENT ON TABLE payroll_import_staging IS
    'Staging area for bulk payroll imports. '
    'Employees are promoted to the main employees table '
    'after HR assigns email, password, and system role.';

CREATE INDEX IF NOT EXISTS idx_import_staging_code   ON payroll_import_staging(employee_code);
CREATE INDEX IF NOT EXISTS idx_import_staging_status ON payroll_import_staging(import_status);
CREATE INDEX IF NOT EXISTS idx_import_staging_policy ON payroll_import_staging(location_policy_id);

COMMIT;
