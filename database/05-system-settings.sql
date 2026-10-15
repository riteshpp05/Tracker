-- =====================================================================
-- PATILONE ENTERPRISE PORTAL — SYSTEM SETTINGS SCHEMA V1
-- =====================================================================

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('max_hours_per_day', '8', 'Maximum standard work hours allowed per day'),
    ('max_hours_per_week', '40', 'Standard work hours allowed per week'),
    ('working_days_per_week', '5', 'Standard working days per week'),
    ('allow_overtime', 'false', 'Enable overtime logging beyond 8 hours'),
    ('timesheet_submission_reminder', 'true', 'Send automated Friday reminder to submit weekly timesheets'),
    ('email_notifications_enabled', 'true', 'Send email notifications for approvals and status updates'),
    ('approval_required', 'true', 'Require manager and admin approval for submitted timesheets'),
    ('auto_approve_within_hours', '24', 'Auto-escalate or highlight unapproved entries after N hours'),
    ('geofence_enforcement', 'true', 'Enforce geofence boundary checks on attendance punches'),
    ('late_grace_period_mins', '15', 'Grace minutes after 09:30 AM before marking Late')
ON CONFLICT (setting_key) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP;
