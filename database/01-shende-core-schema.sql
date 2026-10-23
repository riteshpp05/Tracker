-- =====================================================================
-- SHENDE INDUSTRIES ENTERPRISE PORTAL — CONSOLIDATED CORE SCHEMA V1
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic timestamp update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- =====================================================================
-- 1. ORGANIZATIONS & SYSTEM CONFIGURATION
-- =====================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL DEFAULT 'Shende Industries',
    code VARCHAR(50) UNIQUE NOT NULL DEFAULT 'SHENDE',
    tagline VARCHAR(255) DEFAULT 'Precision Engineering & Industrial Automation',
    logo_url TEXT,
    website VARCHAR(255) DEFAULT 'https://www.shendeindustries.com',
    contact_email VARCHAR(255) DEFAULT 'contact@shendeindustries.com',
    phone VARCHAR(50) DEFAULT '+1 (555) 019-2834',
    address TEXT DEFAULT '100 Industrial Parkway, Suite 400, Chicago, IL 60601',
    timezone VARCHAR(50) DEFAULT 'America/Chicago',
    currency VARCHAR(10) DEFAULT 'USD',
    working_hours_per_week NUMERIC(4,1) DEFAULT 40.0,
    working_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(200) DEFAULT 'Shende Industries',
    tagline VARCHAR(255) DEFAULT 'Precision Engineering & Industrial Automation',
    contact_email VARCHAR(255) DEFAULT 'contact@shendeindustries.com',
    phone VARCHAR(50) DEFAULT '+1 (555) 019-2834',
    address TEXT DEFAULT '100 Industrial Parkway, Suite 400, Chicago, IL 60601',
    timezone VARCHAR(50) DEFAULT 'America/Chicago',
    working_hours_per_week NUMERIC(4,1) DEFAULT 40.0,
    working_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    logo_url TEXT,
    public_website_settings JSONB DEFAULT '{"showCareers": true, "showServices": true, "heroTitle": "Engineered for Excellence. Built for Industry.", "heroSubtitle": "Leading industrial automation, precision manufacturing, and advanced engineering solutions for global enterprises."}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 2. ROLES, DEPARTMENTS & DESIGNATIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS designations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, department_id)
);

-- =====================================================================
-- 3. EMPLOYEES
-- =====================================================================
CREATE TABLE IF NOT EXISTS employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role INTEGER REFERENCES user_roles(id) NOT NULL,
    department INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    designation VARCHAR(100),
    module_manager_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    phone VARCHAR(50),
    emergency_contact VARCHAR(100),
    address TEXT,
    skills TEXT[] DEFAULT '{}',
    doj DATE DEFAULT CURRENT_DATE,
    separation_date DATE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(module_manager_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);

DROP TRIGGER IF EXISTS trigger_update_employees_timestamp ON employees;
CREATE TRIGGER trigger_update_employees_timestamp
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 4. CLIENTS & PROJECTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS client_master (
    client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(150) UNIQUE NOT NULL,
    client_code VARCHAR(50) UNIQUE NOT NULL,
    alias VARCHAR(100),
    spoc_name VARCHAR(100),
    spoc_phone VARCHAR(50),
    spoc_email VARCHAR(255),
    url TEXT,
    zoho_crm_code VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS project_master (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES client_master(client_id) ON DELETE RESTRICT,
    project_name VARCHAR(150) NOT NULL,
    project_code VARCHAR(50),
    description TEXT,
    start_date DATE,
    end_date DATE,
    estimated_days INT,
    approved_days INT,
    budget_hours NUMERIC(10,2) DEFAULT 0,
    billable_hours NUMERIC(10,2) DEFAULT 0,
    status INTEGER REFERENCES project_status(id) DEFAULT 1,
    manager_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    spoc_name VARCHAR(100),
    spoc_email VARCHAR(255),
    spoc_phone VARCHAR(50),
    zoho_crm_code VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_master_client ON project_master(client_id);
CREATE INDEX IF NOT EXISTS idx_project_master_status ON project_master(status);

DROP TRIGGER IF EXISTS trigger_update_project_master_timestamp ON project_master;
CREATE TRIGGER trigger_update_project_master_timestamp
BEFORE UPDATE ON project_master
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Admin assigns projects to managers
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project_master(project_id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assignment_end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_manager UNIQUE(project_id, manager_id)
);

CREATE TABLE IF NOT EXISTS project_manager_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES project_master(project_id) ON DELETE CASCADE,
    manager_id UUID REFERENCES employees(employee_id) ON DELETE CASCADE,
    assignment_start_date DATE DEFAULT CURRENT_DATE,
    assignment_end_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================================
-- 5. TICKETS & TASKS
-- =====================================================================
CREATE TABLE IF NOT EXISTS ticket_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_master (
    ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_name VARCHAR(255) NOT NULL,
    ticket_number VARCHAR(50),
    project_id UUID REFERENCES project_master(project_id) ON DELETE CASCADE,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'Medium', -- Low, Medium, High, Urgent
    status INTEGER REFERENCES ticket_status(id) DEFAULT 1,
    start_date DATE,
    end_date DATE,
    estimated_date DATE,
    estimated_hours NUMERIC(8,2) DEFAULT 0,
    approved_hours NUMERIC(8,2) DEFAULT 0,
    billable_hours NUMERIC(8,2) DEFAULT 0,
    zoho_crm_code VARCHAR(100),
    created_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_master_project ON ticket_master(project_id);
CREATE INDEX IF NOT EXISTS idx_ticket_master_status ON ticket_master(status);

CREATE TABLE IF NOT EXISTS task_master (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task VARCHAR(255) NOT NULL,
    department INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    internal_project BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_assignments (
    ticket_assignments_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES ticket_master(ticket_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project_master(project_id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_ticket_employee UNIQUE(ticket_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_assignments_emp ON ticket_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_tkt ON ticket_assignments(ticket_id);

-- Backward-compatibility view for ticket_manager_scope
CREATE OR REPLACE VIEW ticket_manager_scope AS
SELECT 
    ticket_assignments_id AS id,
    ticket_id,
    employee_id AS manager_id,
    project_id,
    assigned_by,
    assigned_date,
    is_active
FROM ticket_assignments;

-- =====================================================================
-- 6. TIMESHEETS
-- =====================================================================
CREATE TABLE IF NOT EXISTS timesheet_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_timesheet_entries (
    entry_id SERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    project_id UUID REFERENCES project_master(project_id) ON DELETE SET NULL,
    client_id UUID REFERENCES client_master(client_id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES ticket_master(ticket_id) ON DELETE SET NULL,
    task_id UUID REFERENCES task_master(task_id) ON DELETE SET NULL,
    ticket_assign_id UUID REFERENCES ticket_assignments(ticket_assignments_id) ON DELETE SET NULL,
    manager_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    entry_date DATE NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    billable_hours NUMERIC(5,2) DEFAULT 0,
    non_billable_hours NUMERIC(5,2) DEFAULT 0,
    ticket_number VARCHAR(100),
    description TEXT,
    status INTEGER REFERENCES timesheet_status(id) DEFAULT 1,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dte_emp_date ON daily_timesheet_entries(employee_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_dte_week ON daily_timesheet_entries(employee_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_dte_status ON daily_timesheet_entries(status);
CREATE INDEX IF NOT EXISTS idx_dte_manager ON daily_timesheet_entries(manager_id, status);

DROP TRIGGER IF EXISTS trigger_update_dte_timestamp ON daily_timesheet_entries;
CREATE TRIGGER trigger_update_dte_timestamp
BEFORE UPDATE ON daily_timesheet_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 7. LEAVE MANAGEMENT
-- =====================================================================
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    days_allowed_per_year INT DEFAULT 18,
    is_paid BOOLEAN DEFAULT TRUE,
    requires_documentation BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id INT NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INT NOT NULL DEFAULT 2026,
    total_allocated NUMERIC(4,1) DEFAULT 18.0,
    used_days NUMERIC(4,1) DEFAULT 0.0,
    pending_days NUMERIC(4,1) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_emp_leave_year UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id INT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4,1) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Rejected, Cancelled
    manager_comments TEXT,
    approved_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- =====================================================================
-- 8. TRAVEL REQUESTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS travel_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    destination VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    estimated_budget NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Rejected, Completed
    manager_comments TEXT,
    approved_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 9. EXPENSE CLAIMS
-- =====================================================================
CREATE TABLE IF NOT EXISTS expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    project_id UUID REFERENCES project_master(project_id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- Travel, Accommodation, Meals, Equipment, Client Entertainment, Miscellaneous
    expense_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    description TEXT NOT NULL,
    receipt_url TEXT,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Rejected
    reimbursement_status VARCHAR(20) DEFAULT 'Unpaid', -- Unpaid, Processing, Paid
    manager_comments TEXT,
    approved_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_claims_emp ON expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(status);

-- =====================================================================
-- 10. RECRUITMENT & PUBLIC CAREERS (ATS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) UNIQUE NOT NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    location VARCHAR(150) NOT NULL DEFAULT 'Chicago, IL (On-site / Hybrid)',
    employment_type VARCHAR(50) DEFAULT 'Full-time', -- Full-time, Part-time, Contract, Internship
    experience_level VARCHAR(50) DEFAULT 'Mid-Level', -- Entry, Mid-Level, Senior, Lead
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    responsibilities TEXT,
    salary_range VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Published', -- Draft, Published, Closed, Archived
    created_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    candidate_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    resume_url TEXT,
    portfolio_url TEXT,
    cover_letter TEXT,
    stage VARCHAR(30) DEFAULT 'Applied', -- Applied, Screening, Interview, Assessment, Offer, Hired, Rejected, Withdrawn
    hr_notes TEXT,
    rating INT DEFAULT 0, -- 1 to 5 stars
    interview_date TIMESTAMPTZ,
    hired_employee_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_stage ON job_applications(stage);

-- =====================================================================
-- 11. PUBLIC CONTACT INQUIRIES
-- =====================================================================
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(200),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'New', -- New, In Review, Responded, Closed
    responded_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
    response_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 12. NOTIFICATIONS & IN-APP ALERTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO', -- INFO, APPROVAL, WARNING, SUCCESS
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);

-- =====================================================================
-- 13. AUDIT LOGS
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(created_at DESC);
