import OpenShifts from './pages/OpenShifts';
import Team from './pages/Team';
import LeaveRequests from './pages/LeaveRequests';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import ShiftMap from './pages/ShiftMap';
import EmployeeSchedule from './pages/EmployeeSchedule';
import TabularRoster from './pages/TabularRoster';
import UserAdmin from './pages/UserAdmin';
import RotaGrid from './pages/RotaGrid';
import DepartmentMonth from './pages/DepartmentMonth';
import Attendance from './pages/Attendance';
import Availability from './pages/Availability';
import DesignPreview from './pages/DesignPreview';
import EmployeeProfile from './pages/EmployeeProfile';
import ActivityKPIs from './pages/ActivityKPIs';
import Requests from './pages/Requests';
import Branding from './pages/Branding';
import InteractiveBI from './pages/InteractiveBI';
import DepartmentAdmin from './pages/DepartmentAdmin';
import AdminPagesPermissions from './pages/AdminPagesPermissions';
import AdminEmployeePermissions from './pages/AdminEmployeePermissions';
import WhatsAppNotifier from './pages/WhatsAppNotifier';
import MobileHome from './pages/MobileHome';
import Announcements from './pages/Announcements';
import Chat from './pages/Chat';
import Messaging from './pages/Messaging';
import UserLanding from './pages/UserLanding';
import RepGen from './pages/RepGen';
import AdminHub from './pages/AdminHub';
import AppWiki from './pages/AppWiki';
import UserApprovals from './pages/UserApprovals';
import Compliance from './pages/Compliance';
import IPCTrainingDB from './pages/IPCTrainingDB';
import TrainingDashboard from './pages/TrainingDashboard';
import RiskRegister from './pages/RiskRegister';
import UploadTemplate from './pages/UploadTemplate';
import ToolLauncher from './pages/ToolLauncher';
import DMReport from './pages/DMReport';
import TrainingRotaGrid from './pages/TrainingRotaGrid';
import TrainingToolLauncher from './pages/TrainingToolLauncher';
import TrainingRequests from './pages/TrainingRequests';
import TrainingAdminHub from './pages/TrainingAdminHub';
import __Layout from './Layout.jsx';


export const PAGES = {
    "OpenShifts": OpenShifts,
    "Team": Team,
    "LeaveRequests": LeaveRequests,
    "Settings": Settings,
    "Reports": Reports,
    "ShiftMap": ShiftMap,
    "EmployeeSchedule": EmployeeSchedule,
    "TabularRoster": TabularRoster,
    "UserAdmin": UserAdmin,
    "RotaGrid": RotaGrid,
    "DepartmentMonth": DepartmentMonth,
    "Attendance": Attendance,
    "Availability": Availability,
    "DesignPreview": DesignPreview,
    "EmployeeProfile": EmployeeProfile,
    "ActivityKPIs": ActivityKPIs,
    "Requests": Requests,
    "Branding": Branding,
    "InteractiveBI": InteractiveBI,
    "DepartmentAdmin": DepartmentAdmin,
    "AdminPagesPermissions": AdminPagesPermissions,
    "AdminEmployeePermissions": AdminEmployeePermissions,
    "WhatsAppNotifier": WhatsAppNotifier,
    "MobileHome": MobileHome,
    "Announcements": Announcements,
    "Chat": Chat,
    "Messaging": Messaging,
    "UserLanding": UserLanding,
    "RepGen": RepGen,
    "AdminHub": AdminHub,
    "AppWiki": AppWiki,
    "UserApprovals": UserApprovals,
    "Compliance": Compliance,
    "IPCTrainingDB": IPCTrainingDB,
    "TrainingDashboard": TrainingDashboard,
    "RiskRegister": RiskRegister,
    "UploadTemplate": UploadTemplate,
    "ToolLauncher": ToolLauncher,
    "DMReport": DMReport,
    "TrainingRotaGrid": TrainingRotaGrid,
    "TrainingToolLauncher": TrainingToolLauncher,
    "TrainingRequests": TrainingRequests,
    "TrainingAdminHub": TrainingAdminHub,
}

export const pagesConfig = {
    mainPage: "UserLanding",
    Pages: PAGES,
    Layout: __Layout,
};