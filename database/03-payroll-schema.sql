-- =====================================================================
-- PATILONE ENTERPRISE PORTAL — NATIVE INDIAN PAYROLL SCHEMA V1
-- =====================================================================

-- 1. Extend Employees Table with Banking & Statutory Information
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS uan_number VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pf_number VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS esi_number VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(10) DEFAULT 'New';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'Bank';

-- 2. Payroll Components Master
CREATE TABLE IF NOT EXISTS payroll_components (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'
    description TEXT,
    depends_on_payment_days BOOLEAN DEFAULT TRUE,
    is_tax_applicable BOOLEAN DEFAULT TRUE,
    is_statutory BOOLEAN DEFAULT FALSE,
    calculation_type VARCHAR(30) DEFAULT 'FIXED', -- 'FIXED', 'PERCENTAGE_OF_BASIC', 'FORMULA'
    default_percentage NUMERIC(5,2) DEFAULT 0,
    round_to_nearest_integer BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Salary Structures Master
CREATE TABLE IF NOT EXISTS salary_structures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Salary Structure Line Items
CREATE TABLE IF NOT EXISTS salary_structure_items (
    id SERIAL PRIMARY KEY,
    structure_id INT NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    component_id INT NOT NULL REFERENCES payroll_components(id) ON DELETE RESTRICT,
    calculation_type VARCHAR(30) NOT NULL DEFAULT 'PERCENTAGE_OF_BASIC', -- 'FIXED', 'PERCENTAGE_OF_BASIC', 'PERCENTAGE_OF_GROSS'
    percentage_or_amount NUMERIC(12,2) DEFAULT 0,
    formula TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(structure_id, component_id)
);

-- 5. Employee Salary Structure Assignments (Effective Dated)
CREATE TABLE IF NOT EXISTS employee_salary_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    structure_id INT NOT NULL REFERENCES salary_structures(id) ON DELETE RESTRICT,
    from_date DATE NOT NULL,
    to_date DATE,
    base_monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    ctc_annual NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_esa_emp_date ON employee_salary_assignments(employee_id, from_date);

-- 6. Versioned Statutory Configurations
CREATE TABLE IF NOT EXISTS payroll_statutory_configs (
    id SERIAL PRIMARY KEY,
    statutory_code VARCHAR(50) NOT NULL, -- 'EPF', 'ESIC', 'PT_MAHARASHTRA', 'TDS'
    config_version VARCHAR(20) NOT NULL,
    effective_from DATE NOT NULL,
    rules_json JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Monthly Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'PR-2026-10'
    month INT NOT NULL,
    year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'APPROVED', 'FINALIZED', 'PAID', 'CANCELLED'
    total_employees INT DEFAULT 0,
    total_working_days NUMERIC(4,1) DEFAULT 30,
    total_gross_pay NUMERIC(14,2) DEFAULT 0,
    total_deductions NUMERIC(14,2) DEFAULT 0,
    total_employer_contributions NUMERIC(14,2) DEFAULT 0,
    total_net_pay NUMERIC(14,2) DEFAULT 0,
    submitted_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    finalized_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    finalized_at TIMESTAMPTZ,
    is_locked BOOLEAN DEFAULT FALSE,
    payment_mode VARCHAR(50) DEFAULT 'Bank Transfer (NEFT/RTGS)',
    payment_date DATE,
    payment_reference VARCHAR(100),
    payment_notes TEXT,
    created_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_payroll_month_year UNIQUE(month, year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

-- 8. Salary Slips (Employee Monthly Records)
CREATE TABLE IF NOT EXISTS salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slip_number VARCHAR(60) UNIQUE NOT NULL,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    structure_id INT REFERENCES salary_structures(id) ON DELETE SET NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_working_days NUMERIC(4,1) NOT NULL DEFAULT 30,
    payment_days NUMERIC(4,1) NOT NULL DEFAULT 30,
    lwp_days NUMERIC(4,1) NOT NULL DEFAULT 0,
    timesheet_hours NUMERIC(6,2) DEFAULT 0,
    gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    employer_contributions NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    rounded_net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_pay_in_words TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'APPROVED', 'FINALIZED', 'WITHHELD'
    bank_name VARCHAR(100),
    bank_account_no VARCHAR(50),
    ifsc_code VARCHAR(20),
    pan_number VARCHAR(20),
    uan_number VARCHAR(30),
    tax_regime VARCHAR(10) DEFAULT 'New',
    calculation_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_slip_period UNIQUE(employee_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_salary_slips_run ON salary_slips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_salary_slips_emp ON salary_slips(employee_id);

-- 9. Salary Slip Items (Line Item Breakdown)
CREATE TABLE IF NOT EXISTS salary_slip_items (
    id SERIAL PRIMARY KEY,
    salary_slip_id UUID NOT NULL REFERENCES salary_slips(id) ON DELETE CASCADE,
    component_id INT REFERENCES payroll_components(id) ON DELETE SET NULL,
    component_code VARCHAR(50) NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_statutory BOOLEAN DEFAULT FALSE,
    description TEXT,
    display_order INT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_slip_items_slip ON salary_slip_items(salary_slip_id);

-- 10. Payroll Audit Logs
CREATE TABLE IF NOT EXISTS payroll_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    actor_name VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    changes JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pal_entity ON payroll_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pal_time ON payroll_audit_logs(created_at DESC);

-- =====================================================================
-- SEED DATA: STATUTORY CONFIGURATIONS, COMPONENTS & DEFAULT STRUCTURES
-- =====================================================================

-- Statutory Config: EPF (Employees' Provident Fund)
INSERT INTO payroll_statutory_configs (statutory_code, config_version, effective_from, rules_json, description)
VALUES (
    'EPF',
    '2026.1',
    '2026-01-01',
    '{
        "employee_rate": 0.12,
        "employer_eps_rate": 0.0833,
        "employer_epf_rate": 0.0367,
        "edli_rate": 0.005,
        "admin_rate": 0.005,
        "wage_ceiling": 15000,
        "eps_ceiling": 15000,
        "max_employee_deduction_capped": 1800,
        "max_employer_eps_capped": 1250
    }'::jsonb,
    'Official Indian EPF rules under Employees Provident Funds and Miscellaneous Provisions Act, 1952'
) ON CONFLICT DO NOTHING;

-- Statutory Config: ESIC (Employees State Insurance)
INSERT INTO payroll_statutory_configs (statutory_code, config_version, effective_from, rules_json, description)
VALUES (
    'ESIC',
    '2026.1',
    '2026-01-01',
    '{
        "gross_wage_threshold": 21000,
        "employee_rate": 0.0075,
        "employer_rate": 0.0325,
        "total_rate": 0.04
    }'::jsonb,
    'Official Indian ESIC rules under ESI Act, 1948'
) ON CONFLICT DO NOTHING;

-- Statutory Config: Maharashtra Professional Tax (PT)
INSERT INTO payroll_statutory_configs (statutory_code, config_version, effective_from, rules_json, description)
VALUES (
    'PT_MAHARASHTRA',
    '2026.1',
    '2026-01-01',
    '{
        "state": "Maharashtra",
        "slabs": [
            {"min": 0, "max": 7500, "rate": 0},
            {"min": 7501, "max": 10000, "rate": 175},
            {"min": 10001, "max": null, "rate": 200, "february_rate": 300}
        ],
        "female_exemption_ceiling": 25000
    }'::jsonb,
    'Maharashtra State Tax on Professions, Trades, Callings and Employments Act'
) ON CONFLICT DO NOTHING;

-- Statutory Config: Income Tax TDS Slabs (New Regime default)
INSERT INTO payroll_statutory_configs (statutory_code, config_version, effective_from, rules_json, description)
VALUES (
    'TDS',
    '2026.1',
    '2026-01-01',
    '{
        "standard_deduction": 75000,
        "health_and_education_cess": 0.04,
        "new_regime_slabs": [
            {"min": 0, "max": 300000, "rate": 0.0},
            {"min": 300001, "max": 700000, "rate": 0.05},
            {"min": 700001, "max": 1000000, "rate": 0.10},
            {"min": 1000001, "max": 1200000, "rate": 0.15},
            {"min": 1200001, "max": 1500000, "rate": 0.20},
            {"min": 1500001, "max": null, "rate": 0.30}
        ],
        "rebate_87a_limit": 700000
    }'::jsonb,
    'Indian Income Tax Section 115BAC New Tax Regime'
) ON CONFLICT DO NOTHING;

-- Seed Standard Indian Salary Components
INSERT INTO payroll_components (code, name, type, description, depends_on_payment_days, is_tax_applicable, is_statutory, calculation_type, default_percentage, display_order)
VALUES 
    ('BASIC', 'Basic Salary', 'EARNING', 'Base compensation subject to statutory EPF calculations', TRUE, TRUE, FALSE, 'PERCENTAGE_OF_BASIC', 100.00, 1),
    ('HRA', 'House Rent Allowance', 'EARNING', 'House rent allowance for accommodation expenses', TRUE, TRUE, FALSE, 'PERCENTAGE_OF_BASIC', 50.00, 2),
    ('SPECIAL_ALLOWANCE', 'Special Allowance', 'EARNING', 'Flexible supplementary allowance balancing monthly CTC', TRUE, TRUE, FALSE, 'FIXED', 0, 3),
    ('CONVEYANCE', 'Conveyance Allowance', 'EARNING', 'Transport & commuting allowance', TRUE, TRUE, FALSE, 'FIXED', 0, 4),
    ('MEDICAL_ALLOWANCE', 'Medical Allowance', 'EARNING', 'Medical support allowance', TRUE, TRUE, FALSE, 'FIXED', 0, 5),
    ('PERFORMANCE_BONUS', 'Performance Bonus / Incentive', 'EARNING', 'Discretionary approved performance incentive', FALSE, TRUE, FALSE, 'FIXED', 0, 6),
    ('ARREARS', 'Salary Arrears', 'EARNING', 'Retroactive salary adjustments from prior revisions', FALSE, TRUE, FALSE, 'FIXED', 0, 7),
    ('EXPENSE_REIMBURSEMENT', 'Approved Expense Reimbursements', 'EARNING', 'Reimbursements for approved business & travel claims', FALSE, FALSE, FALSE, 'FIXED', 0, 8),
    ('PF_EMPLOYEE', 'Provident Fund (Employee)', 'DEDUCTION', 'Employee statutory EPF contribution (12% of Basic)', TRUE, FALSE, TRUE, 'PERCENTAGE_OF_BASIC', 12.00, 9),
    ('ESIC_EMPLOYEE', 'ESIC (Employee)', 'DEDUCTION', 'Employee statutory ESIC contribution (0.75% of Gross)', TRUE, FALSE, TRUE, 'FIXED', 0, 10),
    ('PT_MAHARASHTRA', 'Professional Tax', 'DEDUCTION', 'Maharashtra statutory professional tax', FALSE, FALSE, TRUE, 'FIXED', 0, 11),
    ('TDS', 'Income Tax TDS', 'DEDUCTION', 'Tax deducted at source under Section 192', FALSE, FALSE, TRUE, 'FIXED', 0, 12),
    ('PF_EMPLOYER', 'Provident Fund (Employer)', 'EMPLOYER_CONTRIBUTION', 'Employer statutory EPF contribution (12% split)', TRUE, FALSE, TRUE, 'PERCENTAGE_OF_BASIC', 12.00, 13),
    ('ESIC_EMPLOYER', 'ESIC (Employer)', 'EMPLOYER_CONTRIBUTION', 'Employer statutory ESIC contribution (3.25% of Gross)', TRUE, FALSE, TRUE, 'FIXED', 0, 14)
ON CONFLICT (code) DO NOTHING;

-- Seed Default Salary Structures
INSERT INTO salary_structures (name, code, description)
VALUES 
    ('Standard Engineering Staff (Full-Time)', 'ENG-FT-STD', 'Standard monthly compensation structure for engineering, technical & administrative staff'),
    ('Executive Leadership Structure', 'EXEC-DIR-STD', 'High-tier executive compensation structure with bonus components'),
    ('Associate / Operator Grade Structure', 'ASSOC-TECH-STD', 'Entry-level and shopfloor technical staff structure with ESIC eligibility')
ON CONFLICT (code) DO NOTHING;

-- Link Components to Standard Structure ('ENG-FT-STD')
INSERT INTO salary_structure_items (structure_id, component_id, calculation_type, percentage_or_amount)
SELECT 
    s.id,
    c.id,
    CASE 
        WHEN c.code = 'BASIC' THEN 'FIXED'
        WHEN c.code = 'HRA' THEN 'PERCENTAGE_OF_BASIC'
        WHEN c.code = 'SPECIAL_ALLOWANCE' THEN 'FIXED'
        WHEN c.code = 'PF_EMPLOYEE' THEN 'PERCENTAGE_OF_BASIC'
        WHEN c.code = 'PF_EMPLOYER' THEN 'PERCENTAGE_OF_BASIC'
        ELSE 'FIXED'
    END,
    CASE 
        WHEN c.code = 'BASIC' THEN 0 -- Provided on employee assignment
        WHEN c.code = 'HRA' THEN 50.00 -- 50% of Basic
        WHEN c.code = 'SPECIAL_ALLOWANCE' THEN 0
        WHEN c.code = 'PF_EMPLOYEE' THEN 12.00 -- 12% of Basic
        WHEN c.code = 'PF_EMPLOYER' THEN 12.00 -- 12% of Basic
        ELSE 0
    END
FROM salary_structures s
CROSS JOIN payroll_components c
WHERE s.code = 'ENG-FT-STD' 
  AND c.code IN ('BASIC', 'HRA', 'SPECIAL_ALLOWANCE', 'PF_EMPLOYEE', 'PT_MAHARASHTRA', 'TDS', 'PF_EMPLOYER')
ON CONFLICT (structure_id, component_id) DO NOTHING;

-- Link Components to Associate Structure ('ASSOC-TECH-STD')
INSERT INTO salary_structure_items (structure_id, component_id, calculation_type, percentage_or_amount)
SELECT 
    s.id,
    c.id,
    CASE 
        WHEN c.code = 'BASIC' THEN 'FIXED'
        WHEN c.code = 'HRA' THEN 'PERCENTAGE_OF_BASIC'
        WHEN c.code = 'SPECIAL_ALLOWANCE' THEN 'FIXED'
        WHEN c.code = 'PF_EMPLOYEE' THEN 'PERCENTAGE_OF_BASIC'
        WHEN c.code = 'PF_EMPLOYER' THEN 'PERCENTAGE_OF_BASIC'
        ELSE 'FIXED'
    END,
    CASE 
        WHEN c.code = 'BASIC' THEN 0
        WHEN c.code = 'HRA' THEN 40.00 -- 40% of Basic
        WHEN c.code = 'SPECIAL_ALLOWANCE' THEN 0
        WHEN c.code = 'PF_EMPLOYEE' THEN 12.00
        WHEN c.code = 'PF_EMPLOYER' THEN 12.00
        ELSE 0
    END
FROM salary_structures s
CROSS JOIN payroll_components c
WHERE s.code = 'ASSOC-TECH-STD' 
  AND c.code IN ('BASIC', 'HRA', 'SPECIAL_ALLOWANCE', 'PF_EMPLOYEE', 'ESIC_EMPLOYEE', 'PT_MAHARASHTRA', 'PF_EMPLOYER', 'ESIC_EMPLOYER')
ON CONFLICT (structure_id, component_id) DO NOTHING;

-- Update Existing Employees with Indian Banking and Statutory Details
UPDATE employees SET 
    pan_number = COALESCE(pan_number, 'AAACS' || LPAD(SUBSTRING(employee_code FROM 4), 4, '0') || 'P'),
    bank_name = COALESCE(bank_name, 'HDFC Bank Ltd'),
    bank_account_no = COALESCE(bank_account_no, '50100' || LPAD(SUBSTRING(employee_code FROM 4), 8, '9')),
    ifsc_code = COALESCE(ifsc_code, 'HDFC0000123'),
    uan_number = COALESCE(uan_number, '10123456' || LPAD(SUBSTRING(employee_code FROM 4), 4, '0')),
    pf_number = COALESCE(pf_number, 'MH/BAN/0012345/' || employee_code),
    tax_regime = COALESCE(tax_regime, 'New'),
    payment_mode = COALESCE(payment_mode, 'Bank')
WHERE employee_code LIKE 'SH-%';

-- Assign Standard Salary Structure to Existing Active Employees
INSERT INTO employee_salary_assignments (
    employee_id,
    structure_id,
    from_date,
    base_monthly_salary,
    ctc_annual,
    notes,
    is_active
)
SELECT 
    e.employee_id,
    s.id,
    '2026-01-01'::DATE,
    CASE 
        WHEN e.employee_code = 'SH-001' THEN 120000.00 -- CEO (Basic ₹1,20,000 / mo)
        WHEN e.employee_code = 'SH-002' THEN 65000.00  -- HR (Basic ₹65,000 / mo)
        WHEN e.employee_code = 'SH-003' THEN 85000.00  -- Manager (Basic ₹85,000 / mo)
        WHEN e.employee_code = 'SH-004' THEN 55000.00  -- Senior Automation Engineer
        WHEN e.employee_code = 'SH-005' THEN 60000.00  -- Lead Mechanical Engineer
        WHEN e.employee_code = 'SH-006' THEN 48000.00  -- QA Lead Engineer
        WHEN e.employee_code = 'SH-007' THEN 52000.00  -- Lead Robotics
        WHEN e.employee_code = 'SH-008' THEN 50000.00  -- Lead Robotics
        ELSE 40000.00
    END,
    CASE 
        WHEN e.employee_code = 'SH-001' THEN 2800000.00
        WHEN e.employee_code = 'SH-002' THEN 1500000.00
        WHEN e.employee_code = 'SH-003' THEN 2000000.00
        WHEN e.employee_code = 'SH-004' THEN 1300000.00
        WHEN e.employee_code = 'SH-005' THEN 1400000.00
        WHEN e.employee_code = 'SH-006' THEN 1150000.00
        WHEN e.employee_code = 'SH-007' THEN 1250000.00
        WHEN e.employee_code = 'SH-008' THEN 1200000.00
        ELSE 1000000.00
    END,
    'Initial system migration compensation assignment',
    TRUE
FROM employees e
CROSS JOIN salary_structures s
WHERE s.code = 'ENG-FT-STD' AND e.is_active = TRUE
ON CONFLICT DO NOTHING;
