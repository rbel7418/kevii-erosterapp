
import React, { useState, useEffect } from "react";
import { Employee, Department, Role } from "@/entities/all";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Upload } from "lucide-react";

import EmployeeList from "../components/team/EmployeeList";
import EmployeeDialog from "../components/team/EmployeeDialog";
import EmployeeUploadDialog from "../components/team/EmployeeUploadDialog";

export default function Team() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [employeesData, deptData, rolesData] = await Promise.all([
        Employee.list(),
        Department.list(),
        Role.list()
      ]);

      setEmployees(employeesData);
      setDepartments(deptData);
      setRoles(rolesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSaveEmployee = async (employeeData) => {
    try {
      if (selectedEmployee) {
        await Employee.update(selectedEmployee.id, employeeData);
      } else {
        await Employee.create(employeeData);
      }
      await loadData();
      setShowDialog(false);
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowDialog(true);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 themed min-h-screen" style={{ background: 'linear-gradient(to bottom right, var(--dm-bg-base), var(--dm-bg-subtle))' }}>
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="app-title" style={{ color: 'var(--dm-text-primary)' }}>Team Management</h1>
            <p className="app-subtitle" style={{ color: 'var(--dm-text-tertiary)' }}>Manage your healthcare team members</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowUploadDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="app-icon" />
              Upload List
            </Button>
            <Button
              onClick={() => {
                setSelectedEmployee(null);
                setShowDialog(true);
              }}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              <Plus className="app-icon mr-2" />
              Add Team Member
            </Button>
          </div>
        </div>

        <Card className="shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 app-icon" style={{ color: 'var(--dm-text-tertiary)' }} />
              <Input
                placeholder="Search by name or employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="border-b" style={{ borderColor: 'var(--dm-border)' }}>
            <CardTitle className="flex items-center gap-2">
              <Users className="app-icon text-teal-600" />
              Team Members ({filteredEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <EmployeeList
              employees={filteredEmployees}
              departments={departments}
              roles={roles}
              onEdit={handleEditEmployee}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {showDialog && (
          <EmployeeDialog
            open={showDialog}
            onClose={() => setShowDialog(false)}
            onSave={handleSaveEmployee}
            employee={selectedEmployee}
            departments={departments}
            roles={roles}
          />
        )}

        {showUploadDialog && (
          <EmployeeUploadDialog
            open={showUploadDialog}
            onClose={() => setShowUploadDialog(false)}
            onUpload={loadData}
            departments={departments}
            roles={roles}
          />
        )}
      </div>
    </div>
  );
}
