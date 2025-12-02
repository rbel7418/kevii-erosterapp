
import React, { useState, useEffect } from "react";
import { Leave, Employee } from "@/entities/all";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, Check, X, Clock } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

import LeaveRequestDialog from "../components/leave/LeaveRequestDialog";

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [myEmployee, setMyEmployee] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      const [leavesData, employeesData] = await Promise.all([
        Leave.list("-created_date"),
        Employee.list()
      ]);

      setLeaves(leavesData);
      setEmployees(employeesData);

      const emp = employeesData.find(e => e.user_email === user.email);
      setMyEmployee(emp);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSubmitRequest = async (leaveData) => {
    try {
      const days = differenceInDays(parseISO(leaveData.end_date), parseISO(leaveData.start_date)) + 1;
      await Leave.create({
        ...leaveData,
        employee_id: myEmployee.id,
        days_count: days
      });
      await loadData();
      
      if (currentUser.access_level === 'staff') {
        await User.updateMyUserData({
          annual_leave_used: (currentUser.annual_leave_used || 0) + days
        });
      }
      
      setShowDialog(false);
    } catch (error) {
      console.error("Error submitting leave request:", error);
    }
  };

  const handleApprove = async (leave) => {
    try {
      await Leave.update(leave.id, {
        ...leave,
        status: "approved",
        reviewed_by: currentUser.email,
        reviewed_date: new Date().toISOString()
      });
      await loadData();
    } catch (error) {
      console.error("Error approving leave:", error);
    }
  };

  const handleReject = async (leave) => {
    if (confirm("Are you sure you want to reject this leave request?")) {
      try {
        await Leave.update(leave.id, {
          ...leave,
          status: "rejected",
          reviewed_by: currentUser.email,
          reviewed_date: new Date().toISOString()
        });
        await loadData();
      } catch (error) {
        console.error("Error rejecting leave:", error);
      }
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.user_email?.split('@')[0] || "Unknown";
  };

  const canManage = (currentUser?.role === 'admin') ||
    (currentUser?.access_level === 'admin') ||
    (currentUser?.access_level === 'manager');

  const filteredLeaves = leaves.filter(l => {
    if (!canManage && l.employee_id !== myEmployee?.id) return false;
    return l.status === activeTab || (activeTab === "all");
  });

  const LeaveCard = ({ leave }) => {
    const isMyRequest = leave.employee_id === myEmployee?.id;
    
    return (
      <div className="p-5 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
              {getEmployeeName(leave.employee_id)[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {getEmployeeName(leave.employee_id)}
              </h3>
              <p className="text-sm text-slate-500">
                {format(parseISO(leave.start_date), 'MMM d')} - {format(parseISO(leave.end_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <Badge className={
            leave.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
            leave.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
            'bg-orange-100 text-orange-700 border-orange-200'
          }>
            {leave.status}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Type:</span>
            <span className="font-medium capitalize">{leave.leave_type.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Duration:</span>
            <span className="font-medium">{leave.days_count} days</span>
          </div>
          {leave.reason && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-700">{leave.reason}</p>
            </div>
          )}
        </div>

        {leave.status === 'pending' && canManage && !isMyRequest && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              size="sm"
              onClick={() => handleApprove(leave)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(leave)}
              className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* CHANGED: full width */}
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="app-title">Leave Requests</h1>
            <p className="app-subtitle">Manage time off requests</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            disabled={!myEmployee}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Request Leave
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Leave Days</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {currentUser?.annual_leave_days || 0}
                  </p>
                </div>
                <CalendarIcon className="w-5 h-5 text-teal-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Days Used</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {currentUser?.annual_leave_used || 0}
                  </p>
                </div>
                <Check className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Days Remaining</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {(currentUser?.annual_leave_days || 0) - (currentUser?.annual_leave_used || 0)}
                  </p>
                </div>
                <Clock className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                {canManage && <TabsTrigger value="pending">Pending</TabsTrigger>}
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {filteredLeaves.map(leave => (
                <LeaveCard key={leave.id} leave={leave} />
              ))}
              {filteredLeaves.length === 0 && (
                <div className="col-span-2 text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No leave requests found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {showDialog && (
          <LeaveRequestDialog
            open={showDialog}
            onClose={() => setShowDialog(false)}
            onSubmit={handleSubmitRequest}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}
