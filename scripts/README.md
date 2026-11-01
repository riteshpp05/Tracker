# Operational DevOps & Utility Scripts

This directory contains standalone operational scripts for seeding, backfilling readiness, and provisioning user credentials.

---

## Script Inventory

| Script | Purpose | Execution |
| :--- | :--- | :--- |
| `backfill-payroll-readiness.js` | Backfills active salary structure assignments and bank details for employees to satisfy payroll calculation readiness guards. | `node scripts/backfill-payroll-readiness.js` |
| `init-cloud-db.js` | Connects to remote PostgreSQL instance (e.g. Supabase, Railway, Neon) and runs schema migrations. | `node scripts/init-cloud-db.js` |
| `seed-location-policies.js` | Provisions default multi-branch facility policies (Branch Alpha, Branch Beta, Branch Gamma) with statutory percentages. | `node scripts/seed-location-policies.js` |
| `update-passwords.js` | Re-hashes default demo credentials with bcrypt salt rounds for secure authentication. | `node scripts/update-passwords.js` |
