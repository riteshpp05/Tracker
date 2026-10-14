-- =====================================================================
-- PATILONE ENTERPRISE EXTENSION — CLOUDSTINE-INSPIRED SUITE (V1)
-- 1. Geofenced Attendance & Punch System (Check-In / Check-Out)
-- 2. Break Tracking & Regularization Requests
-- 3. Office Geofence Master & Location Rules
-- 4. Corporate Holiday Calendar
-- 5. Enterprise Announcements & Notices
-- 6. Policy & Document Management
-- =====================================================================

-- 1. Office Geofences Master
CREATE TABLE IF NOT EXISTS office_geofences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    radius_meters INT DEFAULT 500,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Pune',
    state VARCHAR(100) DEFAULT 'Maharashtra',
    country VARCHAR(100) DEFAULT 'India',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Geofence (Pune Tech Center & Mumbai Operations)
INSERT INTO office_geofences (name, code, latitude, longitude, radius_meters, address, city, state, country)
VALUES 
    ('PatilOne Pune Tech Park HQ', 'PUNE-HQ', 18.5204303, 73.8567437, 500, 'Plot 42, Hinjewadi Phase 1, Rajiv Gandhi Infotech Park', 'Pune', 'Maharashtra', 'India'),
    ('PatilOne Mumbai Regional Hub', 'MUMBAI-HUB', 19.0760900, 72.8774260, 600, 'Bandra Kurla Complex, G-Block', 'Mumbai', 'Maharashtra', 'India')
ON CONFLICT (code) DO NOTHING;

-- 2. Daily Attendance Logs (Geofenced Check-in / Punch)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    punch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMPTZ,
    check_in_latitude NUMERIC(10, 7),
    check_in_longitude NUMERIC(10, 7),
    check_in_address VARCHAR(255),
    check_out_latitude NUMERIC(10, 7),
    check_out_longitude NUMERIC(10, 7),
    check_out_address VARCHAR(255),
    is_geofence_compliant BOOLEAN DEFAULT true,
    work_mode VARCHAR(50) DEFAULT 'OFFICE', -- 'OFFICE', 'REMOTE', 'CLIENT_SITE'
    total_work_minutes INT DEFAULT 0,
    total_break_minutes INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PRESENT', -- 'PRESENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'ABSENT'
    ip_address VARCHAR(100),
    device_info VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_emp_punch_date UNIQUE (employee_id, punch_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_logs(employee_id, punch_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(punch_date);

-- 3. Attendance Break Tracking (Tea, Lunch, Short Breaks)
CREATE TABLE IF NOT EXISTS attendance_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES attendance_logs(id) ON DELETE CASCADE,
    break_type VARCHAR(50) DEFAULT 'TEA', -- 'TEA', 'LUNCH', 'BIO', 'PERSONAL'
    break_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    break_end TIMESTAMPTZ,
    duration_minutes INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_break_attendance ON attendance_breaks(attendance_id);

-- 4. Attendance Regularization Requests (Missed Punch Correction)
CREATE TABLE IF NOT EXISTS attendance_regularizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    punch_date DATE NOT NULL,
    requested_check_in TIMESTAMPTZ NOT NULL,
    requested_check_out TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    reviewed_by UUID REFERENCES employees(employee_id),
    reviewed_at TIMESTAMPTZ,
    reviewer_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reg_emp ON attendance_regularizations(employee_id);
CREATE INDEX IF NOT EXISTS idx_reg_status ON attendance_regularizations(status);

-- 5. Company Holiday Calendar
CREATE TABLE IF NOT EXISTS company_holidays (
    id SERIAL PRIMARY KEY,
    holiday_name VARCHAR(150) NOT NULL,
    holiday_date DATE NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    holiday_type VARCHAR(50) DEFAULT 'MANDATORY', -- 'MANDATORY', 'RESTRICTED', 'OPTIONAL'
    description TEXT,
    year INT NOT NULL,
    is_paid BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_holiday_date UNIQUE (holiday_date, holiday_name)
);

-- Seed 2026 Indian Holidays
INSERT INTO company_holidays (holiday_name, holiday_date, day_of_week, holiday_type, description, year, is_paid)
VALUES
    ('Republic Day', '2026-01-26', 'Monday', 'MANDATORY', 'National Holiday — Republic Day of India', 2026, true),
    ('Maha Shivratri', '2026-02-15', 'Sunday', 'RESTRICTED', 'Religious Observance', 2026, true),
    ('Holi', '2026-03-04', 'Wednesday', 'MANDATORY', 'Festival of Colours', 2026, true),
    ('Gudi Padwa / Ugadi', '2026-03-20', 'Friday', 'MANDATORY', 'Maharashtra & Regional New Year', 2026, true),
    ('Good Friday', '2026-04-03', 'Friday', 'MANDATORY', 'Christian Observance', 2026, true),
    ('Dr. B.R. Ambedkar Jayanti', '2026-04-14', 'Tuesday', 'MANDATORY', 'Birth anniversary of Dr. B.R. Ambedkar', 2026, true),
    ('Maharashtra Day / Labour Day', '2026-05-01', 'Friday', 'MANDATORY', 'State Formation Day and International Workers Day', 2026, true),
    ('Independence Day', '2026-08-15', 'Saturday', 'MANDATORY', 'National Holiday — Indian Independence Day', 2026, true),
    ('Ganesh Chaturthi', '2026-09-14', 'Monday', 'MANDATORY', 'Vinayaka Chaturthi State Festival', 2026, true),
    ('Mahatma Gandhi Jayanti', '2026-10-02', 'Friday', 'MANDATORY', 'National Holiday — Birth anniversary of Mahatma Gandhi', 2026, true),
    ('Dussehra (Vijayadashami)', '2026-10-20', 'Tuesday', 'MANDATORY', 'Victory of Good over Evil', 2026, true),
    ('Diwali (Laxmi Pujan)', '2026-11-08', 'Sunday', 'MANDATORY', 'Festival of Lights', 2026, true),
    ('Diwali (Balipratipada)', '2026-11-10', 'Tuesday', 'MANDATORY', 'New Year & Govardhan Puja', 2026, true),
    ('Guru Nanak Jayanti', '2026-11-24', 'Tuesday', 'MANDATORY', 'Gurpurab', 2026, true),
    ('Christmas Day', '2026-12-25', 'Friday', 'MANDATORY', 'Christmas Celebration', 2026, true)
ON CONFLICT (holiday_date, holiday_name) DO NOTHING;

-- 6. Enterprise Announcements & Notice Board
CREATE TABLE IF NOT EXISTS company_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'GENERAL', -- 'GENERAL', 'HR', 'PAYROLL', 'EVENT', 'URGENT'
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'NORMAL', 'HIGH', 'CRITICAL'
    created_by UUID REFERENCES employees(employee_id),
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed Announcements
INSERT INTO company_announcements (title, content, category, priority, is_published)
VALUES
    ('Welcome to PatilOne Enterprise Portal V2', 'We are pleased to introduce our integrated HRMS suite featuring native Indian payroll, automated statutory compliance (EPF, ESIC, PT, TDS), and geofenced real-time attendance.', 'GENERAL', 'HIGH', true),
    ('Diwali Holiday Schedule & Early Payroll Cutoff', 'Kindly note that November payroll cutoff will be processed 2 days prior to Diwali festivities. Ensure timesheet and expense submissions are approved on schedule.', 'PAYROLL', 'HIGH', true),
    ('New Health & ESI Coverage Verification', 'All technical and operator-grade associates eligible for ESIC can now verify their e-Pehchan card and dispensary details via the Employee Portal.', 'HR', 'NORMAL', true)
ON CONFLICT DO NOTHING;

-- 7. Policy & Document Management
CREATE TABLE IF NOT EXISTS company_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'POLICY', -- 'POLICY', 'HANDBOOK', 'BENEFITS', 'COMPLIANCE'
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_kb INT DEFAULT 0,
    version VARCHAR(20) DEFAULT '1.0',
    uploaded_by UUID REFERENCES employees(employee_id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed Policy Documents
INSERT INTO company_documents (title, description, category, file_name, file_url, file_size_kb, version)
VALUES
    ('Employee Code of Conduct & Ethics', 'Standard corporate guidelines on professional conduct, integrity, and anti-harassment.', 'HANDBOOK', 'PatilOne_Code_of_Conduct_2026.pdf', '/docs/policies/code-of-conduct.pdf', 340, '2026.1'),
    ('Travel & Business Expense Policy', 'Approved allowances for domestic travel, lodging caps, per-diem meals, and mileage rates.', 'POLICY', 'PatilOne_Travel_Policy_2026.pdf', '/docs/policies/travel-policy.pdf', 215, '2026.1'),
    ('Leave & Working Hours Guidelines', 'Rules governing paid leaves, sick leaves, casual leaves, compensatory offs, and core shift hours.', 'POLICY', 'PatilOne_Leave_Guidelines.pdf', '/docs/policies/leave-guidelines.pdf', 180, '2026.2'),
    ('Indian Statutory Benefits & PF Guide', 'Explains EPF 12%, EPS pension allocation, EDLI insurance, ESIC benefits, and Maharashtra PT slabs.', 'COMPLIANCE', 'PatilOne_Statutory_Benefits_Guide.pdf', '/docs/policies/statutory-guide.pdf', 420, '2026.1')
ON CONFLICT DO NOTHING;
