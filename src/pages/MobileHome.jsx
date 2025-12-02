import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { User } from "@/entities/User";
import { Employee } from "@/entities/Employee";
import { Shift } from "@/entities/Shift";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, ChevronRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { withRetry } from "@/components/utils/withRetry";

export default function MobileHome() {
  const [me, setMe] = React.useState(null);
  const [myEmployee, setMyEmployee] = React.useState(null);
  const [myShifts, setMyShifts] = React.useState([]);
  const [openShiftsToday, setOpenShiftsToday] = React.useState(0);

  const today = React.useMemo(() => new Date(), []);
  const todayStr = React.useMemo(() => format(today, "yyyy-MM-dd"), [today]);
  const niceToday = React.useMemo(() => format(today, "EEE, d MMM"), [today]);

  React.useEffect(() => {
    (async () => {
      const u = await withRetry(() => User.me());
      setMe(u);
      const emps = await withRetry(() => Employee.list());
      const mine = (emps || []).find(e => (e.user_email || "").toLowerCase() === (u.email || "").toLowerCase());
      setMyEmployee(mine || null);

      const shifts = await withRetry(() => Shift.list("-date", 1000));
      const my = (shifts || []).filter(s => s.date === todayStr && s.employee_id && mine && s.employee_id === mine.id);
      setMyShifts(my);

      const opens = (shifts || []).filter(s => s.date === todayStr && s.is_open).length;
      setOpenShiftsToday(opens);
    })();
  }, [todayStr]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Hello{me?.full_name ? `, ${me.full_name.split(' ')[0]}` : ""}</h1>
            <p className="text-sm text-slate-600">{niceToday}</p>
          </div>
          <Link to={createPageUrl("RotaGrid")}>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              Rotas
            </Button>
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-base">My shifts today</CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              {myEmployee ? (
                myShifts.length > 0 ? (
                  <ul className="space-y-2">
                    {myShifts.map(s => (
                      <li key={s.id} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">{s.shift_code || "Shift"}</Badge>
                          <span className="text-sm text-slate-700">{(s.start_time || "").slice(0,5)}–{(s.end_time || "").slice(0,5)}</span>
                        </div>
                        <span className="text-xs text-slate-500">{s.status || "scheduled"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-600">No shifts scheduled today.</div>
                )
              ) : (
                <div className="text-sm text-slate-600">We couldn’t link your profile to a staff record yet.</div>
              )}
              <div className="mt-3 flex justify-end">
                <Link to={createPageUrl("EmployeeProfile")}>
                  <Button variant="ghost" size="sm" className="text-sky-700">
                    View profile
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-base">Open shifts today</CardTitle>
            </CardHeader>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="text-sm text-slate-700">
                {openShiftsToday > 0 ? `${openShiftsToday} available` : "None available"}
              </div>
              <Link to={createPageUrl("OpenShifts")}>
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700">
                  View
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <div className="grid grid-cols-2 gap-3">
                <Link to={createPageUrl("Requests")}>
                  <Button variant="outline" className="w-full justify-center gap-2">
                    <Bell className="w-4 h-4" />
                    Request
                  </Button>
                </Link>
                <Link to={createPageUrl("RotaGrid")}>
                  <Button variant="outline" className="w-full justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    My rota
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}