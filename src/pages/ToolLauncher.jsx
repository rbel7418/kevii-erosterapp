import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, FileText, Activity, TrendingUp, BarChart3, AlertCircle } from "lucide-react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dac758b8e651d3b392b8fc/e9dae57cb_KEVII_Portrait_Compact_PNG.png";

const TOOLS = [
{ name: "eRostering", page: "RotaGrid", icon: Calendar, color: "#3b82f6" },
{ name: "DM Report", page: "DMReport", icon: BarChart3, color: "#0891b2" },
{ name: "Sickness Log", page: "Attendance", icon: Activity, color: "#ef4444" },
{ name: "Unplanned Admissions", page: "InteractiveBI", icon: TrendingUp, color: "#10b981" },
{ name: "Silver/Gold Report", page: "Reports", icon: FileText, color: "#f59e0b" },
{ name: "Refused Admissions", page: "InteractiveBI", icon: AlertCircle, color: "#ec4899" },
{ name: "Bulk Email Update", page: "BulkEmailUpdate", icon: FileText, color: "#6366f1" }];


function ToolIcon({ tool, onClick }) {
  const Icon = tool.icon;
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className="group relative flex flex-col items-center gap-3 p-4 cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
      style={{
        transform: isPressed ? 'scale(0.9)' : 'scale(1)',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>

      <div
        className="relative w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:shadow-3xl backdrop-blur-xl"
        style={{
          background: `linear-gradient(135deg, ${tool.color} 0%, ${tool.color}dd 100%)`,
          boxShadow: `0 20px 60px -15px ${tool.color}66, 0 10px 30px -10px ${tool.color}44`,
          transform: 'translateZ(0)'
        }}>

        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
        <Icon className="w-16 h-16 text-white relative z-10 drop-shadow-lg" strokeWidth={1.5} />
        
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <span className="text-zinc-950 text-xs font-semibold text-center leading-tight max-w-[140px] group-hover:text-slate-900 transition-colors">
        {tool.name}
      </span>
    </button>);

}

export default function ToolLauncher() {
  const navigate = useNavigate();

  const launchTool = (page) => {
    navigate(createPageUrl(page));
  };

  return (
    <div className="bg-slate-50 p-8 opacity-100 min-h-screen from-blue-50 via-white to-cyan-50 flex items-center justify-center">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .floating {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      <div className="w-full max-w-7xl">
        <div className="text-center mb-16 floating">
          <div className="flex items-center justify-center gap-4 mb-8">
            <h1 className="text-5xl font-thin text-slate-600 tracking-tight">Welcome to the</h1>
          </div>
          
          <div className="flex items-center justify-center gap-8 mb-10">
            <img src={LOGO_URL} alt="Hospital Logo" className="h-32 w-auto drop-shadow-2xl" />
            <div className="text-left">
              <h2 className="text-5xl font-light text-slate-700 tracking-wide leading-tight">
                KING EDWARD VII's
              </h2>
              <h2 className="text-5xl font-light text-slate-700 tracking-wide leading-tight">
                HOSPITAL
              </h2>
              <p className="text-2xl text-slate-500 mt-3 tracking-wider font-light">Admin Centre</p>
            </div>
          </div>

          <p className="text-lg text-slate-600 font-light tracking-wide">
            Click on any tool to launch
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 max-w-6xl mx-auto mb-12">
          {TOOLS.map((tool) =>
          <ToolIcon
            key={tool.name}
            tool={tool}
            onClick={() => launchTool(tool.page)} />

          )}
        </div>

        <div className="text-center mt-20 space-y-3">
          <p className="text-xs text-slate-400 font-light">Need help? Contact your system administrator</p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"
            style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            <span>System Online</span>
          </div>
        </div>
      </div>
    </div>);

}