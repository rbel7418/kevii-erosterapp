/**
 * HEALTHCARE-GRADE CALCULATIONS
 * All calculations here are versioned, tested, and audited
 * DO NOT modify without proper testing and approval
 */

// Version tracking
export const CALCULATION_VERSION = "1.0.0";

/**
 * Safe Staffing Calculation
 * Version: 1.0.0
 * Approved by: [Clinical Manager Name]
 * Last validated: [Date]
 * 
 * Formula: effective_staff >= (patients / ratio)
 * Where: effective_staff = RNs + (HCAs * hca_credit) + outreach_contribution
 */
export function calculateSafeStaffing({ 
  rnCount, 
  hcaCount, 
  patients, 
  ratio = 4, 
  hcaCredit = 0.5,
  outreachRN = 0,
  outreachHCA = 0,
  ecuPatientsZero = false
}) {
  // Input validation
  if (typeof rnCount !== "number" || rnCount < 0) throw new Error("Invalid RN count");
  if (typeof hcaCount !== "number" || hcaCount < 0) throw new Error("Invalid HCA count");
  if (typeof patients !== "number" || patients < 0) throw new Error("Invalid patient count");
  if (typeof ratio !== "number" || ratio <= 0) throw new Error("Invalid ratio");
  if (typeof hcaCredit !== "number" || hcaCredit < 0 || hcaCredit > 1) throw new Error("Invalid HCA credit");
  
  // Outreach staff only count if ECU has zero patients
  const outreachContribution = ecuPatientsZero 
    ? (outreachRN + outreachHCA * hcaCredit)
    : 0;
  
  const effectiveStaff = rnCount + (hcaCount * hcaCredit) + outreachContribution;
  const requiredStaff = patients / ratio;
  const isSafe = effectiveStaff >= requiredStaff;
  
  return {
    isSafe,
    effectiveStaff: Math.round(effectiveStaff * 10) / 10, // 1 decimal place
    requiredStaff: Math.ceil(requiredStaff),
    shortfall: isSafe ? 0 : Math.ceil(requiredStaff - effectiveStaff),
    calculation_version: CALCULATION_VERSION
  };
}

/**
 * Census End of Day Calculation
 * Version: 1.0.0
 * 
 * Formula: census_eod = active_inpatients + new_inpatients_today - inpatients_discharged_today
 * 
 * IMPORTANT: 
 * - new_inpatients_today: inpatients ADMITTED today
 * - inpatients_discharged_today: inpatients admitted BEFORE today who are discharged today
 * - Day cases are NOT included in census (they arrive and leave same day)
 */
export function calculateCensusEndOfDay({
  activeInpatientsStartOfDay,
  newInpatientsAdmittedToday,
  inpatientsDischargedToday // MUST be patients admitted BEFORE today
}) {
  // Input validation
  if (typeof activeInpatientsStartOfDay !== "number" || activeInpatientsStartOfDay < 0) {
    throw new Error("Invalid active inpatients count");
  }
  if (typeof newInpatientsAdmittedToday !== "number" || newInpatientsAdmittedToday < 0) {
    throw new Error("Invalid new inpatients count");
  }
  if (typeof inpatientsDischargedToday !== "number" || inpatientsDischargedToday < 0) {
    throw new Error("Invalid discharged inpatients count");
  }
  
  const census = activeInpatientsStartOfDay + newInpatientsAdmittedToday - inpatientsDischargedToday;
  
  if (census < 0) {
    console.warn("Census calculation resulted in negative value - data integrity issue detected");
  }
  
  return {
    census: Math.max(0, census), // Never negative
    breakdown: {
      startOfDay: activeInpatientsStartOfDay,
      admitted: newInpatientsAdmittedToday,
      discharged: inpatientsDischargedToday
    },
    calculation_version: CALCULATION_VERSION
  };
}

/**
 * Test cases for safe staffing calculation
 * These MUST pass before any deployment
 */
export const SAFE_STAFFING_TEST_CASES = [
  {
    name: "Basic safe scenario",
    input: { rnCount: 4, hcaCount: 2, patients: 16, ratio: 4, hcaCredit: 0.5 },
    expected: { isSafe: true, effectiveStaff: 5, requiredStaff: 4 }
  },
  {
    name: "Basic unsafe scenario",
    input: { rnCount: 2, hcaCount: 1, patients: 16, ratio: 4, hcaCredit: 0.5 },
    expected: { isSafe: false, effectiveStaff: 2.5, requiredStaff: 4, shortfall: 2 }
  },
  {
    name: "With outreach (ECU zero patients)",
    input: { rnCount: 3, hcaCount: 1, patients: 16, ratio: 4, hcaCredit: 0.5, outreachRN: 1, outreachHCA: 0, ecuPatientsZero: true },
    expected: { isSafe: true, effectiveStaff: 4.5, requiredStaff: 4 }
  },
  {
    name: "With outreach (ECU has patients - should not count)",
    input: { rnCount: 3, hcaCount: 1, patients: 16, ratio: 4, hcaCredit: 0.5, outreachRN: 1, outreachHCA: 0, ecuPatientsZero: false },
    expected: { isSafe: false, effectiveStaff: 3.5, requiredStaff: 4, shortfall: 1 }
  }
];

/**
 * Test cases for census calculation
 */
export const CENSUS_TEST_CASES = [
  {
    name: "7 inpatients admitted today, none discharged",
    input: { activeInpatientsStartOfDay: 10, newInpatientsAdmittedToday: 7, inpatientsDischargedToday: 0 },
    expected: { census: 17 }
  },
  {
    name: "5 discharged (from previous days), 3 new admissions",
    input: { activeInpatientsStartOfDay: 10, newInpatientsAdmittedToday: 3, inpatientsDischargedToday: 5 },
    expected: { census: 8 }
  },
  {
    name: "Zero patients at start, 2 admitted",
    input: { activeInpatientsStartOfDay: 0, newInpatientsAdmittedToday: 2, inpatientsDischargedToday: 0 },
    expected: { census: 2 }
  }
];

/**
 * Run all test cases - call this before deployment
 */
export function runAllTests() {
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  // Test safe staffing
  for (const test of SAFE_STAFFING_TEST_CASES) {
    try {
      const result = calculateSafeStaffing(test.input);
      const pass = result.isSafe === test.expected.isSafe && 
                   result.effectiveStaff === test.expected.effectiveStaff &&
                   result.requiredStaff === test.expected.requiredStaff;
      if (pass) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push({
          test: test.name,
          expected: test.expected,
          got: result
        });
      }
    } catch (e) {
      results.failed++;
      results.errors.push({
        test: test.name,
        error: e.message
      });
    }
  }
  
  // Test census
  for (const test of CENSUS_TEST_CASES) {
    try {
      const result = calculateCensusEndOfDay(test.input);
      const pass = result.census === test.expected.census;
      if (pass) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push({
          test: test.name,
          expected: test.expected,
          got: result
        });
      }
    } catch (e) {
      results.failed++;
      results.errors.push({
        test: test.name,
        error: e.message
      });
    }
  }
  
  return results;
}