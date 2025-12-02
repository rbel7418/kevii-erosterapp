import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export const handler = Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin / manager can run this
    if (!user || (user.role !== 'admin' && user.access_level !== 'manager')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'content-type': 'application/json' }
        }
      );
    }

    const deptId = '6906a5fd6535449a05c43f7f';

    // Canonical Therapies staff list
    const targetStaff = [
      {
        employee_id: '101313',
        full_name: 'Charlotte Church',
        job_title: 'Therapies Manager',
        contract_type: 'Permanent',
        sort_index: 1,
        user_email: 'charlotte.church@placeholder.local'
      },
      {
        employee_id: '101277',
        full_name: 'Enuice Loh',
        job_title: 'Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 2,
        user_email: 'enuice.loh@placeholder.local'
      },
      {
        employee_id: '100646',
        full_name: 'Jenny Earl',
        job_title: 'Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 3,
        user_email: 'jenny.earl@placeholder.local'
      },
      {
        employee_id: '101165',
        full_name: 'Tahnee Walmsly',
        job_title: 'Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 4,
        user_email: 'tahnee.walmsly@placeholder.local'
      },
      {
        employee_id: '100909',
        full_name: 'Jimsey Simon',
        job_title: 'Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 5,
        user_email: 'jimsey.simon@placeholder.local'
      },
      {
        employee_id: '200968',
        full_name: 'Claudia Wharton',
        job_title: 'Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 6,
        user_email: 'claudia.wharton@placeholder.local'
      },
      {
        employee_id: '101276',
        full_name: 'Jake Bishop',
        job_title: 'Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 7,
        user_email: 'jake.bishop@placeholder.local'
      },
      {
        employee_id: '100275',
        full_name: 'Alvaro Cardona Cabrera',
        job_title: 'Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 8,
        user_email: 'alvaro.cardona.cabrera@placeholder.local'
      },
      {
        employee_id: '101082',
        full_name: 'Amelia Watts',
        job_title: 'Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 9,
        user_email: 'amelia.watts@placeholder.local'
      },
      // Bank staff → now Permanent + "(Bank)" in name
      {
        employee_id: '200955',
        full_name: 'Callum Stinson (Bank)',
        job_title: 'Bank Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 10,
        user_email: 'callum.stinson@placeholder.local'
      },
      {
        employee_id: '200966',
        full_name: 'Michael Stacy (Bank)',
        job_title: 'Bank Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 11,
        user_email: 'michael.stacy@placeholder.local'
      },
      {
        employee_id: '200973',
        full_name: 'Samantha Calliste (Bank)',
        job_title: 'Bank Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 12,
        user_email: 'samantha.calliste@placeholder.local'
      },
      {
        employee_id: '200615',
        full_name: 'Amir Mostaed (Bank)',
        job_title: 'Bank Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 13,
        user_email: 'amir.mostaed@placeholder.local'
      },
      {
        employee_id: '200942',
        full_name: 'Michael Wong (Bank)',
        job_title: 'Bank Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 14,
        user_email: 'michael.wong@placeholder.local'
      },
      {
        employee_id: '200943',
        full_name: 'Ashleigh Jordan (Bank)',
        job_title: 'Bank Therapies Staff',
        contract_type: 'Permanent',
        sort_index: 15,
        user_email: 'ashleigh.jordan@placeholder.local'
      }
    ];

    // For robust deletion, also match on employee_id
    const targetEmployeeIds = new Set(targetStaff.map((s) => s.employee_id));

    // 1) Load employees (no filter; we filter in JS)
    const listResult = await base44.entities.Employee.list({
      limit: 1000
    });

    const allEmployees = Array.isArray(listResult)
      ? listResult
      : Array.isArray(listResult && listResult.items)
      ? listResult.items
      : Array.isArray(listResult && listResult.data)
      ? listResult.data
      : [];

    // 2) Decide which employees to delete
    const toDelete = allEmployees.filter((emp) => {
      // Try to extract a department id in a few common shapes
      const empDeptId =
        emp.department_id ||
        emp.departmentId ||
        (emp.department && (emp.department.id || emp.department._id || emp.department));

      const empEmployeeId = emp.employee_id || emp.employeeId;

      // Delete if in Therapies department OR in the canonical list by employee_id
      return (
        empDeptId === deptId ||
        (empEmployeeId && targetEmployeeIds.has(empEmployeeId))
      );
    });

    let deletedCount = 0;
    for (const emp of toDelete) {
      await base44.entities.Employee.delete(emp.id);
      deletedCount++;
    }

    // 3) Recreate the 15 canonical employees
    let createdCount = 0;
    for (const staff of targetStaff) {
      await base44.entities.Employee.create({
        ...staff,
        department_id: deptId,
        cost_centre: 'THERAPIESDI - Therapies Direct',
        is_active: true
      });
      createdCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Wiped ${deletedCount} records (by department or employee_id match). Created ${createdCount} clean records.`,
        deleted: deletedCount,
        created: createdCount
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('resetTherapiesStaff error:', error);
    return new Response(
      JSON.stringify({
        error: error && error.message ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' }
      }
    );
  }
});
