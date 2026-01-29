# Base44 App - King Edward VII's Hospital Management System

## Overview
This is a React + Vite application exported from the Base44 platform. It's a hospital staff management system featuring:
- Staff rotas and scheduling
- Requests management
- Messaging/SMS capabilities
- Announcements

## Tech Stack
- React 18.2
- Vite 6.1
- TailwindCSS 3.4
- Radix UI components
- React Router DOM 6.26
- Base44 SDK

## Project Structure
```
├── src/
│   ├── api/          # API client configuration
│   ├── components/   # Reusable UI components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility libraries and context
│   ├── pages/        # Page components
│   ├── App.jsx       # Main app component
│   ├── Layout.jsx    # App layout
│   └── main.jsx      # Entry point
├── functions/        # Base44 serverless functions (TypeScript)
├── vite.config.js    # Vite configuration
├── tailwind.config.js
└── package.json
```

## Development
- Run: `npm run dev` (starts on port 5000)
- Build: `npm run build`
- Preview: `npm run preview`

## Environment Variables
- `BASE44_LEGACY_SDK_IMPORTS=true` - Enables legacy SDK import resolution
- `VITE_BASE44_APP_ID` - Base44 application ID (optional, for backend connection)
- `VITE_BASE44_BACKEND_URL` - Base44 backend URL (optional, for backend connection)

## Google Sheets Integration
The app includes Google Sheets import functionality for:
- **Shift Codes** - Import from ULTIMATETRUTH sheet (hours table)
- **Staff Master** - Import from STAFFMASTERLISTLATEST sheet
- **Monthly Rosters** - Import grid-format rosters with date columns

### Key Files
- `src/api/googleSheets.js` - Frontend API functions for parsing and import
- `functions/googleSheets.ts` - Backend serverless function for secure API access
- `src/components/settings/GoogleSheetsImportDialog.jsx` - Import dialog component

### Shift Code Schema (Hours Table)
| Field | DB Field | Usage |
|-------|----------|-------|
| shiftCode | code | Primary key |
| descriptor | name | Display name |
| hours | hours | **Source of truth for calculations** |
| financeTag | finance_tag | BILLABLE/NON-BILLABLE/LEAVE |
| from/to | start_time/end_time | Display only |
| category | category | Grouping |
| isWorked | is_worked | Work vs leave classification |
| dayNight | day_night | Day/Night shift type |

### Access Points
- **Gear icon dropdown** (header) > Google Sheets Import (new - quick access from anywhere)
- Settings > Company > Google Sheets Import
- RotaGrid > Actions menu > Import from Google Sheets

### Import Flow
1. Click "Google Sheets Import" from the gear menu
2. Enter your Google Sheet Document ID (found in the URL after /d/)
3. Select a sheet from the dropdown
4. Choose import type (Roster, Shift Codes, or Staff)
5. Click "Import Shifts"

The import logic matches EMP_ID from the sheet to your database and inserts shift codes on the correct date/row automatically.

## Supabase Database Integration

The app now uses Supabase as the primary database for roster, staff, and shift code data.

### Supabase Configuration
- **URL**: https://sybbwgxcgfkqqhriebxh.supabase.co
- **Client File**: `src/api/supabaseClient.js`

### Database Tables
| Table | Purpose |
|-------|---------|
| `hours_table_46fcc8fd` | Shift code definitions (hours, is_worked, finance_tag, day_night) |
| `staff_masterlist_46fcc8fd` | Employee master data (employee_id, name, job_title, department) |
| `roster_shifts_46fcc8fd` | Roster shift assignments (period_start, shift_date, employee_id, planned_ward, shift_code) |
| `kv_store_46fcc8fd` | Key-value store for settings |

### 28-Day Period System
- Rosters use 28-day periods starting from anchor date 2025-12-29
- `normalizeToPeriodStart(date)` - Calculates period start for any date
- `getPeriodEnd(periodStart)` - Returns period end (start + 27 days)

### Key API Functions
```javascript
import { 
  RosterShifts, 
  HoursTable, 
  StaffMaster, 
  generateFinancialReport 
} from '@/api/supabaseClient';

// Load shifts for a period
const result = await RosterShifts.loadByPeriod('2026-01-26', 'ECU');

// Save shifts for a period
const diagnostics = await RosterShifts.saveForPeriod('2026-01-26', 'ECU', shifts);

// Get hours lookup map
const hoursMap = await HoursTable.getLookupMap();

// Generate financial report
const report = await generateFinancialReport('2026-01-26');
```

### Roster Shift Schema
| Field | Type | Description |
|-------|------|-------------|
| period_start | date | Start of 28-day period |
| shift_date | date | Actual shift date |
| employee_id | text | FK to staff_masterlist |
| planned_ward | text | Home ward (ECU/WARD 2/WARD 3) |
| worked_ward | text | Override if redeployed (null if same as planned) |
| shift_code | text | Code from hours_table |
| slot | smallint | 1-5 for split shifts |
| is_custom | boolean | True for custom time shifts |
| start_time | time | Custom shift start |
| end_time | time | Custom shift end |
| custom_hours | numeric | Custom hours (if is_custom) |

### Financial Report Output
The `generateFinancialReport()` function returns:
- Per-ward staff financials (rosteredToWardHours, actual, shiftCount, etc.)
- Redeployment tracking (redeployedOutHours, netWardHours)
- Leave breakdown (sickHours, unplHours, hoHours, pbHours)
- Diagnostics (shiftRowsLoaded, missingHoursCodes, etc.)

## Notes
This app was exported from Base44. The frontend now connects directly to Supabase for data persistence. Some features still use mock data for entities not yet migrated (Department, User, etc.).
