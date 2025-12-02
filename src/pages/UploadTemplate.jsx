import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, Building2, Users, CheckCircle, AlertCircle } from "lucide-react";
import { Department, Employee } from "@/entities/all";
import { downloadCsvTemplate } from "@/components/utils/csv";

export default function UploadTemplate() {
  const [departmentFile, setDepartmentFile] = useState(null);
  const [staffFile, setStaffFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleDepartmentTemplate = () => {
    downloadCsvTemplate("departments_template.csv", [
      "department_id",
      "name",
      "code",
      "color",
      "is_active"
    ]);
  };

  const handleStaffTemplate = () => {
    downloadCsvTemplate("staff_template.csv", [
      "Employee_id",
      "Full Name",
      "Date of Join",
      "Job Title",
      "Job Cost Centre",
      "Reports To",
      "role_ids",
      "department_Code",
      "department_id",
      "Contract Type",
      "contracted_hours_weekly",
      "phone",
      "is_active"
    ]);
  };

  // PROPER CSV PARSER that handles quoted fields, commas inside quotes, etc.
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/);
    const result = [];
    
    for (let line of lines) {
      if (!line.trim()) continue;
      
      const row = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Push last field
      row.push(current.trim());
      
      if (row.length > 0 && row.some(cell => cell !== '')) {
        result.push(row);
      }
    }
    
    return result;
  };

  const readCsv = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        
        try {
          const rows = parseCSV(text);
          
          if (rows.length < 2) {
            reject(new Error("CSV file must have headers and at least one data row"));
            return;
          }
          
          const headers = rows[0].map(h => h.trim());
          const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, i) => {
              obj[header] = row[i] || "";
            });
            return obj;
          });
          
          resolve(data);
        } catch (err) {
          reject(new Error(`Failed to parse CSV: ${err.message}`));
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleDepartmentUpload = async () => {
    if (!departmentFile) return;
    
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await readCsv(departmentFile);
      
      // Validate required fields
      const missingNames = data.filter((row, idx) => !row.name?.trim()).map((_, idx) => idx + 2);
      if (missingNames.length > 0) {
        setError(`Missing required field "name" in rows: ${missingNames.join(', ')}`);
        setUploading(false);
        return;
      }
      
      const departments = data.map(row => ({
        department_id: row.department_id || undefined,
        name: row.name,
        code: row.code,
        color: row.color || "#0ea5e9",
        is_active: row.is_active === "false" ? false : true
      }));

      await Department.bulkCreate(departments);
      setSuccess(`Successfully uploaded ${departments.length} departments`);
      setDepartmentFile(null);
    } catch (err) {
      setError(`Department upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleStaffUpload = async () => {
    if (!staffFile) return;
    
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // CRITICAL: Fetch all departments first to resolve department_id
      const allDepartments = await Department.list();
      
      // Build lookup maps for department matching
      const deptByBusinessId = {};
      const deptByCode = {};
      allDepartments.forEach(d => {
        // Map by business key (department_id field)
        if (d.department_id) {
          deptByBusinessId[String(d.department_id).trim().toLowerCase()] = d;
        }
        // Map by code
        if (d.code) {
          deptByCode[String(d.code).trim().toLowerCase()] = d;
        }
        // Map by name (case-insensitive)
        if (d.name) {
          deptByCode[String(d.name).trim().toLowerCase()] = d;
        }
      });

      const data = await readCsv(staffFile);
      
      // Check what headers are actually present
      if (data.length > 0) {
        const firstRow = data[0];
        const availableHeaders = Object.keys(firstRow);
        console.log("CSV Headers found:", availableHeaders);
      }
      
      // CRITICAL: Validate required fields BEFORE processing
      // Support multiple possible header names
      const missingEmployeeId = [];
      const missingFullName = [];
      
      data.forEach((row, idx) => {
        const rowNum = idx + 2; // +2 because row 1 is headers
        
        // Check for Employee_id under various possible headers
        const empId = row.Employee_id || row.employee_id || row["Employee Code"] || row.EmployeeCode || "";
        const fullName = row["Full Name"] || row.full_name || row.Name || "";
        
        if (!empId.trim()) {
          missingEmployeeId.push(rowNum);
        }
        if (!fullName.trim()) {
          missingFullName.push(rowNum);
        }
      });
      
      if (missingEmployeeId.length > 0) {
        setError(`REQUIRED FIELD MISSING: "Employee_id" is empty in rows: ${missingEmployeeId.join(', ')}. Every staff member MUST have a unique Employee_id (e.g., EMP001, STAFF_123).`);
        setUploading(false);
        return;
      }
      
      if (missingFullName.length > 0) {
        setError(`REQUIRED FIELD MISSING: "Full Name" is empty in rows: ${missingFullName.join(', ')}.`);
        setUploading(false);
        return;
      }
      
      const staff = data.map(row => {
        // Support multiple possible header names for employee_id
        const empId = row.Employee_id || row.employee_id || row["Employee Code"] || row.EmployeeCode || "";
        const fullName = row["Full Name"] || row.full_name || row.Name || "";
        
        // CRITICAL: Resolve department_id (business key or code) to Department.id (system key)
        let resolvedDeptId = "";
        
        // Try department_id (business key) first
        const deptIdValue = row.department_id || row.Department_id || row["Department ID"] || "";
        if (deptIdValue) {
          const key = String(deptIdValue).trim().toLowerCase();
          const dept = deptByBusinessId[key] || deptByCode[key];
          if (dept) {
            resolvedDeptId = dept.id; // Store system key
          }
        }
        
        // Fallback to department_Code
        const deptCodeValue = row.department_Code || row.Department_Code || row["Department Code"] || "";
        if (!resolvedDeptId && deptCodeValue) {
          const key = String(deptCodeValue).trim().toLowerCase();
          const dept = deptByCode[key];
          if (dept) {
            resolvedDeptId = dept.id; // Store system key
          }
        }

        return {
          employee_id: empId, // REQUIRED - business key
          full_name: fullName, // REQUIRED
          user_email: row.user_email || `${fullName?.toLowerCase().replace(/\s+/g, ".")}@placeholder.local`,
          date_of_join: row["Date of Join"] || row.date_of_join || "",
          job_title: row["Job Title"] || row.job_title || "",
          cost_centre: row["Job Cost Centre"] || row.cost_centre || "",
          reports_to: row["Reports To"] || row.reports_to || "",
          role_ids: (row.role_ids || "").split(';').map(r => r.trim()).filter(r => r),
          department_id: resolvedDeptId, // Stores Department.id (system key)
          contract_type: row["Contract Type"] || row.contract_type || "Permanent",
          contracted_hours_weekly: parseFloat(row.contracted_hours_weekly || row["Contracted Hours Weekly"] || "40") || 40,
          phone: row.phone || row.Phone || "",
          is_active: (row.is_active || "true") === "false" ? false : true
        };
      });

      await Employee.bulkCreate(staff);
      setSuccess(`Successfully uploaded ${staff.length} staff members`);
      setStaffFile(null);
    } catch (err) {
      setError(`Staff upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Upload Template</h1>
          <p className="text-lg text-slate-600 mt-2">
            Bulk upload departments and staff members with unique IDs for easy tracking
          </p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="departments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="departments">
              <Building2 className="w-4 h-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="staff">
              <Users className="w-4 h-4 mr-2" />
              Staff List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departments">
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  Upload Departments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Required Fields:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li><strong className="text-red-600">name:</strong> Department name (e.g., Ward 2, Emergency) — <span className="text-red-600 font-bold">REQUIRED</span></li>
                    <li><strong>department_id:</strong> Unique identifier (e.g., DEPT001, WARD_A) — Optional but recommended</li>
                    <li><strong>code:</strong> Short code (e.g., W2, EMG) — Optional</li>
                    <li><strong>color:</strong> Hex color code (e.g., #0ea5e9) — Optional (defaults to #0ea5e9)</li>
                    <li><strong>is_active:</strong> true or false — Optional (defaults to true)</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleDepartmentTemplate} variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Template
                  </Button>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setDepartmentFile(e.target.files[0])}
                    className="hidden"
                    id="dept-upload"
                  />
                  <label htmlFor="dept-upload" className="cursor-pointer">
                    <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      {departmentFile ? departmentFile.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-slate-500">CSV file with department data</p>
                  </label>
                </div>

                <Button
                  onClick={handleDepartmentUpload}
                  disabled={!departmentFile || uploading}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600"
                >
                  {uploading ? "Uploading..." : <><Upload className="w-4 h-4 mr-2" />Upload Departments</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  Upload Staff List
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Required Fields:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li><strong className="text-red-600">Employee_id:</strong> Unique staff ID (also accepts: "Employee Code", "employee_id") — <span className="text-red-600 font-bold">REQUIRED</span></li>
                    <li><strong className="text-red-600">Full Name:</strong> Full name (also accepts: "Name", "full_name") — <span className="text-red-600 font-bold">REQUIRED</span></li>
                    <li><strong>Date of Join:</strong> YYYY-MM-DD format — Optional</li>
                    <li><strong>Job Title:</strong> Job role/position — Optional</li>
                    <li><strong>Job Cost Centre:</strong> Cost centre code — Optional</li>
                    <li><strong>Reports To:</strong> Manager's email or name — Optional</li>
                    <li><strong>role_ids:</strong> Role IDs separated by semicolons (e.g., ROLE1;ROLE2) — Optional</li>
                    <li><strong>department_Code:</strong> Department short code (e.g., W2, EMG) — Optional</li>
                    <li><strong>department_id:</strong> Department unique ID (takes priority over code) — Optional</li>
                    <li><strong>Contract Type:</strong> Permanent, Fixed Term, Temporary, etc. — Optional</li>
                    <li><strong>contracted_hours_weekly:</strong> Number (e.g., 40, 37.5) — Optional</li>
                    <li><strong>phone:</strong> Contact number — Optional</li>
                    <li><strong>is_active:</strong> true or false — Optional (defaults to true)</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">✅ Flexible Header Matching</h3>
                  <p className="text-sm text-green-800">
                    The system now accepts multiple header variations! For example:
                    <br/>• "Employee_id" OR "Employee Code" OR "employee_id"
                    <br/>• "Full Name" OR "Name" OR "full_name"
                    <br/>• "Department Code" OR "department_Code"
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Important:</strong> Upload departments first so that department_id or department_Code values match correctly.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleStaffTemplate} variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Template
                  </Button>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setStaffFile(e.target.files[0])}
                    className="hidden"
                    id="staff-upload"
                  />
                  <label htmlFor="staff-upload" className="cursor-pointer">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      {staffFile ? staffFile.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-slate-500">CSV file with staff data</p>
                  </label>
                </div>

                <Button
                  onClick={handleStaffUpload}
                  disabled={!staffFile || uploading}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600"
                >
                  {uploading ? "Uploading..." : <><Upload className="w-4 h-4 mr-2" />Upload Staff List</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6 shadow-lg">
          <CardHeader className="border-b">
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">1</span>
                <div>
                  <strong>Download Templates:</strong> Get the CSV templates with the correct column headers.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">2</span>
                <div>
                  <strong>Fill in Data:</strong> Add your department and staff information. <span className="font-bold text-red-600">Make sure EVERY employee has a unique Employee_id value!</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">3</span>
                <div>
                  <strong>Upload Departments First:</strong> This creates the departments with their unique IDs in the system.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">4</span>
                <div>
                  <strong>Upload Staff:</strong> Staff will be automatically linked to departments using department_id or department_Code.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">5</span>
                <div>
                  <strong>Matching Logic:</strong> The system uses these unique IDs to match staff to departments.
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}