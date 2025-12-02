import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, FileText, Activity, TrendingUp, BarChart3, AlertCircle, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dac758b8e651d3b392b8fc/e9dae57cb_KEVII_Portrait_Compact_PNG.png";

const TOOLS = [
  { name: "eRostering", page: "TrainingRotaGrid", icon: Calendar, color: "#ef4444" }, // Red for training
  { name: "DM Report", page: null, icon: BarChart3, color: "#94a3b8" },
  { name: "Sickness Log", page: null, icon: Activity, color: "#94a3b8" },
  { name: "Unplanned Admissions", page: null, icon: TrendingUp, color: "#94a3b8" },
  { name: "Silver/Gold Report", page: null, icon: FileText, color: "#94a3b8" },
  { name: "Refused Admissions", page: null, icon: AlertCircle, color: "#94a3b8" }
];

function ToolIcon({ tool, onClick }) {
  const Icon = tool.icon;
  const [isPressed, setIsPressed] = React.useState(false);
  const disabled = !tool.page;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => !disabled && setIsPressed(false)}
      onMouseLeave={() => !disabled && setIsPressed(false)}
      className={`group relative flex flex-col items-center gap-3 p-4 transition-transform duration-200 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
      style={{
        transform: isPressed ? 'scale(0.9)' : 'scale(1)',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      <div
        className="relative w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:shadow-3xl backdrop-blur-xl"
        style={{
          background: disabled ? '#e2e8f0' : `linear-gradient(135deg, ${tool.color} 0%, ${tool.color}dd 100%)`,
          boxShadow: disabled ? 'none' : `0 20px 60px -15px ${tool.color}66, 0 10px 30px -10px ${tool.color}44`,
          transform: 'translateZ(0)'
        }}
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
        <Icon className="w-16 h-16 text-white relative z-10 drop-shadow-lg" strokeWidth={1.5} />
        
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <span className="text-sm font-medium text-slate-700 max-w-[140px] text-center leading-tight group-hover:text-slate-900 transition-colors">
        {tool.name}
        {disabled && <span className="block text-[10px] text-red-400 font-normal">(N/A in Training)</span>}
      </span>
    </button>
  );
}

export default function TrainingToolLauncher() {
  const navigate = useNavigate();

  const launchTool = (page) => {
    if (page) {
        navigate(createPageUrl(page));
    }
  };

  return (
    <div className="min-h-screen bg-red-50/30 flex items-center justify-center p-8">
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
            <Badge className="bg-red-600 text-white text-lg px-4 py-1">TRAINING MODE</Badge>
          </div>
          
          <div className="flex items-center justify-center gap-8 mb-10">
            <img src={LOGO_URL} alt="Hospital Logo" className="h-32 w-auto drop-shadow-2xl opacity-80 grayscale-[0.3]" />
            <div className="text-left">
              <h2 className="text-5xl font-light text-slate-700 tracking-wide leading-tight">
                KING EDWARD VII's
              </h2>
              <h2 className="text-5xl font-light text-slate-700 tracking-wide leading-tight">
                HOSPITAL
              </h2>
              <p className="text-2xl text-red-500 mt-3 tracking-wider font-medium">Training Environment</p>
            </div>
          </div>

          <p className="text-lg text-slate-600 font-light tracking-wide">
            Practice safely - changes here do not affect the live system
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 max-w-6xl mx-auto mb-12">
          {TOOLS.map((tool) => (
            <ToolIcon
              key={tool.name}
              tool={tool}
              onClick={() => launchTool(tool.page)}
            />
          ))}
        </div>

        <div className="text-center mt-20 space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-red-400">
            <GraduationCap className="w-4 h-4" />
            <span>You are in Training Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}