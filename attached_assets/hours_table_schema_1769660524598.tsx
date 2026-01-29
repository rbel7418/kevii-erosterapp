// ═══════════════════════════════════════════════════════════════════════
// HOURS TABLE SCHEMA DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════
// This file documents the complete schema and usage of the Hours Table
// database used throughout the roster application.
// ═══════════════════════════════════════════════════════════════════════

/**
 * HOURS TABLE COMPLETE SCHEMA
 * 
 * The Hours Table is the master reference for all shift definitions.
 * It defines shift codes, their hours, and metadata for financial calculations.
 * 
 * Storage: Supabase Storage bucket 'make-b07c7a84-roster-data/hours_table.json'
 * Format: JSON array of HoursRecord objects
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * FIELD DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface HoursRecord {
  // ─────────────────────────────────────────────────────────────────────
  // REQUIRED FIELDS (used in ALL calculations)
  // ─────────────────────────────────────────────────────────────────────
  
  /**
   * shiftCode: Unique identifier for the shift
   * 
   * Examples: "RMO1", "ED", "N", "LD", "AL", "SICK"
   * Required: YES
   * Used by: All processors, all reports, roster grid
   * 
   * This is the PRIMARY KEY for shift lookups.
   * Must be unique and match shift codes used in the roster.
   */
  shiftCode: string;
  
  /**
   * hours: Number of hours for this shift
   * 
   * Examples: "12.5", "10", "8", "0"
   * Required: YES
   * Used by: All financial calculations, allocation sheets
   * Format: String or number (converted to float)
   * 
   * THIS IS THE SOURCE OF TRUTH FOR ALL HOURS CALCULATIONS.
   * Financial reports, allocation sheets, and billable hours
   * ALL use this field. The "from" and "to" fields are ignored.
   */
  hours: string | number;
  
  // ─────────────────────────────────────────────────────────────────────
  // IMPORTANT METADATA FIELDS (affect financial calculations)
  // ─────────────────────────────────────────────────────────────────────
  
  /**
   * financeTag: Financial classification
   * 
   * Valid values: "BILLABLE", "NON-BILLABLE", "LEAVE"
   * Required: Recommended (defaults to "BILLABLE" if missing)
   * Used by: Financial reports, allocation sheets
   * 
   * Controls whether shift hours count toward billable time:
   * - BILLABLE: Hours count toward department billable hours
   * - NON-BILLABLE: Hours worked but not billable (e.g., training, admin)
   * - LEAVE: Hours are leave/time off (e.g., AL, SICK)
   */
  financeTag?: string;
  
  /**
   * isWorked: Whether this is a working shift
   * 
   * Valid values: "Yes", "No"
   * Required: Optional
   * Used by: Shift categorization, future enhancements
   * 
   * Indicates if the shift is actual work vs leave/time off:
   * - "Yes": Working shift (RMO1, ED, N, LD, etc.)
   * - "No": Leave/off shift (AL, SICK, OFF, etc.)
   */
  isWorked?: string;
  
  /**
   * dayNight: Day or Night shift classification
   * 
   * Valid values: "Day", "Night"
   * Required: Optional
   * Used by: Shift counting, future day/night analytics
   * 
   * Used to categorize and count day vs night shifts.
   * May be used for night shift differentials in future.
   */
  dayNight?: string;
  
  /**
   * category: Shift category classification
   * 
   * Examples: "Ward", "ED", "ICU", "Leave", "Training"
   * Required: Optional
   * Used by: Filtering, categorization, future reporting
   * 
   * Groups shifts into logical categories for filtering
   * and future category-based reporting.
   */
  category?: string;
  
  // ─────────────────────────────────────────────────────────────────────
  // DISPLAY/DOCUMENTATION FIELDS (NOT used in calculations)
  // ─────────────────────────────────────────────────────────────────────
  
  /**
   * descriptor: Human-readable shift description
   * 
   * Examples: "Ward Shift", "Emergency Department", "Night Shift"
   * Required: Optional (but recommended for clarity)
   * Used by: UI display, reports (for readability)
   * 
   * Provides a friendly name for the shift code.
   * Shown in reports and UI but not used in calculations.
   */
  descriptor?: string;
  
  /**
   * from: Shift start time (DISPLAY ONLY - NOT USED IN CALCULATIONS)
   * 
   * Examples: "08:00", "17:00", "20:00"
   * Required: Optional
   * Used by: UI display ONLY
   * Format: HH:MM (24-hour)
   * 
   * ⚠️ IMPORTANT: This field is for DOCUMENTATION/DISPLAY ONLY.
   * It is NOT used in ANY calculations. The "hours" field is
   * the source of truth for shift duration.
   * 
   * This field documents when the shift typically starts.
   * Shown in the Hours Table UI for reference.
   */
  from?: string;
  
  /**
   * to: Shift end time (DISPLAY ONLY - NOT USED IN CALCULATIONS)
   * 
   * Examples: "17:00", "08:00", "08:00+1"
   * Required: Optional
   * Used by: UI display ONLY
   * Format: HH:MM (24-hour, may include +1 for next day)
   * 
   * ⚠️ IMPORTANT: This field is for DOCUMENTATION/DISPLAY ONLY.
   * It is NOT used in ANY calculations. The "hours" field is
   * the source of truth for shift duration.
   * 
   * This field documents when the shift typically ends.
   * Shown in the Hours Table UI for reference.
   */
  to?: string;
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 * USAGE BY COMPONENT
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * ALLOCATION SHEET PROCESSOR:
 * - Uses: shiftCode, hours, descriptor, financeTag
 * - Ignores: from, to, category, isWorked, dayNight
 * - Purpose: Calculate total hours per shift code for allocation
 * 
 * FINANCIAL REPORT PROCESSOR:
 * - Uses: shiftCode, hours, financeTag, descriptor
 * - Uses (optional): dayNight, category, isWorked
 * - Ignores: from, to
 * - Purpose: Calculate billable hours, staff hours, financial totals
 * 
 * ROSTER GRID:
 * - Uses: shiftCode (for matching shifts)
 * - Ignores: All other fields (roster stores its own shift assignments)
 * 
 * SHIFT CODES EDITOR (Settings UI):
 * - Displays: ALL fields (including from/to for user reference)
 * - Allows editing: ALL fields
 * - Purpose: Manage the master shift code definitions
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * VALIDATION RULES
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * 1. shiftCode must be present and non-empty
 * 2. hours must be present and >= 0
 * 3. financeTag should be one of: BILLABLE, NON-BILLABLE, LEAVE
 * 4. isWorked should be one of: Yes, No (if present)
 * 5. dayNight should be one of: Day, Night (if present)
 * 6. from/to should be in HH:MM format (if present)
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════
 */

export const EXAMPLE_RECORDS: HoursRecord[] = [
  {
    // Standard day ward shift
    shiftCode: "RMO1",
    descriptor: "Ward Shift",
    financeTag: "BILLABLE",
    from: "08:00",
    to: "20:00",
    hours: "12.5",
    category: "Ward",
    isWorked: "Yes",
    dayNight: "Day"
  },
  {
    // Night shift
    shiftCode: "N",
    descriptor: "Night Shift",
    financeTag: "BILLABLE",
    from: "20:00",
    to: "08:00+1",
    hours: "12.5",
    category: "Ward",
    isWorked: "Yes",
    dayNight: "Night"
  },
  {
    // ED shift
    shiftCode: "ED",
    descriptor: "Emergency Department",
    financeTag: "BILLABLE",
    from: "08:00",
    to: "18:00",
    hours: "10",
    category: "ED",
    isWorked: "Yes",
    dayNight: "Day"
  },
  {
    // Annual leave
    shiftCode: "AL",
    descriptor: "Annual Leave",
    financeTag: "LEAVE",
    from: "",
    to: "",
    hours: "0",
    category: "Leave",
    isWorked: "No",
    dayNight: ""
  },
  {
    // Sick leave
    shiftCode: "SICK",
    descriptor: "Sick Leave",
    financeTag: "LEAVE",
    from: "",
    to: "",
    hours: "0",
    category: "Leave",
    isWorked: "No",
    dayNight: ""
  }
];

/**
 * ═══════════════════════════════════════════════════════════════════════
 * MIGRATION NOTES
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Version History:
 * 
 * v1.0 - Original schema without from/to fields
 * - Columns: ShiftCode, Descriptor, Finance Tag, Hours, Category, IsWorked, Day/Night
 * 
 * v2.0 - Added from/to fields (current)
 * - Columns: ShiftCode, Descriptor, Finance Tag, From, To, Hours, Category, IsWorked, Day/Night
 * - Backend is backward compatible - from/to are optional display fields
 * - All calculations continue to use "hours" field only
 * 
 * The addition of from/to fields does NOT affect any calculations.
 * They are purely for user reference and documentation.
 */
