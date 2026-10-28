/**
 * Illustrative Annual Tax Calculation as per Saylani HCM Lite Hackathon Specification:
 *
 * Annual Tax Reference = Monthly Gross Salary * 12
 *
 * Annual Gross Slabs:
 * 1. Up to PKR 600,000                         => Tax = 0
 * 2. Above 600,000 up to 1,200,000              => 5% of amount above 600,000
 * 3. Above 1,200,000 up to 2,400,000            => 30,000 + 15% of amount above 1,200,000
 * 4. Above 2,400,000 up to 3,600,000            => 210,000 + 25% of amount above 2,400,000
 * 5. Above 3,600,000                           => 510,000 + 35% of amount above 3,600,000
 *
 * Monthly Tax = Annual Tax / 12
 */

export interface TaxBreakdown {
  annualGross: number;
  annualTax: number;
  monthlyTax: number;
  effectiveTaxRate: number; // percentage (0 - 100)
}

export function calculateAnnualTax(annualGross: number): number {
  if (annualGross <= 0) return 0;
  if (annualGross <= 600_000) return 0;

  if (annualGross <= 1_200_000) {
    const taxable = annualGross - 600_000;
    return Math.round(taxable * 0.05 * 100) / 100;
  }

  if (annualGross <= 2_400_000) {
    const taxable = annualGross - 1_200_000;
    return Math.round((30_000 + taxable * 0.15) * 100) / 100;
  }

  if (annualGross <= 3_600_000) {
    const taxable = annualGross - 2_400_000;
    return Math.round((210_000 + taxable * 0.25) * 100) / 100;
  }

  const taxable = annualGross - 3_600_000;
  return Math.round((510_000 + taxable * 0.35) * 100) / 100;
}

export function calculateTaxBreakdown(monthlyGross: number): TaxBreakdown {
  const annualGross = Math.round(monthlyGross * 12 * 100) / 100;
  const annualTax = calculateAnnualTax(annualGross);
  const monthlyTax = Math.round((annualTax / 12) * 100) / 100;
  const effectiveTaxRate =
    annualGross > 0 ? Math.round((annualTax / annualGross) * 10000) / 100 : 0;

  return {
    annualGross,
    annualTax,
    monthlyTax,
    effectiveTaxRate,
  };
}
