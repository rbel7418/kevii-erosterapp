// Mock Base44 client to remove dependency on backend endpoint
import { startOfWeek, addDays, format } from "date-fns";

const mockHandler = {
  get: (target, prop) => {
    if (prop === 'then') return undefined;
    if (typeof target[prop] === 'undefined') {
      target[prop] = new Proxy(() => Promise.resolve({ data: { ok: true, results: [] }, ok: true }), mockHandler);
    }
    return target[prop];
  }
};

export const base44 = new Proxy({
  auth: {
    me: async () => {
      console.log("Mock me call");
      return {
        id: "mock-user-id",
        email: "mock@kingedwardvii.co.uk",
        full_name: "Mock User",
        role: "admin",
        access_level: "admin",
        settings: {
          theme: "light",
          ui: { shiftchip_color: "#0b5ed7" },
          defaults: {
            department: { enabled: true, ids: ["dept-1"] },
            view: { enabled: true }
          }
        }
      };
    },
    logout: () => {
      console.log("Mock logout");
      window.location.reload();
    },
    redirectToLogin: () => {
      console.log("Mock redirect to login");
    }
  },
  entities: {
    list: async (name) => {
      console.log(`Mock list entities: ${name}`);
      // Try to load from localStorage first for "persistence"
      const stored = localStorage.getItem(`mock_${name}`);
      if (stored) return JSON.parse(stored);

      if (name === 'Department') {
        const data = [
          { id: 'dept-1', name: 'Ward 2', is_active: true, published_months: [format(new Date(), 'yyyy-MM')], is_dm_only: false },
          { id: 'dept-2', name: 'Ward 3', is_active: true, published_months: [format(new Date(), 'yyyy-MM')], is_dm_only: false },
          { id: 'dept-3', name: 'ECU', is_active: true, published_months: [format(new Date(), 'yyyy-MM')], is_dm_only: false },
          { id: 'dept-dm', name: 'DM Only Dept', is_active: true, is_dm_only: true }
        ];
        localStorage.setItem(`mock_${name}`, JSON.stringify(data));
        return data;
      }
      if (name === 'Employee') {
        const data = [
          { id: 'emp-1', full_name: 'John Doe', department_id: 'dept-1', role: 'Nurse', contract_type: 'Permanent', sort_index: 1, is_active: true },
          { id: 'emp-2', full_name: 'Jane Smith', department_id: 'dept-1', role: 'Sister', contract_type: 'Permanent', sort_index: 0, is_active: true },
          { id: 'emp-3', full_name: 'Bob Wilson', department_id: 'dept-2', role: 'Nurse', contract_type: 'Permanent', sort_index: 1, is_active: true },
          { id: 'emp-4', full_name: 'Alice Brown', department_id: 'dept-1', role: 'Nurse', contract_type: 'Permanent', sort_index: 2, is_active: true }
        ];
        localStorage.setItem(`mock_${name}`, JSON.stringify(data));
        return data;
      }
      if (name === 'ShiftCode') {
        const data = [
          { id: 'sc-1', code: 'D', name: 'Day', start_time: '08:00', end_time: '20:30', color: '#3b82f6' },
          { id: 'sc-2', code: 'N', name: 'Night', start_time: '20:00', end_time: '08:30', color: '#1e3a8a' },
          { id: 'sc-3', code: 'LD', name: 'Long Day', start_time: '08:00', end_time: '21:00', color: '#ef4444' },
          { id: 'sc-4', code: 'O', name: 'Off', color: '#94a3b8' }
        ];
        localStorage.setItem(`mock_${name}`, JSON.stringify(data));
        return data;
      }
      if (name === 'Shift') {
        const shifts = [];
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 });
        ['emp-1', 'emp-2', 'emp-3', 'emp-4'].forEach(empId => {
          for (let i = 0; i < 28; i++) {
            const date = format(addDays(start, i), 'yyyy-MM-dd');
            if (Math.random() > 0.3) {
              shifts.push({
                id: `shift-${empId}-${i}`,
                employee_id: empId,
                department_id: empId === 'emp-3' ? 'dept-2' : 'dept-1',
                shift_code: i % 7 === 5 || i % 7 === 6 ? 'N' : 'D',
                date: date
              });
            }
          }
        });
        localStorage.setItem(`mock_${name}`, JSON.stringify(shifts));
        return shifts;
      }
      if (name === 'RotaStatus') {
        const data = [
          { id: 'rs-1', department_id: 'dept-1', month: format(new Date(), 'yyyy-MM'), status: 'published' },
          { id: 'rs-2', department_id: 'dept-2', month: format(new Date(), 'yyyy-MM'), status: 'draft' }
        ];
        localStorage.setItem(`mock_${name}`, JSON.stringify(data));
        return data;
      }
      if (name === 'AppPermission') return [
        { id: 'perm-1', user_id: 'mock-user-id', permission: 'admin', resource: 'rota' }
      ];
      if (name === 'OrgSettings') return [
        { id: 'org-1', key: 'rota_config', value: { allow_self_assign: true } }
      ];
      return [];
    },
    get: async (name, id) => {
      console.log(`Mock get entity: ${name} (${id})`);
      const list = await base44.entities.list(name);
      return list.find(item => item.id === id) || null;
    },
    filter: async (name, params) => {
      console.log(`Mock filter entities: ${name}`, params);
      const list = await base44.entities.list(name);
      return list.filter(item => {
        return Object.entries(params).every(([key, value]) => item[key] === value);
      });
    },
    create: async (name, data) => {
      console.log(`Mock create entity: ${name}`, data);
      const list = await base44.entities.list(name);
      const newItem = { id: Math.random().toString(36).substr(2, 9), ...data };
      const newList = [...list, newItem];
      localStorage.setItem(`mock_${name}`, JSON.stringify(newList));
      
      // Dispatch event for components to react to data changes if they want
      window.dispatchEvent(new CustomEvent('mock-data-change', { detail: { name, action: 'create', item: newItem } }));
      
      return newItem;
    },
    update: async (name, id, data) => {
      console.log(`Mock update entity: ${name} (${id})`, data);
      const list = await base44.entities.list(name);
      const updatedList = list.map(item => item.id === id ? { ...item, ...data } : item);
      localStorage.setItem(`mock_${name}`, JSON.stringify(updatedList));
      
      window.dispatchEvent(new CustomEvent('mock-data-change', { detail: { name, action: 'update', id, data } }));
      
      return { id, ...data };
    },
    delete: async (name, id) => {
      console.log(`Mock delete entity: ${name} (${id})`);
      const list = await base44.entities.list(name);
      const newList = list.filter(item => item.id !== id);
      localStorage.setItem(`mock_${name}`, JSON.stringify(newList));
      
      window.dispatchEvent(new CustomEvent('mock-data-change', { detail: { name, action: 'delete', id } }));
      
      return { success: true };
    }
  },
  integrations: new Proxy({}, mockHandler),
  functions: {
    invoke: async (name, args) => {
      console.log(`Mock invoke function: ${name}`, args);
      // Return a standard response structure that components expect
      return { 
        data: { 
          ok: true, 
          message: "Mock response", 
          results: [],
          status: "success"
        },
        ok: true 
      };
    },
    smsHealth: async () => ({ data: { ok: true } }),
    sendSms: async () => ({ data: { id: "mock-id", status: "sent" } }),
    sendAcsEmail: async () => ({ data: { id: "mock-id", status: "sent" } })
  },
  appLogs: {
    logUserInApp: async (page) => {
      console.log(`Mock log user in app: ${page}`);
      return { success: true };
    }
  }
}, mockHandler);
