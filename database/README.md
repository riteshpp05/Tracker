# Database Schemas & Migrations

This directory contains the PostgreSQL 16 database architecture for the **Shende Industries Enterprise Portal**.

## Directory Layout

```
database/
├── 01-shende-core-schema.sql   # Primary, unified core schema (all 13 modules)
├── 02-seed-data.sql            # Seed dataset with bcrypt-hashed credentials & sample records
└── legacy/                     # Archived historical patches and initial prototype schema
    ├── schema.sql              # Initial un-migrated schema
    ├── patch.sql               # Incremental patch 1
    ├── patch2.sql              # Incremental patch 2
    ├── patch3.sql              # Incremental patch 3
    ├── patch4.sql              # Incremental patch 4
    ├── patch5.sql              # Incremental patch 5
    └── patch6.sql              # Incremental patch 6
```

## Running Migrations

When using Docker Compose:
```powershell
docker compose up -d db
```
Docker automatically executes all scripts mounted in `/docker-entrypoint-initdb.d/` in numerical order (`01-shende-core-schema.sql` followed by `02-seed-data.sql`).

When restoring manually with `psql`:
```powershell
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/01-shende-core-schema.sql
psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/02-seed-data.sql
```
