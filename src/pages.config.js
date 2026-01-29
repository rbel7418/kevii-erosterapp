/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ActivityKPIs from './pages/ActivityKPIs';
import AdminEmployeePermissions from './pages/AdminEmployeePermissions';
import AdminHub from './pages/AdminHub';
import AdminPagesPermissions from './pages/AdminPagesPermissions';
import Announcements from './pages/Announcements';
import AppWiki from './pages/AppWiki';
import Attendance from './pages/Attendance';
import Availability from './pages/Availability';
import Branding from './pages/Branding';
import Chat from './pages/Chat';
import Compliance from './pages/Compliance';
import DMReport from './pages/DMReport';
import DepartmentAdmin from './pages/DepartmentAdmin';
import DepartmentMonth from './pages/DepartmentMonth';
import DesignPreview from './pages/DesignPreview';
import EmployeeProfile from './pages/EmployeeProfile';
import EmployeeSchedule from './pages/EmployeeSchedule';
import Home from './pages/Home';
import IPCTrainingDB from './pages/IPCTrainingDB';
import InteractiveBI from './pages/InteractiveBI';
import LeaveRequests from './pages/LeaveRequests';
import Messaging from './pages/Messaging';
import MobileHome from './pages/MobileHome';
import OpenShifts from './pages/OpenShifts';
import RepGen from './pages/RepGen';
import Reports from './pages/Reports';
import Requests from './pages/Requests';
import RiskRegister from './pages/RiskRegister';
import RotaGrid from './pages/RotaGrid';
import Settings from './pages/Settings';
import ShiftMap from './pages/ShiftMap';
import TabularRoster from './pages/TabularRoster';
import Team from './pages/Team';
import ToolLauncher from './pages/ToolLauncher';
import TrainingAdminHub from './pages/TrainingAdminHub';
import TrainingDashboard from './pages/TrainingDashboard';
import TrainingRequests from './pages/TrainingRequests';
import TrainingRotaGrid from './pages/TrainingRotaGrid';
import TrainingToolLauncher from './pages/TrainingToolLauncher';
import UploadTemplate from './pages/UploadTemplate';
import UserAdmin from './pages/UserAdmin';
import UserApprovals from './pages/UserApprovals';
import UserLanding from './pages/UserLanding';
import WhatsAppNotifier from './pages/WhatsAppNotifier';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivityKPIs": ActivityKPIs,
    "AdminEmployeePermissions": AdminEmployeePermissions,
    "AdminHub": AdminHub,
    "AdminPagesPermissions": AdminPagesPermissions,
    "Announcements": Announcements,
    "AppWiki": AppWiki,
    "Attendance": Attendance,
    "Availability": Availability,
    "Branding": Branding,
    "Chat": Chat,
    "Compliance": Compliance,
    "DMReport": DMReport,
    "DepartmentAdmin": DepartmentAdmin,
    "DepartmentMonth": DepartmentMonth,
    "DesignPreview": DesignPreview,
    "EmployeeProfile": EmployeeProfile,
    "EmployeeSchedule": EmployeeSchedule,
    "Home": Home,
    "IPCTrainingDB": IPCTrainingDB,
    "InteractiveBI": InteractiveBI,
    "LeaveRequests": LeaveRequests,
    "Messaging": Messaging,
    "MobileHome": MobileHome,
    "OpenShifts": OpenShifts,
    "RepGen": RepGen,
    "Reports": Reports,
    "Requests": Requests,
    "RiskRegister": RiskRegister,
    "RotaGrid": RotaGrid,
    "Settings": Settings,
    "ShiftMap": ShiftMap,
    "TabularRoster": TabularRoster,
    "Team": Team,
    "ToolLauncher": ToolLauncher,
    "TrainingAdminHub": TrainingAdminHub,
    "TrainingDashboard": TrainingDashboard,
    "TrainingRequests": TrainingRequests,
    "TrainingRotaGrid": TrainingRotaGrid,
    "TrainingToolLauncher": TrainingToolLauncher,
    "UploadTemplate": UploadTemplate,
    "UserAdmin": UserAdmin,
    "UserApprovals": UserApprovals,
    "UserLanding": UserLanding,
    "WhatsAppNotifier": WhatsAppNotifier,
}

export const pagesConfig = {
    mainPage: "UserLanding",
    Pages: PAGES,
    Layout: __Layout,
};