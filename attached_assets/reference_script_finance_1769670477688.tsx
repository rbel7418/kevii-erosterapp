  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UNIFIED STAFFING & ALLOCATION MANAGEMENT SYSTEM
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * SETUP (ONE TIME ONLY):
   * 1. Create a blank Google Sheet called "Staffing Management Runner" (or any name)
   * 2. Go to Extensions > Apps Script
   * 3. Paste this entire script
   * 4. Save
   * 5. Refresh the sheet - you'll see a "Staffing Management" menu
   * 
   * ═══════════════════════════════════════════════════════════════════════
   * FEATURES:
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * 📊 FINANCIAL REPORTS:
   * - Generate comprehensive staffing financial summaries
   * - Calculate TOIL, PB, redeployments, sick time, ward balances
   * - Track rostered vs actual hours across all wards
   * - Generate ward-level daily summaries
   * - SEPARATE tracking for SICK (hours lost) vs UNPAID (deductions)
   * 
   * 📋 ALLOCATION SHEETS:
   * - Build visual day/night allocation sheets
   * - Side-by-side ward comparisons (Ward 2, Ward 3, ECU)
   * - RGN/HCA staffing counts
   * - Color-coded headers (yellow ward headers, green DAY, dark NIGHT)
   * 
   * ═══════════════════════════════════════════════════════════════════════
   * 🔍 ROBUST SHIFT CODE DETECTION (NEW):
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * MULTI-TIER FALLBACK SYSTEM:
   * ├─ Tier 1: Local "Hours" sheet in rota file
   * ├─ Tier 2: Comprehensive Hours Lookup Table (1XhqeN4Skg1oj5fu9TlzhbZmbu6k1AAlHXmM5qsKgL8U)
   * ├─ Tier 3: Time range parsing (e.g., "9-13", "14-20", "08:00-14:00")
   * └─ Tier 4: Hardcoded defaults (LD, LN, E, L, N, D)
   * 
   * TIME RANGE PARSING:
   * - Cells with "9-13" → Calculates 4 hours (13:00 - 09:00)
   * - Cells with "14-20" → Calculates 6 hours (20:00 - 14:00)
   * - Cells with "08:00-14:00" → Calculates 6 hours
   * - Handles overnight shifts (e.g., "20-8" = 12 hours)
   * - Automatically treated as BILLABLE hours
   * 
   * ═══════════════════════════════════════════════════════════════════════
   * 🏥 SICK vs UNPAID LEAVE - CRITICAL DIFFERENCE:
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * SICK LEAVE:
   * ├─ Staff Status:   PAID (NHS sick pay)
   * ├─ Financial:      NO payroll deduction needed
   * ├─ Ward Impact:    LOST hours (need agency cover)
   * ├─ Display:        +12.5 hours (POSITIVE, orange 🟠)
   * └─ Purpose:        Track staffing gaps & agency budget
   * 
   * UNPAID LEAVE:
   * ├─ Staff Status:   PAID in advance (monthly salary)
   * ├─ Financial:      DEDUCT from paycheck (staff owes money back)
   * ├─ Ward Impact:    LOST hours (need agency cover)
   * ├─ Display:        -12.5 hours (NEGATIVE, red 🔴)
   * └─ Purpose:        Track payroll deductions required
   * 
   * WHY THIS MATTERS:
   * - Mixing these up = incorrect payroll = audit failures = legal issues!
   * - SICK = Orange = "Hours we lost" (no money deduction)
   * - UNPAID = Red = "Money staff owes us" (deduct from pay)
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */

  // ═══════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════

  // Source file ID - the rota file (e.g., "1 - 28 DECEMBER 2025")
  var FINANCIALS_SOURCE_FILE_ID = '1amuUgKknpoEFVo7osxrGuwVs4S08rik8uRTbzmHTm-8';

  // COMPREHENSIVE HOURS LOOKUP TABLE (Fallback/Complete Database)
  var HOURS_LOOKUP_TABLE_FILE_ID = '1XhqeN4Skg1oj5fu9TlzhbZmbu6k1AAlHXmM5qsKgL8U';

  // Default contracted hours
  var DEFAULT_CONTRACTED_HOURS = 150;

  // Default hours for SICK days when shift type is unknown
  var SICK_DEFAULT_HOURS = 12.5;

  // ══════════════════════════════════════════════════════════════════════
  // GLOBAL LEDGERS
  // ═══════════════════════════════════════════════════════════════════════
  var GLOBAL_REDEPLOYMENT_LEDGER = [];
  var GLOBAL_TOIL_LEDGER = [];
  var GLOBAL_PB_LEDGER = [];

  // Report context (populated at runtime)
  var REPORT_CONTEXT = {
    sourceFileName: '',
    generatedAt: ''
  };


  // ═══════════════════════════════════════════════════════════════════════════════
  // MENU
  // ═══════════════════════════════════════════════════════════════════════════════

  function onOpen() {
    const ui = SpreadsheetApp.getUi();

    // Main menu
    const mainMenu = ui.createMenu('Staffing Management');

    // Submenu: Financial Reports
    mainMenu.addSubMenu(
      ui.createMenu('📊 Financial Reports')
        .addItem('Generate Financial Summary', 'generateFinancialSummary')
        .addItem('⚖️ Staff Absence & TOIL Transparency', 'generateStaffAbsenceTransparencyReport')
    );

    mainMenu.addSeparator();

    // Submenu: Allocation Sheets
    mainMenu.addSubMenu(
      ui.createMenu('📋 Allocation Sheets')
        .addItem('Build Allocation Sheet', 'buildAllocationSheet')
    );

    mainMenu.addSeparator();

    // Submenu: ID Match Copy
    mainMenu.addSubMenu(
      ui.createMenu('🆔 ID Match Copy')
        .addItem('▶️ Match & Copy Now', 'matchAndCopyNow')
        .addSeparator()
        .addItem('⚙️ Install Auto-Match (5 min)', 'installAutoMatchTrigger')
        .addItem('🗑️ Remove Auto-Match', 'removeAutoMatchTrigger')
        .addItem('📊 Check Status', 'checkTriggerStatus')
        .addSeparator()
        .addItem('ℹ️ About', 'showAbout')
    );

    mainMenu.addSeparator();

    // Submenu: Debug Tools
    mainMenu.addSubMenu(
      ui.createMenu('🔍 DEBUG Tools')
        .addItem('Check Duty Managers Sheet', 'debugDutyManagersSheet')
        .addItem('🧪 TEST Ward Name Matching Logic', 'testWardNameMatching')
        .addItem('🔍 Check Actual Ward 3 Data', 'testActualWard3Data')
    );

    mainMenu.addToUi();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABOUT
  // ═══════════════════════════════════════════════════════════════════════════════

  function showAbout() {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "🆔 ID-Based Matching Pipeline",
      "WHAT IT DOES:\n" +
        "1. Reads Employee IDs from STAGING Column AM\n" +
        "2. Matches with EXPORT Column A\n" +
        "3. Copies shift data to EXPORT Columns E:AF\n\n" +
        "SOURCES:\n" +
        "• Ward 2 (Nurses & HCAs)\n" +
        "• Ward 3\n" +
        "• ECU\n" +
        "• Duty Manager\n\n" +
        "SETUP:\n" +
        "Install Auto-Match to run every 5 minutes",
      ui.ButtonSet.OK
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESET SHEETS (your snippet, unchanged except minor const usage)
  // ═══════════════════════════════════════════════════════════════════════════════

  function resetSheets() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();

    const response = ui.prompt(
      '🧹 Reset Sheets',
      'Enter the names of sheets to KEEP (comma-separated).\n\n' +
        'Example: Source, Data, Config\n\n' +
        'All other sheets will be DELETED!',
      ui.ButtonSet.OK_CANCEL
    );

    // ...keep your existing logic below
  }


  // ════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 1: FINANCIAL REPORTS
  // ═══════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════

  // ========================================
  // MAIN FUNCTION: FINANCIAL SUMMARY
  // ========================================
  function generateFinancialSummary() {
    var ui = SpreadsheetApp.getUi();
    
    try {
      var startTime = new Date();
      // Reset CFO redeployment ledger for this run
      GLOBAL_REDEPLOYMENT_LEDGER = [];
      GLOBAL_TOIL_LEDGER = [];
      GLOBAL_PB_LEDGER = [];
      Logger.log('========================================');
      Logger.log('STAFFING FINANCIALS SUMMARY');
      Logger.log('========================================');
      
      // Open source file
      var sourceSpreadsheet;
      try {
        sourceSpreadsheet = SpreadsheetApp.openById(FINANCIALS_SOURCE_FILE_ID);
        Logger.log('✓ Opened source file: ' + sourceSpreadsheet.getName());
        // Stamp report context for all downstream sheets
        REPORT_CONTEXT.sourceFileName = sourceSpreadsheet.getName();
        REPORT_CONTEXT.generatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');

      } catch (e) {
        ui.alert('Error', 
          'Could not open source file.\\n\\n' +
          'File ID: ' + FINANCIALS_SOURCE_FILE_ID + '\\n\\n' +
          'Make sure:\\n' +
          '1. The file ID is correct\\n' +
          '2. You have access to the file',
          ui.ButtonSet.OK
        );
        return;
      }
      
      // Get Hours data
      var hoursData = getHoursData(sourceSpreadsheet);
      Logger.log('✓ Hours data loaded: ' + Object.keys(hoursData).length + ' shift codes');
      
      // NOTE: Bands data removed - not needed
      
      // Process each ward (now with flexible case-insensitive name matching!)
      var ward2Data = processWardFinancialFromCleaned(sourceSpreadsheet, 'WARD 2', hoursData);
      Logger.log('✓ Ward 2 processed: ' + ward2Data.length + ' staff');
      
      var ward3Data = processWardFinancialFromCleaned(sourceSpreadsheet, 'WARD 3', hoursData);
      Logger.log('✓ Ward 3 processed: ' + ward3Data.length + ' staff');
      
      var ecuData = processWardFinancialFromCleaned(sourceSpreadsheet, 'ECU', hoursData);
      Logger.log('✓ ECU processed: ' + ecuData.length + ' staff');
      
      // Get THIS spreadsheet for output
      var outputSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      Logger.log('Output will be created in: ' + outputSpreadsheet.getName());
      
      // Generate output sheet
      generateOutputSheet(outputSpreadsheet, ward2Data, ward3Data, ecuData);
      generateRedeploymentCfoSheets(outputSpreadsheet);
      Logger.log('✓ Financial summary created');
      
      var endTime = new Date();
      var duration = (endTime - startTime) / 1000;
      Logger.log('✅ COMPLETE in ' + duration.toFixed(1) + ' seconds');
      
      // Show success message
      ui.alert('Success!', 
        'Financial summary generated in ' + duration.toFixed(1) + ' seconds!\\n\\n' +
        'Source: ' + sourceSpreadsheet.getName() + '\\n' +
        '✓ Ward 2: ' + ward2Data.length + ' staff\\n' +
        '✓ Ward 3: ' + ward3Data.length + ' staff\\n' +
        '✓ ECU: ' + ecuData.length + ' staff\\n\\n' +
        'The report is now available in this file.',
        ui.ButtonSet.OK
      );
      
    } catch (error) {
      Logger.log('ERROR: ' + error.toString());
      Logger.log('Stack: ' + error.stack);
      ui.alert('Error', 'Failed to generate financial summary:\\n\\n' + error.toString(), ui.ButtonSet.OK);
    }
  }

  // ========================================
  // GET HOURS DATA FROM SOURCE (ROBUST WITH FALLBACK)
  // ========================================
  function getHoursData(sourceSpreadsheet) {
    var hoursMap = {};
    
    // STEP 1: Try to read from local "Hours" sheet in the source file
    var hoursSheet = sourceSpreadsheet.getSheetByName('Hours');
    
    if (hoursSheet) {
      Logger.log('✓ Reading from local "Hours" sheet...');
      var lastRow = hoursSheet.getLastRow();
      if (lastRow >= 2) {
        var shiftData = hoursSheet.getRange('A2:D' + lastRow).getValues();
        
        for (var i = 0; i < shiftData.length; i++) {
          var row = shiftData[i];
          var code = row[0] ? row[0].toString().trim().toUpperCase() : '';
          var descriptor = row[1] ? row[1].toString().trim() : '';
          var financeTag = row[2] ? row[2].toString().trim().toUpperCase() : 'BILLABLE';
          var hours = row[3] ? parseFloat(row[3]) : 0;
          
          if (code && hours > 0) {
            hoursMap[code] = {
              hours: hours,
              descriptor: descriptor,
              financeTag: financeTag,
              isBillable: financeTag === 'BILLABLE'
            };
          }
        }
        Logger.log('  ✓ Loaded ' + Object.keys(hoursMap).length + ' shift codes from local Hours sheet');
      }
    }
    
    // STEP 2: Fallback to comprehensive HOURS LOOKUP TABLE if local sheet is empty/missing
    if (Object.keys(hoursMap).length === 0) {
      Logger.log('⚠️ Local Hours sheet empty/missing - loading from COMPREHENSIVE HOURS LOOKUP TABLE...');
      try {
        var lookupTable = SpreadsheetApp.openById(HOURS_LOOKUP_TABLE_FILE_ID);
        var lookupSheet = lookupTable.getSheets()[0]; // Read first sheet
        
        var lastRow = lookupSheet.getLastRow();
        if (lastRow >= 2) {
          // Expecting columns: A=ShiftCode, B=Descriptor, C=FinanceTag, D=Hours, E=Category, F=IsWorked, G=DayNight, H=ShiftCode, I=FromTo, J=Hours
          var lookupData = lookupSheet.getRange('A2:J' + lastRow).getValues();
          
          for (var i = 0; i < lookupData.length; i++) {
            var row = lookupData[i];
            var code = row[0] ? row[0].toString().trim().toUpperCase() : '';
            var descriptor = row[1] ? row[1].toString().trim() : '';
            var financeTag = row[2] ? row[2].toString().trim().toUpperCase() : 'BILLABLE';
            var hours = row[3] ? parseFloat(row[3]) : 0;
            
            if (code && hours > 0) {
              hoursMap[code] = {
                hours: hours,
                descriptor: descriptor,
                financeTag: financeTag,
                isBillable: financeTag === 'BILLABLE'
              };
            }
          }
          Logger.log('  ✓ Loaded ' + Object.keys(hoursMap).length + ' shift codes from LOOKUP TABLE');
        }
      } catch (e) {
        Logger.log('  ⚠️ Could not access Hours Lookup Table: ' + e.message);
      }
    }
    
    // STEP 3: If still empty, use hardcoded defaults
    if (Object.keys(hoursMap).length === 0) {
      Logger.log('⚠️ No hours data found - using hardcoded defaults');
      return getDefaultHours();
    }
    
    return hoursMap;
  }

  // ========================================
  // BANDS DATA REMOVED - NOT APPLICABLE FOR PRIVATE HOSPITAL
  // ========================================

  // ========================================
  // DEFAULT HOURS (Fallback)
  // ========================================
  function getDefaultHours() {
    return {
      'LD': { hours: 12.5, descriptor: 'LONG DAY', financeTag: 'BILLABLE', isBillable: true },
      'LN': { hours: 12.5, descriptor: 'LONG NIGHT', financeTag: 'BILLABLE', isBillable: true },
      'L': { hours: 8, descriptor: 'LATE', financeTag: 'BILLABLE', isBillable: true },
      'E': { hours: 8, descriptor: 'EARLY', financeTag: 'BILLABLE', isBillable: true },
      'N': { hours: 12.5, descriptor: 'NIGHT', financeTag: 'BILLABLE', isBillable: true },
      'D': { hours: 8, descriptor: 'DAY', financeTag: 'BILLABLE', isBillable: true }
    };
  }

  // ========================================
  // TIME RANGE PARSING (Handle cells like "9-13", "14-20", "08:00-14:00")
  // ========================================
  function parseTimeRange(cellValue) {
    if (!cellValue) return null;
    
    var val = cellValue.toString().trim();
    
    // Pattern 1: "9-13", "14-20" (simple hour ranges)
    var simpleRange = val.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
    if (simpleRange) {
      var startHour = parseInt(simpleRange[1]);
      var endHour = parseInt(simpleRange[2]);
      
      // Handle wrapping (e.g., "20-8" means 20:00 to 08:00 next day)
      var hours = endHour > startHour ? endHour - startHour : (24 - startHour) + endHour;
      
      Logger.log('  ⏰ Parsed time range "' + val + '" → ' + hours + ' hours');
      return {
        hours: hours,
        descriptor: 'Custom Time Range (' + val + ')',
        financeTag: 'BILLABLE',
        isBillable: true
      };
    }
    
    // Pattern 2: "08:00-14:00", "14:00 pm - 20:00 pm" (time with colons)
    var timeRange = val.match(/^(\d{1,2}):(\d{2})\s*(?:am|pm)?\s*-\s*(\d{1,2}):(\d{2})\s*(?:am|pm)?$/i);
    if (timeRange) {
      var startHour = parseInt(timeRange[1]);
      var startMin = parseInt(timeRange[2]);
      var endHour = parseInt(timeRange[3]);
      var endMin = parseInt(timeRange[4]);
      
      var totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
      
      var hours = totalMinutes / 60;
      
      Logger.log('  ⏰ Parsed time range "' + val + '" → ' + hours + ' hours');
      return {
        hours: hours,
        descriptor: 'Custom Time Range (' + val + ')',
        financeTag: 'BILLABLE',
        isBillable: true
      };
    }
    
    return null;
  }

  // ========================================
  // ROBUST SHIFT INFO LOOKUP (With Fallback Chain)
  // ========================================
  function getShiftInfo(shiftCode, hoursData) {
    if (!shiftCode) return null;
    
    var code = shiftCode.toString().trim().toUpperCase();
    
    // STEP 1: Try direct lookup in hoursData
    if (hoursData && hoursData[code]) {
      return hoursData[code];
    }
    
    // STEP 2: Try parsing as time range (e.g., "9-13", "14-20")
    var timeRangeInfo = parseTimeRange(shiftCode);
    if (timeRangeInfo) {
      return timeRangeInfo;
    }
    
    // STEP 3: Try basic shift type defaults
    var basicDefaults = {
      'LD': { hours: 12.5, descriptor: 'Long Day', financeTag: 'BILLABLE', isBillable: true },
      'LN': { hours: 12.5, descriptor: 'Long Night', financeTag: 'BILLABLE', isBillable: true },
      'E': { hours: 8, descriptor: 'Early', financeTag: 'BILLABLE', isBillable: true },
      'L': { hours: 8, descriptor: 'Late', financeTag: 'BILLABLE', isBillable: true },
      'N': { hours: 12.5, descriptor: 'Night', financeTag: 'BILLABLE', isBillable: true },
      'D': { hours: 8, descriptor: 'Day', financeTag: 'BILLABLE', isBillable: true }
    };
    
    if (basicDefaults[code]) {
      return basicDefaults[code];
    }
    
    Logger.log('  ⚠️ Unknown shift code: "' + shiftCode + '" - returning null');
    return null;
  }

  // ========================================
  // REDEPLOYMENT PARSING
  // ========================================
  function isRedeploymentShiftCode(baseShiftCode, hoursData) {
    if (!baseShiftCode) return false;

    var c = baseShiftCode.toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');

    // Compact form (e.g. PBCU, PBDM, PBNIC)
    if (c.indexOf(' ') < 0) {
      if (c.indexOf('PB') === 0 && c.length > 2) {
        var dest = c.substring(2);
        if (dest === 'DM' || dest === 'NIC' || dest === 'DMNIC') return false;
        return true;
      }
      return false;
    }

    // Tokenized form (e.g. "LD W3", "LD DM NIC")
    var parts = c.split(' ');
    var baseType = parts[0];
    var destTokens = parts.slice(1);

    // Exclude DM / NIC anywhere in destination
    for (var i = 0; i < destTokens.length; i++) {
      if (destTokens[i] === 'DM' || destTokens[i] === 'NIC') return false;
    }

    return !!(hoursData && hoursData[baseType]);
  }

  function parseRedeploymentDestination(baseShiftCode) {
    var c = baseShiftCode.toString().trim().toUpperCase();

    if (c.indexOf(' ') >= 0) {
      return c.split(/\s+/).slice(1).join(' ').trim();
    }

    if (c.indexOf('PB') === 0 && c.length > 2) {
      return c.substring(2).trim();
    }

    return '';
  }

  function getHoursForShiftType(baseType, hoursData) {
    var bt = baseType.toString().trim().toUpperCase();
    var info = hoursData && hoursData[bt];
    if (info && typeof info.hours === 'number') return info.hours;

    if (bt === 'LD' || bt === 'LN') return 12.5;
    if (bt === 'E' || bt === 'L' || bt === 'D') return 8;
    if (bt === 'N') return 12.5;
    return 0;
  }

  // ========================================
  // HELPER: SMART SHEET FINDER (CASE-INSENSITIVE)
  // ========================================
  function findSheetByName(spreadsheet, targetName) {
    var sheets = spreadsheet.getSheets();
    var normalized = targetName.toString().trim().toUpperCase().replace(/\s+/g, '');
    
    for (var i = 0; i < sheets.length; i++) {
      var sheetName = sheets[i].getName();
      var sheetNormalized = sheetName.toString().trim().toUpperCase().replace(/\s+/g, '');
      if (sheetNormalized === normalized) {
        return sheets[i];
      }
    }
    return null;
  }

  // ========================================
  // HELPER: NORMALIZE WARD NAME FOR MATCHING
  // ========================================
  function normalizeWardName(name) {
    if (!name) return '';
    var n = name.toString().trim().toUpperCase();
    n = n.replace(/\s+/g, '');
    return n;
  }

  // ========================================
  // HELPER: CHECK IF TWO WARD NAMES MATCH
  // ========================================
  function wardNamesMatch(name1, name2) {
    var n1 = normalizeWardName(name1);
    var n2 = normalizeWardName(name2);
    
    if (n1 === n2) return true;
    
    // Handle "WARD2" vs "W2"
    if (n1.indexOf('WARD') === 0 && n2.length <= 3) {
      var wardNum = n1.replace('WARD', '');
      if (wardNum === n2 || 'W' + wardNum === n2) return true;
    }
    if (n2.indexOf('WARD') === 0 && n1.length <= 3) {
      var wardNum = n2.replace('WARD', '');
      if (wardNum === n1 || 'W' + wardNum === n1) return true;
    }
    
    if ((n1 === 'ECU' && n2 === 'PBCU') || (n1 === 'PBCU' && n2 === 'ECU')) {
      return true;
    }
    
    return false;
  }

  // ========================================
  // PROCESS WARD (FINANCIAL) - NEW CLEANED SHEET STRUCTURE
  // ========================================
  function processWardFinancialFromCleaned(sourceSpreadsheet, wardDeptName, hoursData) {
    var sheet = findSheetByName(sourceSpreadsheet, 'CLEANED');
    
    if (!sheet) {
      Logger.log('ERROR: Sheet "CLEANED" not found');
      return [];
    }
    
    Logger.log('Processing ward from CLEANED sheet: ' + wardDeptName);
    
    // Get all data from the CLEANED sheet
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    
    // Row 1 = Headers
    // Column A (0) = Employee ID
    // Column B (1) = Dept
    // Column C (2) = Role
    // Column D (3) = NAME
    // Column E (4) onwards = Dates (1 Dec, 2 Dec, ... 31 Dec)
    
    var headers = allData[0];
    var dateHeaders = headers.slice(4); // Columns E onwards (dates)
    
    var staffList = [];
    var results = [];
    
    // Filter rows by ward department
    Logger.log('  Scanning CLEANED sheet for ward: "' + wardDeptName + '"');
    
    for (var row = 1; row < allData.length; row++) {
      var rowData = allData[row];
      var dept = rowData[1] ? rowData[1].toString().trim().toUpperCase() : '';
      
      // ═══════════════════════════════════════════════════════════════════════
      // DIAGNOSTIC LOGGING: Show what values we're finding in Column B
      // ═══════════════════════════════════════════════════════════════════════
      if (row <= 5 && dept) {
        Logger.log('  🔍 DEBUG Row ' + (row + 1) + ' Column B: "' + dept + '" (length: ' + dept.length + ') | Looking for: "' + wardDeptName + '" (length: ' + wardDeptName.length + ')');
      }
      
      if (wardNamesMatch(dept, wardDeptName)) {
        var employeeId = rowData[0] ? rowData[0].toString().trim() : '';
        var role = rowData[2] ? rowData[2].toString().trim() : '';
        var name = rowData[3] ? rowData[3].toString().trim() : '';
        
        if (!name) continue; // Skip empty names
        
        // Extract role type (Nurse vs HCA) from Role column
        var roleType = 'Nurse'; // Default
        if (role.toUpperCase().indexOf('HCA') >= 0 || role.toUpperCase().indexOf('HEALTH CARE') >= 0) {
          roleType = 'HCA';
        }
        
        staffList.push({
          employeeId: employeeId,
          name: name,
          role: roleType,
          rowData: rowData,
          rowIndex: row
        });
      }
    }
    
    Logger.log('  ✓ Found ' + staffList.length + ' staff members in ' + wardDeptName);
    
    // ═══════════════════════════════════════════════════════════════════════
    // DIAGNOSTIC: If no staff found, show ALL unique Column B values
    // ═══════════════════════════════════════════════════════════════════════
    if (staffList.length === 0) {
      Logger.log('  ⚠️ WARNING: NO STAFF FOUND for ward "' + wardDeptName + '"');
      Logger.log('  Analyzing Column B values in CLEANED sheet...');
      
      var uniqueDepts = {};
      for (var r = 1; r < allData.length; r++) {
        var d = allData[r][1] ? allData[r][1].toString().trim().toUpperCase() : '';
        if (d && !uniqueDepts[d]) {
          uniqueDepts[d] = 0;
        }
        if (d) {
          uniqueDepts[d]++;
        }
      }
      
      Logger.log('  📊 UNIQUE WARD VALUES FOUND IN COLUMN B:');
      var deptKeys = Object.keys(uniqueDepts);
      for (var i = 0; i < deptKeys.length; i++) {
        Logger.log('    "' + deptKeys[i] + '" → ' + uniqueDepts[deptKeys[i]] + ' staff');
      }
      
      Logger.log('  💡 SOLUTION: Update script to use the exact Column B value from above list.');
      Logger.log('     Current search: "' + wardDeptName + '"');
      Logger.log('     Common issues:');
      Logger.log('       - Extra spaces ("WARD  3" vs "WARD 3")');
      Logger.log('       - Different format ("W3" vs "WARD 3")');
      Logger.log('       - Leading/trailing spaces');
    }
    
    // Process each staff member
    for (var s = 0; s < staffList.length; s++) {
      var staff = staffList[s];
      var shiftData = staff.rowData.slice(4); // Get shift codes starting from column E (index 4)
      
      var totalActualHours = 0;
      var rosteredToWardHours = 0;
      var redeployedOutHours = 0;
      var shiftCount = 0;
      var ldCount = 0;
      var nCount = 0;
      var sickCount = 0;
      var sickHours = 0;
      var unplCount = 0;
      var unplHours = 0;
      var hoHours = 0;
      var pbHours = 0;
      
      for (var col = 0; col < shiftData.length; col++) {
        var cellValue = shiftData[col];
        if (!cellValue) continue;
        
        var shiftCode = cellValue.toString().trim().toUpperCase();
        
        // ══════════════════════════════════════════════════════════════════════
        // SICK LEAVE DETECTION (Hours Lost - Positive Number)
        // ══════════════════════════════════════════════════════════════════════
        var isSickLeave = false;
        
        if (shiftCode === 'SICK' || shiftCode === 'SK' || shiftCode === 'S' || 
            shiftCode === 'SICKNESS' || shiftCode === 'SIC' || shiftCode === 'SICKNSS') {
          isSickLeave = true;
        }
        
        if (shiftCode.indexOf(' SICK') >= 0 || shiftCode.indexOf('SICK ') >= 0 ||
            shiftCode.indexOf(' SK') >= 0 || shiftCode.indexOf('SK ') >= 0 ||
            shiftCode.indexOf(' S ') >= 0 || shiftCode.indexOf('S ') === 0) {
          isSickLeave = true;
        }
        
        if (isSickLeave) {
          sickCount++;
          var sickShiftHours = 12.5;
          
          if (shiftCode.indexOf('LD') >= 0 || shiftCode.indexOf('LN') >= 0) {
            sickShiftHours = 12.5;
          } else if (shiftCode.indexOf('E ') >= 0 || shiftCode.indexOf('E') === 0 || 
                    shiftCode.indexOf('L ') >= 0 || shiftCode.indexOf('L') === 0 ||
                    shiftCode.indexOf('D ') >= 0 || shiftCode.indexOf('D') === 0) {
            sickShiftHours = 8;
          } else if (shiftCode.indexOf('N') >= 0) {
            sickShiftHours = 12.5;
          }
          
          sickHours += sickShiftHours;
          rosteredToWardHours -= sickShiftHours;
          totalActualHours -= sickShiftHours;
          
          Logger.log('  ' + staff.name + ': SICK "' + shiftCode + '" = +' + sickShiftHours + ' hours (HOURS LOST)');
          continue;
        }
        
        // ══════════════════════════════════════════════════════════════════════
        // UNPAID LEAVE DETECTION
        // ══════════════════════════════════════════════════════════════════════
        var isUnpaidLeave = false;
        
        if (shiftCode === 'UL' || shiftCode === 'UPL' || shiftCode === 'UNL' || 
            shiftCode === 'UNPL' || shiftCode === 'UNLP' || shiftCode === 'UNPAID' ||
            shiftCode === 'UNPAID LEAVE' || shiftCode === 'UNPAIDLEAVE') {
          isUnpaidLeave = true;
        }
        
        if (shiftCode.indexOf(' UL') >= 0 || shiftCode.indexOf('UL ') >= 0 ||
            shiftCode.indexOf(' UPL') >= 0 || shiftCode.indexOf('UPL ') >= 0 ||
            shiftCode.indexOf(' UNL') >= 0 || shiftCode.indexOf('UNL ') >= 0 ||
            shiftCode.indexOf(' UNPL') >= 0 || shiftCode.indexOf('UNPL ') >= 0 ||
            shiftCode.indexOf(' UNLP') >= 0 || shiftCode.indexOf('UNLP ') >= 0 ||
            shiftCode.indexOf('UNPAID') >= 0) {
          isUnpaidLeave = true;
        }
        
        if (isUnpaidLeave) {
          unplCount++;
          var unplDeduction = 12.5;
          
          if (shiftCode.indexOf('LD') >= 0 || shiftCode.indexOf('LN') >= 0) {
            unplDeduction = 12.5;
          } else if (shiftCode.indexOf('E ') >= 0 || shiftCode.indexOf('E') === 0 || 
                    shiftCode.indexOf('L ') >= 0 || shiftCode.indexOf('L') === 0 ||
                    shiftCode.indexOf('D ') >= 0 || shiftCode.indexOf('D') === 0) {
            unplDeduction = 8;
          }
          
          unplHours += unplDeduction;
          rosteredToWardHours -= unplDeduction;
          totalActualHours -= unplDeduction;
          
          Logger.log('  ' + staff.name + ': UNPAID LEAVE "' + shiftCode + '" = -' + unplDeduction + ' hours (DEDUCTION)');
          continue;
        }
        
        // ══════════════════════════════════════════════════════════════════════
        // HO (HOURS OWED) DETECTION
        // ══════════════════════════════════════════════════════════════════════
        if (shiftCode.indexOf(' HO') >= 0) {
          var baseShiftCode = shiftCode.replace(' HO', '').trim();
          var shiftInfo = getShiftInfo(baseShiftCode, hoursData);
          var hoShiftHours = 0;
          
          if (shiftInfo) {
            hoShiftHours = shiftInfo.hours;
          } else {
            Logger.log('  ⚠️ Could not determine hours for HO shift: "' + shiftCode + '" - defaulting to 12.5');
            hoShiftHours = 12.5; // Fallback
          }
          
          hoHours += hoShiftHours;
          totalActualHours -= hoShiftHours;
          rosteredToWardHours -= hoShiftHours;
          
          var dvToil = dateHeaders[col];
          var dsToil = '';
          if (dvToil instanceof Date) {
            dsToil = Utilities.formatDate(dvToil, Session.getScriptTimeZone(), 'dd MMM yyyy');
          } else if (dvToil) {
            dsToil = dvToil.toString();
          }
          
          Logger.log('  ' + staff.name + ': HO (Hours Owed) "' + shiftCode + '" = +' + hoShiftHours + ' hours OWED');
          
          GLOBAL_TOIL_LEDGER.push({
            date: dsToil,
            ward: wardDeptName,
            employeeId: staff.employeeId,
            staff: staff.name,
            role: staff.role,
            role: staff.role,
            shiftCode: shiftCode,
            hours: hoShiftHours,
            type: 'HO_DEBT'
          });
          continue;
        }
        
        // Skip non-working shifts
        var nonWorking = ['ANNUAL LEAVE', 'AL', 'OFF', 'LEAVE', 'TRAINING'];
        var isNonWorking = false;
        for (var nw = 0; nw < nonWorking.length; nw++) {
          if (shiftCode.indexOf(nonWorking[nw]) >= 0) {
            isNonWorking = true;
            break;
          }
        }
        if (isNonWorking) continue;
        
        var baseShiftCode = shiftCode.replace(' HO', '').replace(' PB', '').trim();
        var isRedeployment = isRedeploymentShiftCode(baseShiftCode, hoursData);
        var shiftHours = 0;
        
        if (isRedeployment) {
          var baseType = baseShiftCode.split(' ')[0];
          shiftHours = getHoursForShiftType(baseType, hoursData);
          var toDept = parseRedeploymentDestination(baseShiftCode) || 'UNKNOWN';

          // ═══════════════════════════════════════════════════════════════════════
          // GUARDRAIL: Validate redeployment destination
          // ═══════════════════════════════════════════════════════════════════════
          if (!toDept || toDept === '') {
            Logger.log('  ⚠️ WARNING: ' + staff.name + ' - Shift "' + shiftCode + '" missing destination ward (set to UNKNOWN)');
            toDept = 'UNKNOWN';
          }
          
          // GUARDRAIL: Check if redeployment is to same ward (likely data error)
          var normalizedFromWard = wardDeptName.toUpperCase().replace(/\s+/g, '');
          var normalizedToDept = toDept.toUpperCase().replace(/\s+/g, '');
          
          if (normalizedFromWard.indexOf(normalizedToDept) >= 0 || normalizedToDept.indexOf(normalizedFromWard) >= 0) {
            Logger.log('  ⚠️ WARNING: ' + staff.name + ' - Redeployment to SAME ward? "' + wardDeptName + '" → "' + toDept + '" on ' + dateHeaders[col]);
            Logger.log('      This may be a data entry error. Staff working on home ward should use base shift code only (e.g., "E" not "E W3")');
          }

          redeployedOutHours += shiftHours;
          totalActualHours += shiftHours;
          shiftCount++;

          var dv = dateHeaders[col];
          var ds = '';
          if (dv instanceof Date) {
            ds = Utilities.formatDate(dv, Session.getScriptTimeZone(), 'dd MMM yyyy');
          } else if (dv) {
            ds = dv.toString();
          }
          GLOBAL_REDEPLOYMENT_LEDGER.push({
            date: ds,
            fromWard: wardDeptName,
            toDept: toDept,
            employeeId: staff.employeeId,
            staff: staff.name,
            role: staff.role,
            shiftCode: shiftCode,
            hours: shiftHours
          });
          
          Logger.log('  ✓ ' + staff.name + ': REDEPLOYMENT "' + wardDeptName + '" → "' + toDept + '" shift ' + shiftCode + ' = ' + shiftHours + ' hours');
          
        } else {
          var shiftInfo = getShiftInfo(baseShiftCode, hoursData);
          if (shiftInfo) {
            shiftHours = shiftInfo.hours;
            totalActualHours += shiftHours;
            rosteredToWardHours += shiftHours;
            shiftCount++;
            
            if (baseShiftCode.indexOf('DM') >= 0) {
              Logger.log('  ✓ ' + staff.name + ': DM shift "' + shiftCode + '" → ' + shiftHours + ' hours');
            }
            
            if (baseShiftCode === 'LD' || baseShiftCode === 'D' || baseShiftCode === 'E' || baseShiftCode === 'L') {
              ldCount++;
            } else if (baseShiftCode === 'N' || baseShiftCode === 'LN') {
              nCount++;
            }
            
            if (shiftCode.indexOf(' PB') >= 0) {
              pbHours += shiftInfo.hours;
              
              Logger.log('  ' + staff.name + ': PB (Paid Back) "' + shiftCode + '" = ' + shiftInfo.hours + ' hours');

              var dvPb = dateHeaders[col];
              var dsPb = '';
              if (dvPb instanceof Date) {
                dsPb = Utilities.formatDate(dvPb, Session.getScriptTimeZone(), 'dd MMM yyyy');
              } else if (dvPb) {
                dsPb = dvPb.toString();
              }
              GLOBAL_PB_LEDGER.push({
                date: dsPb,
                ward: wardDeptName,
                employeeId: staff.employeeId,
                staff: staff.name,
                role: staff.role,
                shiftCode: shiftCode,
                hours: shiftInfo.hours,
                type: 'PB_REPAYMENT'
              });
            }
          } else {
            Logger.log('  ⚠️ ' + staff.name + ': Shift code "' + baseShiftCode + '" NOT FOUND in Hours sheet (ignored)');
          }
        }
      }
      
      var netWardHours = totalActualHours - redeployedOutHours;
      var wardBalance = netWardHours - rosteredToWardHours;
      
      results.push({
        employeeId: staff.employeeId,
        name: staff.name,
        role: staff.role,
        contracted: DEFAULT_CONTRACTED_HOURS,
        rosteredToWardHours: rosteredToWardHours,
        actual: totalActualHours,
        shiftCount: shiftCount,
        ldCount: ldCount,
        nCount: nCount,
        sickCount: sickCount,
        sickHours: sickHours,
        unplCount: unplCount,
        unplHours: unplHours,
        hoHours: hoHours,
        pbHours: pbHours,
        toilBalance: hoHours - pbHours,
        redeployedOutHours: redeployedOutHours,
        netWardHours: netWardHours,
        wardBalance: wardBalance
      });
    }
    
    return results;
  }

  // ========================================
  // PROCESS WARD (FINANCIAL) - OLD METHOD (DEPRECATED - NOT USED)
  // ========================================
  function processWardFinancial(sourceSpreadsheet, wardName, ranges, hoursData) {
    var sheet = sourceSpreadsheet.getSheetByName(wardName);
    
    if (!sheet) {
      Logger.log('Warning: Sheet "' + wardName + '" not found');
      return [];
    }
    
    Logger.log('Processing ward: ' + wardName);
    
    var nursesRange = sheet.getRange(ranges.nurses);
    var hcasRange = sheet.getRange(ranges.hcas);
    
    var nurses = nursesRange.getValues();
    var hcas = hcasRange.getValues();
    
    var staffList = [];
    
    for (var i = 0; i < nurses.length; i++) {
      var name = nurses[i][0] ? nurses[i][0].toString().trim() : '';
      if (name) {
        staffList.push({
          name: name,
          role: 'Nurse',
          gridRange: ranges.gridNurses,
          gridRowOffset: i
        });
      }
    }
    
    for (var i = 0; i < hcas.length; i++) {
      var name = hcas[i][0] ? hcas[i][0].toString().trim() : '';
      if (name) {
        staffList.push({
          name: name,
          role: 'HCA',
          gridRange: ranges.gridHcas,
          gridRowOffset: i
        });
      }
    }
    
    Logger.log('  Found ' + staffList.length + ' permanent staff members');

    var dateHeaders = sheet.getRange(ranges.dateHeaders).getValues()[0];
    
    var results = [];
    
    for (var s = 0; s < staffList.length; s++) {
      var staff = staffList[s];
      
      var gridRange = sheet.getRange(staff.gridRange);
      var gridData = gridRange.getValues();
      var staffRow = gridData[staff.gridRowOffset];
      
      var totalActualHours = 0;
      var rosteredToWardHours = 0;
      var redeployedOutHours = 0;
      var shiftCount = 0;
      var ldCount = 0;
      var nCount = 0;
      var sickCount = 0;
      var sickHours = 0; // NEW: Track sick hours (positive, hours lost)
      var unplCount = 0;
      var unplHours = 0;
      var hoHours = 0; // CORRECTED: Hours OWED by staff (sent home but paid - DEBT)
      var pbHours = 0; // CORRECTED: Hours PAID BACK by staff (worked to repay HO debt)
      
      for (var col = 0; col < staffRow.length; col++) {
        var cellValue = staffRow[col];
        if (!cellValue) continue;
        
        var shiftCode = cellValue.toString().trim().toUpperCase();
        
        // ══════════════════════════════════════════════════════════════════════
        // SICK LEAVE DETECTION (Hours Lost - Positive Number)
        // ══════════════════════════════════════════════════════════════════════
        // Staff still PAID when sick (NHS sick pay)
        // But ward LOST these hours (need agency/bank cover)
        // Show as POSITIVE hours (not negative)
        // ══════════════════════════════════════════════════════════════════════
        var isSickLeave = false;
        
        // Pattern 1: Exact sick leave codes (flexible matching)
        if (shiftCode === 'SICK' || shiftCode === 'SK' || shiftCode === 'S' || 
            shiftCode === 'SICKNESS' || shiftCode === 'SIC' || shiftCode === 'SICKNSS') {
          isSickLeave = true;
        }
        
        // Pattern 2: Contains sick code with shift type (e.g., "LD SICK", "E SK", "SICK LD")
        if (shiftCode.indexOf(' SICK') >= 0 || shiftCode.indexOf('SICK ') >= 0 ||
            shiftCode.indexOf(' SK') >= 0 || shiftCode.indexOf('SK ') >= 0 ||
            shiftCode.indexOf(' S ') >= 0 || shiftCode.indexOf('S ') === 0) {
          isSickLeave = true;
        }
        
        if (isSickLeave) {
          sickCount++;
          var sickShiftHours = 12.5; // Default sick leave = 12.5 hours lost
          
          // Check if there's a shift type specified (e.g. "LD SICK" or "E SK")
          if (shiftCode.indexOf('LD') >= 0 || shiftCode.indexOf('LN') >= 0) {
            sickShiftHours = 12.5;
          } else if (shiftCode.indexOf('E ') >= 0 || shiftCode.indexOf('E') === 0 || 
                    shiftCode.indexOf('L ') >= 0 || shiftCode.indexOf('L') === 0 ||
                    shiftCode.indexOf('D ') >= 0 || shiftCode.indexOf('D') === 0) {
            sickShiftHours = 8;
          } else if (shiftCode.indexOf('N') >= 0) {
            sickShiftHours = 12.5;
          }
          
          // ADD sick hours (positive - hours lost to ward)
          sickHours += sickShiftHours;
          rosteredToWardHours -= sickShiftHours; // DEDUCT from rostered hours (ward lost these hours)
          totalActualHours -= sickShiftHours; // DEDUCT from actual hours (staff didn't work)
          
          Logger.log('  ' + staff.name + ': SICK \"' + shiftCode + '\" = +' + sickShiftHours + ' hours (HOURS LOST)');
          continue;
        }
        
        // ══════════════════════════════════════════════════════════════════════
        // UNPAID LEAVE DETECTION (Payroll Deduction - Negative Number)
        // ══════════════════════════════════════════════════════════════════════
        // Staff PAID in advance (monthly salary)
        // Need to DEDUCT these hours from paycheck
        // Show as NEGATIVE hours (money owed back)
        // ══════════════════════════════════════════════════════════════════════
        // Count UNPL and DEDUCT hours (staff paid in advance, need to claw back)
        // Flexible matching: UL, UPL, UNL, UNPL, UNLP, UNPAID, etc.
        var isUnpaidLeave = false;
        
        // Pattern 1: Exact unpaid leave codes (most flexible)
        if (shiftCode === 'UL' || shiftCode === 'UPL' || shiftCode === 'UNL' || 
            shiftCode === 'UNPL' || shiftCode === 'UNLP' || shiftCode === 'UNPAID' ||
            shiftCode === 'UNPAID LEAVE' || shiftCode === 'UNPAIDLEAVE') {
          isUnpaidLeave = true;
        }
        
        // Pattern 2: Contains unpaid leave code with shift type (e.g., "LD UPL", "E UL", "UNL LD")
        if (shiftCode.indexOf(' UL') >= 0 || shiftCode.indexOf('UL ') >= 0 ||
            shiftCode.indexOf(' UPL') >= 0 || shiftCode.indexOf('UPL ') >= 0 ||
            shiftCode.indexOf(' UNL') >= 0 || shiftCode.indexOf('UNL ') >= 0 ||
            shiftCode.indexOf(' UNPL') >= 0 || shiftCode.indexOf('UNPL ') >= 0 ||
            shiftCode.indexOf(' UNLP') >= 0 || shiftCode.indexOf('UNLP ') >= 0 ||
            shiftCode.indexOf('UNPAID') >= 0) {
          isUnpaidLeave = true;
        }
        
        if (isUnpaidLeave) {
          unplCount++;
          var unplDeduction = 12.5; // Default unpaid leave = 12.5 hours deduction
          
          // Check if there's a shift type specified (e.g. "LD UPL" or "E UPL")
          if (shiftCode.indexOf('LD') >= 0 || shiftCode.indexOf('LN') >= 0) {
            unplDeduction = 12.5;
          } else if (shiftCode.indexOf('E ') >= 0 || shiftCode.indexOf('E') === 0 || 
                    shiftCode.indexOf('L ') >= 0 || shiftCode.indexOf('L') === 0 ||
                    shiftCode.indexOf('D ') >= 0 || shiftCode.indexOf('D') === 0) {
            unplDeduction = 8;
          }
          
          // SUBTRACT unpaid leave hours (staff already paid, need deduction)
          unplHours += unplDeduction;
          rosteredToWardHours -= unplDeduction; // DEDUCT from rostered hours
          totalActualHours -= unplDeduction; // DEDUCT from actual hours
          
          Logger.log('  ' + staff.name + ': UNPAID LEAVE "' + shiftCode + '" = -' + unplDeduction + ' hours (DEDUCTION)');
          continue;
        }
        
        // ══════════════════════════════════════════════════════════════════════
        // HO (HOURS OWED) DETECTION - Staff sent home but PAID
        // ══════════════════════════════════════════════════════════════════════
        // Staff did NOT WORK (sent home, overstaffed, given day off)
        // But ward STILL PAID them their salary
        // This creates a DEBT - staff OWES these hours back to the ward
        // They must work PB (Paid Back) shifts to repay this debt
        // ══════════════════════════════════════════════════════════════════════
        if (shiftCode.indexOf(' HO') >= 0) {
          var baseShiftCode = shiftCode.replace(' HO', '').trim();
          var shiftInfo = getShiftInfo(baseShiftCode, hoursData);
          var hoShiftHours = 0;
          
          if (shiftInfo) {
            hoShiftHours = shiftInfo.hours;
          } else {
            Logger.log('  ⚠️ Could not determine hours for HO shift: "' + shiftCode + '" - defaulting to 12.5');
            hoShiftHours = 12.5; // Fallback
          }
          
          // CRITICAL: HO creates a DEBT (staff owes hours to ward)
          hoHours += hoShiftHours; // Track total hours owed BY staff
          
          // Staff did NOT work - deduct from actual hours
          totalActualHours -= hoShiftHours;
          rosteredToWardHours -= hoShiftHours;
          
          var dvToil = dateHeaders[col];
          var dsToil = '';
          if (dvToil instanceof Date) {
            dsToil = Utilities.formatDate(dvToil, Session.getScriptTimeZone(), 'dd MMM yyyy');
          } else if (dvToil) {
            dsToil = dvToil.toString();
          }
          
          Logger.log('  ' + staff.name + ': HO (Hours Owed) \"' + shiftCode + '\" = +' + hoShiftHours + ' hours OWED (sent home but PAID - creates debt)');
          
          GLOBAL_TOIL_LEDGER.push({
            date: dsToil,
            ward: wardName,
            employeeId: staff.employeeId,
            staff: staff.name,
            role: staff.role,
            role: staff.role,
            shiftCode: shiftCode,
            hours: hoShiftHours,
            type: 'HO_DEBT' // NEW: Mark as debt owed by staff
          });
          continue;
        }
        
        // Skip other non-working shifts
        var nonWorking = ['ANNUAL LEAVE', 'AL', 'OFF', 'LEAVE', 'TRAINING'];
        var isNonWorking = false;
        for (var nw = 0; nw < nonWorking.length; nw++) {
          if (shiftCode.indexOf(nonWorking[nw]) >= 0) {
            isNonWorking = true;
            break;
          }
        }
        if (isNonWorking) continue;
        
        var baseShiftCode = shiftCode.replace(' HO', '').replace(' PB', '').trim();
        
        var isRedeployment = isRedeploymentShiftCode(baseShiftCode, hoursData);

        var shiftHours = 0;
        
        if (isRedeployment) {
          var baseType = baseShiftCode.split(' ')[0];
          shiftHours = getHoursForShiftType(baseType, hoursData);
          var toDept = parseRedeploymentDestination(baseShiftCode) || 'UNKNOWN';

          redeployedOutHours += shiftHours;
          totalActualHours += shiftHours;
          shiftCount++;

          var dv = dateHeaders[col];
          var ds = '';
          if (dv instanceof Date) {
            ds = Utilities.formatDate(dv, Session.getScriptTimeZone(), 'dd MMM yyyy');
          } else if (dv) {
            ds = dv.toString();
          }
          GLOBAL_REDEPLOYMENT_LEDGER.push({
            date: ds,
            fromWard: wardName,
            toDept: toDept,
            employeeId: staff.employeeId,
            staff: staff.name,
            role: staff.role,
            shiftCode: shiftCode,
            hours: shiftHours
          });
          
          Logger.log('  ' + staff.name + ': PLANNED EXPORT shift ' + shiftCode + ' = ' + shiftHours + ' hours (NOT rostered to this ward)');
          
        } else {
          var shiftInfo = getShiftInfo(baseShiftCode, hoursData);
          if (shiftInfo) {
            shiftHours = shiftInfo.hours;
            totalActualHours += shiftHours;
            rosteredToWardHours += shiftHours;
            shiftCount++;
            
            if (baseShiftCode.indexOf('DM') >= 0) {
              Logger.log('  ✓ ' + staff.name + ': DM shift "' + shiftCode + '" → ' + shiftHours + ' hours');
            }
            
            if (baseShiftCode === 'LD' || baseShiftCode === 'D' || baseShiftCode === 'E' || baseShiftCode === 'L') {
              ldCount++;
            } else if (baseShiftCode === 'N' || baseShiftCode === 'LN') {
              nCount++;
            }
            
            if (shiftCode.indexOf(' PB') >= 0) {
              // PB = Paid Back (staff WORKS to pay back HO debt)
              pbHours += shiftInfo.hours; // Track hours paid back
              
              Logger.log('  ' + staff.name + ': PB (Paid Back) \"' + shiftCode + '\" = ' + shiftInfo.hours + ' hours WORKED to pay back HO debt');

              var dvPb = dateHeaders[col];
              var dsPb = '';
              if (dvPb instanceof Date) {
                dsPb = Utilities.formatDate(dvPb, Session.getScriptTimeZone(), 'dd MMM yyyy');
              } else if (dvPb) {
                dsPb = dvPb.toString();
              }
              GLOBAL_PB_LEDGER.push({
                date: dsPb,
                ward: wardName,
                employeeId: staff.employeeId,
                staff: staff.name,
                role: staff.role,
                shiftCode: shiftCode,
                hours: shiftInfo.hours,
                type: 'PB_REPAYMENT' // NEW: Mark as debt repayment
              });
            }
          } else {
            Logger.log('  ⚠️ ' + staff.name + ': Shift code "' + baseShiftCode + '" NOT FOUND in Hours sheet (ignored)');
          }
        }
      }
      
      var netWardHours = totalActualHours - redeployedOutHours;
      var wardBalance = netWardHours - rosteredToWardHours;
      
      results.push({
        employeeId: staff.employeeId,
        name: staff.name,
        role: staff.role,
        contracted: DEFAULT_CONTRACTED_HOURS,
        rosteredToWardHours: rosteredToWardHours,
        actual: totalActualHours,
        shiftCount: shiftCount,
        ldCount: ldCount,
        nCount: nCount,
        sickCount: sickCount,
        sickHours: sickHours, // NEW: Hours lost to sickness (positive)
        unplCount: unplCount,
        unplHours: unplHours,
        hoHours: hoHours, // CORRECTED: Hours OWED by staff (debt)
        pbHours: pbHours, // CORRECTED: Hours PAID BACK by staff (debt repayment)
        toilBalance: hoHours - pbHours, // CORRECTED: Hours staff STILL OWES (positive = debt, negative = overpaid)
        redeployedOutHours: redeployedOutHours,
        netWardHours: netWardHours,
        wardBalance: wardBalance
      });
    }
    
    return results;
  }

  // ========================================
  // GENERATE OUTPUT SHEET
  // ========================================

  // ========================================
  // REPORT STYLING HELPERS (White-slate, print-ready)
  // ========================================
  function recreateSheet_(ss, name) {
    var sh = ss.getSheetByName(name);
    if (sh) ss.deleteSheet(sh);
    sh = ss.insertSheet(name);
    return sh;
  }

  function applySheetBaseStyle_(sheet, freezeRows, freezeCols) {
    try { sheet.setHiddenGridlines(true); } catch (e) {}
    if (typeof freezeRows === 'number') sheet.setFrozenRows(freezeRows);
    if (typeof freezeCols === 'number') sheet.setFrozenColumns(freezeCols);

    // Use a clean, "financial report" default typography (won't override fills)
    var maxRow = Math.max(sheet.getLastRow(), 50);
    var maxCol = Math.max(sheet.getLastColumn(), 20);
    sheet.getRange(1, 1, maxRow, maxCol)
      .setFontFamily('Arial')
      .setFontSize(10)
      .setFontColor('#111827')
      .setVerticalAlignment('middle');
  }

  function writeTitleBlock_(sheet, title, subtitle, totalCols) {
    totalCols = totalCols || 10;

    // Title
    sheet.getRange(1, 1, 1, totalCols).merge().setValue(title);
    sheet.getRange(1, 1)
      .setFontWeight('bold')
      .setFontSize(14)
      .setBackground('#111827')
      .setFontColor('#FFFFFF')
      .setHorizontalAlignment('center');

    // Subtitle / metadata
    var meta = [];
    if (REPORT_CONTEXT && REPORT_CONTEXT.sourceFileName) meta.push('Source: ' + REPORT_CONTEXT.sourceFileName);
    if (REPORT_CONTEXT && REPORT_CONTEXT.generatedAt) meta.push('Generated: ' + REPORT_CONTEXT.generatedAt);
    var sub = subtitle ? (subtitle + '  •  ' + meta.join('  •  ')) : meta.join('  •  ');

    sheet.getRange(2, 1, 1, totalCols).merge().setValue(sub);
    sheet.getRange(2, 1)
      .setFontStyle('italic')
      .setBackground('#F3F4F6')
      .setFontColor('#374151')
      .setHorizontalAlignment('center');
  }

  function styleHeaderRow_(range) {
    range.setFontWeight('bold')
      .setBackground('#F3F4F6')
      .setFontColor('#111827')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false, '#9CA3AF', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  }

  function safeNumber_(n) {
    var x = parseFloat(n);
    return isNaN(x) ? 0 : x;
  }

  function countUnique_(arr, key) {
    var set = {};
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i] && arr[i][key] ? arr[i][key].toString() : '';
      if (v) set[v] = true;
    }
    return Object.keys(set).length;
  }

  function aggregateBy_(arr, key) {
    var out = {};
    for (var i = 0; i < arr.length; i++) {
      var k = (arr[i] && arr[i][key]) ? arr[i][key].toString() : 'UNKNOWN';
      if (!out[k]) out[k] = { count: 0, hours: 0 };
      out[k].count += 1;
      out[k].hours += safeNumber_(arr[i].hours);
    }
    return out;
  }

  function toSortedRows_(aggObj) {
    var keys = Object.keys(aggObj);
    keys.sort(function(a,b){ return (aggObj[b].hours||0) - (aggObj[a].hours||0); });
    var rows = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      rows.push([k, aggObj[k].count, aggObj[k].hours]);
    }
    return rows;
  }


  function generateOutputSheet(outputSpreadsheet, ward2Data, ward3Data, ecuData) {
    var sheetName = 'Staffing Financials Summary';

    var sheet = outputSpreadsheet.getSheetByName(sheetName);
    if (sheet) outputSpreadsheet.deleteSheet(sheet);
    sheet = outputSpreadsheet.insertSheet(sheetName);

    var TOTAL_COLS = 20;
    writeTitleBlock_(sheet, 'STAFFING FINANCIALS SUMMARY', 'Operational P&L-style view of hours (not cash)', TOTAL_COLS);

    var row = 4;

    // Executive summary (consolidated)
    row = writeExecutiveSummaryBlock_(sheet, row, ward2Data, ward3Data, ecuData);
    row += 2;

    row = outputWardData(sheet, row, 'WARD 2', ward2Data);
    row += 1;
    row = outputWardData(sheet, row, 'WARD 3', ward3Data);
    row += 1;
    row = outputWardData(sheet, row, 'ECU', ecuData);

    // Column widths (print-friendly)
    sheet.setColumnWidth(1, 110);  // Employee ID
    sheet.setColumnWidth(2, 90);   // Dept
    sheet.setColumnWidth(3, 70);   // Role
    sheet.setColumnWidth(4, 190);  // Staff Name
    sheet.setColumnWidth(5, 95);   // Contracted
    sheet.setColumnWidth(6, 130);  // Rostered
    sheet.setColumnWidth(7, 120);  // Actual
    sheet.setColumnWidth(8, 95);   // Shift Counts
    sheet.setColumnWidth(9, 60);   // LD
    sheet.setColumnWidth(10, 60);  // N
    sheet.setColumnWidth(11, 85);  // Sick count
    sheet.setColumnWidth(12, 90);  // Sick hrs
    sheet.setColumnWidth(13, 85);  // UNPL count
    sheet.setColumnWidth(14, 115); // UNPL hrs
    sheet.setColumnWidth(15, 90);  // HO
    sheet.setColumnWidth(16, 90);  // PB
    sheet.setColumnWidth(17, 120); // TOIL Balance
    sheet.setColumnWidth(18, 120); // Redeployed OUT
    sheet.setColumnWidth(19, 120); // Net Ward Hours
    sheet.setColumnWidth(20, 120); // Ward Balance

    applySheetBaseStyle_(sheet, 3, 0);
    Logger.log('✓ Sheet "' + sheetName + '" created');
  }

  function writeExecutiveSummaryBlock_(sheet, startRow, ward2Data, ward3Data, ecuData) {
    var TOTAL_COLS = 20;
    var all = [];
    all = all.concat(ward2Data || []).concat(ward3Data || []).concat(ecuData || []);

    var totals = {
      contracted: 0,
      rostered: 0,
      actual: 0,
      sickHrs: 0,
      unplHrs: 0,
      ho: 0,
      pb: 0,
      toilBal: 0,
      redepOut: 0,
      netWard: 0,
      wardBal: 0
    };

    for (var i = 0; i < all.length; i++) {
      var s = all[i] || {};
      totals.contracted += safeNumber_(s.contracted);
      totals.rostered   += safeNumber_(s.rosteredToWardHours);
      totals.actual     += safeNumber_(s.actual);
      totals.sickHrs    += safeNumber_(s.sickHours);
      totals.unplHrs    += safeNumber_(s.unplHours);
      totals.ho         += safeNumber_(s.hoHours);
      totals.pb         += safeNumber_(s.pbHours);
      totals.toilBal    += safeNumber_(s.toilBalance);
      totals.redepOut   += safeNumber_(s.redeployedOutHours);
      totals.netWard    += safeNumber_(s.netWardHours);
      totals.wardBal    += safeNumber_(s.wardBalance);
    }

    // Section title
    sheet.getRange(startRow, 1, 1, TOTAL_COLS).merge().setValue('EXECUTIVE SUMMARY');
    sheet.getRange(startRow, 1)
      .setFontWeight('bold')
      .setBackground('#1F2937')
      .setFontColor('#FFFFFF')
      .setHorizontalAlignment('left');
    startRow++;

    // KPI row (labels)
    var labels = [
      'Total Rostered (hrs)', 'Total Actual (hrs)', 'Variance (hrs)',
      'Sick Lost (hrs)', 'Unpaid Deduct (hrs)',
      'HO Debt (hrs)', 'PB Worked (hrs)', 'TOIL Balance (hrs)',
      'Redeployed OUT (hrs)'
    ];
    sheet.getRange(startRow, 1, 1, labels.length).setValues([labels]);
    styleHeaderRow_(sheet.getRange(startRow, 1, 1, labels.length));
    startRow++;

    var variance = totals.actual - totals.rostered;
    var values = [[
      totals.rostered, totals.actual, variance,
      totals.sickHrs, -totals.unplHrs,
      totals.ho, totals.pb, totals.toilBal,
      totals.redepOut
    ]];
    sheet.getRange(startRow, 1, 1, labels.length).setValues(values);
    sheet.getRange(startRow, 1, 1, labels.length).setNumberFormat('0.0');
    startRow++;

    // Small note
    sheet.getRange(startRow, 1, 1, TOTAL_COLS).merge()
      .setValue('Note: This is an hours-ledger report. If you want £ costings, add a "Rates" sheet (Role/Band → hourly rate) and we can compute cash P&L automatically.');
    sheet.getRange(startRow, 1).setFontStyle('italic').setFontColor('#6B7280');
    startRow++;

    return startRow;
  }


  // ========================================
  // OUTPUT WARD DATA
  // ========================================

  function outputWardData(sheet, startRow, wardName, staffData) {
    staffData = staffData || [];
    var TOTAL_COLS = 20;

    // Ward header
    sheet.getRange(startRow, 1, 1, TOTAL_COLS).merge().setValue(wardName);
    sheet.getRange(startRow, 1)
      .setFontWeight('bold')
      .setFontSize(12)
      .setBackground('#111827')
      .setFontColor('#FFFFFF')
      .setHorizontalAlignment('left');
    startRow++;

    // Subtitle
    sheet.getRange(startRow, 1, 1, TOTAL_COLS).merge().setValue('Rostered vs Actual vs Overheads vs Redeployment (hours view)');
    sheet.getRange(startRow, 1)
      .setFontWeight('bold')
      .setBackground('#F3F4F6')
      .setFontColor('#374151')
      .setHorizontalAlignment('left');
    startRow++;

    // Ward totals (like a mini P&L summary line)
    var w = {
      headcount: staffData.length,
      contracted: 0,
      rostered: 0,
      actual: 0,
      shiftCount: 0,
      ldCount: 0,
      nCount: 0,
      sickCount: 0,
      sickHrs: 0,
      unplCount: 0,
      unplHrs: 0,
      ho: 0,
      pb: 0,
      toilBal: 0,
      redepOut: 0,
      netWard: 0,
      wardBal: 0
    };

    for (var i = 0; i < staffData.length; i++) {
      var s = staffData[i] || {};
      w.contracted += safeNumber_(s.contracted);
      w.rostered   += safeNumber_(s.rosteredToWardHours);
      w.actual     += safeNumber_(s.actual);
      w.shiftCount += safeNumber_(s.shiftCount);
      w.ldCount    += safeNumber_(s.ldCount);
      w.nCount     += safeNumber_(s.nCount);
      w.sickCount  += safeNumber_(s.sickCount);
      w.unplCount  += safeNumber_(s.unplCount);
      w.sickHrs    += safeNumber_(s.sickHours);
      w.unplHrs    += safeNumber_(s.unplHours);
      w.ho         += safeNumber_(s.hoHours);
      w.pb         += safeNumber_(s.pbHours);
      w.toilBal    += safeNumber_(s.toilBalance);
      w.redepOut   += safeNumber_(s.redeployedOutHours);
      w.netWard    += safeNumber_(s.netWardHours);
      w.wardBal    += safeNumber_(s.wardBalance);
    }

    var summaryLabels = ['Headcount', 'Rostered (hrs)', 'Actual (hrs)', 'Variance (hrs)', 'Sick (hrs)', 'UNPL Deduct (hrs)', 'Redeployed OUT (hrs)', 'Ward Balance (hrs)'];
    sheet.getRange(startRow, 1, 1, summaryLabels.length).setValues([summaryLabels]);
    styleHeaderRow_(sheet.getRange(startRow, 1, 1, summaryLabels.length));
    startRow++;

    var variance = w.actual - w.rostered;
    sheet.getRange(startRow, 1, 1, summaryLabels.length).setValues([[
      w.headcount,
      w.rostered,
      w.actual,
      variance,
      w.sickHrs,
      -w.unplHrs,
      w.redepOut,
      w.wardBal
    ]]);
    sheet.getRange(startRow, 2, 1, summaryLabels.length - 1).setNumberFormat('0.0');
    startRow += 2;

    // Table headers (single-row, clean)
    var header = [[
      'Employee ID', 'Dept', 'Role', 'Staff Name',
      'Contracted', 'Rostered To Ward (hrs)', 'Actual Worked (hrs)',
      'Shift Count', 'LD', 'N',
      'Sick (count)', 'Sick (hrs)',
      'UNPL (count)', 'UNPL (hrs deduct)',
      'HO (hrs owed)', 'PB (hrs paid back)', 'TOIL Balance (hrs)',
      'Redeployed OUT (hrs)', 'Net Ward Hours (hrs)', 'Ward Balance (hrs)'
    ]];

    sheet.getRange(startRow, 1, 1, TOTAL_COLS).setValues(header);
    styleHeaderRow_(sheet.getRange(startRow, 1, 1, TOTAL_COLS));
    startRow++;

    var firstDataRow = startRow;

    for (var r = 0; r < staffData.length; r++) {
      var staff = staffData[r] || {};

      sheet.getRange(startRow, 1, 1, TOTAL_COLS).setValues([[
        staff.employeeId,
        wardName,
        staff.role,
        staff.name,
        staff.contracted,
        staff.rosteredToWardHours,
        staff.actual,
        staff.shiftCount,
        staff.ldCount,
        staff.nCount,
        staff.sickCount,
        staff.sickHours,
        staff.unplCount,
        -staff.unplHours,  // show deductions as negative
        staff.hoHours,
        staff.pbHours,
        staff.toilBalance,
        staff.redeployedOutHours,
        staff.netWardHours,
        staff.wardBalance
      ]]);

      // Financial-report style: subtle zebra (no noisy grid)
      if (r % 2 === 1) {
        sheet.getRange(startRow, 1, 1, TOTAL_COLS).setBackground('#FAFAFA');
      }

      // Highlight key exception columns (correct column indexes)
      if (safeNumber_(staff.sickHours) > 0) {
        sheet.getRange(startRow, 12).setBackground('#FFF7ED').setFontColor('#9A3412').setFontWeight('bold'); // Sick hrs
      }
      if (safeNumber_(staff.unplHours) > 0) {
        sheet.getRange(startRow, 14).setBackground('#FEE2E2').setFontColor('#991B1B').setFontWeight('bold'); // UNPL deduct
      }
      if (safeNumber_(staff.hoHours) > 0) {
        sheet.getRange(startRow, 15).setBackground('#FEF3C7').setFontColor('#92400E').setFontWeight('bold'); // HO debt
      }
      if (safeNumber_(staff.toilBalance) > 0) {
        // Positive = staff still owes hours
        sheet.getRange(startRow, 17).setBackground('#FEE2E2').setFontColor('#991B1B').setFontWeight('bold');
      } else if (safeNumber_(staff.toilBalance) < 0) {
        // Negative = staff overpaid (worked more PB than HO owed)
        sheet.getRange(startRow, 17).setBackground('#DCFCE7').setFontColor('#166534').setFontWeight('bold');
      }

      startRow++;
    }

    // Totals row (bottom)
    sheet.getRange(startRow, 1, 1, 4).merge().setValue('TOTALS');
    sheet.getRange(startRow, 1, 1, TOTAL_COLS).setFontWeight('bold').setBackground('#E5E7EB');
    sheet.getRange(startRow, 5, 1, 16).setValues([[
      w.contracted,
      w.rostered,
      w.actual,
      w.shiftCount,
      w.ldCount,
      w.nCount,
      w.sickCount,
      w.sickHrs,
      w.unplCount,
      -w.unplHrs,  // UNPL (hrs deduct)
      w.ho,
      w.pb,
      w.toilBal,
      w.redepOut,
      w.netWard,
      w.wardBal
    ]]);

    // Format numbers (hours columns + balances)
    var dataRows = Math.max(staffData.length, 1);
    sheet.getRange(firstDataRow, 5, dataRows + 1, 16).setNumberFormat('0.0');

    // Outline border for the staff table (not per-cell grid)
    var tableHeight = (staffData.length + 2); // header + totals
    sheet.getRange(firstDataRow - 1, 1, tableHeight, TOTAL_COLS)
      .setBorder(true, true, true, true, false, false, '#9CA3AF', SpreadsheetApp.BorderStyle.SOLID);

    startRow += 2;
    return startRow;
  }


  // ========================================
  // GENERATE REDEPLOYMENT CFO SHEETS
  // ========================================

  function generateRedeploymentCfoSheets(outputSpreadsheet) {
    // ==========================
    // 1) REDEPLOYMENT LEDGER
    // ==========================
    var redepSheet = recreateSheet_(outputSpreadsheet, 'Redeployment Ledger');
    writeTitleBlock_(redepSheet, 'REDEPLOYMENT LEDGER - OFFICIAL DOCUMENTATION', 'Audit-grade transaction ledger with summaries', 8);

    var redepTotalHours = 0;
    for (var i = 0; i < GLOBAL_REDEPLOYMENT_LEDGER.length; i++) {
      redepTotalHours += safeNumber_(GLOBAL_REDEPLOYMENT_LEDGER[i].hours);
    }

    var redepUniqueStaff = countUnique_(GLOBAL_REDEPLOYMENT_LEDGER, 'employeeId');

    // Summary section
    redepSheet.getRange(4, 1, 1, 8).merge().setValue('SUMMARY');
    redepSheet.getRange(4, 1).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');

    var summaryRows = [
      ['Total transactions', GLOBAL_REDEPLOYMENT_LEDGER.length],
      ['Total hours', redepTotalHours],
      ['Unique staff (by Employee ID)', redepUniqueStaff],
      ['Data quality note', 'Destination is derived from shift code (e.g., "E W3"). Unknown destinations are flagged as UNKNOWN.']
    ];
    redepSheet.getRange(5, 1, summaryRows.length, 2).setValues(summaryRows);
    redepSheet.getRange(5, 1, summaryRows.length, 2).setBorder(true, true, true, true, false, false, '#E5E7EB', SpreadsheetApp.BorderStyle.SOLID);
    redepSheet.getRange(6, 2, 2, 1).setNumberFormat('0.0');

    // Breakdown section
    var fromAgg = aggregateBy_(GLOBAL_REDEPLOYMENT_LEDGER, 'fromWard');
    var toAgg = aggregateBy_(GLOBAL_REDEPLOYMENT_LEDGER, 'toDept');
    var fromRows = toSortedRows_(fromAgg);
    var toRows = toSortedRows_(toAgg);

    var breakdownTop = 10;
    redepSheet.getRange(breakdownTop, 1, 1, 8).merge().setValue('BREAKDOWN (by ward / destination)');
    redepSheet.getRange(breakdownTop, 1).setFontWeight('bold').setBackground('#F3F4F6').setFontColor('#374151');
    breakdownTop++;

    // By From Ward
    redepSheet.getRange(breakdownTop, 1, 1, 3).setValues([['From Ward', 'Txns', 'Hours']]);
    styleHeaderRow_(redepSheet.getRange(breakdownTop, 1, 1, 3));
    if (fromRows.length > 0) {
      redepSheet.getRange(breakdownTop + 1, 1, fromRows.length, 3).setValues(fromRows);
      redepSheet.getRange(breakdownTop + 1, 3, fromRows.length, 1).setNumberFormat('0.0');
      redepSheet.getRange(breakdownTop, 1, fromRows.length + 1, 3).setBorder(true, true, true, true, false, false, '#9CA3AF', SpreadsheetApp.BorderStyle.SOLID);
    }

    // By To Dept
    redepSheet.getRange(breakdownTop, 5, 1, 3).setValues([['To Dept', 'Txns', 'Hours']]);
    styleHeaderRow_(redepSheet.getRange(breakdownTop, 5, 1, 3));
    if (toRows.length > 0) {
      redepSheet.getRange(breakdownTop + 1, 5, toRows.length, 3).setValues(toRows);
      redepSheet.getRange(breakdownTop + 1, 7, toRows.length, 1).setNumberFormat('0.0');
      redepSheet.getRange(breakdownTop, 5, toRows.length + 1, 3).setBorder(true, true, true, true, false, false, '#9CA3AF', SpreadsheetApp.BorderStyle.SOLID);
    }

    var detailStart = breakdownTop + 2 + Math.max(fromRows.length, toRows.length) + 2;

    // Detail ledger
    redepSheet.getRange(detailStart, 1, 1, 8).merge().setValue('DETAIL TRANSACTION LEDGER');
    redepSheet.getRange(detailStart, 1).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');
    detailStart++;

    var redepHeaders = [['Date', 'From Ward', 'To Dept', 'Employee ID', 'Staff Name', 'Role', 'Shift Code', 'Hours']];
    redepSheet.getRange(detailStart, 1, 1, 8).setValues(redepHeaders);
    styleHeaderRow_(redepSheet.getRange(detailStart, 1, 1, 8));
    detailStart++;

    for (var r = 0; r < GLOBAL_REDEPLOYMENT_LEDGER.length; r++) {
      var e = GLOBAL_REDEPLOYMENT_LEDGER[r];
      redepSheet.getRange(detailStart + r, 1, 1, 8).setValues([[
        e.date,
        e.fromWard,
        e.toDept,
        e.employeeId,
        e.staff,
        e.role || '',
        e.shiftCode || '',
        e.hours
      ]]);
      if (r % 2 === 1) redepSheet.getRange(detailStart + r, 1, 1, 8).setBackground('#FAFAFA');
    }

    var redepDataRows = GLOBAL_REDEPLOYMENT_LEDGER.length;
    if (redepDataRows > 0) {
      redepSheet.getRange(detailStart, 8, redepDataRows, 1).setNumberFormat('0.0');
      redepSheet.getRange(detailStart - 1, 1, redepDataRows + 2, 8)
        .setBorder(true, true, true, true, false, false, '#9CA3AF', SpreadsheetApp.BorderStyle.SOLID);
    }

    // Totals line
    redepSheet.getRange(detailStart + redepDataRows, 1, 1, 7).merge().setValue('TOTAL HOURS');
    redepSheet.getRange(detailStart + redepDataRows, 1, 1, 8).setFontWeight('bold').setBackground('#E5E7EB');
    redepSheet.getRange(detailStart + redepDataRows, 8).setValue(redepTotalHours).setNumberFormat('0.0');

    // Column widths
    redepSheet.setColumnWidth(1, 130);
    redepSheet.setColumnWidth(2, 120);
    redepSheet.setColumnWidth(3, 120);
    redepSheet.setColumnWidth(4, 110);
    redepSheet.setColumnWidth(5, 200);
    redepSheet.setColumnWidth(6, 90);
    redepSheet.setColumnWidth(7, 120);
    redepSheet.setColumnWidth(8, 80);

    applySheetBaseStyle_(redepSheet, 2, 0);

    // ==========================
    // 2) REDEPLOYMENT RECONCILIATION
    // ==========================
    var reconSheet = recreateSheet_(outputSpreadsheet, 'Redeployment Reconciliation');
    writeTitleBlock_(reconSheet, 'REDEPLOYMENT RECONCILIATION', 'Inter-ward settlement view (net owed / in-credit)', 7);

    // Calculate inter-ward balances
    var wardPairs = {};
    for (var i = 0; i < GLOBAL_REDEPLOYMENT_LEDGER.length; i++) {
      var entry = GLOBAL_REDEPLOYMENT_LEDGER[i];
      var fromWard = entry.fromWard;
      var toWard = entry.toDept;
      var hours = safeNumber_(entry.hours);

      var pairKey = fromWard < toWard ? fromWard + ' ↔ ' + toWard : toWard + ' ↔ ' + fromWard;
      if (!wardPairs[pairKey]) {
        wardPairs[pairKey] = {
          ward1: fromWard < toWard ? fromWard : toWard,
          ward2: fromWard < toWard ? toWard : fromWard,
          ward1Sent: 0,
          ward2Sent: 0
        };
      }
      if (fromWard === wardPairs[pairKey].ward1) wardPairs[pairKey].ward1Sent += hours;
      else wardPairs[pairKey].ward2Sent += hours;
    }

    var wardTotals = {};
    for (var j = 0; j < GLOBAL_REDEPLOYMENT_LEDGER.length; j++) {
      var e2 = GLOBAL_REDEPLOYMENT_LEDGER[j];
      if (!wardTotals[e2.fromWard]) wardTotals[e2.fromWard] = { sent: 0, received: 0 };
      if (!wardTotals[e2.toDept]) wardTotals[e2.toDept] = { sent: 0, received: 0 };
      wardTotals[e2.fromWard].sent += safeNumber_(e2.hours);
      wardTotals[e2.toDept].received += safeNumber_(e2.hours);
    }

    var row = 4;

    // Section 1 header
    reconSheet.getRange(row, 1, 1, 7).merge().setValue('INTER-WARD SETTLEMENT TABLE');
    reconSheet.getRange(row, 1).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');
    row++;

    reconSheet.getRange(row, 1, 1, 7).setValues([[
      'Ward A', 'Ward B', 'A Sent to B (hrs)', 'B Sent to A (hrs)', 'Net Balance (hrs)', 'Ward Owing Hours', 'Settlement Action'
    ]]);
    styleHeaderRow_(reconSheet.getRange(row, 1, 1, 7));
    row++;

    var pairKeys = Object.keys(wardPairs);
    for (var p = 0; p < pairKeys.length; p++) {
      var pair = wardPairs[pairKeys[p]];
      var netBalance = pair.ward1Sent - pair.ward2Sent;
      var wardOwing = '';
      var settlementAction = '';

      if (netBalance > 0) {
        wardOwing = pair.ward2 + ' owes ' + pair.ward1;
        settlementAction = pair.ward2 + ' must credit ' + Math.abs(netBalance) + ' hrs to ' + pair.ward1;
      } else if (netBalance < 0) {
        wardOwing = pair.ward1 + ' owes ' + pair.ward2;
        settlementAction = pair.ward1 + ' must credit ' + Math.abs(netBalance) + ' hrs to ' + pair.ward2;
      } else {
        wardOwing = 'BALANCED';
        settlementAction = 'No settlement required';
      }

      reconSheet.getRange(row, 1, 1, 7).setValues([[
        pair.ward1, pair.ward2, pair.ward1Sent, pair.ward2Sent, netBalance, wardOwing, settlementAction
      ]]);
      reconSheet.getRange(row, 3, 1, 3).setNumberFormat('0.0');

      if (netBalance > 0) reconSheet.getRange(row, 5).setBackground('#FEE2E2').setFontColor('#991B1B').setFontWeight('bold');
      else if (netBalance < 0) reconSheet.getRange(row, 5).setBackground('#DCFCE7').setFontColor('#166534').setFontWeight('bold');
      else reconSheet.getRange(row, 5).setBackground('#F3F4F6').setFontColor('#6B7280');

      row++;
    }

    row += 2;

    // Section 2
    reconSheet.getRange(row, 1, 1, 5).merge().setValue('WARD SUMMARY (TOTAL SENT / RECEIVED)');
    reconSheet.getRange(row, 1).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');
    row++;

    reconSheet.getRange(row, 1, 1, 5).setValues([['Ward', 'Total Sent OUT (hrs)', 'Total Received IN (hrs)', 'Net Position (hrs)', 'Financial Status']]);
    styleHeaderRow_(reconSheet.getRange(row, 1, 1, 5));
    row++;

    var wards = Object.keys(wardTotals).sort();
    for (var w = 0; w < wards.length; w++) {
      var ward = wards[w];
      var sent = wardTotals[ward].sent;
      var received = wardTotals[ward].received;
      var netPosition = received - sent;
      var status = (netPosition > 0) ? ('IN CREDIT (+' + netPosition.toFixed(1) + ' hrs)') :
                  (netPosition < 0) ? ('IN DEBT (' + netPosition.toFixed(1) + ' hrs)') :
                  'BALANCED';

      reconSheet.getRange(row, 1, 1, 5).setValues([[ward, sent, received, netPosition, status]]);
      reconSheet.getRange(row, 2, 1, 3).setNumberFormat('0.0');

      if (netPosition > 0) reconSheet.getRange(row, 4).setBackground('#DCFCE7').setFontColor('#166534').setFontWeight('bold');
      else if (netPosition < 0) reconSheet.getRange(row, 4).setBackground('#FEE2E2').setFontColor('#991B1B').setFontWeight('bold');

      row++;
    }

    row += 2;

    // Section 3: Payroll checklist (kept, but tightened)
    reconSheet.getRange(row, 1, 1, 5).merge().setValue('PAYROLL VALIDATION CHECKLIST');
    reconSheet.getRange(row, 1).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');
    row++;

    reconSheet.getRange(row, 1, 1, 2).merge().setValue('☑ Total redeployment transactions:');
    reconSheet.getRange(row, 3).setValue(GLOBAL_REDEPLOYMENT_LEDGER.length);
    row++;

    reconSheet.getRange(row, 1, 1, 2).merge().setValue('☑ Total redeployment hours:');
    reconSheet.getRange(row, 3).setValue(redepTotalHours).setNumberFormat('0.0');
    row++;

    reconSheet.getRange(row, 1, 1, 5).merge().setValue('⚠️ Redeployment tracking is for WARD BUDGET reconciliation only (staff pay is unchanged).');
    reconSheet.getRange(row, 1).setBackground('#FFF7ED').setFontColor('#9A3412').setFontWeight('bold').setWrap(true);

    reconSheet.autoResizeColumns(1, 7);
    applySheetBaseStyle_(reconSheet, 2, 0);

    // ==========================
    // 3) TOIL (HO) LEDGER
    // ==========================
    var toilSheet = recreateSheet_(outputSpreadsheet, 'TOIL Ledger');
    writeTitleBlock_(toilSheet, 'TOIL / HO LEDGER - OFFICIAL DOCUMENTATION', 'Hours owed (debt) events with summaries', 8);

    var toilTotalHours = 0;
    for (var t = 0; t < GLOBAL_TOIL_LEDGER.length; t++) toilTotalHours += safeNumber_(GLOBAL_TOIL_LEDGER[t].hours);

    toilSheet.getRange(4, 1, 1, 8).merge().setValue('SUMMARY');
    toilSheet.getRange(4, 1).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');
    toilSheet.getRange(5, 1, 3, 2).setValues([
      ['Total transactions', GLOBAL_TOIL_LEDGER.length],
      ['Total hours owed (HO)', toilTotalHours],
      ['Unique staff (by Employee ID)', countUnique_(GLOBAL_TOIL_LEDGER, 'employeeId')]
    ]);
    toilSheet.getRange(6, 2).setNumberFormat('0.0');

    var toilByWard = toSortedRows_(aggregateBy_(GLOBAL_TOIL_LEDGER, 'ward'));
    toilSheet.getRange(10, 1, 1, 3).setValues([['Ward', 'Txns', 'Hours']]);
    styleHeaderRow_(toilSheet.getRange(10, 1, 1, 3));
    if (toilByWard.length > 0) {
      toilSheet.getRange(11, 1, toilByWard.length, 3).setValues(toilByWard);
      toilSheet.getRange(11, 3, toilByWard.length, 1).setNumberFormat('0.0');
    }

    var toilDetailStart = 14 + toilByWard.length;

    toilSheet.getRange(toilDetailStart, 1, 1, 8).merge().setValue('DETAIL TRANSACTION LEDGER');
    toilSheet.getRange(toilDetailStart, 1).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');
    toilDetailStart++;

    toilSheet.getRange(toilDetailStart, 1, 1, 8).setValues([['Date', 'Ward', 'Employee ID', 'Staff Name', 'Role', 'Shift Code', 'Hours', 'Type']]);
    styleHeaderRow_(toilSheet.getRange(toilDetailStart, 1, 1, 8));
    toilDetailStart++;

    for (var tr = 0; tr < GLOBAL_TOIL_LEDGER.length; tr++) {
      var te = GLOBAL_TOIL_LEDGER[tr];
      toilSheet.getRange(toilDetailStart + tr, 1, 1, 8).setValues([[
        te.date, te.ward, te.employeeId || '', te.staff, te.role || '', te.shiftCode || '', te.hours, te.type || ''
      ]]);
      if (tr % 2 === 1) toilSheet.getRange(toilDetailStart + tr, 1, 1, 8).setBackground('#FAFAFA');
    }
    if (GLOBAL_TOIL_LEDGER.length > 0) toilSheet.getRange(toilDetailStart, 7, GLOBAL_TOIL_LEDGER.length, 1).setNumberFormat('0.0');

    // Totals row
    toilSheet.getRange(toilDetailStart + GLOBAL_TOIL_LEDGER.length, 1, 1, 6).merge().setValue('TOTAL HOURS OWED (HO)');
    toilSheet.getRange(toilDetailStart + GLOBAL_TOIL_LEDGER.length, 1, 1, 8).setFontWeight('bold').setBackground('#E5E7EB');
    toilSheet.getRange(toilDetailStart + GLOBAL_TOIL_LEDGER.length, 7).setValue(toilTotalHours).setNumberFormat('0.0');

    applySheetBaseStyle_(toilSheet, 2, 0);

    // ==========================
    // 4) PAYBACK (PB) LEDGER
    // ==========================
    var pbSheet = recreateSheet_(outputSpreadsheet, 'PB Ledger');
    writeTitleBlock_(pbSheet, 'PAYBACK (PB) LEDGER - OFFICIAL DOCUMENTATION', 'Hours worked back (repayment) events with summaries', 8);

    var pbTotalHours = 0;
    for (var b = 0; b < GLOBAL_PB_LEDGER.length; b++) pbTotalHours += safeNumber_(GLOBAL_PB_LEDGER[b].hours);

    pbSheet.getRange(4, 1, 1, 8).merge().setValue('SUMMARY');
    pbSheet.getRange(4, 1).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');
    pbSheet.getRange(5, 1, 3, 2).setValues([
      ['Total transactions', GLOBAL_PB_LEDGER.length],
      ['Total hours paid back (PB)', pbTotalHours],
      ['Unique staff (by Employee ID)', countUnique_(GLOBAL_PB_LEDGER, 'employeeId')]
    ]);
    pbSheet.getRange(6, 2).setNumberFormat('0.0');

    var pbByWard = toSortedRows_(aggregateBy_(GLOBAL_PB_LEDGER, 'ward'));
    pbSheet.getRange(10, 1, 1, 3).setValues([['Ward', 'Txns', 'Hours']]);
    styleHeaderRow_(pbSheet.getRange(10, 1, 1, 3));
    if (pbByWard.length > 0) {
      pbSheet.getRange(11, 1, pbByWard.length, 3).setValues(pbByWard);
      pbSheet.getRange(11, 3, pbByWard.length, 1).setNumberFormat('0.0');
    }

    var pbDetailStart = 14 + pbByWard.length;

    pbSheet.getRange(pbDetailStart, 1, 1, 8).merge().setValue('DETAIL TRANSACTION LEDGER');
    pbSheet.getRange(pbDetailStart, 1).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');
    pbDetailStart++;

    pbSheet.getRange(pbDetailStart, 1, 1, 8).setValues([['Date', 'Ward', 'Employee ID', 'Staff Name', 'Role', 'Shift Code', 'Hours', 'Type']]);
    styleHeaderRow_(pbSheet.getRange(pbDetailStart, 1, 1, 8));
    pbDetailStart++;

    for (var pr = 0; pr < GLOBAL_PB_LEDGER.length; pr++) {
      var pe = GLOBAL_PB_LEDGER[pr];
      pbSheet.getRange(pbDetailStart + pr, 1, 1, 8).setValues([[
        pe.date, pe.ward, pe.employeeId || '', pe.staff, pe.role || '', pe.shiftCode || '', pe.hours, pe.type || ''
      ]]);
      if (pr % 2 === 1) pbSheet.getRange(pbDetailStart + pr, 1, 1, 8).setBackground('#FAFAFA');
    }
    if (GLOBAL_PB_LEDGER.length > 0) pbSheet.getRange(pbDetailStart, 7, GLOBAL_PB_LEDGER.length, 1).setNumberFormat('0.0');

    // Totals row
    pbSheet.getRange(pbDetailStart + GLOBAL_PB_LEDGER.length, 1, 1, 6).merge().setValue('TOTAL HOURS PAID BACK (PB)');
    pbSheet.getRange(pbDetailStart + GLOBAL_PB_LEDGER.length, 1, 1, 8).setFontWeight('bold').setBackground('#E5E7EB');
    pbSheet.getRange(pbDetailStart + GLOBAL_PB_LEDGER.length, 7).setValue(pbTotalHours).setNumberFormat('0.0');

    applySheetBaseStyle_(pbSheet, 2, 0);

    Logger.log('✓ CFO ledger sheets created (with summaries + totals)');
  }


  // ========================================
  // STAFF ABSENCE & TOIL TRANSPARENCY REPORT
  // ========================================
  function generateStaffAbsenceTransparencyReport() {
    var ui = SpreadsheetApp.getUi();
    
    try {
      var startTime = new Date();
      Logger.log('========================================');
      Logger.log('STAFF ABSENCE & TOIL TRANSPARENCY REPORT');
      Logger.log('========================================');
      
      // Open source file
      var sourceSpreadsheet;
      try {
        sourceSpreadsheet = SpreadsheetApp.openById(FINANCIALS_SOURCE_FILE_ID);
        Logger.log('✓ Opened source file: ' + sourceSpreadsheet.getName());
        // Stamp report context for all downstream sheets
        REPORT_CONTEXT.sourceFileName = sourceSpreadsheet.getName();
        REPORT_CONTEXT.generatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');

      } catch (e) {
        ui.alert('Error', 
          'Could not open source file.\\n\\n' +
          'File ID: ' + FINANCIALS_SOURCE_FILE_ID + '\\n\\n' +
          'Make sure:\\n' +
          '1. The file ID is correct\\n' +
          '2. You have access to the file',
          ui.ButtonSet.OK
        );
        return;
      }
      
      // Get Hours data
      var hoursData = getHoursData(sourceSpreadsheet);
      Logger.log('✓ Hours data loaded');
      
      // NOTE: Bands data removed - not needed
      
      // Process each ward for absence tracking from CLEANED sheet
      var ward2Data = processWardAbsenceFromCleaned(sourceSpreadsheet, 'WARD 2', hoursData);
      Logger.log('✓ Ward 2 absence data: ' + ward2Data.length + ' staff');
      
      var ward3Data = processWardAbsenceFromCleaned(sourceSpreadsheet, 'WARD 3', hoursData);
      Logger.log('✓ Ward 3 absence data: ' + ward3Data.length + ' staff');
      
      var ecuData = processWardAbsenceFromCleaned(sourceSpreadsheet, 'ECU', hoursData);
      Logger.log('✓ ECU absence data: ' + ecuData.length + ' staff');
      
      // Get output spreadsheet
      var outputSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      
      // Generate transparency report
      generateAbsenceTransparencySheet(outputSpreadsheet, ward2Data, ward3Data, ecuData);
      
      var endTime = new Date();
      var duration = (endTime - startTime) / 1000;
      Logger.log('✅ COMPLETE in ' + duration.toFixed(1) + ' seconds');
      
      // Show success message
      ui.alert('Success!', 
        'Staff Absence & TOIL Transparency Report generated!\\n\\n' +
        'Source: ' + sourceSpreadsheet.getName() + '\\n' +
        '✓ Ward 2: ' + ward2Data.length + ' staff\\n' +
        '✓ Ward 3: ' + ward3Data.length + ' staff\\n' +
        '✓ ECU: ' + ecuData.length + ' staff\\n\\n' +
        'The transparency report is now available in this file.',
        ui.ButtonSet.OK
      );
      
    } catch (error) {
      Logger.log('ERROR: ' + error.toString());
      Logger.log('Stack: ' + error.stack);
      ui.alert('Error', 'Failed to generate transparency report:\\n\\n' + error.toString(), ui.ButtonSet.OK);
    }
  }

  // ========================================
  // PROCESS WARD ABSENCE DATA - NEW CLEANED SHEET STRUCTURE
  // ========================================
  function processWardAbsenceFromCleaned(sourceSpreadsheet, wardDeptName, hoursData) {
    var sheet = sourceSpreadsheet.getSheetByName('CLEANED');
    
    if (!sheet) {
      Logger.log('ERROR: Sheet "CLEANED" not found');
      return [];
    }
    
    Logger.log('Processing absence data for: ' + wardDeptName);
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    
    var headers = allData[0];
    var dateHeaders = headers.slice(4);
    
    var results = [];
    
    for (var row = 1; row < allData.length; row++) {
      var rowData = allData[row];
      var dept = rowData[1] ? rowData[1].toString().trim().toUpperCase() : '';
      
      if (wardNamesMatch(dept, wardDeptName)) {
        var employeeId = rowData[0] ? rowData[0].toString().trim() : '';
        var role = rowData[2] ? rowData[2].toString().trim() : '';
        var name = rowData[3] ? rowData[3].toString().trim() : '';
        
        if (!name) continue;
        
        var roleType = 'Nurse';
        if (role.toUpperCase().indexOf('HCA') >= 0 || role.toUpperCase().indexOf('HEALTH CARE') >= 0) {
          roleType = 'HCA';
        }
        
        var shiftData = rowData.slice(4);
        
        var sickHours = 0;
        var sickDays = 0;
        var annualLeaveHours = 0;
        var annualLeaveDays = 0;
        var hoHours = 0;
        var pbHours = 0;
        
        for (var col = 0; col < shiftData.length; col++) {
          var cellValue = shiftData[col];
          if (!cellValue) continue;
          
          var shiftCode = cellValue.toString().trim().toUpperCase();
          
          // Track SICK
          if (shiftCode === 'SICK' || shiftCode === 'S' || shiftCode.indexOf('SK') >= 0) {
            sickDays++;
            var sickShiftHours = SICK_DEFAULT_HOURS;
            
            if (shiftCode === 'LD SK' || shiftCode === 'LN SK') {
              sickShiftHours = 12.5;
            } else if (shiftCode === 'E SK' || shiftCode === 'L SK') {
              sickShiftHours = 8;
            } else if (shiftCode === 'SK') {
              sickShiftHours = 0;
            }
            
            sickHours += sickShiftHours;
            continue;
          }
          
          // Track ANNUAL LEAVE
          if (shiftCode === 'AL' || shiftCode === 'ANNUAL LEAVE' || shiftCode === 'LEAVE') {
            annualLeaveDays++;
            annualLeaveHours += 8;
            continue;
          }
          
          // Track HO (Hours Owed)
          if (shiftCode.indexOf(' HO') >= 0) {
            var baseShiftCode = shiftCode.replace(' HO', '').trim();
            var shiftInfo = getShiftInfo(baseShiftCode, hoursData);
            var hoShiftHours = 0;
            
            if (shiftInfo) {
              hoShiftHours = shiftInfo.hours;
            } else {
              Logger.log('  ⚠️ Could not determine hours for HO shift: "' + shiftCode + '" - defaulting to 12.5');
              hoShiftHours = 12.5; // Fallback
            }
            
            hoHours += hoShiftHours;
            continue;
          }
          
          // Track PB (Paid Back)
          if (shiftCode.indexOf(' PB') >= 0) {
            var basePbCode = shiftCode.replace(' PB', '').trim();
            var pbShiftInfo = hoursData[basePbCode];
            
            if (pbShiftInfo) {
              pbHours += pbShiftInfo.hours;
            } else {
              if (basePbCode === 'LD' || basePbCode === 'LN') pbHours += 12.5;
              else if (basePbCode === 'E' || basePbCode === 'L' || basePbCode === 'D') pbHours += 8;
              else if (basePbCode === 'N') pbHours += 12.5;
            }
            continue;
          }
        }
        
        var toilBalance = hoHours - pbHours;
        
        results.push({
          ward: wardDeptName,
          employeeId: employeeId,
          name: name,
          role: roleType,
          sickHours: sickHours,
          sickDays: sickDays,
          annualLeaveHours: annualLeaveHours,
          annualLeaveDays: annualLeaveDays,
          hoHours: hoHours,
          pbHours: pbHours,
          toilBalance: toilBalance
        });
      }
    }
    
    return results;
  }

  // ========================================
  // PROCESS WARD ABSENCE DATA - OLD METHOD (DEPRECATED - NOT USED)
  // ========================================
  function processWardAbsence(sourceSpreadsheet, wardName, ranges, hoursData) {
    var sheet = sourceSpreadsheet.getSheetByName(wardName);
    
    if (!sheet) {
      Logger.log('Warning: Sheet "' + wardName + '" not found');
      return [];
    }
    
    Logger.log('Processing ward absence: ' + wardName);
    
    var nursesRange = sheet.getRange(ranges.nurses);
    var hcasRange = sheet.getRange(ranges.hcas);
    
    var nurses = nursesRange.getValues();
    var hcas = hcasRange.getValues();
    
    var staffList = [];
    
    for (var i = 0; i < nurses.length; i++) {
      var name = nurses[i][0] ? nurses[i][0].toString().trim() : '';
      if (name) {
        staffList.push({
          name: name,
          role: 'Nurse',
          gridRange: ranges.gridNurses,
          gridRowOffset: i,
          ward: wardName
        });
      }
    }
    
    for (var i = 0; i < hcas.length; i++) {
      var name = hcas[i][0] ? hcas[i][0].toString().trim() : '';
      if (name) {
        staffList.push({
          name: name,
          role: 'HCA',
          gridRange: ranges.gridHcas,
          gridRowOffset: i,
          ward: wardName
        });
      }
    }
    
    var dateHeaders = sheet.getRange(ranges.dateHeaders).getValues()[0];
    
    var results = [];
    
    for (var s = 0; s < staffList.length; s++) {
      var staff = staffList[s];
      
      var gridRange = sheet.getRange(staff.gridRange);
      var gridData = gridRange.getValues();
      var staffRow = gridData[staff.gridRowOffset];
      
      var sickHours = 0;
      var sickDays = 0;
      var annualLeaveHours = 0;
      var annualLeaveDays = 0;
      var hoHours = 0; // CORRECTED: Hours OWED by staff (sent home but paid - creates DEBT)
      var pbHours = 0; // CORRECTED: Hours PAID BACK by staff (worked to repay HO debt)
      
      for (var col = 0; col < staffRow.length; col++) {
        var cellValue = staffRow[col];
        if (!cellValue) continue;
        
        var shiftCode = cellValue.toString().trim().toUpperCase();
        
        // Track SICK
        if (shiftCode === 'SICK' || shiftCode === 'S' || shiftCode.indexOf('SK') >= 0) {
          sickDays++;
          var sickShiftHours = SICK_DEFAULT_HOURS;
          
          if (shiftCode === 'LD SK' || shiftCode === 'LN SK') {
            sickShiftHours = 12.5;
          } else if (shiftCode === 'E SK' || shiftCode === 'L SK') {
            sickShiftHours = 8;
          } else if (shiftCode === 'SK') {
            sickShiftHours = 0;
          }
          
          sickHours += sickShiftHours;
          continue;
        }
        
        // Track ANNUAL LEAVE
        if (shiftCode === 'AL' || shiftCode === 'ANNUAL LEAVE' || shiftCode === 'LEAVE') {
          annualLeaveDays++;
          annualLeaveHours += 8; // Default 8 hours per day
          continue;
        }
        
        // ══════════════════════════════════════════════════════════════════════
        // HO (HOURS OWED) - Staff sent home but PAID (creates DEBT)
        // ═════════════════���═════════════════════��══════════════════════════════
        // CORRECTED: HO means staff did NOT work but were still PAID
        // This creates a DEBT - staff OWES these hours back to the ward
        // They must work PB (Paid Back) shifts to repay this debt
        // ══════════════════════════════════════════════════════════════════════
        if (shiftCode.indexOf(' HO') >= 0) {
          var baseShiftCode = shiftCode.replace(' HO', '').trim();
          var shiftInfo = getShiftInfo(baseShiftCode, hoursData);
          var hoShiftHours = 0;
          
          if (shiftInfo) {
            hoShiftHours = shiftInfo.hours;
          } else {
            Logger.log('  ⚠️ Could not determine hours for HO shift: "' + shiftCode + '" - defaulting to 12.5');
            hoShiftHours = 12.5; // Fallback
          }
          
          // HO creates a DEBT (staff owes hours to ward)
          hoHours += hoShiftHours;
          continue;
        }
        
        // ══════════════════════════════════════════════════════════════════════
        // PB (PAID BACK) - Staff WORKS to repay HO debt
        // ══════════════════════════════════════════════════════════════════════
        // CORRECTED: PB means staff WORKED extra shifts to repay HO debt
        // This REDUCES the debt they owe
        // ══════════════════════════════════════════════════════════════════════
        if (shiftCode.indexOf(' PB') >= 0) {
          var basePbCode = shiftCode.replace(' PB', '').trim();
          var pbShiftInfo = hoursData[basePbCode];
          
          if (pbShiftInfo) {
            pbHours += pbShiftInfo.hours;
          } else {
            if (basePbCode === 'LD' || basePbCode === 'LN') pbHours += 12.5;
            else if (basePbCode === 'E' || basePbCode === 'L' || basePbCode === 'D') pbHours += 8;
            else if (basePbCode === 'N') pbHours += 12.5;
          }
          continue;
        }
      }
      
      // ══════════════════════════════════════════════════════════════════════
      // CALCULATE TOIL BALANCE (CORRECTED)
      // ══════════════════════════════════════════════════════════════════════
      // TOIL Balance = HO (hours owed BY staff) - PB (hours paid back BY staff)
      // Positive = Staff STILL OWES hours (sent home paid, didn't pay back yet)
      // Negative = Staff OVERPAID (worked more PB than HO they owed)
      // Zero = Fully balanced
      // ══════════════════════════════════════════════════════════════════════
      var toilBalance = hoHours - pbHours;
      
      results.push({
        ward: staff.ward,
        name: staff.name,
        role: staff.role,
        sickHours: sickHours,
        sickDays: sickDays,
        annualLeaveHours: annualLeaveHours,
        annualLeaveDays: annualLeaveDays,
        hoHours: hoHours, // CORRECTED: Track HO (hours owed by staff)
        pbHours: pbHours, // CORRECTED: Track PB (hours paid back by staff)
        toilBalance: toilBalance // CORRECTED: HO - PB
      });
    }
    
    return results;
  }

  // ========================================
  // GENERATE ABSENCE TRANSPARENCY SHEET
  // ========================================
  function generateAbsenceTransparencySheet(outputSpreadsheet, ward2Data, ward3Data, ecuData) {
    var sheetName = 'Staff Absence & TOIL Transparency';
    
    var sheet = outputSpreadsheet.getSheetByName(sheetName);
    if (sheet) {
      outputSpreadsheet.deleteSheet(sheet);
    }
    
    sheet = outputSpreadsheet.insertSheet(sheetName);
    
    // Main title
    sheet.getRange('A1:L1').merge();
    sheet.getRange('A1').setValue('⚖️ STAFF ABSENCE & TOIL TRANSPARENCY REPORT');
    sheet.getRange('A1').setFontWeight('bold').setFontSize(14).setBackground('#002060').setFontColor('#FFFFFF');
    sheet.getRange('A1').setHorizontalAlignment('center');
    
    // Subtitle
    sheet.getRange('A2:L2').merge();
    sheet.getRange('A2').setValue('📋 Official Documentation - Full breakdown of sick leave, annual leave, TOIL taken, payback worked, and TOIL balances');
    sheet.getRange('A2').setFontStyle('italic').setBackground('#D9E1F2').setHorizontalAlignment('center');
    
    var row = 4;
    
    // Combine all data
    var allData = [];
    allData = allData.concat(ward2Data);
    allData = allData.concat(ward3Data);
    allData = allData.concat(ecuData);
    
    // PROFESSIONAL HEADERS
    sheet.getRange(row, 1).setValue('EMPLOYEE ID');
    sheet.getRange(row, 2).setValue('DEPT');
    sheet.getRange(row, 3).setValue('ROLE');
    sheet.getRange(row, 4).setValue('STAFF NAME');
    sheet.getRange(row, 5).setValue('SICK (Days)');
    sheet.getRange(row, 6).setValue('SICK (Hours)');
    sheet.getRange(row, 7).setValue('ANNUAL LEAVE (Days)');
    sheet.getRange(row, 8).setValue('ANNUAL LEAVE (Hours)');
    sheet.getRange(row, 9).setValue('HO - HOURS OWED (Hours)');
    sheet.getRange(row, 10).setValue('PB - PAID BACK (Hours)');
    sheet.getRange(row, 11).setValue('TOIL BALANCE (HO - PB)');
    
    sheet.getRange(row, 1, 1, 11).setFontWeight('bold').setBackground('#D9D9D9');
    sheet.getRange(row, 1, 1, 11).setBorder(true, true, true, true, true, true);
    row++;
    
    // Data rows
    for (var i = 0; i < allData.length; i++) {
      var staff = allData[i];
      
      sheet.getRange(row, 1, 1, 11).setValues([[
        staff.employeeId,
        staff.ward,
        staff.role,
        staff.name,
        staff.sickDays,
        staff.sickHours,
        staff.annualLeaveDays,
        staff.annualLeaveHours,
        staff.hoHours, // CORRECTED: HO hours (staff owes)
        staff.pbHours, // CORRECTED: PB hours (staff paid back)
        staff.toilBalance // CORRECTED: HO - PB
      ]]);
      
      // ══════════════════════════════════════════════════════════════════════
      // CORRECTED: Color coding for TOIL balance
      // ══════════════════════════════════════════════════════════════════════
      var balanceCell = sheet.getRange(row, 11);
      if (staff.toilBalance > 0) {
        // Positive balance = Staff STILL OWES hours (sent home paid, didn't pay back) = RED
        balanceCell.setBackground('#FFE6E6').setFontWeight('bold').setFontColor('#C00000');
      } else if (staff.toilBalance < 0) {
        // Negative balance = Staff OVERPAID (worked more PB than HO owed) = YELLOW
        balanceCell.setBackground('#FFF4CC').setFontWeight('bold').setFontColor('#CC6600');
      } else {
        // Zero balance = Fully balanced = GREEN
        balanceCell.setBackground('#E6F4EA').setFontWeight('bold').setFontColor('#008000');
      }
      
      sheet.getRange(row, 1, 1, 11).setBorder(true, true, true, true, true, true);
      row++;
    }
    
    // Add summary section
    row += 2;
    sheet.getRange(row, 1, 1, 12).merge();
    sheet.getRange(row, 1).setValue('📊 SUMMARY TOTALS');
    sheet.getRange(row, 1).setFontWeight('bold').setBackground('#002060').setFontColor('#FFFFFF');
    row++;
    
    // Calculate totals
    var totalSickDays = 0;
    var totalSickHours = 0;
    var totalALDays = 0;
    var totalALHours = 0;
    var totalToilTaken = 0;
    var totalPbWorked = 0;
    var totalToilBalance = 0;
    
    for (var i = 0; i < allData.length; i++) {
      totalSickDays += allData[i].sickDays;
      totalSickHours += allData[i].sickHours;
      totalALDays += allData[i].annualLeaveDays;
      totalALHours += allData[i].annualLeaveHours;
      totalToilTaken += allData[i].hoHours; // CORRECTED: Sum HO hours
      totalPbWorked += allData[i].pbHours; // CORRECTED: Sum PB hours
      totalToilBalance += allData[i].toilBalance; // CORRECTED: Sum balance (HO - PB)
    }
    
    sheet.getRange(row, 1).setValue('TOTALS');
    sheet.getRange(row, 6).setValue(totalSickDays);
    sheet.getRange(row, 7).setValue(totalSickHours);
    sheet.getRange(row, 8).setValue(totalALDays);
    sheet.getRange(row, 9).setValue(totalALHours);
    sheet.getRange(row, 10).setValue(totalToilTaken);
    sheet.getRange(row, 11).setValue(totalPbWorked);
    sheet.getRange(row, 12).setValue(totalToilBalance);
    
    sheet.getRange(row, 1, 1, 12).setFontWeight('bold').setBackground('#FFF2CC');
    sheet.getRange(row, 1, 1, 12).setBorder(true, true, true, true, true, true);
    
    // Color the total balance
    var totalBalanceCell = sheet.getRange(row, 12);
    if (totalToilBalance > 0) {
      totalBalanceCell.setBackground('#FFE6E6').setFontColor('#C00000');
    } else if (totalToilBalance < 0) {
      totalBalanceCell.setBackground('#FFF4CC').setFontColor('#CC6600');
    } else {
      totalBalanceCell.setBackground('#E6F4EA').setFontColor('#008000');
    }
    
    // Add legend
    row += 3;
    sheet.getRange(row, 1, 1, 12).merge();
    sheet.getRange(row, 1).setValue('📋 LEGEND');
    sheet.getRange(row, 1).setFontWeight('bold');
    row++;
    
    sheet.getRange(row, 1, 1, 2).merge();
    sheet.getRange(row, 1).setValue('• Positive TOIL Balance (Red)');
    sheet.getRange(row, 1).setBackground('#FFE6E6').setFontColor('#C00000');
    row++;
    
    sheet.getRange(row, 1, 1, 2).merge();
    sheet.getRange(row, 1).setValue('  → Staff OWES hours (sent home paid, debt not repaid yet)');
    sheet.getRange(row, 1).setFontStyle('italic');
    row++;
    
    sheet.getRange(row, 1, 1, 2).merge();
    sheet.getRange(row, 1).setValue('• Negative TOIL Balance (Yellow)');
    sheet.getRange(row, 1).setBackground('#FFF4CC').setFontColor('#CC6600');
    row++;
    
    sheet.getRange(row, 1, 1, 2).merge();
    sheet.getRange(row, 1).setValue('  → Staff OVERPAID (worked more PB than HO they owed)');
    sheet.getRange(row, 1).setFontStyle('italic');
    row++;
    
    sheet.getRange(row, 1, 1, 2).merge();
    sheet.getRange(row, 1).setValue('• Zero Balance (Green)');
    sheet.getRange(row, 1).setBackground('#E6F4EA').setFontColor('#008000');
    row++;
    
    sheet.getRange(row, 1, 1, 2).merge();
    sheet.getRange(row, 1).setValue('  → Fully balanced (HO taken = PB worked)');
    sheet.getRange(row, 1).setFontStyle('italic');
    
    // Set column widths
    sheet.setColumnWidth(1, 120);  // Employee ID
    sheet.setColumnWidth(2, 100);  // Dept
    sheet.setColumnWidth(3, 80);   // Role
    sheet.setColumnWidth(4, 180);  // Staff Name
    sheet.setColumnWidth(5, 100);  // Sick Days
    sheet.setColumnWidth(6, 110);  // Sick Hours
    sheet.setColumnWidth(7, 140);  // AL Days
    sheet.setColumnWidth(8, 150);  // AL Hours
    sheet.setColumnWidth(9, 180);  // HO - Hours Owed
    sheet.setColumnWidth(10, 170); // PB - Paid Back
    sheet.setColumnWidth(11, 170); // TOIL Balance (HO - PB)
    
    Logger.log('✓ Transparency report sheet created');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 2: ALLOCATION SHEET BUILDER
  // ═══════════════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════════��═══════

  // ========================================
  // BUILD SHIFT COMPLETENESS SUMMARY TABLE
  // ========================================
  function buildShiftCompletenessSummary_(sheet, summaryData) {
    var startCol = 20; // Column T
    var startRow = 1;
    
    // HEADER ROW: "DAILY SHIFT COMPLETENESS SUMMARY" (T1:AC1)
    var titleRange = sheet.getRange(startRow, startCol, 1, 10);
    titleRange.merge();
    titleRange.setValue('DAILY SHIFT COMPLETENESS SUMMARY');
    titleRange.setBackground('#8B0000');
    titleRange.setFontColor('#FFFFFF');
    titleRange.setFontWeight('bold');
    titleRange.setHorizontalAlignment('center');
    titleRange.setVerticalAlignment('middle');
    
    startRow++;
    
    // SUB-HEADER ROW: "DAY" and "NIGHT" labels (T2:AC2)
    sheet.getRange(startRow, startCol).setValue('DATES').setFontWeight('bold').setBackground('#D9D9D9').setHorizontalAlignment('center');
    
    var dayHeader = sheet.getRange(startRow, startCol + 1, 1, 4);
    dayHeader.merge();
    dayHeader.setValue('DAY');
    dayHeader.setFontWeight('bold');
    dayHeader.setBackground('#00B050');
    dayHeader.setFontColor('#000000');
    dayHeader.setHorizontalAlignment('center');
    
    var nightHeader = sheet.getRange(startRow, startCol + 5, 1, 4);
    nightHeader.merge();
    nightHeader.setValue('NIGHT');
    nightHeader.setFontWeight('bold');
    nightHeader.setBackground('#404040');
    nightHeader.setFontColor('#FFFFFF');
    nightHeader.setHorizontalAlignment('center');
    
    sheet.getRange(startRow, startCol + 9).setBackground('#595959');
    
    startRow++;
    
    // COLUMN HEADERS (T3:AC3)
    var headers = ['DATES', 'NC', 'RGNS', 'HCAS', 'DM\'s', 'NC', 'RGNS', 'HCAS', 'DM\'s', ''];
    for (var h = 0; h < headers.length; h++) {
      var cell = sheet.getRange(startRow, startCol + h);
      cell.setValue(headers[h]);
      cell.setFontWeight('bold');
      cell.setBackground('#D9D9D9');
      cell.setHorizontalAlignment('center');
    }
    sheet.getRange(startRow, startCol + 9).setBackground('#595959');
    
    startRow++;
    
    // DATA ROWS: One row per date
    for (var i = 0; i < summaryData.length; i++) {
      var data = summaryData[i];
      var row = startRow + i;
      
      sheet.getRange(row, startCol).setValue(data.date);
      sheet.getRange(row, startCol + 1).setValue(data.dayNICs); // LD NIC count
      sheet.getRange(row, startCol + 2).setValue(data.dayRGNs);
      sheet.getRange(row, startCol + 3).setValue(data.dayHCAs);
      sheet.getRange(row, startCol + 4).setValue(data.dayDMs);
      sheet.getRange(row, startCol + 5).setValue(data.nightNICs); // LN NIC count
      sheet.getRange(row, startCol + 6).setValue(data.nightRGNs);
      sheet.getRange(row, startCol + 7).setValue(data.nightHCAs);
      sheet.getRange(row, startCol + 8).setValue(data.nightDMs);
      sheet.getRange(row, startCol + 9).setBackground('#595959');
    }
    
    // MERGE SPACER COLUMN AC VERTICALLY
    var totalRows = 2 + summaryData.length;
    var spacerRange = sheet.getRange(2, startCol + 9, totalRows - 1, 1);
    spacerRange.merge();
    spacerRange.setBackground('#595959');
    
    // THICK BLACK BORDER AROUND ENTIRE TABLE
    var lastRow = startRow + summaryData.length - 1;
    var tableRange = sheet.getRange(1, startCol, lastRow, 10);
    tableRange.setBorder(true, true, true, true, false, false, '#000000', SpreadsheetApp.BorderStyle.SOLID_THICK);
    
    // SET COLUMN WIDTHS
    sheet.setColumnWidth(startCol, 80);
    sheet.setColumnWidth(startCol + 1, 40);
    sheet.setColumnWidth(startCol + 2, 60);
    sheet.setColumnWidth(startCol + 3, 60);
    sheet.setColumnWidth(startCol + 4, 60);
    sheet.setColumnWidth(startCol + 5, 40);
    sheet.setColumnWidth(startCol + 6, 60);
    sheet.setColumnWidth(startCol + 7, 60);
    sheet.setColumnWidth(startCol + 8, 60);
    sheet.setColumnWidth(startCol + 9, 10);
    
    // ═══════════════════════════════════════════════════════════════
    // CONDITIONAL FORMATTING: Highlight NIC/DM cells if 0 or >1
    // ═══════════════════════════════════════════════════════════════
    // Ranges: U2:U100 (DAY NIC), X2:X100 (DAY DMs), Y2:Y100 (NIGHT NIC), AB2:AB100 (NIGHT DMs)
    // Formula: =AND(ISNUMBER(U2), OR(U2=0, U2>1))
    // Format: Light red background with dark red font
    
    var alertRanges = [
      { notation: 'U2:U100', startRow: 2 },   // DAY NIC
      { notation: 'X2:X100', startRow: 2 },   // DAY DMs
      { notation: 'Y2:Y100', startRow: 2 },   // NIGHT NIC
      { notation: 'AB2:AB100', startRow: 2 }  // NIGHT DMs
    ];
    
    var existingRules = sheet.getConditionalFormatRules();
    
    for (var r = 0; r < alertRanges.length; r++) {
      var rangeInfo = alertRanges[r];
      var range = sheet.getRange(rangeInfo.notation);
      var firstCell = rangeInfo.notation.split(':')[0];
      
      // Create custom formula rule
      // Formula checks if: cell is a number AND (cell = 0 OR cell > 1)
      var formula = '=AND(ISNUMBER(' + firstCell + '), OR(' + firstCell + '=0, ' + firstCell + '>1))';
      
      var rule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(formula)
        .setBackground('#F4CCCC') // Light red
        .setFontColor('#CC0000')  // Dark red
        .setRanges([range])
        .build();
      
      existingRules.push(rule);
    }
    
    sheet.setConditionalFormatRules(existingRules);
  }

  // ========================================
  // HELPER: SANITIZE SHEET NAME
  // ========================================
  function sanitizeSheetName_(dateLabel) {
    // Google Sheets sheet names have restrictions:
    // - Max 100 characters
    // - Cannot contain: : \ / ? * [ ]
    // - Cannot be empty
    var sanitized = dateLabel.toString()
      .replace(/[:\\\/\?\*\[\]]/g, '-')  // Replace invalid chars with dash
      .substring(0, 31);  // Limit to 31 chars (Google Sheets limit)
    
    return sanitized || 'ALLOCATION';
  }

// ========================================
// HELPER: PROMPT USER FOR DATE SELECTION (HTML CALENDAR PICKER)
// ========================================
function promptDateSelection_(ui, allDateCols) {
  // Create HTML calendar picker
  var html = HtmlService.createHtmlOutputFromFile('allocation-date-picker')
    .setWidth(600)
    .setHeight(700)
    .setTitle('Allocation Date Selection');
  
  // Show as modal dialog
  SpreadsheetApp.getUi().showModalDialog(html, 'Select Dates');
  
  // Store dates in script properties for the HTML to access
  var props = PropertiesService.getScriptProperties();
  props.setProperty('ALLOCATION_DATES', JSON.stringify(allDateCols));
  
  // The HTML dialog will call processDateSelection when user confirms
  return null; // Return is handled by processDateSelection callback
}

// ========================================
// CALLBACK: PROCESS DATE SELECTION FROM HTML PICKER
// ========================================
function processDateSelection(selectedDates) {
  var ui = SpreadsheetApp.getUi();
  
  try {
    Logger.log('✓ User selected ' + selectedDates.length + ' date(s)');
    
    // Get the spreadsheet context
    var outputFile = SpreadsheetApp.getActiveSpreadsheet();
    var sourceFile = SpreadsheetApp.openById(FINANCIALS_SOURCE_FILE_ID);
    
    // Get CLEANED sheet
    var cleanedSheet = findSheetByName(sourceFile, 'CLEANED');
    if (!cleanedSheet) {
      ui.alert('Error', 'CLEANED sheet not found in source file', ui.ButtonSet.OK);
      return;
    }
    
    // Continue with allocation generation
    generateAllocationsForDates(outputFile, sourceFile, cleanedSheet, selectedDates);
    
  } catch (e) {
    Logger.log('Error in processDateSelection: ' + e.toString());
    ui.alert('Error', 'Failed to process date selection: ' + e.toString(), ui.ButtonSet.OK);
  }
}

// ========================================
// HELPER: GET DATES FOR HTML PICKER
// ========================================
function getAllocationDates() {
  var props = PropertiesService.getScriptProperties();
  var datesJson = props.getProperty('ALLOCATION_DATES');
  return JSON.parse(datesJson);
}

// ========================================
// MAIN FUNCTION: BUILD ALLOCATION
// ========================================
function buildAllocationSheet() {
  var ui = SpreadsheetApp.getUi();
  try {
    // Open the SOURCE file to read ward data
    var sourceFile = SpreadsheetApp.openById(FINANCIALS_SOURCE_FILE_ID);

      // ═══════════════════════════════════════════════════════════════
      // NEW PATTERN: Read from CLEANED sheet instead of individual ward sheets
      // ═══════════════════════════════════════════════════════════════
      var cleanedSheet = findSheetByName(sourceFile, 'CLEANED');
      
      if (!cleanedSheet) {
        throw new Error('CLEANED sheet not found in source file. Please ensure the source file has a CLEANED sheet.');
      }
      
      Logger.log('✓ Using CLEANED sheet for allocation data');
      
      var dutyManagers = sourceFile.getSheetByName('Duty Managers');
      
      if (!dutyManagers) {
        Logger.log('Warning: "Duty Managers" sheet not found - duty managers will not be included');
      }

      // ═══════════════════════════════════════════════════════════════
      // DATE SELECTION PROMPT
      // ═══════════════════════════════════════════════════════════════
      
      // Get all available dates from CLEANED sheet
      var allDateCols = getDateColumnsFromCleaned_(cleanedSheet);
      if (allDateCols.length === 0) {
        throw new Error('No date headers found in CLEANED sheet (Column E onwards).');
      }
      
      Logger.log('✓ Found ' + allDateCols.length + ' date columns in CLEANED sheet');
      
      // Prompt user for date selection (shows HTML dialog)
      // The dialog will call processDateSelection() when user confirms
      promptDateSelection_(ui, allDateCols);
      
      // NOTE: Execution continues in processDateSelection() callback
      
    } catch (e) {
      Logger.log('Error in buildAllocationSheet: ' + e.toString());
      ui.alert('Error', 'Failed to build allocation sheet: ' + e.toString(), ui.ButtonSet.OK);
    }
  }

// ========================================
// HELPER: GENERATE ALLOCATIONS FOR SELECTED DATES
// ========================================
function generateAllocationsForDates(outputFile, sourceFile, cleanedSheet, selectedDates) {
  var ui = SpreadsheetApp.getUi();
  try {
    Logger.log('✓ Generating allocations for ' + selectedDates.length + ' date(s)');
    
    var dutyManagers = sourceFile.getSheetByName('Duty Managers');
    if (!dutyManagers) {
      Logger.log('Warning: "Duty Managers" sheet not found - duty managers will not be included');
    }

    // ═══════════════════════════════════════════════════════════════
    // GENERATE ALLOCATION SHEETS (ONE PER DATE)
    // ═══════════════════════════════════════════════════════════════
    
    var sheetsCreated = [];
      
      var dayAllowed = setAlloc_(['LD', 'LD NIC', 'E', 'L', 'L NIC']);
      var nightAllowed = setAlloc_(['LN', 'LN NIC', 'LN PB']);

      var wardBlocks = [
        { name: 'WARD 2', cleanedSheet: cleanedSheet, startCol: 1 },   // Columns A-E (1-5)
        { name: 'WARD 3', cleanedSheet: cleanedSheet, startCol: 7 },   // Columns G-K (7-11)
        { name: 'ECU',    cleanedSheet: cleanedSheet,   startCol: 13 }   // Columns M-Q (13-17)
      ];

      // Loop through each selected date and create a separate sheet
      for (var dateIdx = 0; dateIdx < selectedDates.length; dateIdx++) {
        var currentDateCol = selectedDates[dateIdx];
        Logger.log('📅 Generating allocation sheet for: ' + currentDateCol.label);
        
        // Create sheet name from date (sanitize for sheet name requirements)
        var sheetName = 'ALLOC_' + sanitizeSheetName_(currentDateCol.label);
        
        // Delete existing sheet if it exists
        var existingSheet = outputFile.getSheetByName(sheetName);
        if (existingSheet) {
          outputFile.deleteSheet(existingSheet);
        }
        
        var out = outputFile.insertSheet(sheetName);
        sheetsCreated.push(sheetName);
      
      // ═══════════════════════════════════════════════════════════════
      // CLEAN SLATE: Fill entire sheet with white background and borders
      // ═══════════════════════════════════════════════════════════════
      var maxRows = 1000; // Clean first 1000 rows
      var maxCols = 20;   // Clean first 20 columns
      var entireSheet = out.getRange(1, 1, maxRows, maxCols);
      entireSheet.setBackground('#FFFFFF');  // White background
      entireSheet.setBorder(false, false, false, false, false, false); // Remove all borders
      
      // ═══════════════════════════════════════════════════════════════
      // SET DEFAULT COLUMN WIDTHS
      // ═══════════════════════════════════════════════════════════════
      // Ward name columns (A, G, M) = 200 pixels
      out.setColumnWidth(1, 200);   // A - Ward 2 STAFFNAME
      out.setColumnWidth(7, 200);   // G - Ward 3 STAFFNAME
      out.setColumnWidth(13, 200);  // M - ECU STAFFNAME
      
      // Data columns (BCDE, HIJK, NOPQ) = 150 pixels
      out.setColumnWidth(2, 80);   // B - Ward 2 SHIFT
      out.setColumnWidth(3, 80);   // C - Ward 2 HRS
      out.setColumnWidth(4, 80);   // D - Ward 2 LABELS
      out.setColumnWidth(5, 80);   // E - Ward 2 VALUES
      
      out.setColumnWidth(8, 80);   // H - Ward 3 SHIFT
      out.setColumnWidth(9, 80);   // I - Ward 3 HRS
      out.setColumnWidth(10, 80);  // J - Ward 3 LABELS
      out.setColumnWidth(11, 80);  // K - Ward 3 VALUES
      
      out.setColumnWidth(14, 80);  // N - ECU SHIFT
      out.setColumnWidth(15, 80);  // O - ECU HRS
      out.setColumnWidth(16, 80);  // P - ECU LABELS
      out.setColumnWidth(17, 80);  // Q - ECU VALUES
      
      // Separator columns (F, L, R) = 10 pixels (thin)
      out.setColumnWidth(6, 10);    // F - SEPARATOR
      out.setColumnWidth(12, 10);   // L - SEPARATOR
      out.setColumnWidth(18, 10);   // R - SEPARATOR
      
      // ═══════════════════════════════════════════════════════════════
      // SET DEFAULT ROW HEIGHT & FONT
      // ═══════════════════════════════════════════════════════════════
      // Set all rows to height 21 (approximately 12pt font with padding)
      for (var r = 1; r <= maxRows; r++) {
        out.setRowHeight(r, 21);
      }
      
      // Set default font for entire sheet
      entireSheet.setFontFamily('Aptos Display');
      entireSheet.setFontSize(10);
      entireSheet.setVerticalAlignment('middle');
      entireSheet.setHorizontalAlignment('center');

      // ═══════════════════════════════════════════════════════════════
      // PROCESS THE SINGLE DATE FOR THIS SHEET
      // ═══════════════════════════════════════════════════════════════
      var dateCols = [currentDateCol]; // Single date for this sheet
      var startRow = 1;
      var summaryData = [];

      for (var i = 0; i < dateCols.length; i++) {
        var dc = dateCols[i];
        
        // ═══════════════════════════════════════════════════════════════
        // ROW 1: MERGED DARK GRAY BAR WITH DATE (A1:R1)
        // ═══════════════════════════════════════════════════════════════
        var dateHeaderRange = out.getRange(startRow, 1, 1, 18); // A to R (columns 1-18)
        dateHeaderRange.merge();
        var dateLabelEscaped = dc.label.toString().replace(/"/g, '""');
        dateHeaderRange.setFormula('=UPPER("' + dateLabelEscaped + '")');
        dateHeaderRange.setBackground('#595959'); // Dark gray
        dateHeaderRange.setFontColor('#FFFFFF'); // White text
        dateHeaderRange.setFontWeight('bold');
        dateHeaderRange.setHorizontalAlignment('center');
        dateHeaderRange.setVerticalAlignment('middle');
        
        startRow++; // Move to next row for ward blocks

        var previews = [];
        var maxDayRows = 3;
        var maxNightRows = 2;
        var maxRedeployRows = 0;
        var maxDutyManagerRows = 0;

        for (var w = 0; w < wardBlocks.length; w++) {
          // Only pass dutyManagers sheet to the FIRST ward (Ward 2) to avoid counting the standalone DM multiple times
          var dmSheet = (w === 0) ? dutyManagers : null;
          
          Logger.log('📊 Processing ward ' + w + ' (' + wardBlocks[w].name + '), dutyManagersSheet: ' + (dmSheet ? 'PROVIDED' : 'NULL'));
          
          var preview = collectDayNightEntriesFromCleaned_(
            wardBlocks[w].cleanedSheet,
            wardBlocks[w].name,
            dc.colIndex,
            dayAllowed,
            nightAllowed,
            dmSheet
          );
          previews.push(preview);
          maxDayRows = Math.max(maxDayRows, preview.dayEntries.length);
          maxNightRows = Math.max(maxNightRows, preview.nightEntries.length);
          maxRedeployRows = Math.max(maxRedeployRows, preview.redeploymentEntries.length);
          maxDutyManagerRows = Math.max(maxDutyManagerRows, preview.dutyManagerEntries.length);
          
          Logger.log('📊 Ward ' + wardBlocks[w].name + ' - Duty Managers found: ' + preview.dutyManagerEntries.length);
        }

        var blockHeight = calcBlockHeightAlloc_(maxDayRows, maxNightRows, maxDutyManagerRows, maxRedeployRows);
        var blockStartRow = startRow; // Remember where this day block starts

        for (var ww = 0; ww < wardBlocks.length; ww++) {
          renderWardBlockAlloc_(
            out,
            wardBlocks[ww].name,
            wardBlocks[ww].startCol,
            startRow,
            dc.label,
            previews[ww].dayEntries,
            previews[ww].nightEntries,
            previews[ww].dutyManagerEntries,
            previews[ww].redeploymentEntries,
            maxDayRows,
            maxNightRows,
            maxDutyManagerRows,
            maxRedeployRows
          );
        }
        
        // ═══════════════════════════════════════════════════════════════
        // THICK BLACK BORDER AROUND ENTIRE DAY BLOCK (A to R)
        // ═══════════════════════════════════════════════════════════════
        var blockEndRow = startRow + blockHeight - 1;
        var entireBlock = out.getRange(blockStartRow, 1, blockEndRow - blockStartRow + 1, 18);
        entireBlock.setBorder(
          true, true, true, true, // top, left, bottom, right
          false, false,            // vertical, horizontal (no internal borders)
          '#000000',               // color
          SpreadsheetApp.BorderStyle.SOLID_THICK
        );
        
        // ═══════════════════════════════════════════════════════════════
        // SPACER COLUMNS (F, L, R) - MERGE VERTICALLY & FILL DARK GRAY
        // ═══════════════════════════════════════════════════════════════
        // Column F (column 6) - between Ward 2 and Ward 3
        var spacerF = out.getRange(blockStartRow, 6, blockEndRow - blockStartRow + 1, 1);
        spacerF.merge();
        spacerF.setBackground('#595959'); // Dark gray
        
        // Column L (column 12) - between Ward 3 and ECU
        var spacerL = out.getRange(blockStartRow, 12, blockEndRow - blockStartRow + 1, 1);
        spacerL.merge();
        spacerL.setBackground('#595959'); // Dark gray
        
        // Column R (column 18) - after ECU
        var spacerR = out.getRange(blockStartRow, 18, blockEndRow - blockStartRow + 1, 1);
        spacerR.merge();
        spacerR.setBackground('#595959'); // Dark gray
        
        // ═══════════════════════════════════════════════════════════════
        // COLLECT SUMMARY TOTALS FOR THIS DATE (across all 3 wards)
        // ═══════════════════════════════════════════════════════════════
        var totalDayRGNs = 0;
        var totalDayHCAs = 0;
        var totalDayDMs = 0;
        var totalDayNICs = 0; // LD NIC - Nurse In Charge (DAY)
        var totalNightRGNs = 0;
        var totalNightHCAs = 0;
        var totalNightDMs = 0;
        var totalNightNICs = 0; // LN NIC - Nurse In Charge (NIGHT)
        
        for (var p = 0; p < previews.length; p++) {
          totalDayRGNs += countRoleAlloc_(previews[p].dayEntries, 'RGN');
          totalDayHCAs += countRoleAlloc_(previews[p].dayEntries, 'HCA');
          totalNightRGNs += countRoleAlloc_(previews[p].nightEntries, 'RGN');
          totalNightHCAs += countRoleAlloc_(previews[p].nightEntries, 'HCA');
          totalDayDMs += previews[p].dutyManagerEntries.filter(function(dm) { return dm.type === 'DAY'; }).length;
          totalNightDMs += previews[p].dutyManagerEntries.filter(function(dm) { return dm.type === 'NIGHT'; }).length;
          
          // Count NICs (Nurse In Charge) - counted separately from RGNs
          totalDayNICs += countRoleAlloc_(previews[p].dayEntries, 'NIC');
          totalNightNICs += countRoleAlloc_(previews[p].nightEntries, 'NIC');
        }
        
        summaryData.push({
          date: dc.label,
          dayNICs: totalDayNICs,
          dayRGNs: totalDayRGNs,
          dayHCAs: totalDayHCAs,
          dayDMs: totalDayDMs,
          nightNICs: totalNightNICs,
          nightRGNs: totalNightRGNs,
          nightHCAs: totalNightHCAs,
          nightDMs: totalNightDMs
        });

        startRow += blockHeight + 1; // Add 1 row gap between day blocks
      }
      
      // ═════════════════════════════════���═════════════════════════════
      // BUILD DAILY SHIFT COMPLETENESS SUMMARY TABLE (Columns T-AC)
      // ═══════════════════════════��═══════════════════════════════════
      buildShiftCompletenessSummary_(out, summaryData);


      

      
      Logger.log('✓ Created sheet: ' + sheetName);
    } // End of dateIdx loop
      
    var successMessage = 'Allocation sheets generated successfully!\n\n' +
      'Source: ' + sourceFile.getName() + '\n' +
      'Output: ' + outputFile.getName() + '\n\n' +
      'Created ' + sheetsCreated.length + ' sheet(s):\n';
    
    for (var i = 0; i < Math.min(sheetsCreated.length, 10); i++) {
      successMessage += '• ' + sheetsCreated[i] + '\n';
    }
    
    if (sheetsCreated.length > 10) {
      successMessage += '... and ' + (sheetsCreated.length - 10) + ' more';
    }
    
    ui.alert('Success!', successMessage, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Error', 'Error creating ALLOCATION:\\n\\n' + err.message, ui.ButtonSet.OK);
    Logger.log('Allocation Error: ' + err.message);
    Logger.log('Stack: ' + err.stack);
    throw err;
  }
  }

  // ========================================
  // DATA COLLECTION (ALLOCATION)
  // ========================================
  function collectDayNightEntriesAlloc_(wardName, wardSheet, colIndex, dayAllowed, nightAllowed, dutyManagersSheet) {
    var cfg = wardConfigAlloc_(wardName);

    var dayEntries = [];
    var nightEntries = [];
    var redeploymentEntries = [];
    var dutyManagerEntries = [];

    // ═══════════════════════════════════════════════════════════════
    // HANDLE ECU'S MULTIPLE NURSE GROUPS
    // ═══════════════════════════════════════════════════════════════
    var nurseNames = [];
    var nurseShifts = [];
    
    if (cfg.nurseGroups) {
      // ECU has 3 separate nurse groups
      for (var g = 0; g < cfg.nurseGroups.length; g++) {
        var group = cfg.nurseGroups[g];
        var groupNames = wardSheet.getRange(group.rowStart, 2, group.rowCount, 1).getValues();
        var groupShifts = wardSheet.getRange(group.rowStart, colIndex, group.rowCount, 1).getValues();
        
        // Append to main arrays
        for (var r = 0; r < group.rowCount; r++) {
          nurseNames.push(groupNames[r]);
          nurseShifts.push(groupShifts[r]);
        }
      }
    } else {
      // Ward 2 & Ward 3 have single contiguous nurse range
      nurseNames = wardSheet.getRange(cfg.nurseRowStart, 2, cfg.nurseRowCount, 1).getValues();
      nurseShifts = wardSheet.getRange(cfg.nurseRowStart, colIndex, cfg.nurseRowCount, 1).getValues();
    }

    // Read HCAs (ECU has none, so hcaRowCount will be 0)
    var hcaNames = [];
    var hcaShifts = [];
    if (cfg.hcaRowCount > 0) {
      hcaNames = wardSheet.getRange(cfg.hcaRowStart, 2, cfg.hcaRowCount, 1).getValues();
      hcaShifts = wardSheet.getRange(cfg.hcaRowStart, colIndex, cfg.hcaRowCount, 1).getValues();
    }
    
    // Collect the dedicated Duty Manager from the "Duty Managers" sheet
    // This is ONE person (A7:AC7) who is NOT part of any ward
    if (dutyManagersSheet) {
      try {
        Logger.log('🔵 DUTY MANAGERS CHECK - Ward: ' + wardName + ', ColIndex: ' + colIndex);
        
        // Verify the sheet has enough rows
        var lastRow = dutyManagersSheet.getLastRow();
        Logger.log('🔵 Duty Managers sheet last row: ' + lastRow);
        
        if (lastRow < 7) {
          Logger.log('⚠️ Duty Managers sheet does not have row 7 (lastRow: ' + lastRow + ')');
        } else {
          // Get the duty manager name from cell B7 (NOT A7)
          var dmNameCell = dutyManagersSheet.getRange(7, 2).getValue(); // Column B
          var dmName = dmNameCell ? dmNameCell.toString().trim() : '';
          Logger.log('🔵 DM Name from A7: "' + dmName + '"');
          
          if (dmName) {
            // Verify the column exists
            var lastCol = dutyManagersSheet.getLastColumn();
            Logger.log('🔵 Duty Managers sheet last column: ' + lastCol + ', trying to access column: ' + colIndex);
            
            if (colIndex > lastCol) {
              Logger.log('⚠️ Column ' + colIndex + ' does not exist in Duty Managers sheet (lastCol: ' + lastCol + ')');
            } else {
              // Get the shift code for this specific date column (row 7)
              var dmShiftCell = dutyManagersSheet.getRange(7, colIndex).getValue();
              Logger.log('🔵 DM Shift from row 7, col ' + colIndex + ': "' + dmShiftCell + '"');
              
              if (dmShiftCell) {
                var dmCode = normalizeShiftCodeAlloc_(dmShiftCell);
                Logger.log('🔵 Normalized DM code: "' + dmCode + '"');
                
                // Skip non-working shifts
                if (!isNonWorkingShiftAlloc_(dmCode)) {
                  // DMs have LD DM (day) or LN DM (night)
                  if (dmCode === 'LD DM') {
                    Logger.log('✅ ADDING DUTY MANAGER (DAY): ' + dmName);
                    dutyManagerEntries.push({ staff: dmName, shift: dmCode, hrs: 12.5, type: 'DAY' });
                  } else if (dmCode === 'LN DM') {
                    Logger.log('✅ ADDING DUTY MANAGER (NIGHT): ' + dmName);
                    dutyManagerEntries.push({ staff: dmName, shift: dmCode, hrs: 12.5, type: 'NIGHT' });
                  } else {
                    Logger.log('⚠️ DM code "' + dmCode + '" is not LD DM or LN DM, skipping');
                  }
                } else {
                  Logger.log('⚠️ DM code "' + dmCode + '" is non-working shift, skipping');
                }
              } else {
                Logger.log('⚠️ No shift code in row 7, col ' + colIndex);
              }
            }
          } else {
            Logger.log('⚠️ No DM name in cell A7');
          }
        }
      } catch (dmError) {
        Logger.log('❌ ERROR reading Duty Managers data: ' + dmError.message);
        Logger.log('❌ Stack: ' + dmError.stack);
      }
    } else {
      Logger.log('⚠️ dutyManagersSheet is null/undefined for ward: ' + wardName);
    }

    for (var i = 0; i < nurseNames.length; i++) {
      var name = (nurseNames[i][0] || '').toString().trim();
      if (!name) continue;

      var raw = nurseShifts[i][0];
      if (!raw) continue;

      var code = normalizeShiftCodeAlloc_(raw);
      
      // CRITICAL: Skip non-working shifts (TOIL, leave, etc.)
      if (isNonWorkingShiftAlloc_(code)) continue;
      
      // Check if this nurse is working as a Duty Manager
      if (code === 'LD DM') {
        dutyManagerEntries.push({ staff: name, shift: code, hrs: 12.5, type: 'DAY' });
        continue; // Don't count them as regular ward staff
      } else if (code === 'LN DM') {
        dutyManagerEntries.push({ staff: name, shift: code, hrs: 12.5, type: 'NIGHT' });
        continue; // Don't count them as regular ward staff
      }
      
      // CRITICAL: Check if this nurse is working as a NIC (Nurse In Charge)
      // NICs are counted SEPARATELY from regular RGNs (not double-counted)
      if (code === 'LD NIC') {
        dayEntries.push({ staff: name, role: 'NIC', shift: code, hrs: hoursForAlloc_(code) });
        continue; // Don't count them as regular RGN
      } else if (code === 'LN NIC') {
        nightEntries.push({ staff: name, role: 'NIC', shift: code, hrs: hoursForAlloc_(code) });
        continue; // Don't count them as regular RGN
      }
      
      // Check if this is a redeployment (e.g., "LD W3", "LD BCU", "PBCU")
      if (isRedeploymentAlloc_(code)) {
        var baseType = code.split(' ')[0];
        var hrs = hoursForAlloc_(baseType);
        redeploymentEntries.push({ staff: name, role: 'RGN', shift: code, hrs: hrs });
      } else if (dayAllowed[code]) {
        dayEntries.push({ staff: name, role: 'RGN', shift: code, hrs: hoursForAlloc_(code) });
      } else if (nightAllowed[code]) {
        nightEntries.push({ staff: name, role: 'RGN', shift: code, hrs: hoursForAlloc_(code) });
      }
    }

    for (var j = 0; j < hcaNames.length; j++) {
      var hName = (hcaNames[j][0] || '').toString().trim();
      if (!hName) continue;

      var hRaw = hcaShifts[j][0];
      if (!hRaw) continue;

      var hCode = normalizeShiftCodeAlloc_(hRaw);
      
      // CRITICAL: Skip non-working shifts (TOIL, leave, etc.)
      if (isNonWorkingShiftAlloc_(hCode)) continue;
      
      // Check if this HCA is working as a Duty Manager
      if (hCode === 'LD DM') {
        dutyManagerEntries.push({ staff: hName, shift: hCode, hrs: 12.5, type: 'DAY' });
        continue; // Don't count them as regular ward staff
      } else if (hCode === 'LN DM') {
        dutyManagerEntries.push({ staff: hName, shift: hCode, hrs: 12.5, type: 'NIGHT' });
        continue; // Don't count them as regular ward staff
      }
      
      // Check if this is a redeployment
      if (isRedeploymentAlloc_(hCode)) {
        var baseType = hCode.split(' ')[0];
        var hrs = hoursForAlloc_(baseType);
        redeploymentEntries.push({ staff: hName, role: 'HCA', shift: hCode, hrs: hrs });
      } else if (dayAllowed[hCode]) {
        dayEntries.push({ staff: hName, role: 'HCA', shift: hCode, hrs: hoursForAlloc_(hCode) });
      } else if (nightAllowed[hCode]) {
        nightEntries.push({ staff: hName, role: 'HCA', shift: hCode, hrs: hoursForAlloc_(hCode) });
      }
    }

    return { dayEntries: dayEntries, nightEntries: nightEntries, redeploymentEntries: redeploymentEntries, dutyManagerEntries: dutyManagerEntries };
  }

  function wardConfigAlloc_(wardName) {
    // UPDATED RANGES FOR NEW SOURCE FILE STRUCTURE
    // Date headers: C3:AD3 for all wards
    // Names in Column B, Grid starts at Column C
    
    if (wardName === 'WARD 2' || wardName === 'Ward 2') {
      return { 
        nurseRowStart: 4, 
        nurseRowCount: 14,  // B4:B17 = 14 rows
        hcaRowStart: 20, 
        hcaRowCount: 3,     // B20:B22 = 3 rows
        nameCol: 2,         // Column B
        gridStartCol: 3     // Column C
      };
    }
    if (wardName === 'WARD 3' || wardName === 'Ward 3') {
      return { 
        nurseRowStart: 4, 
        nurseRowCount: 18,  // B4:B21 = 18 rows
        hcaRowStart: 22,    // B22:B24 = 3 rows  
        hcaRowCount: 3, 
        nameCol: 2,         // Column B
        gridStartCol: 3     // Column C
      };
    }
    // ECU has 3 groups of nurses, NO HCAs
    if (wardName === 'ECU') {
      return {
        nurseGroups: [
          { rowStart: 4, rowCount: 5 },   // B4:B8 = 5 rows, Grid C4:AD8
          { rowStart: 11, rowCount: 6 },  // B11:B16 = 6 rows, Grid C11:AD16
          { rowStart: 41, rowCount: 8 }   // B41:B48 = 8 rows, Grid C41:AD48
        ],
        hcaRowStart: 0,
        hcaRowCount: 0,     // NO HCAs in ECU
        nameCol: 2,         // Column B
        gridStartCol: 3     // Column C
      };
    }
    // Default fallback
    return { 
      nurseRowStart: 4, 
      nurseRowCount: 5, 
      hcaRowStart: 11, 
      hcaRowCount: 5,
      nameCol: 2,
      gridStartCol: 3
    };
  }

  // ========================================
  // DATE HEADER DISCOVERY (ALLOCATION)
  // ========================================
  function getDateColumnsAlloc_(sheet, headerRow, colStart) {
    var lastCol = sheet.getLastColumn();
    if (lastCol < colStart) return [];

    var values = sheet.getRange(headerRow, colStart, 1, lastCol - colStart + 1).getValues()[0];
    var cols = [];

    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (!v) continue;
      
      // CRITICAL: Only accept actual Date objects, skip text values like "Emp_ID"
      if (!(v instanceof Date)) {
        Logger.log('⚠️ Skipping non-date value in row ' + headerRow + ', col ' + (colStart + i) + ': "' + v + '"');
        continue;
      }
      
      cols.push({
        colIndex: colStart + i,
        label: formatDateHeaderValueAlloc_(v)
      });
    }
    return cols;
  }

  function formatDateHeaderValueAlloc_(v) {
    if (v instanceof Date) {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd-MMM');
    }
    return v.toString();
  }

  // ========================================
  // GET DATE COLUMNS FROM CLEANED SHEET
  // ========================================
  function getDateColumnsFromCleaned_(cleanedSheet) {
    // In CLEANED sheet: Column A=Employee ID, B=Dept, C=Role, D=NAME, E onwards=dates
    // So dates start at column index 5 (E)
    var lastCol = cleanedSheet.getLastColumn();
    var headerRow = 1;
    var dateStartCol = 5; // Column E
    
    var values = cleanedSheet.getRange(headerRow, dateStartCol, 1, lastCol - dateStartCol + 1).getValues()[0];
    var cols = [];

    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (!v) continue;
      
      // CRITICAL: Only accept actual Date objects
      if (!(v instanceof Date)) {
        Logger.log('⚠️ Skipping non-date value in CLEANED header row 1, col ' + (dateStartCol + i) + ': "' + v + '"');
        continue;
      }
      
      cols.push({
        colIndex: dateStartCol + i, // Actual column index in sheet (1-based)
        label: formatDateHeaderValueAlloc_(v)
      });
    }
    
    Logger.log('✓ Found ' + cols.length + ' date columns in CLEANED sheet');
    return cols;
  }

  // ========================================
  // COLLECT DAY/NIGHT ENTRIES FROM CLEANED SHEET
  // ========================================
  function collectDayNightEntriesFromCleaned_(cleanedSheet, wardFilter, colIndex, dayAllowed, nightAllowed, dutyManagersSheet) {
    var dayEntries = [];
    var nightEntries = [];
    var redeploymentEntries = [];
    var dutyManagerEntries = [];
    
    // Read all data from CLEANED sheet
    var lastRow = cleanedSheet.getLastRow();
    var allData = cleanedSheet.getRange(1, 1, lastRow, colIndex).getValues();
    
    // Collect dedicated Duty Manager from "Duty Managers" sheet
    if (dutyManagersSheet) {
      try {
        Logger.log('🔵 DUTY MANAGERS CHECK - Ward: ' + wardFilter + ', ColIndex: ' + colIndex);
        
        var lastDMRow = dutyManagersSheet.getLastRow();
        Logger.log('🔵 Duty Managers sheet last row: ' + lastDMRow);
        
        if (lastDMRow < 7) {
          Logger.log('⚠️ Duty Managers sheet does not have row 7 (lastRow: ' + lastDMRow + ')');
        } else {
          var dmNameCell = dutyManagersSheet.getRange(7, 2).getValue(); // Column B
          var dmName = dmNameCell ? dmNameCell.toString().trim() : '';
          Logger.log('🔵 DM Name from A7: "' + dmName + '"');
          
          if (dmName) {
            var lastDMCol = dutyManagersSheet.getLastColumn();
            Logger.log('🔵 Duty Managers sheet last column: ' + lastDMCol + ', trying to access column: ' + colIndex);
            
            if (colIndex > lastDMCol) {
              Logger.log('⚠️ Column ' + colIndex + ' does not exist in Duty Managers sheet (lastCol: ' + lastDMCol + ')');
            } else {
              var dmShiftCell = dutyManagersSheet.getRange(7, colIndex).getValue();
              Logger.log('🔵 DM Shift from row 7, col ' + colIndex + ': "' + dmShiftCell + '"');
              
              if (dmShiftCell) {
                var dmCode = normalizeShiftCodeAlloc_(dmShiftCell);
                Logger.log('🔵 Normalized DM code: "' + dmCode + '"');
                
                if (!isNonWorkingShiftAlloc_(dmCode)) {
                  if (dmCode === 'LD DM') {
                    Logger.log('✅ ADDING DUTY MANAGER (DAY): ' + dmName);
                    dutyManagerEntries.push({ staff: dmName, shift: dmCode, hrs: 12.5, type: 'DAY' });
                  } else if (dmCode === 'LN DM') {
                    Logger.log('✅ ADDING DUTY MANAGER (NIGHT): ' + dmName);
                    dutyManagerEntries.push({ staff: dmName, shift: dmCode, hrs: 12.5, type: 'NIGHT' });
                  } else {
                    Logger.log('⚠️ DM code "' + dmCode + '" is not LD DM or LN DM, skipping');
                  }
                } else {
                  Logger.log('⚠️ DM code "' + dmCode + '" is non-working shift, skipping');
                }
              }
            }
          }
        }
      } catch (dmError) {
        Logger.log('❌ ERROR reading Duty Managers data: ' + dmError.message);
      }
    }
    
    // Process staff from CLEANED sheet
    // Row 1 = headers, Row 2+ = data
    // Column A=Employee ID, B=Dept, C=Role, D=NAME, E onwards=shift data
    for (var row = 1; row < allData.length; row++) {
      var rowData = allData[row];
      var dept = rowData[1] ? rowData[1].toString().trim().toUpperCase() : ''; // Column B
      
      // Filter by ward
      if (!wardNamesMatch(dept, wardFilter)) continue;
      
      var name = rowData[3] ? rowData[3].toString().trim() : ''; // Column D
      if (!name) continue;
      
      var roleColumn = rowData[2] ? rowData[2].toString().trim().toUpperCase() : ''; // Column C
      var isHCA = roleColumn.indexOf('HCA') >= 0 || roleColumn.indexOf('HEALTH CARE') >= 0;
      var role = isHCA ? 'HCA' : 'RGN';
      
      var shiftCell = rowData[colIndex - 1]; // colIndex is 1-based, array is 0-based
      if (!shiftCell) continue;
      
      var code = normalizeShiftCodeAlloc_(shiftCell);
      
      // Skip non-working shifts
      if (isNonWorkingShiftAlloc_(code)) continue;
      
      // Check if working as Duty Manager
      if (code === 'LD DM') {
        dutyManagerEntries.push({ staff: name, shift: code, hrs: 12.5, type: 'DAY' });
        continue;
      } else if (code === 'LN DM') {
        dutyManagerEntries.push({ staff: name, shift: code, hrs: 12.5, type: 'NIGHT' });
        continue;
      }
      
      // Check if working as NIC (Nurse In Charge)
      if (code === 'LD NIC') {
        dayEntries.push({ staff: name, role: 'NIC', shift: code, hrs: hoursForAlloc_(code) });
        continue;
      } else if (code === 'LN NIC') {
        nightEntries.push({ staff: name, role: 'NIC', shift: code, hrs: hoursForAlloc_(code) });
        continue;
      }
      
      // Check if redeployment
      if (isRedeploymentAlloc_(code)) {
        var baseType = code.split(' ')[0];
        var hrs = hoursForAlloc_(baseType);
        redeploymentEntries.push({ staff: name, role: role, shift: code, hrs: hrs });
      } else if (dayAllowed[code]) {
        dayEntries.push({ staff: name, role: role, shift: code, hrs: hoursForAlloc_(code) });
      } else if (nightAllowed[code]) {
        nightEntries.push({ staff: name, role: role, shift: code, hrs: hoursForAlloc_(code) });
      }
    }
    
    return { 
      dayEntries: dayEntries, 
      nightEntries: nightEntries, 
      redeploymentEntries: redeploymentEntries, 
      dutyManagerEntries: dutyManagerEntries 
    };
  }

  // ========================================
  // RENDERING (ALLOCATION)
  // ========================================
  function calcBlockHeightAlloc_(dayRows, nightRows, dutyManagerRows, redeployRows) {
    // Header + blank + DAY title + DAY header + DAY rows + spacer + 
    // NIGHT title + NIGHT header + NIGHT rows + spacer +
    // DUTY MANAGERS title + DUTY MANAGERS header + DUTY MANAGERS rows (if any) + spacer +
    // REDEPLOY title + REDEPLOY header + REDEPLOY rows (if any) + 2 spacer
    var baseHeight = 1 + 1 + 1 + 1 + dayRows + 1 + 1 + 1 + nightRows + 1;
    
    // Only add duty managers section if there are duty managers
    if (dutyManagerRows > 0) {
      baseHeight += 1 + 1 + dutyManagerRows + 1; // title + header + rows + spacer
    }
    
    // Only add redeployment section if there are redeployments
    if (redeployRows > 0) {
      baseHeight += 1 + 1 + redeployRows; // title + header + rows
    }
    
    return baseHeight + 2; // Final spacer
  }

  function renderWardBlockAlloc_(out, wardName, startCol, startRow, dateLabel, dayEntries, nightEntries, dutyManagerEntries, redeploymentEntries, dayRows, nightRows, dutyManagerRows, redeployRows) {
    var tableCols = 3;
    var infoCols  = 2;
    var totalCols = tableCols + infoCols;

    var endCol = startCol + totalCols - 1;

    // --- Yellow header row with ward name (merged across all 5 columns)
    var header = out.getRange(startRow, startCol, 1, totalCols);
    header.merge();
    var wardNameEscaped = wardName.toString().replace(/"/g, '""');
    header.setFormula('=UPPER("' + wardNameEscaped + '")');
    header.setFontWeight('bold').setBackground('#FFFF00');
    header.setHorizontalAlignment('center');
    header.setVerticalAlignment('middle');

    var r = startRow + 2;

    var dayTitle = out.getRange(r, startCol, 1, totalCols);
    dayTitle.merge();
    dayTitle.setFormula('=UPPER("DAY")');
    dayTitle.setFontWeight('bold').setBackground('#00B050').setFontColor('#000000');
    r++;

    setRowAlloc_(out, r, startCol, ['STAFFNAME', 'SHIFT', 'HRS.']);
    styleHeaderRowAlloc_(out, r, startCol, tableCols);
    r++;

    for (var i = 0; i < dayRows; i++) {
      var e = dayEntries[i];
      setRowAlloc_(out, r + i, startCol, [e ? e.staff : '', e ? e.shift : '', e ? e.hrs : '']);
      out.getRange(r + i, startCol, 1, tableCols).setBorder(true, true, true, true, true, true);
    }

    var dayRGN = countRoleAlloc_(dayEntries, 'RGN');
    var dayHCA = countRoleAlloc_(dayEntries, 'HCA');
    out.getRange(r - 1, startCol + 3).setFormula('=UPPER("RGNS:")').setFontWeight('bold');
    out.getRange(r - 1, startCol + 4).setValue(dayRGN).setFontWeight('bold');
    out.getRange(r,     startCol + 3).setFormula('=UPPER("HCAS:")').setFontWeight('bold');
    out.getRange(r,     startCol + 4).setValue(dayHCA).setFontWeight('bold');

    r += dayRows + 1;

    var nightTitle = out.getRange(r, startCol, 1, totalCols);
    nightTitle.merge();
    nightTitle.setFormula('=UPPER("NIGHT")');
    nightTitle.setFontWeight('bold').setBackground('#404040').setFontColor('#FFFFFF');
    r++;

    setRowAlloc_(out, r, startCol, ['STAFFNAME', 'SHIFT', 'HRS.']);
    styleHeaderRowAlloc_(out, r, startCol, tableCols);
    r++;

    for (var j = 0; j < nightRows; j++) {
      var n = nightEntries[j];
      setRowAlloc_(out, r + j, startCol, [n ? n.staff : '', n ? n.shift : '', n ? n.hrs : '']);
      out.getRange(r + j, startCol, 1, tableCols).setBorder(true, true, true, true, true, true);
    }

    var nightRGN = countRoleAlloc_(nightEntries, 'RGN');
    var nightHCA = countRoleAlloc_(nightEntries, 'HCA');
    out.getRange(r - 1, startCol + 3).setFormula('=UPPER("RGNS:")').setFontWeight('bold');
    out.getRange(r - 1, startCol + 4).setValue(nightRGN).setFontWeight('bold');
    out.getRange(r,     startCol + 3).setFormula('=UPPER("HCAS:")').setFontWeight('bold');
    out.getRange(r,     startCol + 4).setValue(nightHCA).setFontWeight('bold');

    r += nightRows + 1;

    // Only render DUTY MANAGERS section if there are duty managers
    if (dutyManagerRows > 0) {
      var dmTitle = out.getRange(r, startCol, 1, totalCols);
      dmTitle.merge();
      dmTitle.setFormula('=UPPER("DUTY MANAGERS")');
      dmTitle.setFontWeight('bold').setBackground('#00407A').setFontColor('#FFFFFF');
      r++;

      setRowAlloc_(out, r, startCol, ['STAFFNAME', 'SHIFT', 'HRS.']);
      styleHeaderRowAlloc_(out, r, startCol, tableCols);
      r++;

      for (var m = 0; m < dutyManagerRows; m++) {
        var dm = dutyManagerEntries[m];
        setRowAlloc_(out, r + m, startCol, [dm ? dm.staff : '', dm ? dm.shift : '', dm ? dm.hrs : '']);
        out.getRange(r + m, startCol, 1, tableCols).setBorder(true, true, true, true, true, true);
      }

      var dmCount = dutyManagerEntries.length;
      out.getRange(r - 1, startCol + 3).setFormula('=UPPER("RGNS:")').setFontWeight('bold');
      out.getRange(r - 1, startCol + 4).setValue(dmCount).setFontWeight('bold');

      r += dutyManagerRows + 1;
    }

    // Only render REDEPLOYMENT section if there are redeployments
    if (redeployRows > 0) {
      var redeployTitle = out.getRange(r, startCol, 1, totalCols);
      redeployTitle.merge();
      redeployTitle.setFormula('=UPPER("REDEPLOYMENTS")');
      redeployTitle.setFontWeight('bold').setBackground('#8B0000').setFontColor('#FFFFFF');
      r++;

      setRowAlloc_(out, r, startCol, ['STAFFNAME', 'SHIFT', 'HRS.']);
      styleHeaderRowAlloc_(out, r, startCol, tableCols);
      r++;

      for (var k = 0; k < redeployRows; k++) {
        var rd = redeploymentEntries[k];
        setRowAlloc_(out, r + k, startCol, [rd ? rd.staff : '', rd ? rd.shift : '', rd ? rd.hrs : '']);
        out.getRange(r + k, startCol, 1, tableCols).setBorder(true, true, true, true, true, true);
      }

      var redeployRGN = countRoleAlloc_(redeploymentEntries, 'RGN');
      out.getRange(r - 1, startCol + 3).setFormula('=UPPER("RGNS:")').setFontWeight('bold');
      out.getRange(r - 1, startCol + 4).setValue(redeployRGN).setFontWeight('bold');
    }
  }

  function styleHeaderRowAlloc_(sh, row, col, numCols) {
    sh.getRange(row, col, 1, numCols)
      .setFontWeight('bold')
      .setBorder(true, true, true, true, true, true);
  }

  function setRowAlloc_(sh, row, col, arr3) {
    // Convert text values to =UPPER() formulas, keep numbers as values
    var formulas = [];
    for (var i = 0; i < arr3.length; i++) {
      var val = arr3[i];
      if (val === '' || val === null || val === undefined) {
        formulas.push('');
      } else if (typeof val === 'number') {
        formulas.push(val); // Keep numbers as values
      } else {
        // Text - wrap in =UPPER() formula
        var escaped = val.toString().replace(/"/g, '""'); // Escape quotes
        formulas.push('=UPPER("' + escaped + '")');
      }
    }
    sh.getRange(row, col, 1, 3).setFormulas([formulas]);
  }

  // ========================================
  // HELPERS (ALLOCATION)
  // ========================================
  function normalizeShiftCodeAlloc_(v) {
    return v.toString().trim().toUpperCase().replace(/\s+/g, ' ');
  }

  function setAlloc_(arr) {
    var o = {};
    for (var i = 0; i < arr.length; i++) o[arr[i]] = true;
    return o;
  }

  function countRoleAlloc_(entries, role) {
    var c = 0;
    for (var i = 0; i < entries.length; i++) if (entries[i].role === role) c++;
    return c;
  }

  function hoursForAlloc_(shiftCode) {
    var base = shiftCode.split(' ')[0];
    if (base === 'LD' || base === 'LN') return 12.5;
    if (base === 'E' || base === 'L') return 8;
    return '';
  }

  function isRedeploymentAlloc_(code) {
    if (!code) return false;

    var c = code.toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');

    // Compact form (e.g. PBCU, PBDM, PBNIC)
    if (c.indexOf(' ') < 0) {
      if (c.indexOf('PB') === 0 && c.length > 2) {
        var dest = c.substring(2);
        if (dest === 'DM' || dest === 'NIC' || dest === 'DMNIC') return false;
        return true;
      }
      return false;
    }

    // Tokenized form (e.g. "LD W3", "LD DM NIC")
    var parts = c.split(' ');
    var baseType = parts[0];
    var destTokens = parts.slice(1);

    // Exclude DM / NIC anywhere in destination
    for (var i = 0; i < destTokens.length; i++) {
      if (destTokens[i] === 'DM' || destTokens[i] === 'NIC') return false;
    }

    return true;
  }

  function isNonWorkingShiftAlloc_(code) {
    // Check for HO (TOIL taken) or PB (Payback taken) suffixes
    if (code.indexOf(' HO') >= 0 || code.indexOf(' PB') >= 0) {
      return true;
    }
    
    // Check for other non-working shift types
    var nonWorking = ['ANNUAL LEAVE', 'AL', 'OFF', 'LEAVE', 'TRAINING', 'SICK', 'SK', 'S', 'UPL', 'UNPL'];
    for (var i = 0; i < nonWorking.length; i++) {
      if (code.indexOf(nonWorking[i]) >= 0) {
        return true;
      }
    }
    
    return false;
  }

  // ════════════════════════════════════════════════════════════════════
  // 🔍 DEBUG FUNCTION - DUTY MANAGERS CHECKER
  // ════════════════════════════════════════════════════════════════════
  // This function helps diagnose issues with the Duty Managers sheet
  // Run this from: Staffing Management → 🔍 DEBUG Tools → Check Duty Managers Sheet

  function debugDutyManagersSheet() {
    var ui = SpreadsheetApp.getUi();
    
    try {
      // Get the source file
      var sourceFile = SpreadsheetApp.openById(FINANCIALS_SOURCE_FILE_ID);
      
      var dutyManagers = sourceFile.getSheetByName('Duty Managers');
      
      if (!dutyManagers) {
        ui.alert('ERROR', 
          '❌ "Duty Managers" sheet NOT FOUND in source file!\\n\\n' +
          'Available sheets: ' + sourceFile.getSheets().map(function(s) { return s.getName(); }).join(', '),
          ui.ButtonSet.OK);
        return;
      }
      
      // Get sheet dimensions
      var lastRow = dutyManagers.getLastRow();
      var lastCol = dutyManagers.getLastColumn();
      
      Logger.log('🔍 Duty Managers Sheet Debug:');
      Logger.log('  Last Row: ' + lastRow);
      Logger.log('  Last Column: ' + lastCol);
      
      // Check if row 7 exists
      if (lastRow < 7) {
        ui.alert('ERROR', 
          '❌ Duty Managers sheet only has ' + lastRow + ' rows!\\n\\n' +
          'Expected: At least 7 rows\\n' +
          'Row 7 should contain the duty manager data.',
          ui.ButtonSet.OK);
        return;
      }
      
      // Get the name from B7 (NOT A7)
      var nameCell = dutyManagers.getRange(7, 2).getValue(); // Column B
      var name = nameCell ? nameCell.toString().trim() : '';
      
      Logger.log('  A7 (Name): "' + name + '"');
      
      if (!name) {
        ui.alert('WARNING', 
          '⚠️ Cell A7 is EMPTY!\\n\\n' +
          'Expected: Staff member name\\n' +
          'Please check that the duty manager name is in cell A7.',
          ui.ButtonSet.OK);
        return;
      }
      
      // Get row 7 data (B7:AC7)
      var shiftData = dutyManagers.getRange(7, 2, 1, Math.min(lastCol - 1, 28)).getValues()[0];
      
      var report = '✅ DUTY MANAGER FOUND:\\n\\n';
      report += 'Name: ' + name + '\\n';
      report += 'Last Column: ' + lastCol + '\\n\\n';
      report += 'SHIFT CODES (B7 onwards):\\n';
      report += '─────────────────────────\\n';
      
      var foundShifts = 0;
      for (var i = 0; i < shiftData.length; i++) {
        var cellValue = shiftData[i];
        if (cellValue && cellValue.toString().trim() !== '') {
          var colLetter = String.fromCharCode(66 + i); // B=66
          var normalized = cellValue.toString().trim().toUpperCase().replace(/\\s+/g, ' ');
          report += colLetter + '7: "' + cellValue + '" → "' + normalized + '"\\n';
          foundShifts++;
          
          Logger.log('  ' + colLetter + '7: "' + cellValue + '" → "' + normalized + '"');
        }
      }
      
      if (foundShifts === 0) {
        report += '⚠️ NO SHIFT CODES FOUND!\\n';
        report += 'All cells from B7 onwards are empty.\\n';
      }
      
      report += '\\nTotal shifts found: ' + foundShifts;
      
      // Check for dates in row 3
      report += '\\n\\n─────────────────────────\\n';
      report += 'DATE HEADERS (Row 3):\\n';
      report += '─────────────────────────\\n';
      
      if (lastRow >= 3) {
        var dateData = dutyManagers.getRange(3, 2, 1, Math.min(lastCol - 1, 28)).getValues()[0];
        var foundDates = 0;
        for (var j = 0; j < dateData.length; j++) {
          var dateValue = dateData[j];
          if (dateValue) {
            var colLetter = String.fromCharCode(66 + j);
            report += colLetter + '3: ' + dateValue + '\\n';
            foundDates++;
          }
        }
        if (foundDates === 0) {
          report += '⚠️ NO DATE HEADERS FOUND in row 3!\\n';
        }
      } else {
        report += '⚠️ Sheet does not have row 3!\\n';
      }
      
      ui.alert('🔍 DEBUG RESULTS', report, ui.ButtonSet.OK);
      
      // Also log to execution log
      Logger.log('\\n' + report);
      
    } catch (err) {
      ui.alert('ERROR', '❌ Error: ' + err.message + '\\n\\nStack: ' + err.stack, ui.ButtonSet.OK);
      Logger.log('ERROR: ' + err.message);
      Logger.log('Stack: ' + err.stack);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 🧪 TEST FUNCTION - WARD NAME MATCHING
  // ════════════════════════════════════════════════════════════════════
  // This function tests the flexible ward name matching logic
  // Run this from: Staffing Management → 🔍 DEBUG Tools → 🧪 TEST Ward Name Matching

  function testWardNameMatching() {
    var ui = SpreadsheetApp.getUi();
    
    Logger.log('🧪 TESTING WARD NAME MATCHING LOGIC');
    Logger.log('═══════════════════════════════════════════════════');
    
    var testCases = [
      // [Column B Value, Script Searches For, Expected Match]
      ['WARD 3', 'WARD 3', true],
      ['Ward 3', 'WARD 3', true],
      ['ward 3', 'WARD 3', true],
      ['W3', 'WARD 3', true],
      ['w3', 'WARD 3', true],
      ['WARD3', 'WARD 3', true],
      ['Ward3', 'WARD 3', true],
      ['3', 'WARD 3', true],
      ['WARD  3', 'WARD 3', true],
      ['  W3  ', 'WARD 3', true],
      ['WARD 2', 'WARD 3', false],
      ['W2', 'WARD 3', false],
      ['ECU', 'WARD 3', false],
      
      ['WARD 2', 'WARD 2', true],
      ['Ward 2', 'WARD 2', true],
      ['W2', 'WARD 2', true],
      ['2', 'WARD 2', true],
      ['WARD2', 'WARD 2', true],
      
      ['ECU', 'ECU', true],
      ['ecu', 'ECU', true],
      ['Ecu', 'ECU', true],
      ['PBCU', 'ECU', true],
      ['pbcu', 'ECU', true],
      ['ECU', 'PBCU', true],
      ['WARD 2', 'ECU', false]
    ];
    
    var passed = 0;
    var failed = 0;
    var results = '🧪 WARD NAME MATCHING TEST RESULTS\\n';
    results += '═══════════════════════════════════════════════════\\n\\n';
    
    for (var i = 0; i < testCases.length; i++) {
      var test = testCases[i];
      var columnBValue = test[0];
      var searchFor = test[1];
      var expectedMatch = test[2];
      
      var actualMatch = wardNamesMatch(columnBValue, searchFor);
      var testPassed = (actualMatch === expectedMatch);
      
      if (testPassed) {
        passed++;
        Logger.log('✅ PASS: "' + columnBValue + '" vs "' + searchFor + '" → ' + actualMatch + ' (expected: ' + expectedMatch + ')');
      } else {
        failed++;
        Logger.log('❌ FAIL: "' + columnBValue + '" vs "' + searchFor + '" → ' + actualMatch + ' (expected: ' + expectedMatch + ')');
        results += '❌ FAIL: "' + columnBValue + '" vs "' + searchFor + '"\\n';
        results += '   Got: ' + actualMatch + ' | Expected: ' + expectedMatch + '\\n\\n';
      }
    }
    
    results += '\\n═══════════════════════════════════════════════════\\n';
    results += 'Total Tests: ' + testCases.length + '\\n';
    results += '✅ Passed: ' + passed + '\\n';
    results += '❌ Failed: ' + failed + '\\n';
    results += '═══════════════════════════════════════════════════\\n\\n';
    
    if (failed === 0) {
      results += '🎉 ALL TESTS PASSED!\\n\\n';
      results += 'Your ward name matching is working perfectly.\\n';
      results += 'It will match ALL these formats:\\n';
      results += '• WARD 3, Ward 3, ward 3\\n';
      results += '• W3, w3, WARD3\\n';
      results += '• ECU, ecu, PBCU\\n';
      results += '• (and removes extra spaces automatically)';
    } else {
      results += '⚠️ SOME TESTS FAILED!\\n\\n';
      results += 'Check the execution log for details.\\n';
      results += 'Go to: Extensions → Apps Script → Execution log';
    }
    
    Logger.log('\\n' + results);
    ui.alert('🧪 TEST RESULTS', results, ui.ButtonSet.OK);
  }

  // ════════════════════════════════════════════════════════════════════
  // 🔍 TEST FUNCTION - ACTUAL DATA CHECK
  // ════════════════════════════════════════════════════════════════════
  // This function checks your ACTUAL source data to diagnose Ward 3 issue

  function testActualWard3Data() {
    var ui = SpreadsheetApp.getUi();
    
    try {
      Logger.log('🔍 CHECKING ACTUAL WARD 3 DATA IN SOURCE FILE');
      Logger.log('═══════════════════════════════════════════════════');
      
      var sourceSpreadsheet = SpreadsheetApp.openById(FINANCIALS_SOURCE_FILE_ID);
      var sheet = findSheetByName(sourceSpreadsheet, 'CLEANED');
      
      if (!sheet) {
        var sheets = sourceSpreadsheet.getSheets();
        var sheetNames = [];
        for (var i = 0; i < sheets.length; i++) {
          sheetNames.push(sheets[i].getName());
        }
        
        ui.alert('❌ ERROR', 
          'Could not find "CLEANED" sheet!\\n\\n' +
          'Available sheets:\\n' + sheetNames.join('\\n'),
          ui.ButtonSet.OK);
        return;
      }
      
      Logger.log('✅ Found sheet: "' + sheet.getName() + '"');
      
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      
      Logger.log('Sheet dimensions: ' + lastRow + ' rows × ' + lastCol + ' columns');
      
      var headers = allData[0];
      Logger.log('\\nColumn Headers:');
      Logger.log('  Column A: "' + headers[0] + '"');
      Logger.log('  Column B: "' + headers[1] + '"');
      Logger.log('  Column C: "' + headers[2] + '"');
      Logger.log('  Column D: "' + headers[3] + '"');
      
      // Scan Column B for unique ward values
      var wardCounts = {};
      var ward3Rows = [];
      
      for (var row = 1; row < allData.length; row++) {
        var dept = allData[row][1] ? allData[row][1].toString().trim() : '';
        var name = allData[row][3] ? allData[row][3].toString().trim() : '';
        
        if (dept) {
          if (!wardCounts[dept]) {
            wardCounts[dept] = 0;
          }
          wardCounts[dept]++;
          
          // Check if this matches "WARD 3"
          if (wardNamesMatch(dept, 'WARD 3')) {
            ward3Rows.push({
              row: row + 1,
              dept: dept,
              name: name
            });
          }
        }
      }
      
      var report = '🔍 SOURCE DATA ANALYSIS\\n';
      report += '═══════════════════════════════════════════════════\\n\\n';
      report += 'File: ' + sourceSpreadsheet.getName() + '\\n';
      report += 'Sheet: "' + sheet.getName() + '"\\n';
      report += 'Total Rows: ' + lastRow + '\\n\\n';
      
      report += '📊 UNIQUE WARD VALUES IN COLUMN B:\\n';
      report += '─────────────────────────────\\n';
      
      var wardKeys = Object.keys(wardCounts).sort();
      for (var i = 0; i < wardKeys.length; i++) {
        var matches3 = wardNamesMatch(wardKeys[i], 'WARD 3') ? ' ← MATCHES "WARD 3"' : '';
        report += '"' + wardKeys[i] + '": ' + wardCounts[wardKeys[i]] + ' staff' + matches3 + '\\n';
        Logger.log('"' + wardKeys[i] + '": ' + wardCounts[wardKeys[i]] + ' staff' + matches3);
      }
      
      report += '\\n\\n🎯 WARD 3 MATCHES FOUND:\\n';
      report += '─────────────────────────────\\n';
      
      if (ward3Rows.length === 0) {
        report += '❌ NO STAFF FOUND MATCHING "WARD 3"\\n\\n';
        report += '💡 SOLUTION:\\n';
        report += 'Check the ward values above. Your Column B might use:\\n';
        report += '• A different format (update your data to use one of the supported formats)\\n';
        report += '• A different ward name entirely\\n';
      } else {
        report += '✅ Found ' + ward3Rows.length + ' staff members:\\n\\n';
        var displayLimit = Math.min(10, ward3Rows.length);
        for (var i = 0; i < displayLimit; i++) {
          report += 'Row ' + ward3Rows[i].row + ': "' + ward3Rows[i].dept + '" | ' + ward3Rows[i].name + '\\n';
          Logger.log('Row ' + ward3Rows[i].row + ': "' + ward3Rows[i].dept + '" | ' + ward3Rows[i].name);
        }
        if (ward3Rows.length > 10) {
          report += '... and ' + (ward3Rows.length - 10) + ' more\\n';
        }
      }
      
      Logger.log('\\n' + report);
      ui.alert('🔍 DATA CHECK RESULTS', report, ui.ButtonSet.OK);
      
    } catch (err) {
      ui.alert('ERROR', '❌ Error: ' + err.message + '\\n\\nStack: ' + err.stack, ui.ButtonSet.OK);
      Logger.log('ERROR: ' + err.message);
      Logger.log('Stack: ' + err.stack);
    }
  }

  function setupDateDropdownAndFilter_(sheet) {
    const dates = findDateHeadersInSheet_(sheet); // e.g. ["25-JAN","24-JAN",...]
    if (!dates.length) return;

    // Put label + dropdown
    sheet.getRange("A1").setValue("Select date:").setFontWeight("bold");
    const ddCell = sheet.getRange("B1");

    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(dates, true)
      .setAllowInvalid(false)
      .build();

    ddCell.setDataValidation(rule);

    // Default selection (first date)
    if (!ddCell.getValue()) ddCell.setValue(dates[0]);

    // Apply filter immediately
    filterSheetToDate_(sheet, ddCell.getValue());
  }

  function findDateHeadersInSheet_(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return [];

    // Read column A quickly
    const colA = sheet.getRange(1, 1, lastRow, 1).getValues().flat();

    // Match patterns like "25-JAN" or "1-JAN"
    const re = /^\s*\d{1,2}\s*-\s*[A-Z]{3}\s*$/;

    const dates = [];
    for (const v of colA) {
      if (typeof v === "string" && re.test(v.trim())) {
        const d = v.trim().replace(/\s+/g, "");
        if (!dates.includes(d)) dates.push(d);
      }
    }
    return dates;
  }

  function filterSheetToDate_(sheet, selectedDate) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return;

    const colA = sheet.getRange(1, 1, lastRow, 1).getValues().flat();
    const re = /^\s*\d{1,2}\s*-\s*[A-Z]{3}\s*$/;

    // Determine which rows belong to which date
    let currentDate = null;
    let show = false;

    // Always show top rows (title + dropdown + headers) -> rows 1-4 safe
    sheet.showRows(1, Math.min(4, lastRow));

    for (let r = 5; r <= lastRow; r++) {
      const v = colA[r - 1];

      if (typeof v === "string" && re.test(v.trim())) {
        currentDate = v.trim().replace(/\s+/g, "");
        show = (currentDate === selectedDate);
        // Show the header row for the selected date, hide otherwise
        if (show) sheet.showRows(r);
        else sheet.hideRows(r);
        continue;
      }

      if (!currentDate) {
        // If we haven't hit a date header yet, keep visible
        sheet.showRows(r);
        continue;
      }

      if (show) sheet.showRows(r);
      else sheet.hideRows(r);
    }
  }

  function onEdit(e) {
    const range = e.range;
    const sheet = range.getSheet();

    // Dropdown cell is B1
    if (range.getA1Notation() === "B1") {
      const selected = range.getValue();
      filterSheetToDate_(sheet, selected);
    }
  }