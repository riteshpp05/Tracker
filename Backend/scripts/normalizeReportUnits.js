import fs from "fs";

const filePath = "Backend/src/controllers/timesheetReportController.js";
let code = fs.readFileSync(filePath, "utf8");

// 1. Data query (lines ~689)
code = code.replace(
  "dte.total_hours,\r\n        dte.billable_hours,\r\n        dte.non_billable_hours,",
  "CASE WHEN dte.total_hours > 24 THEN ROUND(dte.total_hours / 60.0, 2) ELSE ROUND(dte.total_hours, 2) END AS total_hours,\r\n        CASE WHEN dte.billable_hours > 24 THEN ROUND(dte.billable_hours / 60.0, 2) ELSE ROUND(dte.billable_hours, 2) END AS billable_hours,\r\n        CASE WHEN dte.non_billable_hours > 24 THEN ROUND(dte.non_billable_hours / 60.0, 2) ELSE ROUND(dte.non_billable_hours, 2) END AS non_billable_hours,"
);

// 2. Summary query (lines ~763)
code = code.replace(
  "COALESCE(SUM(dte.total_hours),        0)                        AS total_hours,\r\n        COALESCE(SUM(dte.billable_hours),     0)                        AS billable_hours,\r\n        COALESCE(SUM(dte.non_billable_hours), 0)                        AS non_billable_hours,",
  "ROUND(COALESCE(SUM(CASE WHEN dte.total_hours > 24 THEN dte.total_hours / 60.0 ELSE dte.total_hours END), 0), 2) AS total_hours,\r\n        ROUND(COALESCE(SUM(CASE WHEN dte.billable_hours > 24 THEN dte.billable_hours / 60.0 ELSE dte.billable_hours END), 0), 2) AS billable_hours,\r\n        ROUND(COALESCE(SUM(CASE WHEN dte.non_billable_hours > 24 THEN dte.non_billable_hours / 60.0 ELSE dte.non_billable_hours END), 0), 2) AS non_billable_hours,"
);

// 3. Daily activity aggregates (lines ~964)
code = code.replace(
  "SUM(dte.total_hours)                AS day_total_hours,\r\n        SUM(dte.billable_hours)             AS day_billable_hours,\r\n        SUM(dte.non_billable_hours)         AS day_non_billable_hours,",
  "ROUND(SUM(CASE WHEN dte.total_hours > 24 THEN dte.total_hours / 60.0 ELSE dte.total_hours END), 2) AS day_total_hours,\r\n        ROUND(SUM(CASE WHEN dte.billable_hours > 24 THEN dte.billable_hours / 60.0 ELSE dte.billable_hours END), 2) AS day_billable_hours,\r\n        ROUND(SUM(CASE WHEN dte.non_billable_hours > 24 THEN dte.non_billable_hours / 60.0 ELSE dte.non_billable_hours END), 2) AS day_non_billable_hours,"
);

// 4. Daily activity json_build_object (lines ~973)
code = code.replace(
  "'total_hours',        dte.total_hours,\r\n            'billable_hours',     dte.billable_hours,\r\n            'non_billable_hours', dte.non_billable_hours,",
  "'total_hours',        CASE WHEN dte.total_hours > 24 THEN ROUND(dte.total_hours / 60.0, 2) ELSE ROUND(dte.total_hours, 2) END,\r\n            'billable_hours',     CASE WHEN dte.billable_hours > 24 THEN ROUND(dte.billable_hours / 60.0, 2) ELSE ROUND(dte.billable_hours, 2) END,\r\n            'non_billable_hours', CASE WHEN dte.non_billable_hours > 24 THEN ROUND(dte.non_billable_hours / 60.0, 2) ELSE ROUND(dte.non_billable_hours, 2) END,"
);

// 5. Employee summary query (lines ~1156)
code = code.replace(
  "COALESCE(SUM(dte.total_hours),        0)     AS total_hours,\r\n        COALESCE(SUM(dte.billable_hours),     0)     AS billable_hours,\r\n        COALESCE(SUM(dte.non_billable_hours), 0)     AS non_billable_hours,",
  "ROUND(COALESCE(SUM(CASE WHEN dte.total_hours > 24 THEN dte.total_hours / 60.0 ELSE dte.total_hours END), 0), 2) AS total_hours,\r\n        ROUND(COALESCE(SUM(CASE WHEN dte.billable_hours > 24 THEN dte.billable_hours / 60.0 ELSE dte.billable_hours END), 0), 2) AS billable_hours,\r\n        ROUND(COALESCE(SUM(CASE WHEN dte.non_billable_hours > 24 THEN dte.non_billable_hours / 60.0 ELSE dte.non_billable_hours END), 0), 2) AS non_billable_hours,"
);

code = code.replace(
  "ROUND(\r\n          COALESCE(SUM(dte.total_hours), 0) /\r\n          NULLIF(COUNT(DISTINCT dte.entry_date), 0)\r\n        , 2)                                         AS avg_hours_per_day,",
  "ROUND(\r\n          (COALESCE(SUM(CASE WHEN dte.total_hours > 24 THEN dte.total_hours / 60.0 ELSE dte.total_hours END), 0)) /\r\n          NULLIF(COUNT(DISTINCT dte.entry_date), 0)\r\n        , 2)                                         AS avg_hours_per_day,"
);

// 6. Project summary query (lines ~1479)
code = code.replace(
  "COALESCE(SUM(dte.total_hours),        0)      AS logged_hours,\r\n        COALESCE(SUM(dte.billable_hours),     0)      AS logged_billable_hours,\r\n        COALESCE(SUM(dte.non_billable_hours), 0)      AS logged_non_billable_hours,",
  "ROUND(COALESCE(SUM(CASE WHEN dte.total_hours > 24 THEN dte.total_hours / 60.0 ELSE dte.total_hours END), 0), 2) AS logged_hours,\r\n        ROUND(COALESCE(SUM(CASE WHEN dte.billable_hours > 24 THEN dte.billable_hours / 60.0 ELSE dte.billable_hours END), 0), 2) AS logged_billable_hours,\r\n        ROUND(COALESCE(SUM(CASE WHEN dte.non_billable_hours > 24 THEN dte.non_billable_hours / 60.0 ELSE dte.non_billable_hours END), 0), 2) AS logged_non_billable_hours,"
);

code = code.replace(
  "WHEN tm.estimated_hours > 0 THEN\r\n            ROUND((COALESCE(SUM(dte.total_hours), 0) / tm.estimated_hours) * 100, 1)\r\n          ELSE NULL\r\n        END                                           AS utilisation_pct,",
  "WHEN tm.estimated_hours > 0 THEN\r\n            ROUND((COALESCE(SUM(CASE WHEN dte.total_hours > 24 THEN dte.total_hours / 60.0 ELSE dte.total_hours END), 0) / tm.estimated_hours) * 100, 1)\r\n          ELSE NULL\r\n        END                                           AS utilisation_pct,"
);

// 7. Export query (lines ~2247)
code = code.replace(
  "dte.total_hours,\r\n         dte.billable_hours,\r\n         dte.non_billable_hours,",
  "CASE WHEN dte.total_hours > 24 THEN ROUND(dte.total_hours / 60.0, 2) ELSE ROUND(dte.total_hours, 2) END AS total_hours,\r\n         CASE WHEN dte.billable_hours > 24 THEN ROUND(dte.billable_hours / 60.0, 2) ELSE ROUND(dte.billable_hours, 2) END AS billable_hours,\r\n         CASE WHEN dte.non_billable_hours > 24 THEN ROUND(dte.non_billable_hours / 60.0, 2) ELSE ROUND(dte.non_billable_hours, 2) END AS non_billable_hours,"
);

fs.writeFileSync(filePath, code, "utf8");
console.log("timesheetReportController.js updated successfully!");
