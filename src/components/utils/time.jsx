import { format, parseISO } from "date-fns";

export function formatTime(time) {
  if (!time) return "";
  return String(time);
}

export function formatDate(date, pattern = "dd/MM/yyyy") {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, pattern);
  } catch {
    return String(date);
  }
}

export function formatDateTime(date, pattern = "dd/MM/yyyy HH:mm") {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, pattern);
  } catch {
    return String(date);
  }
}

export function calcShiftHoursSafe(startTime, endTime, breakMinutes = 0) {
  try {
    if (!startTime || !endTime) return 0;
    
    const [startHour, startMin] = String(startTime).split(":").map(Number);
    const [endHour, endMin] = String(endTime).split(":").map(Number);
    
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) return 0;
    
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    
    totalMinutes -= (breakMinutes || 0);
    
    return Math.max(0, totalMinutes / 60);
  } catch {
    return 0;
  }
}