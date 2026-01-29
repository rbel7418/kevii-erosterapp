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

## Notes
This app was exported from Base44 and requires a Base44 backend to fully function. Without the backend:
- API calls will return 404 errors
- Authentication won't work
- Data operations won't persist

The frontend UI will display and navigate correctly.
