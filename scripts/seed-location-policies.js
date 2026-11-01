import db from "../Backend/src/config/database.js";
import { createPolicy, getPolicyByCode } from "../Backend/src/services/payroll/locationPolicyService.js";

const DEFAULT_POLICIES = [
  {
    name: "Branch Alpha - Manufacturing Facility",
    code: "BRANCH-01",
    description: "Plant manufacturing facility with Mode A (50% Net In-Hand) and fixed DA.",
    state_code: "MH",
    basic_calculation_mode: "PERCENT_OF_NET",
    basic_percent_of_net: 50.00,
    basic_percent_of_ctc: 40.00,
    da_fixed_amount: 3700.00,
    hra_percent_of_basic_da: 5.00,
    washing_allowance: 1000.00,
    education_allowance: 1200.00,
    conveyance_allowance: 1750.00,
    medical_allowance: 1000.00,
    books_periodicals: 1000.00,
    pf_ceiling_mode: "ACTUAL",
    employee_pf_rate: 0.1200,
    employer_pf_rate: 0.1300,
    bonus_rate: 0.0833,
    gratuity_rate: 0.0481,
    default_assessment_year: "AY_2026_27",
    default_tax_regime: "NEW",
    esic_employer_rate: 0.0325,
    esic_employee_rate: 0.0075,
    working_days_mode: "CALENDAR_DAYS",
  },
  {
    name: "Branch Beta - Corporate Tech Hub",
    code: "BRANCH-02",
    description: "Corporate headquarters with Mode B (40% Annual CTC) and statutory PF ceiling.",
    state_code: "MH",
    basic_calculation_mode: "PERCENT_OF_CTC",
    basic_percent_of_net: 50.00,
    basic_percent_of_ctc: 40.00,
    da_fixed_amount: 0.00,
    hra_percent_of_basic_da: 10.00,
    washing_allowance: 0.00,
    education_allowance: 1000.00,
    conveyance_allowance: 1600.00,
    medical_allowance: 1250.00,
    books_periodicals: 1000.00,
    pf_ceiling_mode: "15000",
    employee_pf_rate: 0.1200,
    employer_pf_rate: 0.1300,
    bonus_rate: 0.0833,
    gratuity_rate: 0.0481,
    default_assessment_year: "AY_2026_27",
    default_tax_regime: "NEW",
    esic_employer_rate: 0.0325,
    esic_employee_rate: 0.0075,
    working_days_mode: "CALENDAR_DAYS",
  },
  {
    name: "Branch Gamma - Distribution Center",
    code: "BRANCH-03",
    description: "Regional logistics and distribution center operating under Gujarat state PT.",
    state_code: "GJ",
    basic_calculation_mode: "PERCENT_OF_NET",
    basic_percent_of_net: 50.00,
    basic_percent_of_ctc: 40.00,
    da_fixed_amount: 0.00,
    hra_percent_of_basic_da: 5.00,
    washing_allowance: 1000.00,
    education_allowance: 1200.00,
    conveyance_allowance: 1750.00,
    medical_allowance: 1000.00,
    books_periodicals: 1000.00,
    pf_ceiling_mode: "ACTUAL",
    employee_pf_rate: 0.1200,
    employer_pf_rate: 0.1300,
    bonus_rate: 0.0833,
    gratuity_rate: 0.0481,
    default_assessment_year: "AY_2026_27",
    default_tax_regime: "NEW",
    esic_employer_rate: 0.0325,
    esic_employee_rate: 0.0075,
    working_days_mode: "CALENDAR_DAYS",
  },
];

async function seed() {
  console.log("🌱 Seeding Location Policies...");
  for (const pol of DEFAULT_POLICIES) {
    const existing = await getPolicyByCode(pol.code);
    if (!existing) {
      const created = await createPolicy(pol);
      console.log(`✅ Created Policy: ${created.name} (${created.code}) [${created.id}]`);
    } else {
      console.log(`ℹ️ Policy ${pol.code} already exists [${existing.id}]`);
    }
  }

  // Link any unassigned employees to BRANCH-01
  const defaultPolicy = await getPolicyByCode("BRANCH-01");
  if (defaultPolicy) {
    const updateRes = await db.query(
      "UPDATE employees SET location_policy_id = $1 WHERE location_policy_id IS NULL RETURNING employee_id",
      [defaultPolicy.id]
    );
    console.log(`🔗 Linked ${updateRes.rowCount} employees to default policy ${defaultPolicy.code}`);
  }

  console.log("✨ Location Policies seeded successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
