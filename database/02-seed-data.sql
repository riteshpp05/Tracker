-- =====================================================================
-- SHENDE INDUSTRIES ENTERPRISE PORTAL — COMPREHENSIVE SEED DATA V1
-- =====================================================================

-- 1. Organization
INSERT INTO organizations (id, name, code, tagline, website, contact_email, phone, address, timezone, currency, working_hours_per_week)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Shende Industries Pvt. Ltd.',
    'SIPL',
    'Your Trusted Partner for Innovative Packaging Solutions',
    'https://shendeindustries.com',
    'info@shendeindustries.com',
    '+91 9022541929',
    'Off. No. 6, Second Floor, Aditi Commerce, Above Ugaoo Store, Baner Road, Pune - 411045, Maharashtra, India',
    'Asia/Kolkata',
    'INR',
    48.0
) ON CONFLICT (code) DO NOTHING;

-- Company Settings
INSERT INTO company_settings (id, organization_id, company_name, tagline, contact_email, phone, address, timezone, working_hours_per_week)
VALUES (
    1,
    'a0000000-0000-0000-0000-000000000001',
    'Shende Industries Pvt. Ltd.',
    'Your Trusted Partner for Innovative Packaging Solutions',
    'info@shendeindustries.com',
    '+91 9022541929',
    'Off. No. 6, Second Floor, Aditi Commerce, Above Ugaoo Store, Baner Road, Pune - 411045, Maharashtra, India',
    'Asia/Kolkata',
    48.0
) ON CONFLICT (id) DO NOTHING;

-- 2. User Roles
INSERT INTO user_roles (id, name, description) VALUES
    (1, 'ADMIN', 'Super Administrator with full organization-wide control and audit access'),
    (2, 'HR', 'HR Administrator managing employee onboarding, recruitment, leaves, and directory'),
    (3, 'MANAGER', 'Team/Project Manager with authority over projects, workload, and timesheet approvals'),
    (4, 'EMPLOYEE', 'Standard employee with self-service timesheets, tickets, leaves, and expense claims')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3. Departments
INSERT INTO departments (id, name, code, description) VALUES
    (1, 'Administration', 'ADMIN', 'Executive leadership and company administration'),
    (2, 'Human Resources', 'HR', 'People operations, talent acquisition, and workforce compliance'),
    (3, 'Industrial Automation', 'AUTO', 'Robotics, PLC programming, SCADA, and control systems'),
    (4, 'Precision Engineering', 'ENG', 'CNC machining, CAD/CAM mechanical modeling, and fabrication'),
    (5, 'Quality Assurance', 'QA', 'ISO 9001 compliance, metrology, sensor calibration, and QA testing')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. Designations
INSERT INTO designations (id, name, department_id) VALUES
    (1, 'Chief Executive Officer', 1),
    (2, 'HR Business Partner', 2),
    (3, 'Talent Acquisition Lead', 2),
    (4, 'Engineering Manager', 3),
    (5, 'Senior Automation Engineer', 3),
    (6, 'Robotics Specialist', 3),
    (7, 'Lead Mechanical Engineer', 4),
    (8, 'Precision Machinist', 4),
    (9, 'QA Lead Engineer', 5)
ON CONFLICT (id) DO NOTHING;

-- 5. Status Masters
INSERT INTO project_status (id, name) VALUES
    (1, 'Planned'), (2, 'In Progress'), (3, 'Completed'), (4, 'On Hold'), (5, 'Cancelled')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_status (id, name) VALUES
    (1, 'Open'), (2, 'In Progress'), (3, 'Resolved'), (4, 'Closed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO timesheet_status (id, name) VALUES
    (1, 'Draft'), (2, 'Submitted'), (3, 'Approved'), (4, 'Rejected'), (5, 'Locked')
ON CONFLICT (id) DO NOTHING;

-- 6. Leave Types
INSERT INTO leave_types (id, name, code, days_allowed_per_year, is_paid, requires_documentation) VALUES
    (1, 'Annual Paid Leave', 'AL', 18, TRUE, FALSE),
    (2, 'Sick Leave', 'SL', 10, TRUE, TRUE),
    (3, 'Casual / Personal Leave', 'CL', 7, TRUE, FALSE),
    (4, 'Maternity / Paternity Leave', 'PL', 60, TRUE, TRUE),
    (5, 'Compensatory Off', 'CO', 5, TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Employees (Bcrypt hashed)
-- Password for all seed users is role-specific with standard enterprise rules:
-- Admin:    Admin@Shende2026
-- HR:       HR@Shende2026
-- Manager:  Manager@Shende2026
-- Employee: Employee@Shende2026

INSERT INTO employees (employee_id, employee_code, first_name, last_name, email, password_hash, role, department, designation, phone, skills, doj, is_active)
VALUES
    -- Admin (Vikram Shende)
    ('e0000000-0000-0000-0000-000000000001', 'SH-001', 'Vikram', 'Shende', 'admin@shendeindustries.com',
     '$2a$10$hPGIjSHYYsTrgCBLp6BGWOdM.12clPRJR0xignt5BXYCayTDVcTYO', 1, 1, 'Chief Executive Officer', '+1 (555) 019-1001',
     ARRAY['Strategic Leadership', 'Industrial Automation', 'Enterprise Governance'], '2020-01-01', TRUE),

    -- HR (Priya Sharma)
    ('e0000000-0000-0000-0000-000000000002', 'SH-002', 'Priya', 'Sharma', 'hr@shendeindustries.com',
     '$2a$10$rfdU8v3ks5ZE2cwn7OubIOpP1nXbrNVj1u7PT53/G/TGh1iTUbae.', 2, 2, 'HR Business Partner', '+1 (555) 019-1002',
     ARRAY['Talent Acquisition', 'HRIS Management', 'Labor Law', 'Employee Engagement'], '2021-03-15', TRUE),

    -- Manager (Rajesh Patel)
    ('e0000000-0000-0000-0000-000000000003', 'SH-003', 'Rajesh', 'Patel', 'manager@shendeindustries.com',
     '$2a$10$VKbAvrwZ2yO2SE.PRVL.D.HEggLX9rCvmbsfINhSS19Yr8lSFo2Tq', 3, 3, 'Engineering Manager', '+1 (555) 019-1003',
     ARRAY['Project Management', 'PLC / SCADA', 'Robotics Integration', 'Agile Operations'], '2021-06-01', TRUE),

    -- Employee (Amit Deshmukh) - Reports to Rajesh Patel
    ('e0000000-0000-0000-0000-000000000004', 'SH-004', 'Amit', 'Deshmukh', 'employee@shendeindustries.com',
     '$2a$10$06avyxC1VkTpsCy9bdS0NeNmoCYqPyZoL.CXqvTk2Z7HIGJC3zLfq', 4, 3, 'Senior Automation Engineer', '+1 (555) 019-1004',
     ARRAY['Siemens TIA Portal', 'Beckhoff TwinCAT', 'Python Control Systems', 'ROS2'], '2022-02-10', TRUE),

    -- Additional Team Member (Neha Kulkarni) - Reports to Rajesh Patel
    ('e0000000-0000-0000-0000-000000000005', 'SH-005', 'Neha', 'Kulkarni', 'neha.k@shendeindustries.com',
     '$2a$10$06avyxC1VkTpsCy9bdS0NeNmoCYqPyZoL.CXqvTk2Z7HIGJC3zLfq', 4, 4, 'Lead Mechanical Engineer', '+1 (555) 019-1005',
     ARRAY['SolidWorks', 'FEA Simulation', 'CNC 5-Axis Programming', 'GD&T'], '2022-05-15', TRUE),

    -- Additional QA Engineer (Siddharth Verma) - Reports to Rajesh Patel
    ('e0000000-0000-0000-0000-000000000006', 'SH-006', 'Siddharth', 'Verma', 'siddharth.v@shendeindustries.com',
     '$2a$10$06avyxC1VkTpsCy9bdS0NeNmoCYqPyZoL.CXqvTk2Z7HIGJC3zLfq', 4, 5, 'QA Lead Engineer', '+1 (555) 019-1006',
     ARRAY['ISO 9001 Metrology', 'CMM Inspection', 'Automated Testing', 'SPC'], '2023-01-20', TRUE)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Set reporting managers
UPDATE employees SET module_manager_id = 'e0000000-0000-0000-0000-000000000001' WHERE employee_code IN ('SH-002', 'SH-003');
UPDATE employees SET module_manager_id = 'e0000000-0000-0000-0000-000000000003' WHERE employee_code IN ('SH-004', 'SH-005', 'SH-006');

-- 8. Leave Balances for 2026
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_allocated, used_days, pending_days)
SELECT e.employee_id, lt.id, 2026, lt.days_allowed_per_year, 2.0, 1.0
FROM employees e
CROSS JOIN leave_types lt
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;

-- 9. Sample Leave Requests
INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status, manager_comments, approved_by, approved_at)
VALUES
    ('e0000000-0000-0000-0000-000000000004', 1, CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '12 days', 3.0, 'Family vacation and personal travel', 'Pending', NULL, NULL, NULL),
    ('e0000000-0000-0000-0000-000000000005', 2, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '13 days', 2.0, 'Medical recovery and health check', 'Approved', 'Approved. Get well soon.', 'e0000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '14 days');

-- 10. Clients
INSERT INTO client_master (client_id, client_name, client_code, alias, spoc_name, spoc_email, spoc_phone, zoho_crm_code, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Boeing Commercial Airplanes', 'BOEING', 'Boeing', 'David Mitchell', 'd.mitchell@boeing.com', '+1-425-555-0192', 'CRM-BOEING-01', TRUE),
    ('c0000000-0000-0000-0000-000000000002', 'Siemens Mobility Systems', 'SIEMENS', 'Siemens', 'Klaus Weber', 'k.weber@siemens.com', '+49-89-555-0143', 'CRM-SIEMENS-02', TRUE),
    ('c0000000-0000-0000-0000-000000000003', 'Caterpillar Heavy Equipment', 'CAT', 'Caterpillar', 'Sarah Jenkins', 's.jenkins@cat.com', '+1-309-555-0811', 'CRM-CAT-03', TRUE)
ON CONFLICT (client_name) DO NOTHING;

-- 11. Projects
INSERT INTO project_master (project_id, client_id, project_name, project_code, description, start_date, end_date, budget_hours, billable_hours, status, manager_id, zoho_crm_code, is_active)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'Turbine Automation & Sensing Pod', 'PRJ-BOE-01', 'Multi-axis vibration and telemetry module for wing turbine test rigs',
     '2026-01-15', '2026-12-15', 1200.0, 480.0, 2, 'e0000000-0000-0000-0000-000000000003', 'CRM-BOEING-01', TRUE),

    ('b1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
     'Smart Rail Automated Switchgear', 'PRJ-SIE-02', 'High-reliability electro-mechanical switch automation for intercity rail network',
     '2026-02-01', '2026-10-30', 950.0, 310.0, 2, 'e0000000-0000-0000-0000-000000000003', 'CRM-SIEMENS-02', TRUE)
ON CONFLICT (project_id) DO NOTHING;

-- Project Assignments
INSERT INTO project_assignments (project_id, manager_id, assigned_by, assignment_date, is_active)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', CURRENT_DATE, TRUE),
    ('b1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', CURRENT_DATE, TRUE)
ON CONFLICT DO NOTHING;

-- 12. Tickets & Tasks
INSERT INTO ticket_master (ticket_id, ticket_name, ticket_number, project_id, description, priority, status, start_date, end_date, estimated_hours, approved_hours, billable_hours, zoho_crm_code, created_by, is_active)
VALUES
    ('b2000000-0000-0000-0000-000000000001', 'PLC Controller Firmware Synchronization', 'TKT-101', 'b1000000-0000-0000-0000-000000000001',
     'Implement Beckhoff EtherCAT cycle rate tuning for millisecond sensor updates', 'High', 2,
     '2026-03-01', '2026-04-15', 120.0, 45.0, 45.0, 'TKT-101', 'e0000000-0000-0000-0000-000000000003', TRUE),

    ('b2000000-0000-0000-0000-000000000002', 'CAD Modeling for Enclosure Thermal Baffle', 'TKT-102', 'b1000000-0000-0000-0000-000000000001',
     'Optimize airflow simulation and aluminum heatsink dissipation in SolidWorks', 'Medium', 2,
     '2026-03-10', '2026-04-20', 80.0, 32.0, 32.0, 'TKT-102', 'e0000000-0000-0000-0000-000000000003', TRUE),

    ('b2000000-0000-0000-0000-000000000003', 'Fail-Safe Circuit Breaker Calibration', 'TKT-103', 'b1000000-0000-0000-0000-000000000002',
     'Safety validation under 480V peak surges in lab testing rig', 'High', 1,
     '2026-03-20', '2026-05-10', 95.0, 0.0, 0.0, 'TKT-103', 'e0000000-0000-0000-0000-000000000003', TRUE)
ON CONFLICT (ticket_id) DO NOTHING;

-- Tasks (Internal Non-Project Activities)
INSERT INTO task_master (task_id, task, department, internal_project, is_active)
VALUES
    ('b3000000-0000-0000-0000-000000000001', 'Engineering Standup & Sprint Planning', 3, TRUE, TRUE),
    ('b3000000-0000-0000-0000-000000000002', 'ISO 9001 Safety & Tooling Inspection', 5, TRUE, TRUE),
    ('b3000000-0000-0000-0000-000000000003', 'Professional Training & Certifications', 3, TRUE, TRUE)
ON CONFLICT (task_id) DO NOTHING;

-- Ticket Assignments
INSERT INTO ticket_assignments (ticket_assignments_id, ticket_id, employee_id, project_id, assigned_by, assigned_date, is_active)
VALUES
    ('a1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', CURRENT_DATE, TRUE),
    ('a1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', CURRENT_DATE, TRUE),
    ('a1000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', CURRENT_DATE, TRUE)
ON CONFLICT DO NOTHING;

-- 13. Timesheet Entries for Current Week & Prior Week
INSERT INTO daily_timesheet_entries (
    employee_id, project_id, client_id, ticket_id, ticket_assign_id, manager_id,
    entry_date, week_start_date, week_end_date, total_hours, billable_hours, non_billable_hours,
    ticket_number, description, status, submitted_at, approved_at, approved_by
)
VALUES
    -- Employee entries (Current week)
    ('e0000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003',
     CURRENT_DATE, DATE_TRUNC('week', CURRENT_DATE)::DATE, (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE,
     480.0, 450.0, 30.0, 'TKT-101', 'Fine-tuned EtherCAT network configuration and validated packet delay', 2, CURRENT_TIMESTAMP, NULL, NULL),

    -- Prior week entries (Approved)
    ('e0000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003',
     CURRENT_DATE - INTERVAL '7 days', (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days')::DATE, (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 day')::DATE,
     480.0, 480.0, 0.0, 'TKT-101', 'Bench testing telemetry sensor communication on lab breadboard', 3,
     CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '5 days', 'e0000000-0000-0000-0000-000000000003');

-- 14. Job Postings for Public Careers & Recruitment ATS
INSERT INTO job_postings (id, title, slug, department_id, location, employment_type, experience_level, description, requirements, responsibilities, salary_range, status, created_by)
VALUES
    ('b4000000-0000-0000-0000-000000000001',
     'Lead Robotics & Automation Engineer', 'lead-robotics-automation-engineer', 3,
     'Chicago, IL (On-site)', 'Full-time', 'Senior',
     'Lead the architectural deployment of industrial robotic cells, automated guided vehicles (AGVs), and Siemens S7-1500 PLC automation lines.',
     '• B.S. in Electrical or Mechatronics Engineering\n• 6+ years in industrial robotics (FANUC, KUKA, ABB)\n• Proficiency in PLC ladder logic, structured text, and safety SIL standards',
     '• Architect PLC and robot safety cells\n• Commission automation on client manufacturing floors\n• Mentor junior control engineers',
     '$125,000 - $155,000 / year', 'Published', 'e0000000-0000-0000-0000-000000000002'),

    ('b4000000-0000-0000-0000-000000000002',
     'Senior CNC Precision Machinist', 'senior-cnc-precision-machinist', 4,
     'Chicago, IL (On-site)', 'Full-time', 'Mid-Level',
     'Program and execute complex aerospace-grade components using 5-axis Mazak and DMG Mori machining centers.',
     '• 5+ years experience with 5-axis CNC setup\n• Mastery of Mastercam / NX CAM\n• Tight tolerance capabilities down to ±0.0002 inches',
     '• Setup and run high-precision aerospace forgings\n• First-article inspection using CMM tools\n• Toolpath and cycle-time optimization',
     '$85,000 - $110,000 / year', 'Published', 'e0000000-0000-0000-0000-000000000002'),

    ('b4000000-0000-0000-0000-000000000003',
     'Quality Assurance Metrology Specialist', 'qa-metrology-specialist', 5,
     'Chicago, IL (Hybrid)', 'Full-time', 'Mid-Level',
     'Lead quality inspections, coordinate ISO 9001 audits, and oversee coordinate measuring machines (CMM) and laser scanning.',
     '• 4+ years in aerospace or medical device QA\n• Hands-on proficiency with Zeiss Calypso or PC-DMIS\n• Six Sigma Green/Black Belt preferred',
     '• Formulate inspection test plans\n• Calibrate laser trackers and optical gauges\n• Manage non-conformance reports (NCRs)',
     '$80,000 - $105,000 / year', 'Published', 'e0000000-0000-0000-0000-000000000002')
ON CONFLICT (slug) DO NOTHING;

-- 15. Sample Candidate Applications (ATS)
INSERT INTO job_applications (job_id, candidate_name, email, phone, stage, hr_notes, rating)
VALUES
    ('b4000000-0000-0000-0000-000000000001', 'Arjun Malhotra', 'arjun.m@example.com', '+1-312-555-0144', 'Interview',
     'Strong robotics portfolio with automotive tier-1 experience. Scheduled for technical panel interview.', 4),
    ('b4000000-0000-0000-0000-000000000001', 'Claire Dubois', 'claire.dubois@example.com', '+1-312-555-0199', 'Offer',
     'Candidate accepted offer letter. Ready for 1-click HR onboarding.', 5),
    ('b4000000-0000-0000-0000-000000000002', 'Marcus Vance', 'marcus.v@example.com', '+1-847-555-0122', 'Screening',
     'Resume reviewed. Excellent Mastercam experience; waiting on references.', 4);

-- 16. Travel Requests & Expense Claims
INSERT INTO travel_requests (employee_id, destination, purpose, departure_date, return_date, estimated_budget, status, manager_comments, approved_by, approved_at)
VALUES
    ('e0000000-0000-0000-0000-000000000004', 'Seattle, WA (Boeing Everett Facility)',
     'On-site sensor array installation and telemetry calibration for wind tunnel test',
     CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '18 days', 1850.00, 'Approved',
     'Travel approved. Charge expenses against PRJ-BOE-01.', 'e0000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP);

INSERT INTO expense_claims (employee_id, project_id, category, expense_date, amount, currency, description, status, reimbursement_status, approved_by, approved_at)
VALUES
    ('e0000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'Equipment',
     CURRENT_DATE - INTERVAL '3 days', 420.50, 'USD',
     'Shielded CAT6A industrial cables and high-precision Fluke multimeter test leads',
     'Approved', 'Processing', 'e0000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- 17. Notifications
INSERT INTO notifications (recipient_id, title, message, type, link, is_read)
VALUES
    ('e0000000-0000-0000-0000-000000000004', 'Timesheet Approved', 'Your timesheet for last week has been approved by Rajesh Patel.', 'SUCCESS', '/app/timesheets', FALSE),
    ('e0000000-0000-0000-0000-000000000003', 'Pending Timesheet Submission', 'Amit Deshmukh submitted timesheet for review (40.0 hours).', 'APPROVAL', '/app/approvals', FALSE),
    ('e0000000-0000-0000-0000-000000000002', 'Candidate Stage Updated', 'Claire Dubois was moved to Offer stage for Lead Robotics Engineer.', 'INFO', '/app/recruitment', FALSE);

-- 18. Audit Logs
INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, changes)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Vikram Shende', 'SYSTEM_INITIALIZATION', 'ORGANIZATION', 'a0000000-0000-0000-0000-000000000001', '{"status": "Initialized Shende Industries Enterprise Portal V1"}'::jsonb),
    ('e0000000-0000-0000-0000-000000000003', 'Rajesh Patel', 'TIMESHEET_APPROVE', 'DAILY_TIMESHEET_ENTRIES', 'TKT-101', '{"action": "Approved 8.0 hours for Amit Deshmukh"}'::jsonb);
