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

## Notes
This app was exported from Base44 and requires a Base44 backend to fully function. Without the backend:
- API calls will return 404 errors
- Authentication won't work
- Data operations won't persist

The frontend UI will display and navigate correctly.
