import pool from "../src/config/database.js";

async function seed() {
  try {
    console.log("Seeding flagship project...");

    const prj = await pool.query(`
      INSERT INTO project_master (
        project_id, client_id, project_name, project_code, description,
        start_date, end_date, budget_hours, billable_hours, status,
        manager_id, zoho_crm_code, is_active
      )
      VALUES (
        'b1000000-0000-0000-0000-000000000010',
        'c0000000-0000-0000-0000-000000000001',
        'Time Tracker Plus Payroll System',
        'PRJ-TTR-01',
        'Enterprise Time Tracking and Statutory Payroll Platform for Shende Industries',
        '2026-01-01',
        '2026-12-31',
        2000,
        1500,
        2,
        'e0000000-0000-0000-0000-000000000003',
        'CRM-TTR-01',
        true
      )
      ON CONFLICT (project_id) DO UPDATE SET
        project_name = EXCLUDED.project_name,
        description = EXCLUDED.description,
        is_active = true
      RETURNING project_id, project_name
    `);
    console.log("Project upserted:", prj.rows);

    const t1 = await pool.query(`
      INSERT INTO ticket_master (
        ticket_id, project_id, ticket_number, zoho_crm_code, ticket_name,
        description, status, is_active, start_date, end_date
      )
      VALUES (
        'b2000000-0000-0000-0000-000000000010',
        'b1000000-0000-0000-0000-000000000010',
        'TKT-201',
        'TKT-201',
        'Timesheet Entry & Cross-Role Logging Engine',
        'Daily and weekly work hour tracking, project activities, and automated validation',
        1,
        true,
        '2026-01-01',
        '2026-12-31'
      )
      ON CONFLICT (ticket_id) DO UPDATE SET
        ticket_name = EXCLUDED.ticket_name,
        is_active = true
      RETURNING ticket_id, ticket_name
    `);
    console.log("Ticket 1 upserted:", t1.rows);

    const t2 = await pool.query(`
      INSERT INTO ticket_master (
        ticket_id, project_id, ticket_number, zoho_crm_code, ticket_name,
        description, status, is_active, start_date, end_date
      )
      VALUES (
        'b2000000-0000-0000-0000-000000000011',
        'b1000000-0000-0000-0000-000000000010',
        'TKT-202',
        'TKT-202',
        'Statutory Payroll & Reverse CTC Engine',
        'CFO financial operations, PF ceiling compliance, and payslip generation',
        1,
        true,
        '2026-01-01',
        '2026-12-31'
      )
      ON CONFLICT (ticket_id) DO UPDATE SET
        ticket_name = EXCLUDED.ticket_name,
        is_active = true
      RETURNING ticket_id, ticket_name
    `);
    console.log("Ticket 2 upserted:", t2.rows);

    // Upsert specialized tasks for Time Tracker & Payroll
    await pool.query(`
      INSERT INTO task_master (task_id, task, department, internal_project, is_active)
      VALUES
        ('b3000000-0000-0000-0000-000000000010', 'Time Tracker & Payroll Engine Development', 3, true, true),
        ('b3000000-0000-0000-0000-000000000011', 'Statutory PF & Reverse CTC Calculation', 3, true, true),
        ('b3000000-0000-0000-0000-000000000012', 'End-to-End Verification & QA Testing', 3, true, true)
      ON CONFLICT (task_id) DO NOTHING
    `);
    console.log("Tasks seeded successfully!");

    // Assign to all active employees and managers
    const empRes = await pool.query("SELECT employee_id FROM employees WHERE is_active = true");
    for (const row of empRes.rows) {
      const empId = row.employee_id;
      // Ticket assignments
      await pool.query(`
        INSERT INTO ticket_assignments (ticket_assignments_id, ticket_id, employee_id, project_id, assigned_by, assigned_date, is_active)
        VALUES (gen_random_uuid(), 'b2000000-0000-0000-0000-000000000010', $1, 'b1000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000003', '2026-01-01', true)
        ON CONFLICT DO NOTHING
      `, [empId]);

      await pool.query(`
        INSERT INTO ticket_assignments (ticket_assignments_id, ticket_id, employee_id, project_id, assigned_by, assigned_date, is_active)
        VALUES (gen_random_uuid(), 'b2000000-0000-0000-0000-000000000011', $1, 'b1000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000003', '2026-01-01', true)
        ON CONFLICT DO NOTHING
      `, [empId]);

      // Ticket manager scope
      await pool.query(`
        INSERT INTO ticket_manager_scope (id, ticket_id, manager_id, project_id, assigned_by, assigned_date, is_active)
        VALUES (gen_random_uuid(), 'b2000000-0000-0000-0000-000000000010', $1, 'b1000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000003', '2026-01-01', true)
        ON CONFLICT DO NOTHING
      `, [empId]);
    }

    console.log("Flagship project and assignments seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
