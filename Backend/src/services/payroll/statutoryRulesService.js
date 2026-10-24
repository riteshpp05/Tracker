// Backend/src/services/payroll/statutoryRulesService.js
import pool from "../../config/database.js";

/**
 * Indian Statutory Rules Service
 * Handles deterministic computation for:
 * - Employees' Provident Fund (EPF/EPS/EDLI)
 * - Employees' State Insurance Corporation (ESIC)
 * - Professional Tax (Maharashtra & Slabs)
 * - Income Tax TDS (Section 192 under New Tax Regime)
 */
class StatutoryRulesService {
  /**
   * Fetch active statutory config by code from database
   */
  async getConfig(statutoryCode) {
    try {
      const res = await pool.query(
        `SELECT config_version, rules_json, effective_from 
         FROM payroll_statutory_configs 
         WHERE statutory_code = $1 AND is_active = TRUE 
         ORDER BY effective_from DESC LIMIT 1`,
        [statutoryCode]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      console.warn(`Could not load DB config for ${statutoryCode}:`, err.message);
    }
    return null;
  }

  /**
   * EPF Calculation — Configurable PF Wage Ceiling
   *
   * pfCeilingMode options:
   *   '15000'  — Legacy statutory ceiling (₹15,000). Employee PF capped at ₹1,800/mo.
   *   '25000'  — Enhanced ceiling (₹25,000). Employee PF capped at ₹3,000/mo.
   *   'ACTUAL' — Full basic wage used; no ceiling applied (voluntarily opted higher PF).
   *
   * Employer contribution split:
   *   - EPS  : 8.33%, always capped at ₹15,000 wage (EPS statutory max unchanged)
   *   - EPF  : remainder of employer 12% after EPS
   *   - EDLI : 0.50% on EPS wage
   *   - Admin: 0.50% on PF wage
   */
  calculateEPF(basicPay, pfCeilingMode = '15000') {
    const basic = Math.max(0, Number(basicPay) || 0);

    // Determine PF wage based on ceiling mode
    let wageCeiling;
    if (pfCeilingMode === true || pfCeilingMode === 'ACTUAL' || pfCeilingMode === 'FULL') {
      wageCeiling = basic; // no ceiling
    } else if (pfCeilingMode === '25000' || pfCeilingMode === 25000) {
      wageCeiling = 25000;
    } else {
      wageCeiling = 15000; // default legacy
    }

    const pfWage = Math.min(basic, wageCeiling);

    // Employee Share: 12% of PF wage
    const employeePF = Math.round(pfWage * 0.12);

    // Employer Share: 12% Total (8.33% EPS + 3.67% EPF)
    // EPS wage is ALWAYS capped at ₹15,000 per EPFO statute (EPS-95 unchanged)
    const epsWage = Math.min(basic, 15000);
    const employerEPS = Math.round(epsWage * 0.0833);
    const employerEPF = Math.round(pfWage * 0.12) - employerEPS;
    const employerEDLI = Math.round(epsWage * 0.005);
    const employerAdmin = Math.round(pfWage * 0.005);

    const totalEmployerPF = employerEPS + Math.max(0, employerEPF) + employerEDLI + employerAdmin;

    return {
      pfWage,
      wageCeiling,
      pfCeilingMode,
      employeePF,
      employerEPS,
      employerEPF: Math.max(0, employerEPF),
      employerEDLI,
      employerAdmin,
      totalEmployerPF,
      isCapped: pfCeilingMode !== 'ACTUAL' && basic > wageCeiling,
    };
  }

  /**
   * ESIC Calculation
   * Applicable if Gross monthly wage <= ₹21,000.
   * Employee contribution: 0.75% of Gross.
   * Employer contribution: 3.25% of Gross.
   */
  calculateESIC(grossPay) {
    const gross = Math.max(0, Number(grossPay) || 0);
    const threshold = 21000;

    if (gross > threshold) {
      return {
        eligible: false,
        gross,
        threshold,
        employeeESIC: 0,
        employerESIC: 0,
        totalESIC: 0,
      };
    }

    const employeeESIC = Math.ceil(gross * 0.0075);
    const employerESIC = Math.round(gross * 0.0325);

    return {
      eligible: true,
      gross,
      threshold,
      employeeESIC,
      employerESIC,
      totalESIC: employeeESIC + employerESIC,
    };
  }

  /**
   * Maharashtra Professional Tax (PT)
   * Slabs:
   * - Gross <= ₹7,500: ₹0
   * - Gross ₹7,501 to ₹10,000: ₹175
   * - Gross > ₹10,000: ₹200 (except February: ₹300)
   * - Female exemption: Gross <= ₹25,000 is ₹0
   */
  calculateProfessionalTax(grossPay, gender = "Male", month = 1) {
    const gross = Math.max(0, Number(grossPay) || 0);
    const isFemale = String(gender).toLowerCase().startsWith("f");

    if (isFemale && gross <= 25000) {
      return { ptAmount: 0, slab: "Female Exemption (<= ₹25,000)" };
    }

    if (gross <= 7500) {
      return { ptAmount: 0, slab: "Nil (<= ₹7,500)" };
    }

    if (gross <= 10000) {
      return { ptAmount: 175, slab: "₹7,501 - ₹10,000" };
    }

    // February surcharge to round up annual ₹2,500
    const ptAmount = Number(month) === 2 ? 300 : 200;
    return {
      ptAmount,
      slab: Number(month) === 2 ? "> ₹10,000 (Feb ₹300)" : "> ₹10,000 (Standard ₹200)",
    };
  }

  /**
   * Income Tax Withholding (TDS under Section 192)
   * Default: New Tax Regime (Section 115BAC)
   * Standard Deduction: ₹75,000
   * Slabs:
   * - Up to ₹3,00,000: Nil
   * - ₹3,00,001 - ₹7,00,000: 5%
   * - ₹7,00,001 - ₹10,00,000: 10%
   * - ₹10,00,001 - ₹12,00,000: 15%
   * - ₹12,00,001 - ₹15,00,000: 20%
   * - Above ₹15,00,000: 30%
   * Rebate 87A: If taxable income <= ₹7,00,000, tax liability is 0.
   * Health & Education Cess: 4% of tax.
   */
  calculateTDS(annualEstimatedIncome, regime = "New") {
    const grossAnnual = Math.max(0, Number(annualEstimatedIncome) || 0);
    const standardDeduction = 75000;
    const taxableIncome = Math.max(0, grossAnnual - standardDeduction);

    if (taxableIncome <= 700000) {
      return {
        grossAnnual,
        taxableIncome,
        annualTax: 0,
        monthlyTDS: 0,
        cess: 0,
        rebate87A: taxableIncome > 300000,
        regime,
      };
    }

    let tax = 0;

    // Slabs
    if (taxableIncome > 1500000) {
      tax += (taxableIncome - 1500000) * 0.30;
      tax += (1500000 - 1200000) * 0.20; // 60,000
      tax += (1200000 - 1000000) * 0.15; // 30,000
      tax += (1000000 - 700000) * 0.10;  // 30,000
      tax += (700000 - 300000) * 0.05;   // 20,000
    } else if (taxableIncome > 1200000) {
      tax += (taxableIncome - 1200000) * 0.20;
      tax += (1200000 - 1000000) * 0.15;
      tax += (1000000 - 700000) * 0.10;
      tax += (700000 - 300000) * 0.05;
    } else if (taxableIncome > 1000000) {
      tax += (taxableIncome - 1000000) * 0.15;
      tax += (1000000 - 700000) * 0.10;
      tax += (700000 - 300000) * 0.05;
    } else if (taxableIncome > 700000) {
      tax += (taxableIncome - 700000) * 0.10;
      tax += (700000 - 300000) * 0.05;
    }

    const cess = Math.round(tax * 0.04);
    const totalAnnualTax = Math.round(tax + cess);
    const monthlyTDS = Math.round(totalAnnualTax / 12);

    return {
      grossAnnual,
      taxableIncome,
      baseTax: Math.round(tax),
      cess,
      annualTax: totalAnnualTax,
      monthlyTDS,
      rebate87A: false,
      regime,
    };
  }
}

export default new StatutoryRulesService();
