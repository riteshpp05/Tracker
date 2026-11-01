# Database Schemas & Migrations Architecture

This directory contains the production PostgreSQL 16 database architecture for the **Shende Industries Enterprise Portal (PatilOne / TimeTrakPro v3.0)**.

---

## 1. Chronological Migration Architecture

The database follows a deterministic sequential migration model (`01` through `09`):

```
database/
├── 01-shende-core-schema.sql             # Unified core relational schema (RBAC users, clients, projects, tickets, timesheets, leaves, expenses, travel)
├── 02-seed-data.sql                      # Base seed dataset with bcrypt-hashed credentials & sample project/ticket records
├── 03-payroll-schema.sql                 # Statutory payroll engine: payroll_runs, run_items, salary_structures, employee_statutory_profiles
├── 04-cloudstine-enterprise-features.sql # Enterprise features: biometric attendance master, branch holiday calendars, company notices, policy docs
├── 05-system-settings.sql                # Dynamic system configuration key-value store with audit trails
├── 06-payroll-audit-hardening.sql        # Point-in-time immutable JSON snapshot columns (policy_snapshot_json, statutory_breakdown_json)
├── 07-location-policy-schema.sql         # Multi-branch dynamic location policies, custom state PT slab overrides, and version history logs
├── 08-v3-production-schema.sql           # Production indexes, foreign key cascading constraints, and performance tuning
├── 09-recruitment-careers-lifecycle.sql  # Public careers ATS: recruitment_jobs, job_applications, tracking codes, and 1-click onboarding handoff
├── README.md                             # Architecture and execution documentation (this file)
└── legacy/                               # Archived historical prototype patches (for audit record)
```

---

## 2. Execution Order & Reproduction

### Automated Docker Compose Initialization
All `.sql` scripts in this folder are mounted to `/docker-entrypoint-initdb.d/` and run sequentially by PostgreSQL on container initialization:
```powershell
docker compose up -d db
```

### Manual Sequential Execution (psql)
To initialize or restore the database from scratch:
```powershell
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/01-shende-core-schema.sql
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/02-seed-data.sql
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/03-payroll-schema.sql
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/04-cloudstine-enterprise-features.sql
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/05-system-settings.sql
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/06-payroll-audit-hardening.sql
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/07-location-policy-schema.sql
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/08-v3-production-schema.sql
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/09-recruitment-careers-lifecycle.sql
```

---

## 3. Data Integrity & Invariants Enforced in Schema

1. **Foreign Key Integrity:** All operational records reference valid users (`users.id`), salary structures, and location policies.
2. **Point-in-Time Immutability:** When a payroll run is marked `FINALIZED` or `PAID`, changes to location policies or statutory slabs never alter historical records. Snapshots are stored directly in `payroll_run_items.policy_snapshot_json`.
3. **Unique Candidate Tracking Codes:** Candidates applying via public careers are assigned an immutable, indexed tracking code (`APP-YYYY-NNNN`) with a unique database constraint.
