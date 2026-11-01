-- =====================================================================
-- 09-RECRUITMENT-CAREERS-LIFECYCLE.SQL
-- PatilOne / Shende Industries Enterprise Portal v3.0
-- Public Careers ATS, Candidate Stage Tracking & Payroll Handoff
-- =====================================================================

BEGIN;

-- 1. Create or extend recruitment_jobs table
CREATE TABLE IF NOT EXISTS recruitment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    location_policy_id UUID REFERENCES payroll_location_policies(id) ON DELETE SET NULL,
    employment_type VARCHAR(50) DEFAULT 'FULL_TIME', -- FULL_TIME, CONTRACT, PLANT_SHIFT
    compensation_band VARCHAR(100),
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED, DRAFT
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Extend existing job_applications table with tracking and interview handoff fields
-- Remove legacy FK to job_postings so job_id can reference either recruitment_jobs or job_postings
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_job_id_fkey;

ALTER TABLE job_applications
    ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS experience_years NUMERIC(4,1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cover_note TEXT,
    ADD COLUMN IF NOT EXISTS interview_score INT,
    ADD COLUMN IF NOT EXISTS onboarded_user_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL;

-- Backfill full_name from candidate_name if present
UPDATE job_applications 
SET full_name = candidate_name 
WHERE full_name IS NULL AND candidate_name IS NOT NULL;

-- Backfill tracking_code if missing
UPDATE job_applications
SET tracking_code = 'APP-2026-' || SUBSTRING(id::text, 1, 8)
WHERE tracking_code IS NULL;

-- 3. Create employee_statutory_profiles table if not present
CREATE TABLE IF NOT EXISTS employee_statutory_profiles (
    employee_id UUID PRIMARY KEY REFERENCES employees(employee_id) ON DELETE CASCADE,
    pan_number VARCHAR(20),
    uan_number VARCHAR(20),
    pf_member_joined_after_sep_2014 BOOLEAN DEFAULT TRUE,
    eps_eligible_override BOOLEAN,
    esic_ip_number VARCHAR(30),
    esic_enrolled_in_current_period BOOLEAN DEFAULT FALSE,
    vpf_percent NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Seed 3 Realistic Open Positions into recruitment_jobs
INSERT INTO recruitment_jobs (
    job_code, title, department, location_name, employment_type,
    compensation_band, description, requirements, status
) VALUES 
(
    'JOB-2026-01',
    'Senior Full-Stack Engineer',
    'Engineering',
    'Tech Centre HQ',
    'FULL_TIME',
    '₹18,00,000 - ₹24,00,000 / year',
    'Architect and build high-precision enterprise payroll calculation engines, maker-checker governance workflows, and real-time biometric attendance pipelines using React, Express, and PostgreSQL.',
    '• 5+ years building production applications with Node.js, React, and PostgreSQL.\n• Strong grasp of statutory calculation engines and database transaction safety.\n• Experience with E2E automation testing frameworks like Playwright.',
    'OPEN'
),
(
    'JOB-2026-02',
    'Plant Production Supervisor',
    'Manufacturing',
    'Manufacturing Facility Alpha',
    'PLANT_SHIFT',
    '₹6,00,000 - ₹9,00,000 / year',
    'Oversee factory shop-floor operations, shift attendance logging, safety protocol enforcement, and automated assembly packaging lines.',
    '• 3+ years supervisory experience in industrial manufacturing plants.\n• Working knowledge of factory shift scheduling, overtime rules, and safety audits.\n• Strong communication and team leadership skills.',
    'OPEN'
),
(
    'JOB-2026-03',
    'Payroll & Statutory Compliance Specialist',
    'Human Resources',
    'Corporate Operations',
    'FULL_TIME',
    '₹10,00,000 - ₹14,00,000 / year',
    'Manage monthly payroll finalization, multi-state Professional Tax reconciliation, EPF/ESIC statutory filings, and bank disbursal exports for 300+ enterprise employees.',
    '• In-depth mastery of Indian labor laws: EPF Act 1952, ESI Act 1948, Payment of Gratuity Act 1972.\n• Proven track record executing zero-variance CTC reconciliations.\n• Experience handling internal and external payroll compliance audits.',
    'OPEN'
)
ON CONFLICT (job_code) DO UPDATE SET
    title = EXCLUDED.title,
    department = EXCLUDED.department,
    location_name = EXCLUDED.location_name,
    compensation_band = EXCLUDED.compensation_band,
    description = EXCLUDED.description,
    requirements = EXCLUDED.requirements,
    status = 'OPEN';

-- Also ensure job_postings has corresponding Published rows
INSERT INTO job_postings (
    title, slug, location, employment_type, experience_level,
    description, requirements, salary_range, status
) VALUES
(
    'Senior Full-Stack Engineer',
    'senior-full-stack-engineer-2026',
    'Tech Centre HQ',
    'Full-time',
    'Senior',
    'Architect and build high-precision enterprise payroll calculation engines, maker-checker governance workflows, and real-time biometric attendance pipelines using React, Express, and PostgreSQL.',
    '• 5+ years building production applications with Node.js, React, and PostgreSQL.\n• Strong grasp of statutory calculation engines and database transaction safety.',
    '₹18,00,000 - ₹24,00,000 / year',
    'Published'
),
(
    'Plant Production Supervisor',
    'plant-production-supervisor-2026',
    'Manufacturing Facility Alpha',
    'Full-time',
    'Mid-Level',
    'Oversee factory shop-floor operations, shift attendance logging, safety protocol enforcement, and automated assembly packaging lines.',
    '• 3+ years supervisory experience in industrial manufacturing plants.\n• Working knowledge of factory shift scheduling, overtime rules, and safety audits.',
    '₹6,00,000 - ₹9,00,000 / year',
    'Published'
),
(
    'Payroll & Statutory Compliance Specialist',
    'payroll-statutory-compliance-specialist-2026',
    'Corporate Operations',
    'Full-time',
    'Senior',
    'Manage monthly payroll finalization, multi-state Professional Tax reconciliation, EPF/ESIC statutory filings, and bank disbursal exports for 300+ enterprise employees.',
    '• In-depth mastery of Indian labor laws: EPF Act 1952, ESI Act 1948, Payment of Gratuity Act 1972.',
    '₹10,00,000 - ₹14,00,000 / year',
    'Published'
)
ON CONFLICT (slug) DO UPDATE SET
    status = 'Published';

COMMIT;
