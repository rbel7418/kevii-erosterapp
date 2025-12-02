import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Sun,
  Moon,
  LogOut,
  Bell,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  BarChart3,
  ShieldCheck,
  Wrench,
  Mail, // Added/Ensured Mail is imported
  Calculator,
  Shuffle,
  Megaphone,
  BookOpen,
  Inbox,
  Upload,
  Table as TableIcon,
  SlidersHorizontal,
  Filter,
  ChevronLeft,
  ChevronRight,
  Lock,
  MoreVertical,
  Plus,
  Save,
  RefreshCw
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { OrgSettings } from "@/entities/OrgSettings";
import { AppPermission } from "@/entities/AppPermission";
import { Employee } from "@/entities/Employee";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { GraduationCap } from "lucide-react";
import OnlineUsersWidget from "@/components/common/OnlineUsersWidget";
import FloatingCalculator from "@/components/common/FloatingCalculator";
import { agentSDK } from "@/agents";
import WhatsAppTool from "@/components/floating/WhatsAppTool";
import ShiftRandomiser from "@/components/floating/ShiftRandomiser";
import LoginAnnouncementPopup from "@/components/announcements/LoginAnnouncementPopup";
// Removed AIAssistant import
import { AnnouncementInbox } from "@/entities/AnnouncementInbox";
import PendingApproval from "@/components/common/PendingApproval";
import CommsCenter from "@/components/comms/CommsCenter";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { format, addDays, subMonths, addMonths, parseISO } from "date-fns";
import DateRangePicker from "@/components/common/DateRangePicker";

const BASE_NAV = [
  { label: "Home", icon: LayoutDashboard, to: "ToolLauncher", access: ["admin", "manager", "staff"] },
  { label: "Rotas", icon: Calendar, to: "RotaGrid", access: ["admin", "manager", "staff"] },
  { label: "Requests", icon: Bell, to: "Requests", access: ["admin", "manager", "staff"] }
];

const TRAINING_NAV = [
  { label: "Training Home", icon: LayoutDashboard, to: "TrainingToolLauncher", access: ["admin", "manager", "staff"] },
  { label: "Training Rotas", icon: Calendar, to: "TrainingRotaGrid", access: ["admin", "manager", "staff"] },
  { label: "Training Requests", icon: Bell, to: "TrainingRequests", access: ["admin", "manager", "staff"] }
];


const LOGO_FALLBACK = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dac758b8e651d3b392b8fc/2bb290b8f_ChatGPTImageOct8202502_53_29AM.png";
const DM_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef9390a80590292eec4f23/226b3d322_logodm.png";
const WATERMARK_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dac758b8e651d3b392b8fc/e9dae57cb_KEVII_Portrait_Compact_PNG.png";
const WATERMARK_URL = WATERMARK_LOGO;
const ALLOWED_DOMAIN = "kingedwardvii.co.uk";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [theme, setTheme] = React.useState("light");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [navOverrides, setNavOverrides] = React.useState(null);

  const [editMode, setEditMode] = React.useState(false);
  const [orgLogo, setOrgLogo] = React.useState(null);
  const [calculatorOpen, setCalculatorOpen] = React.useState(false);

  const [whatsAppOpen, setWhatsAppOpen] = React.useState(false);
  const [randomiserOpen, setRandomiserOpen] = React.useState(false);
  const [announceOpen, setAnnounceOpen] = React.useState(false);
  const [commsOpen, setCommsOpen] = React.useState(false);
  // Removed aiAssistantOpen state
  // const [aiAssistantOpen, setAiAssistantOpen] = React.useState(false);

  const [unreadAnnouncements, setUnreadAnnouncements] = React.useState([]);

  const [appPerms, setAppPerms] = React.useState(null);
  const [permsLoaded, setPermsLoaded] = React.useState(false);

  const hideTopbar = currentPageName === "HeaderShowcase" || currentPageName === "HeaderPreview" || currentPageName === "ToolLauncher" || currentPageName === "RunUpdate";

  const isRotaGrid = currentPageName === 'RotaGrid';

  // CRITICAL FIX: Track RotaGrid state updates to force rerenders
  const [rotaStateTick, setRotaStateTick] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setRotaStateTick((t) => t + 1);
    window.addEventListener("rotagrid-state-updated", handler);
    return () => window.removeEventListener("rotagrid-state-updated", handler);
  }, []);

  // Recompute rotaState when it updates
  const rotaState = React.useMemo(() => {
    void rotaStateTick; // dependency to trigger recompute
    return typeof window !== 'undefined' ? window._rotaGridState : null;
  }, [rotaStateTick]);

  const landingPage = "ToolLauncher";

  React.useEffect(() => {
    const saved = localStorage.getItem("edit_mode") === "1";
    setEditMode(saved);
    const root = document.documentElement;
    if (saved) root.setAttribute("data-edit-mode", "1");
    else root.removeAttribute("data-edit-mode");
  }, []);

  const setAndBroadcastEditMode = React.useCallback((on) => {
    setEditMode(on);
    try { localStorage.setItem("edit_mode", on ? "1" : "0"); } catch (e) { }
    const root = document.documentElement;
    if (on) root.setAttribute("data-edit-mode", "1");
    else root.removeAttribute("data-edit-mode");
    try { window.dispatchEvent(new CustomEvent("edit-mode-changed", { detail: { enabled: on } })); } catch (e) { }
  }, []); // Changed dependency array to empty

  const toggleEditMode = React.useCallback(() => {
    setAndBroadcastEditMode(!editMode);
  }, [editMode, setAndBroadcastEditMode]);

  const applyTheme = React.useCallback((t) => {
    const root = document.documentElement;
    if (t === "system") {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("theme-dark", prefersDark);
    } else {
      root.classList.toggle("theme-dark", t === "dark");
    }
  }, []);

  const parseThemeJSON = React.useCallback((raw) => {
    try {
      const txt = typeof raw === "string" ? raw.trim() : "";
      if (!txt || txt[0] !== "{") return null;
      return JSON.parse(txt);
    } catch {
      return null;
    }
  }, []);

  const applyThemeJSON = React.useCallback((themeObj) => {
    const root = document.documentElement;

    if (!themeObj) {
      [
        "--topbar-bg", "--topbar-text", "--acc-1", "--acc-2", "--acc-3", "--acc-4", "--acc-5",
        "--surface", "--surface-2", "--border-col", "--muted-text", "--ring", "--shadow-col", "--grid-line"
      ].
        forEach((v) => root.style.removeProperty(v));
      setNavOverrides(null);
      root.removeAttribute("data-native-theme");
      import("@/components/utils/colors").then(({ setCustomPalette }) => { setCustomPalette(null); }).catch(() => { });
      root.style.removeProperty("--shiftchip-color");
      try { window.dispatchEvent(new CustomEvent("shiftchip-color-changed", { detail: "" })); } catch (e) { }
      return;
    }

    const colors = themeObj?.colors || {};
    const acc1 = String(colors.acc1 || "#0b5ed7");
    const acc2 = String(colors.acc2 || "#0ea5e9");
    const acc3 = String(colors.acc3 || "#8b5cf6");
    const acc4 = String(colors.acc4 || "#f59e0b");
    const acc5 = String(colors.acc5 || "#14b8a6");

    colors.topbar_bg ? root.style.setProperty("--topbar-bg", String(colors.topbar_bg)) : root.style.removeProperty("--topbar-bg");
    colors.topbar_text ? root.style.setProperty("--topbar-text", String(colors.topbar_text)) : root.style.removeProperty("--topbar-text");
    root.style.setProperty("--acc-1", acc1);
    root.style.setProperty("--acc-2", acc2);
    root.style.setProperty("--acc-3", acc3);
    root.style.setProperty("--acc-4", acc4);
    root.style.setProperty("--acc-5", acc5);

    if (themeObj.key || themeObj.is_native) {
      root.setAttribute("data-native-theme", "1");
    } else {
      root.removeAttribute("data-native-theme");
    }

    root.style.removeProperty("--shiftchip-color");
    try { window.dispatchEvent(new CustomEvent("shiftchip-color-changed", { detail: "" })); } catch (e) { }

    setNavOverrides(themeObj?.nav || null);

    import("@/components/utils/colors").then(({ setCustomPalette, darkenHex, mixHex }) => {
      const surface = mixHex(acc3, "#ffffff", 0.92);
      const surface2 = mixHex(acc2, "#ffffff", 0.96);
      const muted = darkenHex(acc3, 0.65);
      const ring = acc2;
      const shadowCol = darkenHex(acc1, 0.7);

      root.style.setProperty("--surface", surface);
      root.style.setProperty("--surface-2", surface2);
      root.style.removeProperty("--border-col");
      root.style.setProperty("--muted-text", muted);
      root.style.setProperty("--ring", ring);
      root.style.setProperty("--shadow-col", shadowCol);
      root.style.removeProperty("--grid-line");

      const extended = [acc1, acc2, acc3, acc4, acc5, darkenHex(acc1, 0.18), darkenHex(acc2, 0.18), darkenHex(acc3, 0.18), darkenHex(acc4, 0.18), darkenHex(acc5, 0.18)];
      setCustomPalette(extended);
    }).catch(() => { });
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const perms = await AppPermission.list();
        setAppPerms(perms || []);
      } catch {
        setAppPerms([]);
      } finally {
        setPermsLoaded(true);
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        let u = await User.me();
        setUser(u);

        if (u) {
          const hasStatus = typeof u.status === "string";
          const domainOk = String(u.email || "").toLowerCase().endsWith("@" + ALLOWED_DOMAIN);

          if (!hasStatus) {
            const next = { status: domainOk ? "pending" : "rejected", domain_valid: domainOk };
            try {
              await User.updateMyUserData(next);
              setUser({ ...u, ...next });
              u = { ...u, ...next };
            } catch (e) { }
          } else if (u.domain_valid === undefined) {
            try {
              await User.updateMyUserData({ domain_valid: domainOk });
              setUser({ ...u, domain_valid: domainOk });
              u = { ...u, domain_valid: domainOk };
            } catch (e) { }
          }

          // Auto-set default department view if not set
          if (u.email && !u.settings?.defaults?.department?.enabled) {
            try {
              const emps = await Employee.filter({ user_email: u.email });
              const emp = emps?.[0];
              if (emp && emp.department_id) {
                const newSettings = {
                  ...(u.settings || {}),
                  defaults: {
                    ...(u.settings?.defaults || {}),
                    department: { enabled: true, ids: [emp.department_id] }
                  }
                };
                await User.updateMyUserData({ settings: newSettings });
                u = { ...u, settings: newSettings };
                setUser(u);
              }
            } catch (e) { console.error("Auto-default failed", e); }
          }
          }

          const t = u?.settings?.theme || "light";
        setTheme(t);
        applyTheme(t);
        const root = document.documentElement;
        const chip = u?.settings?.ui?.shiftchip_color || "";
        if (chip) root.style.setProperty("--shiftchip-color", chip);
        else
          root.style.removeProperty("--shiftchip-color");
        try { window.dispatchEvent(new CustomEvent("shiftchip-color-changed", { detail: chip })); } catch (e) { }
        const pal = u?.settings?.ui?.shiftchip_palette;
        if (Array.isArray(pal) && pal.length >= 2) {
          const { setCustomPalette } = await import("@/components/utils/colors");
          setCustomPalette(pal);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
      try {
        const rows = await OrgSettings.list();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (row?.theme_json) {
          const parsed = parseThemeJSON(row.theme_json);
          if (parsed) applyThemeJSON(parsed);
          else
            applyThemeJSON(null);
        }
        if (row?.company_logo) setOrgLogo(row.company_logo);
        else
          setOrgLogo(null);

        try {
          const local = localStorage.getItem("native_theme_override");
          if (local) {
            const theme = parseThemeJSON(local);
            if (theme) applyThemeJSON(theme);
          }
        } catch (e) { }
      } catch {
        applyThemeJSON(null);
        setOrgLogo(null);
      }
    })();

    const onThemeUpdated = (e) => {
      const themeObj = e?.detail?.theme || null;
      if (themeObj) applyThemeJSON(themeObj);
      OrgSettings.list().then((rows) => {
        const row = Array.isArray(rows) ? rows[0] : null;
        if (row?.theme_json) {
          const parsed = parseThemeJSON(row.theme_json);
          if (parsed) applyThemeJSON(parsed);
          else
            applyThemeJSON(null);
        } else {
          applyThemeJSON(null);
        }
        setOrgLogo(row?.company_logo || null);
      }).catch(() => {
        applyThemeJSON(null);
        setOrgLogo(null);
      });
    };
    window.addEventListener("theme-updated", onThemeUpdated);
    return () => window.removeEventListener("theme-updated", onThemeUpdated);
  }, [applyTheme, applyThemeJSON, parseThemeJSON]);

  React.useEffect(() => {
    if (authChecked && user) {
      const noExplicitPage = !currentPageName || currentPageName === "Dashboard";
      if (noExplicitPage) {
        const target = createPageUrl(landingPage);
        const here = location.pathname + location.search;
        if (here !== target) {
          navigate(target, { replace: true });
        }
      }
    }
  }, [authChecked, user, currentPageName, navigate, location.pathname, location.search]);

  React.useEffect(() => {
    if (!user?.email) return;
    (async () => {
      try {
        const unread = await AnnouncementInbox.filter({ user_email: user.email, status: "unread" });
        setUnreadAnnouncements(unread || []);
        if ((unread || []).length > 0) setAnnounceOpen(true);
      } catch (e) {
        setUnreadAnnouncements([]);
      }
    })();
  }, [user]);

  const handleMarkAllReadForFloating = React.useCallback(async () => {
    try {
      const items = unreadAnnouncements || [];
      for (let i = 0; i < items.length; i++) {
        await AnnouncementInbox.update(items[i].id, { status: "read", read_at: new Date().toISOString() });
      }
    } finally {
      const refreshed = await AnnouncementInbox.filter({ user_email: user.email, status: "unread" });
      setUnreadAnnouncements(refreshed || []);
    }
  }, [unreadAnnouncements, user]);

  React.useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-show");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "40px 0px -10px 0px" }
    );

    const scan = () => {
      document.querySelectorAll("[data-visual]:not(.reveal-bound)").forEach((el) => {
        el.classList.add("reveal-bound");
        io.observe(el);
      });
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  React.useEffect(() => {
    const onOpenAnnouncements = () => setCommsOpen(true);
    window.addEventListener("open-announcements", onOpenAnnouncements);
    return () => window.removeEventListener("open-announcements", onOpenAnnouncements);
  }, []);

  const applyColorScheme = async (colors) => {
    const root = document.documentElement;
    root.style.removeProperty("--shiftchip-color");
    try { window.dispatchEvent(new CustomEvent("shiftchip-color-changed", { detail: "" })); } catch (e) { }
    const { setCustomPalette } = await import("@/components/utils/colors");
    setCustomPalette(colors);
    if (user) {
      const next = {
        ...(user.settings || {}),
        ui: { ...(user.settings?.ui || {}), shiftchip_palette: colors, shiftchip_color: "" }
      };
      await User.updateMyUserData({ settings: next });
      setUser({ ...user, settings: next });
    }
  };

  const access = React.useMemo(() => {
    if (user?.role === "admin") return "admin";
    return user?.access_level || "staff";
  }, [user]);

  const canRoleSee = React.useCallback((resourceKey, type = "page") => {
    const list = appPerms || [];
    const rec = list.find((r) => r.resource_type === type && r.resource_key === resourceKey);
    if (!rec) return true;
    const role = user?.role === "admin" ? "admin" : user?.access_level || "staff";
    if (role === "admin") return rec.allow_admin !== false;
    if (role === "manager") return rec.allow_manager !== false;
    return rec.allow_staff !== false;
  }, [appPerms, user]);

  const transformNav = React.useCallback((items, overrides) => {
    let arr = items.map((it) => ({ ...it, displayLabel: overrides?.rename?.[it.label] || it.label }));
    if (overrides?.visible && Array.isArray(overrides.visible) && overrides.visible.length > 0) {
      const visSet = new Set(overrides.visible);
      arr = arr.filter((it) => visSet.has(it.label) || visSet.has(it.displayLabel));
    }
    if (overrides?.order && Array.isArray(overrides.order) && overrides.order.length > 0) {
      const pos = (lbl) => {
        const i = overrides.order.indexOf(lbl);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      };
      arr = arr.sort((a, b) => pos(a.label) - pos(b.label));
    }
    return arr;
  }, []);

  const isTrainingMode = currentPageName?.startsWith('Training');
  const computedNav = React.useMemo(() => transformNav(isTrainingMode ? TRAINING_NAV : BASE_NAV, navOverrides), [navOverrides, transformNav, isTrainingMode]);

  const filteredNav = React.useMemo(() => {
    return computedNav.filter((n) => n.access.includes(access) && canRoleSee(n.to, "page"));
  }, [computedNav, canRoleSee, access]);

  const visibleNav = filteredNav.filter((n) => n.access.includes(access));
  const isActive = (to) => location.pathname + location.search === createPageUrl(to);

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    if (user) {
      await User.updateMyUserData({
        settings: { ...(user.settings || {}), theme: next }
      });
      setUser({ ...user, settings: { ...(user.settings || {}), theme: next } });
    }
  };

  const signOut = async () => {
    await User.logout();
  };

  const totalLeave = Number(user?.annual_leave_days ?? 0);
  const usedLeave = Number(user?.annual_leave_used ?? 0);
  const leftLeave = Math.max(0, totalLeave - usedLeave);

  React.useEffect(() => {
    const panels = Array.from(document.querySelectorAll('.floating-panel'));
    const cleanups = [];

    panels.forEach((el, idx) => {
      const key = el.getAttribute('data-floating-key') || `floating_panel_${idx}`;

      const initialRight = el.style.right;
      const initialBottom = el.style.bottom;
      el.style.right = 'auto';
      el.style.bottom = 'auto';

      let currentX, currentY;
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const { x, y } = JSON.parse(saved);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            currentX = x;
            currentY = y;
          }
        }
      } catch (e) { }

      if (currentX === undefined || currentY === undefined) {
        const rect = el.getBoundingClientRect();
        currentX = rect.left;
        currentY = rect.top;
      }

      el.style.left = `${currentX}px`;
      el.style.top = `${currentY}px`;
      el.style.position = 'fixed';

      let down = false;
      let startX = 0, startY = 0, origX = 0, origY = 0;
      let lastX = currentX, lastY = currentY, lastT = performance.now();
      let vx = 0, vy = 0;
      let animationFrameId = null;

      const within = (v, min, max) => Math.min(Math.max(v, min), max);

      const onPointerDown = (e) => {
        const target = e.target;
        const tagName = (target.tagName || '').toUpperCase();
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || tagName === 'BUTTON' || target.closest('[data-no-drag]')) return;

        down = true;
        el.setPointerCapture?.(e.pointerId);
        el.style.transition = 'none';
        el.style.boxShadow = '0 12px 24px -8px rgba(0,0,0,0.4)';
        el.classList.add('grabbing');

        const r = el.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        origX = r.left;
        origY = r.top;
        lastX = origX;
        lastY = origY;
        lastT = performance.now();
        vx = vy = 0;

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      };

      const onPointerMove = (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let nx = origX + dx;
        let ny = origY + dy;
        el.style.left = `${nx}px`;
        el.style.top = `${ny}px`;

        const now = performance.now();
        const dt = now - lastT;
        if (dt > 0) {
          vx = (nx - lastX) / dt;
          vy = (ny - lastY) / dt;
          lastX = nx;
          lastY = ny;
          lastT = now;
        }
      };

      const onPointerUp = () => {
        if (!down) return;
        down = false;
        el.classList.remove('grabbing');

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);

        const friction = 0.9;
        const bounceDamping = 0.6;
        const minVelocity = 0.05;
        const boundaryPadding = 8;

        const animateInertia = () => {
          const r = el.getBoundingClientRect();
          let nx = r.left + vx * 16.66;
          let ny = r.top + vy * 16.66;

          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const maxX = vw - r.width - boundaryPadding;
          const maxY = vh - r.height - boundaryPadding;
          const minX = boundaryPadding;
          const minY = boundaryPadding;

          let bounced = false;
          if (nx < minX) { nx = minX; vx *= -bounceDamping; bounced = true; }
          if (ny < minY) { ny = minY; vy *= -bounceDamping; bounced = true; }
          if (nx > maxX) { nx = maxX; vx *= -bounceDamping; bounced = true; }
          if (ny > maxY) { ny = maxY; vy *= -bounceDamping; bounced = true; }

          el.style.left = `${nx}px`;
          el.style.top = `${ny}px`;

          vx *= friction;
          vy *= friction;

          if (Math.abs(vx) > minVelocity || Math.abs(vy) > minVelocity) {
            animationFrameId = requestAnimationFrame(animateInertia);
          } else {
            el.style.left = `${within(nx, minX, maxX)}px`;
            el.style.top = `${within(ny, minY, maxY)}px`;
            try {
              localStorage.setItem(key, JSON.stringify({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) }));
            } catch (e) { }
            el.style.transition = '';
            el.style.boxShadow = '';
            animationFrameId = null;
          }
        };

        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(animateInertia);
      };

      el.addEventListener('pointerdown', onPointerDown);

      const onResize = () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        const r = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const boundaryPadding = 8;
        const maxX = vw - r.width - boundaryPadding;
        const maxY = vh - r.height - boundaryPadding;
        const minX = boundaryPadding;
        const minY = boundaryPadding;

        let newX = parseFloat(el.style.left);
        let newY = parseFloat(el.style.top);

        newX = within(newX, minX, maxX);
        newY = within(newY, minY, maxY);

        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;

        try {
          localStorage.setItem(key, JSON.stringify({ x: newX, y: newY }));
        } catch (e) { }
      };
      window.addEventListener('resize', onResize);

      cleanups.push(() => {
        el.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        el.style.left = '';
        el.style.top = '';
        el.style.right = initialRight;
        el.style.bottom = initialBottom;
        el.style.transition = '';
        el.style.boxShadow = '';
        el.classList.remove('grabbing');
      });
    });

    // Removed aiAssistantOpen from dependency array
    return () => cleanups.forEach((fn) => fn && fn());
  }, [whatsAppOpen, randomiserOpen, calculatorOpen, announceOpen, commsOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <style>{`
        /* Tailwind v4 Theme Configuration */
        @theme {
          /* Brand Colors */
          --color-brand-50: rgb(239, 246, 255);
          --color-brand-100: rgb(219, 234, 254);
          --color-brand-200: rgb(191, 219, 254);
          --color-brand-300: rgb(147, 197, 253);
          --color-brand-400: rgb(96, 165, 250);
          --color-brand-500: rgb(59, 130, 246);
          --color-brand-600: rgb(37, 99, 235);
          --color-brand-700: rgb(29, 78, 216);
          --color-brand-800: rgb(30, 64, 175);
          --color-brand-900: rgb(30, 58, 138);
          
          /* Neutral Colors */
          --color-neutral-0: rgb(255, 255, 255);
          --color-neutral-50: rgb(248, 250, 252);
          --color-neutral-100: rgb(241, 245, 249);
          --color-neutral-200: rgb(226, 232, 240);
          --color-neutral-300: rgb(203, 213, 225);
          --color-neutral-400: rgb(148, 163, 184);
          --color-neutral-500: rgb(100, 116, 139);
          --color-neutral-600: rgb(71, 85, 105);
          --color-neutral-700: rgb(51, 65, 85);
          --color-neutral-800: rgb(30, 41, 59);
          --color-neutral-900: rgb(15, 23, 42);
          --color-neutral-950: rgb(2, 6, 23);
          
          /* Error Colors */
          --color-error-50: rgb(254, 242, 242);
          --color-error-100: rgb(254, 226, 226);
          --color-error-200: rgb(254, 202, 202);
          --color-error-300: rgb(252, 165, 165);
          --color-error-400: rgb(248, 113, 113);
          --color-error-500: rgb(239, 68, 68);
          --color-error-600: rgb(220, 38, 38);
          --color-error-700: rgb(185, 28, 28);
          --color-error-800: rgb(153, 27, 27);
          --color-error-900: rgb(127, 29, 29);
          
          /* Warning Colors */
          --color-warning-50: rgb(255, 247, 237);
          --color-warning-100: rgb(255, 237, 213);
          --color-warning-200: rgb(254, 215, 170);
          --color-warning-300: rgb(253, 186, 116);
          --color-warning-400: rgb(251, 146, 60);
          --color-warning-500: rgb(249, 115, 22);
          --color-warning-600: rgb(234, 88, 12);
          --color-warning-700: rgb(194, 65, 12);
          --color-warning-800: rgb(154, 52, 18);
          --color-warning-900: rgb(124, 45, 18);
          
          /* Success Colors */
          --color-success-50: rgb(240, 253, 244);
          --color-success-100: rgb(220, 252, 231);
          --color-success-200: rgb(187, 247, 208);
          --color-success-300: rgb(134, 239, 172);
          --color-success-400: rgb(74, 222, 128);
          --color-success-500: rgb(34, 197, 94);
          --color-success-600: rgb(22, 163, 74);
          --color-success-700: rgb(21, 128, 61);
          --color-success-800: rgb(22, 101, 52);
          --color-success-900: rgb(20, 83, 45);
          
          /* Semantic Colors */
          --color-brand-primary: rgb(37, 99, 235);
          --color-default-font: rgb(15, 23, 42);
          --color-subtext-color: rgb(100, 116, 139);
          --color-neutral-border: rgb(226, 232, 240);
          --color-white: rgb(255, 255, 255);
          --color-default-background: rgb(255, 255, 255);

          /* Typography Scale */
          --text-caption: 12px;
          --text-caption--font-weight: 400;
          --text-caption--letter-spacing: 0em;
          --text-caption--line-height: 16px;
          
          --text-caption-bold: 12px;
          --text-caption-bold--font-weight: 700;
          --text-caption-bold--letter-spacing: 0em;
          --text-caption-bold--line-height: 16px;
          
          --text-body: 14px;
          --text-body--font-weight: 400;
          --text-body--letter-spacing: 0em;
          --text-body--line-height: 20px;
          
          --text-body-bold: 14px;
          --text-body-bold--font-weight: 700;
          --text-body-bold--letter-spacing: 0em;
          --text-body-bold--line-height: 20px;
          
          --text-heading-3: 16px;
          --text-heading-3--font-weight: 800;
          --text-heading-3--letter-spacing: 0em;
          --text-heading-3--line-height: 20px;
          
          --text-heading-2: 20px;
          --text-heading-2--font-weight: 800;
          --text-heading-2--letter-spacing: 0em;
          --text-heading-2--line-height: 24px;
          
          --text-heading-1: 30px;
          --text-heading-1--font-weight: 800;
          --text-heading-1--letter-spacing: 0em;
          --text-heading-1--line-height: 36px;
          
          --text-monospace-body: 14px;
          --text-monospace-body--font-weight: 400;
          --text-monospace-body--letter-spacing: 0em;
          --text-monospace-body--line-height: 20px;

          /* Font Families */
          --font-caption: Montserrat, ui-sans-serif, system-ui, sans-serif;
          --font-caption-bold: Montserrat, ui-sans-serif, system-ui, sans-serif;
          --font-body: Montserrat, ui-sans-serif, system-ui, sans-serif;
          --font-body-bold: Montserrat, ui-sans-serif, system-ui, sans-serif;
          --font-heading-3: Montserrat, ui-sans-serif, system-ui, sans-serif;
          --font-heading-2: Montserrat, ui-sans-serif, system-ui, sans-serif;
          --font-heading-1: Montserrat, ui-sans-serif, system-ui, sans-serif;
          --font-monospace-body: monospace;

          /* Box Shadows */
          --shadow-sm: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
          --shadow-default: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
          --shadow-md: 0px 4px 16px -2px rgba(0, 0, 0, 0.08), 0px 2px 4px -1px rgba(0, 0, 0, 0.08);
          --shadow-lg: 0px 12px 32px -4px rgba(0, 0, 0, 0.08), 0px 4px 8px -2px rgba(0, 0, 0, 0.08);
          --shadow-overlay: 0px 12px 32px -4px rgba(0, 0, 0, 0.08), 0px 4px 8px -2px rgba(0, 0, 0, 0.08);

          /* Border Radiuses */
          --radius-sm: 8px;
          --radius-md: 16px;
          --radius-DEFAULT: 16px;
          --radius-lg: 24px;
          --radius-full: 9999px;

          /* Spacing Scale */
          --spacing-112: 28rem;
          --spacing-144: 36rem;
          --spacing-192: 48rem;
          --spacing-256: 64rem;
          --spacing-320: 80rem;
        }

        /* Container utility */
        .container {
          padding-left: 16px;
          padding-right: 16px;
        }

        @media (width >= 640px) {
          .container {
            padding-left: calc((100vw + 16px - 640px) / 2);
            padding-right: calc((100vw + 16px - 640px) / 2);
          }
        }

        @media (width >= 768px) {
          .container {
            padding-left: calc((100vw + 16px - 768px) / 2);
            padding-right: calc((100vw + 16px - 768px) / 2);
          }
        }

        @media (width >= 1024px) {
          .container {
            padding-left: calc((100vw + 16px - 1024px) / 2);
            padding-right: calc((100vw + 16px - 1024px) / 2);
          }
        }

        @media (width >= 1280px) {
          .container {
            padding-left: calc((100vw + 16px - 1280px) / 2);
            padding-right: calc((100vw + 16px - 1280px) / 2);
          }
        }

        @media (width >= 1536px) {
          .container {
            padding-left: calc((100vw + 16px - 1536px) / 2);
            padding-right: calc((100vw + 16px - 1536px) / 2);
          }
        }

        /* Custom mobile variant */
        @media (max-width: 767px) {
          .mobile\\:hidden { display: none; }
        }

        html, body, * { 
          font-family: 'Aptos Display', 'Montserrat', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'; 
        }
        
        :root {
          --dm-bg-base: #f8fafc;
          --dm-bg-elevated: #ffffff;
          --dm-bg-subtle: #f1f5f9;
          --dm-text-primary: #0f172a;
          --dm-text-secondary: #475569;
          --dm-text-tertiary: #64748b;
          --dm-border: #e2e8f0;
          --dm-shadow: rgba(15, 23, 42, 0.1);
          --dm-accent: #0ea5e9;
          --dm-accent-glow: rgba(14, 165, 233, 0.15);
        }

        .theme-dark {
          --dm-bg-base: #0B1929;
          --dm-bg-elevated: #152238;
          --dm-bg-subtle: #1E2D42;
          --dm-bg-hover: #2A3B52;
          --dm-text-primary: #F1F5F9;
          --dm-text-secondary: #CBD5E1;
          --dm-text-tertiary: #94A3B8;
          --dm-border: #2A3B52;
          --dm-border-subtle: #1E2D42;
          --dm-shadow: rgba(0, 0, 0, 0.5);
          --dm-shadow-lg: rgba(0, 0, 0, 0.7);
          --dm-accent: #0EA5E9;
          --dm-accent-hover: #0284C7;
          --dm-accent-glow: rgba(14, 165, 233, 0.25);
          --dm-success: #22C55E;
          --dm-warning: #F59E0B;
          --dm-error: #EF4444;
          --dm-glow-cyan: rgba(14, 165, 233, 0.2);
          --dm-glow-blue: rgba(59, 130, 246, 0.2);
        }

        * {
          transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1), 
                      color 250ms cubic-bezier(0.4, 0, 0.2, 1), 
                      border-color 250ms cubic-bezier(0.4, 0, 0.2, 1), 
                      box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .themed {
          background: var(--dm-bg-base) !important;
          color: var(--dm-text-primary) !important;
        }

        .themed .bg-white {
          background: var(--dm-bg-elevated) !important;
          color: var(--dm-text-primary) !important;
        }

        .themed .bg-slate-50,
        .themed .bg-gray-50 {
          background: var(--dm-bg-subtle) !important;
        }

        .theme-dark .themed .bg-slate-100,
        .theme-dark .themed .bg-gray-100 {
          background: var(--dm-bg-hover) !important;
        }

        .themed .text-slate-900,
        .themed .text-gray-900 {
          color: var(--dm-text-primary) !important;
        }

        .themed .text-slate-700,
        .themed .text-gray-700 {
          color: var(--dm-text-secondary) !important;
        }

        .themed .text-slate-600,
        .themed .text-gray-600,
        .themed .text-slate-500,
        .themed .text-gray-500 {
          color: var(--dm-text-tertiary) !important;
        }

        .themed .border,
        .themed .border-slate-200,
        .themed .border-gray-200 {
          border-color: var(--dm-border) !important;
        }

        .theme-dark .themed .shadow-sm {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
        }

        .theme-dark .themed .shadow,
        .theme-dark .themed .shadow-md {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3) !important;
        }

        .theme-dark .themed .shadow-lg {
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4) !important;
        }

        .theme-dark .themed .shadow-xl {
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.7), 0 8px 16px rgba(0, 0, 0, 0.5) !important;
        }

        .themed .bg-sky-600,
        .themed .bg-indigo-600,
        .themed .bg-blue-600 {
          background: var(--dm-accent);
        }

        .theme-dark .themed .bg-sky-600,
        .theme-dark .themed .bg-indigo-600,
        .theme-dark .themed .bg-blue-600 {
          background: var(--dm-accent) !important;
          box-shadow: 0 4px 16px var(--dm-glow-cyan) !important;
        }

        .theme-dark .themed .bg-sky-600:hover,
        .theme-dark .themed .bg-indigo-600:hover,
        .theme-dark .themed .bg-blue-600:hover {
          background: var(--dm-accent-hover) !important;
          box-shadow: 0 6px 24px var(--dm-glow-cyan) !important;
        }

        .theme-dark .themed .bg-emerald-600,
        .theme-dark .themed .bg-green-600 {
          background: var(--dm-success) !important;
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.25) !important;
        }

        .theme-dark .themed .bg-red-600 {
          background: var(--dm-error) !important;
          box-shadow: 0 44px 16px rgba(239, 68, 68, 0.25) !important;
        }

        .theme-dark .themed .card,
        .theme-dark .themed [class*="Card"] {
          background: var(--dm-bg-elevated) !important;
          border-color: var(--dm-border) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3) !important;
        }

        .theme-dark .themed .card:hover {
          border-color: var(--dm-border) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.35) !important;
        }

        .theme-dark .themed input,
        .theme-dark .themed textarea,
        .theme-dark .themed select {
          background: var(--dm-bg-subtle) !important;
          color: var(--dm-text-primary) !important;
          border-color: var(--dm-border) !important;
        }

        .theme-dark .themed input:focus,
        .theme-dark .themed textarea:focus,
        .theme-dark .themed select:focus {
          background: var(--dm-bg-elevated) !important;
          border-color: var(--dm-accent) !important;
          box-shadow: 0 0 0 3px var(--dm-glow-cyan), 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }

        .theme-dark .themed table {
          background: var(--dm-bg-elevated) !important;
        }

        .theme-dark .themed thead {
          background: var(--dm-bg-subtle) !important;
        }

        .theme-dark .themed tbody tr {
          border-color: var(--dm-border-subtle) !important;
        }

        .theme-dark .themed tbody tr:hover {
          background: var(--dm-bg-hover) !important;
        }

        .theme-dark .themed [role="menu"],
        .theme-dark .themed [role="dialog"] {
          background: var(--dm-bg-elevated) !important;
          border-color: var(--dm-border) !important;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4) !important;
        }

        .theme-dark .themed .badge,
        .theme-dark .themed [class*="Badge"] {
          background: var(--dm-bg-subtle) !important;
          color: var(--dm-text-primary) !important;
          border: 1px solid var(--dm-border) !important;
        }

        .theme-dark .themed .text-sky-600,
        .theme-dark .themed .text-blue-600 {
          color: var(--dm-accent) !important;
        }

        .theme-dark .floating-panel {
          background: var(--dm-bg-elevated) !important;
          border-color: var(--dm-border) !important;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7), 0 8px 16px rgba(0, 0, 0, 0.5) !important;
        }

        .theme-dark .mobile-bottom-bar {
          background: var(--dm-bg-elevated) !important;
          border-top-color: var(--dm-border) !important;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4) !important;
        }

        .theme-dark .recharts-cartesian-grid-horizontal line,
        .theme-dark .recharts-cartesian-grid-vertical line {
          stroke: var(--dm-border) !important;
          opacity: 0.4;
        }

        .theme-dark .recharts-text {
          fill: var(--dm-text-tertiary) !important;
        }

        .theme-dark ::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        .theme-dark ::-webkit-scrollbar-track {
          background: var(--dm-bg-base);
        }

        .theme-dark ::-webkit-scrollbar-thumb {
          background: var(--dm-bg-subtle);
          border-radius: 6px;
          border: 3px solid var(--dm-bg-base);
        }

        .theme-dark ::-webkit-scrollbar-thumb:hover {
          background: var(--dm-bg-hover);
        }

        .theme-dark .global-watermark {
          opacity: 0.05;
          filter: saturate(0.3) brightness(1.5);
        }

        .mobile-bottom-bar {
          padding-bottom: env(safe-area-inset-bottom);
        }

        .floating-panel {
          position: fixed;
          z-index: 10020;
          right: 16px;
          bottom: 88px;
          max-width: 420px;
          width: 92vw;
          cursor: grab;
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease;
          will-change: transform;
        }

        .floating-panel.grabbing {
          cursor: grabbing;
        }

        .topnav-link {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          height: 38px !important;
          padding: 0 12px !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          text-decoration: none !important;
          border-radius: 10px !important;
          white-space: nowrap;
          flex: 0 0 auto;
          border: 1px solid transparent;
          color: var(--dm-text-primary);
          background-color: var(--dm-bg-elevated);
        }

        .topnav-link:hover {
          background-color: var(--dm-bg-hover);
        }

        .topnav-link.active {
          background-color: var(--dm-accent);
          color: white;
          border-color: var(--dm-accent);
        }

        .ghost-ink {
          color: var(--dm-text-primary) !important;
        }

        .ghost-hover:hover {
          background: var(--dm-bg-hover) !important;
        }

        [data-edit-mode="1"] .is-resizable {
          outline: 1px dashed var(--dm-text-tertiary);
          outline-offset: -2px;
          cursor: default;
        }

        [data-edit-mode="1"] .is-resizable:hover {
          box-shadow: inset 0 0 0 2px rgba(100, 116, 139, 0.15);
        }

        [data-visual] {
          opacity: 0;
          transform: translateY(8px) scale(0.995);
          transition: opacity 0.45s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }

        [data-visual].reveal-show {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .global-watermark {
          position: fixed;
          left: 14px;
          bottom: 18px;
          opacity: 0.45;
          pointer-events: none;
          z-index: 1;
          height: 24vh;
          max-height: 240px;
          filter: saturate(0.9);
        }

        @media (max-width: 768px) {
          .global-watermark {
            height: 14vh;
            max-height: 120px;
            left: 8px;
            bottom: 74px;
          }
        }
      `}</style>

      {!hideTopbar &&
        <header className="sticky top-0 z-50 themed border-b shadow-sm" style={{ background: 'var(--dm-bg-elevated)', borderColor: 'var(--dm-border)' }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Logo */}
              <Link to={createPageUrl(landingPage)} className="flex items-center gap-3 shrink-0">
                <img src={DM_LOGO} alt="King Edward VII's Hospital - Duty Managers Admin Centre" className="h-16 w-auto" />
              </Link>

              {/* Main Navigation - Desktop */}
              {!isRotaGrid &&
                <nav className="hidden lg:flex items-center gap-2 mx-4">
                  {visibleNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.label} to={createPageUrl(item.to)} className={`topnav-link ${isActive(item.to) ? "active" : ""}`}>
                        <Icon className="w-4 h-4" />
                        {item.displayLabel || item.label}
                      </Link>
                    );
                  })}
                </nav>
              }

              {/* RotaGrid Controls */}
              {isRotaGrid && rotaState &&
                <div className="flex items-center gap-2 mx-2 flex-1 overflow-x-auto no-scrollbar mask-fade-right">
                  {/* Department & View Controls Group */}
                  <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg border shrink-0" style={{ background: 'var(--dm-bg-subtle)', borderColor: 'var(--dm-border)' }}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 themed" title="Select departments">
                          <TableIcon className="w-4 h-4" />
                          <span className="text-xs font-medium hidden 2xl:inline">Departments</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[280px] p-2 themed">
                        <div className="space-y-1">
                          <div
                            className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-slate-100 ${rotaState.selectedDepts.includes("all") ? "bg-slate-100" : ""}`
                            }
                            onClick={() => rotaState.setSelectedDepts((prev) => {
                              const newSelected = prev.includes("all") ? [] : ["all"];
                              if (rotaState.defaultDeptEnabled) rotaState.persistDeptDefault(false);
                              return newSelected;
                            })}>

                            <input type="checkbox" checked={rotaState.selectedDepts.includes("all")} readOnly className="w-4 h-4" />
                            <span className="text-sm font-medium">All departments</span>
                          </div>
                          {rotaState.deptOptions.map((dept) =>
                            <div
                              key={dept.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-slate-100 ${rotaState.selectedDepts.includes(dept.id) && !rotaState.selectedDepts.includes("all") ? "bg-slate-100" : ""}`
                              }
                              onClick={() => {
                                rotaState.setSelectedDepts((prev) => {
                                  const filtered = prev.filter((id) => id !== "all");
                                  let newDepts = filtered.includes(dept.id) ?
                                    filtered.filter((id) => id !== dept.id) :
                                    [...filtered, dept.id];
                                  if (rotaState.defaultDeptEnabled) rotaState.persistDeptDefault(false);
                                  return newDepts.length === 0 ? ["all"] : newDepts;
                                });
                              }}>

                              <input type="checkbox" checked={rotaState.selectedDepts.includes(dept.id) && !rotaState.selectedDepts.includes("all")} readOnly className="w-4 h-4" />
                              <span className="text-sm">{dept.name}</span>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <div className="h-5 w-px" style={{ background: 'var(--dm-border)' }} />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 themed" title="View options">
                          <SlidersHorizontal className="w-4 h-4" />
                          <span className="text-xs font-medium hidden 2xl:inline">View</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="themed">
                        <DropdownMenuItem onClick={() => { rotaState.setPeriod("day"); rotaState.setCustomRange(false); }}>Day view</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { rotaState.setPeriod("week"); rotaState.setCustomRange(false); }}>Week view</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { rotaState.setPeriod("4weeks"); rotaState.setCustomRange(false); }}>4-week view</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { rotaState.setPeriod("month"); rotaState.setCustomRange(false); }}>Month view</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          rotaState.setPeriod("today");
                          rotaState.setCurrentDate(new Date());
                          rotaState.setCustomRange(false);
                        }}>Today view</DropdownMenuItem>
                        <DropdownMenuCheckboxItem
                          checked={rotaState.compactRows}
                          onCheckedChange={rotaState.setCompactRows}>
                          Compact rows
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={rotaState.showWeekends}
                          onCheckedChange={rotaState.setShowWeekends}>
                          Show weekends
                        </DropdownMenuCheckboxItem>
                        {rotaState.canManage &&
                          <DropdownMenuCheckboxItem
                            checked={rotaState.dmOnlyToggle}
                            onCheckedChange={rotaState.setDmOnlyToggle}>
                            DM-only departments
                          </DropdownMenuCheckboxItem>
                        }
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      onClick={() => rotaState.setShowFilters((v) => !v)}
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-2 themed"
                      title="Toggle filters">
                      <Filter className="w-4 h-4" />
                      <span className="text-xs font-medium hidden 2xl:inline">Filters</span>
                    </Button>
                    </div>

                    {/* Navigation Controls Group */}
                    <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg border shrink-0" style={{ background: 'var(--dm-bg-subtle)', borderColor: 'var(--dm-border)' }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 themed"
                      onClick={() => {
                        if (rotaState.rangeLocked) return;
                        const period = rotaState.period;
                        if (period === "week") {
                          rotaState.setCurrentDate(addDays(rotaState.currentDate, -7));
                        } else if (period === "4weeks") {
                          rotaState.setCurrentDate(addDays(rotaState.currentDate, -28));
                        } else if (period === "day" || period === "today") {
                          rotaState.setCurrentDate(addDays(rotaState.currentDate, -1));
                        } else {
                          rotaState.setCurrentDate(subMonths(rotaState.currentDate, 1));
                        }
                        rotaState.setCustomRange(false);
                      }}
                      disabled={rotaState.rangeLocked}
                      title="Previous period">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <DateRangePicker
                      start={rotaState.rangeStart ? parseISO(rotaState.rangeStart) : undefined}
                      end={rotaState.rangeEnd ? parseISO(rotaState.rangeEnd) : undefined}
                      onChange={async ({ start, end }) => {
                        const toStr = (d) => d ? format(d, "yyyy-MM-dd") : "";
                        const s = toStr(start);
                        const e = toStr(end);
                        rotaState.setRangeStart(s);
                        rotaState.setRangeEnd(e);
                        const isCustom = Boolean(s && e);
                        rotaState.setCustomRange(isCustom);
                        if (s) rotaState.setCurrentDate(parseISO(s));
                        if (rotaState.currentUser) {
                          const next = {
                            ...(rotaState.currentUser?.settings || {}),
                            defaults: {
                              ...(rotaState.currentUser?.settings?.defaults || {}),
                              rangeLock: {
                                locked: rotaState.rangeLocked,
                                customRange: isCustom,
                                rangeStart: s,
                                rangeEnd: e
                              }
                            }
                          };
                          await User.updateMyUserData({ settings: next });
                        }
                      }} />


                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 themed"
                      onClick={() => {
                        if (rotaState.rangeLocked) return;
                        const period = rotaState.period;
                        if (period === "week") {
                          rotaState.setCurrentDate(addDays(rotaState.currentDate, 7));
                        } else if (period === "4weeks") {
                          rotaState.setCurrentDate(addDays(rotaState.currentDate, 28));
                        } else if (period === "day" || period === "today") {
                          rotaState.setCurrentDate(addDays(rotaState.currentDate, 1));
                        } else {
                          rotaState.setCurrentDate(addMonths(rotaState.currentDate, 1));
                        }
                        rotaState.setCustomRange(false);
                      }}
                      disabled={rotaState.rangeLocked}
                      title="Next period">
                      <ChevronRight className="w-4 h-4" />
                    </Button>

                    <div className="h-5 w-px mx-1" style={{ background: 'var(--dm-border)' }} />

                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={rotaState.rangeLocked}
                        onCheckedChange={rotaState.toggleRangeLock}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-300 scale-75" />
                      <Lock className={`w-3.5 h-3.5 ${rotaState.rangeLocked ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                  </div>

                  {/* Actions Group Removed */}
                    </div>
                    }

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" className="ghost-ink ghost-hover h-9 w-9 p-0 hidden md:inline-flex" onClick={() => setCalculatorOpen(!calculatorOpen)} title="Calculator">
                  <Calculator className="w-4 h-4" />
                </Button>

                {/* Leave counter removed */}

                <Button variant="ghost" className="relative ghost-ink ghost-hover h-9 w-9 p-0 hidden md:inline-flex" onClick={() => setCommsOpen(true)} title="Communications">
                  <Inbox className="w-4 h-4" />
                  {Array.isArray(unreadAnnouncements) && unreadAnnouncements.length > 0 &&
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-none">
                      {Math.min(unreadAnnouncements.length, 9)}
                    </span>
                  }
                </Button>

                {(user?.role === "admin" || user?.access_level === "manager") &&
                  <Button 
                    size="sm" 
                    className="bg-red-600 hover:bg-red-700 text-white hidden md:inline-flex gap-2" 
                    onClick={() => window.location.href = createPageUrl(isTrainingMode ? "TrainingAdminHub" : "AdminHub")} 
                    title="Admin tools"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    <span className="text-xs font-medium">Admin</span>
                  </Button>
                }

                {!isRotaGrid &&
                  <Button variant={editMode ? "default" : "outline"} onClick={toggleEditMode} title="Toggle layout edit mode" className="hidden md:inline-flex gap-2 themed">
                    <Wrench className="w-4 h-4" />
                    <span className="text-xs font-medium">{editMode ? "Editing" : "Edit"}</span>
                  </Button>
                }

                <Button variant="ghost" className="ghost-ink ghost-hover h-9 w-9 p-0 hidden md:inline-flex" onClick={toggleTheme} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="ghost-ink ghost-hover h-9 w-9 p-0 hidden md:inline-flex">
                      <SettingsIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 themed">
                    {access !== "staff" &&
                    <DropdownMenuItem onClick={() => window.location.href = createPageUrl("UploadTemplate")}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Template
                    </DropdownMenuItem>
                    }

                    <DropdownMenuItem onClick={() => window.location.href = createPageUrl("Compliance")}>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Compliance
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.href = createPageUrl("AppWiki")}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      AppWiki
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.href = createPageUrl("RiskRegister")}>
                      <FileText className="w-4 h-4 mr-2" />
                      Risk Register
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {visibleNav.map((item) =>
                      <DropdownMenuItem key={`m-${item.label}`} onClick={() => window.location.href = createPageUrl(item.to)}>
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.displayLabel || item.label}
                      </DropdownMenuItem>
                    )}
                    {(user?.role === "admin" || user?.access_level === "manager") &&
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setCommsOpen(true)}>
                          <Megaphone className="w-4 h-4 mr-2" />
                          Announcements
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.location.href = createPageUrl("UserApprovals")}>
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          User Approvals
                        </DropdownMenuItem>
                      </>
                    }
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setWhatsAppOpen(true)}>
                      <Mail className="w-4 h-4 mr-2" />
                      WhatsApp Notifier
                    </DropdownMenuItem>
                    {access !== "staff" &&
                    <DropdownMenuItem onClick={() => setRandomiserOpen(true)}>
                      <Shuffle className="w-4 h-4 mr-2" />
                      Shift Randomiser
                    </DropdownMenuItem>
                    }
                    {(user?.role === "admin" || user?.access_level === "manager") &&
                      <DropdownMenuItem onClick={() => { const url = agentSDK.getWhatsAppConnectURL('shift_notifier'); window.open(url, '_blank'); }}>
                        <Mail className="w-4 h-4 mr-2" />
                        WhatsApp Agent
                      </DropdownMenuItem>
                    }
                    <DropdownMenuSeparator />
                    {user ?
                      <DropdownMenuItem onClick={signOut}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem> :

                      <DropdownMenuItem onClick={() => User.login()}>
                        Sign In
                      </DropdownMenuItem>
                    }
                  </DropdownMenuContent>
                </DropdownMenu>

                {user &&
                  <Button 
                    size="sm" 
                    onClick={() => window.location.href = createPageUrl(isTrainingMode ? "ToolLauncher" : "TrainingToolLauncher")}
                    className={`hidden md:inline-flex gap-2 mr-2 ${isTrainingMode ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-xs font-medium">{isTrainingMode ? "Exit Training" : "Training Mode"}</span>
                  </Button>
                }

                {user ?
                  <Button size="sm" onClick={signOut} className="bg-red-600 hover:bg-red-700 text-white hidden md:inline-flex gap-2">
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs font-medium">Sign Out</span>
                  </Button> :

                  <Button variant="outline" size="sm" onClick={() => User.login()} className="hidden md:inline-flex themed">
                    Sign In
                  </Button>
                }
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center gap-1">
                <Button variant="ghost" className="ghost-ink ghost-hover px-2" onClick={() => setCalculatorOpen(!calculatorOpen)}>
                  <Calculator className="w-4 h-4" />
                </Button>
                <Button variant="ghost" className="relative ghost-ink ghost-hover px-2" onClick={() => setCommsOpen(true)}>
                  <Inbox className="w-4 h-4" />
                  {Array.isArray(unreadAnnouncements) && unreadAnnouncements.length > 0 &&
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-none">
                      {Math.min(unreadAnnouncements.length, 9)}
                    </span>
                  }
                </Button>
                <Button variant="ghost" className="ghost-ink ghost-hover px-2" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" className="ghost-ink ghost-hover px-2" onClick={() => setMobileOpen((v) => !v)}>
                  <MenuIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileOpen &&
            <div className="md:hidden pb-2 pt-2 themed" style={{ borderTop: '1px solid var(--dm-border)' }}>
              <div className="flex flex-col gap-1 px-4">
                {visibleNav.map((item) =>
                  <Link key={`m-${item.label}`} to={createPageUrl(item.to)} onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium ${isActive(item.to) ? "bg-sky-50 text-sky-700 theme-dark:bg-sky-900 theme-dark:text-sky-300" : "hover:bg-slate-50 theme-dark:hover:bg-slate-800"}`} style={!isActive(item.to) ? { color: 'var(--dm-text-primary)' } : {}}>
                    <item.icon className="w-4 h-4" />
                    {item.displayLabel || item.label}
                  </Link>
                )}
                {access !== "staff" &&
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 justify-start rounded-md font-medium text-slate-700 hover:bg-slate-50" onClick={() => { window.location.href = createPageUrl("UploadTemplate"); setMobileOpen(false); }}>
                  <Upload className="w-4 h-4" />
                  Upload Template
                </Button>
                }
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 justify-start rounded-md font-medium text-slate-700 hover:bg-slate-50" onClick={() => { window.location.href = createPageUrl("Compliance"); setMobileOpen(false); }}>
                  <ShieldCheck className="w-4 h-4" />
                  Compliance
                </Button>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 justify-start rounded-md font-medium text-slate-700 hover:bg-slate-50" onClick={() => { window.location.href = createPageUrl("AppWiki"); setMobileOpen(false); }}>
                  <BookOpen className="w-4 h-4" />
                  AppWiki
                </Button>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 justify-start rounded-md font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setWhatsAppOpen(true); setMobileOpen(false); }}>
                  <Mail className="w-4 h-4" />
                  WhatsApp Notifier
                </Button>
                {access !== "staff" &&
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 justify-start rounded-md font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setRandomiserOpen(true); setMobileOpen(false); }}>
                  <Shuffle className="w-4 h-4" />
                  Shift Randomiser
                </Button>
                }
                {(user?.role === "admin" || user?.access_level === "manager") &&
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 justify-start rounded-md font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setCommsOpen(true); setMobileOpen(false); }}>
                    <Megaphone className="w-4 h-4" />
                    Announcements
                  </Button>
                }
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-200">
                  <Button variant={editMode ? "default" : "outline"} onClick={() => { toggleEditMode(); setMobileOpen(false); }}>
                    <Wrench className="w-4 h-4 mr-2" />
                    {editMode ? "Editing" : "Edit layout"}
                  </Button>
                  {user ?
                    <Button size="sm" onClick={signOut} className="bg-red-600 hover:bg-red-700 text-white">
                      <LogOut className="w-4 h-4 mr-1" /> Sign Out
                    </Button> :

                    <Button size="sm" variant="outline" onClick={() => User.login()}>
                      Sign In
                    </Button>
                  }
                </div>
              </div>
            </div>
          }
        </header>
      }

      <div className="flex-1 pb-16 md:pb-0 themed flex flex-col">
        {!authChecked ?
          <div className="h-full flex-1 flex items-center justify-center p-8 text-slate-500 text-sm">Loading…</div> :
          !user ?
            <div className="min-h-[80vh] flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
              <div className="w-full max-w-5xl relative z-10 grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                <div className="md:col-span-2 flex flex-col items-center md:items-start text-center md:text-left">
                  <img src={orgLogo || LOGO_FALLBACK} alt="Brand" className="w-[260px] md:w-[320px] h-auto mb-4" />
                  <div className="text-slate-700 max-w-sm">
                    A simple way to view schedules, manage rotas, and keep teams aligned.
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Official access portal: erosterapp.bellezas.co.uk
                  </div>
                </div>

                <div className="md:col-span-3">
                  <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg p-6 md:p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl md:text-2xl font-semibold text-slate-900">Welcome</h2>
                      <img src={WATERMARK_LOGO} alt="Hospital crest" className="h-10 w-auto opacity-80" />
                    </div>
                    <p className="text-sm text-slate-600 mb-6">
                      Sign in to access your schedules, team tools, and announcements.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={() => User.login()} className="bg-indigo-600 hover:bg-indigo-700">
                        Sign In
                      </Button>
                      <Button variant="outline" onClick={() => User.login()} className="border-slate-300">
                        Create Account
                      </Button>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                      Need help? Use your work email to sign in.
                    </div>
                  </div>
                </div>
              </div>
            </div> :
            user.status && user.status !== "approved" || user.domain_valid === false ?
              <PendingApproval email={user.email} allowedDomain={ALLOWED_DOMAIN} status={user.status || "pending"} onLogout={signOut} /> :

              <>
                {!permsLoaded || !currentPageName || canRoleSee(currentPageName, "page") ?
                  children :

                  <div className="p-6 md:p-8">
                    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                      <h2 className="text-lg font-semibold text-slate-900 mb-1">Restricted</h2>
                      <p className="text-sm text-slate-600">
                        Your role does not have access to this page.
                      </p>
                    </div>
                  </div>
                }
              </>
        }

        <img src={WATERMARK_LOGO} alt="Hospital watermark" className="global-watermark" />

        {user &&
          <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 mobile-bottom-bar">
            <div className="grid grid-cols-4">
              {visibleNav.map((item) => {
                const active = isActive(item.to);
                const NavIcon = item.icon;
                return (
                  <Link key={item.to} to={createPageUrl(item.to)} className={`flex flex-col items-center justify-center py-2 text-xs ${active ? "text-sky-700" : "text-slate-600"}`}>
                    <NavIcon className={`w-5 h-5 ${active ? "text-sky-700" : "text-slate-500"}`} />
                    <span className="mt-0.5">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        }

        {user &&
          <OnlineUsersWidget />
        }

        {calculatorOpen && <FloatingCalculator onClose={() => setCalculatorOpen(false)} className="floating-panel" data-floating-key="calculator" />}
        {whatsAppOpen && <WhatsAppTool onClose={() => setWhatsAppOpen(false)} className="floating-panel" data-floating-key="whatsapp_tool" />}
        {randomiserOpen && <ShiftRandomiser onClose={() => setRandomiserOpen(false)} className="floating-panel" data-floating-key="shift_randomiser" />}
        {commsOpen && user && <CommsCenter onClose={() => setCommsOpen(false)} className="floating-panel" data-floating-key="comms_center" />}
        {/* Removed AIAssistant component rendering */}
        {/* {aiAssistantOpen && user && <AIAssistant onClose={() => setAiAssistantOpen(false)} className="floating-panel" data-floating-key="ai_assistant" />} */}
        {announceOpen && user &&
          <LoginAnnouncementPopup
            items={unreadAnnouncements}
            onClose={() => setAnnounceOpen(false)}
            onMarkAllRead={async () => {
              try {
                const items = unreadAnnouncements || [];
                for (let i = 0; i < items.length; i++) {
                  await AnnouncementInbox.update(items[i].id, { status: "read", read_at: new Date().toISOString() });
                }
              } finally {
                setAnnounceOpen(false);
                const refreshed = await AnnouncementInbox.filter({ user_email: user.email, status: "unread" });
                setUnreadAnnouncements(refreshed || []);
              }
            }} />

        }

        {!hideTopbar &&
          <footer className="px-3 py-2 text-right text-xs text-slate-500">Created by: RaymundB DM v.1 2025</footer>
        }
      </div>
    </div>
  );

}